import { defaultWizardValues, type WizardData } from '@/lib/wizard/schema';
import { deriveDocumentArtifactStates, readPersistedDocumentArtifactStates } from '@/lib/documents/document-artifacts';

type WizardDataOverrides = {
  [K in keyof WizardData]?: WizardData[K] extends unknown[] ? WizardData[K] : Partial<WizardData[K]>;
};

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function makeWizardData(overrides: WizardDataOverrides): WizardData {
  return {
    ...defaultWizardValues,
    ...overrides,
    company: { ...defaultWizardValues.company, ...overrides.company },
    governance: { ...defaultWizardValues.governance, ...overrides.governance },
    training: { ...defaultWizardValues.training, ...overrides.training },
    scope: { ...defaultWizardValues.scope, ...overrides.scope },
    tscSelections: { ...defaultWizardValues.tscSelections, ...overrides.tscSelections },
    infrastructure: { ...defaultWizardValues.infrastructure, ...overrides.infrastructure },
    subservices: overrides.subservices ?? defaultWizardValues.subservices,
    securityTooling: { ...defaultWizardValues.securityTooling, ...overrides.securityTooling },
    operations: { ...defaultWizardValues.operations, ...overrides.operations },
    securityAssessment: { ...defaultWizardValues.securityAssessment, ...overrides.securityAssessment },
  };
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

run('Artifact hashing ignores unrelated wizard changes but flags dependency changes', () => {
  const sourcePayload = makeWizardData({
    company: {
      name: 'Acme Payments',
      primaryContactName: 'Alex Admin',
      primaryContactEmail: 'alex@example.com',
      industry: 'FinTech',
      orgAge: '1-3',
      complianceMaturity: 'some-experience',
      targetAuditType: 'type1',
    },
    training: {
      ...defaultWizardValues.training,
      securityAwarenessTrainingTool: 'KnowBe4',
    },
    scope: {
      systemName: 'Payments Hub',
      systemDescription: 'a payments platform that handles regulated payment traffic across cloud workloads',
      dataTypesHandled: ['Payment data', 'Customer PII'],
      hasCardholderDataEnvironment: true,
    },
    infrastructure: {
      ...defaultWizardValues.infrastructure,
      type: 'hybrid',
      cloudProviders: ['aws', 'azure'],
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

  const unrelatedDraft = makeWizardData({
    ...sourcePayload,
    training: {
      ...sourcePayload.training,
      securityAwarenessTrainingTool: 'KnowBe4',
    },
  });
  const relatedDraft = makeWizardData({
    ...sourcePayload,
    operations: {
      ...sourcePayload.operations,
      ticketingSystem: 'ServiceNow',
    },
  });

  const stableStates = deriveDocumentArtifactStates({
    documentSlug: 'network-and-data-flow-diagrams',
    documentStatus: 'draft',
    sourcePayload,
    currentDraftPayload: unrelatedDraft,
  });
  const staleStates = deriveDocumentArtifactStates({
    documentSlug: 'network-and-data-flow-diagrams',
    documentStatus: 'draft',
    sourcePayload,
    currentDraftPayload: relatedDraft,
  });

  assert(stableStates.length === 2, 'expected network-and-data-flow-diagrams to register both network and data-flow artifacts');
  assert(stableStates.every((artifact) => artifact.displayGrade === 'ready-for-review'), 'expected matching dependency snapshots to remain ready for review');
  assert(stableStates.every((artifact) => !artifact.isStale), 'expected unrelated wizard changes not to mark artifacts stale');
  assert(staleStates.every((artifact) => artifact.displayGrade === 'stale'), 'expected dependency changes to mark artifact display grade stale');
  assert(staleStates.every((artifact) => artifact.storedGrade === 'draft'), 'expected stale display grade to preserve stored draft review state');
});

run('Approved artifacts keep reviewed stored grade until dependency scope changes', () => {
  const payload = makeWizardData({
    company: {
      name: 'Control Atlas',
      primaryContactName: 'Casey Control',
      primaryContactEmail: 'casey@example.com',
      industry: 'SaaS',
      orgAge: '3-10',
      complianceMaturity: 'established',
      targetAuditType: 'type2',
    },
    training: {
      ...defaultWizardValues.training,
      securityAwarenessTrainingTool: 'KnowBe4',
    },
    scope: {
      systemName: 'Control Atlas',
      systemDescription: 'a SaaS platform that centralizes trust documentation and audit readiness evidence',
      dataTypesHandled: ['Customer PII', 'Authentication secrets'],
    },
  });

  const reviewedStates = deriveDocumentArtifactStates({
    documentSlug: 'control-framework-crosswalk',
    documentStatus: 'approved',
    sourcePayload: payload,
    currentDraftPayload: payload,
  });

  assert(reviewedStates.length === 1, 'expected a single crosswalk artifact');
  assert(reviewedStates[0].storedGrade === 'reviewed', 'expected approved document to retain reviewed stored grade');
  assert(reviewedStates[0].displayGrade === 'reviewed', 'expected unchanged approved artifact to display as reviewed');
});

run('Persisted artifact state round-trips through the reader helper', () => {
  const payload = makeWizardData({
    company: {
      name: 'Roundtrip Labs',
      primaryContactName: 'Robin Roundtrip',
      primaryContactEmail: 'robin@example.com',
      industry: 'SaaS',
      orgAge: '1-3',
      complianceMaturity: 'some-experience',
      targetAuditType: 'type1',
    },
    training: {
      ...defaultWizardValues.training,
      securityAwarenessTrainingTool: 'KnowBe4',
    },
    scope: {
      systemName: 'Roundtrip Labs',
      systemDescription: 'a documentation platform that generates architecture and control mapping drafts',
      dataTypesHandled: ['Customer PII'],
    },
  });

  const derivedStates = deriveDocumentArtifactStates({
    documentSlug: 'control-framework-crosswalk',
    documentStatus: 'approved',
    sourcePayload: payload,
    currentDraftPayload: payload,
  });
  const parsedStates = readPersistedDocumentArtifactStates(JSON.parse(JSON.stringify(derivedStates)));

  assert(parsedStates.length === 1, 'expected persisted artifact state reader to keep one artifact');
  assert(parsedStates[0].id === derivedStates[0].id, 'expected persisted artifact state reader to retain artifact identity');
  assert(parsedStates[0].displayGrade === 'reviewed', 'expected persisted artifact state reader to retain display grade');
});

if (process.exitCode && process.exitCode !== 0) {
  process.exit(process.exitCode);
}