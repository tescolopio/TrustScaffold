'use client';

import React, { useEffect, useMemo, useRef, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { Check, ChevronDown, ChevronUp, Circle, CircleDashed, Plus, Sparkles, Trash2 } from 'lucide-react';
import { useFieldArray, useForm, type FieldPath } from 'react-hook-form';
import { toast } from 'sonner';

import { compileDocsAction } from '@/app/actions/compile-docs';
import { getExpectedTemplates } from '@/lib/wizard/template-manifest';
import { useOrg } from '@/components/providers/org-provider';
import { AuditorLensCallout } from '@/components/wizard/auditor-lens-callout';
import { GapAnalysisCard } from '@/components/wizard/gap-analysis-card';
import { LoneWolfWarning } from '@/components/wizard/lone-wolf-warning';
import { StepProgressCard } from '@/components/wizard/step-progress-card';
import {
  ShowMeHow,
  SHOW_ME_HOW_GITHUB_BRANCH_PROTECTION,
  SHOW_ME_HOW_AZURE_DEVOPS_BRANCH_POLICY,
  SHOW_ME_HOW_ENTRA_MFA,
  SHOW_ME_HOW_OKTA_MFA,
  SHOW_ME_HOW_AWS_SCPs,
} from '@/components/wizard/show-me-how';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import {
  dataTypeOptions,
  defaultWizardValues,
  hrisProviderOptions,
  idpProviderOptions,
  selectedTscLabels,
  subserviceReviewCadenceOptions,
  assuranceReportTypeOptions,
  controlInclusionOptions,
  acknowledgementCadenceOptions,
  orgChartMaintenanceOptions,
  boardMeetingFrequencyOptions,
  internalAuditFrequencyOptions,
  trainingCadenceOptions,
  phishingFrequencyOptions,
  penTestFrequencyOptions,
  policyPublicationMethodOptions,
  securityAssessmentReadinessOptions,
  tscOptions,
  vcsProviderOptions,
  wizardSchema,
  wizardStepTitles,
  type WizardData,
} from '@/lib/wizard/schema';
import { useWizardStore } from '@/lib/wizard/store';
import { computeAssessmentSummary, computeStepCompletions } from '@/lib/wizard/security-scoring';

const stepFields: FieldPath<WizardData>[][] = [
  // Step 0: Welcome
  ['company.name', 'company.website', 'company.primaryContactName', 'company.primaryContactEmail', 'company.industry'],
  // Step 1: Governance
  ['governance.acknowledgementCadence', 'governance.boardMeetingFrequency', 'governance.orgChartMaintenance', 'governance.internalAuditFrequency', 'training.securityAwarenessTrainingTool', 'training.trainingCadence'],
  // Step 2: System Scope
  ['scope.systemName', 'scope.systemDescription', 'scope.dataTypesHandled'],
  // Step 3: TSC Selection
  ['tscSelections.availability', 'tscSelections.confidentiality', 'tscSelections.processingIntegrity', 'tscSelections.privacy'],
  // Step 4: Infrastructure
  ['infrastructure.cloudProviders', 'infrastructure.type', 'infrastructure.idpProvider'],
  // Step 5: Security Assessment
  ['securityAssessment.documentReview.readiness', 'securityAssessment.logReview.readiness', 'securityAssessment.rulesetReview.readiness', 'securityAssessment.configReview.readiness', 'securityAssessment.networkAnalysis.readiness', 'securityAssessment.fileIntegrity.readiness'],
  // Step 6: Security Tooling
  ['securityTooling.penetrationTestFrequency'],
  // Step 7: Operations
  [
    'operations.ticketingSystem',
    'operations.versionControlSystem',
    'operations.onCallTool',
    'operations.vcsProvider',
    'operations.hrisProvider',
    'operations.terminationSlaHours',
    'operations.onboardingSlaDays',
    'operations.policyPublicationMethod',
  ],
  // Step 8: Review
  [],
  // Step 9: Generate
  [],
];

function StepShell({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground">{title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  );
}

function GenerateStep({
  watchedValues,
  selectedTsc,
  isGenerating,
  onGenerate,
}: {
  watchedValues: WizardData;
  selectedTsc: string[];
  isGenerating: boolean;
  onGenerate: () => void;
}) {
  const templates = getExpectedTemplates(watchedValues.tscSelections);
  const [completedCount, setCompletedCount] = React.useState(0);

  React.useEffect(() => {
    if (!isGenerating) {
      setCompletedCount(0);
      return;
    }
    setCompletedCount(0);
    let i = 0;
    const interval = setInterval(() => {
      i += 1;
      setCompletedCount(i);
      if (i >= templates.length - 1) clearInterval(interval);
    }, Math.max(200, Math.round(4000 / templates.length)));
    return () => clearInterval(interval);
  }, [isGenerating, templates.length]);

  const infra = [
    ...(watchedValues.infrastructure.cloudProviders ?? []).map((p: string) => p.toUpperCase()),
    ...(watchedValues.infrastructure.hostsOwnHardware ? ['On-premises'] : []),
  ].join(', ') || watchedValues.infrastructure.type || '—';

  return (
    <div className="space-y-5">
      {/* Context summary strip */}
      <div className="grid gap-2 rounded-2xl bg-secondary/50 p-4 text-sm sm:grid-cols-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Scope</p>
          <p className="mt-0.5 font-medium text-foreground">{selectedTsc.join(' · ')}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Infrastructure</p>
          <p className="mt-0.5 font-medium text-foreground">{infra}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Vendors</p>
          <p className="mt-0.5 font-medium text-foreground">{watchedValues.subservices.filter((s) => s.name).length} subservice{watchedValues.subservices.filter((s) => s.name).length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Pre-flight document list */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">
            {templates.length} document{templates.length !== 1 ? 's' : ''} will be generated
          </p>
          {isGenerating && (
            <p className="text-xs text-muted-foreground">
              {Math.min(completedCount, templates.length)} / {templates.length} compiled…
            </p>
          )}
        </div>
        <div className="divide-y divide-border rounded-2xl border border-border overflow-hidden">
          {templates.map((t, i) => {
            const done = isGenerating && i < completedCount;
            const active = isGenerating && i === completedCount;
            return (
              <div
                key={t.name}
                className={cn(
                  'flex items-center gap-3 px-4 py-2.5 text-sm transition-colors',
                  done ? 'bg-emerald-50' : active ? 'bg-primary/5' : 'bg-white'
                )}
              >
                <span className={cn(
                  'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold',
                  done ? 'bg-emerald-500 text-white' : active ? 'bg-primary text-primary-foreground animate-pulse' : 'bg-secondary text-muted-foreground'
                )}>
                  {done ? <Check className="h-3 w-3" /> : i + 1}
                </span>
                <span className={cn('flex-1 font-medium', done ? 'text-emerald-800' : active ? 'text-foreground' : 'text-foreground/70')}>
                  {t.name}
                </span>
                <Badge variant="outline" className="hidden px-1.5 py-0 text-[10px] sm:inline-flex">
                  {t.criteriaHint}
                </Badge>
              </div>
            );
          })}
        </div>
      </div>

      <Button type="button" size="lg" className="w-full sm:w-auto" onClick={onGenerate} disabled={isGenerating}>
        <Sparkles className="mr-2 h-4 w-4" />
        {isGenerating ? `Compiling ${templates.length} documents…` : `Generate ${templates.length} policy documents`}
      </Button>
    </div>
  );
}

export function PolicyWizard() {
  const router = useRouter();
  const { organization } = useOrg();
  const [isGenerating, startGenerating] = useTransition();
  const hasLoadedPersistedDraft = useRef(false);
  const { organizationId, currentStep, data, hasHydrated, setOrganization, setCurrentStep, setData, reset, markGenerated } =
    useWizardStore();

  const form = useForm<WizardData>({
    resolver: zodResolver(wizardSchema),
    defaultValues: data,
    mode: 'onBlur',
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'subservices',
  });

  const watchedInfrastructure = form.watch('infrastructure.type');
  const watchedCloudProviders = form.watch('infrastructure.cloudProviders') ?? [];
  const watchedHostsOwnHardware = form.watch('infrastructure.hostsOwnHardware') ?? false;
  const watchedValues = form.watch();

  useEffect(() => {
    if (!hasHydrated || !organization) {
      return;
    }

    setOrganization(organization.id);

    if (organizationId && organizationId !== organization.id) {
      reset(organization.id);
      form.reset(defaultWizardValues);
      hasLoadedPersistedDraft.current = true;
      return;
    }

    if (!hasLoadedPersistedDraft.current) {
      form.reset(data);
      hasLoadedPersistedDraft.current = true;
    }
  }, [data, form, hasHydrated, organization, organizationId, reset, setOrganization]);

  useEffect(() => {
    const subscription = form.watch((value) => {
      setData(value as WizardData);
    });

    return () => subscription.unsubscribe();
  }, [form, setData]);

  const completion = ((currentStep + 1) / wizardStepTitles.length) * 100;
  const selectedTsc = selectedTscLabels(watchedValues as WizardData);

  const reviewParseResult = useMemo(() => wizardSchema.safeParse(watchedValues), [watchedValues]);
  const reviewSummary = reviewParseResult.success ? reviewParseResult.data : null;
  const reviewErrors = reviewParseResult.success ? [] : reviewParseResult.error.issues.map((issue) => issue.message);

  const assessmentSummary = useMemo(() => computeAssessmentSummary(watchedValues as WizardData), [watchedValues]);
  const stepCompletions = useMemo(() => computeStepCompletions(watchedValues as WizardData), [watchedValues]);

  // Track which security assessment domains are expanded (all expanded by default)
  const [expandedDomains, setExpandedDomains] = React.useState<Record<string, boolean>>({
    documentReview: true,
    logReview: true,
    rulesetReview: true,
    configReview: true,
    networkAnalysis: true,
    fileIntegrity: true,
  });

  function toggleDomain(key: string) {
    setExpandedDomains((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  if (!organization) {
    return null;
  }

  async function goToNextStep() {
    const fieldsToValidate = stepFields[currentStep] ?? [];
    const isValid = fieldsToValidate.length ? await form.trigger(fieldsToValidate) : true;

    if (!isValid) {
      toast.error('Complete the required fields before continuing.');
      return;
    }

    if (currentStep === 8) {
      const validWholeWizard = await form.trigger();
      if (!validWholeWizard) {
        toast.error('The review step found validation issues. Resolve them before generating drafts.');
        return;
      }
    }

    setCurrentStep(Math.min(currentStep + 1, wizardStepTitles.length - 1));
  }

  function goToPreviousStep() {
    setCurrentStep(Math.max(currentStep - 1, 0));
  }

  function jumpToStep(step: number) {
    setCurrentStep(step);
  }

  function generatePolicies() {
    const payload = form.getValues();

    startGenerating(async () => {
      const result = await compileDocsAction(payload);

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      markGenerated();
      toast.success(`Generated ${result.insertedCount} draft policies.`);
      router.push('/generated-docs');
      router.refresh();
    });
  }

  if (!hasHydrated) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading wizard</CardTitle>
          <CardDescription>Restoring your saved draft from local storage.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
      <Card className="h-fit xl:sticky xl:top-6">
        <CardHeader>
          <CardTitle>Policy Wizard</CardTitle>
          <CardDescription>Seven steps, one persisted payload, compiled server-side into tenant-scoped Markdown drafts.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-medium uppercase tracking-[0.24em] text-primary/70">
              <span>Progress</span>
              <span>{Math.round(completion)}%</span>
            </div>
            <Progress value={completion} />
          </div>
          <ol className="space-y-2">
            {wizardStepTitles.map((stepTitle, index) => {
              const sc = stepCompletions[index];
              const statusIcon = sc?.status === 'complete'
                ? <Check className="h-3.5 w-3.5 text-emerald-600" />
                : sc?.status === 'partial'
                  ? <Circle className="h-3.5 w-3.5 text-amber-500" />
                  : <CircleDashed className="h-3.5 w-3.5 text-slate-400" />;

              return (
                <li key={stepTitle}>
                  <button
                    type="button"
                    onClick={() => jumpToStep(index)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition-colors',
                      index === currentStep ? 'bg-primary text-primary-foreground' : 'bg-secondary/50 text-foreground hover:bg-secondary'
                    )}
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/70 text-xs font-semibold text-primary">
                      {index + 1}
                    </span>
                    <span className="flex-1 text-sm font-medium">{stepTitle}</span>
                    <span className={cn(index === currentStep && 'text-primary-foreground')}>{statusIcon}</span>
                  </button>
                </li>
              );
            })}
          </ol>
          <div className="rounded-2xl bg-accent/60 p-4 text-sm text-accent-foreground">
            <p className="font-medium">Active org</p>
            <p className="mt-2 break-all text-xs">{organization.name}</p>
            <p className="break-all text-xs opacity-80">{organization.id}</p>
          </div>
        </CardContent>
      </Card>

      <Form {...form}>
        <form className="space-y-6" onSubmit={(event) => event.preventDefault()}>
          <Card>
            <CardContent className="p-6">
              {currentStep === 0 ? (
                <StepShell
                  title="Welcome & Onboarding"
                  description="Capture the company metadata the template compiler will use across every generated policy."
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="company.name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company name</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="company.website"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Website</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="company.primaryContactName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Primary contact</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="company.primaryContactEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Primary contact email</FormLabel>
                          <FormControl>
                            <Input type="email" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="company.industry"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Industry</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormDescription>Used to tailor policy language and context notes for reviewers.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </StepShell>
              ) : null}

              {currentStep === 1 ? (
                <StepShell
                  title="Governance, People & Training"
                  description="Capture the organizational controls that auditors evaluate for CC1 (Control Environment), CC4 (Monitoring), and CC1.4 (Competence). These questions determine which governance documents and evidence the checklist will generate."
                >
                  <div className="space-y-6">
                    <div className="space-y-3 rounded-2xl bg-secondary/50 p-4">
                      <p className="text-sm font-medium text-foreground">Integrity & ethical values (CC1.1)</p>
                      <FormField control={form.control} name="governance.hasEmployeeHandbook" render={({ field }) => (
                        <FormItem className="flex items-center gap-3">
                          <FormControl><Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(Boolean(checked))} /></FormControl>
                          <FormLabel>The organization maintains an employee handbook.</FormLabel>
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="governance.hasCodeOfConduct" render={({ field }) => (
                        <FormItem className="flex items-center gap-3">
                          <FormControl><Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(Boolean(checked))} /></FormControl>
                          <FormLabel>A code of conduct is published and acknowledged by employees.</FormLabel>
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="governance.acknowledgementCadence" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Policy acknowledgement cadence</FormLabel>
                          <FormControl>
                            <select {...field} className="h-11 w-full rounded-2xl border border-input bg-white px-4 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                              {acknowledgementCadenceOptions.map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
                            </select>
                          </FormControl>
                          <FormDescription>How often employees re-acknowledge the code of conduct and security policies.</FormDescription>
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="governance.hasDisciplinaryProcedures" render={({ field }) => (
                        <FormItem className="flex items-center gap-3">
                          <FormControl><Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(Boolean(checked))} /></FormControl>
                          <FormLabel>Documented disciplinary procedures exist for policy violations.</FormLabel>
                        </FormItem>
                      )} />
                    </div>

                    <AuditorLensCallout criterion="CC1.1" message="Auditors will request the employee handbook, code of conduct, signed acknowledgement forms (both new-hire and periodic renewals), background check evidence, and disciplinary action documentation. The acknowledgement cadence you select here drives the evidence timeline." />

                    <div className="space-y-3 rounded-2xl bg-secondary/50 p-4">
                      <p className="text-sm font-medium text-foreground">Board independence & oversight (CC1.2)</p>
                      <FormField control={form.control} name="governance.hasBoardOrAdvisory" render={({ field }) => (
                        <FormItem className="flex items-center gap-3">
                          <FormControl><Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(Boolean(checked))} /></FormControl>
                          <FormLabel>A board of directors, advisory board, or equivalent oversight body exists.</FormLabel>
                        </FormItem>
                      )} />
                      {form.watch('governance.hasBoardOrAdvisory') && (
                        <FormField control={form.control} name="governance.boardMeetingFrequency" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Board meeting frequency</FormLabel>
                            <FormControl>
                              <select {...field} className="h-11 w-full rounded-2xl border border-input bg-white px-4 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                                {boardMeetingFrequencyOptions.filter((opt) => opt.value !== 'n-a').map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
                              </select>
                            </FormControl>
                            <FormDescription>Risk assessments and control effectiveness are presented to the board at this cadence.</FormDescription>
                          </FormItem>
                        )} />
                      )}
                      <FormField control={form.control} name="governance.hasDedicatedSecurityOfficer" render={({ field }) => (
                        <FormItem className="flex items-center gap-3">
                          <FormControl><Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(Boolean(checked))} /></FormControl>
                          <FormLabel>A designated security officer or CISO owns the information security program.</FormLabel>
                        </FormItem>
                      )} />
                      {form.watch('governance.hasDedicatedSecurityOfficer') && (
                        <FormField control={form.control} name="governance.securityOfficerTitle" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Security officer title</FormLabel>
                            <FormControl><Input {...field} placeholder="e.g., CISO, VP of Security, Head of Security" /></FormControl>
                          </FormItem>
                        )} />
                      )}
                    </div>

                    <div className="space-y-3 rounded-2xl bg-secondary/50 p-4">
                      <p className="text-sm font-medium text-foreground">Organizational structure (CC1.3)</p>
                      <FormField control={form.control} name="governance.hasOrgChart" render={({ field }) => (
                        <FormItem className="flex items-center gap-3">
                          <FormControl><Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(Boolean(checked))} /></FormControl>
                          <FormLabel>A current organizational chart exists.</FormLabel>
                        </FormItem>
                      )} />
                      {form.watch('governance.hasOrgChart') && (
                        <FormField control={form.control} name="governance.orgChartMaintenance" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Org chart maintenance method</FormLabel>
                            <FormControl>
                              <select {...field} className="h-11 w-full rounded-2xl border border-input bg-white px-4 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                                {orgChartMaintenanceOptions.map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
                              </select>
                            </FormControl>
                          </FormItem>
                        )} />
                      )}
                      <FormField control={form.control} name="governance.hasJobDescriptions" render={({ field }) => (
                        <FormItem className="flex items-center gap-3">
                          <FormControl><Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(Boolean(checked))} /></FormControl>
                          <FormLabel>Documented job descriptions with roles and responsibilities exist.</FormLabel>
                        </FormItem>
                      )} />
                    </div>

                    <div className="space-y-3 rounded-2xl bg-secondary/50 p-4">
                      <p className="text-sm font-medium text-foreground">Accountability & monitoring (CC1.5, CC4.1–CC4.2)</p>
                      <FormField control={form.control} name="governance.hasPerformanceReviewsLinkedToControls" render={({ field }) => (
                        <FormItem className="flex items-center gap-3">
                          <FormControl><Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(Boolean(checked))} /></FormControl>
                          <FormLabel>Performance reviews include accountability for internal control responsibilities.</FormLabel>
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="governance.hasInternalAuditProgram" render={({ field }) => (
                        <FormItem className="flex items-center gap-3">
                          <FormControl><Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(Boolean(checked))} /></FormControl>
                          <FormLabel>A formal internal audit or controls monitoring program is in place.</FormLabel>
                        </FormItem>
                      )} />
                      {form.watch('governance.hasInternalAuditProgram') && (
                        <FormField control={form.control} name="governance.internalAuditFrequency" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Internal audit frequency</FormLabel>
                            <FormControl>
                              <select {...field} className="h-11 w-full rounded-2xl border border-input bg-white px-4 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                                {internalAuditFrequencyOptions.filter((opt) => opt.value !== 'n-a').map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
                              </select>
                            </FormControl>
                          </FormItem>
                        )} />
                      )}
                    </div>

                    <div className="space-y-3 rounded-2xl bg-secondary/50 p-4">
                      <p className="text-sm font-medium text-foreground">Security awareness & training (CC1.4)</p>
                      <FormField control={form.control} name="training.securityAwarenessTrainingTool" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Security awareness training tool</FormLabel>
                          <FormControl><Input {...field} placeholder="e.g., KnowBe4, Curricula, Wizer, Manual" /></FormControl>
                          <FormDescription>The platform used to deliver and track security awareness training.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="training.trainingCadence" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Training cadence</FormLabel>
                          <FormControl>
                            <select {...field} className="h-11 w-full rounded-2xl border border-input bg-white px-4 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                              {trainingCadenceOptions.map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
                            </select>
                          </FormControl>
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="training.hasPhishingSimulation" render={({ field }) => (
                        <FormItem className="flex items-center gap-3">
                          <FormControl><Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(Boolean(checked))} /></FormControl>
                          <FormLabel>Simulated phishing campaigns are conducted.</FormLabel>
                        </FormItem>
                      )} />
                      {form.watch('training.hasPhishingSimulation') && (
                        <FormField control={form.control} name="training.phishingSimulationFrequency" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phishing simulation frequency</FormLabel>
                            <FormControl>
                              <select {...field} className="h-11 w-full rounded-2xl border border-input bg-white px-4 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                                {phishingFrequencyOptions.filter((opt) => opt.value !== 'n-a').map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
                              </select>
                            </FormControl>
                          </FormItem>
                        )} />
                      )}
                      <FormField control={form.control} name="training.hasSecurityBulletinSubscription" render={({ field }) => (
                        <FormItem className="flex items-center gap-3">
                          <FormControl><Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(Boolean(checked))} /></FormControl>
                          <FormLabel>The team subscribes to security news bulletins or vendor vulnerability notifications.</FormLabel>
                        </FormItem>
                      )} />
                    </div>

                    <AuditorLensCallout criterion="CC1.4" message="Auditors will sample training completion records for new hires and existing employees, phishing campaign results (including who failed and completed remediation), and evidence of security bulletin subscription and patch response." />
                  </div>
                </StepShell>
              ) : null}

              {currentStep === 2 ? (
                <StepShell
                  title="System Scope"
                  description="Define the product and data boundary that the generated policies should describe."
                >
                  <div className="grid gap-4">
                    <FormField
                      control={form.control}
                      name="scope.systemName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>In-scope system name</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="scope.systemDescription"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>System description</FormLabel>
                          <FormControl>
                            <Textarea {...field} />
                          </FormControl>
                          <FormDescription>Describe what the system does, who uses it, and what data flows through it.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="scope.dataTypesHandled"
                      render={() => (
                        <FormItem>
                          <FormLabel>Data types handled</FormLabel>
                          <div className="grid gap-3 md:grid-cols-2">
                            {dataTypeOptions.map((option) => (
                              <FormField
                                key={option}
                                control={form.control}
                                name="scope.dataTypesHandled"
                                render={({ field }) => (
                                  <FormItem className="flex items-center gap-3 rounded-2xl border border-border bg-white p-3">
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value.includes(option)}
                                        onCheckedChange={(checked) => {
                                          field.onChange(
                                            checked ? [...field.value, option] : field.value.filter((value) => value !== option)
                                          );
                                        }}
                                      />
                                    </FormControl>
                                    <FormLabel className="font-medium">{option}</FormLabel>
                                  </FormItem>
                                )}
                              />
                            ))}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="scope.isMultiTenant"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Deployment model</FormLabel>
                          <RadioGroup value={field.value ? 'multi' : 'single'} onValueChange={(value) => field.onChange(value === 'multi')}>
                            <div className="flex items-center gap-3 rounded-2xl border border-border bg-white p-3">
                              <RadioGroupItem value="multi" id="tenant-multi" />
                              <FormLabel htmlFor="tenant-multi">Multi-tenant SaaS</FormLabel>
                            </div>
                            <div className="flex items-center gap-3 rounded-2xl border border-border bg-white p-3">
                              <RadioGroupItem value="single" id="tenant-single" />
                              <FormLabel htmlFor="tenant-single">Single-tenant or dedicated environment</FormLabel>
                            </div>
                          </RadioGroup>
                        </FormItem>
                      )}
                    />
                    <AuditorLensCallout
                      criterion="CC2.1"
                      message="The system description you provide here becomes the foundation of your SOC 2 report. Auditors will compare every control to this scope. Be specific about what the system does, not how the company operates."
                    />
                  </div>
                </StepShell>
              ) : null}

              {currentStep === 3 ? (
                <StepShell
                  title="Compliance Scope"
                  description="Security (CC1–CC9) is always included. Choose additional Trust Services Criteria based on your contractual commitments and the nature of your data — each one adds specific policies and evidence requirements."
                >
                  <div className="space-y-4">
                    {/* Always-on Security badge */}
                    <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-emerald-500">
                        <Check className="h-3 w-3 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-emerald-800">Security (CC1–CC9) — always included</p>
                        <p className="mt-0.5 text-xs text-emerald-700">
                          Covers logical access controls, change management, risk assessment, incident response, and monitoring. Required for every SOC 2 engagement regardless of scope.
                          Compiles <strong>13 core policy templates</strong> plus the Evidence Checklist and System Description.
                        </p>
                      </div>
                    </div>

                    {/* Optional TSC decision cards */}
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Optional criteria — select all that apply</p>
                    <div className="grid gap-3 md:grid-cols-2">
                      {tscOptions.map((option) => (
                        <FormField
                          key={option.key}
                          control={form.control}
                          name={`tscSelections.${option.key}` as FieldPath<WizardData>}
                          render={({ field }) => {
                            const selected = Boolean(field.value);
                            return (
                              <FormItem
                                className={cn(
                                  'relative rounded-2xl border bg-white p-4 transition-colors',
                                  selected ? 'border-primary/50 bg-primary/5' : 'border-border'
                                )}
                              >
                                <div className="flex items-start gap-3">
                                  <FormControl>
                                    <Checkbox
                                      checked={selected}
                                      onCheckedChange={(checked) => field.onChange(Boolean(checked))}
                                      className="mt-0.5"
                                    />
                                  </FormControl>
                                  <div className="space-y-2">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <FormLabel className="text-sm font-semibold leading-none">{option.label}</FormLabel>
                                      <Badge variant="outline" className="px-1.5 py-0 text-[10px] font-mono">{option.criteriaCode}</Badge>
                                    </div>
                                    <p className="text-xs text-muted-foreground">{option.description}</p>
                                    <div className="space-y-1">
                                      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Include this if:</p>
                                      <ul className="space-y-0.5">
                                        {option.triggers.map((trigger) => (
                                          <li key={trigger} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                                            <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-muted-foreground/50" />
                                            {trigger}
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                    {option.templateAdditions > 0 ? (
                                      <p className={cn('text-[10px] font-medium', selected ? 'text-primary' : 'text-muted-foreground')}>
                                        +{option.templateAdditions} template{option.templateAdditions !== 1 ? 's' : ''}: {option.templateNames.join(', ')}
                                      </p>
                                    ) : (
                                      <p className="text-[10px] text-muted-foreground">{option.templateNames[0]}</p>
                                    )}
                                  </div>
                                </div>
                              </FormItem>
                            );
                          }}
                        />
                      ))}
                    </div>

                    <div className="rounded-2xl bg-secondary/60 p-3 text-sm">
                      <span className="font-medium text-foreground">Selected scope: </span>
                      <span className="text-muted-foreground">{selectedTsc.join(' · ')}</span>
                    </div>
                  </div>
                </StepShell>
              ) : null}

              {currentStep === 4 ? (
                <StepShell
                  title="Infrastructure Profiling"
                  description="Select the primary hosting model and answer provider-specific questions. This is the branching step that drives infrastructure language in the compiled Markdown."
                >
                  <div className="space-y-6">
                    {/* Multi-cloud provider selection */}
                    <FormField
                      control={form.control}
                      name="infrastructure.cloudProviders"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cloud providers (select all that apply)</FormLabel>
                          <div className="grid gap-3 md:grid-cols-3">
                            {(['aws', 'azure', 'gcp'] as const).map((provider) => {
                              const labels = { aws: 'AWS', azure: 'Azure', gcp: 'GCP' } as const;
                              const checked = (field.value ?? []).includes(provider);
                              return (
                                <div key={provider} className="flex items-center gap-3 rounded-2xl border border-border bg-white p-4">
                                  <Checkbox
                                    id={`cloud-${provider}`}
                                    checked={checked}
                                    onCheckedChange={(isChecked) => {
                                      const current = field.value ?? [];
                                      field.onChange(
                                        isChecked ? [...current, provider] : current.filter((p: string) => p !== provider)
                                      );
                                    }}
                                  />
                                  <FormLabel htmlFor={`cloud-${provider}`}>{labels[provider]}</FormLabel>
                                </div>
                              );
                            })}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Hosts own hardware */}
                    <FormField
                      control={form.control}
                      name="infrastructure.hostsOwnHardware"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-3 rounded-2xl border border-border bg-white p-4">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(Boolean(checked))} />
                          </FormControl>
                          <div>
                            <FormLabel>We host our own hardware (on-premises / colocation)</FormLabel>
                            <FormDescription>Enables physical security controls and hybrid architecture language.</FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />

                    <AuditorLensCallout
                      criterion="CC6.1–CC6.8"
                      message="Each cloud provider you select adds specific evidence expectations. AWS means IAM policy exports, Azure means Entra ID configs, GCP means IAM bindings. Multi-cloud multiplies your evidence surface — select only the providers that host in-scope workloads."
                    />

                    {/* Keep legacy type field in sync — hidden */}
                    <FormField
                      control={form.control}
                      name="infrastructure.type"
                      render={() => <input type="hidden" />}
                    />

                    <FormField
                      control={form.control}
                      name="infrastructure.idpProvider"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Identity provider</FormLabel>
                          <FormControl>
                            <select
                              {...field}
                              className="h-11 w-full rounded-2xl border border-input bg-white px-4 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              {idpProviderOptions.map((provider) => (
                                <option key={provider} value={provider}>
                                  {provider}
                                </option>
                              ))}
                            </select>
                          </FormControl>
                          <FormDescription>This drives the access-control and evidence checklist prompts for workforce identity.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {watchedCloudProviders.includes('aws') && (
                      <div className="space-y-3 rounded-2xl bg-secondary/50 p-4">
                        <p className="text-sm font-medium text-foreground">AWS-specific controls</p>
                        <FormField
                          control={form.control}
                          name="infrastructure.usesAwsIam"
                          render={({ field }) => (
                            <FormItem className="flex items-center gap-3">
                              <FormControl>
                                <Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(Boolean(checked))} />
                              </FormControl>
                              <FormLabel>Workforce and privileged access are managed through AWS IAM or federation.</FormLabel>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="infrastructure.usesMacie"
                          render={({ field }) => (
                            <FormItem className="flex items-center gap-3">
                              <FormControl>
                                <Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(Boolean(checked))} />
                              </FormControl>
                              <FormLabel>Amazon Macie or an equivalent data discovery control is in use.</FormLabel>
                            </FormItem>
                          )}
                        />
                      </div>
                    )}

                    {watchedCloudProviders.includes('azure') && (
                      <div className="space-y-3 rounded-2xl bg-secondary/50 p-4">
                        <p className="text-sm font-medium text-foreground">Azure-specific controls</p>
                        <FormField
                          control={form.control}
                          name="infrastructure.usesAzureEntraId"
                          render={({ field }) => (
                            <FormItem className="flex items-center gap-3">
                              <FormControl>
                                <Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(Boolean(checked))} />
                              </FormControl>
                              <FormLabel>Microsoft Entra ID is the authoritative workforce identity provider.</FormLabel>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="infrastructure.usesAzureKeyVault"
                          render={({ field }) => (
                            <FormItem className="flex items-center gap-3">
                              <FormControl>
                                <Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(Boolean(checked))} />
                              </FormControl>
                              <FormLabel>Secrets and key material are stored in Azure Key Vault.</FormLabel>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="infrastructure.usesAzurePurviewDlp"
                          render={({ field }) => (
                            <FormItem className="flex items-center gap-3">
                              <FormControl>
                                <Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(Boolean(checked))} />
                              </FormControl>
                              <FormLabel>Purview DLP or an equivalent Azure-native data governance control is enabled.</FormLabel>
                            </FormItem>
                          )}
                        />
                      </div>
                    )}

                    {watchedCloudProviders.includes('gcp') && (
                      <div className="space-y-3 rounded-2xl bg-secondary/50 p-4">
                        <p className="text-sm font-medium text-foreground">GCP-specific controls</p>
                        <FormField
                          control={form.control}
                          name="infrastructure.usesGcpIam"
                          render={({ field }) => (
                            <FormItem className="flex items-center gap-3">
                              <FormControl>
                                <Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(Boolean(checked))} />
                              </FormControl>
                              <FormLabel>Google Cloud IAM is used to enforce least privilege across projects.</FormLabel>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="infrastructure.usesSecurityCommandCenter"
                          render={({ field }) => (
                            <FormItem className="flex items-center gap-3">
                              <FormControl>
                                <Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(Boolean(checked))} />
                              </FormControl>
                              <FormLabel>Security Command Center or an equivalent posture-management control is enabled.</FormLabel>
                            </FormItem>
                          )}
                        />
                      </div>
                    )}

                    {watchedHostsOwnHardware && (
                      <div className="space-y-3 rounded-2xl bg-secondary/50 p-4">
                        <p className="text-sm font-medium text-foreground">Hybrid and self-hosted controls</p>
                        <FormField
                          control={form.control}
                          name="infrastructure.hasPhysicalServerRoom"
                          render={({ field }) => (
                            <FormItem className="flex items-center gap-3">
                              <FormControl>
                                <Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(Boolean(checked))} />
                              </FormControl>
                              <FormLabel>A controlled server room, cage, or colocation area is part of the in-scope environment.</FormLabel>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="infrastructure.hasHardwareFailover"
                          render={({ field }) => (
                            <FormItem className="flex items-center gap-3">
                              <FormControl>
                                <Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(Boolean(checked))} />
                              </FormControl>
                              <FormLabel>Documented physical hardware failover or spare capacity exists for critical workloads.</FormLabel>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="infrastructure.usesCloudVpn"
                          render={({ field }) => (
                            <FormItem className="flex items-center gap-3">
                              <FormControl>
                                <Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(Boolean(checked))} />
                              </FormControl>
                              <FormLabel>Cloud VPN or private network access logs are required for administrative connectivity.</FormLabel>
                            </FormItem>
                          )}
                        />
                      </div>
                    )}

                    {watchedHostsOwnHardware && watchedCloudProviders.length === 0 && (
                      <div className="space-y-3 rounded-2xl bg-secondary/50 p-4">
                        <p className="text-sm font-medium text-foreground">Physical hosting controls</p>
                        <FormField
                          control={form.control}
                          name="infrastructure.requiresBiometricRackAccess"
                          render={({ field }) => (
                            <FormItem className="flex items-center gap-3">
                              <FormControl>
                                <Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(Boolean(checked))} />
                              </FormControl>
                              <FormLabel>Biometric or equivalent strong access controls protect server racks or cages.</FormLabel>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="infrastructure.tracksMediaDestruction"
                          render={({ field }) => (
                            <FormItem className="flex items-center gap-3">
                              <FormControl>
                                <Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(Boolean(checked))} />
                              </FormControl>
                              <FormLabel>Physical media sanitization and destruction logs are retained.</FormLabel>
                            </FormItem>
                          )}
                        />
                      </div>
                    )}

                    {watchedCloudProviders.length > 0 && (
                      <div className="space-y-3 rounded-2xl bg-secondary/50 p-4">
                        <p className="text-sm font-medium text-foreground">Cloud resilience and logging</p>
                        <FormField
                          control={form.control}
                          name="infrastructure.usesAvailabilityZones"
                          render={({ field }) => (
                            <FormItem className="flex items-center gap-3">
                              <FormControl>
                                <Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(Boolean(checked))} />
                              </FormControl>
                              <FormLabel>Critical workloads span availability zones, regions, or equivalent cloud fault domains.</FormLabel>
                            </FormItem>
                          )}
                        />
                      </div>
                    )}
                  </div>
                </StepShell>
              ) : null}

              {currentStep === 5 ? (
                <StepShell
                  title="Security Assessment"
                  description="Evaluate your organization's readiness across six technical security review domains. These map directly to the evidence an assessor will request during a SOC 2 audit. Each domain is contextualized to your selected cloud provider(s)."
                >
                  <div className="space-y-6">
                    {/* ── Overall Progress ── */}
                    <Card>
                      <CardContent className="p-4">
                        <div className="mb-3 flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-foreground">Security Readiness</p>
                            <p className="text-xs text-muted-foreground">
                              {assessmentSummary.completedDomains}/{assessmentSummary.totalDomains} domains started · {assessmentSummary.overallAnswered}/{assessmentSummary.overallTotal} controls addressed
                            </p>
                          </div>
                          <span className={cn(
                            'text-2xl font-bold',
                            assessmentSummary.overallScore >= 80 ? 'text-emerald-600' : assessmentSummary.overallScore >= 50 ? 'text-amber-500' : 'text-red-500'
                          )}>
                            {assessmentSummary.overallScore}%
                          </span>
                        </div>
                        <Progress value={assessmentSummary.overallScore} />
                        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                          {assessmentSummary.domains.map((d) => (
                            <button
                              key={d.key}
                              type="button"
                              onClick={() => {
                                setExpandedDomains((prev) => ({ ...prev, [d.key]: true }));
                                document.getElementById(`domain-${d.key}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                              }}
                              className="flex items-center gap-2 rounded-xl border border-border bg-white p-2 text-left transition-colors hover:bg-secondary/40"
                            >
                              <span className={cn(
                                'flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold text-white',
                                d.score >= 80 ? 'bg-emerald-500' : d.score >= 50 ? 'bg-amber-500' : d.readiness === 'not-started' ? 'bg-slate-300' : 'bg-red-500'
                              )}>
                                {d.score}
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-xs font-medium">{d.label}</p>
                                <p className="text-[10px] text-muted-foreground">{d.answered}/{d.total} · {d.readiness === 'not-started' ? 'Not started' : d.readiness === 'in-progress' ? 'In progress' : 'Established'}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                        <p className="mt-3 text-xs text-muted-foreground">
                          You can skip any domain and come back later — your progress is saved automatically. Incomplete domains will be flagged on the Review step.
                        </p>
                      </CardContent>
                    </Card>

                    {/* ── Document Review ── */}
                    <div id="domain-documentReview" className="rounded-2xl bg-secondary/50">
                      <button type="button" onClick={() => toggleDomain('documentReview')} className="flex w-full items-center justify-between p-4 text-left">
                        <div className="flex items-center gap-3">
                          <span className={cn(
                            'flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white',
                            assessmentSummary.domains[0].score >= 80 ? 'bg-emerald-500' : assessmentSummary.domains[0].score >= 50 ? 'bg-amber-500' : assessmentSummary.domains[0].readiness === 'not-started' ? 'bg-slate-300' : 'bg-red-500'
                          )}>
                            {assessmentSummary.domains[0].answered}/{assessmentSummary.domains[0].total}
                          </span>
                          <p className="text-sm font-medium text-foreground">Document Review (CC2.1, CC5.2)</p>
                        </div>
                        {expandedDomains.documentReview ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                      </button>
                      {expandedDomains.documentReview && (
                      <div className="space-y-3 px-4 pb-4">
                      <p className="text-xs text-muted-foreground">
                        Assessors verify that security documentation — policies, procedures, network diagrams, and asset inventories — is accurate, complete, and current.
                        {watchedCloudProviders.includes('aws') ? ' For AWS, this includes VPC diagrams, IAM policy documents, and CloudFormation/Terraform templates.' : ''}
                        {watchedCloudProviders.includes('azure') ? ' For Azure, this includes VNET topology exports, ARM templates, and Entra ID configuration docs.' : ''}
                        {watchedCloudProviders.includes('gcp') ? ' For GCP, this includes VPC network diagrams, IAM bindings, and Deployment Manager configs.' : ''}
                      </p>
                      <FormField control={form.control} name="securityAssessment.documentReview.readiness" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Readiness level</FormLabel>
                          <FormControl>
                            <select {...field} className="h-11 w-full rounded-2xl border border-input bg-white px-4 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                              {securityAssessmentReadinessOptions.map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
                            </select>
                          </FormControl>
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="securityAssessment.documentReview.hasSecurityPolicyInventory" render={({ field }) => (
                        <FormItem className="flex items-center gap-3">
                          <FormControl><Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(Boolean(checked))} /></FormControl>
                          <FormLabel>A centralized inventory of all security policies exists.</FormLabel>
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="securityAssessment.documentReview.hasNetworkDiagrams" render={({ field }) => (
                        <FormItem className="flex items-center gap-3">
                          <FormControl><Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(Boolean(checked))} /></FormControl>
                          <FormLabel>Up-to-date network architecture diagrams are maintained.</FormLabel>
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="securityAssessment.documentReview.hasDataFlowDiagrams" render={({ field }) => (
                        <FormItem className="flex items-center gap-3">
                          <FormControl><Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(Boolean(checked))} /></FormControl>
                          <FormLabel>Data flow diagrams show how customer data traverses systems.</FormLabel>
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="securityAssessment.documentReview.hasAssetInventory" render={({ field }) => (
                        <FormItem className="flex items-center gap-3">
                          <FormControl><Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(Boolean(checked))} /></FormControl>
                          <FormLabel>A hardware and software asset inventory is maintained.</FormLabel>
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="securityAssessment.documentReview.hasChangeManagementDocs" render={({ field }) => (
                        <FormItem className="flex items-center gap-3">
                          <FormControl><Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(Boolean(checked))} /></FormControl>
                          <FormLabel>Change management procedures are documented and followed.</FormLabel>
                        </FormItem>
                      )} />
                      <AuditorLensCallout criterion="CC2.1" message="Auditors will request the full policy inventory, current network diagrams, data flow diagrams, and asset lists. Missing or outdated documentation is one of the most common audit findings." />
                    </div>
                      )}
                    </div>

                    {/* ── Log Review ── */}
                    <div className="space-y-3 rounded-2xl bg-secondary/50 p-4">
                      <p className="text-sm font-medium text-foreground">Log Review (CC7.2, CC7.3)</p>
                      <p className="text-xs text-muted-foreground">
                        Assessors examine system and application logs for signs of unauthorized access, inadequate controls, and proper retention.
                        {watchedCloudProviders.includes('aws') ? ' For AWS, this includes CloudTrail, VPC Flow Logs, GuardDuty findings, and CloudWatch log groups.' : ''}
                        {watchedCloudProviders.includes('azure') ? ' For Azure, this includes Activity Logs, NSG Flow Logs, Sentinel alerts, and Log Analytics workspaces.' : ''}
                        {watchedCloudProviders.includes('gcp') ? ' For GCP, this includes Cloud Audit Logs, VPC Flow Logs, and Security Command Center findings.' : ''}
                      </p>
                      <FormField control={form.control} name="securityAssessment.logReview.readiness" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Readiness level</FormLabel>
                          <FormControl>
                            <select {...field} className="h-11 w-full rounded-2xl border border-input bg-white px-4 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                              {securityAssessmentReadinessOptions.map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
                            </select>
                          </FormControl>
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="securityAssessment.logReview.hasCentralizedLogging" render={({ field }) => (
                        <FormItem className="flex items-center gap-3">
                          <FormControl><Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(Boolean(checked))} /></FormControl>
                          <FormLabel>Logs are aggregated into a centralized platform.</FormLabel>
                        </FormItem>
                      )} />
                      {form.watch('securityAssessment.logReview.hasCentralizedLogging') && (
                        <FormField control={form.control} name="securityAssessment.logReview.centralizedLoggingTool" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Centralized logging tool</FormLabel>
                            <FormControl><Input {...field} placeholder="e.g. Datadog, Splunk, ELK, CloudWatch" /></FormControl>
                          </FormItem>
                        )} />
                      )}
                      <FormField control={form.control} name="securityAssessment.logReview.logsCoverAuthentication" render={({ field }) => (
                        <FormItem className="flex items-center gap-3">
                          <FormControl><Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(Boolean(checked))} /></FormControl>
                          <FormLabel>Authentication events (login, logout, MFA) are logged.</FormLabel>
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="securityAssessment.logReview.logsCoverNetworkActivity" render={({ field }) => (
                        <FormItem className="flex items-center gap-3">
                          <FormControl><Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(Boolean(checked))} /></FormControl>
                          <FormLabel>Network activity (firewall, flow logs) is logged.</FormLabel>
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="securityAssessment.logReview.logsCoverSystemChanges" render={({ field }) => (
                        <FormItem className="flex items-center gap-3">
                          <FormControl><Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(Boolean(checked))} /></FormControl>
                          <FormLabel>System configuration changes are logged (audit trails).</FormLabel>
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="securityAssessment.logReview.hasLogRetentionPolicy" render={({ field }) => (
                        <FormItem className="flex items-center gap-3">
                          <FormControl><Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(Boolean(checked))} /></FormControl>
                          <FormLabel>A formal log retention policy is defined and enforced.</FormLabel>
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="securityAssessment.logReview.hasAutomatedLogAnalysis" render={({ field }) => (
                        <FormItem className="flex items-center gap-3">
                          <FormControl><Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(Boolean(checked))} /></FormControl>
                          <FormLabel>Automated log analysis or correlation rules are in place (SIEM alerts).</FormLabel>
                        </FormItem>
                      )} />
                    </div>

                    {/* ── Ruleset Review ── */}
                    <div className="space-y-3 rounded-2xl bg-secondary/50 p-4">
                      <p className="text-sm font-medium text-foreground">Ruleset Review (CC6.1, CC6.6)</p>
                      <p className="text-xs text-muted-foreground">
                        Assessors analyze firewall rules, network ACLs, and security group configurations for overly permissive access.
                        {watchedCloudProviders.includes('aws') ? ' For AWS, this includes Security Groups, NACLs, WAF rules, and AWS Network Firewall policies.' : ''}
                        {watchedCloudProviders.includes('azure') ? ' For Azure, this includes NSGs, Azure Firewall rules, and Application Gateway WAF policies.' : ''}
                        {watchedCloudProviders.includes('gcp') ? ' For GCP, this includes VPC firewall rules, Cloud Armor policies, and hierarchical firewall policies.' : ''}
                      </p>
                      <FormField control={form.control} name="securityAssessment.rulesetReview.readiness" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Readiness level</FormLabel>
                          <FormControl>
                            <select {...field} className="h-11 w-full rounded-2xl border border-input bg-white px-4 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                              {securityAssessmentReadinessOptions.map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
                            </select>
                          </FormControl>
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="securityAssessment.rulesetReview.hasFirewallRulesets" render={({ field }) => (
                        <FormItem className="flex items-center gap-3">
                          <FormControl><Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(Boolean(checked))} /></FormControl>
                          <FormLabel>Firewall or cloud-native firewall rulesets are documented.</FormLabel>
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="securityAssessment.rulesetReview.hasSecurityGroupRules" render={({ field }) => (
                        <FormItem className="flex items-center gap-3">
                          <FormControl><Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(Boolean(checked))} /></FormControl>
                          <FormLabel>Security group / NSG rules follow least-privilege principles.</FormLabel>
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="securityAssessment.rulesetReview.hasNaclRules" render={({ field }) => (
                        <FormItem className="flex items-center gap-3">
                          <FormControl><Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(Boolean(checked))} /></FormControl>
                          <FormLabel>Network ACL rules are reviewed and documented.</FormLabel>
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="securityAssessment.rulesetReview.reviewsRulesetsRegularly" render={({ field }) => (
                        <FormItem className="flex items-center gap-3">
                          <FormControl><Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(Boolean(checked))} /></FormControl>
                          <FormLabel>Rulesets are reviewed on a regular cadence.</FormLabel>
                        </FormItem>
                      )} />
                      {form.watch('securityAssessment.rulesetReview.reviewsRulesetsRegularly') && (
                        <FormField control={form.control} name="securityAssessment.rulesetReview.rulesetReviewCadence" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Review cadence</FormLabel>
                            <FormControl><Input {...field} placeholder="e.g. Quarterly, Semi-annual" /></FormControl>
                          </FormItem>
                        )} />
                      )}
                      <FormField control={form.control} name="securityAssessment.rulesetReview.hasDefaultDenyPolicy" render={({ field }) => (
                        <FormItem className="flex items-center gap-3">
                          <FormControl><Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(Boolean(checked))} /></FormControl>
                          <FormLabel>A default-deny (implicit deny) policy is enforced at the network boundary.</FormLabel>
                        </FormItem>
                      )} />
                    </div>

                    {/* ── System Configuration Review ── */}
                    <div className="space-y-3 rounded-2xl bg-secondary/50 p-4">
                      <p className="text-sm font-medium text-foreground">System Configuration Review (CC6.1, CC6.7, CC6.8)</p>
                      <p className="text-xs text-muted-foreground">
                        Assessors verify that systems are configured according to security baselines and hardened against known vulnerabilities.
                        {watchedCloudProviders.includes('aws') ? ' For AWS, this includes AWS Config rules, SSM patch compliance, AMI hardening, and Security Hub benchmarks (CIS/AWS Foundational).' : ''}
                        {watchedCloudProviders.includes('azure') ? ' For Azure, this includes Azure Policy, Defender for Cloud secure score, and CIS benchmarks for Azure.' : ''}
                        {watchedCloudProviders.includes('gcp') ? ' For GCP, this includes Security Health Analytics, OS patch management, and CIS benchmarks for GCP.' : ''}
                      </p>
                      <FormField control={form.control} name="securityAssessment.configReview.readiness" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Readiness level</FormLabel>
                          <FormControl>
                            <select {...field} className="h-11 w-full rounded-2xl border border-input bg-white px-4 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                              {securityAssessmentReadinessOptions.map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
                            </select>
                          </FormControl>
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="securityAssessment.configReview.hasHardeningBaselines" render={({ field }) => (
                        <FormItem className="flex items-center gap-3">
                          <FormControl><Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(Boolean(checked))} /></FormControl>
                          <FormLabel>Security hardening baselines (CIS, DISA STIG, vendor guides) are defined.</FormLabel>
                        </FormItem>
                      )} />
                      {form.watch('securityAssessment.configReview.hasHardeningBaselines') && (
                        <FormField control={form.control} name="securityAssessment.configReview.hardeningFramework" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Hardening framework</FormLabel>
                            <FormControl><Input {...field} placeholder="e.g. CIS Benchmark Level 1, DISA STIG" /></FormControl>
                          </FormItem>
                        )} />
                      )}
                      <FormField control={form.control} name="securityAssessment.configReview.hasAutomatedConfigScanning" render={({ field }) => (
                        <FormItem className="flex items-center gap-3">
                          <FormControl><Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(Boolean(checked))} /></FormControl>
                          <FormLabel>Automated configuration compliance scanning is in place.</FormLabel>
                        </FormItem>
                      )} />
                      {form.watch('securityAssessment.configReview.hasAutomatedConfigScanning') && (
                        <FormField control={form.control} name="securityAssessment.configReview.configScanningTool" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Configuration scanning tool</FormLabel>
                            <FormControl><Input {...field} placeholder="e.g. AWS Config, Chef InSpec, Prisma Cloud" /></FormControl>
                          </FormItem>
                        )} />
                      )}
                      <FormField control={form.control} name="securityAssessment.configReview.hasPatchManagementProcess" render={({ field }) => (
                        <FormItem className="flex items-center gap-3">
                          <FormControl><Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(Boolean(checked))} /></FormControl>
                          <FormLabel>A patch management process with defined SLAs exists.</FormLabel>
                        </FormItem>
                      )} />
                      {form.watch('securityAssessment.configReview.hasPatchManagementProcess') && (
                        <FormField control={form.control} name="securityAssessment.configReview.patchSlaBusinessDays" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Critical patch SLA (business days)</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
                            </FormControl>
                            <FormDescription>Maximum business days to apply critical security patches.</FormDescription>
                          </FormItem>
                        )} />
                      )}
                      <FormField control={form.control} name="securityAssessment.configReview.hasImageBuildPipeline" render={({ field }) => (
                        <FormItem className="flex items-center gap-3">
                          <FormControl><Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(Boolean(checked))} /></FormControl>
                          <FormLabel>Server/container images are built from hardened base images via a pipeline.</FormLabel>
                        </FormItem>
                      )} />
                    </div>

                    <AuditorLensCallout criterion="CC6.1" message="Auditors will sample firewall rules, review system configurations against baselines, and verify patch compliance. They often use automated tools to compare your actual configuration against your documented standards." />

                    {/* ── Network Traffic Analysis ── */}
                    <div className="space-y-3 rounded-2xl bg-secondary/50 p-4">
                      <p className="text-sm font-medium text-foreground">Network Traffic Analysis (CC6.1, CC6.6)</p>
                      <p className="text-xs text-muted-foreground">
                        Assessors verify encryption in transit, network segmentation, and the ability to detect anomalous traffic.
                        {watchedCloudProviders.includes('aws') ? ' For AWS, this includes VPC Flow Logs, Transit Gateway attachments, PrivateLink endpoints, and ACM certificate management.' : ''}
                        {watchedCloudProviders.includes('azure') ? ' For Azure, this includes NSG Flow Logs, VNet peering, Private Endpoints, and Azure Key Vault certificate management.' : ''}
                        {watchedCloudProviders.includes('gcp') ? ' For GCP, this includes VPC Flow Logs, Shared VPC, Private Service Connect, and Google-managed SSL certificates.' : ''}
                      </p>
                      <FormField control={form.control} name="securityAssessment.networkAnalysis.readiness" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Readiness level</FormLabel>
                          <FormControl>
                            <select {...field} className="h-11 w-full rounded-2xl border border-input bg-white px-4 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                              {securityAssessmentReadinessOptions.map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
                            </select>
                          </FormControl>
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="securityAssessment.networkAnalysis.hasNetworkSegmentation" render={({ field }) => (
                        <FormItem className="flex items-center gap-3">
                          <FormControl><Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(Boolean(checked))} /></FormControl>
                          <FormLabel>Network segmentation separates production, staging, and corporate environments.</FormLabel>
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="securityAssessment.networkAnalysis.hasEncryptionInTransit" render={({ field }) => (
                        <FormItem className="flex items-center gap-3">
                          <FormControl><Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(Boolean(checked))} /></FormControl>
                          <FormLabel>All data in transit is encrypted (TLS 1.2+).</FormLabel>
                        </FormItem>
                      )} />
                      {form.watch('securityAssessment.networkAnalysis.hasEncryptionInTransit') && (
                        <FormField control={form.control} name="securityAssessment.networkAnalysis.encryptionProtocol" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Minimum encryption protocol</FormLabel>
                            <FormControl><Input {...field} placeholder="e.g. TLS 1.2, TLS 1.3" /></FormControl>
                          </FormItem>
                        )} />
                      )}
                      <FormField control={form.control} name="securityAssessment.networkAnalysis.hasNetworkMonitoring" render={({ field }) => (
                        <FormItem className="flex items-center gap-3">
                          <FormControl><Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(Boolean(checked))} /></FormControl>
                          <FormLabel>Network traffic monitoring or anomaly detection is deployed.</FormLabel>
                        </FormItem>
                      )} />
                      {form.watch('securityAssessment.networkAnalysis.hasNetworkMonitoring') && (
                        <FormField control={form.control} name="securityAssessment.networkAnalysis.networkMonitoringTool" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Network monitoring tool</FormLabel>
                            <FormControl><Input {...field} placeholder="e.g. GuardDuty, Zeek, Darktrace" /></FormControl>
                          </FormItem>
                        )} />
                      )}
                      <FormField control={form.control} name="securityAssessment.networkAnalysis.hasDnsFiltering" render={({ field }) => (
                        <FormItem className="flex items-center gap-3">
                          <FormControl><Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(Boolean(checked))} /></FormControl>
                          <FormLabel>DNS filtering or sinkholing is configured to block malicious domains.</FormLabel>
                        </FormItem>
                      )} />
                    </div>

                    {/* ── File Integrity Checking ── */}
                    <div className="space-y-3 rounded-2xl bg-secondary/50 p-4">
                      <p className="text-sm font-medium text-foreground">File Integrity Checking (CC6.1, CC7.1)</p>
                      <p className="text-xs text-muted-foreground">
                        Assessors verify that critical files — system binaries, configuration files, and application artifacts — are monitored for unauthorized changes using hash verification.
                        {watchedCloudProviders.includes('aws') ? ' For AWS, this includes AWS Config file tracking, SSM Inventory, and artifact signing with AWS Signer.' : ''}
                        {watchedCloudProviders.includes('azure') ? ' For Azure, this includes Defender for Server FIM, Azure Policy guest configuration, and Azure Artifacts signing.' : ''}
                        {watchedCloudProviders.includes('gcp') ? ' For GCP, this includes Security Health Analytics, Binary Authorization for containers, and artifact signing.' : ''}
                      </p>
                      <FormField control={form.control} name="securityAssessment.fileIntegrity.readiness" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Readiness level</FormLabel>
                          <FormControl>
                            <select {...field} className="h-11 w-full rounded-2xl border border-input bg-white px-4 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                              {securityAssessmentReadinessOptions.map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
                            </select>
                          </FormControl>
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="securityAssessment.fileIntegrity.hasFileIntegrityMonitoring" render={({ field }) => (
                        <FormItem className="flex items-center gap-3">
                          <FormControl><Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(Boolean(checked))} /></FormControl>
                          <FormLabel>File integrity monitoring (FIM) is deployed on production systems.</FormLabel>
                        </FormItem>
                      )} />
                      {form.watch('securityAssessment.fileIntegrity.hasFileIntegrityMonitoring') && (
                        <FormField control={form.control} name="securityAssessment.fileIntegrity.fimTool" render={({ field }) => (
                          <FormItem>
                            <FormLabel>FIM tool</FormLabel>
                            <FormControl><Input {...field} placeholder="e.g. OSSEC, Tripwire, Wazuh, CrowdStrike" /></FormControl>
                          </FormItem>
                        )} />
                      )}
                      <FormField control={form.control} name="securityAssessment.fileIntegrity.monitorsCriticalSystemFiles" render={({ field }) => (
                        <FormItem className="flex items-center gap-3">
                          <FormControl><Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(Boolean(checked))} /></FormControl>
                          <FormLabel>Critical system files (OS binaries, kernel modules) are monitored.</FormLabel>
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="securityAssessment.fileIntegrity.monitorsConfigurationFiles" render={({ field }) => (
                        <FormItem className="flex items-center gap-3">
                          <FormControl><Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(Boolean(checked))} /></FormControl>
                          <FormLabel>Configuration files (e.g. /etc/*, cloud provider configs) are monitored.</FormLabel>
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="securityAssessment.fileIntegrity.monitorsApplicationBinaries" render={({ field }) => (
                        <FormItem className="flex items-center gap-3">
                          <FormControl><Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(Boolean(checked))} /></FormControl>
                          <FormLabel>Application binaries and container images are integrity-checked.</FormLabel>
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="securityAssessment.fileIntegrity.hasArtifactSigningOrHashing" render={({ field }) => (
                        <FormItem className="flex items-center gap-3">
                          <FormControl><Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(Boolean(checked))} /></FormControl>
                          <FormLabel>Deployment artifacts are signed or hash-verified before production use.</FormLabel>
                        </FormItem>
                      )} />
                    </div>

                    <AuditorLensCallout criterion="CC7.1" message="Assessors will verify that your FIM coverage matches your asset inventory, that alerts are acted upon, and that file integrity baselines are refreshed after authorized changes. They also verify artifact provenance for CI/CD pipelines." />
                  </div>
                </StepShell>
              ) : null}

              {currentStep === 6 ? (
                <StepShell
                  title="Security Tooling"
                  description="Identify the security and monitoring tools in your environment. This drives evidence checklist items for CC6.6 (external threats), CC6.8 (malware prevention), CC7.1 (vulnerability management), and A1.1 (capacity monitoring)."
                >
                  <div className="space-y-6">
                    <div className="space-y-3 rounded-2xl bg-secondary/50 p-4">
                      <p className="text-sm font-medium text-foreground">Security monitoring (CC6.6, CC7.2)</p>
                      <FormField control={form.control} name="securityTooling.siemTool" render={({ field }) => (
                        <FormItem>
                          <FormLabel>SIEM or security monitoring platform</FormLabel>
                          <FormControl><Input {...field} placeholder="e.g., Datadog Security, Splunk, Elastic SIEM, AWS Security Hub" /></FormControl>
                          <FormDescription>Leave blank if no centralized security monitoring is in place.</FormDescription>
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="securityTooling.hasIdsIps" render={({ field }) => (
                        <FormItem className="flex items-center gap-3">
                          <FormControl><Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(Boolean(checked))} /></FormControl>
                          <FormLabel>Intrusion detection / intrusion prevention system (IDS/IPS) is deployed.</FormLabel>
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="securityTooling.hasWaf" render={({ field }) => (
                        <FormItem className="flex items-center gap-3">
                          <FormControl><Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(Boolean(checked))} /></FormControl>
                          <FormLabel>A web application firewall (WAF) protects public-facing applications.</FormLabel>
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="securityTooling.logRetentionDays" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Log retention period (days)</FormLabel>
                          <FormControl><Input type="number" min={30} max={730} value={field.value} onChange={(e) => field.onChange(Number(e.target.value))} /></FormControl>
                          <FormDescription>How long security and audit logs are retained.</FormDescription>
                        </FormItem>
                      )} />
                    </div>

                    <div className="space-y-3 rounded-2xl bg-secondary/50 p-4">
                      <p className="text-sm font-medium text-foreground">Endpoint & device protection (CC6.8)</p>
                      <FormField control={form.control} name="securityTooling.endpointProtectionTool" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Endpoint protection / antivirus</FormLabel>
                          <FormControl><Input {...field} placeholder="e.g., CrowdStrike, SentinelOne, Microsoft Defender" /></FormControl>
                          <FormDescription>Leave blank if no endpoint protection is deployed.</FormDescription>
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="securityTooling.hasMdm" render={({ field }) => (
                        <FormItem className="flex items-center gap-3">
                          <FormControl><Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(Boolean(checked))} /></FormControl>
                          <FormLabel>Mobile device management (MDM) is enforced on company devices.</FormLabel>
                        </FormItem>
                      )} />
                      {form.watch('securityTooling.hasMdm') && (
                        <FormField control={form.control} name="securityTooling.mdmTool" render={({ field }) => (
                          <FormItem>
                            <FormLabel>MDM tool</FormLabel>
                            <FormControl><Input {...field} placeholder="e.g., Jamf, Kandji, Intune" /></FormControl>
                          </FormItem>
                        )} />
                      )}
                    </div>

                    <div className="space-y-3 rounded-2xl bg-secondary/50 p-4">
                      <p className="text-sm font-medium text-foreground">Vulnerability management (CC7.1)</p>
                      <FormField control={form.control} name="securityTooling.vulnerabilityScanningTool" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Vulnerability scanning tool</FormLabel>
                          <FormControl><Input {...field} placeholder="e.g., Qualys, Nessus, AWS Inspector, Snyk" /></FormControl>
                          <FormDescription>Leave blank if no vulnerability scanning is in place.</FormDescription>
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="securityTooling.hasDast" render={({ field }) => (
                        <FormItem className="flex items-center gap-3">
                          <FormControl><Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(Boolean(checked))} /></FormControl>
                          <FormLabel>Dynamic application security testing (DAST) is performed.</FormLabel>
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="securityTooling.penetrationTestFrequency" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Penetration testing frequency</FormLabel>
                          <FormControl>
                            <select {...field} className="h-11 w-full rounded-2xl border border-input bg-white px-4 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                              {penTestFrequencyOptions.map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
                            </select>
                          </FormControl>
                        </FormItem>
                      )} />
                    </div>

                    <div className="space-y-3 rounded-2xl bg-secondary/50 p-4">
                      <p className="text-sm font-medium text-foreground">Capacity & availability monitoring (A1.1)</p>
                      <FormField control={form.control} name="securityTooling.monitoringTool" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Infrastructure monitoring tool</FormLabel>
                          <FormControl><Input {...field} placeholder="e.g., Datadog, CloudWatch, Grafana, New Relic" /></FormControl>
                          <FormDescription>Leave blank if no dedicated infrastructure monitoring is in place.</FormDescription>
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="securityTooling.hasAutoscaling" render={({ field }) => (
                        <FormItem className="flex items-center gap-3">
                          <FormControl><Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(Boolean(checked))} /></FormControl>
                          <FormLabel>Auto-scaling is configured for production workloads.</FormLabel>
                        </FormItem>
                      )} />
                    </div>

                    <AuditorLensCallout criterion="CC7.1" message="Auditors will request vulnerability scan reports, DAST reports, penetration test reports and remediation tickets. If you selected &lsquo;no penetration testing&rsquo;, the evidence checklist will flag this as a gap requiring documented risk acceptance." />
                  </div>
                </StepShell>
              ) : null}

              {currentStep === 7 ? (
                <StepShell
                  title="Operational Context"
                  description="Capture the systems, SLAs, and control toggles that drive both policy language and the operational evidence inventory."
                >
                  <div className="space-y-6">
                    <div className="grid gap-4 md:grid-cols-3">
                      <FormField
                        control={form.control}
                        name="operations.versionControlSystem"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Version control</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="operations.ticketingSystem"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Ticketing system</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="operations.onCallTool"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>On-call tool</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid gap-4 md:grid-cols-3">
                      <FormField
                        control={form.control}
                        name="operations.vcsProvider"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>VCS provider</FormLabel>
                            <FormControl>
                              <select
                                {...field}
                                className="h-11 w-full rounded-2xl border border-input bg-white px-4 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              >
                                {vcsProviderOptions.map((provider) => (
                                  <option key={provider} value={provider}>
                                    {provider}
                                  </option>
                                ))}
                              </select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="operations.hrisProvider"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>HRIS provider</FormLabel>
                            <FormControl>
                              <select
                                {...field}
                                className="h-11 w-full rounded-2xl border border-input bg-white px-4 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              >
                                {hrisProviderOptions.map((provider) => (
                                  <option key={provider} value={provider}>
                                    {provider}
                                  </option>
                                ))}
                              </select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="operations.terminationSlaHours"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Termination SLA (hours)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min={1}
                                max={168}
                                value={field.value}
                                onChange={(event) => field.onChange(Number(event.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="operations.onboardingSlaDays"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Onboarding SLA (business days)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min={1}
                                max={30}
                                value={field.value}
                                onChange={(event) => field.onChange(Number(event.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="space-y-3 rounded-2xl bg-secondary/50 p-4">
                      <p className="text-sm font-medium text-foreground">Policy and evidence toggles</p>
                      <FormField
                        control={form.control}
                        name="operations.requiresMfa"
                        render={({ field }) => (
                          <FormItem className="flex items-center gap-3">
                            <FormControl>
                              <Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(Boolean(checked))} />
                            </FormControl>
                            <FormLabel>MFA is required for workforce or privileged access.</FormLabel>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="operations.requiresPeerReview"
                        render={({ field }) => (
                          <FormItem className="flex items-center gap-3">
                            <FormControl>
                              <Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(Boolean(checked))} />
                            </FormControl>
                            <FormLabel>Peer review is required before merging production-affecting changes.</FormLabel>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="operations.requiresCyberInsurance"
                        render={({ field }) => (
                          <FormItem className="flex items-center gap-3">
                            <FormControl>
                              <Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(Boolean(checked))} />
                            </FormControl>
                            <FormLabel>Cyber insurance is a required operational control.</FormLabel>
                          </FormItem>
                        )}
                      />
                    </div>

                    <LoneWolfWarning
                      requiresPeerReview={form.watch('operations.requiresPeerReview')}
                      requiresMfa={form.watch('operations.requiresMfa')}
                    />

                    {/* Contextual "Show Me How" snippets for controls the user just toggled */}
                    {form.watch('operations.requiresMfa') && form.watch('infrastructure.idpProvider') === 'Entra ID' && (
                      <ShowMeHow {...SHOW_ME_HOW_ENTRA_MFA} />
                    )}
                    {form.watch('operations.requiresMfa') && form.watch('infrastructure.idpProvider') === 'Okta' && (
                      <ShowMeHow {...SHOW_ME_HOW_OKTA_MFA} />
                    )}
                    {form.watch('operations.requiresPeerReview') && form.watch('operations.vcsProvider') === 'GitHub' && (
                      <ShowMeHow {...SHOW_ME_HOW_GITHUB_BRANCH_PROTECTION} />
                    )}
                    {form.watch('operations.requiresPeerReview') && form.watch('operations.vcsProvider') === 'Azure DevOps' && (
                      <ShowMeHow {...SHOW_ME_HOW_AZURE_DEVOPS_BRANCH_POLICY} />
                    )}
                    {form.watch('infrastructure.cloudProviders')?.includes('aws') && (
                      <ShowMeHow {...SHOW_ME_HOW_AWS_SCPs} />
                    )}

                    <div className="space-y-3 rounded-2xl bg-secondary/50 p-4">
                      <p className="text-sm font-medium text-foreground">Communication & risk management (CC2.2, CC2.3, CC3.2, CC3.3)</p>
                      <FormField control={form.control} name="operations.policyPublicationMethod" render={({ field }) => (
                        <FormItem>
                          <FormLabel>How are policies published to employees?</FormLabel>
                          <FormControl>
                            <select {...field} className="h-11 w-full rounded-2xl border border-input bg-white px-4 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                              {policyPublicationMethodOptions.map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
                            </select>
                          </FormControl>
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="operations.hasCustomerContracts" render={({ field }) => (
                        <FormItem className="flex items-center gap-3">
                          <FormControl><Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(Boolean(checked))} /></FormControl>
                          <FormLabel>Standardized customer contracts / MSAs / ToS exist.</FormLabel>
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="operations.hasCustomerSupportChannel" render={({ field }) => (
                        <FormItem className="flex items-center gap-3">
                          <FormControl><Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(Boolean(checked))} /></FormControl>
                          <FormLabel>A documented customer support channel is available (e.g., support email, portal).</FormLabel>
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="operations.hasReleaseNotePractice" render={({ field }) => (
                        <FormItem className="flex items-center gap-3">
                          <FormControl><Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(Boolean(checked))} /></FormControl>
                          <FormLabel>Change notifications or release notes are published to customers.</FormLabel>
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="operations.hasRiskRegister" render={({ field }) => (
                        <FormItem className="flex items-center gap-3">
                          <FormControl><Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(Boolean(checked))} /></FormControl>
                          <FormLabel>A risk register or risk assessment document is maintained.</FormLabel>
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="operations.includesFraudRiskInAssessment" render={({ field }) => (
                        <FormItem className="flex items-center gap-3">
                          <FormControl><Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(Boolean(checked))} /></FormControl>
                          <FormLabel>Fraud risk (intentional manipulation, override of controls) is included in risk assessments.</FormLabel>
                        </FormItem>
                      )} />
                    </div>

                    <div className="space-y-3 rounded-2xl bg-secondary/50 p-4">
                      <p className="text-sm font-medium text-foreground">Confidentiality & data lifecycle (C1.1, C1.2)</p>
                      <FormField control={form.control} name="operations.hasNdaProcess" render={({ field }) => (
                        <FormItem className="flex items-center gap-3">
                          <FormControl><Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(Boolean(checked))} /></FormControl>
                          <FormLabel>NDAs or confidentiality agreements are required for employees and contractors.</FormLabel>
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="operations.dataRetentionDefined" render={({ field }) => (
                        <FormItem className="flex items-center gap-3">
                          <FormControl><Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(Boolean(checked))} /></FormControl>
                          <FormLabel>Data retention schedules are defined and documented.</FormLabel>
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="operations.hasDataDisposalProcedure" render={({ field }) => (
                        <FormItem className="flex items-center gap-3">
                          <FormControl><Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(Boolean(checked))} /></FormControl>
                          <FormLabel>Data disposal or destruction procedures exist with documented evidence.</FormLabel>
                        </FormItem>
                      )} />
                    </div>

                    <AuditorLensCallout
                      criterion="CC9.2"
                      message="Every sub-service organization listed here becomes a row in your vendor-management matrix. Auditors will ask for due-diligence artifacts (SOC 2 reports, penetration test summaries) for each one. Include the role and data shared to generate accurate risk language."
                    />

                    <div className="space-y-4 rounded-2xl border border-border bg-white p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-foreground">Subservice organizations</p>
                          <p className="text-sm text-muted-foreground">These entries are transformed into vendor-management and risk policy language.</p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => append({ name: '', description: '', role: '', dataShared: '', reviewCadence: 'annual', hasAssuranceReport: false, assuranceReportType: 'none', controlInclusion: 'carve-out' })}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Add vendor
                        </Button>
                      </div>

                      <div className="space-y-4">
                        {fields.map((field, index) => (
                          <div key={field.id} className="space-y-3 rounded-2xl bg-secondary/50 p-4">
                            <div className="grid gap-3 md:grid-cols-[1fr_1.6fr_auto] md:items-start">
                            <FormField
                              control={form.control}
                              name={`subservices.${index}.name`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Vendor name</FormLabel>
                                  <FormControl>
                                    <Input {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`subservices.${index}.description`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Description</FormLabel>
                                  <FormControl>
                                    <Input {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`subservices.${index}.reviewCadence`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Assurance review cadence</FormLabel>
                                  <FormControl>
                                    <select
                                      {...field}
                                      className="h-11 w-full rounded-2xl border border-input bg-white px-4 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    >
                                      {subserviceReviewCadenceOptions.map((option) => (
                                        <option key={option.value} value={option.value}>
                                          {option.label}
                                        </option>
                                      ))}
                                    </select>
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <div className="pt-7">
                              <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                            </div>
                            <div className="grid gap-3 md:grid-cols-2">
                              <FormField
                                control={form.control}
                                name={`subservices.${index}.role`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Role <span className="text-xs text-muted-foreground">(e.g., Identity Provider, Database)</span></FormLabel>
                                    <FormControl>
                                      <Input {...field} placeholder="Identity Provider" />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name={`subservices.${index}.dataShared`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Data shared <span className="text-xs text-muted-foreground">(e.g., PII, Credentials)</span></FormLabel>
                                    <FormControl>
                                      <Input {...field} placeholder="PII, Authentication secrets" />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                            </div>
                            <div className="grid gap-3 md:grid-cols-3">
                              <FormField control={form.control} name={`subservices.${index}.hasAssuranceReport`} render={({ field }) => (
                                <FormItem className="flex items-center gap-3 pt-6">
                                  <FormControl><Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(Boolean(checked))} /></FormControl>
                                  <FormLabel>Has assurance report</FormLabel>
                                </FormItem>
                              )} />
                              {form.watch(`subservices.${index}.hasAssuranceReport`) && (
                                <>
                                  <FormField control={form.control} name={`subservices.${index}.assuranceReportType`} render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Report type</FormLabel>
                                      <FormControl>
                                        <select {...field} className="h-11 w-full rounded-2xl border border-input bg-white px-4 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                                          {assuranceReportTypeOptions.map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
                                        </select>
                                      </FormControl>
                                    </FormItem>
                                  )} />
                                  <FormField control={form.control} name={`subservices.${index}.controlInclusion`} render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Control inclusion method</FormLabel>
                                      <FormControl>
                                        <select {...field} className="h-11 w-full rounded-2xl border border-input bg-white px-4 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                                          {controlInclusionOptions.map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
                                        </select>
                                      </FormControl>
                                    </FormItem>
                                  )} />
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </StepShell>
              ) : null}

              {currentStep === 8 ? (
                <StepShell
                  title="Review"
                  description="Your SOC 2 readiness report — see overall progress, security gaps, and prioritized remediation steps before generating policies."
                >
                  <div className="space-y-6">
                    {reviewErrors.length ? (
                      <div className="rounded-2xl bg-destructive/10 p-4 text-sm text-destructive">
                        <p className="font-medium">Validation issues</p>
                        <ul className="mt-2 list-disc space-y-1 pl-5">
                          {reviewErrors.map((error) => (
                            <li key={error}>{error}</li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <div className="rounded-2xl bg-secondary/60 p-4 text-sm text-muted-foreground">
                        All required fields passed schema validation. This payload is ready for server-side compilation.
                      </div>
                    )}

                    <StepProgressCard completions={stepCompletions} onNavigateToStep={jumpToStep} />

                    <GapAnalysisCard summary={assessmentSummary} onNavigateToAssessment={() => jumpToStep(5)} />

                    {reviewSummary ? (
                      <div className="grid gap-4 lg:grid-cols-2">
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-lg">Company</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-2 text-sm text-muted-foreground">
                            <p>{reviewSummary.company.name}</p>
                            <p>{reviewSummary.company.website}</p>
                            <p>{reviewSummary.company.primaryContactName}</p>
                            <p>{reviewSummary.company.primaryContactEmail}</p>
                            <p>{reviewSummary.company.industry}</p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-lg">Scope</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-2 text-sm text-muted-foreground">
                            <p>{reviewSummary.scope.systemName}</p>
                            <p>{reviewSummary.scope.systemDescription}</p>
                            <div className="flex flex-wrap gap-2">
                              {reviewSummary.scope.dataTypesHandled.map((dataType) => (
                                <Badge key={dataType} variant="secondary">
                                  {dataType}
                                </Badge>
                              ))}
                            </div>
                            <p>{reviewSummary.scope.isMultiTenant ? 'Multi-tenant SaaS' : 'Single-tenant environment'}</p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-lg">TSCs and infrastructure</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-2 text-sm text-muted-foreground">
                            <div className="flex flex-wrap gap-2">
                              {selectedTsc.map((label) => (
                                <Badge key={label}>{label}</Badge>
                              ))}
                            </div>
                            <p>Infrastructure: {reviewSummary.infrastructure.cloudProviders?.join(', ') || reviewSummary.infrastructure.type}{reviewSummary.infrastructure.hostsOwnHardware ? ' + on-premises' : ''}</p>
                            <p>Identity provider: {reviewSummary.infrastructure.idpProvider}</p>
                            <p>Availability zones or cloud fault domains: {reviewSummary.infrastructure.usesAvailabilityZones ? 'Yes' : 'No'}</p>
                            <p>Cloud VPN logging: {reviewSummary.infrastructure.usesCloudVpn ? 'Yes' : 'No'}</p>
                            <p>Physical server room: {reviewSummary.infrastructure.hasPhysicalServerRoom ? 'Yes' : 'No'}</p>
                            <p>Hardware failover: {reviewSummary.infrastructure.hasHardwareFailover ? 'Yes' : 'No'}</p>
                            <p>Biometric rack access: {reviewSummary.infrastructure.requiresBiometricRackAccess ? 'Yes' : 'No'}</p>
                            <p>Media destruction logs: {reviewSummary.infrastructure.tracksMediaDestruction ? 'Yes' : 'No'}</p>
                            <pre className="overflow-x-auto rounded-2xl bg-secondary/60 p-3 text-xs">{JSON.stringify(reviewSummary.infrastructure, null, 2)}</pre>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-lg">Operations and vendors</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-2 text-sm text-muted-foreground">
                            <p>Version control: {reviewSummary.operations.versionControlSystem}</p>
                            <p>VCS provider: {reviewSummary.operations.vcsProvider}</p>
                            <p>HRIS provider: {reviewSummary.operations.hrisProvider}</p>
                            <p>Ticketing: {reviewSummary.operations.ticketingSystem}</p>
                            <p>On-call: {reviewSummary.operations.onCallTool}</p>
                            <p>Termination SLA: {reviewSummary.operations.terminationSlaHours} hours</p>
                            <p>Onboarding SLA: {reviewSummary.operations.onboardingSlaDays} business days</p>
                            <p>Policy publication: {reviewSummary.operations.policyPublicationMethod}</p>
                            <div className="flex flex-wrap gap-2">
                              {reviewSummary.operations.requiresMfa ? <Badge variant="secondary">MFA required</Badge> : null}
                              {reviewSummary.operations.requiresPeerReview ? <Badge variant="secondary">Peer review required</Badge> : null}
                              {reviewSummary.operations.requiresCyberInsurance ? <Badge variant="secondary">Cyber insurance required</Badge> : null}
                              {reviewSummary.operations.hasRiskRegister ? <Badge variant="secondary">Risk register</Badge> : null}
                              {reviewSummary.operations.includesFraudRiskInAssessment ? <Badge variant="secondary">Fraud risk included</Badge> : null}
                              {reviewSummary.operations.hasNdaProcess ? <Badge variant="secondary">NDA process</Badge> : null}
                              {reviewSummary.operations.dataRetentionDefined ? <Badge variant="secondary">Retention defined</Badge> : null}
                              {reviewSummary.operations.hasDataDisposalProcedure ? <Badge variant="secondary">Disposal procedure</Badge> : null}
                            </div>
                            <div className="space-y-2">
                              {reviewSummary.subservices.map((subservice) => (
                                <div key={subservice.name} className="rounded-2xl bg-secondary/60 p-3">
                                  <p className="font-medium text-foreground">{subservice.name}</p>
                                  <p>{subservice.description}</p>
                                  <p className="text-xs uppercase tracking-[0.18em]">Review cadence: {subservice.reviewCadence}{subservice.hasAssuranceReport ? ` · ${subservice.assuranceReportType} (${subservice.controlInclusion})` : ''}</p>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-lg">Governance & training</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-2 text-sm text-muted-foreground">
                            <div className="flex flex-wrap gap-2">
                              {reviewSummary.governance.hasEmployeeHandbook ? <Badge variant="secondary">Employee handbook</Badge> : null}
                              {reviewSummary.governance.hasCodeOfConduct ? <Badge variant="secondary">Code of conduct</Badge> : null}
                              {reviewSummary.governance.hasDisciplinaryProcedures ? <Badge variant="secondary">Disciplinary procedures</Badge> : null}
                              {reviewSummary.governance.hasBoardOrAdvisory ? <Badge variant="secondary">Board/advisory</Badge> : null}
                              {reviewSummary.governance.hasDedicatedSecurityOfficer ? <Badge variant="secondary">{reviewSummary.governance.securityOfficerTitle || 'Security officer'}</Badge> : null}
                              {reviewSummary.governance.hasOrgChart ? <Badge variant="secondary">Org chart</Badge> : null}
                              {reviewSummary.governance.hasJobDescriptions ? <Badge variant="secondary">Job descriptions</Badge> : null}
                              {reviewSummary.governance.hasInternalAuditProgram ? <Badge variant="secondary">Internal audit ({reviewSummary.governance.internalAuditFrequency})</Badge> : null}
                              {reviewSummary.governance.hasPerformanceReviewsLinkedToControls ? <Badge variant="secondary">Controls-linked reviews</Badge> : null}
                            </div>
                            <p>Acknowledgement cadence: {reviewSummary.governance.acknowledgementCadence}</p>
                            <p>Training tool: {reviewSummary.training.securityAwarenessTrainingTool || 'Not specified'}</p>
                            <p>Training cadence: {reviewSummary.training.trainingCadence}</p>
                            <div className="flex flex-wrap gap-2">
                              {reviewSummary.training.hasPhishingSimulation ? <Badge variant="secondary">Phishing sim ({reviewSummary.training.phishingSimulationFrequency})</Badge> : null}
                              {reviewSummary.training.hasSecurityBulletinSubscription ? <Badge variant="secondary">Security bulletins</Badge> : null}
                            </div>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-lg">Security tooling</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-2 text-sm text-muted-foreground">
                            <div className="flex flex-wrap gap-2">
                              {reviewSummary.securityTooling.siemTool ? <Badge variant="secondary">SIEM: {reviewSummary.securityTooling.siemTool}</Badge> : null}
                              {reviewSummary.securityTooling.hasIdsIps ? <Badge variant="secondary">IDS/IPS</Badge> : null}
                              {reviewSummary.securityTooling.hasWaf ? <Badge variant="secondary">WAF</Badge> : null}
                              {reviewSummary.securityTooling.endpointProtectionTool ? <Badge variant="secondary">EPP: {reviewSummary.securityTooling.endpointProtectionTool}</Badge> : null}
                              {reviewSummary.securityTooling.hasMdm ? <Badge variant="secondary">MDM: {reviewSummary.securityTooling.mdmTool}</Badge> : null}
                              {reviewSummary.securityTooling.vulnerabilityScanningTool ? <Badge variant="secondary">Vuln scan: {reviewSummary.securityTooling.vulnerabilityScanningTool}</Badge> : null}
                              {reviewSummary.securityTooling.hasDast ? <Badge variant="secondary">DAST</Badge> : null}
                              {reviewSummary.securityTooling.monitoringTool ? <Badge variant="secondary">Monitoring: {reviewSummary.securityTooling.monitoringTool}</Badge> : null}
                              {reviewSummary.securityTooling.hasAutoscaling ? <Badge variant="secondary">Autoscaling</Badge> : null}
                            </div>
                            <p>Pen test frequency: {reviewSummary.securityTooling.penetrationTestFrequency}</p>
                            <p>Log retention: {reviewSummary.securityTooling.logRetentionDays} days</p>
                          </CardContent>
                        </Card>
                      </div>
                    ) : null}
                  </div>
                </StepShell>
              ) : null}

              {currentStep === 9 ? (
                <StepShell
                  title="Generate Policies"
                  description="Review what will be compiled, then generate your org-scoped policy drafts and evidence checklist."
                >
                  <GenerateStep
                    watchedValues={watchedValues as WizardData}
                    selectedTsc={selectedTsc}
                    isGenerating={isGenerating}
                    onGenerate={generatePolicies}
                  />
                </StepShell>
              ) : null}
            </CardContent>
          </Card>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button type="button" variant="outline" onClick={goToPreviousStep} disabled={currentStep === 0 || isGenerating}>
              Previous
            </Button>
            <div className="flex items-center gap-3">
              <Button type="button" variant="ghost" onClick={() => { reset(organization.id); form.reset(defaultWizardValues); toast.success('Wizard draft reset.'); }} disabled={isGenerating}>
                Reset draft
              </Button>
              {currentStep < wizardStepTitles.length - 1 ? (
                <Button type="button" onClick={goToNextStep} disabled={isGenerating}>
                  Continue
                </Button>
              ) : null}
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
