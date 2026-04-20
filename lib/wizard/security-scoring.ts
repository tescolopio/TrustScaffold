import type { WizardData } from './schema';

// ─── Domain Definitions ──────────────────────────────────────────────────────

export type DomainKey =
  | 'documentReview'
  | 'logReview'
  | 'rulesetReview'
  | 'configReview'
  | 'networkAnalysis'
  | 'fileIntegrity';

export interface DomainScore {
  key: DomainKey;
  label: string;
  tscCriteria: string[];
  score: number;       // 0-100
  answered: number;    // how many boolean questions were answered "true"
  total: number;       // total boolean questions in this domain
  readiness: string;   // the readiness enum value
  gaps: string[];      // human-readable gap descriptions
  recommendations: string[];
}

export interface AssessmentSummary {
  domains: DomainScore[];
  overallScore: number;       // weighted average 0-100
  overallAnswered: number;
  overallTotal: number;
  completedDomains: number;   // domains where readiness !== 'not-started'
  totalDomains: number;
}

// ─── Scoring Logic ───────────────────────────────────────────────────────────

const domainMeta: Record<DomainKey, { label: string; tscCriteria: string[] }> = {
  documentReview: {
    label: 'Document Review',
    tscCriteria: ['CC2.1', 'CC5.2'],
  },
  logReview: {
    label: 'Log Review',
    tscCriteria: ['CC7.2', 'CC7.3'],
  },
  rulesetReview: {
    label: 'Ruleset Review',
    tscCriteria: ['CC6.1', 'CC6.6'],
  },
  configReview: {
    label: 'System Configuration',
    tscCriteria: ['CC6.1', 'CC6.7', 'CC6.8'],
  },
  networkAnalysis: {
    label: 'Network Analysis',
    tscCriteria: ['CC6.1', 'CC6.6'],
  },
  fileIntegrity: {
    label: 'File Integrity',
    tscCriteria: ['CC6.1', 'CC7.1'],
  },
};

interface BoolField {
  field: string;
  gap: string;
  recommendation: string;
}

const domainBoolFields: Record<DomainKey, BoolField[]> = {
  documentReview: [
    { field: 'hasSecurityPolicyInventory', gap: 'No centralized security policy inventory', recommendation: 'Create a master index of all security policies with owners, review dates, and version numbers.' },
    { field: 'hasNetworkDiagrams', gap: 'Network architecture diagrams missing or outdated', recommendation: 'Generate network topology diagrams from your cloud provider (VPC Visualizer, Azure Network Watcher) and keep them in version control.' },
    { field: 'hasDataFlowDiagrams', gap: 'No data flow diagrams showing customer data paths', recommendation: 'Map how customer data enters, traverses, and leaves your system. Include third-party integrations and data-at-rest locations.' },
    { field: 'hasAssetInventory', gap: 'Hardware/software asset inventory not maintained', recommendation: 'Use your cloud provider\'s inventory service (AWS Config, Azure Resource Graph, GCP Asset Inventory) to auto-generate and maintain asset lists.' },
    { field: 'hasChangeManagementDocs', gap: 'Change management procedures not documented', recommendation: 'Document your change approval workflow, including who approves, what testing is required, and how rollbacks work.' },
  ],
  logReview: [
    { field: 'hasCentralizedLogging', gap: 'Logs are not aggregated centrally', recommendation: 'Consolidate logs into a centralized platform (Datadog, Splunk, ELK, or cloud-native like CloudWatch/Log Analytics) for correlation and alerting.' },
    { field: 'logsCoverAuthentication', gap: 'Authentication events not logged', recommendation: 'Ensure your IdP and application log all auth events: successful logins, failed attempts, MFA challenges, and token revocations.' },
    { field: 'logsCoverNetworkActivity', gap: 'Network activity not logged', recommendation: 'Enable VPC Flow Logs (AWS), NSG Flow Logs (Azure), or VPC Flow Logs (GCP) and route them to your centralized logging platform.' },
    { field: 'logsCoverSystemChanges', gap: 'System configuration changes not logged', recommendation: 'Enable CloudTrail (AWS), Activity Logs (Azure), or Cloud Audit Logs (GCP) with write-event capture for all management actions.' },
    { field: 'hasLogRetentionPolicy', gap: 'No formal log retention policy', recommendation: 'Define and enforce a log retention policy (SOC 2 typically requires 90+ days). Configure lifecycle rules on your log storage.' },
    { field: 'hasAutomatedLogAnalysis', gap: 'No automated log analysis or SIEM correlation', recommendation: 'Set up alerting rules for suspicious patterns: brute-force attempts, privilege escalation, unusual data exports, and off-hours access.' },
  ],
  rulesetReview: [
    { field: 'hasFirewallRulesets', gap: 'Firewall rulesets not documented', recommendation: 'Export and document all firewall/security group rules. Use infrastructure-as-code (Terraform, CloudFormation) to make them auditable.' },
    { field: 'hasSecurityGroupRules', gap: 'Security groups don\'t follow least-privilege', recommendation: 'Audit security groups for overly permissive rules (0.0.0.0/0 ingress). Restrict to specific CIDRs and required ports only.' },
    { field: 'hasNaclRules', gap: 'Network ACLs not reviewed', recommendation: 'Review subnet-level NACLs alongside security groups for defense-in-depth. Document the intended purpose of each rule.' },
    { field: 'reviewsRulesetsRegularly', gap: 'No regular ruleset review cadence', recommendation: 'Schedule quarterly firewall/security group reviews. Compare current rules against documented baselines and remove stale entries.' },
    { field: 'hasDefaultDenyPolicy', gap: 'No default-deny policy at network boundary', recommendation: 'Implement implicit deny-all at the perimeter. Only allow explicitly approved traffic through allowlisted rules.' },
  ],
  configReview: [
    { field: 'hasHardeningBaselines', gap: 'No security hardening baselines defined', recommendation: 'Adopt CIS Benchmarks for your OS and cloud platforms. Document deviations with business justifications.' },
    { field: 'hasAutomatedConfigScanning', gap: 'No automated configuration compliance scanning', recommendation: 'Deploy AWS Config Rules, Azure Policy, or GCP Security Health Analytics to continuously assess configuration drift.' },
    { field: 'hasPatchManagementProcess', gap: 'No patch management process with SLAs', recommendation: 'Define patch SLAs (e.g., critical: 7 days, high: 14 days). Use SSM Patch Manager, Azure Update Management, or OS Config to automate.' },
    { field: 'hasImageBuildPipeline', gap: 'No hardened image build pipeline', recommendation: 'Build server/container images from CIS-hardened base images in a CI/CD pipeline. Rebuild regularly to incorporate OS patches.' },
  ],
  networkAnalysis: [
    { field: 'hasNetworkSegmentation', gap: 'No network segmentation between environments', recommendation: 'Separate production, staging, and corporate networks into distinct VPCs/VNets with controlled peering or transit gateways.' },
    { field: 'hasEncryptionInTransit', gap: 'Data in transit not encrypted with TLS 1.2+', recommendation: 'Enforce TLS 1.2+ on all endpoints. Disable older protocols. Use ACM (AWS), App Service Certificates (Azure), or managed SSL (GCP).' },
    { field: 'hasNetworkMonitoring', gap: 'No network traffic monitoring or anomaly detection', recommendation: 'Deploy GuardDuty (AWS), Defender for Cloud (Azure), or Security Command Center (GCP) for network-level threat detection.' },
    { field: 'hasDnsFiltering', gap: 'No DNS filtering to block malicious domains', recommendation: 'Implement DNS filtering via Route 53 Resolver DNS Firewall (AWS), Azure DNS Private Resolver, or Cloud DNS policies to block known-bad domains.' },
  ],
  fileIntegrity: [
    { field: 'hasFileIntegrityMonitoring', gap: 'No file integrity monitoring (FIM) deployed', recommendation: 'Deploy FIM on production systems using OSSEC, Wazuh, Tripwire, or cloud-native FIM (Defender for Server, AWS Config file tracking).' },
    { field: 'monitorsCriticalSystemFiles', gap: 'Critical system files not monitored', recommendation: 'Configure FIM to watch OS binaries (/usr/bin, /usr/sbin), kernel modules, and boot configuration for unauthorized changes.' },
    { field: 'monitorsConfigurationFiles', gap: 'Configuration files not monitored', recommendation: 'Add /etc/* and cloud provider config paths to FIM watch lists. Alert on any change outside approved change windows.' },
    { field: 'monitorsApplicationBinaries', gap: 'Application binaries not integrity-checked', recommendation: 'Include application binaries and container image layers in FIM. Use image digest pinning in container orchestration.' },
    { field: 'hasArtifactSigningOrHashing', gap: 'Deployment artifacts not signed or hash-verified', recommendation: 'Sign CI/CD artifacts with cosign, Sigstore, or AWS Signer. Verify signatures before deploying to production.' },
  ],
};

function scoreDomain(domainKey: DomainKey, sa: WizardData['securityAssessment']): DomainScore {
  const meta = domainMeta[domainKey];
  const boolFields = domainBoolFields[domainKey];
  const domainData = sa[domainKey] as Record<string, unknown>;

  let answered = 0;
  const gaps: string[] = [];
  const recommendations: string[] = [];

  for (const bf of boolFields) {
    if (domainData[bf.field] === true) {
      answered++;
    } else {
      gaps.push(bf.gap);
      recommendations.push(bf.recommendation);
    }
  }

  const total = boolFields.length;
  const score = total > 0 ? Math.round((answered / total) * 100) : 0;

  return {
    key: domainKey,
    label: meta.label,
    tscCriteria: meta.tscCriteria,
    score,
    answered,
    total,
    readiness: domainData.readiness as string,
    gaps,
    recommendations,
  };
}

export function computeAssessmentSummary(data: WizardData): AssessmentSummary {
  const sa = data.securityAssessment;
  const domainKeys: DomainKey[] = [
    'documentReview',
    'logReview',
    'rulesetReview',
    'configReview',
    'networkAnalysis',
    'fileIntegrity',
  ];

  const domains = domainKeys.map((key) => scoreDomain(key, sa));

  const overallAnswered = domains.reduce((sum, d) => sum + d.answered, 0);
  const overallTotal = domains.reduce((sum, d) => sum + d.total, 0);
  const overallScore = overallTotal > 0 ? Math.round((overallAnswered / overallTotal) * 100) : 0;
  const completedDomains = domains.filter((d) => d.readiness !== 'not-started').length;

  return {
    domains,
    overallScore,
    overallAnswered,
    overallTotal,
    completedDomains,
    totalDomains: domainKeys.length,
  };
}

// ─── Step Completion Tracking ────────────────────────────────────────────────

export interface StepCompletion {
  step: number;
  label: string;
  status: 'empty' | 'partial' | 'complete';
}

/**
 * Computes per-step completion status based on the current wizard data.
 * "empty" = no fields touched, "partial" = some filled, "complete" = all required fields present.
 */
export function computeStepCompletions(data: WizardData): StepCompletion[] {
  const c = data.company;
  const companyFilled = [c.name, c.website, c.primaryContactName, c.primaryContactEmail, c.industry].filter(Boolean).length;
  const companyTotal = 5;

  const g = data.governance;
  const govBools = [g.hasEmployeeHandbook, g.hasCodeOfConduct, g.hasDisciplinaryProcedures, g.hasBoardOrAdvisory, g.hasDedicatedSecurityOfficer, g.hasOrgChart, g.hasJobDescriptions, g.hasInternalAuditProgram, g.hasPerformanceReviewsLinkedToControls];
  const govFilled = govBools.filter(Boolean).length + (data.training.securityAwarenessTrainingTool ? 1 : 0);
  const govTotal = govBools.length + 1;

  const s = data.scope;
  const scopeFilled = [s.systemName, s.systemDescription].filter(Boolean).length + (s.dataTypesHandled.length > 0 ? 1 : 0);
  const scopeTotal = 3;

  const tsc = data.tscSelections;
  const tscFilled = [tsc.availability, tsc.confidentiality, tsc.processingIntegrity, tsc.privacy].filter(Boolean).length;
  // TSC always has security=true, so even 0 optional selections is valid
  const tscStatus: StepCompletion['status'] = tscFilled > 0 ? 'complete' : 'partial';

  const inf = data.infrastructure;
  const infraFilled = (inf.cloudProviders.length > 0 ? 1 : 0) + (inf.type ? 1 : 0) + (inf.idpProvider ? 1 : 0);
  const infraTotal = 3;

  const sa = data.securityAssessment;
  const saStarted = [sa.documentReview.readiness, sa.logReview.readiness, sa.rulesetReview.readiness, sa.configReview.readiness, sa.networkAnalysis.readiness, sa.fileIntegrity.readiness].filter((r) => r !== 'not-started').length;
  const saTotal = 6;

  const st = data.securityTooling;
  const toolBools = [st.hasIdsIps, st.hasWaf, st.hasMdm, st.hasDast, st.hasAutoscaling];
  const toolFilled = toolBools.filter(Boolean).length + [st.siemTool, st.endpointProtectionTool, st.vulnerabilityScanningTool, st.monitoringTool].filter(Boolean).length;
  const toolTotal = toolBools.length + 4;

  const o = data.operations;
  const opsFilled = [o.ticketingSystem, o.versionControlSystem, o.onCallTool].filter(Boolean).length;
  const opsTotal = 3;

  function status(filled: number, total: number): StepCompletion['status'] {
    if (filled === 0) return 'empty';
    if (filled >= total) return 'complete';
    return 'partial';
  }

  return [
    { step: 0, label: 'Welcome', status: status(companyFilled, companyTotal) },
    { step: 1, label: 'Governance', status: status(govFilled, govTotal) },
    { step: 2, label: 'System Scope', status: status(scopeFilled, scopeTotal) },
    { step: 3, label: 'TSC Selection', status: tscStatus },
    { step: 4, label: 'Infrastructure', status: status(infraFilled, infraTotal) },
    { step: 5, label: 'Security Assessment', status: status(saStarted, saTotal) },
    { step: 6, label: 'Security Tooling', status: status(toolFilled, toolTotal) },
    { step: 7, label: 'Operations', status: status(opsFilled, opsTotal) },
    { step: 8, label: 'Review', status: 'complete' }, // always visitable
    { step: 9, label: 'Generate', status: 'complete' },
  ];
}
