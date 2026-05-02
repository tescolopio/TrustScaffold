import {
  accessCertificationCadenceOptions,
  cdeNetworkSegmentationOptions,
  cvssRemediationThresholdOptions,
  financialSystemScopeOptions,
  incidentPlaybookTypeOptions,
  itgcRatingApproachOptions,
  minimumNecessaryApproachOptions,
  pciDataElementOptions,
  pciComplianceLevelOptions,
  pciPenetrationTestCadenceOptions,
  pciSaqLevelOptions,
  phiElementOptions,
  phiIngestionMethodOptions,
  phiStorageLocationOptions,
  postIncidentReviewWindowOptions,
  riskAppetiteOptions,
  riskReviewCadenceOptions,
  riskScoringMethodOptions,
  riskTreatmentOptions,
  soxApplicabilityOptions,
  threatModelingApproachOptions,
  threatModelingCadenceOptions,
  type WizardData,
  selectedCriteriaCodes,
} from '@/lib/wizard/schema';
import { getSelectedDocumentGenerationRules, type DocumentGenerationRule } from '@/lib/wizard/document-generation-rules';
import { getWizardDecisionTrace } from '@/lib/wizard/rule-matrix';

function getOptionLabel(options: readonly { value: string; label: string }[], value: string) {
  return options.find((option) => option.value === value)?.label ?? value;
}

function formatList(values: string[]) {
  if (values.length === 0) return '';
  if (values.length === 1) return values[0];
  if (values.length === 2) return `${values[0]} and ${values[1]}`;
  return `${values.slice(0, -1).join(', ')}, and ${values[values.length - 1]}`;
}

function formatReviewCadence(cadence: string) {
  const labels: Record<string, string> = {
    annual: 'Annual review',
    'semi-annual': 'Semi-annual review',
    quarterly: 'Quarterly review',
  };

  return labels[cadence] ?? cadence;
}

function formatAssuranceReportType(reportType: string) {
  const labels: Record<string, string> = {
    'soc2-type2': 'SOC 2 Type II',
    'soc2-type1': 'SOC 2 Type I',
    soc1: 'SOC 1',
    iso27001: 'ISO 27001',
    'pentest-letter': 'penetration test letter',
    other: 'other assurance report',
    none: 'no assurance report available',
  };

  return labels[reportType] ?? reportType;
}

function formatControlInclusion(inclusion: string) {
  const labels: Record<string, string> = {
    inclusive: 'Inclusive method',
    'carve-out': 'Carve-out method',
  };

  return labels[inclusion] ?? inclusion;
}

function formatVendorReviewFrequency(subservices: WizardData['subservices']) {
  if (subservices.some((subservice) => subservice.reviewCadence === 'quarterly')) return 'quarterly';
  if (subservices.some((subservice) => subservice.reviewCadence === 'semi-annual')) return 'semi-annually';
  return 'annually';
}

function normalizeCriterionLabel(criterion: string) {
  return criterion.replace(/\s+/g, '').toUpperCase();
}

function documentSupportsCriterion(documentCriteria: string[], criterion: string) {
  const normalizedCriterion = normalizeCriterionLabel(criterion);

  return documentCriteria.some((mappedCriterion) => {
    const normalizedMapped = normalizeCriterionLabel(mappedCriterion);

    if (normalizedMapped === normalizedCriterion) return true;
    if (normalizedMapped.includes('-')) {
      const [start] = normalizedMapped.split('-');
      return normalizedCriterion.startsWith(start);
    }

    return normalizedCriterion.startsWith(normalizedMapped);
  });
}

function getGapSeverity(item: { kind: string; criteria?: string[]; step: string }) {
  const criteria = item.criteria ?? [];

  if (item.kind === 'warning') {
    if (criteria.some((criterion) => /HIPAA|PCI|GDPR|CC6|CC7|CC8/i.test(criterion))) return 'High';
    return 'Medium';
  }

  if (item.kind === 'deep-dive') {
    if (criteria.some((criterion) => /CC1|CC4|HIPAA|PCI|ISO/i.test(criterion))) return 'Medium';
    return 'Low';
  }

  if (item.step === 'generate' || item.step === 'review') return 'Medium';
  return 'Low';
}

function getGapPriorityScore(severity: string, signalType: string) {
  const severityScore: Record<string, number> = {
    High: 300,
    Medium: 200,
    Low: 100,
  };
  const signalScore: Record<string, number> = {
    'Gap signal': 30,
    'Evidence prompt': 20,
    Recommendation: 10,
  };

  return (severityScore[severity] ?? 0) + (signalScore[signalType] ?? 0);
}

function getGapOwner(step: string, data: WizardData, primarySoxOwner: string) {
  switch (step) {
    case 'Governance':
      return data.governance.securityOfficerTitle?.trim() || data.company.primaryContactName;
    case 'Infrastructure':
      return data.company.primaryContactName;
    case 'System Scope':
      return data.company.primaryContactName;
    case 'Security Assessment':
    case 'Security Tooling':
      return data.company.primaryContactName;
    case 'Operations':
      return data.operations.incidentResponse.incidentResponseLead || data.company.primaryContactName;
    case 'Trust Service Criteria':
      return data.company.primaryContactName;
    case 'Welcome':
      return data.company.primaryContactName;
    case 'Review':
    case 'Generate':
      return primarySoxOwner || data.company.primaryContactName;
    default:
      return data.company.primaryContactName;
  }
}

function isCustomerFacingGap(item: {
  step: string;
  criteria: string;
  focus_area: string;
  related_documents: string;
}) {
  if (/board|org chart|job descriptions|security owner|internal audit/i.test(item.focus_area)) return false;
  if (/Privacy Notice|Data Protection Impact Assessment|Vendor Management Policy|System Description|Incident Response Plan|Access Control|Encryption|Business Associate Agreement|Tokenization|Legal and Regulatory Registry|Complementary/i.test(item.related_documents)) return true;
  if (/HIPAA|PCI|GDPR|CCPA|CC6|CC7|CC8|CC9/i.test(item.criteria)) return true;
  return /Infrastructure|System Scope|Operations|Security Assessment|Security Tooling/i.test(item.step);
}

function getCustomerFacingPriorityBand(item: {
  severity: string;
  criteria: string;
  signal_type: string;
}) {
  if (item.severity === 'High' || /HIPAA|PCI|GDPR|CCPA/i.test(item.criteria)) return 'Immediate customer diligence item';
  if (item.signal_type === 'Gap signal' || /CC6|CC7|CC8|CC9/i.test(item.criteria)) return 'Shared-responsibility follow-up';
  return 'Monitoring item';
}

function getCustomerFacingReviewOwner(item: {
  criteria: string;
  related_documents: string;
}, data: WizardData) {
  if (/HIPAA|Privacy|GDPR|CCPA/i.test(item.criteria) || /Privacy Notice|Data Protection Impact Assessment|Legal and Regulatory Registry/i.test(item.related_documents)) {
    return data.company.primaryContactName;
  }

  if (/Vendor Management Policy|Complementary Subservice Organization Controls Register/i.test(item.related_documents)) {
    return data.company.primaryContactName;
  }

  return data.operations.incidentResponse.incidentResponseLead || data.company.primaryContactName;
}

function getCustomerFacingPriorityScore(item: {
  priority_score: number;
  criteria: string;
  signal_type: string;
}) {
  let score = item.priority_score;

  if (/HIPAA|PCI|GDPR|CCPA/i.test(item.criteria)) score += 40;
  if (item.signal_type === 'Gap signal') score += 20;

  return score;
}

function getPrimaryCriterion(criteria?: string[]) {
  return criteria?.[0] ?? 'General readiness';
}

function getCriterionFamily(criterion: string) {
  return criterion.split('.')[0]?.toUpperCase() || criterion.toUpperCase();
}

function getCriterionTitle(criterion: string) {
  const family = getCriterionFamily(criterion);

  const titles: Record<string, string> = {
    COMMON: 'Cross-framework readiness foundation',
    CC1: 'Control Environment',
    CC2: 'Information and Communication',
    CC3: 'Risk Assessment',
    CC4: 'Monitoring Activities',
    CC5: 'Control Activities',
    CC6: 'Logical and Physical Access Controls',
    CC7: 'System Operations',
    CC8: 'Change Management',
    CC9: 'Risk Mitigation',
    A1: 'Availability',
    C1: 'Confidentiality',
    PI1: 'Processing Integrity',
    P1: 'Privacy Notice',
    P2: 'Privacy Choice and Consent',
    P3: 'Privacy Collection',
    P4: 'Privacy Use, Retention, and Disposal',
    P5: 'Privacy Access',
    P6: 'Privacy Disclosure and Notification',
    P7: 'Privacy Data Quality',
    P8: 'Privacy Monitoring and Enforcement',
    HIPAA: 'HIPAA readiness',
    PCI: 'PCI-DSS readiness',
    GDPR: 'GDPR readiness',
    CCPA: 'CCPA / CPRA readiness',
    ISO27001: 'ISO 27001 readiness',
    SOX: 'SOX / ITGC readiness',
  };

  return titles[family] ?? family;
}

function getAssessorPointOfFocus(item: {
  step: string;
  kind: string;
  criteria?: string[];
  title: string;
}) {
  const primaryCriterion = getPrimaryCriterion(item.criteria);
  const family = getCriterionFamily(primaryCriterion);

  if (family === 'CC1') return 'Governance structure, control ownership, and oversight responsibilities are defined and evidenced.';
  if (family === 'CC2') return 'Control expectations, deficiency communication, and external commitments are documented and supportable.';
  if (family === 'CC3') return 'Risks, assumptions, and dependency changes are identified, analyzed, and assigned to accountable owners.';
  if (family === 'CC4') return 'Monitoring results, deficiencies, and remediation follow-up are recorded and periodically reviewed.';
  if (family === 'CC5') return 'Control activities are defined clearly enough to be executed consistently and evidenced.';
  if (family === 'CC6') return 'Identity, access, configuration, and data-handling controls are enforced across the shared-responsibility boundary.';
  if (family === 'CC7') return 'Security operations, incident handling, and detective coverage are operating with retained evidence.';
  if (family === 'CC8') return 'Changes are reviewed, approved, tested, and promoted with adequate segregation of duties.';
  if (family === 'CC9') return 'Vendor, resiliency, and residual-risk obligations are identified and tracked to closure.';
  if (family === 'A1') return 'Availability assumptions, recovery objectives, and continuity responsibilities are documented and tested.';
  if (family === 'C1') return 'Confidential information is classified, restricted, encrypted, and disposed of according to policy.';
  if (family === 'PI1') return 'Critical processing inputs, outputs, reconciliations, and exception handling are defined and reviewable.';
  if (/^P[1-8]$/.test(family)) return 'Privacy commitments, notice, consent, request handling, and monitoring obligations are documented and supportable.';
  if (family === 'HIPAA') return 'Healthcare-regulated data handling, workforce access, and vendor obligations are documented and evidenced.';
  if (family === 'PCI') return 'Cardholder-data boundary, segmentation, and payment-security obligations are documented and evidenced.';
  if (family === 'ISO27001') return 'Control applicability, supplier dependencies, and ISMS ownership are documented for certification readiness.';
  if (family === 'SOX') return 'Financial-reporting system dependencies, access, and change controls are documented for review.';

  return item.kind === 'deep-dive'
    ? 'Underlying evidence and management decisions for this readiness area are documented before external reliance.'
    : `Management documents and evidences the readiness expectation behind "${item.title}".`;
}

function getExpectedEvidenceExamples(primaryCriterion: string, step: string, relatedDocuments: string[]) {
  const family = getCriterionFamily(primaryCriterion);

  if (family === 'CC1') return 'Board or management-review records, org chart, role ownership assignments, policy acknowledgements, and governance meeting notes.';
  if (family === 'CC3') return 'Risk register entries, vendor review notes, dependency decisions, and documented management risk acceptance.';
  if (family === 'CC4') return 'Internal audit records, monitoring results, remediation tickets, deficiency logs, and closure evidence.';
  if (family === 'CC6') return 'Access approvals, MFA settings, tenant hardening records, joiner/mover/leaver tickets, and configuration evidence.';
  if (family === 'CC7') return 'Alert coverage, incident tickets, post-incident reviews, vulnerability findings, and monitoring dashboards.';
  if (family === 'CC8') return 'Change tickets, PR reviews, branch protections, test evidence, deployment records, and rollback or emergency-review evidence.';
  if (family === 'CC9') return 'Vendor inventories, assurance reports, carve-out reviews, continuity plans, and residual-risk tracking.';
  if (family === 'A1') return 'RTO/RPO definitions, continuity test artifacts, backup restore evidence, and customer-side recovery procedures.';
  if (family === 'C1') return 'Data classification records, encryption settings, retention schedules, and disposal evidence.';
  if (family === 'PI1') return 'Reconciliations, exception logs, reviewer sign-off, output checks, and correction approvals.';
  if (/^P[1-8]$/.test(family)) return 'Privacy notice history, consent records, DSAR logs, complaint tracking, and privacy monitoring evidence.';
  if (family === 'HIPAA') return 'BAAs, PHI flow inventories, workforce access reviews, and healthcare incident-handling evidence.';
  if (family === 'PCI') return 'CDE diagrams, segmentation reviews, ASV scans, tokenization settings, and payment-security monitoring evidence.';
  if (family === 'ISO27001') return 'Applicability rationale, supplier review records, and owner-confirmed control scope statements.';
  if (family === 'SOX') return 'Access certifications, key report inventories, change approvals, interface reconciliations, and owner sign-off.';

  return relatedDocuments.length > 0
    ? `Supporting evidence should align to ${relatedDocuments.join(', ')} and the current operating model.`
    : `Supporting evidence should align to the operating model captured in the current wizard answers.`;
}

function getTargetStateDescription(item: {
  kind: string;
  recommendation?: string;
}, primaryCriterion: string) {
  const family = getCriterionFamily(primaryCriterion);

  if (item.recommendation) {
    return item.recommendation;
  }

  if (family === 'CC6') return 'Evidence shows identity, access, and tenant-configuration controls are implemented and periodically reviewed.';
  if (family === 'CC7') return 'Evidence shows operational monitoring and incident-handling practices are active, timely, and retained.';
  if (family === 'CC8') return 'Evidence shows changes are approved, reviewed, tested, and promoted under documented guardrails.';
  if (family === 'CC4') return 'Evidence shows monitoring findings are reviewed, assigned, and closed through a defined remediation loop.';

  return item.kind === 'deep-dive'
    ? 'Management has documented the actual operating approach and retained supporting evidence for external review.'
    : 'Management can show the control objective is documented, implemented, and supported by current evidence.';
}

function summarizeCapabilityList(capabilities: string[], fallback: string) {
  return capabilities.length > 0 ? capabilities.join('; ') : fallback;
}

function summarizeFunctionStatus(signals: boolean[]) {
  const implementedCount = signals.filter(Boolean).length;

  if (implementedCount >= Math.max(signals.length - 1, 1)) return 'Established';
  if (implementedCount >= Math.ceil(signals.length / 2)) return 'Partially established';
  return 'Needs definition';
}

function getNistFunctionsForCriterion(criterion: string) {
  const family = getCriterionFamily(criterion);

  const mappings: Record<string, string[]> = {
    COMMON: ['GV'],
    CC1: ['GV'],
    CC2: ['GV'],
    CC3: ['GV', 'ID'],
    CC4: ['GV'],
    CC5: ['GV'],
    CC6: ['PR'],
    CC7: ['DE', 'RS'],
    CC8: ['PR'],
    CC9: ['ID', 'RC'],
    A1: ['RC'],
    C1: ['PR'],
    PI1: ['PR', 'DE'],
    HIPAA: ['GV', 'PR', 'DE', 'RS'],
    PCI: ['GV', 'PR', 'DE'],
    ISO27001: ['GV', 'ID', 'PR', 'DE', 'RS', 'RC'],
    SOX: ['GV', 'PR'],
    GDPR: ['GV', 'PR'],
    CCPA: ['GV', 'PR'],
  };

  if (/^P[1-8]$/.test(family)) return ['GV', 'PR'];

  return mappings[family] ?? ['GV'];
}

function getNistCoverageLabel(criteriaMapped: string[]) {
  const functions = Array.from(new Set(criteriaMapped.flatMap((criterion) => getNistFunctionsForCriterion(criterion))));

  return functions.length > 0 ? functions.join(', ') : 'GV';
}

function getSoc2CoverageLabel(criteriaMapped: string[]) {
  const soc2Codes = criteriaMapped.filter((criterion) => /^(COMMON|CC\d|A1|C1|PI1|P\d)$/i.test(criterion));

  return soc2Codes.length > 0 ? soc2Codes.join(', ') : 'Shared readiness support';
}

function getFrameworkCoverageLabel({
  frameworkEnabled,
  direct,
  shared,
  directLabel,
  sharedLabel,
}: {
  frameworkEnabled: boolean;
  direct: boolean;
  shared: boolean;
  directLabel: string;
  sharedLabel: string;
}) {
  if (!frameworkEnabled) return 'Not currently in active scope';
  if (direct) return directLabel;
  if (shared) return sharedLabel;
  return 'Not primary';
}

function buildCrosswalkRow(rule: DocumentGenerationRule, data: WizardData) {
  const criteria = rule.criteriaMapped;
  const sharedSecurityControl = criteria.some((criterion) => /^(COMMON|CC\d|A1|C1|PI1|P\d)$/i.test(criterion));
  const highValueOpsControl = criteria.some((criterion) => /^(CC6|CC7|CC8|CC9|A1|C1)$/i.test(criterion));

  return {
    document_name: rule.name,
    document_slug: rule.slug,
    document_scope: rule.tsc,
    soc2_coverage: getSoc2CoverageLabel(criteria),
    nist_csf_coverage: getNistCoverageLabel(criteria),
    iso27001_coverage: getFrameworkCoverageLabel({
      frameworkEnabled: data.governance.iso27001.targeted,
      direct: criteria.includes('ISO27001'),
      shared: sharedSecurityControl,
      directLabel: 'Direct ISO 27001 readiness artifact',
      sharedLabel: 'Shared Annex A support',
    }),
    hipaa_coverage: getFrameworkCoverageLabel({
      frameworkEnabled: data.scope.containsPhi,
      direct: criteria.includes('HIPAA'),
      shared: highValueOpsControl,
      directLabel: 'Direct HIPAA safeguard artifact',
      sharedLabel: 'Shared HIPAA safeguard support',
    }),
    pci_coverage: getFrameworkCoverageLabel({
      frameworkEnabled: data.scope.hasCardholderDataEnvironment,
      direct: criteria.includes('PCI'),
      shared: highValueOpsControl,
      directLabel: 'Direct PCI-DSS artifact',
      sharedLabel: 'Shared PCI control support',
    }),
    sox_coverage: getFrameworkCoverageLabel({
      frameworkEnabled: data.company.soxApplicability !== 'none',
      direct: criteria.includes('SOX'),
      shared: criteria.some((criterion) => /^(COMMON|CC2|CC4|CC6|CC8)$/i.test(criterion)),
      directLabel: 'Direct SOX / ITGC artifact',
      sharedLabel: 'Shared ITGC support',
    }),
    mapping_basis: rule.description,
  };
}

function escapeMermaidLabel(value: string) {
  return value.replace(/"/g, '\\"').replace(/\n/g, ' ').trim();
}

function formatCloudProviderName(provider: string) {
  const labels: Record<string, string> = {
    aws: 'AWS',
    azure: 'Azure',
    gcp: 'GCP',
  };

  return labels[provider.toLowerCase()] ?? provider;
}

function getNetworkDataBoundaryLabel(data: WizardData) {
  if (data.scope.hasCardholderDataEnvironment) {
    return 'Cardholder data environment';
  }

  if (data.scope.containsPhi) {
    return 'PHI handling zone';
  }

  return 'Protected data zone';
}

function getDataFlowBoundaryLabel(data: WizardData) {
  if (data.scope.hasCardholderDataEnvironment) {
    return 'Cardholder data stores';
  }

  if (data.scope.containsPhi) {
    return 'Regulated data stores';
  }

  return 'Protected data stores';
}

function buildNetworkTopologyMermaid(data: WizardData, cloudProviders: string[], populatedSubservices: WizardData['subservices']) {
  const edgeLabel = data.securityTooling.hasWaf ? 'WAF / Edge protection' : 'Public application edge';
  const systemLabel = data.scope.systemName.trim() || 'In-scope system';
  const platformProviders = cloudProviders.map((provider) => formatCloudProviderName(provider));
  const platformLabel = platformProviders.length > 0 ? `${platformProviders.join(' + ')} workload tier` : 'Application workload tier';
  const monitoringLabel = data.securityTooling.monitoringTool || data.securityTooling.siemTool || 'Monitoring and logging';
  const dataBoundaryLabel = getNetworkDataBoundaryLabel(data);
  const lines = [
    'flowchart LR',
    '  subgraph users["Actors"]',
    '    internet["Internet / customer traffic"]',
    '    workforce["Workforce and administrators"]',
    '  end',
    '  subgraph edge_boundary["Edge and identity boundary"]',
    `    edge["${escapeMermaidLabel(edgeLabel)}"]`,
    `    idp["Identity provider: ${escapeMermaidLabel(data.infrastructure.idpProvider || 'Managed identity service')}"]`,
    '  end',
    `  subgraph app_boundary["${escapeMermaidLabel(systemLabel)}"]`,
    `    app["${escapeMermaidLabel(systemLabel)}"]`,
    `    platform["${escapeMermaidLabel(platformLabel)}"]`,
    '  end',
    `  subgraph data_boundary["${escapeMermaidLabel(dataBoundaryLabel)}"]`,
    '    datastore["Primary application data stores"]',
    '  end',
    '  subgraph ops_boundary["Security and operations"]',
    `    monitor["${escapeMermaidLabel(monitoringLabel)}"]`,
    '  end',
    '  internet --> edge',
    '  workforce --> idp',
    '  idp --> app',
    '  edge --> app',
    '  app --> platform',
    '  platform --> datastore',
    '  platform --> monitor',
  ];

  if (data.company.hasPublicWebsite) {
    lines.push('  website["Public website / marketing surface"]');
    lines.push('  internet --> website');
    lines.push('  website --> edge');
  }

  if (data.operations.ticketingSystem) {
    lines.push(`  ticketing["Ticketing / workflow: ${escapeMermaidLabel(data.operations.ticketingSystem)}"]`);
    lines.push('  platform --> ticketing');
  }

  if (data.operations.versionControlSystem || data.operations.vcsProvider) {
    lines.push(`  sdlc["Source control / delivery: ${escapeMermaidLabel(data.operations.versionControlSystem || data.operations.vcsProvider)}"]`);
    lines.push('  platform --> sdlc');
  }

  if (data.infrastructure.usesAvailabilityZones || data.infrastructure.hasHardwareFailover || data.tscSelections.availability) {
    lines.push('  backup["Backups / recovery copies"]');
    lines.push('  datastore --> backup');
  }

  if (populatedSubservices.length > 0) {
    lines.push('  subgraph vendor_boundary["Subservice organizations"]');
  }

  populatedSubservices.slice(0, 4).forEach((subservice, index) => {
    const nodeId = `vendor${index + 1}`;
    const label = subservice.name.trim() || `Subservice ${index + 1}`;
    lines.push(`    ${nodeId}["Subservice: ${escapeMermaidLabel(label)}"]`);
  });

  if (populatedSubservices.length > 0) {
    lines.push('  end');
    populatedSubservices.slice(0, 4).forEach((_, index) => {
      const nodeId = `vendor${index + 1}`;
      lines.push(`  platform --> ${nodeId}`);
    });
  }

  lines.push('  classDef actor fill:#f4f1e8,stroke:#8b7b5f,color:#352b1e,stroke-width:1.5px;');
  lines.push('  classDef boundary fill:#eef4ff,stroke:#4361a8,color:#14213d,stroke-width:1.5px;');
  lines.push('  classDef data fill:#edf7f0,stroke:#2f7d57,color:#143224,stroke-width:1.5px;');
  lines.push('  classDef ops fill:#fff4e8,stroke:#b96a12,color:#4a2a00,stroke-width:1.5px;');
  lines.push('  classDef vendor fill:#f7edf8,stroke:#8e4ea8,color:#341644,stroke-width:1.5px;');
  lines.push('  class internet,workforce actor;');
  lines.push('  class edge,idp,app,platform boundary;');
  lines.push('  class datastore,backup data;');
  lines.push('  class monitor,ticketing,sdlc ops;');

  populatedSubservices.slice(0, 4).forEach((_, index) => {
    const nodeId = `vendor${index + 1}`;
    lines.push(`  class ${nodeId} vendor;`);
  });

  return lines.join('\n');
}

function buildDataFlowMermaid(data: WizardData, populatedSubservices: WizardData['subservices']) {
  const dataScopeLabel = data.scope.containsPhi
    ? 'Regulated data including PHI'
    : data.scope.hasCardholderDataEnvironment
      ? 'Cardholder and payment-related data'
      : data.scope.dataTypesHandled.length > 0
        ? formatList(data.scope.dataTypesHandled)
        : 'Operational and customer data';
        const dataBoundaryLabel = getDataFlowBoundaryLabel(data);
  const lines = [
    'flowchart TD',
    '  subgraph actor_boundary["Actors and intake"]',
    '    actors["Customers, workforce, and approved integrations"]',
    '  end',
    `  subgraph system_boundary["${escapeMermaidLabel(data.scope.systemName)}"]`,
    `    system["${escapeMermaidLabel(data.scope.systemName)}"]`,
    '  end',
    `  subgraph data_boundary["${escapeMermaidLabel(dataBoundaryLabel)}"]`,
    `    datastore["Primary stores for ${escapeMermaidLabel(dataScopeLabel)}"]`,
    '  end',
    '  subgraph ops_boundary["Operational records"]',
    '    logs["Operational logs and monitoring"]',
    '  end',
    '  actors --> system',
    '  system --> datastore',
    '  system --> logs',
  ];

  if (data.operations.ticketingSystem) {
    lines.push(`  ticketing["Incident and workflow records: ${escapeMermaidLabel(data.operations.ticketingSystem)}"]`);
    lines.push('  logs --> ticketing');
  }

  if (data.operations.hrisProvider) {
    lines.push(`  hris["HRIS lifecycle source: ${escapeMermaidLabel(data.operations.hrisProvider)}"]`);
    lines.push('  hris --> system');
  }

  if (data.infrastructure.idpProvider) {
    lines.push(`  idp["Identity provider: ${escapeMermaidLabel(data.infrastructure.idpProvider)}"]`);
    lines.push('  idp --> system');
  }

  if (populatedSubservices.length > 0) {
    lines.push('  subgraph external_boundary["Approved downstream processors"]');
  }

  populatedSubservices.slice(0, 4).forEach((subservice, index) => {
    const nodeId = `processor${index + 1}`;
    const label = subservice.name.trim() || `Processor ${index + 1}`;
    const dataShared = subservice.dataShared?.trim() || 'Approved service data';
    lines.push(`    ${nodeId}["${escapeMermaidLabel(label)}\\n${escapeMermaidLabel(dataShared)}"]`);
  });

  if (populatedSubservices.length > 0) {
    lines.push('  end');
    populatedSubservices.slice(0, 4).forEach((_, index) => {
      const nodeId = `processor${index + 1}`;
      lines.push(`  system --> ${nodeId}`);
    });
  }

  lines.push('  classDef actor fill:#f4f1e8,stroke:#8b7b5f,color:#352b1e,stroke-width:1.5px;');
  lines.push('  classDef boundary fill:#eef4ff,stroke:#4361a8,color:#14213d,stroke-width:1.5px;');
  lines.push('  classDef data fill:#edf7f0,stroke:#2f7d57,color:#143224,stroke-width:1.5px;');
  lines.push('  classDef ops fill:#fff4e8,stroke:#b96a12,color:#4a2a00,stroke-width:1.5px;');
  lines.push('  classDef vendor fill:#f7edf8,stroke:#8e4ea8,color:#341644,stroke-width:1.5px;');
  lines.push('  class actors,hris actor;');
  lines.push('  class system,idp boundary;');
  lines.push('  class datastore data;');
  lines.push('  class logs,ticketing ops;');

  populatedSubservices.slice(0, 4).forEach((_, index) => {
    const nodeId = `processor${index + 1}`;
    lines.push(`  class ${nodeId} vendor;`);
  });

  return lines.join('\n');
}

function getActiveCustomerFrameworks(data: WizardData) {
  const frameworks = ['Security'];

  if (data.tscSelections.availability) frameworks.push('Availability');
  if (data.tscSelections.confidentiality) frameworks.push('Confidentiality');
  if (data.tscSelections.processingIntegrity) frameworks.push('Processing Integrity');
  if (data.tscSelections.privacy || data.company.websiteCollectsPersonalData || data.company.websiteTargetsEuOrUkResidents || data.company.websiteTargetsCaliforniaResidents) frameworks.push('Privacy');
  if (data.scope.containsPhi) frameworks.push('HIPAA');
  if (data.scope.hasCardholderDataEnvironment) frameworks.push('PCI-DSS');
  if (data.governance.iso27001.targeted) frameworks.push('ISO 27001');
  if (data.company.soxApplicability !== 'none') frameworks.push('SOX / ITGC');

  return Array.from(new Set(frameworks));
}

function getFrameworkScopesForGap(item: {
  criteria: string;
  related_documents: string;
  focus_area: string;
}) {
  const scopes = new Set<string>();

  if (/HIPAA|PHI/i.test(item.criteria) || /Business Associate Agreement|PHI Data Flow/i.test(item.related_documents)) scopes.add('HIPAA');
  if (/PCI/i.test(item.criteria) || /Tokenization|Vulnerability Scanning/i.test(item.related_documents)) scopes.add('PCI-DSS');
  if (/GDPR|CCPA|P\d/i.test(item.criteria) || /Privacy Notice|Data Protection Impact Assessment|Legal and Regulatory Registry/i.test(item.related_documents)) scopes.add('Privacy');
  if (/ISO/i.test(item.criteria) || /ISO 27001 Statement of Applicability|Legal and Regulatory Registry/i.test(item.related_documents)) scopes.add('ISO 27001');
  if (/SOX/i.test(item.criteria) || /SOX /i.test(item.related_documents)) scopes.add('SOX / ITGC');
  if (/A1/i.test(item.criteria) || /Business Continuity|Backup and Recovery/i.test(item.related_documents)) scopes.add('Availability');
  if (/PI1/i.test(item.criteria) || /Processing Integrity/i.test(item.related_documents)) scopes.add('Processing Integrity');
  if (/C1/i.test(item.criteria) || /Encryption|Data Classification/i.test(item.related_documents)) scopes.add('Confidentiality');

  if (scopes.size === 0 || /CC\d|COMMON/i.test(item.criteria) || /System Description|Access Control|Incident Response|Vendor Management|Complementary/i.test(item.related_documents) || /security/i.test(item.focus_area)) {
    scopes.add('Security');
  }

  return Array.from(scopes);
}

function getDerivedBridgeLetterAudiences(data: WizardData) {
  const audiences = [
    {
      id: 'general-security-customer',
      label: 'General security customer',
      description: 'Default customer-facing status view for customers reviewing baseline security and shared-responsibility expectations.',
      frameworks: ['Security'],
    },
  ];

  if (data.tscSelections.privacy || data.company.websiteCollectsPersonalData || data.company.websiteTargetsEuOrUkResidents || data.company.websiteTargetsCaliforniaResidents) {
    audiences.push({
      id: 'privacy-sensitive-customer',
      label: 'Privacy-sensitive customer',
      description: 'Customer-facing view for customers focused on personal-data handling, privacy notices, and privacy program obligations.',
      frameworks: ['Security', 'Privacy'],
    });
  }

  if (data.scope.containsPhi) {
    audiences.push({
      id: 'healthcare-customer',
      label: 'Healthcare customer',
      description: 'Customer-facing view for healthcare or HIPAA-sensitive customers evaluating PHI handling and healthcare-related shared responsibilities.',
      frameworks: ['Security', 'HIPAA'],
    });
  }

  if (data.scope.hasCardholderDataEnvironment) {
    audiences.push({
      id: 'payments-customer',
      label: 'Payments customer',
      description: 'Customer-facing view for payment-sensitive customers evaluating PCI-DSS and cardholder-data environment follow-up items.',
      frameworks: ['Security', 'PCI-DSS'],
    });
  }

  if (data.governance.iso27001.targeted || data.company.soxApplicability !== 'none') {
    audiences.push({
      id: 'enterprise-governance-customer',
      label: 'Enterprise governance customer',
      description: 'Customer-facing view for customers that care about governance-heavy readiness signals such as ISO 27001 or SOX / ITGC alignment.',
      frameworks: ['Security', ...(data.governance.iso27001.targeted ? ['ISO 27001'] : []), ...(data.company.soxApplicability !== 'none' ? ['SOX / ITGC'] : [])],
    });
  }

  return audiences;
}

export const bridgeLetterPrimaryAudienceIds = [
  'general-security-customer',
  'privacy-sensitive-customer',
  'healthcare-customer',
  'payments-customer',
  'enterprise-governance-customer',
] as const;

export type BridgeLetterPrimaryAudienceId = typeof bridgeLetterPrimaryAudienceIds[number];

export function isBridgeLetterPrimaryAudienceId(value: string): value is BridgeLetterPrimaryAudienceId {
  return bridgeLetterPrimaryAudienceIds.includes(value as BridgeLetterPrimaryAudienceId);
}

function getPrimaryBridgeLetterAudience(audiences: Array<{
  id: string;
  label: string;
  description: string;
  frameworks: string[];
}>, preferredAudienceId?: BridgeLetterPrimaryAudienceId | null) {
  if (preferredAudienceId) {
    const preferredAudience = audiences.find((audience) => audience.id === preferredAudienceId);

    if (preferredAudience) {
      return preferredAudience;
    }
  }

  const priorityOrder = [
    'payments-customer',
    'healthcare-customer',
    'privacy-sensitive-customer',
    'enterprise-governance-customer',
    'general-security-customer',
  ];

  const prioritizedAudience = priorityOrder
    .map((audienceId) => audiences.find((audience) => audience.id === audienceId))
    .find((audience) => Boolean(audience));

  return prioritizedAudience ?? audiences[0] ?? null;
}

type BuildTemplatePayloadOptions = {
  workspaceOrganizationName?: string | null;
  bridgeLetterPrimaryAudienceOverride?: BridgeLetterPrimaryAudienceId | null;
};

export function buildTemplatePayload(data: WizardData, options?: BuildTemplatePayloadOptions) {
  const populatedSubservices = data.subservices.filter((subservice) =>
    subservice.name.trim() || subservice.description.trim() || subservice.role.trim() || subservice.dataShared.trim(),
  );
  const cloudProviders = data.infrastructure.cloudProviders ?? [data.infrastructure.type === 'hybrid' ? 'aws' : data.infrastructure.type === 'self-hosted' ? 'aws' : data.infrastructure.type];
  const usesAws = cloudProviders.includes('aws');
  const usesAzure = cloudProviders.includes('azure');
  const usesGcp = cloudProviders.includes('gcp');
  const usesHybrid = cloudProviders.length > 1 || data.infrastructure.hostsOwnHardware;
  const isSelfHosted = data.infrastructure.hostsOwnHardware && cloudProviders.length === 0;
  const workspaceOrganizationName = options?.workspaceOrganizationName?.trim() || data.company.name;
  const isSameAsCompany = data.company.organizationRelationship === 'same-as-company';
  const governingOrganizationName = isSameAsCompany ? data.company.name : workspaceOrganizationName;
  const soxApplicabilityLabel = soxApplicabilityOptions.find((option) => option.value === data.company.soxApplicability)?.label ?? data.company.soxApplicability;
  const riskReviewCadenceLabel = getOptionLabel(riskReviewCadenceOptions, data.operations.riskProgram.riskReviewCadence).toLowerCase();
  const postIncidentReviewWindowLabel = getOptionLabel(postIncidentReviewWindowOptions, data.operations.incidentResponse.postIncidentReviewWindow).toLowerCase();
  const riskScoringMethodLabel = getOptionLabel(riskScoringMethodOptions, data.operations.riskProgram.riskScoringMethod).toLowerCase();
  const riskAppetiteLabel = getOptionLabel(riskAppetiteOptions, data.operations.riskProgram.riskAppetite).toLowerCase();
  const riskTreatmentLabels = data.operations.riskProgram.riskTreatmentOptions.map((value) => getOptionLabel(riskTreatmentOptions, value).toLowerCase());
  const phiElementLabels = data.scope.hipaa.phiElements.map((value) => getOptionLabel(phiElementOptions, value));
  const phiIngestionLabels = data.scope.hipaa.phiIngestionMethods.map((value) => getOptionLabel(phiIngestionMethodOptions, value));
  const phiStorageLabels = data.scope.hipaa.phiStorageLocations.map((value) => getOptionLabel(phiStorageLocationOptions, value));
  const minimumNecessaryApproachLabel = getOptionLabel(minimumNecessaryApproachOptions, data.scope.hipaa.minimumNecessaryApproach);
  const pciDataElementLabels = data.scope.pci.cardholderDataElements.map((value) => getOptionLabel(pciDataElementOptions, value));
  const pciSaqLevelLabel = getOptionLabel(pciSaqLevelOptions, data.scope.pci.pciSaqLevel);
  const pciComplianceLevelLabel = getOptionLabel(pciComplianceLevelOptions, data.scope.pci.pciComplianceLevel);
  const pciSegmentationLabel = getOptionLabel(cdeNetworkSegmentationOptions, data.scope.pci.cdeNetworkSegmentation);
  const cvssThresholdLabel = getOptionLabel(cvssRemediationThresholdOptions, data.scope.pci.cvssRemediationThreshold);
  const pciPenTestCadenceLabel = getOptionLabel(pciPenetrationTestCadenceOptions, data.scope.pci.pciPenetrationTestCadence).toLowerCase();
  const incidentPlaybookLabels = data.operations.incidentResponse.incidentTypesWithPlaybooks.map((value) => getOptionLabel(incidentPlaybookTypeOptions, value));
  const soxFinancialSystemScopeLabels = data.governance.sox.financialSystemsInScope.map((value) => getOptionLabel(financialSystemScopeOptions, value));
  const soxAccessReviewFrequencyLabel = getOptionLabel(accessCertificationCadenceOptions, data.governance.sox.accessCertificationCadence).toLowerCase();
  const soxItgcRatingApproachLabel = getOptionLabel(itgcRatingApproachOptions, data.governance.sox.itgcRatingApproach);
  const threatModelingApproachLabel = getOptionLabel(threatModelingApproachOptions, data.securityTooling.threatModelingApproach);
  const threatModelingCadenceLabel = getOptionLabel(threatModelingCadenceOptions, data.securityTooling.threatModelingCadence).toLowerCase();
  const soxFinancialSystems = data.governance.sox.itgcFinancialSystems
    .filter((system) => system.name.trim() || system.owner.trim() || system.process.trim())
    .map((system) => ({
      name: system.name.trim() || 'To be identified',
      owner: system.owner.trim() || data.company.primaryContactName,
      process: system.process.trim() || 'Financial reporting support',
    }));
  const primarySoxOwner = soxFinancialSystems[0]?.owner || data.company.primaryContactName;
  const phiInventoryRows = (phiElementLabels.length > 0 ? phiElementLabels : ['Treatment, diagnosis, claims, medical record, or healthcare-regulated fields']).map((label) => ({
    element: label,
    source: phiIngestionLabels.length > 0 ? formatList(phiIngestionLabels) : 'Customer, integration, import, or support workflow',
    system_of_record: data.scope.systemName,
    purpose: `${data.scope.systemName} operations and authorized support workflows`,
    access_roles: minimumNecessaryApproachLabel,
    retention: `${data.scope.hipaa.phiRetentionYears} years`,
    safeguards: `Encryption, ${data.scope.hipaa.phiAuditLoggingEnabled ? 'access logging' : 'restricted access'}, MFA, and review`,
  }));
  const phiDataFlowRows = [
    {
      flow: 'PHI ingestion',
      origin: phiIngestionLabels.length > 0 ? formatList(phiIngestionLabels) : 'Customer or authorized integration',
      destination: `${data.scope.systemName} production environment`,
      transfer_method: 'Encrypted transfer',
      vendor_recipient: 'Internal systems',
      logging: data.scope.hipaa.phiAuditLoggingEnabled ? 'Application and access logs' : 'Operational logging where configured',
      approval_evidence: 'Integration or change record',
    },
    {
      flow: 'PHI storage and access',
      origin: data.scope.systemName,
      destination: phiStorageLabels.length > 0 ? formatList(phiStorageLabels) : 'Primary production data stores',
      transfer_method: 'Service-to-service access path',
      vendor_recipient: data.scope.hipaa.phiThirdPartyAccess ? (data.scope.hipaa.phiBaaCounterparties || 'Approved third parties') : 'Internal only',
      logging: data.scope.hipaa.phiAuditLoggingEnabled ? 'Access and activity logs' : 'Operational logs',
      approval_evidence: 'Role approval and minimum-necessary review',
    },
    {
      flow: 'PHI support access',
      origin: 'Authorized support workflow',
      destination: `${data.operations.ticketingSystem} and approved tooling`,
      transfer_method: 'Approved support workflow',
      vendor_recipient: data.operations.ticketingSystem,
      logging: 'Ticket and access logs',
      approval_evidence: 'Support access ticket',
    },
  ];
  const vulnerabilityRemediationSla = data.scope.pci.cvssRemediationThreshold === 'all-findings'
    ? 'before scan attestation for all findings'
    : data.scope.pci.cvssRemediationThreshold === '4.0'
      ? '30 days for medium-and-above findings and before scan attestation for failing ASV findings'
      : '30 days for high-risk findings and before scan attestation for failing ASV findings';
  const paymentProcessorsText = data.scope.pci.paymentProcessors.trim() || 'Approved payment processor(s)';
  const soxReviewFrequency = data.governance.hasInternalAuditProgram ? formatReviewCadence(data.governance.internalAuditFrequency).toLowerCase() : 'quarterly';
  const soxChangeReviewFrequency = data.governance.sox.changeFreezePeriod.trim()
    ? `per release with ${data.governance.sox.changeFreezePeriod.trim()} close freeze coordination`
    : 'per release with quarterly control-owner review';
  const iso27001ScopeStatement = data.governance.iso27001.scopeStatement.trim()
    || `${data.scope.systemName}, the supporting people and business processes that operate it, the infrastructure used to deliver it, and the vendors and locations that materially support ${data.company.name}'s information security management system.`;
  const iso27001CertificationBody = data.governance.iso27001.certificationBody.trim() || 'Not yet selected';
  const iso27001ExclusionRationale = data.governance.iso27001.exclusionRationale.trim() || 'No Annex A exclusions have been formally approved yet; any exclusions require documented rationale and management approval.';
  const hasNamedTrainingProgram = data.training.securityAwarenessTrainingTool.trim().length > 0;
  const hasSensitiveDataInScope = data.tscSelections.confidentiality
    || data.scope.containsPhi
    || data.scope.hasCardholderDataEnvironment
    || data.scope.dataTypesHandled.includes('Authentication secrets')
    || data.scope.dataTypesHandled.includes('Customer PII');
  const hasSupplierFootprint = populatedSubservices.length > 0;
  const carveOutSubserviceCount = populatedSubservices.filter((subservice) => subservice.controlInclusion === 'carve-out').length;
  const inclusiveSubserviceCount = populatedSubservices.filter((subservice) => subservice.controlInclusion === 'inclusive').length;
  const subserviceWithoutAssuranceCount = populatedSubservices.filter((subservice) => !subservice.hasAssuranceReport).length;
  const selectedCriteria = selectedCriteriaCodes(data);
  const selectedDocumentRules = getSelectedDocumentGenerationRules(data);
  const activeCustomerFrameworks = getActiveCustomerFrameworks(data);
  const derivedBridgeLetterAudiences = getDerivedBridgeLetterAudiences(data);
  const selectedTrustServiceCategories = [
    { enabled: true, label: 'Security' },
    { enabled: data.tscSelections.availability, label: 'Availability' },
    { enabled: data.tscSelections.confidentiality, label: 'Confidentiality' },
    { enabled: data.tscSelections.processingIntegrity, label: 'Processing Integrity' },
    { enabled: data.tscSelections.privacy, label: 'Privacy' },
    { enabled: data.scope.containsPhi, label: 'HIPAA' },
    { enabled: data.scope.hasCardholderDataEnvironment, label: 'PCI-DSS' },
    { enabled: data.governance.iso27001.targeted, label: 'ISO 27001' },
    { enabled: data.company.soxApplicability !== 'none', label: 'SOX / ITGC' },
  ].filter((scope) => scope.enabled).map((scope) => scope.label);
  const activeDecisionTrace = getWizardDecisionTrace(data);
  const generatedDocumentRows = selectedDocumentRules.map((rule) => ({
    slug: rule.slug,
    name: rule.name,
    tsc: rule.tsc,
    criteria_hint: rule.criteriaHint,
    description: rule.description,
    output_filename: rule.outputFilenamePattern,
  }));
  const managementAssertionFocusAreas = activeDecisionTrace
    .filter((item) => item.kind === 'warning' || item.kind === 'recommendation' || item.kind === 'deep-dive')
    .slice(0, 6)
    .map((item) => ({
      title: item.title,
      step: item.stepLabel,
      summary: item.summary,
      recommendation: item.recommendation || 'Review the underlying operating evidence and remediation status before external distribution.',
    }));
  const pointsOfFocusGapRows = activeDecisionTrace
    .filter((item) => item.kind !== 'branching')
    .map((item) => {
      const relatedDocuments = selectedDocumentRules
        .filter((rule) => (item.criteria ?? []).some((criterion) => documentSupportsCriterion(rule.criteriaMapped, criterion)))
        .map((rule) => rule.name);
      const primaryCriterion = getPrimaryCriterion(item.criteria);
      const signalType = item.kind === 'warning' ? 'Gap signal' : item.kind === 'deep-dive' ? 'Evidence prompt' : 'Recommendation';
      const severity = getGapSeverity({ kind: item.kind, criteria: item.criteria, step: item.stepLabel });
      const owner = getGapOwner(item.stepLabel, data, primarySoxOwner);
      const priorityScore = getGapPriorityScore(severity, signalType);
      const criterionTitle = getCriterionTitle(primaryCriterion);
      const relatedDocumentsText = relatedDocuments.length > 0 ? relatedDocuments.join('; ') : 'Generated documents should be reviewed for compensating language';

      return {
        step: item.stepLabel,
        focus_area: item.title,
        status: item.kind === 'warning' ? 'Needs remediation' : item.kind === 'deep-dive' ? 'Needs evidence and decision' : 'Needs follow-through',
        signal_type: signalType,
        severity,
        owner,
        priority_score: priorityScore,
        primary_criterion: primaryCriterion,
        criterion_title: criterionTitle,
        point_of_focus: getAssessorPointOfFocus({ step: item.stepLabel, kind: item.kind, criteria: item.criteria, title: item.title }),
        criteria: item.criteria?.length ? item.criteria.join(', ') : 'General readiness',
        assessment_basis: item.summary,
        current_state: item.summary,
        target_state: getTargetStateDescription(item, primaryCriterion),
        expected_evidence: getExpectedEvidenceExamples(primaryCriterion, item.stepLabel, relatedDocuments),
        recommended_action: item.recommendation || 'Confirm the documented operating approach and retain supporting evidence.',
        related_documents: relatedDocumentsText,
      };
    })
    .sort((left, right) => right.priority_score - left.priority_score || left.step.localeCompare(right.step) || left.focus_area.localeCompare(right.focus_area))
    .map((row, index) => ({
      ...row,
      priority_rank: index + 1,
    }));
  const nistProfileRows = [
    {
      function_id: 'GV',
      function_name: 'Govern',
      mapped_criteria: 'COMMON, CC1, CC2, CC3, CC4',
      status: summarizeFunctionStatus([
        data.governance.hasBoardOrAdvisory,
        data.governance.hasDedicatedSecurityOfficer,
        data.operations.hasRiskRegister,
        data.governance.hasInternalAuditProgram,
      ]),
      current_profile: summarizeCapabilityList([
        ...(data.governance.hasBoardOrAdvisory ? [`Oversight body cadence: ${data.governance.boardMeetingFrequency || 'defined review cadence'}`] : []),
        ...(data.governance.hasDedicatedSecurityOfficer ? [`Security owner designated as ${data.governance.securityOfficerTitle || 'Security Lead'}`] : []),
        ...(data.operations.hasRiskRegister ? ['Formal risk register and review cadence are captured in the operating model'] : []),
        ...(data.governance.hasInternalAuditProgram ? [`Internal audit and monitoring cadence: ${data.governance.internalAuditFrequency || 'defined'}`] : []),
      ], 'Governance, ownership, and risk-management evidence are still maturing in the current wizard draft.'),
      target_profile: 'Management assigns ownership, reviews risks on a defined cadence, tracks deficiencies, and can produce governance records for internal and external stakeholders.',
      representative_evidence: 'Information Security Policy; Risk Management Policy; Internal Audit and Monitoring Policy; management review records.',
      priority_actions: pointsOfFocusGapRows
        .filter((row) => /^(COMMON|CC1|CC2|CC3|CC4)/i.test(row.primary_criterion))
        .slice(0, 3)
        .map((row) => row.focus_area)
        .join('; ') || 'Confirm governance ownership, documented review cadence, and retained management evidence.',
      related_documents: generatedDocumentRows
        .filter((row) => ['information-security-policy', 'risk-management-policy', 'internal-audit-monitoring-policy', 'management-assertion-letter'].includes(row.slug))
        .map((row) => row.name)
        .join('; '),
    },
    {
      function_id: 'ID',
      function_name: 'Identify',
      mapped_criteria: 'CC3, CC9, A1',
      status: summarizeFunctionStatus([
        data.securityAssessment.documentReview.hasAssetInventory,
        data.securityAssessment.documentReview.hasSecurityPolicyInventory,
        data.operations.hasRiskRegister,
        hasSupplierFootprint,
      ]),
      current_profile: summarizeCapabilityList([
        ...(data.securityAssessment.documentReview.hasAssetInventory ? ['Asset inventory exists for the current system boundary'] : []),
        ...(data.securityAssessment.documentReview.hasSecurityPolicyInventory ? ['Policy inventory is available for documentation review'] : []),
        ...(data.operations.hasRiskRegister ? ['Risks and treatment decisions are tracked in a formal register'] : []),
        ...(hasSupplierFootprint ? [`${populatedSubservices.length} subservice organization(s) are currently in scope`] : []),
      ], 'Asset, dependency, and system-boundary identification evidence is still limited in the current wizard draft.'),
      target_profile: 'Assets, vendors, system boundaries, and resilience dependencies are inventoried with accountable owners and periodic reassessment.',
      representative_evidence: 'System Description; Vendor Management Policy; Complementary Subservice Organization Controls Register; asset and risk inventories.',
      priority_actions: pointsOfFocusGapRows
        .filter((row) => /^(CC3|CC9|A1)/i.test(row.primary_criterion))
        .slice(0, 3)
        .map((row) => row.focus_area)
        .join('; ') || 'Confirm assets, vendors, and resilience dependencies are inventoried and reviewed.',
      related_documents: generatedDocumentRows
        .filter((row) => ['system-description', 'vendor-management-policy', 'complementary-subservice-organization-controls-register', 'asset-management-cryptographic-inventory'].includes(row.slug))
        .map((row) => row.name)
        .join('; '),
    },
    {
      function_id: 'PR',
      function_name: 'Protect',
      mapped_criteria: 'CC6, CC8, C1, PI1',
      status: summarizeFunctionStatus([
        data.operations.requiresMfa,
        Boolean(data.securityTooling.endpointProtectionTool),
        data.securityTooling.hasMdm,
        data.operations.requiresPeerReview,
      ]),
      current_profile: summarizeCapabilityList([
        ...(data.operations.requiresMfa ? ['MFA is required for the in-scope operating model'] : []),
        ...(data.securityTooling.endpointProtectionTool ? [`Endpoint protection in place: ${data.securityTooling.endpointProtectionTool}`] : []),
        ...(data.securityTooling.hasMdm ? [`Managed device controls in place via ${data.securityTooling.mdmTool || 'MDM tooling'}`] : []),
        ...(data.operations.requiresPeerReview ? ['Peer review is required before production changes are promoted'] : []),
      ], 'Preventive access, endpoint, and change-protection controls need further hardening in the current wizard draft.'),
      target_profile: 'Access, endpoint, encryption, and secure-change controls are consistently enforced across production systems and sensitive workflows.',
      representative_evidence: 'Access Control Policy; Encryption Policy; Secure SDLC Policy; Change Management Policy; endpoint-management records.',
      priority_actions: pointsOfFocusGapRows
        .filter((row) => /^(CC6|CC8|C1|PI1)/i.test(row.primary_criterion))
        .slice(0, 3)
        .map((row) => row.focus_area)
        .join('; ') || 'Confirm access, encryption, secure coding, and production-change guardrails are operating and evidenced.',
      related_documents: generatedDocumentRows
        .filter((row) => ['access-control-on-offboarding-policy', 'encryption-policy', 'secure-sdlc-policy', 'change-management-policy', 'data-classification-handling-policy'].includes(row.slug))
        .map((row) => row.name)
        .join('; '),
    },
    {
      function_id: 'DE',
      function_name: 'Detect',
      mapped_criteria: 'CC7, PI1',
      status: summarizeFunctionStatus([
        data.securityAssessment.logReview.hasCentralizedLogging,
        data.securityAssessment.logReview.logsCoverAuthentication,
        data.securityAssessment.logReview.hasAutomatedLogAnalysis || Boolean(data.securityTooling.siemTool),
        Boolean(data.securityTooling.monitoringTool),
      ]),
      current_profile: summarizeCapabilityList([
        ...(data.securityAssessment.logReview.hasCentralizedLogging ? ['Centralized logging is represented in the current review profile'] : []),
        ...(data.securityAssessment.logReview.logsCoverAuthentication ? ['Authentication activity is within current log coverage'] : []),
        ...(data.securityAssessment.logReview.hasAutomatedLogAnalysis || data.securityTooling.siemTool ? [`Automated log analysis or SIEM tooling is available${data.securityTooling.siemTool ? ` via ${data.securityTooling.siemTool}` : ''}`] : []),
        ...(data.securityTooling.monitoringTool ? [`Monitoring platform in use: ${data.securityTooling.monitoringTool}`] : []),
      ], 'Detective monitoring coverage is still light in the current wizard draft.'),
      target_profile: 'Logs, alerts, and anomaly-detection coverage identify authentication, system, and production events quickly enough for triage and escalation.',
      representative_evidence: 'SIEM or logging exports; monitoring dashboards; alert coverage matrix; Evidence Checklist.',
      priority_actions: pointsOfFocusGapRows
        .filter((row) => /^(CC7|PI1)/i.test(row.primary_criterion))
        .slice(0, 3)
        .map((row) => row.focus_area)
        .join('; ') || 'Confirm log coverage, monitoring, and alert triage are defined and retained as evidence.',
      related_documents: generatedDocumentRows
        .filter((row) => ['evidence-checklist', 'incident-response-plan', 'internal-audit-monitoring-policy'].includes(row.slug))
        .map((row) => row.name)
        .join('; '),
    },
    {
      function_id: 'RS',
      function_name: 'Respond',
      mapped_criteria: 'CC7',
      status: summarizeFunctionStatus([
        Boolean(data.operations.incidentResponse.incidentResponseLead),
        data.operations.incidentResponse.incidentTypesWithPlaybooks.length > 0,
        data.operations.incidentResponse.hasIncidentRetainer,
        Boolean(data.operations.incidentResponse.incidentEscalationPath),
      ]),
      current_profile: summarizeCapabilityList([
        ...(data.operations.incidentResponse.incidentResponseLead ? [`Incident-response lead assigned: ${data.operations.incidentResponse.incidentResponseLead}`] : []),
        ...(data.operations.incidentResponse.incidentTypesWithPlaybooks.length > 0 ? [`Playbooks defined for ${formatList(incidentPlaybookLabels)}`] : []),
        ...(data.operations.incidentResponse.hasIncidentRetainer ? [`External retainer available: ${data.operations.incidentResponse.irRetainerFirm || 'named responder'}`] : []),
        ...(data.operations.incidentResponse.incidentEscalationPath ? ['Escalation path has been captured in the operating model'] : []),
      ], 'Incident-response ownership, playbooks, and escalation evidence are still maturing in the current wizard draft.'),
      target_profile: 'Incident triage, escalation, communications, and external support are documented and exercised for the scenarios most relevant to the in-scope system.',
      representative_evidence: 'Incident Response Plan; playbooks; incident tickets; post-incident review records; retainer documentation.',
      priority_actions: pointsOfFocusGapRows
        .filter((row) => /^CC7/i.test(row.primary_criterion))
        .slice(0, 3)
        .map((row) => row.focus_area)
        .join('; ') || 'Confirm incident roles, playbooks, escalation, and communications evidence are current.',
      related_documents: generatedDocumentRows
        .filter((row) => ['incident-response-plan', 'management-assertion-letter', 'bridge-letter-comfort-letter'].includes(row.slug))
        .map((row) => row.name)
        .join('; '),
    },
    {
      function_id: 'RC',
      function_name: 'Recover',
      mapped_criteria: 'CC9, A1',
      status: summarizeFunctionStatus([
        data.tscSelections.availability,
        data.infrastructure.usesAvailabilityZones,
        data.infrastructure.hasHardwareFailover,
        data.securityTooling.hasAutoscaling,
      ]),
      current_profile: summarizeCapabilityList([
        ...(data.tscSelections.availability ? ['Availability commitments are selected in the current trust-service profile'] : []),
        ...(data.infrastructure.usesAvailabilityZones ? ['Multi-zone or segmented recovery topology is represented'] : []),
        ...(data.infrastructure.hasHardwareFailover ? ['Hardware or environment failover is reported in scope'] : []),
        ...(data.securityTooling.hasAutoscaling ? ['Autoscaling or elastic recovery support is available'] : []),
      ], 'Recovery architecture and resilience evidence need further confirmation in the current wizard draft.'),
      target_profile: 'Recovery objectives, backup paths, failover assumptions, and customer-impact communications are documented and can be validated through periodic review.',
      representative_evidence: 'Business Continuity and Disaster Recovery Policy; Backup and Recovery Policy; restore-test evidence; customer communications plan.',
      priority_actions: pointsOfFocusGapRows
        .filter((row) => /^(CC9|A1)/i.test(row.primary_criterion))
        .slice(0, 3)
        .map((row) => row.focus_area)
        .join('; ') || 'Confirm continuity assumptions, backup evidence, and resilience dependencies are documented and reviewed.',
      related_documents: generatedDocumentRows
        .filter((row) => ['business-continuity-dr-plan', 'backup-recovery-policy', 'bridge-letter-comfort-letter'].includes(row.slug))
        .map((row) => row.name)
        .join('; '),
    },
  ];
  const crosswalkRows = selectedDocumentRules.map((rule) => buildCrosswalkRow(rule, data));
  const networkDiagramStatus = data.securityAssessment.documentReview.hasNetworkDiagrams
    ? 'Existing network diagrams are reported by the wizard and should be reconciled against this generated draft.'
    : 'The wizard indicates a formal network diagram is still missing; this Mermaid draft is a starting point for review.';
  const dataFlowDiagramStatus = data.securityAssessment.documentReview.hasDataFlowDiagrams
    ? 'Existing data-flow diagrams are reported by the wizard and should be reconciled against this generated draft.'
    : 'The wizard indicates a formal data-flow diagram is still missing; this Mermaid draft is a starting point for review.';
  const networkDiagramMermaid = buildNetworkTopologyMermaid(data, cloudProviders, populatedSubservices);
  const dataFlowDiagramMermaid = buildDataFlowMermaid(data, populatedSubservices);
  const networkDiagramAssumptions = [
    'Draft generated from wizard answers; confirm exact services, segments, and trust boundaries before customer or auditor distribution.',
    data.securityTooling.hasWaf ? 'Edge protection includes WAF assumptions from the current security-tooling profile.' : 'Edge protection should be reviewed to confirm whether WAF or equivalent controls are in place.',
    populatedSubservices.length > 0 ? 'Named subservice organizations are shown as external dependencies and should be reconciled with the vendor inventory.' : 'No material subservice organizations are currently listed in the wizard draft.',
  ];
  const dataFlowDiagramAssumptions = [
    'Draft generated from wizard answers; verify data classifications, flows, and system boundaries before relying on the diagram as evidence.',
    data.scope.containsPhi ? 'PHI handling is in scope and downstream disclosures should be confirmed against BAAs and approved workflows.' : data.scope.hasCardholderDataEnvironment ? 'Payment-data handling is in scope and segmentation assumptions should be validated against the CDE design.' : 'The current flow is based on the general data types selected in the wizard profile.',
    data.operations.ticketingSystem ? `Operational exception and incident records are assumed to be tracked in ${data.operations.ticketingSystem}.` : 'Add the incident and exception-tracking system once it is finalized.',
  ];
  const managementAssertionCoverageStatement = selectedTrustServiceCategories.length > 1
    ? `${data.company.name} prepared documentation covering ${formatList(selectedTrustServiceCategories)} based on the current wizard profile and supporting operating assumptions.`
    : `${data.company.name} prepared documentation covering ${selectedTrustServiceCategories[0] ?? 'Security'} based on the current wizard profile and supporting operating assumptions.`;
  const bridgeLetterTopPriorities = pointsOfFocusGapRows.slice(0, 5).map((row) => ({
    priority_rank: row.priority_rank,
    focus_area: row.focus_area,
    severity: row.severity,
    owner: row.owner,
    recommended_action: row.recommended_action,
  }));
  const bridgeLetterCustomerPriorities = pointsOfFocusGapRows
    .filter((row) => isCustomerFacingGap(row))
    .map((row) => ({
      framework_scopes: getFrameworkScopesForGap(row),
      ...row,
      customer_priority_score: getCustomerFacingPriorityScore(row),
      customer_priority_band: getCustomerFacingPriorityBand(row),
      customer_review_owner: getCustomerFacingReviewOwner(row, data),
      customer_follow_up: row.signal_type === 'Gap signal'
        ? `Management is tracking ${row.recommended_action.charAt(0).toLowerCase()}${row.recommended_action.slice(1)}`
        : row.signal_type === 'Evidence prompt'
          ? `Management is validating supporting evidence and decision records for this area.`
          : `Management is monitoring this area and incorporating the follow-up into the readiness workplan.`,
    }))
    .filter((row) => row.framework_scopes.some((scope) => activeCustomerFrameworks.includes(scope)))
    .sort((left, right) => right.customer_priority_score - left.customer_priority_score || left.focus_area.localeCompare(right.focus_area))
    .slice(0, 5)
    .map((row, index) => ({
      priority_rank: index + 1,
      focus_area: row.focus_area,
      framework_scope: formatList(row.framework_scopes.filter((scope) => activeCustomerFrameworks.includes(scope))),
      priority_band: row.customer_priority_band,
      review_owner: row.customer_review_owner,
      customer_follow_up: row.customer_follow_up,
    }));
  const bridgeLetterProgramStatus = bridgeLetterCustomerPriorities.some((row) => row.priority_band === 'Immediate customer diligence item')
    ? 'Control environment is active and maturing, with customer-relevant diligence items currently being tracked by management.'
    : bridgeLetterCustomerPriorities.some((row) => row.priority_band === 'Shared-responsibility follow-up')
      ? 'Control environment is active with shared-responsibility follow-up items currently being monitored by management.'
      : 'Control environment is active with lower-visibility monitoring items remaining in the current customer-facing status view.';
  const bridgeLetterAudienceProfiles = derivedBridgeLetterAudiences.map((audience) => {
    const scopedPriorities = pointsOfFocusGapRows
      .filter((row) => isCustomerFacingGap(row))
      .map((row) => {
        const frameworkScopes = getFrameworkScopesForGap(row);

        return {
          ...row,
          framework_scopes: frameworkScopes,
          audience_priority_score: getCustomerFacingPriorityScore(row),
        };
      })
      .filter((row) => row.framework_scopes.some((scope) => audience.frameworks.includes(scope)))
      .sort((left, right) => right.audience_priority_score - left.audience_priority_score || left.focus_area.localeCompare(right.focus_area))
      .slice(0, 3)
      .map((row, index) => ({
        priority_rank: index + 1,
        focus_area: row.focus_area,
        framework_scope: formatList(row.framework_scopes.filter((scope) => audience.frameworks.includes(scope))),
        customer_view: getCustomerFacingPriorityBand(row),
        review_owner: getCustomerFacingReviewOwner(row, data),
      }));

    return {
      id: audience.id,
      label: audience.label,
      description: audience.description,
      framework_scope_text: formatList(audience.frameworks),
      priority_count: scopedPriorities.length,
      priorities: scopedPriorities,
    };
  }).filter((audience) => audience.priority_count > 0);
  const primaryBridgeLetterAudience = getPrimaryBridgeLetterAudience(bridgeLetterAudienceProfiles.map((audience) => ({
    id: audience.id,
    label: audience.label,
    description: audience.description,
    frameworks: audience.framework_scope_text.split(/, and | and |, /).filter(Boolean),
  })), options?.bridgeLetterPrimaryAudienceOverride ?? null);
  const selectedPrimaryBridgeLetterAudience = primaryBridgeLetterAudience
    ? bridgeLetterAudienceProfiles.find((audience) => audience.id === primaryBridgeLetterAudience.id) ?? null
    : null;
  const additionalBridgeLetterAudiences = selectedPrimaryBridgeLetterAudience
    ? bridgeLetterAudienceProfiles.filter((audience) => audience.id !== selectedPrimaryBridgeLetterAudience.id)
    : bridgeLetterAudienceProfiles;
  const nextReviewDate = new Date();
  nextReviewDate.setDate(nextReviewDate.getDate() + 90);
  const bridgeLetterNextReviewDate = nextReviewDate.toISOString().slice(0, 10);
  const isoAnnexDomainRows = [
    {
      domain: 'Organizational controls',
      applicability: 'Applicable',
      rationale: 'Governance, risk, supplier, incident, and legal controls are required for the ISMS regardless of certification timing.',
      support: 'Information Security Policy; Risk Management Policy; Vendor Management Policy; Legal and Regulatory Registry',
      owner: data.company.primaryContactName,
      status: data.governance.iso27001.targeted ? 'In active certification scope' : 'Baseline cross-framework reference',
    },
    {
      domain: 'People controls',
      applicability: hasNamedTrainingProgram || data.governance.hasEmployeeHandbook || data.governance.hasCodeOfConduct ? 'Applicable' : 'Applicable but maturing',
      rationale: hasNamedTrainingProgram || data.governance.hasEmployeeHandbook || data.governance.hasCodeOfConduct
        ? 'Workforce expectations, awareness, and disciplinary controls are reflected in handbook, conduct, and training answers.'
        : 'People controls still apply, but the current wizard answers show limited formal workforce documentation or training evidence.' ,
      support: 'Acceptable Use and Code of Conduct Policy; Security Awareness program; Evidence Checklist',
      owner: data.company.primaryContactName,
      status: data.governance.iso27001.targeted ? 'Needs control-owner confirmation' : 'Starter applicability',
    },
    {
      domain: 'Physical controls',
      applicability: data.infrastructure.hostsOwnHardware || data.infrastructure.hasPhysicalServerRoom ? 'Applicable' : 'Applicable (inherited / workplace managed)',
      rationale: data.infrastructure.hostsOwnHardware || data.infrastructure.hasPhysicalServerRoom
        ? 'Self-hosted assets or controlled physical environments are in scope and require explicit physical-security controls.'
        : 'Physical controls still apply through workforce devices, office practices, and inherited cloud-provider data-center controls.',
      support: 'Physical Security Policy; System Description',
      owner: data.company.primaryContactName,
      status: data.governance.iso27001.targeted ? 'Needs inheritance validation' : 'Starter applicability',
    },
    {
      domain: 'Technological controls',
      applicability: 'Applicable',
      rationale: 'Identity, access, logging, vulnerability management, encryption, change management, and secure development controls are relevant to the in-scope system.',
      support: 'Access Control; Encryption; Secure SDLC; Change Management; Asset and Cryptographic Inventory',
      owner: data.company.primaryContactName,
      status: data.governance.iso27001.targeted ? 'In active certification scope' : 'Baseline cross-framework reference',
    },
  ];
  const isoDerivedControlRows = [
    {
      control: 'A.5 Organizational controls',
      applicability: 'Applicable',
      rationale: 'The ISMS requires governance, risk, supplier, and incident-management control coverage.',
      support: 'Information Security Policy; Risk Management Policy',
      owner: data.company.primaryContactName,
      status: 'Seeded from wizard answers',
    },
    {
      control: 'A.6 People controls',
      applicability: hasNamedTrainingProgram || data.governance.hasEmployeeHandbook ? 'Applicable' : 'Applicable but maturing',
      rationale: hasNamedTrainingProgram || data.governance.hasEmployeeHandbook
        ? 'Employee handbook and security awareness answers indicate workforce control expectations exist.'
        : 'People controls still apply, but the current answers show limited formal workforce onboarding or training evidence.',
      support: 'Acceptable Use and Code of Conduct Policy; Security Awareness program',
      owner: data.company.primaryContactName,
      status: 'Review required',
    },
    {
      control: 'A.7 Physical controls',
      applicability: data.infrastructure.hostsOwnHardware || data.infrastructure.hasPhysicalServerRoom ? 'Applicable' : 'Applicable (inherited / workplace managed)',
      rationale: data.infrastructure.hostsOwnHardware || data.infrastructure.hasPhysicalServerRoom
        ? 'Physical hosting or controlled server space is in scope.'
        : 'Physical control obligations are inherited from cloud providers and workforce-device practices.',
      support: 'Physical Security Policy; System Description',
      owner: data.company.primaryContactName,
      status: 'Review required',
    },
    {
      control: 'A.7.14 Secure disposal or reuse of equipment / media',
      applicability: data.infrastructure.tracksMediaDestruction || data.infrastructure.hostsOwnHardware || data.securityTooling.hasMdm ? 'Applicable' : 'Review required',
      rationale: data.infrastructure.tracksMediaDestruction || data.infrastructure.hostsOwnHardware || data.securityTooling.hasMdm
        ? 'Media destruction, endpoint management, or self-hosted asset handling is in scope.'
        : 'No explicit media-destruction or managed-device evidence is captured yet.',
      support: 'Physical Security Policy; Endpoint and device management evidence',
      owner: data.company.primaryContactName,
      status: 'Review required',
    },
    {
      control: 'A.8.24 Use of cryptography',
      applicability: hasSensitiveDataInScope ? 'Applicable' : 'Applicable',
      rationale: hasSensitiveDataInScope
        ? 'Sensitive or regulated data types in scope require encryption and key-management controls.'
        : 'Cryptography remains a baseline technological control even when the current data profile is lower sensitivity.',
      support: 'Encryption Policy; Cryptographic Inventory',
      owner: data.company.primaryContactName,
      status: 'Seeded from wizard answers',
    },
    {
      control: 'A.8.28 Secure coding',
      applicability: data.company.businessModel === 'software' || data.company.businessModel === 'hybrid' ? 'Applicable' : 'Review required',
      rationale: data.company.businessModel === 'software' || data.company.businessModel === 'hybrid'
        ? 'Software delivery is part of the operating model, so secure design and code-review controls apply directly.'
        : 'If software is not materially developed in-house, secure coding controls may be inherited or limited in scope and should be explicitly reviewed.',
      support: 'Secure SDLC Policy; Change Management Policy',
      owner: data.company.primaryContactName,
      status: 'Seeded from wizard answers',
    },
    {
      control: 'A.5.19 / A.5.20 Supplier relationship security',
      applicability: hasSupplierFootprint ? 'Applicable' : 'Applicable but limited current supplier scope',
      rationale: hasSupplierFootprint
        ? 'Named subprocessors or vendors are in scope and require supplier-control review.'
        : 'Supplier-control obligations still exist, but the current wizard draft does not list material vendors yet.',
      support: 'Vendor Management Policy; Subservice inventory',
      owner: data.company.primaryContactName,
      status: 'Review required',
    },
    {
      control: 'A.5.24 Incident management planning and preparation',
      applicability: 'Applicable',
      rationale: 'Incident response planning applies to the in-scope system regardless of certification timing.',
      support: 'Incident Response Plan',
      owner: data.operations.incidentResponse.incidentResponseLead || data.company.primaryContactName,
      status: 'Seeded from wizard answers',
    },
  ];
  const cuecRows = [
    {
      area: 'Identity and access administration',
      customer_responsibility: `Approve user access for ${data.scope.systemName}, maintain role appropriateness, and promptly remove access that is no longer needed.`,
      rationale: 'Logical access controls rely on user entities to approve workforce access, privileged roles, and joiner/mover/leaver changes.',
      related_controls: 'Access Control and On/Offboarding Policy; Information Security Policy',
      evidence_examples: `Access approval records, periodic access reviews, and administrator oversight retained in ${data.operations.ticketingSystem}.`,
    },
    {
      area: 'Authentication and secure configuration',
      customer_responsibility: data.operations.requiresMfa
        ? 'Enable MFA where supported, protect shared secrets, and maintain secure configuration for integrations, admin features, and support channels.'
        : 'Maintain secure configuration for integrations, admin features, and support channels, including strong authentication where available.',
      rationale: 'The service control environment assumes customer-managed endpoints, secrets, and tenant settings are configured according to documented guidance.',
      related_controls: 'Access Control and On/Offboarding Policy; Encryption Policy; System Description',
      evidence_examples: 'Configuration reviews, tenant hardening checklists, secret-management procedures, and administrator setup records.',
    },
    {
      area: 'Data submission and classification',
      customer_responsibility: hasSensitiveDataInScope
        ? `Classify data before uploading it to ${data.scope.systemName}, restrict regulated data sharing to approved workflows, and verify contracts support the intended data use.`
        : `Confirm data shared with ${data.scope.systemName} is authorized, accurate, and limited to the intended business purpose.`,
      rationale: 'TrustScaffold controls cover the platform boundary, but user entities remain responsible for the legality, accuracy, and appropriateness of data they submit.',
      related_controls: 'Data Classification and Handling Policy; Data Retention and Disposal Policy',
      evidence_examples: 'Customer onboarding records, approved use cases, data-sharing approvals, and retention selections.',
    },
    {
      area: 'Incident and support coordination',
      customer_responsibility: 'Maintain current security and operational contacts, promptly report suspected misuse or incidents, and validate support requesters before sensitive actions are taken.',
      rationale: 'Timely incident handling depends on customer escalation contacts, approved support channels, and confirmation of authorized requesters.',
      related_controls: 'Incident Response Plan; Vendor Management Policy',
      evidence_examples: 'Escalation matrices, support authorization records, and incident communications.',
    },
  ];

  if (data.tscSelections.availability) {
    cuecRows.push({
      area: 'Business continuity coordination',
      customer_responsibility: 'Define internal recovery priorities, test dependent workflows, and retain alternate procedures for critical business operations that rely on the service.',
      rationale: 'Availability commitments assume customers understand their own RTO, RPO, and manual fallback procedures.',
      related_controls: 'Business Continuity and Disaster Recovery Policy; Backup and Recovery Policy',
      evidence_examples: 'Recovery runbooks, customer-side continuity procedures, and periodic tabletop or restore validation records.',
    });
  }

  if (data.tscSelections.processingIntegrity) {
    cuecRows.push({
      area: 'Input, output, and exception review',
      customer_responsibility: 'Review key outputs, investigate exceptions, and reconcile critical transactions or reports when they support downstream decision-making.',
      rationale: 'Processing-integrity objectives depend on customer review of business results, exception queues, and correction workflows.',
      related_controls: 'Processing Integrity Policy; Change Management Policy',
      evidence_examples: 'Reconciliation logs, exception-management tickets, reviewer sign-off, and correction approvals.',
    });
  }

  if (hasSupplierFootprint) {
    cuecRows.push({
      area: 'Subservice and dependency oversight',
      customer_responsibility: 'Review disclosed subservice organizations, understand any carve-out assumptions, and confirm contractual or configuration requirements for external dependencies are met.',
      rationale: 'Some service commitments depend on third-party platforms, and user entities should understand which controls remain theirs versus those inherited from subservice organizations.',
      related_controls: 'Vendor Management Policy; System Description; CSOC Register',
      evidence_examples: 'Vendor disclosure reviews, procurement records, approved integration settings, and dependency risk sign-off.',
    });
  }

  const csocRows = populatedSubservices.length > 0
    ? populatedSubservices.map((subservice) => {
        const role = subservice.role || subservice.description || 'Supporting service provider';
        const assuranceBasis = subservice.hasAssuranceReport
          ? `${formatAssuranceReportType(subservice.assuranceReportType)} using the ${formatControlInclusion(subservice.controlInclusion).toLowerCase()}`
          : 'No current assurance report documented; onboarding and monitoring rely on due diligence and contractual controls';

        return {
          vendor_name: subservice.name,
          service_scope: role,
          data_shared: subservice.dataShared || 'Not specified',
          assurance_basis: assuranceBasis,
          control_model: subservice.hasAssuranceReport ? formatControlInclusion(subservice.controlInclusion) : 'Direct due diligence',
          trustscaffold_controls: subservice.controlInclusion === 'carve-out'
            ? `Retain complementary controls around ${role.toLowerCase()}, monitor vendor notifications, and evaluate user-control considerations from ${subservice.name}.`
            : subservice.hasAssuranceReport
              ? `Map ${subservice.name} assurance coverage into the vendor review process and track any exceptions or bridge-period commitments.`
              : `Document compensating controls, contract review, and periodic reassessment for ${subservice.name} until assurance evidence is available.`,
          customer_monitoring: subservice.controlInclusion === 'carve-out'
            ? 'Review disclosed carve-out assumptions, maintain approved configurations, and evaluate whether additional customer-managed controls are required.'
            : 'Understand the dependency, review vendor disclosures as needed, and confirm integration settings remain aligned to approved use.',
          review_cadence: formatReviewCadence(subservice.reviewCadence),
        };
      })
    : [
        {
          vendor_name: 'No material subservice organizations currently listed',
          service_scope: 'Vendor inventory confirmation pending',
          data_shared: 'N/A',
          assurance_basis: 'No subservice assurance dependencies documented in the current wizard draft',
          control_model: 'Not applicable',
          trustscaffold_controls: 'Confirm the vendor inventory is complete before relying on this register for audit use.',
          customer_monitoring: 'Validate that no material third-party processors or hosting vendors have been omitted from the current scope.',
          review_cadence: 'Annual review',
        },
      ];

  return {
    organization_name: data.company.name,
    company_name: data.company.name,
    workspace_organization_name: workspaceOrganizationName,
    governing_organization_name: governingOrganizationName,
    governed_company_name: data.company.name,
    company_is_workspace_organization: isSameAsCompany,
    organization_relationship: data.company.organizationRelationship,
    company_business_model: data.company.businessModel,
    company_delivery_model: data.company.deliveryModel,
    has_public_website: data.company.hasPublicWebsite,
    primary_product_name: data.scope.systemName,
    effective_date: new Date().toISOString().slice(0, 10),
    policy_version: 'v0.1-draft',
    approver_name: data.company.primaryContactName,
    executive_sponsor_name: data.company.primaryContactName,
    system_owner_name: data.company.primaryContactName,
    policy_owner: data.company.primaryContactName,
    control_operator: data.company.primaryContactName,
    incident_commander_name: data.company.primaryContactName,
    security_contact_email: data.company.primaryContactEmail,
    privacy_contact_email: data.company.primaryContactEmail,
    company_website: data.company.hasPublicWebsite ? data.company.website : '',
    sox_applicability: data.company.soxApplicability,
    sox_applicability_label: soxApplicabilityLabel,
    is_sox_applicable: data.company.soxApplicability !== 'none',
    website_collects_personal_data: data.company.websiteCollectsPersonalData,
    website_uses_cookies_analytics: data.company.websiteUsesCookiesAnalytics,
    website_targets_eu_or_uk_residents: data.company.websiteTargetsEuOrUkResidents,
    website_targets_california_residents: data.company.websiteTargetsCaliforniaResidents,
    website_allows_children_under_13: data.company.websiteAllowsChildrenUnder13,
    website_has_privacy_notice: data.company.websiteHasPrivacyNotice,
    website_has_cookie_banner: data.company.websiteHasCookieBanner,
    website_sells_or_shares_personal_information: data.company.websiteSellsOrSharesPersonalInformation,
    dsar_request_channel: data.company.dsarRequestChannel || data.company.primaryContactEmail,
    deployment_model: data.scope.isMultiTenant ? 'multi-tenant SaaS' : 'single-tenant SaaS',
    idp_provider: data.infrastructure.idpProvider,
    cloud_providers: cloudProviders,
    hosts_own_hardware: data.infrastructure.hostsOwnHardware,
    uses_aws: usesAws,
    uses_azure: usesAzure,
    uses_gcp: usesGcp,
    uses_hybrid: usesHybrid,
    is_self_hosted: isSelfHosted,
    uses_availability_zones: data.infrastructure.usesAvailabilityZones,
    uses_cloud_vpn: data.infrastructure.usesCloudVpn,
    has_physical_server_room: data.infrastructure.hasPhysicalServerRoom,
    has_hardware_failover: data.infrastructure.hasHardwareFailover,
    requires_biometric_rack_access: data.infrastructure.requiresBiometricRackAccess,
    tracks_media_destruction: data.infrastructure.tracksMediaDestruction,
    is_multi_tenant: data.scope.isMultiTenant,
    access_review_frequency: 'quarter',
    offboarding_sla_hours: data.operations.terminationSlaHours,
    termination_sla_hours: data.operations.terminationSlaHours,
    onboarding_sla_days: data.operations.onboardingSlaDays,
    triage_sla_minutes: data.operations.incidentResponse.incidentTriageSlaMinutes,
    has_customer_notification_commitment: true,
    customer_notification_window: `${data.operations.incidentResponse.incidentNotificationWindowHours} hours`,
    post_incident_review_window: postIncidentReviewWindowLabel,
    risk_review_frequency: riskReviewCadenceLabel,
    recovery_time_objective: '8 hours',
    recovery_point_objective: '4 hours',
    critical_support_hours: 'business hours with severity-based escalation',
    recovery_lead_name: data.company.primaryContactName,
    communications_lead_name: data.company.primaryContactName,
    bcdr_test_frequency: 'annually',
    uses_multi_region: cloudProviders.length > 1 || data.infrastructure.hostsOwnHardware,
    uses_backups: true,
    backup_frequency: 'daily',
    backup_retention_period: '35 days',
    restore_test_frequency: 'quarterly',
    backup_encryption_enabled: true,
    minimum_tls_version: '1.2',
    requires_consent: data.tscSelections.privacy,
    requires_mfa: data.operations.requiresMfa,
    requires_peer_review: data.operations.requiresPeerReview,
    approval_count: data.operations.requiresPeerReview ? 'at least one' : 'documented compensating management',
    source_control_tool: data.operations.versionControlSystem || data.operations.vcsProvider,
    requires_cyber_insurance: data.operations.requiresCyberInsurance,
    dsar_acknowledgement_window: '5 business days',
    vendor_review_frequency: formatVendorReviewFrequency(data.subservices),
    processing_integrity_owner: data.company.primaryContactName,
    processing_integrity_review_frequency: 'quarterly',
    processing_exception_sla: '2 business days',
    validation_logic: 'required-field checks, source authorization checks, duplicate detection, format validation, reconciliation rules, and exception queue review',
    data_integrity_checks: 'input validation tests, control-total reconciliations, duplicate checks, failed-job review, output sampling, and correction approval records',
    control_monitoring_frequency: data.governance.internalAuditFrequency || 'quarterly',
    runs_sast: data.securityTooling.hasSastTool,
    runs_dependency_scanning: data.securityTooling.hasDependencyScanning,
    runs_secrets_scanning: data.securityTooling.hasSecretsScanningTool,
    has_production_change_reviews: data.operations.requiresPeerReview || (data.operations.changeReviewApproachWhenNoPeerReview !== '' && data.operations.changeReviewApproachWhenNoPeerReview !== 'none-today'),
    stores_customer_pii: data.scope.dataTypesHandled.includes('Customer PII'),
    stores_phi: data.scope.containsPhi,
    has_cardholder_data_environment: data.scope.hasCardholderDataEnvironment,
    has_customer_pii: data.scope.dataTypesHandled.includes('Customer PII'),
    handles_payment_data: data.scope.dataTypesHandled.includes('Payment data'),
    baa_review_frequency: 'annually',
    breach_notification_window: '60 calendar days',
    phi_inventory_review_frequency: riskReviewCadenceLabel || 'quarterly',
    pci_scan_frequency: 'quarterly',
    asv_scan_frequency: 'every 90 days',
    vulnerability_remediation_sla: vulnerabilityRemediationSla,
    soa_review_frequency: 'annually and after material scope changes',
    iso27001_targeted: data.governance.iso27001.targeted,
    iso27001_program_status: data.governance.iso27001.targeted ? 'Targeted for ISO 27001 certification' : 'Baseline cross-framework SoA only',
    iso27001_scope_statement: iso27001ScopeStatement,
    iso27001_certification_body: iso27001CertificationBody,
    iso27001_exclusion_rationale: iso27001ExclusionRationale,
    iso_annex_domain_rows: isoAnnexDomainRows,
    iso_derived_control_rows: isoDerivedControlRows,
    cuec_review_frequency: 'annually and after material service or dependency changes',
    cuec_rows: cuecRows,
    csoc_review_frequency: 'quarterly vendor review and after material dependency changes',
    csoc_rows: csocRows,
    selected_criteria_codes: selectedCriteria,
    selected_trust_service_categories: selectedTrustServiceCategories,
    selected_trust_service_categories_text: formatList(selectedTrustServiceCategories),
    generated_document_rows: generatedDocumentRows,
    generated_document_count: generatedDocumentRows.length,
    nist_csf_profile_rows: nistProfileRows,
    nist_csf_profile_count: nistProfileRows.length,
    control_framework_crosswalk_rows: crosswalkRows,
    control_framework_crosswalk_count: crosswalkRows.length,
    network_diagram_status: networkDiagramStatus,
    data_flow_diagram_status: dataFlowDiagramStatus,
    network_topology_mermaid: networkDiagramMermaid,
    data_flow_mermaid: dataFlowDiagramMermaid,
    network_diagram_assumptions: networkDiagramAssumptions,
    network_diagram_assumption_count: networkDiagramAssumptions.length,
    data_flow_diagram_assumptions: dataFlowDiagramAssumptions,
    data_flow_diagram_assumption_count: dataFlowDiagramAssumptions.length,
    management_assertion_focus_areas: managementAssertionFocusAreas,
    management_assertion_focus_area_count: managementAssertionFocusAreas.length,
    management_assertion_coverage_statement: managementAssertionCoverageStatement,
    bridge_letter_program_status: bridgeLetterProgramStatus,
    bridge_letter_active_frameworks: activeCustomerFrameworks,
    bridge_letter_active_frameworks_text: formatList(activeCustomerFrameworks),
    bridge_letter_primary_audience: selectedPrimaryBridgeLetterAudience,
    bridge_letter_has_primary_audience: Boolean(selectedPrimaryBridgeLetterAudience),
    bridge_letter_additional_audiences: additionalBridgeLetterAudiences,
    bridge_letter_additional_audience_count: additionalBridgeLetterAudiences.length,
    bridge_letter_audience_profiles: bridgeLetterAudienceProfiles,
    bridge_letter_audience_profile_count: bridgeLetterAudienceProfiles.length,
    bridge_letter_customer_priorities: bridgeLetterCustomerPriorities,
    bridge_letter_customer_priority_count: bridgeLetterCustomerPriorities.length,
    bridge_letter_top_priorities: bridgeLetterTopPriorities,
    bridge_letter_top_priority_count: bridgeLetterTopPriorities.length,
    bridge_letter_next_review_date: bridgeLetterNextReviewDate,
    points_of_focus_gap_rows: pointsOfFocusGapRows,
    points_of_focus_gap_count: pointsOfFocusGapRows.length,
    subservice_count: populatedSubservices.length,
    carve_out_subservice_count: carveOutSubserviceCount,
    inclusive_subservice_count: inclusiveSubserviceCount,
    subservice_without_assurance_count: subserviceWithoutAssuranceCount,
    legal_registry_review_frequency: 'quarterly',
    dpia_review_frequency: 'annually and before high-risk processing changes',
    sox_review_frequency: soxReviewFrequency,
    sox_access_review_frequency: soxAccessReviewFrequencyLabel,
    sox_change_review_frequency: soxChangeReviewFrequency,
    cryptographic_inventory_review_frequency: 'quarterly',
    key_rotation_frequency: 'annually or upon suspected compromise',
    approved_encryption_algorithms: 'AES-256 for data at rest, TLS 1.2 or higher for data in transit, SHA-256 or stronger for integrity checks, and provider-managed HSM-backed key protection where available',
    has_subprocessors: populatedSubservices.length > 0,
    subprocessors: populatedSubservices.map((subservice) => ({
      name: subservice.name,
      service_description: subservice.description,
      role: subservice.role || subservice.description,
      data_shared: subservice.dataShared || 'Not specified',
      review_cadence: formatReviewCadence(subservice.reviewCadence),
      has_assurance_report: subservice.hasAssuranceReport,
      assurance_report_type: formatAssuranceReportType(subservice.assuranceReportType),
      control_inclusion: subservice.controlInclusion,
    })),
    data_classifications: data.scope.dataTypesHandled.map((dataType) => ({
      name: dataType,
      description: `${dataType} collected or processed by ${data.scope.systemName}`,
    })),
    has_office_locations: false,
    office_locations: [],
    ticketing_system: data.operations.ticketingSystem,
    version_control_system: data.operations.versionControlSystem,
    vcs_provider: data.operations.vcsProvider,
    hris_provider: data.operations.hrisProvider,
    on_call_tool: data.operations.onCallTool,
    sox_control_owner: primarySoxOwner,
    finance_system_owner: primarySoxOwner,
    incident_response_lead: data.operations.incidentResponse.incidentResponseLead || data.company.primaryContactName,
    incident_escalation_path: data.operations.incidentResponse.incidentEscalationPath || 'On-call escalation and executive notification workflow',
    incident_playbooks: incidentPlaybookLabels,
    incident_playbooks_text: incidentPlaybookLabels.length > 0 ? formatList(incidentPlaybookLabels) : 'Ransomware, data breach, and account compromise scenarios',
    has_incident_retainer: data.operations.incidentResponse.hasIncidentRetainer,
    incident_retainer_firm: data.operations.incidentResponse.irRetainerFirm,
    risk_scoring_method: riskScoringMethodLabel,
    risk_appetite: riskAppetiteLabel,
    risk_treatment_options: riskTreatmentLabels,
    risk_treatment_options_text: riskTreatmentLabels.length > 0 ? formatList(riskTreatmentLabels) : 'mitigate, accept, transfer, and avoid',
    risk_register_tool: data.operations.riskProgram.riskRegisterTool || 'documented risk register',
    phi_elements: phiElementLabels,
    phi_elements_text: phiElementLabels.length > 0 ? formatList(phiElementLabels) : 'Treatment, diagnosis, claims, medical record, or healthcare-regulated fields',
    phi_ingestion_methods: phiIngestionLabels,
    phi_ingestion_methods_text: phiIngestionLabels.length > 0 ? formatList(phiIngestionLabels) : 'Customer or authorized integration',
    phi_storage_locations: phiStorageLabels,
    phi_storage_locations_text: phiStorageLabels.length > 0 ? formatList(phiStorageLabels) : 'Primary production data stores',
    phi_inventory_rows: phiInventoryRows,
    phi_data_flow_rows: phiDataFlowRows,
    phi_third_party_access: data.scope.hipaa.phiThirdPartyAccess,
    phi_baa_counterparties: data.scope.hipaa.phiBaaCounterparties,
    minimum_necessary_approach: minimumNecessaryApproachLabel,
    phi_retention_period: `${data.scope.hipaa.phiRetentionYears} years`,
    hipaa_security_officer_designated: data.scope.hipaa.hipaaSecurityOfficerDesignated,
    hipaa_privacy_officer_designated: data.scope.hipaa.hipaaPrivacyOfficerDesignated,
    phi_audit_logging_enabled: data.scope.hipaa.phiAuditLoggingEnabled,
    stores_cardholder_data: data.scope.pci.storesCardholderData,
    cardholder_data_elements: pciDataElementLabels,
    cardholder_data_elements_text: pciDataElementLabels.length > 0 ? formatList(pciDataElementLabels) : 'Primary account numbers (PAN), cardholder names, expiration dates, or other approved payment data elements that reach the CDE boundary',
    pci_saq_level: pciSaqLevelLabel,
    pci_compliance_level: pciComplianceLevelLabel,
    payment_processors: paymentProcessorsText,
    has_tokenization_solution: data.scope.pci.hasTokenizationSolution,
    tokenization_provider: data.scope.pci.tokenizationProvider,
    cde_network_segmentation: pciSegmentationLabel,
    asv_scan_provider: data.scope.pci.asvScanProvider,
    cvss_remediation_threshold: cvssThresholdLabel,
    pci_penetration_test_cadence: pciPenTestCadenceLabel,
    sox_external_audit_firm: data.governance.sox.externalAuditFirm,
    sox_financial_system_scope: soxFinancialSystemScopeLabels,
    sox_financial_system_scope_text: soxFinancialSystemScopeLabels.length > 0 ? formatList(soxFinancialSystemScopeLabels) : 'In-scope financial systems to be confirmed',
    sox_financial_systems: soxFinancialSystems,
    sox_has_segmentation_of_duties_matrix: data.governance.sox.hasSegregationOfDutiesMatrix,
    sox_has_journal_entry_controls: data.governance.sox.hasJournalEntryControls,
    sox_change_freeze_period: data.governance.sox.changeFreezePeriod,
    sox_itgc_rating_approach: soxItgcRatingApproachLabel,

    // System Description (DC 200) fields
    system_description: data.scope.systemDescription ?? `${data.scope.systemName}`,
    scope_includes_availability: data.tscSelections.availability,
    scope_includes_confidentiality: data.tscSelections.confidentiality,
    scope_includes_privacy: data.tscSelections.privacy,
    scope_includes_processing_integrity: data.tscSelections.processingIntegrity,

    // Governance fields (CC1.1–CC1.5, CC4.1–CC4.2)
    has_employee_handbook: data.governance.hasEmployeeHandbook,
    has_code_of_conduct: data.governance.hasCodeOfConduct,
    acknowledgement_cadence: data.governance.acknowledgementCadence,
    has_disciplinary_procedures: data.governance.hasDisciplinaryProcedures,
    has_board_or_advisory: data.governance.hasBoardOrAdvisory,
    board_meeting_frequency: data.governance.boardMeetingFrequency,
    has_dedicated_security_officer: data.governance.hasDedicatedSecurityOfficer,
    security_officer_title: data.governance.securityOfficerTitle || 'Security Lead',
    has_org_chart: data.governance.hasOrgChart,
    org_chart_maintenance: data.governance.orgChartMaintenance,
    has_job_descriptions: data.governance.hasJobDescriptions,
    has_internal_audit_program: data.governance.hasInternalAuditProgram,
    internal_audit_frequency: data.governance.internalAuditFrequency,
    has_performance_reviews_linked_to_controls: data.governance.hasPerformanceReviewsLinkedToControls,

    // Training fields (CC1.4)
    security_awareness_training_tool: data.training.securityAwarenessTrainingTool,
    training_cadence: data.training.trainingCadence,
    has_phishing_simulation: data.training.hasPhishingSimulation,
    phishing_simulation_frequency: data.training.phishingSimulationFrequency,
    has_security_bulletin_subscription: data.training.hasSecurityBulletinSubscription,

    // Security tooling fields (CC6.6, CC6.8, CC7.1, A1.1)
    siem_tool: data.securityTooling.siemTool,
    has_siem: !!data.securityTooling.siemTool,
    has_ids_ips: data.securityTooling.hasIdsIps,
    has_waf: data.securityTooling.hasWaf,
    endpoint_protection_tool: data.securityTooling.endpointProtectionTool,
    has_endpoint_protection: !!data.securityTooling.endpointProtectionTool,
    has_mdm: data.securityTooling.hasMdm,
    mdm_tool: data.securityTooling.mdmTool,
    vulnerability_scanning_tool: data.securityTooling.vulnerabilityScanningTool,
    has_vulnerability_scanning: !!data.securityTooling.vulnerabilityScanningTool,
    penetration_test_frequency: data.securityTooling.penetrationTestFrequency,
    has_penetration_testing: data.securityTooling.penetrationTestFrequency !== 'none',
    has_dast: data.securityTooling.hasDast,
    has_sast: data.securityTooling.hasSastTool,
    sast_tool: data.securityTooling.sastTool,
    has_secrets_scanning: data.securityTooling.hasSecretsScanningTool,
    secrets_scanning_tool: data.securityTooling.secretsScanningTool,
    has_dependency_scanning: data.securityTooling.hasDependencyScanning,
    dependency_scanning_tool: data.securityTooling.dependencyScanningTool,
    has_threat_modeling: data.securityTooling.hasThreatModeling,
    threat_modeling_approach: threatModelingApproachLabel,
    threat_modeling_cadence: threatModelingCadenceLabel,
    remediation_sla_critical_days: data.securityTooling.remediationSlaCriticalDays,
    remediation_sla_high_days: data.securityTooling.remediationSlaHighDays,
    has_vulnerability_disclosure: data.securityTooling.hasVulnerabilityDisclosureProgram,
    vulnerability_disclosure_channel: data.securityTooling.vulnerabilityDisclosureChannel,
    has_security_champion_program: data.securityTooling.hasSecurityChampionProgram,
    monitoring_tool: data.securityTooling.monitoringTool,
    has_monitoring_tool: !!data.securityTooling.monitoringTool,
    has_autoscaling: data.securityTooling.hasAutoscaling,
    log_retention_days: data.securityTooling.logRetentionDays,

    // Compliance maturity & audit type (drives template tone and audit period language)
    industry: data.company.industry,
    compliance_maturity: data.company.complianceMaturity,
    is_first_timer: data.company.complianceMaturity === 'first-time',
    target_audit_type: data.company.targetAuditType,
    is_type1: data.company.targetAuditType === 'type1',
    is_type2: data.company.targetAuditType === 'type2',
    is_audit_type_unsure: data.company.targetAuditType === 'unsure',
    org_age: data.company.orgAge,

    // Extended operations fields (CC2.2, CC2.3, CC3.2, CC3.3, C1.1, C1.2)
    policy_publication_method: data.operations.policyPublicationMethod,
    has_customer_contracts: data.operations.hasCustomerContracts,
    has_customer_support_channel: data.operations.hasCustomerSupportChannel,
    has_release_note_practice: data.operations.hasReleaseNotePractice,
    has_risk_register: data.operations.hasRiskRegister,
    includes_fraud_risk_in_assessment: data.operations.includesFraudRiskInAssessment,
    acceptable_use_scope: data.operations.acceptableUseScope || 'employees, contractors, consultants, temporary workers, and any other workforce members with access to company systems',
    security_report_channel: data.operations.securityReportChannel || data.company.primaryContactEmail,
    permits_limited_personal_use: data.operations.permitsLimitedPersonalUse,
    requires_approved_software: data.operations.requiresApprovedSoftware,
    restricts_company_data_to_approved_systems: data.operations.restrictsCompanyDataToApprovedSystems,
    requires_lost_device_reporting: data.operations.requiresLostDeviceReporting,
    lost_device_report_sla_hours: data.operations.lostDeviceReportSlaHours,
    monitors_company_systems: data.operations.monitorsCompanySystems,
    has_nda_process: data.operations.hasNdaProcess,
    data_retention_defined: data.operations.dataRetentionDefined,
    has_data_disposal_procedure: data.operations.hasDataDisposalProcedure,
  };
}
