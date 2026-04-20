import Link from 'next/link';
import ReactMarkdown from 'react-markdown';

import { approveGeneratedDocAction, archiveGeneratedDocAction } from '@/app/(dashboard)/generated-docs/actions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getDashboardContext } from '@/lib/auth/get-dashboard-context';
import { createSupabaseServerClient } from '@/lib/supabase-server';

function stripFrontmatter(markdown: string) {
  return markdown.replace(/^---\n[\s\S]*?\n---\n?/, '');
}

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

  const supabase = await createSupabaseServerClient();
  const { data: doc, error } = await supabase
    .from('generated_docs')
    .select('id, title, file_name, content_markdown, status, version, updated_at, approved_at, templates(name)')
    .eq('organization_id', context.organization.id)
    .eq('id', id)
    .single();

  if (error || !doc) {
    throw new Error(error?.message ?? 'Generated document not found');
  }

  const templateRelation = Array.isArray(doc.templates) ? doc.templates[0] : doc.templates;
  const canApprove = ['admin', 'approver'].includes(context.organization.role) && doc.status !== 'approved';
  const canArchive = context.organization.role === 'admin' && doc.status !== 'archived';
  const renderedMarkdown = stripFrontmatter(doc.content_markdown);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle>{doc.title}</CardTitle>
              <Badge>{doc.status}</Badge>
              <Badge variant="secondary">v{doc.version}</Badge>
            </div>
            <CardDescription>{doc.file_name} · Template {templateRelation?.name ?? 'Unknown'}</CardDescription>
            <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
              Updated {new Date(doc.updated_at).toLocaleString()}
              {doc.approved_at ? ` · Approved ${new Date(doc.approved_at).toLocaleString()}` : ''}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" asChild>
              <Link href="/generated-docs">Back to documents</Link>
            </Button>
            {canApprove ? (
              <form action={approveGeneratedDocAction}>
                <input type="hidden" name="document_id" value={doc.id} />
                <Button type="submit">Approve</Button>
              </form>
            ) : null}
            {canArchive ? (
              <form action={archiveGeneratedDocAction}>
                <input type="hidden" name="document_id" value={doc.id} />
                <Button type="submit" variant="ghost">Archive</Button>
              </form>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          {successMessage ? <p className="rounded-2xl bg-primary/10 px-4 py-3 text-primary">{successMessage}</p> : null}
          {errorMessage ? <p className="rounded-2xl bg-destructive/10 px-4 py-3 text-destructive">{errorMessage}</p> : null}
          <div className="rounded-3xl border border-border bg-white p-6 text-foreground shadow-sm">
            <article className="prose max-w-none prose-headings:text-foreground prose-p:text-foreground prose-li:text-foreground prose-strong:text-foreground prose-code:text-foreground">
              <ReactMarkdown>{renderedMarkdown}</ReactMarkdown>
            </article>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}