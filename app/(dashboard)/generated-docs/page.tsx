import type { Route } from 'next';
import Link from 'next/link';

import {
  archiveSelectedGeneratedDocsAction,
  exportToAzureDevOpsFromDashboardAction,
  exportToGithubFromDashboardAction,
} from '@/app/(dashboard)/generated-docs/actions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getDashboardContext } from '@/lib/auth/get-dashboard-context';
import { createSupabaseServerClient } from '@/lib/supabase-server';

function statusBadgeClass(status: string) {
  if (status === 'approved') {
    return 'bg-emerald-100 text-emerald-700';
  }

  if (status === 'archived') {
    return 'bg-slate-200 text-slate-700';
  }

  return 'bg-amber-100 text-amber-700';
}

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
  const isAdmin = context.organization.role === 'admin';

  const supabase = await createSupabaseServerClient();
  const { data: docs, error } = await supabase
    .from('generated_docs')
    .select('id, title, file_name, status, version, updated_at, content_markdown, committed_to_repo, pr_url, templates(name, slug)')
    .eq('organization_id', context.organization.id)
    .order('updated_at', { ascending: false });

  if (error) {
    throw new Error(`Unable to load generated docs: ${error.message}`);
  }

  const draftCount = docs?.filter((doc) => doc.status === 'draft').length ?? 0;
  const approvedCount = docs?.filter((doc) => doc.status === 'approved').length ?? 0;
  const archivedCount = docs?.filter((doc) => doc.status === 'archived').length ?? 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Generated Documents</CardTitle>
            <CardDescription>
              Review, approve, archive, and export Markdown artifacts created by the server-side compiler for {context.organization.name}.
            </CardDescription>
          </div>
          <Button asChild>
            <Link href="/wizard">Open Policy Wizard</Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {successMessage ? <p className="rounded-2xl bg-primary/10 px-4 py-3 text-sm text-primary">{successMessage}</p> : null}
          {errorMessage ? <p className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{errorMessage}</p> : null}
          <div className="flex flex-wrap gap-2 text-sm">
            <Badge variant="secondary">Draft: {draftCount}</Badge>
            <Badge className="bg-emerald-100 text-emerald-700">Approved: {approvedCount}</Badge>
            <Badge className="bg-slate-200 text-slate-700">Archived: {archivedCount}</Badge>
          </div>
        </CardContent>
      </Card>

      {!docs?.length ? (
        <Card>
          <CardHeader>
            <CardTitle>No generated drafts yet</CardTitle>
            <CardDescription>Run the wizard and click generate to persist your first set of policy drafts.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <form className="space-y-4">
          {isAdmin ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Bulk Actions</CardTitle>
                <CardDescription>
                  Check specific documents to archive or export them. If nothing is selected, export actions include every approved document in the organization.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-3">
                <Button type="submit" variant="outline" formAction={archiveSelectedGeneratedDocsAction}>Archive selected</Button>
                <Button type="submit" formAction={exportToGithubFromDashboardAction}>Export approved to GitHub</Button>
                <Button type="submit" variant="secondary" formAction={exportToAzureDevOpsFromDashboardAction}>Export approved to Azure DevOps</Button>
              </CardContent>
            </Card>
          ) : null}

          <div className="grid gap-4">
            {docs.map((doc) => {
              const templateRelation = Array.isArray(doc.templates) ? doc.templates[0] : doc.templates;

              return (
                <Card key={doc.id}>
                  <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex gap-3">
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
                      <div>
                        <CardTitle className="text-lg">
                          <Link href={`/generated-docs/${doc.id}` as Route}>{doc.title}</Link>
                        </CardTitle>
                        <CardDescription>{doc.file_name}</CardDescription>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge className={statusBadgeClass(doc.status)}>{doc.status}</Badge>
                      <Badge variant="secondary">v{doc.version}</Badge>
                      {doc.committed_to_repo ? <Badge variant="outline">Exported</Badge> : null}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                      Updated {new Date(doc.updated_at).toLocaleString()} · Template {templateRelation?.name ?? 'Unknown'}
                    </p>
                    {doc.pr_url ? (
                      <p className="text-sm text-muted-foreground">
                        Pull request: <a className="text-primary underline-offset-4 hover:underline" href={doc.pr_url} target="_blank" rel="noreferrer">{doc.pr_url}</a>
                      </p>
                    ) : null}
                    <pre className="max-h-72 overflow-auto rounded-2xl bg-secondary/50 p-4 text-xs whitespace-pre-wrap text-foreground">
                      {doc.content_markdown}
                    </pre>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </form>
      )}
    </div>
  );
}
