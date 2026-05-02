import type { Route } from 'next';
import Link from 'next/link';

import {
  archiveSelectedGeneratedDocsAction,
  exportToAzureDevOpsFromDashboardAction,
  exportToGithubFromDashboardAction,
  regenerateAllDocsAction,
} from '@/app/(dashboard)/generated-docs/actions';
import { AlertCallout } from '@/components/ui/alert-callout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { canRejectOrRegenerateDocuments, isAdminRole } from '@/lib/auth/roles';
import {
  deriveDocumentArtifactStates,
  formatArtifactHash,
  getArtifactDisplayBadgeVariant,
  getArtifactDisplayLabel,
  readPersistedDocumentArtifactStates,
} from '@/lib/documents/document-artifacts';
import { GENERATED_DOC_SECTIONS, getGeneratedDocStatusDisplay, getGeneratedDocStatusLabel } from '@/lib/documents/generated-doc-status';
import { getDashboardContext } from '@/lib/auth/get-dashboard-context';
import { infoPanelSurfaceClassName, interactiveListRowSurfaceClassName, metricPanelSurfaceClassName, nestedPanelSurfaceClassName, warningPanelSurfaceClassName } from '@/lib/ui/card-surfaces';
import { selectFieldClassName } from '@/lib/ui/form-controls';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { cn } from '@/lib/utils';

type SavedIntegration = {
  id: string;
  provider: 'github' | 'azure_devops';
  repo_owner: string;
  repo_name: string;
  default_branch: string;
  encrypted_token: string | null;
  webhook_secret: string | null;
  updated_at: string;
};

export default async function GeneratedDocsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const context = await getDashboardContext();

  if (!context?.organization) {
    return null;
  }

  const resolvedSearchParams = (await searchParams) ?? {};
  const successMessage = typeof resolvedSearchParams.success === 'string' ? resolvedSearchParams.success : null;
  const errorMessage = typeof resolvedSearchParams.error === 'string' ? resolvedSearchParams.error : null;
  const isAdmin = isAdminRole(context.organization.role);


  const supabase = await createSupabaseServerClient();
  const [{ data: docs, error }, { data: draft }, { data: integrations, error: integrationsError }] = await Promise.all([
    supabase
      .from('generated_docs')
      .select('id, title, file_name, status, version, updated_at, content_markdown, committed_to_repo, pr_url, input_payload, artifact_state, templates(name, slug)')
      .eq('organization_id', context.organization.id)
      .order('updated_at', { ascending: false }),
    supabase
      .from('wizard_drafts')
      .select('updated_at, payload')
      .eq('organization_id', context.organization.id)
      .maybeSingle(),
    supabase
      .from('organization_integrations')
      .select('id, provider, repo_owner, repo_name, default_branch, encrypted_token, webhook_secret, updated_at')
      .eq('organization_id', context.organization.id)
      .order('provider', { ascending: true }),
  ]);

  if (error) {
    throw new Error(`Unable to load generated docs: ${error.message}`);
  }

  if (integrationsError) {
    throw new Error(`Unable to load integrations: ${integrationsError.message}`);
  }

  const draftUpdatedAt = draft?.updated_at ? new Date(draft.updated_at) : null;
  const currentDraftPayload = draft?.payload ?? null;
  const staleDocs = draftUpdatedAt && docs
    ? docs.filter((doc) => doc.status !== 'archived' && new Date(doc.updated_at) < draftUpdatedAt)
    : [];

  const draftCount = docs?.filter((doc) => doc.status === 'draft').length ?? 0;
  const approvedCount = docs?.filter((doc) => doc.status === 'approved').length ?? 0;
  const archivedCount = docs?.filter((doc) => doc.status === 'archived').length ?? 0;
  const canRegenerate = canRejectOrRegenerateDocuments(context.organization.role);
  const draftDocs = docs?.filter((doc) => doc.status === 'draft') ?? [];
  const approvedDocs = docs?.filter((doc) => doc.status === 'approved') ?? [];
  const archivedDocs = docs?.filter((doc) => doc.status === 'archived') ?? [];
  const savedIntegrations = (integrations ?? []) as SavedIntegration[];
  const githubIntegration = savedIntegrations.find((integration) => integration.provider === 'github') ?? null;
  const azureDevOpsIntegration = savedIntegrations.find((integration) => integration.provider === 'azure_devops') ?? null;
  const configuredExportTargets = [
    githubIntegration
      ? {
          id: 'github',
          label: savedIntegrations.length === 1 ? 'Export approved to repository' : 'Export approved to GitHub',
          helperLabel: 'GitHub export',
          description: `Creates or updates a GitHub pull request against ${githubIntegration.repo_owner}/${githubIntegration.repo_name}. Approved documents are exported; drafts remain unchanged.`,
          formAction: exportToGithubFromDashboardAction,
          variant: 'default' as const,
        }
      : null,
    azureDevOpsIntegration
      ? {
          id: 'azure-devops',
          label: savedIntegrations.length === 1 ? 'Export approved to repository' : 'Export approved to Azure DevOps',
          helperLabel: 'Azure DevOps export',
          description: `Creates or updates an Azure DevOps pull request against ${azureDevOpsIntegration.repo_owner}/${azureDevOpsIntegration.repo_name}. Approved documents are exported; drafts remain unchanged.`,
          formAction: exportToAzureDevOpsFromDashboardAction,
          variant: githubIntegration ? 'secondary' as const : 'default' as const,
        }
      : null,
  ].filter((target) => target !== null);
  const documentSections = [
    { ...GENERATED_DOC_SECTIONS.draft, docs: draftDocs },
    { ...GENERATED_DOC_SECTIONS.approved, docs: approvedDocs },
    { ...GENERATED_DOC_SECTIONS.archived, docs: archivedDocs },
  ].filter((section) => section.docs.length > 0);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Generated Documents</CardTitle>
            <CardDescription>
              Review each generated artifact individually. Drafts move to approved status only from the document review page.
            </CardDescription>
          </div>
          <Button asChild>
            <Link href="/wizard">Open Policy Wizard</Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {successMessage ? <AlertCallout variant="success">{successMessage}</AlertCallout> : null}
          {errorMessage ? <AlertCallout variant="danger">{errorMessage}</AlertCallout> : null}
          {staleDocs.length > 0 ? (
            <div className={cn(warningPanelSurfaceClassName, 'flex flex-wrap items-center justify-between gap-3 px-4 py-3')}>
              <div>
                <p className="text-sm font-semibold">Org profile updated since last generation</p>
                <p className="text-xs text-current/90">
                  {staleDocs.length} document{staleDocs.length === 1 ? '' : 's'} may be out of date. Last profile update: {draftUpdatedAt ? draftUpdatedAt.toLocaleString() : ''}
                </p>
              </div>
              {canRegenerate ? (
                <form action={regenerateAllDocsAction} className="flex flex-wrap items-center gap-2">
                  <select
                    name="bridge_letter_primary_audience_override"
                    defaultValue="auto"
                    className={cn(selectFieldClassName, 'min-w-56 bg-background/90')}
                    aria-label="Bridge letter audience for regeneration"
                  >
                    <option value="auto">Auto bridge letter audience</option>
                    <option value="general-security-customer">Force general security customer</option>
                    <option value="privacy-sensitive-customer">Force privacy-sensitive customer</option>
                    <option value="healthcare-customer">Force healthcare customer</option>
                    <option value="payments-customer">Force payments customer</option>
                    <option value="enterprise-governance-customer">Force enterprise governance customer</option>
                  </select>
                  <Button type="submit" size="sm" variant="outline">
                    Update All Documents
                  </Button>
                </form>
              ) : null}
            </div>
          ) : null}
          <div className="flex flex-wrap gap-2 text-sm">
            <Badge variant="secondary">Draft: {draftCount}</Badge>
            <Badge variant="success">Approved: {approvedCount}</Badge>
            <Badge variant="neutral">Archived: {archivedCount}</Badge>
          </div>
        </CardContent>
      </Card>

      {!docs?.length ? (
        <Card>
          <CardHeader>
            <CardTitle>No generated drafts yet</CardTitle>
            <CardDescription>Run the wizard and click generate to persist your first set of policy drafts.</CardDescription>
          </CardHeader>
          <CardContent>
            <EmptyState>Generated drafts will appear here after the wizard creates the first document set.</EmptyState>
          </CardContent>
        </Card>
      ) : (
        <form className="space-y-4">
          {isAdmin ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Bulk Actions</CardTitle>
                <CardDescription>
                  Select drafts to archive, or export approved documents to configured repository destinations. Approval is intentionally document-by-document.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className={infoPanelSurfaceClassName}>
                  <p className="text-sm font-semibold text-foreground">Approval workflow</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Open a document with Review and approve, inspect the rendered policy, then approve that individual document. TrustScaffold does not bulk approve generated drafts.
                  </p>
                </div>
                <div className={cn(interactiveListRowSurfaceClassName, 'grid gap-3 p-3 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-end')}>
                  <div>
                    <label htmlFor="bridge-letter-primary-audience-override" className="text-sm font-semibold text-foreground">
                      Bridge letter audience on regenerate and export
                    </label>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Applies to the bridge letter only. Export keeps stored approved drafts unchanged, while regenerate updates saved document content.
                    </p>
                  </div>
                  <select
                    id="bridge-letter-primary-audience-override"
                    name="bridge_letter_primary_audience_override"
                    defaultValue="auto"
                    className={selectFieldClassName}
                  >
                    <option value="auto">Auto-select primary audience</option>
                    <option value="general-security-customer">Force general security customer</option>
                    <option value="privacy-sensitive-customer">Force privacy-sensitive customer</option>
                    <option value="healthcare-customer">Force healthcare customer</option>
                    <option value="payments-customer">Force payments customer</option>
                    <option value="enterprise-governance-customer">Force enterprise governance customer</option>
                  </select>
                </div>
                <TooltipProvider>
                  <div className="flex flex-wrap gap-3">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span tabIndex={0} className="inline-flex">
                          <Button type="submit" variant="outline" formAction={archiveSelectedGeneratedDocsAction}>Archive selected</Button>
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        Moves only checked documents out of the active list. If nothing is checked, no documents are archived and the page returns a selection error.
                      </TooltipContent>
                    </Tooltip>

                    {configuredExportTargets.map((target) => (
                      <Tooltip key={target.id}>
                        <TooltipTrigger asChild>
                          <span tabIndex={0} className="inline-flex">
                            <Button
                              type="submit"
                              variant={target.variant}
                              formAction={target.formAction}
                              disabled={approvedCount === 0}
                            >
                              {target.label}
                            </Button>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="font-semibold text-foreground">{target.helperLabel}</p>
                          <p className="mt-1 text-muted-foreground">{target.description}</p>
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </div>
                </TooltipProvider>
                <p className="text-xs text-muted-foreground">
                  {configuredExportTargets.length === 0
                    ? 'No repository destination is configured yet. Configure GitHub or Azure DevOps in Settings to enable approved-document export.'
                    : approvedCount === 0
                    ? 'Approve at least one document before exporting. Once approved documents exist, export actions include every approved document unless you select a smaller approved subset.'
                    : configuredExportTargets.length === 1
                      ? 'The export action sends approved documents to the configured repository destination. Draft documents remain visible until you approve them from the individual document view.'
                      : 'Export actions send approved documents to the selected repository destination. Draft documents remain visible until you approve them from the individual document view.'}
                </p>
              </CardContent>
            </Card>
          ) : null}

          <div className="space-y-6">
            {documentSections.map((section) => (
              <section key={section.id} className={cn('rounded-3xl border p-4 shadow-sm', section.wrapperClassName)}>
                <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-foreground">{section.title}</h3>
                    <p className="mt-1 max-w-3xl text-xs text-muted-foreground">{section.description}</p>
                  </div>
                  <Badge variant={section.countVariant}>{section.docs.length}</Badge>
                </div>
                <div className="grid gap-3">
                  {section.docs.map((doc) => {
                    const templateRelation = Array.isArray(doc.templates) ? doc.templates[0] : doc.templates;
                    const statusDisplay = getGeneratedDocStatusDisplay(doc.status);
                    const artifactStates = readPersistedDocumentArtifactStates(doc.artifact_state).length > 0
                      ? readPersistedDocumentArtifactStates(doc.artifact_state)
                      : deriveDocumentArtifactStates({
                          documentSlug: templateRelation?.slug,
                          documentStatus: doc.status,
                          sourcePayload: doc.input_payload,
                          currentDraftPayload,
                        });
                    const hasStaleArtifacts = artifactStates.some((artifact) => artifact.isStale);

                    return (
                      <Card key={doc.id} className={cn('shadow-sm backdrop-blur-0', statusDisplay.cardClassName)}>
                        <CardHeader className="gap-4 p-4 sm:flex-row sm:items-start sm:justify-between sm:space-y-0">
                          <div className="flex min-w-0 flex-1 gap-3">
                            {isAdmin ? (
                              <div className="pt-1">
                                <input
                                  type="checkbox"
                                  name="selected_doc_ids"
                                  value={doc.id}
                                  aria-label={`Select ${doc.title}`}
                                  className="h-5 w-5 rounded border border-primary/30 accent-primary"
                                />
                              </div>
                            ) : null}
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <CardTitle className="text-base leading-snug sm:text-lg">
                                  <Link className="text-primary underline underline-offset-4 decoration-primary/40 transition-colors hover:decoration-primary" href={`/generated-docs/${doc.id}` as Route}>{doc.title}</Link>
                                </CardTitle>
                                <Badge variant={statusDisplay.badgeVariant}>{getGeneratedDocStatusLabel(doc.status)}</Badge>
                                <Badge variant="secondary">v{doc.version}</Badge>
                                {doc.committed_to_repo ? <Badge variant="outline">Exported</Badge> : null}
                              </div>
                              <CardDescription className="mt-1 break-all">{doc.file_name}</CardDescription>
                              <p className="mt-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                                Updated {new Date(doc.updated_at).toLocaleString()} · Template {templateRelation?.name ?? 'Unknown'}
                              </p>
                              {artifactStates.length > 0 ? (
                                <div className="mt-3 space-y-2">
                                  <div className="flex flex-wrap gap-2">
                                    {artifactStates.map((artifact) => (
                                      <Badge key={artifact.id} variant={getArtifactDisplayBadgeVariant(artifact.displayGrade)}>
                                        {artifact.name}: {getArtifactDisplayLabel(artifact.displayGrade)}
                                      </Badge>
                                    ))}
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    {hasStaleArtifacts
                                      ? 'Artifact dependency snapshots differ from the current wizard draft.'
                                      : `Artifact dependency snapshot ${formatArtifactHash(artifactStates[0].sourceSnapshotHash)} matches the current wizard draft.`}
                                  </p>
                                </div>
                              ) : null}
                              {doc.pr_url ? (
                                <p className="mt-2 text-sm text-muted-foreground">
                                  Pull request: <a className="text-primary underline-offset-4 hover:underline" href={doc.pr_url} target="_blank" rel="noreferrer">{doc.pr_url}</a>
                                </p>
                              ) : null}
                            </div>
                          </div>
                          <div className={cn(nestedPanelSurfaceClassName, 'flex w-full flex-col gap-2 p-3 sm:w-72')}>
                            <p className="text-sm font-semibold text-foreground">Document-level approval</p>
                            <p className="text-xs text-muted-foreground">
                              {statusDisplay.summaryText}
                            </p>
                            <Button asChild size="sm" variant={doc.status === 'draft' ? 'default' : 'secondary'}>
                              <Link href={`/generated-docs/${doc.id}` as Route}>{statusDisplay.actionLabel}</Link>
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent className="px-4 pb-4 pt-0">
                          <details className={cn(metricPanelSurfaceClassName, 'bg-background/55 px-4 py-3 text-sm')}>
                            <summary className="cursor-pointer select-none font-medium text-muted-foreground transition-colors hover:text-foreground">
                              Show raw Markdown preview
                            </summary>
                            <pre className="mt-3 max-h-72 overflow-auto rounded-xl bg-secondary/50 p-4 text-xs whitespace-pre-wrap text-foreground">
                              {doc.content_markdown}
                            </pre>
                          </details>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </form>
      )}
    </div>
  );
}
