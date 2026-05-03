import type { Route } from 'next';
import Link from 'next/link';

import { submitAuditReportAttestationAction } from '@/app/(dashboard)/dashboard/audit-report/actions';
import { PrintReportButton } from '@/components/dashboard/print-report-button';
import { AlertCallout } from '@/components/ui/alert-callout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Textarea } from '@/components/ui/textarea';
import {
  metricPanelSurfaceClassName,
  mutedInsetSurfaceClassName,
  warningPanelSurfaceClassName,
} from '@/lib/ui/card-surfaces';
import { selectFieldClassName } from '@/lib/ui/form-controls';
import { getDashboardContext } from '@/lib/auth/get-dashboard-context';
import { buildAuditReportModel, type Severity } from '@trestle-labs/core';
import { mergeWizardData } from '@trestle-labs/core';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { wizardSchema } from '@trestle-labs/core';
import { cn } from '@/lib/utils';

function severityVariant(severity: Severity) {
  if (severity === 'High') return 'danger';
  if (severity === 'Medium') return 'warning';
  return 'info';
}

export default async function AuditReportPage({
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

  const supabase = await createSupabaseServerClient();
  const [{ data: draft }, { data: docs }, { data: attestationHistory }] = await Promise.all([
    supabase
      .from('wizard_drafts')
      .select('payload, updated_at')
      .eq('organization_id', context.organization.id)
      .maybeSingle(),
    supabase
      .from('generated_docs')
      .select('id, title, status, updated_at, input_payload')
      .eq('organization_id', context.organization.id)
      .order('updated_at', { ascending: false }),
    supabase
      .from('audit_logs')
      .select('id, actor_user_id, details, created_at')
      .eq('organization_id', context.organization.id)
      .eq('action', 'audit_report.attested')
      .order('created_at', { ascending: false })
      .limit(6),
  ]);

  const parsedDraft = draft?.payload ? wizardSchema.safeParse(draft.payload) : null;

  if (!parsedDraft?.success) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>TrustScaffold Audit Report</CardTitle>
            <CardDescription>
              Auditor-style summary generated from wizard answers.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <EmptyState>
              No saved wizard draft is available yet. Complete the wizard first, then this report will show organizational posture, findings, and readiness from an auditor perspective.
            </EmptyState>
            <Button asChild>
              <Link href="/wizard">Open Policy Wizard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const wizardData = mergeWizardData(parsedDraft.data);
  const previousPayload = docs?.find((doc) => doc.input_payload)?.input_payload;
  const parsedPrevious = previousPayload ? wizardSchema.safeParse(previousPayload) : null;
  const previousWizardData = parsedPrevious?.success ? mergeWizardData(parsedPrevious.data) : null;
  const reportModel = buildAuditReportModel(wizardData, docs ?? [], previousWizardData);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle>TrustScaffold Audit Report</CardTitle>
            <Badge variant="secondary">Auditor-style Preview</Badge>
          </div>
          <CardDescription>
            This report mirrors the way an auditor summarizes scope, control posture, findings, and evidence expectations based on your current TrustScaffold answers.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {successMessage ? <AlertCallout variant="success" className="sm:col-span-2 xl:col-span-4">{successMessage}</AlertCallout> : null}
          {errorMessage ? <AlertCallout variant="danger" className="sm:col-span-2 xl:col-span-4">{errorMessage}</AlertCallout> : null}
          <div className={metricPanelSurfaceClassName}>
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Overall posture</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{reportModel.overallScore}%</p>
            <p className="mt-1 text-xs text-muted-foreground">{reportModel.overallScoreBand} maturity</p>
          </div>
          <div className={metricPanelSurfaceClassName}>
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Control domains</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{reportModel.assessment.completedDomains}/{reportModel.assessment.totalDomains}</p>
            <p className="mt-1 text-xs text-muted-foreground">Domains in progress or established</p>
          </div>
          <div className={metricPanelSurfaceClassName}>
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Generated documents</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{reportModel.activeDocs.length}</p>
            <p className="mt-1 text-xs text-muted-foreground">{reportModel.approvedDocCount} approved for export</p>
          </div>
          <div className={metricPanelSurfaceClassName}>
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Report timestamp</p>
            <p className="mt-2 text-sm font-semibold text-foreground">{new Date().toLocaleString()}</p>
            <p className="mt-1 text-xs text-muted-foreground">Draft last updated {draft?.updated_at ? new Date(draft.updated_at).toLocaleString() : 'Unknown'}</p>
          </div>
          <div className="sm:col-span-2 xl:col-span-4 flex flex-wrap gap-2">
            <Button asChild>
              <Link href={'/api/v1/audit-report/export' as Route}>Export Markdown</Link>
            </Button>
            <PrintReportButton />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>Entity and Scope Profile</CardTitle>
            <CardDescription>
              Organization context, in-scope boundaries, and declared audit drivers.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><span className="font-semibold text-foreground">Organization:</span> {reportModel.companySummary.name || context.organization.name}</p>
            <p><span className="font-semibold text-foreground">Primary contact:</span> {reportModel.companySummary.contact}</p>
            <p><span className="font-semibold text-foreground">Business profile:</span> {reportModel.companySummary.businessModel} ({reportModel.companySummary.deliveryModel})</p>
            <p><span className="font-semibold text-foreground">Compliance maturity:</span> {reportModel.companySummary.maturityLabel}</p>
            <p><span className="font-semibold text-foreground">SOX / ITGC applicability:</span> {reportModel.companySummary.soxLabel}</p>
            <p><span className="font-semibold text-foreground">System in scope:</span> {reportModel.companySummary.systemName}</p>
            <p><span className="font-semibold text-foreground">PHI in scope:</span> {reportModel.companySummary.phiInScope ? 'Yes' : 'No'} | <span className="font-semibold text-foreground">CDE in scope:</span> {reportModel.companySummary.cdeInScope ? 'Yes' : 'No'}</p>
            <p><span className="font-semibold text-foreground">Website exposure:</span> {wizardData.company.hasPublicWebsite ? wizardData.company.website || 'Public website declared' : 'No public website in scope'}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Framework Footprint</CardTitle>
            <CardDescription>
              Criteria and frameworks implied by the current answer set.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {reportModel.selectedTsc.map((label) => (
                <Badge key={label} variant="secondary">{label}</Badge>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {reportModel.selectedCriteria.slice(0, 24).map((code) => (
                <Badge key={code} variant="outline">{code}</Badge>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Total mapped criteria and tags: {reportModel.selectedCriteria.length}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Period-over-Period Change Log</CardTitle>
          <CardDescription>
            Compares key audit-relevant fields between the current draft and the latest available baseline payload.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {reportModel.comparison.length === 0 ? (
            <p className="text-sm text-muted-foreground">No material comparison differences detected yet.</p>
          ) : (
            <div className="space-y-2">
              {reportModel.comparison.map((item) => (
                <div key={item.label} className={cn(mutedInsetSurfaceClassName, 'border border-border text-sm')}>
                  <p className="font-semibold text-foreground">{item.label}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Previous: {item.before} | Current: {item.after}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Control Domain Assessment</CardTitle>
          <CardDescription>
            Domain-level scoring based on security assessment responses and readiness declarations.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
          {reportModel.assessment.domains.map((domain) => (
            <div key={domain.key} className={metricPanelSurfaceClassName}>
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-foreground">{domain.label}</p>
                <Badge variant="secondary">{domain.score}%</Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Readiness: {domain.readiness}</p>
              <p className="mt-1 text-xs text-muted-foreground">Coverage: {domain.answered}/{domain.total}</p>
              <p className="mt-2 text-xs text-muted-foreground">Top gaps:</p>
              <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
                {domain.gaps.slice(0, 2).map((gap) => (
                  <li key={gap}>- {gap}</li>
                ))}
              </ul>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Auditor Findings Preview</CardTitle>
          <CardDescription>
            Simulated findings generated from answer patterns that typically trigger audit scrutiny.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {reportModel.findings.length === 0 ? (
            <p className="text-sm text-muted-foreground">No critical pattern-based findings were generated from the current answers.</p>
          ) : (
            reportModel.findings.map((finding, index) => (
              <div key={`${finding.title}-${index}`} className={metricPanelSurfaceClassName}>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={severityVariant(finding.severity)}>{finding.severity}</Badge>
                  <p className="text-sm font-semibold text-foreground">{finding.title}</p>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{finding.detail}</p>
                <p className="mt-2 text-xs text-muted-foreground">Criteria: {finding.criteria.join(', ')}</p>
                <p className="mt-1 text-xs text-muted-foreground">Recommended management response: {finding.remediation}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Sub-service Organization Coverage</CardTitle>
            <CardDescription>
              Third-party dependencies and how they affect control ownership and assurance expectations.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {wizardData.subservices.length === 0 ? (
              <p className="text-muted-foreground">No sub-service organizations documented yet.</p>
            ) : (
              wizardData.subservices.map((subservice, index) => (
                <div key={`${subservice.name}-${index}`} className={cn(mutedInsetSurfaceClassName, 'border border-border p-3')}>
                  <p className="font-semibold text-foreground">{subservice.name || `Sub-service ${index + 1}`}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Role: {subservice.role || 'Unspecified'}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Inclusion model: {subservice.controlInclusion}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Assurance: {subservice.hasAssuranceReport ? subservice.assuranceReportType : 'No report documented'}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Review cadence: {subservice.reviewCadence}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Evidence and Report Package</CardTitle>
            <CardDescription>
              TrustScaffold artifacts that support auditor review and management response preparation.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className={cn(mutedInsetSurfaceClassName, 'border border-border p-3')}>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Expected generated templates</p>
              <p className="mt-1 text-sm font-semibold text-foreground">{reportModel.expectedTemplateCount}</p>
              <p className="mt-1 text-xs text-muted-foreground">Based on current TSC and scope selections.</p>
            </div>
            <div className={cn(mutedInsetSurfaceClassName, 'border border-border p-3')}>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Top open evidence gaps</p>
              {reportModel.openGaps.length === 0 ? (
                <p className="mt-1 text-xs text-muted-foreground">No major domain gaps detected.</p>
              ) : (
                <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
                  {reportModel.openGaps.slice(0, 6).map((item, index) => (
                    <li key={`${item.domain}-${index}`}>- [{item.domain}] {item.gap}</li>
                  ))}
                </ul>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild>
                <Link href="/generated-docs">Review Generated Docs</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href={'/dashboard/control-map' as Route}>Open Control Map</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Reviewer Attestation</CardTitle>
            <CardDescription>
              Internal sign-off to document whether this report is ready for auditor-facing review.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={submitAuditReportAttestationAction} className="space-y-3">
              <div className="space-y-1">
                <label htmlFor="readiness" className="text-sm font-medium text-foreground">Readiness decision</label>
                <select id="readiness" name="readiness" required defaultValue="ready" className={selectFieldClassName}>
                  <option value="ready">Ready for auditor review</option>
                  <option value="not-ready">Not ready, remediation required</option>
                </select>
              </div>
              <div className="space-y-1">
                <label htmlFor="attestation_note" className="text-sm font-medium text-foreground">Reviewer note</label>
                <Textarea id="attestation_note" name="attestation_note" required minLength={10} placeholder="Summarize the rationale for this readiness decision." className="min-h-24" />
              </div>
              <Button type="submit">Submit Attestation</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Attestation History</CardTitle>
            <CardDescription>
              Most recent internal sign-off submissions for this organization.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {!attestationHistory?.length ? (
              <p className="text-sm text-muted-foreground">No attestations submitted yet.</p>
            ) : (
              attestationHistory.map((item) => {
                const details = typeof item.details === 'object' && item.details !== null ? item.details as Record<string, unknown> : {};
                const readiness = typeof details.readiness === 'string' ? details.readiness : 'unknown';
                const note = typeof details.note === 'string' ? details.note : 'No note provided.';
                const submittedBy = typeof details.submitted_by === 'string' ? details.submitted_by : item.actor_user_id ?? 'unknown';

                return (
                  <div key={item.id} className={cn(mutedInsetSurfaceClassName, 'border border-border text-xs')}>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">{readiness}</Badge>
                      <span className="font-medium text-foreground">{new Date(item.created_at).toLocaleString()}</span>
                    </div>
                    <p className="mt-1 text-muted-foreground">Reviewer: {submittedBy}</p>
                    <p className="mt-1 text-muted-foreground">Note: {note}</p>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
