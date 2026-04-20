/**
 * CSPM output normalizers.
 *
 * Maps native output from Prowler, Steampipe, and CloudQuery into the
 * TrustScaffold evidence ingestion contract so organizations can pipe
 * scanner output directly to POST /api/v1/evidence/ingest.
 */

type NormalizedArtifact = {
  control_mapping: string;
  artifact_name: string;
  status: 'PASS' | 'FAIL' | 'ERROR' | 'UNKNOWN';
  raw_data: unknown;
};

type NormalizedPayload = {
  run_metadata: {
    collection_tool: string;
    source_system: string;
    timestamp: string;
    run_id: string;
  };
  artifacts: NormalizedArtifact[];
};

/* ── Prowler v3/v4 ───────────────────────────────────────────────────────── */

type ProwlerFinding = {
  CheckID?: string;
  CheckTitle?: string;
  Status?: string;
  StatusExtended?: string;
  ServiceName?: string;
  Region?: string;
  ResourceArn?: string;
  AssessmentStartTime?: string;
  [key: string]: unknown;
};

function normalizeProwlerStatus(status: string | undefined): NormalizedArtifact['status'] {
  switch (status?.toUpperCase()) {
    case 'PASS':
      return 'PASS';
    case 'FAIL':
      return 'FAIL';
    case 'ERROR':
      return 'ERROR';
    default:
      return 'UNKNOWN';
  }
}

export function normalizeProwler(findings: ProwlerFinding[], runId?: string): NormalizedPayload {
  const timestamp = findings[0]?.AssessmentStartTime ?? new Date().toISOString();

  return {
    run_metadata: {
      collection_tool: 'prowler',
      source_system: 'aws',
      timestamp,
      run_id: runId ?? `prowler-${Date.now()}`,
    },
    artifacts: findings.map((f) => ({
      control_mapping: f.CheckID ?? 'unknown',
      artifact_name: `${f.CheckID ?? 'unknown'}-${f.ResourceArn?.split(':').pop() ?? 'resource'}`,
      status: normalizeProwlerStatus(f.Status),
      raw_data: f,
    })),
  };
}

/* ── Steampipe ───────────────────────────────────────────────────────────── */

type SteampipeRow = {
  control_id?: string;
  title?: string;
  status?: string;
  reason?: string;
  resource?: string;
  [key: string]: unknown;
};

function normalizeSteampipeStatus(status: string | undefined): NormalizedArtifact['status'] {
  switch (status?.toLowerCase()) {
    case 'ok':
      return 'PASS';
    case 'alarm':
      return 'FAIL';
    case 'error':
      return 'ERROR';
    default:
      return 'UNKNOWN';
  }
}

export function normalizeSteampipe(rows: SteampipeRow[], runId?: string): NormalizedPayload {
  return {
    run_metadata: {
      collection_tool: 'steampipe',
      source_system: 'multi-cloud',
      timestamp: new Date().toISOString(),
      run_id: runId ?? `steampipe-${Date.now()}`,
    },
    artifacts: rows.map((row) => ({
      control_mapping: row.control_id ?? 'unknown',
      artifact_name: `${row.control_id ?? 'unknown'}-${row.resource ?? 'resource'}`,
      status: normalizeSteampipeStatus(row.status),
      raw_data: row,
    })),
  };
}

/* ── CloudQuery ──────────────────────────────────────────────────────────── */

type CloudQueryRow = {
  check_id?: string;
  check_title?: string;
  result_status?: string;
  account_id?: string;
  resource_id?: string;
  [key: string]: unknown;
};

function normalizeCloudQueryStatus(status: string | undefined): NormalizedArtifact['status'] {
  switch (status?.toLowerCase()) {
    case 'pass':
      return 'PASS';
    case 'fail':
      return 'FAIL';
    case 'error':
      return 'ERROR';
    default:
      return 'UNKNOWN';
  }
}

export function normalizeCloudQuery(rows: CloudQueryRow[], runId?: string): NormalizedPayload {
  return {
    run_metadata: {
      collection_tool: 'cloudquery',
      source_system: 'multi-cloud',
      timestamp: new Date().toISOString(),
      run_id: runId ?? `cloudquery-${Date.now()}`,
    },
    artifacts: rows.map((row) => ({
      control_mapping: row.check_id ?? 'unknown',
      artifact_name: `${row.check_id ?? 'unknown'}-${row.resource_id ?? 'resource'}`,
      status: normalizeCloudQueryStatus(row.result_status),
      raw_data: row,
    })),
  };
}

/* ── Auto-detect format ──────────────────────────────────────────────────── */

export type ScannerFormat = 'prowler' | 'steampipe' | 'cloudquery' | 'native';

export function detectScannerFormat(payload: unknown): ScannerFormat {
  if (!payload || typeof payload !== 'object') return 'native';

  // If it's already in our native format, pass through
  if ('run_metadata' in payload && 'artifacts' in payload) return 'native';

  // Array of findings — try to detect
  if (Array.isArray(payload)) {
    const first = payload[0] as Record<string, unknown> | undefined;
    if (!first) return 'native';

    if ('CheckID' in first && 'Status' in first) return 'prowler';
    if ('control_id' in first && 'status' in first) return 'steampipe';
    if ('check_id' in first && 'result_status' in first) return 'cloudquery';
  }

  return 'native';
}

export function normalizePayload(payload: unknown, runId?: string): NormalizedPayload | null {
  const format = detectScannerFormat(payload);

  switch (format) {
    case 'prowler':
      return normalizeProwler(payload as ProwlerFinding[], runId);
    case 'steampipe':
      return normalizeSteampipe(payload as SteampipeRow[], runId);
    case 'cloudquery':
      return normalizeCloudQuery(payload as CloudQueryRow[], runId);
    case 'native':
      return null; // Let the existing validation handle it
  }
}
