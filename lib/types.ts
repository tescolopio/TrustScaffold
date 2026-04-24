// Section 2 – Cloud configuration shape persisted in organizations.cloud_config.
export type CloudConfig = {
  provider: 'azure' | 'aws' | 'gcp' | 'hybrid' | 'other';
  azure?: {
    entraId: boolean;
    purviewDlp: boolean;
    keyVault: boolean;
  };
  aws?: {
    iam: boolean;
    macie: boolean;
  };
  gcp?: {
    iam: boolean;
    securityCommandCenter?: boolean;
  };
};

export type OrganizationRole = 'admin' | 'editor' | 'viewer' | 'approver';

export type IntegrationProvider = 'github' | 'azure_devops';

export type RevisionSource = 'generated' | 'reviewer_edited' | 'approved' | 'exported' | 'merged';

export type EvidenceStatus = 'PASS' | 'FAIL' | 'ERROR' | 'UNKNOWN';

export type OrganizationSummary = {
  id: string;
  name: string;
  slug: string;
  role: OrganizationRole;
  wizardAutosaveIntervalMinutes: number;
};

export type DashboardContext = {
  userId: string;
  email: string | null;
  organization: OrganizationSummary | null;
};

export type DocumentRevision = {
  id: string;
  document_id: string;
  source: RevisionSource;
  content_markdown: string;
  content_hash: string;
  commit_sha: string | null;
  pr_url: string | null;
  created_by: string | null;
  created_at: string;
};

export type EvidenceArtifact = {
  id: string;
  organization_id: string;
  control_mapping: string;
  artifact_name: string;
  status: EvidenceStatus;
  collection_tool: string;
  source_system: string;
  run_id: string;
  raw_data_hash: string;
  storage_path: string;
  collected_at: string;
  ingested_at: string;
};

export type AuditSnapshot = {
  id: string;
  organization_id: string;
  tag_name: string;
  audit_period_start: string;
  audit_period_end: string;
  description: string | null;
  commit_sha: string | null;
  created_by: string | null;
  created_at: string;
};

export type PortalStage = 'presentation' | 'evidence';

export type AuditorPortalToken = {
  id: string;
  organization_id: string;
  snapshot_id: string;
  token_hash: string;
  label: string;
  stage: PortalStage;
  expires_at: string;
  created_by: string | null;
  created_at: string;
  last_accessed_at: string | null;
};
