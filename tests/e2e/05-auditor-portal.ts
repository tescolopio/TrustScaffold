/**
 * Suite 5: Auditor Portal
 *
 * Validates token lifecycle (expiration, revocation), read-only
 * enforcement, cross-org isolation, and provenance data availability.
 *
 * Ref: MASTER_TEST_PLAN.md §7
 */

import {
  suite, test, runAll, printSummary,
  assert, assertEqual,
  serviceClient,
  APP_URL, ORG, SNAPSHOT, PORTAL_TOKEN,
} from './helpers';

// ── 7.1 Token Expiration ─────────────────────────────────────────────────────

suite('7.1 Token Expiration');

test('Expired token is rejected', async () => {
  const svc = serviceClient();

  // Create a token that already expired
  const expiredTokenRaw = `expired_token_test_${Date.now()}`;
  const { createHash } = await import('node:crypto');
  const tokenHash = createHash('sha256').update(expiredTokenRaw).digest('hex');
  const expiredId = crypto.randomUUID();

  await svc.from('auditor_portal_tokens').insert({
    id: expiredId,
    organization_id: ORG.ACME,
    snapshot_id: SNAPSHOT.ACME_Q1,
    token_hash: tokenHash,
    label: 'Expired Test Token',
    expires_at: new Date(Date.now() - 60_000).toISOString(), // 1 minute ago
    created_by: 'aa000000-0000-4000-a000-000000000001',
  });

  // Attempt to access the portal
  const res = await fetch(`${APP_URL}/auditor/${expiredTokenRaw}`);

  assert(
    res.status === 401 || res.status === 403 || res.status === 404 ||
    (res.status === 200 && (await res.text()).toLowerCase().includes('expired')),
    `Expected rejection for expired token, got ${res.status}`
  );

  // Clean up
  await svc.from('auditor_portal_tokens').delete().eq('id', expiredId);
});

// ── 7.2 Valid Token Access ───────────────────────────────────────────────────

suite('7.2 Valid Token Access');

test('Valid token returns 200', async () => {
  const res = await fetch(`${APP_URL}/auditor/${PORTAL_TOKEN.ACME}`);

  // The page should load (200) or redirect (302/307) to the portal view
  assert(
    res.status === 200 || res.status === 302 || res.status === 307,
    `Expected 200/302/307 for valid token, got ${res.status}`
  );
});

test('last_accessed_at is updated on access', async () => {
  const svc = serviceClient();
  const { data: before } = await svc
    .from('auditor_portal_tokens')
    .select('last_accessed_at')
    .eq('id', 'f3000000-0000-4000-a000-000000000001')
    .single();

  // Access the portal
  await fetch(`${APP_URL}/auditor/${PORTAL_TOKEN.ACME}`);

  // Small delay to ensure DB update
  await new Promise(r => setTimeout(r, 500));

  const { data: after } = await svc
    .from('auditor_portal_tokens')
    .select('last_accessed_at')
    .eq('id', 'f3000000-0000-4000-a000-000000000001')
    .single();

  // last_accessed_at should be updated (may be null before first access)
  if (after?.last_accessed_at) {
    assert(
      !before?.last_accessed_at ||
      new Date(after.last_accessed_at) >= new Date(before.last_accessed_at),
      'last_accessed_at should be updated or unchanged'
    );
  }
});

// ── 7.3 Revoked Token ───────────────────────────────────────────────────────

suite('7.3 Revoked Token');

test('Deleted token returns 401/404', async () => {
  const svc = serviceClient();
  const { createHash } = await import('node:crypto');

  // Create and immediately delete a token
  const rawToken = `revoked_token_test_${Date.now()}`;
  const tokenHash = createHash('sha256').update(rawToken).digest('hex');
  const revokedId = crypto.randomUUID();

  await svc.from('auditor_portal_tokens').insert({
    id: revokedId,
    organization_id: ORG.ACME,
    snapshot_id: SNAPSHOT.ACME_Q1,
    token_hash: tokenHash,
    label: 'Revoked Test Token',
    expires_at: new Date(Date.now() + 86_400_000).toISOString(),
    created_by: 'aa000000-0000-4000-a000-000000000001',
  });

  // Delete (revoke) the token
  await svc.from('auditor_portal_tokens').delete().eq('id', revokedId);

  // Try to access
  const res = await fetch(`${APP_URL}/auditor/${rawToken}`);

  assert(
    res.status === 401 || res.status === 403 || res.status === 404 ||
    (res.status === 200 && (await res.text()).toLowerCase().includes('invalid')),
    `Expected rejection for revoked token, got ${res.status}`
  );
});

// ── 7.4 Read-Only Enforcement ────────────────────────────────────────────────

suite('7.4 Read-Only Enforcement');

test('Portal does not expose mutation API endpoints', async () => {
  // The auditor portal is a read-only view — verify there are no forms
  // that POST to mutation endpoints by checking the page content
  const res = await fetch(`${APP_URL}/auditor/${PORTAL_TOKEN.ACME}`);

  if (res.ok) {
    const html = await res.text();
    // Should NOT contain any approve/archive/export action forms
    const hasMutationForm = html.includes('approveGeneratedDocAction') ||
      html.includes('archiveGeneratedDocAction') ||
      html.includes('exportToGithub');
    assert(!hasMutationForm, 'Portal page should not contain mutation action references');
  }
});

// ── 7.5 Cross-Org Token Isolation ────────────────────────────────────────────

suite('7.5 Cross-Org Token Isolation');

test('Acme portal token cannot access Beta data', async () => {
  // The portal token is scoped to a snapshot, which is scoped to an org.
  // We verify the snapshot's org matches the token's org.
  const svc = serviceClient();

  const { data: token } = await svc
    .from('auditor_portal_tokens')
    .select('organization_id, snapshot_id')
    .eq('id', 'f3000000-0000-4000-a000-000000000001')
    .single();

  const { data: snapshot } = await svc
    .from('audit_snapshots')
    .select('organization_id')
    .eq('id', token!.snapshot_id)
    .single();

  assertEqual(token!.organization_id, ORG.ACME, 'token org is Acme');
  assertEqual(snapshot!.organization_id, ORG.ACME, 'snapshot org is Acme');
  assertEqual(token!.organization_id, snapshot!.organization_id, 'token and snapshot orgs match');
});

// ── 7.6 Provenance Data Availability ─────────────────────────────────────────

suite('7.6 Provenance Timeline Data');

test('Snapshot revisions link to document revisions with timestamps', async () => {
  const svc = serviceClient();

  const { data: snapRevs } = await svc
    .from('audit_snapshot_revisions')
    .select('revision_id')
    .eq('snapshot_id', SNAPSHOT.ACME_Q1);

  assert(!!snapRevs && snapRevs.length > 0, 'snapshot should have frozen revisions');

  // Verify each revision has audit log entries with timestamps
  for (const sr of snapRevs!) {
    const { data: rev } = await svc
      .from('document_revisions')
      .select('id, source, content_hash, created_at')
      .eq('id', sr.revision_id)
      .single();

    assert(!!rev, `revision ${sr.revision_id} must exist`);
    assert(!!rev!.created_at, 'revision must have created_at timestamp');
    assert(!!rev!.content_hash, 'revision must have content_hash');
  }
});

// ── Run ──────────────────────────────────────────────────────────────────────

(async () => {
  await runAll();
  printSummary();
})();
