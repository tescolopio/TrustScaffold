import type { Route } from 'next';
import Link from 'next/link';
import { FileText, Settings, ShieldCheck, Users } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getDashboardContext } from '@/lib/auth/get-dashboard-context';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export default async function DashboardPage() {
  const context = await getDashboardContext();

  if (!context?.organization) {
    return null;
  }

  const supabase = await createSupabaseServerClient();
  const [{ count: generatedDocCount, error: generatedDocsError }, { data: draft, error: draftError }] = await Promise.all([
    supabase
      .from('generated_docs')
      .select('id', { head: true, count: 'exact' })
      .eq('organization_id', context.organization.id),
    supabase
      .from('wizard_drafts')
      .select('updated_at')
      .eq('organization_id', context.organization.id)
      .maybeSingle(),
  ]);

  if (generatedDocsError) {
    throw new Error(`Unable to determine document status: ${generatedDocsError.message}`);
  }

  if (draftError) {
    throw new Error(`Unable to determine wizard draft status: ${draftError.message}`);
  }

  const draftUpdatedAt = draft?.updated_at ?? null;
  const generatedDocs = generatedDocCount ?? 0;
  const hasDraft = Boolean(draftUpdatedAt);
  const isAdmin = context.organization.role === 'admin';
  const quickActions: Array<{
    href: Route;
    label: string;
    description: string;
    icon: typeof ShieldCheck;
  }> = [
    {
      href: '/wizard',
      label: hasDraft ? 'Resume policy wizard' : 'Start policy wizard',
      description: hasDraft ? 'Continue capturing controls and regenerate policy drafts.' : 'Establish your org profile and generate your first draft set.',
      icon: ShieldCheck,
    },
    {
      href: '/team',
      label: isAdmin ? 'Create users' : 'View team',
      description: isAdmin ? 'Add admins, editors, approvers, and viewers to the workspace.' : 'See who has access to this organization.',
      icon: Users,
    },
    {
      href: '/generated-docs',
      label: generatedDocs > 0 ? 'Review generated docs' : 'Generated docs workspace',
      description: generatedDocs > 0 ? 'Review, approve, and export the current draft set.' : 'Drafts will appear here after the wizard runs.',
      icon: FileText,
    },
    {
      href: '/settings',
      label: 'Open settings',
      description: 'Configure org profile, integrations, portal access, and evidence delivery.',
      icon: Settings,
    },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Workspace Overview</CardTitle>
          <CardDescription>New admins land here first so they can manage users, start or resume the policy wizard, switch theme, and open settings without being forced into onboarding.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl bg-secondary/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/70">Organization ID</p>
              <p className="mt-3 break-all font-mono text-sm text-foreground">{context.organization.id}</p>
            </div>
            <div className="rounded-2xl bg-accent/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/70">Role</p>
              <p className="mt-3 text-lg font-semibold text-foreground">{context.organization.role}</p>
            </div>
            <div className="rounded-2xl bg-secondary/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/70">Draft status</p>
              <p className="mt-3 text-lg font-semibold text-foreground">{hasDraft ? 'In progress' : 'Not started'}</p>
              <p className="mt-1 text-xs text-muted-foreground">{hasDraft && draftUpdatedAt ? `Updated ${new Date(draftUpdatedAt).toLocaleString()}` : 'No saved wizard draft yet.'}</p>
            </div>
            <div className="rounded-2xl bg-accent/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/70">Generated docs</p>
              <p className="mt-3 text-lg font-semibold text-foreground">{generatedDocs}</p>
              <p className="mt-1 text-xs text-muted-foreground">{generatedDocs > 0 ? 'Drafts are ready for review.' : 'Run the wizard to create the first draft set.'}</p>
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-card p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/70">Quick actions</p>
            <div className="mt-4 grid gap-3">
              {quickActions.map((action) => {
                const Icon = action.icon;

                return (
                  <Link key={action.href} href={action.href} className="rounded-2xl border border-border bg-background px-4 py-3 transition-colors hover:border-primary/40 hover:bg-secondary/50">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 rounded-xl bg-primary/10 p-2 text-primary">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground">{action.label}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{action.description}</p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
            <p className="mt-4 text-xs text-muted-foreground">Theme controls are available in the top-right header.</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Recommended first moves</CardTitle>
            <CardDescription>The dashboard is now the home base for new admins. These are the fastest next actions depending on how far the workspace has progressed.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            {!hasDraft ? (
              <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-500/30 dark:bg-blue-500/10">
                <p className="font-semibold text-blue-900 dark:text-blue-100">No onboarding draft yet</p>
                <p className="mt-1 text-blue-800 dark:text-blue-200">Start the policy wizard to establish the organization profile, infrastructure footprint, governance answers, and first document set.</p>
                <Button asChild className="mt-3">
                  <Link href="/wizard">Start wizard</Link>
                </Button>
              </div>
            ) : (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-500/30 dark:bg-emerald-500/10">
                <p className="font-semibold text-emerald-900 dark:text-emerald-100">Wizard draft already exists</p>
                <p className="mt-1 text-emerald-800 dark:text-emerald-200">Resume the wizard to update answers or go straight to Generated Docs if you want to review existing drafts.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button asChild>
                    <Link href="/wizard">Resume wizard</Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href="/generated-docs">Open generated docs</Link>
                  </Button>
                </div>
              </div>
            )}

            {isAdmin ? (
              <div className="rounded-2xl border border-border bg-secondary/40 p-4">
                <p className="font-semibold text-foreground">Admin setup checklist</p>
                <ul className="mt-2 space-y-2 text-muted-foreground">
                  <li>Create additional members in Team before sharing the workspace.</li>
                  <li>Configure export and evidence settings in Settings before audit prep begins.</li>
                  <li>Use the theme toggle in the header to switch between light and dark mode.</li>
                </ul>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Workspace context</CardTitle>
            <CardDescription>Quick status details for the currently authenticated member.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div className="flex flex-wrap gap-2">
              <Badge>Current user: {context.email}</Badge>
              <Badge variant="secondary">Organization: {context.organization.name}</Badge>
            </div>
            <p>Team management and member creation live under Team.</p>
            <p>Integrations, org profile editing, portal controls, and evidence setup live under Settings.</p>
            <p>The policy wizard is now a deliberate action from the dashboard, not a forced landing path.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
