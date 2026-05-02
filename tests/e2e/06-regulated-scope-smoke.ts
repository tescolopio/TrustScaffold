import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { renderTemplate } from '@/lib/documents/template-engine';
import { buildTemplatePayload } from '@/lib/wizard/template-payload';
import { defaultWizardValues, type WizardData } from '@/lib/wizard/schema';
import { getActiveWizardRules } from '@/lib/wizard/rule-matrix';

type WizardDataOverrides = {
  [K in keyof WizardData]?: WizardData[K] extends unknown[] ? WizardData[K] : Partial<WizardData[K]>;
};

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function assertIncludes(haystack: string, needle: string, message: string) {
  assert(haystack.includes(needle), `${message}: expected output to include "${needle}"`);
}

function assertMermaidIncludes(diagram: string, expectedParts: string[], message: string) {
  for (const expectedPart of expectedParts) {
    assertIncludes(diagram, expectedPart, `${message} (${expectedPart})`);
  }
}

function makeWizardData(overrides: WizardDataOverrides): WizardData {
  return {
    ...defaultWizardValues,
    company: { ...defaultWizardValues.company, ...overrides.company },
    governance: { ...defaultWizardValues.governance, ...overrides.governance },
    training: { ...defaultWizardValues.training, ...overrides.training },
    scope: { ...defaultWizardValues.scope, ...overrides.scope },
    tscSelections: { ...defaultWizardValues.tscSelections, ...overrides.tscSelections },
    infrastructure: { ...defaultWizardValues.infrastructure, ...overrides.infrastructure },
    subservices: overrides.subservices ?? defaultWizardValues.subservices,
    securityTooling: { ...defaultWizardValues.securityTooling, ...overrides.securityTooling },
    operations: { ...defaultWizardValues.operations, ...overrides.operations },
    securityAssessment: {
      ...defaultWizardValues.securityAssessment,
      ...overrides.securityAssessment,
    },
  };
}

function extractTemplate(seedSql: string, slug: string): string {
  const marker = `\n    '${slug}',`;
  const slugIndex = seedSql.indexOf(marker);
  assert(slugIndex >= 0, `Could not find template slug ${slug} in seed.sql`);

  const templateStart = seedSql.indexOf('$$---', slugIndex);
  assert(templateStart >= 0, `Could not find markdown template start for ${slug}`);

  const templateEnd = seedSql.indexOf('$$,', templateStart);
  assert(templateEnd >= 0, `Could not find markdown template end for ${slug}`);

  return seedSql.slice(templateStart + 2, templateEnd);
}

function run(name: string, fn: () => void) {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}`);
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

const seedSql = readFileSync(resolve(process.cwd(), 'supabase/seed.sql'), 'utf8');
const systemDescriptionTemplate = extractTemplate(seedSql, 'system-description');
const privacyTemplate = extractTemplate(seedSql, 'privacy-notice-consent-policy');
const dataClassificationTemplate = extractTemplate(seedSql, 'data-classification-handling-policy');
const pciTokenizationTemplate = extractTemplate(seedSql, 'tokenization-cardholder-data-policy');
const networkAndDataFlowTemplate = extractTemplate(seedSql, 'network-and-data-flow-diagrams');

run('Bundle J smoke path surfaces PHI review state and generated PHI language', () => {
  const data = makeWizardData({
    company: {
      name: 'HealthCo',
      industry: 'Healthcare',
      complianceMaturity: 'some-experience',
      targetAuditType: 'type1',
    },
    scope: {
      systemName: 'HealthCo Portal',
      systemDescription: 'a healthcare workflow platform that stores regulated patient and member information',
      dataTypesHandled: ['Customer PII', 'Employee data', 'Authentication secrets'],
      containsPhi: true,
      hasCardholderDataEnvironment: false,
      hipaa: {
        ...defaultWizardValues.scope.hipaa,
        phiElements: ['name', 'dob', 'diagnosis-codes', 'insurance-info', 'medication', 'lab-results'],
      },
    },
    tscSelections: {
      security: true,
      privacy: true,
      confidentiality: true,
      availability: false,
      processingIntegrity: false,
    },
  });

  const rules = getActiveWizardRules(data, 'review');
  assert(!rules.some((rule) => rule.id === 'review-privacy-scope-warning'), 'PHI path should not show privacy warning when Privacy TSC is selected');
  assert(data.scope.containsPhi, 'PHI field should remain true for the review source data');
  assert(!data.scope.hasCardholderDataEnvironment, 'CDE field should remain false for the review source data');

  const payload = buildTemplatePayload(data, { workspaceOrganizationName: data.company.name });
  const renderedSystem = renderTemplate(systemDescriptionTemplate, payload, 'system-description');
  const renderedPrivacy = renderTemplate(privacyTemplate, payload, 'privacy-notice-consent-policy');

  assertIncludes(renderedSystem, 'Protected health information (PHI) is identified as regulated data', 'system description PHI language');
  assertIncludes(renderedPrivacy, '## HIPAA Administrative Safeguards', 'privacy template HIPAA section heading');
  assertIncludes(renderedPrivacy, 'Access changes and terminations are coordinated through', 'privacy template HIPAA safeguard detail');
  assertIncludes(renderedPrivacy, 'handles protected health information', 'privacy template PHI language');
  assertIncludes(payload.phi_elements_text, 'Diagnosis codes', 'payload should retain selected PHI element labels');
});

run('Bundle K smoke path surfaces CDE review state and generated CDE language', () => {
  const data = makeWizardData({
    company: {
      name: 'PaymentsCo',
      industry: 'Financial Technology',
      complianceMaturity: 'some-experience',
      targetAuditType: 'type1',
    },
    scope: {
      systemName: 'PaymentsCo Checkout',
      systemDescription: 'a payment processing platform with a segmented cardholder data environment for checkout and settlement operations',
      dataTypesHandled: ['Payment data', 'Customer PII', 'Authentication secrets'],
      containsPhi: false,
      hasCardholderDataEnvironment: true,
      pci: {
        ...defaultWizardValues.scope.pci,
        cardholderDataElements: ['pan', 'cardholder-name', 'expiration-date', 'tokenized-pan'],
      },
    },
    tscSelections: {
      security: true,
      privacy: true,
      confidentiality: true,
      availability: false,
      processingIntegrity: false,
    },
  });

  const rules = getActiveWizardRules(data, 'review');
  assert(!rules.some((rule) => rule.id === 'review-cde-confidentiality-warning'), 'CDE path should not show confidentiality warning when Confidentiality TSC is selected');
  assert(!data.scope.containsPhi, 'PHI field should remain false for the review source data');
  assert(data.scope.hasCardholderDataEnvironment, 'CDE field should remain true for the review source data');

  const payload = buildTemplatePayload(data, { workspaceOrganizationName: data.company.name });
  const renderedSystem = renderTemplate(systemDescriptionTemplate, payload, 'system-description');
  const renderedClassification = renderTemplate(dataClassificationTemplate, payload, 'data-classification-handling-policy');
  const renderedPciTokenization = renderTemplate(pciTokenizationTemplate, payload, 'tokenization-cardholder-data-policy');

  assertIncludes(renderedSystem, 'cardholder data environment (CDE) is explicitly defined', 'system description CDE language');
  assertIncludes(renderedSystem, '### PCI Segmentation Responsibilities', 'system description PCI section heading');
  assertIncludes(renderedSystem, 'Changes affecting segmentation controls are reviewed through', 'system description PCI responsibility detail');
  assertIncludes(renderedClassification, 'operates an in-scope cardholder data environment (CDE)', 'data classification CDE language');
  assertIncludes(renderedPciTokenization, 'Cardholder data in scope: Primary account number (PAN), Cardholder name, Expiration date, and Tokenized PAN or network token', 'PCI tokenization template should reflect selected PCI data elements');
});

run('Baseline diagram payload emits grouped Mermaid subgraphs and core classes', () => {
  const data = makeWizardData({
    company: {
      name: 'BaselineCo',
      industry: 'SaaS',
    },
    scope: {
      systemName: 'Baseline App',
      systemDescription: 'a general SaaS application for workflow management',
      dataTypesHandled: ['Customer PII', 'Authentication secrets'],
      containsPhi: false,
      hasCardholderDataEnvironment: false,
    },
    infrastructure: {
      type: 'aws',
      cloudProviders: ['aws'],
      idpProvider: 'Okta',
      usesAvailabilityZones: true,
    },
    securityTooling: {
      ...defaultWizardValues.securityTooling,
      hasWaf: true,
      monitoringTool: 'Datadog',
    },
    operations: {
      ...defaultWizardValues.operations,
      ticketingSystem: 'Jira',
      versionControlSystem: 'GitHub',
    },
  });

  const payload = buildTemplatePayload(data, { workspaceOrganizationName: data.company.name });

  assertMermaidIncludes(payload.network_topology_mermaid, [
    'subgraph edge_boundary["Edge and identity boundary"]',
    'subgraph app_boundary["Baseline App"]',
    'subgraph data_boundary["Protected data zone"]',
    'subgraph ops_boundary["Security and operations"]',
    'classDef boundary',
    'classDef data',
    'class edge,idp,app,platform boundary;',
  ], 'baseline network diagram structure');
  assertMermaidIncludes(payload.data_flow_mermaid, [
    'subgraph actor_boundary["Actors and intake"]',
    'subgraph system_boundary["Baseline App"]',
    'subgraph data_boundary["Protected data stores"]',
    'subgraph ops_boundary["Operational records"]',
    'classDef actor',
    'classDef ops',
    'class system,idp boundary;',
  ], 'baseline data-flow diagram structure');

  const renderedDiagramDoc = renderTemplate(networkAndDataFlowTemplate, payload, 'network-and-data-flow-diagrams');
  assertIncludes(renderedDiagramDoc, '```mermaid', 'baseline diagram document should preserve Mermaid fences');
  assertIncludes(renderedDiagramDoc, 'subgraph app_boundary["Baseline App"]', 'baseline diagram document should include app boundary');
  assertIncludes(renderedDiagramDoc, 'subgraph ops_boundary["Security and operations"]', 'baseline diagram document should include ops boundary');
  assertIncludes(renderedDiagramDoc, 'subgraph actor_boundary["Actors and intake"]', 'baseline diagram document should include actor boundary');
});

run('HIPAA diagram payload emits regulated-data grouping and vendor classes', () => {
  const data = makeWizardData({
    company: {
      name: 'HealthDiagramCo',
      industry: 'Healthcare',
    },
    scope: {
      systemName: 'Health Diagram Portal',
      systemDescription: 'a healthcare workflow portal for regulated case management',
      dataTypesHandled: ['Customer PII', 'Employee data', 'Authentication secrets'],
      containsPhi: true,
      hasCardholderDataEnvironment: false,
    },
    infrastructure: {
      type: 'azure',
      cloudProviders: ['azure'],
      idpProvider: 'Entra ID',
      usesAvailabilityZones: true,
    },
    securityTooling: {
      ...defaultWizardValues.securityTooling,
      hasWaf: true,
      monitoringTool: 'Microsoft Sentinel',
    },
    operations: {
      ...defaultWizardValues.operations,
      ticketingSystem: 'Jira Service Management',
    },
    subservices: [
      {
        name: 'Datavant',
        description: 'Healthcare data exchange',
        role: 'Subprocessor',
        dataShared: 'Approved PHI exchange records',
        reviewCadence: 'annual',
        hasAssuranceReport: true,
        assuranceReportType: 'soc2-type2',
        controlInclusion: 'inclusive',
      },
    ],
  });

  const payload = buildTemplatePayload(data, { workspaceOrganizationName: data.company.name });

  assertMermaidIncludes(payload.network_topology_mermaid, [
    'subgraph vendor_boundary["Subservice organizations"]',
    'subgraph data_boundary["PHI handling zone"]',
    'classDef vendor',
    'class vendor1 vendor;',
    'Subservice: Datavant',
  ], 'HIPAA network diagram regulated vendor structure');
  assertMermaidIncludes(payload.data_flow_mermaid, [
    'subgraph data_boundary["Regulated data stores"]',
    'Primary stores for Regulated data including PHI',
    'subgraph external_boundary["Approved downstream processors"]',
    'Approved PHI exchange records',
    'class processor1 vendor;',
  ], 'HIPAA data-flow diagram regulated structure');
});

run('PCI-heavy diagram payload emits payment-data grouping and multi-vendor classes', () => {
  const data = makeWizardData({
    company: {
      name: 'PaymentsDiagramCo',
      industry: 'Financial Technology',
    },
    scope: {
      systemName: 'Payments Diagram Hub',
      systemDescription: 'a multi-cloud payment platform with a segmented CDE',
      dataTypesHandled: ['Payment data', 'Customer PII', 'Authentication secrets'],
      containsPhi: false,
      hasCardholderDataEnvironment: true,
    },
    infrastructure: {
      type: 'hybrid',
      cloudProviders: ['aws', 'azure', 'gcp'],
      idpProvider: 'Okta',
      usesAvailabilityZones: true,
    },
    securityTooling: {
      ...defaultWizardValues.securityTooling,
      hasWaf: true,
      monitoringTool: 'Datadog',
    },
    operations: {
      ...defaultWizardValues.operations,
      ticketingSystem: 'Jira',
      versionControlSystem: 'GitHub',
    },
    subservices: [
      {
        name: 'Stripe',
        description: 'Payment processing',
        role: 'Processor',
        dataShared: 'Tokenized payment events',
        reviewCadence: 'annual',
        hasAssuranceReport: true,
        assuranceReportType: 'soc2-type2',
        controlInclusion: 'inclusive',
      },
      {
        name: 'Plaid',
        description: 'Bank connectivity',
        role: 'Processor',
        dataShared: 'Bank account metadata',
        reviewCadence: 'annual',
        hasAssuranceReport: true,
        assuranceReportType: 'soc2-type2',
        controlInclusion: 'inclusive',
      },
    ],
  });

  const payload = buildTemplatePayload(data, { workspaceOrganizationName: data.company.name });

  assertMermaidIncludes(payload.network_topology_mermaid, [
    'AWS + Azure + GCP workload tier',
    'subgraph data_boundary["Cardholder data environment"]',
    'subgraph vendor_boundary["Subservice organizations"]',
    'class vendor1 vendor;',
    'class vendor2 vendor;',
    'classDef vendor',
  ], 'PCI network diagram payment structure');
  assertMermaidIncludes(payload.data_flow_mermaid, [
    'subgraph data_boundary["Cardholder data stores"]',
    'Primary stores for Cardholder and payment-related data',
    'subgraph external_boundary["Approved downstream processors"]',
    'Tokenized payment events',
    'Bank account metadata',
    'class processor1 vendor;',
    'class processor2 vendor;',
  ], 'PCI data-flow diagram payment structure');

  const renderedDiagramDoc = renderTemplate(networkAndDataFlowTemplate, payload, 'network-and-data-flow-diagrams');
  assertIncludes(renderedDiagramDoc, 'subgraph vendor_boundary["Subservice organizations"]', 'PCI diagram document should include vendor boundary');
  assertIncludes(renderedDiagramDoc, 'subgraph external_boundary["Approved downstream processors"]', 'PCI diagram document should include downstream processor boundary');
  assertIncludes(renderedDiagramDoc, 'subgraph data_boundary["Cardholder data stores"]', 'PCI diagram document should include PCI data boundary');
  assertIncludes(renderedDiagramDoc, 'AWS + Azure + GCP workload tier', 'PCI diagram document should include multi-cloud workload tier');
  assertIncludes(renderedDiagramDoc, 'Primary stores for Cardholder and payment-related data', 'PCI diagram document should include payment data store label');
});

if (process.exitCode && process.exitCode !== 0) {
  process.exit(process.exitCode);
}