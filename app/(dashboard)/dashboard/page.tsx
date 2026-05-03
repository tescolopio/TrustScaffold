import type { Route } from 'next';
import Link from 'next/link';
import { ClipboardList, FileText, Network, Settings, ShieldCheck, Users } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { WizardStageSummaryCards } from '@/components/wizard/wizard-stage-summary-cards';
import { getDashboardContext } from '@/lib/auth/get-dashboard-context';
import {
  emptyStateSurfaceClassName,
  infoPanelSurfaceClassName,
  interactiveListRowSurfaceClassName,
  metricPanelSurfaceClassName,
  nestedPanelSurfaceClassName,
  successPanelSurfaceClassName,
  warningPanelSurfaceClassName,
} from '@/lib/ui/card-surfaces';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { cn, formatDisplayLabel } from '@/lib/utils';
import { soxApplicabilityOptions, wizardSchema, wizardStepTitles } from '@trestle-labs/core';

export default async function DashboardPage() {
  const context = await getDashboardContext();

  if (!context?.organization) {
    return null;
  }

  const supabase = await createSupabaseServerClient();
  const [{ data: docs, error: generatedDocsError }, { data: draft, error: draftError }] = await Promise.all([
    supabase
      .from('generated_docs')
      .select('id, status, updated_at, input_payload')
      .eq('organization_id', context.organization.id),
    supabase
      .from('wizard_drafts')
      .select('updated_at, current_step, payload')
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
  const generatedDocs = docs?.length ?? 0;
  const hasDraft = Boolean(draftUpdatedAt);
  const parsedDraft = draft?.payload ? wizardSchema.safeParse(draft.payload) : null;
  const savedWizardData = parsedDraft?.success ? parsedDraft.data : null;
  const savedStepIndex = typeof draft?.current_step === 'number' ? draft.current_step : null;
  const savedStepLabel = savedStepIndex === null
    ? null
    : wizardStepTitles[Math.max(0, Math.min(savedStepIndex, wizardStepTitles.length - 1))];
  const isAdmin = context.organization.role === 'admin';
  const draftUpdatedAtDate = draftUpdatedAt ? new Date(draftUpdatedAt) : null;
  const staleDocs = draftUpdatedAtDate && docs
    ? docs.filter((doc) => doc.status !== 'archived' && new Date(doc.updated_at) < draftUpdatedAtDate)
    : [];
  const latestGeneratedDoc = docs
    ?.filter((doc) => doc.status !== 'archived')
    .sort((left, right) => new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime())[0];
  const latestGeneratedPayload = latestGeneratedDoc?.input_payload ? wizardSchema.safeParse(latestGeneratedDoc.input_payload) : null;
  const currentSoxApplicability = savedWizardData?.company.soxApplicability ?? 'none';
  const latestGeneratedSoxApplicability = latestGeneratedPayload?.success ? latestGeneratedPayload.data.company.soxApplicability : null;
  const soxLabel = (value: string | null) => soxApplicabilityOptions.find((option) => option.value === value)?.label ?? value ?? 'Unknown';
  const soxApplicabilityChangedSinceGeneration = Boolean(
    savedWizardData
    && latestGeneratedSoxApplicability
    && latestGeneratedSoxApplicability !== currentSoxApplicability
  );
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
      href: '/dashboard/audit-report' as Route,
      label: 'Open audit report',
      description: 'View an auditor-style report generated from current wizard answers, including findings and evidence gaps.',
      icon: ClipboardList,
    },
    {
      href: '/dashboard/control-map' as Route,
      label: 'Open control map',
      description: 'Visualize how wizard answers map to controls, frameworks, sub-service organizations, and generated docs.',
      icon: Network,
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
          <div className="space-y-3">
            <div className={metricPanelSurfaceClassName}>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/70">Organization ID</p>
              <p className="mt-3 break-all font-mono text-sm text-foreground">{context.organization.id}</p>
            </div>
            <div className={metricPanelSurfaceClassName}>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/70">Role</p>
              <p className="mt-3 text-lg font-semibold text-foreground">{formatDisplayLabel(context.organization.role)}</p>
            </div>
            <div className={metricPanelSurfaceClassName}>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/70">Draft status</p>
              <p className="mt-3 text-lg font-semibold text-foreground">{hasDraft ? 'In Progress' : 'Not Started'}</p>
              <p className="mt-1 text-xs text-muted-foreground">{hasDraft && draftUpdatedAt ? `Updated ${new Date(draftUpdatedAt).toLocaleString()}` : 'No saved wizard draft yet.'}</p>
            </div>
            <div className={metricPanelSurfaceClassName}>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/70">Generated docs</p>
              <p className="mt-3 text-lg font-semibold text-foreground">{generatedDocs}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {generatedDocs === 0
                  ? 'Run the wizard to create the first draft set.'
                  : soxApplicabilityChangedSinceGeneration
                    ? 'Generated docs do not match the current SOX applicability answer.'
                    : staleDocs.length > 0
                      ? 'Some generated docs are older than the current draft.'
                      : 'Drafts are ready for review.'}
              </p>
            </div>
          </div>

          <div className={cn(nestedPanelSurfaceClassName, 'rounded-3xl p-5')}>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/70">Quick actions</p>
            <div className="mt-4 grid gap-3">
              {quickActions.map((action) => {
                const Icon = action.icon;

                return (
                  <Link key={action.href} href={action.href} className={cn(interactiveListRowSurfaceClassName, 'px-4 py-3')}>
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

      <Card>
        <CardHeader>
          <CardTitle>Wizard stage snapshots</CardTitle>
          <CardDescription>
            These are the persisted stage summaries pulled from the saved wizard draft so users can immediately see what has already been submitted without reopening the review step.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {savedWizardData ? (
            <>
              <div className={metricPanelSurfaceClassName}>
                <p className="font-semibold text-foreground">Draft snapshot ready</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {savedStepLabel ? `Last saved through ${savedStepLabel}.` : 'Wizard draft is available.'} Use these cards to confirm submitted profile details and jump directly back into the matching wizard stage.
                </p>
              </div>
              {generatedDocs > 0 && (staleDocs.length > 0 || soxApplicabilityChangedSinceGeneration) ? (
                <div className={warningPanelSurfaceClassName}>
                  <p className="text-sm font-semibold">Generated documents need attention</p>
                  {soxApplicabilityChangedSinceGeneration ? (
                    <p className="mt-1 text-xs text-current/90">
                      The current draft says {soxLabel(currentSoxApplicability)}, but the latest generated documents reflect {soxLabel(latestGeneratedSoxApplicability)}. Regenerate documents so the SOX template set matches the current answer.
                    </p>
                  ) : null}
                  {staleDocs.length > 0 ? (
                    <p className="mt-1 text-xs text-current/90">
                      {staleDocs.length} generated document{staleDocs.length === 1 ? '' : 's'} predate the current wizard draft and may no longer reflect the latest answers.
                    </p>
                  ) : null}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button asChild size="sm">
                      <Link href="/generated-docs">Review generated docs</Link>
                    </Button>
                    <Button asChild size="sm" variant="outline">
                      <Link href="/settings">Open settings</Link>
                    </Button>
                  </div>
                </div>
              ) : null}
              <WizardStageSummaryCards data={savedWizardData} organizationName={context.organization.name} highWaterStep={savedStepIndex ?? 0} />
            </>
          ) : (
            <EmptyState className="p-5">
              <p className="font-semibold text-foreground">No saved stage summaries yet</p>
              <p className="mt-1">Start the wizard and save a draft to populate the dashboard with company, scope, governance, tooling, and operations snapshots.</p>
              <Button asChild className="mt-3">
                <Link href="/wizard">Open wizard</Link>
              </Button>
            </EmptyState>
          )}
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
              <div className={infoPanelSurfaceClassName}>
                <p className="font-semibold">No onboarding draft yet</p>
                <p className="mt-1 text-current/90">Start the policy wizard to establish the organization profile, infrastructure footprint, governance answers, and first document set.</p>
                <Button asChild className="mt-3">
                  <Link href="/wizard">Start wizard</Link>
                </Button>
              </div>
            ) : (
              <div className={successPanelSurfaceClassName}>
                <p className="font-semibold">Wizard draft already exists</p>
                <p className="mt-1 text-current/90">Resume the wizard to update answers or go straight to Generated Docs if you want to review existing drafts.</p>
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
              <div className={metricPanelSurfaceClassName}>
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
