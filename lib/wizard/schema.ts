import { z } from 'zod';

export const subserviceReviewCadenceSchema = z.enum(['annual', 'semi-annual', 'quarterly']);
export const assuranceReportTypeSchema = z.enum(['soc2-type2', 'soc2-type1', 'soc1', 'iso27001', 'pentest-letter', 'other', 'none']);
export const controlInclusionSchema = z.enum(['inclusive', 'carve-out']);
export const orgAgeSchema = z.enum(['<1', '1-3', '3-10', '10+']);
export const complianceMaturitySchema = z.enum(['first-time', 'some-experience', 'established']);
export const targetAuditTypeSchema = z.enum(['type1', 'type2', 'unsure']);

const subserviceSchema = z.object({
  name: z.string().trim().min(1, 'Vendor name is required'),
  description: z.string().trim().min(1, 'Vendor description is required'),
  role: z.string().trim().default(''),
  dataShared: z.string().trim().default(''),
  reviewCadence: subserviceReviewCadenceSchema,
  hasAssuranceReport: z.boolean(),
  assuranceReportType: assuranceReportTypeSchema,
  controlInclusion: controlInclusionSchema,
});

export const infrastructureTypeSchema = z.enum(['aws', 'azure', 'gcp', 'hybrid', 'self-hosted']);
export const cloudProviderSchema = z.enum(['aws', 'azure', 'gcp']);
export const idpProviderSchema = z.enum(['Entra ID', 'Okta', 'Google Workspace', 'JumpCloud', 'Other']);
export const vcsProviderSchema = z.enum(['GitHub', 'Azure DevOps', 'GitLab', 'Bitbucket', 'Other']);
export const hrisProviderSchema = z.enum(['Rippling', 'BambooHR', 'Workday', 'Gusto', 'Other']);
export const acknowledgementCadenceSchema = z.enum(['not-yet', 'hire-only', 'hire-and-annual', 'hire-and-quarterly']);
export const orgChartMaintenanceSchema = z.enum(['hris-auto', 'manual-quarterly', 'manual-annual', 'ad-hoc']);
export const boardMeetingFrequencySchema = z.enum(['monthly', 'quarterly', 'semi-annual', 'annual', 'n-a']);
export const internalAuditFrequencySchema = z.enum(['annual', 'semi-annual', 'quarterly', 'n-a']);
export const trainingCadenceSchema = z.enum(['not-yet', 'onboarding-only', 'onboarding-and-annual', 'onboarding-and-quarterly']);
export const phishingFrequencySchema = z.enum(['monthly', 'quarterly', 'semi-annual', 'n-a']);
export const penTestFrequencySchema = z.enum(['annual', 'semi-annual', 'quarterly', 'none']);
export const policyPublicationMethodSchema = z.enum(['intranet', 'wiki', 'sharepoint', 'confluence', 'notion', 'other']);

export const securityAssessmentReadinessSchema = z.enum(['not-started', 'in-progress', 'established']);

export const wizardSchema = z.object({
  company: z.object({
    name: z.string().trim().min(2, 'Company name is required'),
    website: z.string().trim().url('Enter a valid website URL'),
    primaryContactName: z.string().trim().min(2, 'Primary contact is required'),
    primaryContactEmail: z.string().trim().email('Enter a valid contact email'),
    industry: z.string().trim().min(2, 'Industry is required'),
    orgAge: orgAgeSchema,
    complianceMaturity: complianceMaturitySchema,
    targetAuditType: targetAuditTypeSchema,
  }),
  governance: z.object({
    hasEmployeeHandbook: z.boolean(),
    hasCodeOfConduct: z.boolean(),
    acknowledgementCadence: acknowledgementCadenceSchema,
    hasDisciplinaryProcedures: z.boolean(),
    hasBoardOrAdvisory: z.boolean(),
    boardMeetingFrequency: boardMeetingFrequencySchema,
    hasDedicatedSecurityOfficer: z.boolean(),
    securityOfficerTitle: z.string().trim().default(''),
    hasOrgChart: z.boolean(),
    orgChartMaintenance: orgChartMaintenanceSchema,
    hasJobDescriptions: z.boolean(),
    hasInternalAuditProgram: z.boolean(),
    internalAuditFrequency: internalAuditFrequencySchema,
    hasPerformanceReviewsLinkedToControls: z.boolean(),
  }),
  training: z.object({
    securityAwarenessTrainingTool: z.string().trim().min(1, 'Specify the training tool or enter "Manual"'),
    trainingCadence: trainingCadenceSchema,
    hasPhishingSimulation: z.boolean(),
    phishingSimulationFrequency: phishingFrequencySchema,
    hasSecurityBulletinSubscription: z.boolean(),
  }),
  scope: z.object({
    systemName: z.string().trim().min(2, 'System name is required'),
    systemDescription: z.string().trim().min(20, 'Describe the in-scope system in at least 20 characters'),
    dataTypesHandled: z.array(z.string()).min(1, 'Select at least one data type'),
    isMultiTenant: z.boolean(),
  }),
  tscSelections: z.object({
    security: z.literal(true),
    availability: z.boolean(),
    confidentiality: z.boolean(),
    processingIntegrity: z.boolean(),
    privacy: z.boolean(),
  }),
  infrastructure: z.object({
    type: infrastructureTypeSchema,
    cloudProviders: z.array(cloudProviderSchema).min(1, 'Select at least one cloud provider'),
    hostsOwnHardware: z.boolean(),
    idpProvider: idpProviderSchema,
    usesAvailabilityZones: z.boolean(),
    usesCloudVpn: z.boolean(),
    hasPhysicalServerRoom: z.boolean(),
    hasHardwareFailover: z.boolean(),
    requiresBiometricRackAccess: z.boolean(),
    tracksMediaDestruction: z.boolean(),
    usesAwsIam: z.boolean(),
    usesMacie: z.boolean(),
    usesAzureEntraId: z.boolean(),
    usesAzureKeyVault: z.boolean(),
    usesAzurePurviewDlp: z.boolean(),
    usesGcpIam: z.boolean(),
    usesSecurityCommandCenter: z.boolean(),
  }),
  subservices: z.array(subserviceSchema),
  securityTooling: z.object({
    siemTool: z.string().trim().default(''),
    hasIdsIps: z.boolean(),
    hasWaf: z.boolean(),
    endpointProtectionTool: z.string().trim().default(''),
    hasMdm: z.boolean(),
    mdmTool: z.string().trim().default(''),
    vulnerabilityScanningTool: z.string().trim().default(''),
    penetrationTestFrequency: penTestFrequencySchema,
    hasDast: z.boolean(),
    monitoringTool: z.string().trim().default(''),
    hasAutoscaling: z.boolean(),
    logRetentionDays: z.number().int().min(30).max(730).default(90),
  }),
  operations: z.object({
    ticketingSystem: z.string().trim().min(2, 'Ticketing system is required'),
    versionControlSystem: z.string().trim().min(2, 'Version control system is required'),
    onCallTool: z.string().trim().min(2, 'On-call tool is required'),
    vcsProvider: vcsProviderSchema,
    hrisProvider: hrisProviderSchema,
    terminationSlaHours: z.number().int().min(1, 'Termination SLA must be at least 1 hour').max(168, 'Termination SLA must be 168 hours or less'),
    onboardingSlaDays: z.number().int().min(1, 'Onboarding SLA must be at least 1 day').max(30, 'Onboarding SLA must be 30 days or less'),
    requiresMfa: z.boolean(),
    requiresPeerReview: z.boolean(),
    requiresCyberInsurance: z.boolean(),
    policyPublicationMethod: policyPublicationMethodSchema,
    hasCustomerContracts: z.boolean(),
    hasCustomerSupportChannel: z.boolean(),
    hasReleaseNotePractice: z.boolean(),
    hasRiskRegister: z.boolean(),
    includesFraudRiskInAssessment: z.boolean(),
    hasNdaProcess: z.boolean(),
    dataRetentionDefined: z.boolean(),
    hasDataDisposalProcedure: z.boolean(),
  }),
  securityAssessment: z.object({
    // Document Review (CC2.1, CC5.2)
    documentReview: z.object({
      readiness: securityAssessmentReadinessSchema,
      hasSecurityPolicyInventory: z.boolean(),
      hasNetworkDiagrams: z.boolean(),
      hasDataFlowDiagrams: z.boolean(),
      hasAssetInventory: z.boolean(),
      hasChangeManagementDocs: z.boolean(),
    }),
    // Log Review (CC7.2, CC7.3)
    logReview: z.object({
      readiness: securityAssessmentReadinessSchema,
      hasCentralizedLogging: z.boolean(),
      centralizedLoggingTool: z.string().trim().default(''),
      logsCoverAuthentication: z.boolean(),
      logsCoverNetworkActivity: z.boolean(),
      logsCoverSystemChanges: z.boolean(),
      hasLogRetentionPolicy: z.boolean(),
      hasAutomatedLogAnalysis: z.boolean(),
    }),
    // Ruleset Review (CC6.1, CC6.6)
    rulesetReview: z.object({
      readiness: securityAssessmentReadinessSchema,
      hasFirewallRulesets: z.boolean(),
      hasSecurityGroupRules: z.boolean(),
      hasNaclRules: z.boolean(),
      reviewsRulesetsRegularly: z.boolean(),
      rulesetReviewCadence: z.string().trim().default(''),
      hasDefaultDenyPolicy: z.boolean(),
    }),
    // System Configuration Review (CC6.1, CC6.7, CC6.8)
    configReview: z.object({
      readiness: securityAssessmentReadinessSchema,
      hasHardeningBaselines: z.boolean(),
      hardeningFramework: z.string().trim().default(''),
      hasAutomatedConfigScanning: z.boolean(),
      configScanningTool: z.string().trim().default(''),
      hasPatchManagementProcess: z.boolean(),
      patchSlaBusinessDays: z.number().int().min(0).max(90).default(14),
      hasImageBuildPipeline: z.boolean(),
    }),
    // Network Sniffing / Traffic Analysis (CC6.1, CC6.6)
    networkAnalysis: z.object({
      readiness: securityAssessmentReadinessSchema,
      hasNetworkSegmentation: z.boolean(),
      hasEncryptionInTransit: z.boolean(),
      encryptionProtocol: z.string().trim().default(''),
      hasNetworkMonitoring: z.boolean(),
      networkMonitoringTool: z.string().trim().default(''),
      hasDnsFiltering: z.boolean(),
    }),
    // File Integrity Checking (CC6.1, CC7.1)
    fileIntegrity: z.object({
      readiness: securityAssessmentReadinessSchema,
      hasFileIntegrityMonitoring: z.boolean(),
      fimTool: z.string().trim().default(''),
      monitorsCriticalSystemFiles: z.boolean(),
      monitorsConfigurationFiles: z.boolean(),
      monitorsApplicationBinaries: z.boolean(),
      hasArtifactSigningOrHashing: z.boolean(),
    }),
  }),
});

export type WizardData = z.infer<typeof wizardSchema>;
export type OrgAge = z.infer<typeof orgAgeSchema>;
export type ComplianceMaturity = z.infer<typeof complianceMaturitySchema>;
export type TargetAuditType = z.infer<typeof targetAuditTypeSchema>;
export type SubserviceInput = z.infer<typeof subserviceSchema>;
export type InfrastructureType = z.infer<typeof infrastructureTypeSchema>;
export type CloudProvider = z.infer<typeof cloudProviderSchema>;
export type IdpProvider = z.infer<typeof idpProviderSchema>;
export type VcsProvider = z.infer<typeof vcsProviderSchema>;
export type HrisProvider = z.infer<typeof hrisProviderSchema>;
export type SubserviceReviewCadence = z.infer<typeof subserviceReviewCadenceSchema>;
export type AssuranceReportType = z.infer<typeof assuranceReportTypeSchema>;
export type ControlInclusion = z.infer<typeof controlInclusionSchema>;

export const defaultWizardValues: WizardData = {
  company: {
    name: '',
    website: 'https://',
    primaryContactName: '',
    primaryContactEmail: '',
    industry: '',
    orgAge: '<1' as const,
    complianceMaturity: 'first-time' as const,
    targetAuditType: 'unsure' as const,
  },
  governance: {
    hasEmployeeHandbook: false,
    hasCodeOfConduct: false,
    acknowledgementCadence: 'not-yet' as const,
    hasDisciplinaryProcedures: false,
    hasBoardOrAdvisory: false,
    boardMeetingFrequency: 'quarterly',
    hasDedicatedSecurityOfficer: false,
    securityOfficerTitle: '',
    hasOrgChart: false,
    orgChartMaintenance: 'manual-annual',
    hasJobDescriptions: false,
    hasInternalAuditProgram: false,
    internalAuditFrequency: 'annual',
    hasPerformanceReviewsLinkedToControls: false,
  },
  training: {
    securityAwarenessTrainingTool: '',
    trainingCadence: 'not-yet' as const,
    hasPhishingSimulation: false,
    phishingSimulationFrequency: 'n-a',
    hasSecurityBulletinSubscription: false,
  },
  scope: {
    systemName: '',
    systemDescription: '',
    dataTypesHandled: [],
    isMultiTenant: true,
  },
  tscSelections: {
    security: true,
    availability: false,
    confidentiality: false,
    processingIntegrity: false,
    privacy: false,
  },
  infrastructure: {
    type: 'aws',
    cloudProviders: ['aws'],
    hostsOwnHardware: false,
    idpProvider: 'Entra ID',
    usesAvailabilityZones: true,
    usesCloudVpn: false,
    hasPhysicalServerRoom: false,
    hasHardwareFailover: false,
    requiresBiometricRackAccess: false,
    tracksMediaDestruction: false,
    usesAwsIam: true,
    usesMacie: false,
    usesAzureEntraId: false,
    usesAzureKeyVault: false,
    usesAzurePurviewDlp: false,
    usesGcpIam: false,
    usesSecurityCommandCenter: false,
  },
  subservices: [
    {
      name: 'Supabase',
      description: 'Managed database, authentication, and storage platform',
      role: 'Database & Auth',
      dataShared: 'Customer PII, Authentication secrets',
      reviewCadence: 'annual',
      hasAssuranceReport: true,
      assuranceReportType: 'soc2-type2',
      controlInclusion: 'carve-out',
    },
  ],
  securityTooling: {
    siemTool: '',
    hasIdsIps: false,
    hasWaf: false,
    endpointProtectionTool: '',
    hasMdm: false,
    mdmTool: '',
    vulnerabilityScanningTool: '',
    penetrationTestFrequency: 'annual',
    hasDast: false,
    monitoringTool: '',
    hasAutoscaling: false,
    logRetentionDays: 90,
  },
  operations: {
    ticketingSystem: 'Jira',
    versionControlSystem: 'GitHub',
    onCallTool: 'PagerDuty',
    vcsProvider: 'GitHub',
    hrisProvider: 'Rippling',
    terminationSlaHours: 4,
    onboardingSlaDays: 2,
    requiresMfa: true,
    requiresPeerReview: true,
    requiresCyberInsurance: false,
    policyPublicationMethod: 'wiki',
    hasCustomerContracts: false,
    hasCustomerSupportChannel: false,
    hasReleaseNotePractice: false,
    hasRiskRegister: false,
    includesFraudRiskInAssessment: false,
    hasNdaProcess: false,
    dataRetentionDefined: false,
    hasDataDisposalProcedure: false,
  },
  securityAssessment: {
    documentReview: {
      readiness: 'not-started',
      hasSecurityPolicyInventory: false,
      hasNetworkDiagrams: false,
      hasDataFlowDiagrams: false,
      hasAssetInventory: false,
      hasChangeManagementDocs: false,
    },
    logReview: {
      readiness: 'not-started',
      hasCentralizedLogging: false,
      centralizedLoggingTool: '',
      logsCoverAuthentication: false,
      logsCoverNetworkActivity: false,
      logsCoverSystemChanges: false,
      hasLogRetentionPolicy: false,
      hasAutomatedLogAnalysis: false,
    },
    rulesetReview: {
      readiness: 'not-started',
      hasFirewallRulesets: false,
      hasSecurityGroupRules: false,
      hasNaclRules: false,
      reviewsRulesetsRegularly: false,
      rulesetReviewCadence: '',
      hasDefaultDenyPolicy: false,
    },
    configReview: {
      readiness: 'not-started',
      hasHardeningBaselines: false,
      hardeningFramework: '',
      hasAutomatedConfigScanning: false,
      configScanningTool: '',
      hasPatchManagementProcess: false,
      patchSlaBusinessDays: 14,
      hasImageBuildPipeline: false,
    },
    networkAnalysis: {
      readiness: 'not-started',
      hasNetworkSegmentation: false,
      hasEncryptionInTransit: false,
      encryptionProtocol: '',
      hasNetworkMonitoring: false,
      networkMonitoringTool: '',
      hasDnsFiltering: false,
    },
    fileIntegrity: {
      readiness: 'not-started',
      hasFileIntegrityMonitoring: false,
      fimTool: '',
      monitorsCriticalSystemFiles: false,
      monitorsConfigurationFiles: false,
      monitorsApplicationBinaries: false,
      hasArtifactSigningOrHashing: false,
    },
  },
};

export const wizardStepTitles = [
  'Welcome',
  'Governance',
  'System Scope',
  'TSC Selection',
  'Infrastructure',
  'Security Assessment',
  'Security Tooling',
  'Operations',
  'Review',
  'Generate',
] as const;

export const dataTypeOptions = [
  {
    label: 'Customer PII',
    description: 'Personally identifiable information belonging to your end users or customers.',
    examples: ['Names and email addresses', 'Phone numbers and home addresses', 'Government-issued IDs, date of birth', 'IP addresses tied to identifiable individuals'],
    socNote: 'Selecting this is the primary trigger for the Privacy TSC (P1–P8). Auditors will expect a public privacy notice, consent tracking, and a DSAR (data subject access request) process.',
    triggersPrivacy: true,
  },
  {
    label: 'Employee data',
    description: 'HR and workforce records for your own employees or contractors.',
    examples: ['Payroll and compensation data', 'Performance reviews and disciplinary records', 'Employment history and background check results', 'Benefits enrollment data'],
    socNote: 'Auditors will verify that HR data is segregated from product data and that access is limited to HR and management roles. Employment law adds additional sensitivity.',
    triggersPrivacy: false,
  },
  {
    label: 'Payment data',
    description: 'Financial transaction data including card or bank account information.',
    examples: ['Credit and debit card numbers (PAN)', 'Bank account and routing numbers', 'Billing addresses linked to payment methods', 'Transaction histories'],
    socNote: 'If you use a payment processor (Stripe, Braintree, etc.) and never store raw card data, select this and list the processor as a subservice vendor. Auditors will check that no card data touches your systems directly.',
    triggersPrivacy: false,
  },
  {
    label: 'Authentication secrets',
    description: 'Credentials and tokens that grant access to systems or accounts.',
    examples: ['Hashed or encrypted passwords', 'API keys and service tokens', 'OAuth access and refresh tokens', 'MFA seeds and recovery codes', 'Session identifiers'],
    socNote: 'This is one of the highest-sensitivity categories. Auditors will test your secrets management tooling, rotation cadence, storage encryption, and whether secrets ever appear in logs.',
    triggersPrivacy: false,
  },
  {
    label: 'Support tickets',
    description: 'Customer-submitted issue reports, chat transcripts, and attachments.',
    examples: ['Bug reports with reproduction steps', 'Attachments like screenshots or log files', 'Chat history from support tools (Intercom, Zendesk)', 'Account or transaction details pasted by customers'],
    socNote: 'Support tickets frequently contain implicit PII — customer names, emails, and account data in the ticket body. If this is the case, also check Customer PII.',
    triggersPrivacy: false,
  },
  {
    label: 'Product telemetry',
    description: 'Usage events, performance metrics, and diagnostic data generated by your system.',
    examples: ['Feature click events and navigation paths', 'Error traces and stack dumps', 'API response times and throughput metrics', 'Session recordings or heatmaps'],
    socNote: 'Telemetry becomes a PII concern if it includes IP addresses, user IDs, or behavioral data linkable to individuals. Review what your logging captures before deciding.',
    triggersPrivacy: false,
  },
] as const;

export type DataTypeOption = typeof dataTypeOptions[number];

export const tscOptions = [
  {
    key: 'availability',
    label: 'Availability',
    criteriaCode: 'A1',
    description: 'Ensures your system is available for operation and use as committed or agreed.',
    triggers: [
      'Your contracts include uptime SLAs (e.g., 99.9% availability)',
      'Customers depend on your system for time-sensitive workflows',
      'You maintain documented RTO / RPO targets',
    ],
    templateAdditions: 2,
    templateNames: ['Business Continuity & Disaster Recovery Policy', 'Backup & Recovery Policy'],
  },
  {
    key: 'confidentiality',
    label: 'Confidentiality',
    criteriaCode: 'C1',
    description: 'Information designated as confidential is protected as committed or agreed.',
    triggers: [
      'You handle trade secrets, proprietary business data, or NDA-protected information',
      'Customer contracts require explicit confidentiality controls beyond encryption',
      'You operate in regulated industries where data classification is audited (finance, legal, healthcare)',
    ],
    templateAdditions: 2,
    templateNames: ['Data Classification & Handling Policy', 'Encryption Policy'],
  },
  {
    key: 'processingIntegrity',
    label: 'Processing Integrity',
    criteriaCode: 'PI1',
    description: 'System processing is complete, valid, accurate, timely, and authorized.',
    triggers: [
      'Your system processes financial transactions, billing calculations, or payroll',
      'Customers rely on your output data to make business-critical decisions',
      'Errors in your system\'s output could cause material financial or operational harm',
    ],
    templateAdditions: 0,
    templateNames: ['Covered via System Description (DC 200) scope statement'],
  },
  {
    key: 'privacy',
    label: 'Privacy',
    criteriaCode: 'P1–P8',
    description: 'Personal information is collected, used, retained, and disclosed in conformity with commitments.',
    triggers: [
      'You collect or process personal data from EU residents (GDPR), California consumers (CCPA), or Canadian residents (PIPEDA)',
      'Your privacy policy commits to data subject rights (access, deletion, portability)',
      'Customers ask whether you have a formal Privacy Notice aligned to AICPA privacy criteria',
    ],
    templateAdditions: 1,
    templateNames: ['Privacy Notice & Consent Framework'],
  },
] as const;

export const infrastructureOptions = [
  { value: 'aws', label: 'AWS' },
  { value: 'azure', label: 'Azure' },
  { value: 'gcp', label: 'GCP' },
  { value: 'hybrid', label: 'Hybrid cloud' },
  { value: 'self-hosted', label: 'Self-hosted' },
] as const;

export const idpProviderOptions = ['Entra ID', 'Okta', 'Google Workspace', 'JumpCloud', 'Other'] as const;

export const vcsProviderOptions = ['GitHub', 'Azure DevOps', 'GitLab', 'Bitbucket', 'Other'] as const;

export const hrisProviderOptions = ['Rippling', 'BambooHR', 'Workday', 'Gusto', 'Other'] as const;

export const subserviceReviewCadenceOptions = [
  { value: 'annual', label: 'Annual review' },
  { value: 'semi-annual', label: 'Semi-annual review' },
  { value: 'quarterly', label: 'Quarterly review' },
] as const;

export const assuranceReportTypeOptions = [
  { value: 'soc2-type2', label: 'SOC 2 Type II' },
  { value: 'soc2-type1', label: 'SOC 2 Type I' },
  { value: 'soc1', label: 'SOC 1' },
  { value: 'iso27001', label: 'ISO 27001' },
  { value: 'pentest-letter', label: 'Penetration test letter' },
  { value: 'other', label: 'Other assurance' },
  { value: 'none', label: 'No report available' },
] as const;

export const controlInclusionOptions = [
  { value: 'inclusive', label: 'Inclusive — controls tested in your report' },
  { value: 'carve-out', label: 'Carve-out — controls excluded, covered by vendor report' },
] as const;

export const orgAgeOptions = [
  { value: '<1',   label: 'Less than 1 year old' },
  { value: '1-3',  label: '1–3 years old' },
  { value: '3-10', label: '3–10 years old' },
  { value: '10+',  label: 'More than 10 years old' },
] as const;

export const complianceMaturityOptions = [
  {
    value: 'first-time',
    label: 'First time',
    description: 'We have never formally addressed SOC 2 or similar compliance. Most practices are informal or not yet established.',
  },
  {
    value: 'some-experience',
    label: 'Some experience',
    description: 'We have informal security practices in place and have thought about compliance, but have not completed a formal audit.',
  },
  {
    value: 'established',
    label: 'Established program',
    description: 'We have completed at least one formal compliance exercise (audit, assessment, or certification) and have documented controls.',
  },
] as const;

export const acknowledgementCadenceOptions = [
  { value: 'not-yet',           label: 'Not yet — we haven\'t established this practice' },
  { value: 'hire-only',         label: 'At hire only' },
  { value: 'hire-and-annual',   label: 'At hire + annual renewal' },
  { value: 'hire-and-quarterly',label: 'At hire + quarterly renewal' },
] as const;

export const orgChartMaintenanceOptions = [
  { value: 'hris-auto', label: 'Auto-generated from HRIS' },
  { value: 'manual-quarterly', label: 'Manually updated quarterly' },
  { value: 'manual-annual', label: 'Manually updated annually' },
  { value: 'ad-hoc', label: 'Updated ad-hoc' },
] as const;

export const boardMeetingFrequencyOptions = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'semi-annual', label: 'Semi-annual' },
  { value: 'annual', label: 'Annual' },
  { value: 'n-a', label: 'No board / not applicable' },
] as const;

export const internalAuditFrequencyOptions = [
  { value: 'annual', label: 'Annual' },
  { value: 'semi-annual', label: 'Semi-annual' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'n-a', label: 'No formal program yet' },
] as const;

export const trainingCadenceOptions = [
  { value: 'not-yet',                    label: 'Not yet — no formal training program exists' },
  { value: 'onboarding-only',            label: 'During onboarding only' },
  { value: 'onboarding-and-annual',      label: 'Onboarding + annual renewal' },
  { value: 'onboarding-and-quarterly',   label: 'Onboarding + quarterly renewal' },
] as const;

export const phishingFrequencyOptions = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'semi-annual', label: 'Semi-annual' },
  { value: 'n-a', label: 'No phishing simulations' },
] as const;

export const penTestFrequencyOptions = [
  { value: 'annual', label: 'Annual' },
  { value: 'semi-annual', label: 'Semi-annual' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'none', label: 'No penetration testing' },
] as const;

export const policyPublicationMethodOptions = [
  { value: 'intranet', label: 'Company intranet' },
  { value: 'wiki', label: 'Wiki (Confluence, Notion, etc.)' },
  { value: 'sharepoint', label: 'SharePoint' },
  { value: 'confluence', label: 'Confluence' },
  { value: 'notion', label: 'Notion' },
  { value: 'other', label: 'Other' },
] as const;

export const securityAssessmentReadinessOptions = [
  { value: 'not-started', label: 'Not started — no formal process yet' },
  { value: 'in-progress', label: 'In progress — partially implemented' },
  { value: 'established', label: 'Established — documented and operational' },
] as const;

export function selectedTscLabels(data: WizardData) {
  return [
    'Security',
    ...tscOptions.filter((option) => data.tscSelections[option.key]).map((option) => option.label),
  ];
}

export function selectedCriteriaCodes(data: WizardData) {
  const criteria = new Set<string>(['CC1', 'CC2', 'CC3', 'CC4', 'CC5', 'CC6', 'CC7', 'CC8', 'CC9']);

  if (data.tscSelections.availability) {
    criteria.add('A1');
  }
  if (data.tscSelections.confidentiality) {
    criteria.add('C1');
  }
  if (data.tscSelections.processingIntegrity) {
    criteria.add('PI1');
  }
  if (data.tscSelections.privacy) {
    ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8'].forEach((code) => criteria.add(code));
  }

  return [...criteria];
}
