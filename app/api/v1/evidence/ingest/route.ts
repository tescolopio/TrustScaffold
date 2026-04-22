import { createHash, timingSafeEqual } from 'node:crypto';

import { NextResponse, type NextRequest } from 'next/server';

import { canonicalize } from '@/lib/evidence/canonicalize';
import { normalizePayload } from '@/lib/evidence/scanner-normalizers';
import { createSupabaseServiceRoleClient } from '@/lib/supabase-service';

/**
 * Evidence Ingestion API.
 * POST /api/v1/evidence/ingest
 *
 * Authentication: Bearer token matching an organization_api_keys row.
 * Accepts a strict JSON contract from Steampipe / CloudQuery CI runners.
 */

const VALID_STATUSES = new Set(['PASS', 'FAIL', 'ERROR', 'UNKNOWN']);

type RunMetadata = {
  collection_tool: string;
  source_system: string;
  timestamp: string;
  run_id: string;
};

type ArtifactPayload = {
  control_mapping: string;
  artifact_name: string;
  status: string;
  raw_data: unknown;
};

type IngestPayload = {
  run_metadata: RunMetadata;
  artifacts: ArtifactPayload[];
};

function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

function validatePayload(body: unknown): { ok: true; data: IngestPayload } | { ok: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'Request body must be a JSON object' };
  }

  const payload = body as Record<string, unknown>;

  // Validate run_metadata
  const meta = payload.run_metadata as Record<string, unknown> | undefined;
  if (!meta || typeof meta !== 'object') {
    return { ok: false, error: 'run_metadata is required and must be an object' };
  }

  if (typeof meta.collection_tool !== 'string' || !meta.collection_tool) {
    return { ok: false, error: 'run_metadata.collection_tool is required' };
  }
  if (typeof meta.source_system !== 'string' || !meta.source_system) {
    return { ok: false, error: 'run_metadata.source_system is required' };
  }
  if (typeof meta.timestamp !== 'string' || !meta.timestamp) {
    return { ok: false, error: 'run_metadata.timestamp is required' };
  }
  if (typeof meta.run_id !== 'string' || !meta.run_id) {
    return { ok: false, error: 'run_metadata.run_id is required' };
  }

  // Validate timestamp is a valid ISO date
  if (isNaN(new Date(meta.timestamp).getTime())) {
    return { ok: false, error: 'run_metadata.timestamp must be a valid ISO 8601 date' };
  }

  // Validate artifacts
  if (!Array.isArray(payload.artifacts) || !payload.artifacts.length) {
    return { ok: false, error: 'artifacts must be a non-empty array' };
  }

  for (let i = 0; i < payload.artifacts.length; i++) {
    const artifact = payload.artifacts[i] as Record<string, unknown>;
    if (typeof artifact.control_mapping !== 'string' || !artifact.control_mapping) {
      return { ok: false, error: `artifacts[${i}].control_mapping is required` };
    }
    if (typeof artifact.artifact_name !== 'string' || !artifact.artifact_name) {
      return { ok: false, error: `artifacts[${i}].artifact_name is required` };
    }
    if (typeof artifact.status !== 'string' || !VALID_STATUSES.has(artifact.status)) {
      return { ok: false, error: `artifacts[${i}].status must be one of: PASS, FAIL, ERROR, UNKNOWN` };
    }
    if (artifact.raw_data === undefined || artifact.raw_data === null) {
      return { ok: false, error: `artifacts[${i}].raw_data is required` };
    }
  }

  return {
    ok: true,
    data: {
      run_metadata: meta as unknown as RunMetadata,
      artifacts: payload.artifacts as ArtifactPayload[],
    },
  };
}

const MAX_PAYLOAD_BYTES = 50 * 1024 * 1024; // 50 MB

export async function POST(request: NextRequest) {
  // Reject oversized payloads before reading the body
  const contentLength = Number(request.headers.get('content-length') ?? 0);
  if (contentLength > MAX_PAYLOAD_BYTES) {
    return NextResponse.json(
      { error: `Payload too large. Maximum allowed size is ${MAX_PAYLOAD_BYTES / 1024 / 1024} MB.` },
      { status: 413 },
    );
  }

  // Extract Bearer token
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Missing or invalid Authorization header. Use: Bearer <api_key>' }, { status: 401 });
  }

  const apiKey = authHeader.slice(7).trim();
  if (!apiKey) {
    return NextResponse.json({ error: 'API key is empty' }, { status: 401 });
  }

  const keyHash = hashApiKey(apiKey);
  const keyPrefix = apiKey.slice(0, 8);

  const supabase = createSupabaseServiceRoleClient();

  // Look up the API key
  const { data: apiKeyRow, error: keyError } = await supabase
    .from('organization_api_keys')
    .select('id, organization_id, scopes, expires_at, revoked_at')
    .eq('key_hash', keyHash)
    .eq('key_prefix', keyPrefix)
    .single();

  if (keyError || !apiKeyRow) {
    return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
  }

  // Check revocation
  if (apiKeyRow.revoked_at) {
    return NextResponse.json({ error: 'API key has been revoked' }, { status: 401 });
  }

  // Check expiration
  if (apiKeyRow.expires_at && new Date(apiKeyRow.expires_at) < new Date()) {
    return NextResponse.json({ error: 'API key has expired' }, { status: 401 });
  }

  // Check scope
  const scopes = apiKeyRow.scopes as string[];
  if (!scopes.includes('evidence:write')) {
    return NextResponse.json({ error: 'API key lacks evidence:write scope' }, { status: 403 });
  }

  // Update last_used_at
  await supabase
    .from('organization_api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', apiKeyRow.id);

  // Parse and validate body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // Auto-detect and normalize CSPM scanner output (Prowler, Steampipe, CloudQuery)
  const normalized = normalizePayload(body);
  if (normalized) {
    body = normalized;
  }

  const validation = validatePayload(body);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const { run_metadata, artifacts } = validation.data;
  const orgId = apiKeyRow.organization_id;
  const results: { artifact_name: string; id: string; status: string }[] = [];

  for (const artifact of artifacts) {
    // RFC 8785 JCS: canonicalize before hashing for deterministic tamper-evidence
    const canonicalData = canonicalize(artifact.raw_data);
    const rawDataHash = createHash('sha256').update(canonicalData).digest('hex');
    const storagePath = `evidence/${orgId}/${run_metadata.run_id}/${artifact.artifact_name}.json`;

    // Upload canonicalized data to Supabase Storage (best-effort; storage may be disabled)
    const rawDataBuffer = Buffer.from(canonicalData, 'utf-8');
    try {
      const { error: uploadError } = await supabase.storage
        .from('evidence')
        .upload(storagePath, rawDataBuffer, {
          contentType: 'application/json',
          upsert: true,
        });

      if (uploadError) {
        console.warn(`Storage upload failed for ${artifact.artifact_name}: ${uploadError.message}`);
      }
    } catch (storageErr) {
      console.warn(`Storage unavailable for ${artifact.artifact_name}:`, storageErr);
    }

    // Insert the evidence artifact row
    const { data: insertedArtifact, error: insertError } = await supabase
      .from('evidence_artifacts')
      .insert({
        organization_id: orgId,
        control_mapping: artifact.control_mapping,
        artifact_name: artifact.artifact_name,
        status: artifact.status,
        collection_tool: run_metadata.collection_tool,
        source_system: run_metadata.source_system,
        run_id: run_metadata.run_id,
        raw_data_hash: rawDataHash,
        storage_path: storagePath,
        collected_at: run_metadata.timestamp,
      })
      .select('id')
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: `Failed to record artifact ${artifact.artifact_name}: ${insertError.message}` },
        { status: 500 },
      );
    }

    results.push({
      artifact_name: artifact.artifact_name,
      id: insertedArtifact.id,
      status: artifact.status,
    });

    // Append to audit log for tamper-evident chain
    await supabase
      .from('audit_logs')
      .insert({
        organization_id: orgId,
        action: 'evidence_artifacts.insert',
        entity_type: 'evidence_artifacts',
        entity_id: insertedArtifact.id,
        details: {
          operation: 'insert',
          data: {
            artifact_name: artifact.artifact_name,
            control_mapping: artifact.control_mapping,
            status: artifact.status,
            run_id: run_metadata.run_id,
            raw_data_hash: rawDataHash,
          },
        },
      });
  }

  return NextResponse.json({
    status: 'ok',
    organization_id: orgId,
    run_id: run_metadata.run_id,
    artifacts_ingested: results.length,
    artifacts: results,
  });
}
