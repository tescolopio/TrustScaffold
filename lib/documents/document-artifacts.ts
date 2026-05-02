import { createHash } from 'node:crypto';

import type { GeneratedDocStatus } from '@/lib/documents/generated-doc-status';
import { canonicalize } from '@/lib/evidence/canonicalize';
import { documentGenerationRules, type DocumentGenerationRule } from '@/lib/wizard/document-generation-rules';
import { wizardSchema, type WizardData } from '@/lib/wizard/schema';

export type DocumentArtifactRenderer = 'mermaid-flow' | 'matrix-table';
export type DocumentArtifactClass = 'standalone' | 'annex';
export type DocumentArtifactStoredGrade = 'draft' | 'reviewed';
export type DocumentArtifactDisplayGrade = 'draft' | 'ready-for-review' | 'reviewed' | 'stale';

type ArtifactCatalogEntry = {
  id: string;
  name: string;
  class: DocumentArtifactClass;
  renderer: DocumentArtifactRenderer;
  dependencyPaths: string[];
  readinessHint: string;
  fidelityGate: (data: WizardData) => boolean;
};

export type DerivedDocumentArtifactState = ArtifactCatalogEntry & {
  documentSlug: string;
  documentName: string;
  sourceSnapshotHash: string;
  currentSnapshotHash: string;
  fidelityEligible: boolean;
  isStale: boolean;
  storedGrade: DocumentArtifactStoredGrade;
  displayGrade: DocumentArtifactDisplayGrade;
};

type PersistedArtifactStateRecord = Partial<DerivedDocumentArtifactState> & Record<string, unknown>;

const artifactCatalog: Record<string, ArtifactCatalogEntry> = {
  'nist-csf-profile': {
    id: 'nist-csf-profile',
    name: 'NIST CSF profile',
    class: 'annex',
    renderer: 'matrix-table',
    dependencyPaths: [
      'company',
      'governance',
      'scope',
      'tscSelections',
      'operations',
      'securityAssessment',
      'securityTooling',
      'subservices',
    ],
    readinessHint: 'Use this as a translation layer for current readiness, then promote only after management confirms the evidence narrative.',
    fidelityGate: (data) => Boolean(data.company.name && data.scope.systemName),
  },
  'control-framework-crosswalk': {
    id: 'control-framework-crosswalk',
    name: 'Control-to-framework crosswalk',
    class: 'annex',
    renderer: 'matrix-table',
    dependencyPaths: [
      'company.soxApplicability',
      'governance.iso27001',
      'scope.containsPhi',
      'scope.hasCardholderDataEnvironment',
      'tscSelections',
    ],
    readinessHint: 'Treat this as mapping support. Review inheritance, shared-control assumptions, and framework scope before external use.',
    fidelityGate: (data) => data.tscSelections.security,
  },
  'network-topology-diagram': {
    id: 'network-topology-diagram',
    name: 'Network topology diagram',
    class: 'standalone',
    renderer: 'mermaid-flow',
    dependencyPaths: [
      'company.hasPublicWebsite',
      'scope.systemName',
      'scope.containsPhi',
      'scope.hasCardholderDataEnvironment',
      'infrastructure.type',
      'infrastructure.cloudProviders',
      'infrastructure.idpProvider',
      'infrastructure.usesAvailabilityZones',
      'infrastructure.hasHardwareFailover',
      'operations.ticketingSystem',
      'operations.versionControlSystem',
      'securityTooling.hasWaf',
      'securityTooling.monitoringTool',
      'securityTooling.siemTool',
      'subservices',
    ],
    readinessHint: 'Promote only after trust boundaries, vendors, and hosting tiers are reconciled against the current deployment architecture.',
    fidelityGate: (data) => Boolean(data.scope.systemName && data.infrastructure.cloudProviders.length > 0),
  },
  'data-flow-diagram': {
    id: 'data-flow-diagram',
    name: 'Data flow diagram',
    class: 'standalone',
    renderer: 'mermaid-flow',
    dependencyPaths: [
      'scope.systemName',
      'scope.dataTypesHandled',
      'scope.containsPhi',
      'scope.hasCardholderDataEnvironment',
      'infrastructure.idpProvider',
      'operations.hrisProvider',
      'operations.ticketingSystem',
      'subservices',
    ],
    readinessHint: 'Promote only after data classes, downstream processors, and regulated-data handling paths are validated by a human reviewer.',
    fidelityGate: (data) => Boolean(data.scope.systemName && data.scope.dataTypesHandled.length > 0),
  },
};

function getValueAtPath(value: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((currentValue, segment) => {
    if (currentValue === null || currentValue === undefined || typeof currentValue !== 'object') {
      return null;
    }

    return (currentValue as Record<string, unknown>)[segment];
  }, value);
}

function buildDependencySnapshot(data: WizardData, dependencyPaths: string[]) {
  return dependencyPaths.reduce<Record<string, unknown>>((snapshot, path) => {
    snapshot[path] = getValueAtPath(data, path);
    return snapshot;
  }, {});
}

function hashDependencySnapshot(data: WizardData, dependencyPaths: string[]) {
  const snapshot = buildDependencySnapshot(data, dependencyPaths);
  return createHash('sha256').update(canonicalize(snapshot)).digest('hex');
}

function getStoredGrade(documentStatus: GeneratedDocStatus): DocumentArtifactStoredGrade {
  return documentStatus === 'approved' ? 'reviewed' : 'draft';
}

function getDisplayGrade({
  storedGrade,
  isStale,
  fidelityEligible,
}: {
  storedGrade: DocumentArtifactStoredGrade;
  isStale: boolean;
  fidelityEligible: boolean;
}): DocumentArtifactDisplayGrade {
  if (isStale) return 'stale';
  if (storedGrade === 'reviewed') return 'reviewed';
  if (fidelityEligible) return 'ready-for-review';
  return 'draft';
}

function parseWizardData(value: unknown): WizardData | null {
  const parsed = wizardSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

function getArtifactBindingsForRule(rule: DocumentGenerationRule) {
  return (rule.artifacts ?? [])
    .map((artifactId) => artifactCatalog[artifactId])
    .filter((artifact): artifact is ArtifactCatalogEntry => Boolean(artifact));
}

export function deriveDocumentArtifactStates({
  documentSlug,
  documentStatus,
  sourcePayload,
  currentDraftPayload,
}: {
  documentSlug: string | null | undefined;
  documentStatus: string;
  sourcePayload: unknown;
  currentDraftPayload?: unknown;
}): DerivedDocumentArtifactState[] {
  if (!documentSlug) {
    return [];
  }

  const rule = documentGenerationRules.find((candidate) => candidate.slug === documentSlug);
  if (!rule) {
    return [];
  }

  const sourceWizardData = parseWizardData(sourcePayload);
  if (!sourceWizardData) {
    return [];
  }

  const currentWizardData = parseWizardData(currentDraftPayload) ?? sourceWizardData;
  const storedGrade = getStoredGrade(documentStatus === 'approved' ? 'approved' : 'draft');

  return getArtifactBindingsForRule(rule).map((artifact) => {
    const sourceSnapshotHash = hashDependencySnapshot(sourceWizardData, artifact.dependencyPaths);
    const currentSnapshotHash = hashDependencySnapshot(currentWizardData, artifact.dependencyPaths);
    const isStale = sourceSnapshotHash !== currentSnapshotHash;
    const fidelityEligible = artifact.fidelityGate(sourceWizardData);

    return {
      ...artifact,
      documentSlug: rule.slug,
      documentName: rule.name,
      sourceSnapshotHash,
      currentSnapshotHash,
      fidelityEligible,
      isStale,
      storedGrade,
      displayGrade: getDisplayGrade({ storedGrade, isStale, fidelityEligible }),
    };
  });
}

export function readPersistedDocumentArtifactStates(value: unknown): DerivedDocumentArtifactState[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is DerivedDocumentArtifactState => {
    const candidate = entry as PersistedArtifactStateRecord;

    return typeof candidate.id === 'string'
      && typeof candidate.name === 'string'
      && (candidate.class === 'standalone' || candidate.class === 'annex')
      && (candidate.renderer === 'mermaid-flow' || candidate.renderer === 'matrix-table')
      && Array.isArray(candidate.dependencyPaths)
      && typeof candidate.documentSlug === 'string'
      && typeof candidate.documentName === 'string'
      && typeof candidate.sourceSnapshotHash === 'string'
      && typeof candidate.currentSnapshotHash === 'string'
      && typeof candidate.fidelityEligible === 'boolean'
      && typeof candidate.isStale === 'boolean'
      && (candidate.storedGrade === 'draft' || candidate.storedGrade === 'reviewed')
      && (candidate.displayGrade === 'draft' || candidate.displayGrade === 'ready-for-review' || candidate.displayGrade === 'reviewed' || candidate.displayGrade === 'stale');
  });
}

export function getArtifactDisplayLabel(displayGrade: DocumentArtifactDisplayGrade) {
  switch (displayGrade) {
    case 'ready-for-review':
      return 'Ready for review';
    case 'reviewed':
      return 'Reviewed';
    case 'stale':
      return 'Stale';
    default:
      return 'Draft';
  }
}

export function getArtifactDisplayBadgeVariant(displayGrade: DocumentArtifactDisplayGrade) {
  switch (displayGrade) {
    case 'ready-for-review':
      return 'info' as const;
    case 'reviewed':
      return 'success' as const;
    case 'stale':
      return 'danger' as const;
    default:
      return 'secondary' as const;
  }
}

export function getArtifactClassLabel(artifactClass: DocumentArtifactClass) {
  return artifactClass === 'standalone' ? 'Standalone' : 'Annex';
}

export function getArtifactRendererLabel(renderer: DocumentArtifactRenderer) {
  return renderer === 'mermaid-flow' ? 'Mermaid flow' : 'Matrix table';
}

export function formatArtifactHash(hash: string) {
  return hash.slice(0, 12);
}