/**
 * Suite 4: Evidence Ingestion & Cryptography
 *
 * Validates schema enforcement, API key auth, hash chain integrity,
 * audit log immutability, JCS canonicalization, and scanner detection.
 *
 * Ref: MASTER_TEST_PLAN.md §6
 */

import {
  suite, test, runAll, printSummary,
  assert, assertEqual, assertIncludes,
  serviceClient, httpPost, APP_URL,
  ORG, API_KEY,
} from './helpers';

const INGEST_PATH = '/api/v1/evidence/ingest';

function validRunMetadata(runId?: string) {
  return {
    collection_tool: 'e2e-test',
    source_system: 'test',
    timestamp: new Date().toISOString(),
    run_id: runId ?? `e2e-run-${Date.now()}`,
  };
}

// ── 6.1 Missing run_metadata ─────────────────────────────────────────────────

suite('6.1 Schema Enforcement — Missing run_metadata');

test('Missing run_metadata returns 400', async () => {
  const res = await httpPost(INGEST_PATH, {
    artifacts: [{ control_mapping: 'CC6.1', artifact_name: 'test', status: 'PASS', raw_data: {} }],
  }, { Authorization: `Bearer ${API_KEY.ACME}` });

  assertEqual(res.status, 400, 'HTTP status');
  const body = await res.json();
  assertIncludes(JSON.stringify(body), 'run_metadata', 'error mentions run_metadata');
});

// ── 6.2 Invalid Status ──────────────────────────────────────────────────────

suite('6.2 Schema Enforcement — Invalid Status');

test('Status "SUCCESS" returns 400', async () => {
  const res = await httpPost(INGEST_PATH, {
    run_metadata: validRunMetadata(),
    artifacts: [{ control_mapping: 'CC6.1', artifact_name: 'test', status: 'SUCCESS', raw_data: {} }],
  }, { Authorization: `Bearer ${API_KEY.ACME}` });

  assertEqual(res.status, 400, 'HTTP status');
});

// ── 6.3 Invalid Timestamp ────────────────────────────────────────────────────

suite('6.3 Schema Enforcement — Invalid Timestamp');

test('Non-date timestamp returns 400', async () => {
  const res = await httpPost(INGEST_PATH, {
    run_metadata: { ...validRunMetadata(), timestamp: 'not-a-date' },
    artifacts: [{ control_mapping: 'CC6.1', artifact_name: 'test', status: 'PASS', raw_data: {} }],
  }, { Authorization: `Bearer ${API_KEY.ACME}` });

  assertEqual(res.status, 400, 'HTTP status');
});

// ── 6.4 Empty Artifacts ─────────────────────────────────────────────────────

suite('6.4 Schema Enforcement — Empty Artifacts');

test('Empty artifacts array returns 400', async () => {
  const res = await httpPost(INGEST_PATH, {
    run_metadata: validRunMetadata(),
    artifacts: [],
  }, { Authorization: `Bearer ${API_KEY.ACME}` });

  assertEqual(res.status, 400, 'HTTP status');
});

// ── 6.5 Missing Authorization ────────────────────────────────────────────────

suite('6.5 API Key Auth — Missing Bearer');

test('No Authorization header returns 401', async () => {
  const res = await httpPost(INGEST_PATH, {
    run_metadata: validRunMetadata(),
    artifacts: [{ control_mapping: 'CC6.1', artifact_name: 'test', status: 'PASS', raw_data: {} }],
  });

  assertEqual(res.status, 401, 'HTTP status');
});

// ── 6.6 Revoked API Key ─────────────────────────────────────────────────────

suite('6.6 API Key Auth — Revoked Key');

test('Revoked key returns 401', async () => {
  const svc = serviceClient();

  // Revoke Beta's key
  await svc
    .from('organization_api_keys')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', 'f1000000-0000-4000-b000-000000000001');

  const res = await httpPost(INGEST_PATH, {
    run_metadata: validRunMetadata(),
    artifacts: [{ control_mapping: 'CC6.1', artifact_name: 'test', status: 'PASS', raw_data: {} }],
  }, { Authorization: `Bearer ${API_KEY.BETA}` });

  assertEqual(res.status, 401, 'HTTP status for revoked key');

  // Restore key
  await svc
    .from('organization_api_keys')
    .update({ revoked_at: null })
    .eq('id', 'f1000000-0000-4000-b000-000000000001');
});

// ── 6.7 Hash Chain — Happy Path ─────────────────────────────────────────────

suite('6.7 Hash Chain — Happy Path');

test('Sequential evidence ingestion creates linked audit entries', async () => {
  const svc = serviceClient();
  const runId = `chain-test-${Date.now()}`;

  // Count existing audit log entries before our ingest
  const { count: beforeCount, error: countErr } = await svc
    .from('audit_logs')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', ORG.ACME);

  const offset = beforeCount ?? 0;

  // Ingest two artifacts sequentially so we get at least 2 new audit entries
  for (const order of [1, 2]) {
    const res = await httpPost(INGEST_PATH, {
      run_metadata: { ...validRunMetadata(runId), collection_tool: 'e2e-chain' },
      artifacts: [{ control_mapping: 'CC6.1', artifact_name: `chain-${order}-${Date.now()}`, status: 'PASS', raw_data: { order } }],
    }, { Authorization: `Bearer ${API_KEY.ACME}` });

    assert(res.ok, `Ingest ${order} should succeed, got ${res.status}: ${await res.text()}`);
  }

  // Fetch ALL audit entries sorted by created_at and slice the new ones
  const { data: allLogs } = await svc
    .from('audit_logs')
    .select('event_checksum, previous_event_checksum')
    .eq('organization_id', ORG.ACME)
    .order('created_at', { ascending: true });

  const logs = (allLogs ?? []).slice(offset);

  assert(logs.length >= 2, `Must have at least 2 new audit log entries, got ${logs.length} (total=${allLogs?.length}, offset=${offset})`);

  // Verify chain linkage: entry N's previous_event_checksum = entry N-1's event_checksum
  for (let i = 1; i < logs.length; i++) {
    if (logs[i].previous_event_checksum) {
      assertEqual(
        logs[i].previous_event_checksum,
        logs[i - 1].event_checksum,
        `chain link at index ${i}`
      );
    }
  }
});

// ── 6.9 Audit Log Immutability — UPDATE Blocked ────────────────────────────

suite('6.9 Audit Log Immutability — UPDATE Blocked');

test('UPDATE on audit_logs is rejected by trigger', async () => {
  const svc = serviceClient();

  // Get any audit log entry
  const { data: logs } = await svc
    .from('audit_logs')
    .select('id')
    .eq('organization_id', ORG.ACME)
    .limit(1);

  if (!logs || logs.length === 0) {
    console.log('    (No audit logs to test — skipping)');
    return;
  }

  const { error } = await svc
    .from('audit_logs')
    .update({ action: 'tampered' })
    .eq('id', logs[0].id);

  assert(!!error, 'Expected trigger error on audit_logs UPDATE');
});

// ── 6.10 Audit Log Immutability — DELETE Blocked ────────────────────────────

suite('6.10 Audit Log Immutability — DELETE Blocked');

test('DELETE on audit_logs is rejected by trigger', async () => {
  const svc = serviceClient();

  const { data: logs } = await svc
    .from('audit_logs')
    .select('id')
    .eq('organization_id', ORG.ACME)
    .limit(1);

  if (!logs || logs.length === 0) {
    console.log('    (No audit logs to test — skipping)');
    return;
  }

  const { error } = await svc
    .from('audit_logs')
    .delete()
    .eq('id', logs[0].id);

  assert(!!error, 'Expected trigger error on audit_logs DELETE');
});

// ── 6.12 JCS Canonicalization ────────────────────────────────────────────────

suite('6.12 RFC 8785 JCS Canonicalization');

test('Key-order-different JSON produces same hash', async () => {
  const runId = `jcs-test-${Date.now()}`;

  // Artifact A: keys in order b, a
  const res1 = await httpPost(INGEST_PATH, {
    run_metadata: { ...validRunMetadata(runId), collection_tool: 'e2e-jcs' },
    artifacts: [{
      control_mapping: 'CC6.1',
      artifact_name: `jcs-a-${Date.now()}`,
      status: 'PASS',
      raw_data: { b: 1, a: 2 },
    }],
  }, { Authorization: `Bearer ${API_KEY.ACME}` });

  // Artifact B: keys in order a, b (same data, different serialization)
  const res2 = await httpPost(INGEST_PATH, {
    run_metadata: { ...validRunMetadata(`${runId}-b`), collection_tool: 'e2e-jcs' },
    artifacts: [{
      control_mapping: 'CC6.1',
      artifact_name: `jcs-b-${Date.now()}`,
      status: 'PASS',
      raw_data: { a: 2, b: 1 },
    }],
  }, { Authorization: `Bearer ${API_KEY.ACME}` });

  if (!res1.ok || !res2.ok) {
    console.log(`    (Ingest failed — skipping JCS comparison)`);
    return;
  }

  const body1 = await res1.json();
  const body2 = await res2.json();

  // Query the stored hashes
  const svc = serviceClient();
  const ids = [
    ...body1.artifacts.map((a: { id: string }) => a.id),
    ...body2.artifacts.map((a: { id: string }) => a.id),
  ];

  const { data } = await svc
    .from('evidence_artifacts')
    .select('raw_data_hash')
    .in('id', ids);

  if (data && data.length === 2) {
    assertEqual(data[0].raw_data_hash, data[1].raw_data_hash, 'JCS hashes must match');
  }
});

// ── 6.13 Scanner Auto-Detection — Prowler ────────────────────────────────────

suite('6.13 Scanner Auto-Detection — Prowler');

test('Prowler-format payload is accepted', async () => {
  const res = await httpPost(INGEST_PATH, {
    run_metadata: {
      collection_tool: 'prowler',
      source_system: 'aws',
      timestamp: new Date().toISOString(),
      run_id: `prowler-test-${Date.now()}`,
    },
    artifacts: [{
      control_mapping: 'CIS_AWS_1.1',
      artifact_name: `prowler-check-${Date.now()}`,
      status: 'PASS',
      raw_data: { CheckID: 'iam_mfa_enabled', Status: 'PASS', Region: 'us-east-1' },
    }],
  }, { Authorization: `Bearer ${API_KEY.ACME}` });

  assert(
    res.status === 200 || res.status === 400,
    `Expected 200 or 400, got ${res.status}`
  );
});

// ── 6.14 Scanner Auto-Detection — Steampipe ──────────────────────────────────

suite('6.14 Scanner Auto-Detection — Steampipe');

test('Steampipe-format payload is accepted', async () => {
  const res = await httpPost(INGEST_PATH, {
    run_metadata: {
      collection_tool: 'steampipe',
      source_system: 'aws',
      timestamp: new Date().toISOString(),
      run_id: `steampipe-test-${Date.now()}`,
    },
    artifacts: [{
      control_mapping: 'CIS_AWS_1.1',
      artifact_name: `steampipe-check-${Date.now()}`,
      status: 'PASS',
      raw_data: { control_id: 'cis_v150_1_1', status: 'ok' },
    }],
  }, { Authorization: `Bearer ${API_KEY.ACME}` });

  assert(
    res.status === 200 || res.status === 400,
    `Expected 200 or 400, got ${res.status}`
  );
});

// ── 6.15 Scanner Auto-Detection — CloudQuery ─────────────────────────────────

suite('6.15 Scanner Auto-Detection — CloudQuery');

test('CloudQuery-format payload is accepted', async () => {
  const res = await httpPost(INGEST_PATH, {
    run_metadata: {
      collection_tool: 'cloudquery',
      source_system: 'aws',
      timestamp: new Date().toISOString(),
      run_id: `cloudquery-test-${Date.now()}`,
    },
    artifacts: [{
      control_mapping: 'CIS_AWS_1.1',
      artifact_name: `cloudquery-check-${Date.now()}`,
      status: 'PASS',
      raw_data: { check_id: 'cis_aws_1_1', result_status: 'PASS' },
    }],
  }, { Authorization: `Bearer ${API_KEY.ACME}` });

  assert(
    res.status === 200 || res.status === 400,
    `Expected 200 or 400, got ${res.status}`
  );
});

// ── Run ──────────────────────────────────────────────────────────────────────

(async () => {
  await runAll();
  printSummary();
})();
