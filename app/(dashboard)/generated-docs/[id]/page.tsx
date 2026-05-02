import Link from 'next/link';
import { notFound } from 'next/navigation';

import { approveGeneratedDocAction, archiveGeneratedDocAction, queueSharePointPdfPublicationAction, regenerateDocAction, rejectGeneratedDocAction } from '@/app/(dashboard)/generated-docs/actions';
import { AlertCallout } from '@/components/ui/alert-callout';
import { MarkdownDocument } from '@/components/documents/markdown-document';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { canApproveDocuments, canRejectOrRegenerateDocuments, isAdminRole } from '@/lib/auth/roles';
import { getDashboardContext } from '@/lib/auth/get-dashboard-context';
import {
  deriveDocumentArtifactStates,
  formatArtifactHash,
  getArtifactClassLabel,
  getArtifactDisplayBadgeVariant,
  getArtifactDisplayLabel,
  getArtifactRendererLabel,
  readPersistedDocumentArtifactStates,
} from '@/lib/documents/document-artifacts';
import { getGeneratedDocStatusDisplay, getGeneratedDocStatusLabel } from '@/lib/documents/generated-doc-status';
import { describeExternalControlMapping } from '@/lib/documents/control-mapping-catalog';
import { parseDocumentFrontmatter } from '@/lib/documents/frontmatter';
import { diffMarkdownSections } from '@/lib/documents/section-diff';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import {
  dangerPanelSurfaceClassName,
  infoPanelSurfaceClassName,
  metricPanelSurfaceClassName,
  mutedInsetSurfaceClassName,
  nestedPanelSurfaceClassName,
  successPanelSurfaceClassName,
  warningPanelSurfaceClassName,
} from '@/lib/ui/card-surfaces';
import { selectFieldClassName } from '@/lib/ui/form-controls';
import { cn } from '@/lib/utils';
import { expandCriteriaCodes, getCriterionByCode } from '@/lib/tsc-criteria';
import { wizardSchema } from '@/lib/wizard/schema';

export default async function GeneratedDocDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const context = await getDashboardContext();

  if (!context?.organization) {
    return null;
  }

  const { id } = await params;
  const resolvedSearchParams = (await searchParams) ?? {};
  const successMessage = typeof resolvedSearchParams.success === 'string' ? resolvedSearchParams.success : null;
  const errorMessage = typeof resolvedSearchParams.error === 'string' ? resolvedSearchParams.error : null;
  const requestedDecision = typeof resolvedSearchParams.decision === 'string' ? resolvedSearchParams.decision : null;

  const supabase = await createSupabaseServerClient();
  const { data: doc, error } = await supabase
    .from('generated_docs')
    .select('id, title, file_name, content_markdown, status, version, updated_at, approved_at, input_payload, artifact_state, templates(name, slug, criteria_mapped)')
    .eq('organization_id', context.organization.id)
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw new Error(error?.message ?? 'Generated document not found');
  }

  if (!doc) {
    notFound();
  }

  const { data: latestApprovedRevision } = await supabase
    .from('document_revisions')
    .select('id, content_markdown, created_at')
    .eq('document_id', doc.id)
    .eq('source', 'approved')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: currentDraft } = await supabase
    .from('wizard_drafts')
    .select('payload')
    .eq('organization_id', context.organization.id)
    .maybeSingle();

  const sectionDiff = latestApprovedRevision
    ? diffMarkdownSections(latestApprovedRevision.content_markdown, doc.content_markdown)
    : null;

  const { data: decisionHistory } = await supabase
    .from('audit_logs')
    .select('id, action, details, actor_user_id, created_at')
    .eq('organization_id', context.organization.id)
    .eq('entity_type', 'generated_doc')
    .eq('entity_id', doc.id)
    .in('action', ['document.approved', 'document.rejected'])
    .order('created_at', { ascending: false })
    .limit(8);

  const { data: publicationHistory } = await supabase
    .from('document_publications')
    .select('id, provider, format, status, external_url, published_at, error_message, metadata, created_at')
    .eq('organization_id', context.organization.id)
    .eq('document_id', doc.id)
    .order('created_at', { ascending: false })
    .limit(5);

  const { data: sharePointIntegration } = await supabase
    .from('organization_integrations')
    .select('id')
    .eq('organization_id', context.organization.id)
    .eq('provider', 'sharepoint')
    .maybeSingle();

  const templateRelation = Array.isArray(doc.templates) ? doc.templates[0] : doc.templates;
  const parsedCurrentDraft = currentDraft?.payload ? wizardSchema.safeParse(currentDraft.payload) : null;
  const persistedArtifactStates = readPersistedDocumentArtifactStates(doc.artifact_state);
  const artifactStates = persistedArtifactStates.length > 0
    ? persistedArtifactStates
    : deriveDocumentArtifactStates({
        documentSlug: templateRelation?.slug,
        documentStatus: doc.status,
        sourcePayload: doc.input_payload,
        currentDraftPayload: parsedCurrentDraft?.success ? parsedCurrentDraft.data : null,
      });
  const frontmatter = parseDocumentFrontmatter(doc.content_markdown);
  const templateCriteriaMapped = Array.isArray(templateRelation?.criteria_mapped)
    ? templateRelation.criteria_mapped.filter((code): code is string => typeof code === 'string' && code.length > 0)
    : [];
  const mappedCriteriaSource = frontmatter.criteriaMapped.length > 0
    ? frontmatter.criteriaMapped
    : templateCriteriaMapped;
  const expandedCriteriaCodes = expandCriteriaCodes(mappedCriteriaSource);
  const expandedCriteria = expandedCriteriaCodes.map((code) => {
    const criterion = getCriterionByCode(code);

    if (criterion) {
      return {
        code,
        title: criterion.title,
        description: criterion.description,
        category: criterion.category,
      };
    }

    const externalMapping = describeExternalControlMapping(code);

    return {
      code,
      title: externalMapping.title,
      description: externalMapping.description,
      category: frontmatter.tscCategory ?? 'Framework mappings',
    };
  });
  const groupedCriteria = expandedCriteria.reduce<Record<string, typeof expandedCriteria>>((acc, criterion) => {
    if (!acc[criterion.category]) {
      acc[criterion.category] = [];
    }

    acc[criterion.category].push(criterion);
    return acc;
  }, {});
  const groupedCriteriaEntries = Object.entries(groupedCriteria);
  const isBridgeLetter = templateRelation?.slug === 'bridge-letter-comfort-letter';
  const canApprove = canApproveDocuments(context.organization.role) && doc.status !== 'approved';
  const canArchive = isAdminRole(context.organization.role) && doc.status !== 'archived';
  const canRegenerate = canRejectOrRegenerateDocuments(context.organization.role);
  const canReject = canRejectOrRegenerateDocuments(context.organization.role) && doc.status === 'draft';
  const canQueueSharePointPublication = isAdminRole(context.organization.role) && doc.status === 'approved' && !!sharePointIntegration;
  const hasPublicationHistory = Boolean(publicationHistory?.length);
  const hasDecisionHistory = Boolean(decisionHistory?.length);
  const statusDisplay = getGeneratedDocStatusDisplay(doc.status);
  const showApprovePanel = requestedDecision === 'approve' && canApprove;
  const showRejectPanel = requestedDecision === 'reject' && canReject;
  const detailBasePath = `/generated-docs/${doc.id}`;
  const detailBaseHref = { pathname: detailBasePath };
  const approveHref = showApprovePanel
    ? detailBaseHref
    : { pathname: detailBasePath, query: { decision: 'approve' } };
  const rejectHref = showRejectPanel
    ? detailBaseHref
    : { pathname: detailBasePath, query: { decision: 'reject' } };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle>{doc.title}</CardTitle>
                <Badge variant={statusDisplay.badgeVariant}>{getGeneratedDocStatusLabel(doc.status)}</Badge>
                <Badge variant="secondary">v{doc.version}</Badge>
              </div>
              <CardDescription>{doc.file_name} · Template {templateRelation?.name ?? 'Unknown'}</CardDescription>
              <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                Updated {new Date(doc.updated_at).toLocaleString()}
                {doc.approved_at ? ` · Approved ${new Date(doc.approved_at).toLocaleString()}` : ''}
              </p>
            </div>
            <div className="flex flex-wrap gap-3 lg:justify-end">
            <Button variant="outline" asChild>
              <Link href="/generated-docs">Back to documents</Link>
            </Button>
            {canApprove ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button asChild variant="outline">
                      <Link href={approveHref}>Approve</Link>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Open the approval form and add a required reviewer comment.</TooltipContent>
              </Tooltip>
            ) : null}
            {canReject ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button asChild variant="outline">
                      <Link href={rejectHref}>Reject</Link>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Open the rejection form and add a required reviewer reason.</TooltipContent>
              </Tooltip>
            ) : null}
            {canRegenerate ? (
              <form action={regenerateDocAction} className="flex flex-wrap items-center gap-2">
                <input type="hidden" name="document_id" value={doc.id} />
                {isBridgeLetter ? (
                  <select
                    name="bridge_letter_primary_audience_override"
                    defaultValue="auto"
                    className={cn(selectFieldClassName, 'min-w-56')}
                    aria-label="Bridge letter audience for regeneration"
                  >
                    <option value="auto">Auto audience</option>
                    <option value="general-security-customer">Force general security customer</option>
                    <option value="privacy-sensitive-customer">Force privacy-sensitive customer</option>
                    <option value="healthcare-customer">Force healthcare customer</option>
                    <option value="payments-customer">Force payments customer</option>
                    <option value="enterprise-governance-customer">Force enterprise governance customer</option>
                  </select>
                ) : null}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button type="submit" variant="secondary">Regenerate</Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {isBridgeLetter
                      ? 'Re-render this bridge letter from saved wizard data, optionally forcing a primary audience.'
                      : 'Re-render this document from the wizard data stored at last generation.'}
                  </TooltipContent>
                </Tooltip>
              </form>
            ) : null}
            {canArchive ? (
              <form action={archiveGeneratedDocAction}>
                <input type="hidden" name="document_id" value={doc.id} />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button type="submit" variant="ghost">Archive</Button>
                  </TooltipTrigger>
                  <TooltipContent>Archive this document so it is removed from active review and export.</TooltipContent>
                </Tooltip>
              </form>
            ) : null}
            {canQueueSharePointPublication ? (
              <form action={queueSharePointPdfPublicationAction}>
                <input type="hidden" name="document_id" value={doc.id} />
                <Button type="submit" variant="secondary">Queue SharePoint PDF</Button>
              </form>
            ) : null}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <div className={cn(infoPanelSurfaceClassName, 'px-4 py-3')}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em]">Mapped Control Language</p>
            <p className="mt-1 text-[11px] text-current/90">
              Source: {frontmatter.criteriaMapped.length > 0 ? 'Document frontmatter' : 'Template mapping fallback'}
              {frontmatter.tscCategory ? ` · Control family ${frontmatter.tscCategory}` : ''}
            </p>
            {groupedCriteriaEntries.length > 0 ? (
              <div className="mt-2 space-y-2">
                {groupedCriteriaEntries.map(([category, criteria]) => (
                  <div key={category} className="space-y-1">
                    <p className="text-xs font-semibold">{category}</p>
                    <ul className="space-y-1">
                      {criteria.map((criterion) => (
                        <li key={criterion.code} className="text-xs">
                          <span className="font-semibold">{criterion.code}</span>
                          {' · '}
                          <span className="font-medium">{criterion.title}.</span>
                          {' '}
                          <span className="text-current/90">{criterion.description}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-1 text-xs text-current/90">
                No explicit control mapping is attached to this document yet. Add control mapping metadata so reviewers can validate language coverage before approval.
              </p>
            )}
          </div>

          {successMessage ? <AlertCallout variant="success">{successMessage}</AlertCallout> : null}
          {errorMessage ? <AlertCallout variant="danger">{errorMessage}</AlertCallout> : null}

          {artifactStates.length > 0 ? (
            <div className={cn(metricPanelSurfaceClassName, 'space-y-4')}>
              <div>
                <p className="text-sm font-semibold text-foreground">Registered artifact state</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Stored review grade is kept separate from display grade. A stale dependency snapshot downgrades the display state until the document is regenerated, but it does not erase prior review history.
                </p>
              </div>
              <div className="grid gap-3 lg:grid-cols-2">
                {artifactStates.map((artifact) => (
                  <div key={artifact.id} className={cn(mutedInsetSurfaceClassName, 'border border-border bg-background px-4 py-3')}>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">{artifact.name}</p>
                      <Badge variant={getArtifactDisplayBadgeVariant(artifact.displayGrade)}>{getArtifactDisplayLabel(artifact.displayGrade)}</Badge>
                      <Badge variant="outline">{getArtifactClassLabel(artifact.class)}</Badge>
                      <Badge variant="secondary">{getArtifactRendererLabel(artifact.renderer)}</Badge>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">{artifact.readinessHint}</p>
                    <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                      <p>Stored review grade: <span className="font-medium text-foreground">{artifact.storedGrade === 'reviewed' ? 'Reviewed' : 'Draft'}</span></p>
                      <p>Fidelity gate: <span className="font-medium text-foreground">{artifact.fidelityEligible ? 'Eligible' : 'Missing inputs'}</span></p>
                      <p>Source snapshot: <span className="font-mono text-foreground">{formatArtifactHash(artifact.sourceSnapshotHash)}</span></p>
                      <p>Current snapshot: <span className="font-mono text-foreground">{formatArtifactHash(artifact.currentSnapshotHash)}</span></p>
                    </div>
                    <p className="mt-3 text-xs text-muted-foreground">
                      Dependency scope: {artifact.dependencyPaths.join(', ')}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {showApprovePanel ? (
            <form action={approveGeneratedDocAction} className={cn(successPanelSurfaceClassName, 'space-y-3 p-3')}>
              <input type="hidden" name="document_id" value={doc.id} />
              <Textarea
                name="approval_reason"
                required
                minLength={10}
                placeholder="Explain why this draft is approved (required)."
                className="min-h-24"
              />
              <div className="flex flex-wrap gap-2">
                <Button type="submit">Submit Approval</Button>
                <Button asChild type="button" variant="outline">
                  <Link href={detailBaseHref}>Cancel</Link>
                </Button>
              </div>
            </form>
          ) : null}

          {showRejectPanel ? (
            <form action={rejectGeneratedDocAction} className={cn(dangerPanelSurfaceClassName, 'space-y-3 p-3')}>
              <input type="hidden" name="document_id" value={doc.id} />
              <Textarea
                name="rejection_reason"
                required
                minLength={10}
                placeholder="Explain why this draft was rejected (required)."
                className="min-h-24"
              />
              <div className="flex flex-wrap gap-2">
                <Button type="submit" variant="danger">Submit Rejection</Button>
                <Button asChild type="button" variant="outline">
                  <Link href={detailBaseHref}>Cancel</Link>
                </Button>
              </div>
            </form>
          ) : null}

          {sectionDiff ? (
            <div className={cn(warningPanelSurfaceClassName, 'space-y-4')}>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold">Review Changes Since Last Approved</p>
                <Badge variant="warning">{sectionDiff.changedSections.length} changed</Badge>
                <Badge variant="secondary">{sectionDiff.unchangedCount} unchanged</Badge>
              </div>
              <p className="text-xs text-current/90">
                Compare section-level changes before deciding whether to approve this draft. If these changes are acceptable, approve the full document.
              </p>
              {sectionDiff.changedSections.length === 0 ? (
                <p className={cn(successPanelSurfaceClassName, 'rounded-xl px-3 py-2 text-xs')}>
                  No section changes detected versus the latest approved revision.
                </p>
              ) : (
                <div className="space-y-3">
                  {sectionDiff.changedSections.map((change, index) => (
                    <details key={`${change.title}-${index}`} className={cn(metricPanelSurfaceClassName, 'rounded-xl bg-background px-4 py-3')}>
                      <summary className="cursor-pointer text-sm font-medium text-foreground">
                        {change.title} ({change.changeType})
                      </summary>
                      <div className="mt-3 grid gap-3 lg:grid-cols-2">
                        <div className={cn(mutedInsetSurfaceClassName, 'border border-border p-3')}>
                          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Previously approved</p>
                          {change.previousContent ? (
                            <MarkdownDocument markdown={change.previousContent} className="text-sm" />
                          ) : (
                            <p className="text-xs text-muted-foreground">No content in prior approved revision.</p>
                          )}
                        </div>
                        <div className={cn(mutedInsetSurfaceClassName, 'border border-border p-3')}>
                          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Current draft</p>
                          {change.currentContent ? (
                            <MarkdownDocument markdown={change.currentContent} className="text-sm" />
                          ) : (
                            <p className="text-xs text-muted-foreground">Section removed from current draft.</p>
                          )}
                        </div>
                      </div>
                    </details>
                  ))}
                </div>
              )}
            </div>
          ) : null}
          {hasPublicationHistory ? (
            <div className={metricPanelSurfaceClassName}>
            <p className="text-sm font-semibold text-foreground">Publication History</p>
            <p className="mt-1 text-xs text-muted-foreground">
              SharePoint and future document-management publication events are tracked here so employee-facing distribution never loses provenance back to TrustScaffold.
            </p>
            <div className="mt-3 space-y-2">
              {publicationHistory?.map((publication) => {
                const metadata = publication.metadata && typeof publication.metadata === 'object'
                  ? publication.metadata as Record<string, unknown>
                  : {};
                const targetFileName = typeof metadata.target_file_name === 'string' ? metadata.target_file_name : null;

                return (
                  <div key={publication.id} className={cn(mutedInsetSurfaceClassName, 'border border-border bg-background px-3 py-2')}>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">{publication.provider}</Badge>
                      <Badge>{publication.format}</Badge>
                      <Badge variant="outline">{getGeneratedDocStatusLabel(publication.status)}</Badge>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {publication.published_at ? `Published ${new Date(publication.published_at).toLocaleString()}` : `Queued ${new Date(publication.created_at).toLocaleString()}`}
                    </p>
                    {targetFileName ? <p className="mt-1 text-xs text-muted-foreground">Target file: {targetFileName}</p> : null}
                    {publication.external_url ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        <a href={publication.external_url} target="_blank" rel="noreferrer" className="text-primary underline underline-offset-4">
                          Open published artifact
                        </a>
                      </p>
                    ) : null}
                    {publication.error_message ? <p className="mt-1 text-xs text-destructive">Error: {publication.error_message}</p> : null}
                  </div>
                );
              })}
            </div>
          </div>
          ) : null}
          {hasDecisionHistory ? (
            <div className={metricPanelSurfaceClassName}>
            <p className="text-sm font-semibold text-foreground">Decision History</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Approval and rejection events are recorded with timestamp, actor, and reviewer reason for audit traceability.
            </p>
            <div className="mt-3 space-y-2">
              {decisionHistory?.map((event) => {
                const details = typeof event.details === 'object' && event.details !== null ? event.details as Record<string, unknown> : {};
                const reason = typeof details.reason === 'string' ? details.reason : null;

                return (
                  <div key={event.id} className={cn(mutedInsetSurfaceClassName, 'border border-border bg-background px-3 py-2')}>
                    <p className="text-xs font-medium text-foreground">
                      {event.action === 'document.approved' ? 'Approved' : 'Rejected'} · {new Date(event.created_at).toLocaleString()}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">Actor: {event.actor_user_id ?? 'system'}</p>
                    {reason ? <p className="mt-1 text-xs text-muted-foreground">Reason: {reason}</p> : null}
                  </div>
                );
              })}
            </div>
          </div>
          ) : null}
          <div className={cn(nestedPanelSurfaceClassName, 'rounded-3xl p-6 md:p-8')}>
            <MarkdownDocument markdown={doc.content_markdown} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}