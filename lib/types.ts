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
    iam?: boolean;
    securityCommandCenter?: boolean;
  };
};
