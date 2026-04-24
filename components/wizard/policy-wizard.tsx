'use client';

import React, { useEffect, useMemo, useRef, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { Check, ChevronDown, ChevronUp, Circle, CircleDashed, Info, Plus, Sparkles, Trash2, Users, Building2 } from 'lucide-react';
import { useFieldArray, useForm, type FieldPath } from 'react-hook-form';
import { toast } from 'sonner';

import { compileDocsAction } from '@/app/actions/compile-docs';
import { saveWizardDraftAction, loadWizardDraftAction } from '@/app/actions/wizard-draft';
import { getExpectedTemplates } from '@/lib/wizard/template-manifest';
import { useOrg } from '@/components/providers/org-provider';
import { AuditorLensCallout } from '@/components/wizard/auditor-lens-callout';
import { AuditTypeGuidance, recommendAuditType } from '@/components/wizard/audit-type-guidance';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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
  orgAgeOptions,
  complianceMaturityOptions,
  orgChartMaintenanceOptions,
  boardMeetingFrequencyOptions,
  internalAuditFrequencyOptions,
  trainingCadenceOptions,
  phishingFrequencyOptions,
  policyPublicationMethodOptions,
  tscOptions,
  vcsProviderOptions,
  wizardSchema,
  wizardStepTitles,
  type WizardData,
  type TargetAuditType,
} from '@/lib/wizard/schema';
import {
  getActiveWizardRules,
  getActiveWizardRulesForField,
  getWizardDecisionTrace,
  getStepValidationFields,
  type WizardDecisionTraceItem,
  type WizardDeepDiveRule,
  type WizardRecommendationRule,
  type WizardWarningRule,
} from '@/lib/wizard/rule-matrix';
import { useWizardStore } from '@/lib/wizard/store';
import { computeAssessmentSummary, computeStepCompletions, domainBoolFields } from '@/lib/wizard/security-scoring';

const customSubserviceVendorValue = '__other__';
const customSubserviceRoleValue = '__other_role__';

const subserviceVendorGroups = [
  {
    label: 'Cloud & Infrastructure',
    options: ['AWS', 'Azure', 'GCP', 'Cloudflare'],
  },
  {
    label: 'Identity & Productivity',
    options: ['Okta', 'Microsoft', 'Google Workspace'],
  },
  {
    label: 'Workforce & Collaboration',
    options: ['Rippling', 'BambooHR', 'Atlassian'],
  },
  {
    label: 'Engineering & Operations',
    options: ['GitHub', 'GitLab', 'Datadog', 'PagerDuty'],
  },
  {
    label: 'Support & Customer Operations',
    options: ['Zendesk'],
  },
];

const subserviceVendorOptions = subserviceVendorGroups.flatMap((group) => group.options);

const subserviceRoleOptions = [
  'Cloud Hosting',
  'Identity Provider',
  'Email & Productivity Suite',
  'HRIS',
  'Version Control / Source Code Hosting',
  'Monitoring / Observability',
  'Incident Management / On-call',
  'Customer Support Platform',
  'Data Storage / Database',
  'Security Awareness Training',
];

const suggestedSubserviceRolesByVendor: Record<string, string> = {
  AWS: 'Cloud Hosting',
  Azure: 'Cloud Hosting',
  GCP: 'Cloud Hosting',
  Cloudflare: 'Cloud Hosting',
  Okta: 'Identity Provider',
  Microsoft: 'Email & Productivity Suite',
  'Google Workspace': 'Email & Productivity Suite',
  Rippling: 'HRIS',
  BambooHR: 'HRIS',
  GitHub: 'Version Control / Source Code Hosting',
  GitLab: 'Version Control / Source Code Hosting',
  Datadog: 'Monitoring / Observability',
  PagerDuty: 'Incident Management / On-call',
  Zendesk: 'Customer Support Platform',
};

function isKnownSubserviceVendor(name: string) {
  return subserviceVendorOptions.includes(name.trim());
}

function isKnownSubserviceRole(role: string) {
  return subserviceRoleOptions.includes(role.trim());
}

function getSuggestedSubserviceRole(vendorName: string) {
  return suggestedSubserviceRolesByVendor[vendorName.trim()] ?? '';
}

type TrainingToolOption = {
  value: string;
  label: string;
  vendorMatchers?: string[];
};

const securityAwarenessTrainingToolOptions: TrainingToolOption[] = [
  { value: 'KnowBe4', label: 'KnowBe4', vendorMatchers: ['knowbe4'] },
  { value: 'Proofpoint ZenGuide', label: 'Proofpoint ZenGuide', vendorMatchers: ['proofpoint', 'wombat'] },
  { value: 'Hoxhunt', label: 'Hoxhunt', vendorMatchers: ['hoxhunt'] },
  { value: 'Curricula', label: 'Curricula', vendorMatchers: ['curricula'] },
  { value: 'Wizer', label: 'Wizer', vendorMatchers: ['wizer'] },
  { value: 'NINJIO', label: 'NINJIO', vendorMatchers: ['ninjio'] },
  { value: 'Living Security', label: 'Living Security', vendorMatchers: ['living security'] },
  { value: 'Microsoft Defender for Office 365 Attack Simulation Training', label: 'Microsoft Defender for Office 365 Attack Simulation Training', vendorMatchers: ['microsoft', 'office 365', 'entra'] },
  { value: 'Google Workspace Security Awareness', label: 'Google Workspace Security Awareness', vendorMatchers: ['google', 'workspace'] },
  { value: 'Rippling Learning', label: 'Rippling Learning', vendorMatchers: ['rippling'] },
  { value: 'Manual / In-house', label: 'Manual / In-house' },
  { value: 'Other / Custom', label: 'Other / Custom' },
];

function getRecommendedTrainingTools(subservices: WizardData['subservices']) {
  const vendorText = subservices
    .map((subservice) => `${subservice.name} ${subservice.role}`.toLowerCase())
    .join(' ');

  const recommended = securityAwarenessTrainingToolOptions.filter((option) =>
    option.vendorMatchers?.some((matcher) => vendorText.includes(matcher)),
  );

  return {
    recommended,
    ordered: [
      ...recommended,
      ...securityAwarenessTrainingToolOptions.filter(
        (option) => !recommended.some((match) => match.value === option.value),
      ),
    ],
  };
}

function StepShell({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground sm:text-2xl">{title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  );
}

// ── Security Assessment helper components ─────────────────────────────────────

/* eslint-disable @typescript-eslint/no-explicit-any */
function ControlRow({ control, name, label, gap, recommendation }: {
  control: any; name: any; label: string; gap: string; recommendation: string;
}) {
  return (
    <FormField control={control} name={name} render={({ field }) => (
      <FormItem className="flex items-start gap-3 rounded-xl p-2 transition-colors hover:bg-white/60">
        <FormControl>
          <Checkbox checked={field.value} onCheckedChange={(c) => field.onChange(Boolean(c))} className="mt-0.5" />
        </FormControl>
        <div className="flex flex-1 items-start justify-between gap-2">
          <FormLabel className="cursor-pointer leading-snug">{label}</FormLabel>
          <Popover>
            <PopoverTrigger asChild>
              <button type="button" className="shrink-0 rounded p-0.5 text-muted-foreground/60 transition-colors hover:text-foreground">
                <Info className="h-3.5 w-3.5" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-semibold text-foreground">Without this</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{gap}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground">How to implement</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{recommendation}</p>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </FormItem>
    )} />
  );
}

function ReadinessCards({ control, name }: { control: any; name: any }) {
  return (
    <FormField control={control} name={name} render={({ field }) => (
      <FormItem>
        <FormLabel className="text-xs text-muted-foreground">Readiness level</FormLabel>
        <FormControl>
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: 'not-started', label: 'Not Started', desc: 'Nothing in place yet', sel: 'border-slate-400 bg-slate-50 ring-2 ring-slate-300' },
              { value: 'in-progress', label: 'In Progress', desc: 'Partially implemented', sel: 'border-amber-400 bg-amber-50 ring-2 ring-amber-300' },
              { value: 'established', label: 'Established', desc: 'Documented & live', sel: 'border-emerald-400 bg-emerald-50 ring-2 ring-emerald-300' },
            ].map((opt) => (
              <button key={opt.value} type="button"
                onClick={() => field.onChange(opt.value)}
                className={cn('rounded-xl border-2 px-2 py-2 text-left transition-all',
                  field.value === opt.value ? opt.sel : 'border-slate-200 bg-white hover:border-slate-300'
                )}
              >
                <p className="text-xs font-semibold">{opt.label}</p>
                <p className="mt-0.5 text-[10px] leading-tight text-muted-foreground">{opt.desc}</p>
              </button>
            ))}
          </div>
        </FormControl>
      </FormItem>
    )} />
  );
}
/* eslint-enable @typescript-eslint/no-explicit-any */

function FirstTimerTip({ tip }: { tip: string }) {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
      <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
      <p className="text-xs text-amber-800">
        <span className="font-semibold">Getting started: </span>{tip}
      </p>
    </div>
  );
}

function RuleWarningCard({ rule }: { rule: WizardWarningRule }) {
  const tones = rule.severity === 'warning'
    ? {
        wrapper: 'border-amber-200 bg-amber-50',
        title: 'text-amber-900',
        body: 'text-amber-800',
      }
    : {
        wrapper: 'border-blue-200 bg-blue-50',
        title: 'text-blue-900',
        body: 'text-blue-800',
      };

  return (
    <div className={`rounded-xl border p-3 ${tones.wrapper}`}>
      <p className={`text-xs font-semibold ${tones.title}`}>{rule.title}</p>
      <p className={`mt-1 text-xs ${tones.body}`}>{rule.recommendation}</p>
    </div>
  );
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function DeepDiveSelectCard({ control, rule }: { control: any; rule: WizardDeepDiveRule }) {
  return (
    <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
      <div className="space-y-1">
        <p className="text-sm font-semibold text-blue-900">{rule.title}</p>
        <p className="text-xs text-blue-800">{rule.description}</p>
        <p className="text-xs text-blue-700">{rule.recommendation}</p>
      </div>
      <div className="mt-3">
        <FormField
          control={control}
          name={rule.field as any}
          render={({ field }) => (
            <FormItem>
              <FormLabel>{rule.label}</FormLabel>
              <FormControl>
                <select
                  {...field}
                  className="h-11 w-full rounded-2xl border border-input bg-white px-4 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">Select an answer</option>
                  {rule.options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </FormControl>
              {field.value ? (
                <FormDescription>
                  {rule.options.find((option) => option.value === field.value)?.description}
                </FormDescription>
              ) : null}
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}
/* eslint-enable @typescript-eslint/no-explicit-any */

function DomainHeader({ label, criteria, score, answered, total, readiness, expanded, onToggle }: {
  label: string; criteria: string; score: number; answered: number; total: number;
  readiness: string; expanded: boolean; onToggle: () => void;
}) {
  const scoreColor = readiness === 'not-started' ? 'bg-slate-300' : score >= 80 ? 'bg-emerald-500' : score >= 50 ? 'bg-amber-500' : 'bg-red-500';
  const readinessLabel = readiness === 'not-started' ? 'Not started' : readiness === 'in-progress' ? 'In progress' : 'Established';
  return (
    <button type="button" onClick={onToggle} className="flex w-full items-center justify-between p-4 text-left">
      <div className="flex items-center gap-3">
        <span className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white', scoreColor)}>
          {answered}/{total}
        </span>
        <div>
          <p className="text-sm font-medium text-foreground">
            {label} <span className="font-normal text-xs text-muted-foreground">({criteria})</span>
          </p>
          <p className="text-[10px] text-muted-foreground">{readinessLabel}</p>
        </div>
      </div>
      {expanded ? <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function ReviewRow({ label, value, required }: { label: string; value?: string | null; required?: boolean }) {
  const isEmpty = !value?.trim();
  return (
    <div className="flex items-baseline gap-2 text-sm">
      <span className="w-32 shrink-0 text-xs text-muted-foreground">{label}</span>
      {isEmpty
        ? <span className={cn('text-xs italic', required ? 'font-medium text-amber-500' : 'text-muted-foreground/40')}>
            {required ? 'Required — missing' : '—'}
          </span>
        : <span className="min-w-0 break-words text-foreground">{value}</span>
      }
    </div>
  );
}

function DecisionTraceCard({ items }: { items: WizardDecisionTraceItem[] }) {
  const kindStyles: Record<WizardDecisionTraceItem['kind'], { badge: string; label: string }> = {
    branching: { badge: 'bg-blue-100 text-blue-800', label: 'Guidance' },
    recommendation: { badge: 'bg-emerald-100 text-emerald-800', label: 'Recommendation' },
    warning: { badge: 'bg-amber-100 text-amber-900', label: 'Warning' },
    'deep-dive': { badge: 'bg-violet-100 text-violet-800', label: 'Deep dive' },
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Decision Trace</CardTitle>
        <CardDescription>The review step reads the active rule matrix directly so you can see why the wizard surfaced each warning, recommendation, or follow-up question.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
            No matrix-driven warnings, recommendations, or deep dives are active for the current answer set.
          </div>
        ) : (
          items.map((item) => {
            const tone = kindStyles[item.kind];

            return (
              <div key={item.id} className="rounded-2xl border border-border bg-secondary/30 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={cn('rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wide', tone.badge)}>{tone.label}</span>
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{item.stepLabel}</span>
                  {item.criteria?.length ? <span className="text-[10px] text-muted-foreground">{item.criteria.join(', ')}</span> : null}
                </div>
                <p className="mt-2 text-sm font-semibold text-foreground">{item.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{item.summary}</p>
                {item.recommendation ? <p className="mt-2 text-xs text-foreground">{item.recommendation}</p> : null}
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

function GenerateStep({
  watchedValues,
  selectedTsc,
  isGenerating,
  onGenerate,
  onNavigateToStep,
}: {
  watchedValues: WizardData;
  selectedTsc: string[];
  isGenerating: boolean;
  onGenerate: () => void;
  onNavigateToStep: (step: number) => void;
}) {
  const templates = getExpectedTemplates(watchedValues.tscSelections);
  const generateWarnings = getActiveWizardRules(watchedValues, 'generate', 'warning') as WizardWarningRule[];
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

  const missingFields: { label: string; step: number }[] = [
    ...(!watchedValues.company?.name?.trim() ? [{ label: 'Company name', step: 0 }] : []),
    ...(!watchedValues.scope?.systemName?.trim() ? [{ label: 'System name', step: 1 }] : []),
    ...(!watchedValues.scope?.systemDescription?.trim() ? [{ label: 'System description', step: 1 }] : []),
  ];

  return (
    <div className="space-y-5">
      {generateWarnings.length > 0 ? (
        <div className="space-y-2">
          {generateWarnings.map((rule) => (
            <RuleWarningCard key={rule.id} rule={rule} />
          ))}
        </div>
      ) : null}

      {/* Pre-flight required field gate */}
      {missingFields.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm">
          <p className="font-semibold text-amber-900">Required fields missing</p>
          <p className="mt-0.5 text-xs text-amber-700">These fields are required to generate accurate policy documents. Fix them before generating.</p>
          <ul className="mt-2 space-y-1">
            {missingFields.map((f) => (
              <li key={f.label} className="flex items-center gap-2">
                <span className="text-xs text-amber-800">· {f.label}</span>
                <button type="button" onClick={() => onNavigateToStep(f.step)} className="text-xs font-medium text-amber-700 underline underline-offset-2 hover:text-amber-900">
                  Go fix →
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

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
        <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border">
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
                <Popover>
                  <PopoverTrigger asChild>
                    <button type="button" className="shrink-0 rounded p-0.5 text-muted-foreground/50 transition-colors hover:text-foreground">
                      <Info className="h-3.5 w-3.5" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72" align="end">
                    <p className="text-xs font-semibold text-foreground">{t.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{t.description}</p>
                    <p className="mt-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground/60">TSC criteria: {t.criteriaHint}</p>
                  </PopoverContent>
                </Popover>
                <Badge variant="outline" className="hidden px-1.5 py-0 text-[10px] sm:inline-flex">
                  {t.criteriaHint}
                </Badge>
              </div>
            );
          })}
        </div>
      </div>

      <Button
        type="button"
        size="lg"
        className="w-full sm:w-auto"
        onClick={onGenerate}
        disabled={isGenerating || missingFields.length > 0}
      >
        <Sparkles className="mr-2 h-4 w-4" />
        {isGenerating ? `Compiling ${templates.length} documents…` : `Generate ${templates.length} policy documents`}
      </Button>

      <div className="space-y-3 rounded-2xl border border-border bg-white p-4 text-sm">
        <p className="font-semibold text-foreground">After generation</p>
        <div className="grid gap-3 text-xs text-muted-foreground sm:grid-cols-3">
          <div className="space-y-1">
            <p className="font-medium text-foreground">① Review drafts</p>
            <p>Navigate to Generated Docs to review each policy. Admins can approve documents to lock them for export.</p>
          </div>
          <div className="space-y-1">
            <p className="font-medium text-foreground">② Configure export <span className="font-normal">(optional)</span></p>
            <p>Go to <strong>Settings → Save Integration</strong> to connect a GitHub repo or Azure DevOps project. Needs a PAT with repo write access.</p>
          </div>
          <div className="space-y-1">
            <p className="font-medium text-foreground">③ Evidence collection <span className="font-normal">(optional)</span></p>
            <p>Create an Evidence API key in <strong>Settings</strong> and point your Steampipe, Prowler, or CloudQuery pipeline at <code className="rounded bg-secondary px-1">/api/v1/evidence/ingest</code>.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PolicyWizard() {
  const router = useRouter();
  const { organization } = useOrg();
  const [isGenerating, startGenerating] = useTransition();
  const hasLoadedPersistedDraft = useRef(false);
  const formTopRef = useRef<HTMLDivElement | null>(null);
  const lastServerSavedSnapshotRef = useRef<string>(JSON.stringify(defaultWizardValues));
  const autosaveInFlightRef = useRef(false);
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

  const [customSubserviceVendorIds, setCustomSubserviceVendorIds] = React.useState<Record<string, boolean>>({});
  const [customSubserviceRoleIds, setCustomSubserviceRoleIds] = React.useState<Record<string, boolean>>({});
  const [autoFilledSubserviceRoleIds, setAutoFilledSubserviceRoleIds] = React.useState<Record<string, boolean>>({});
  const [draftSyncStatus, setDraftSyncStatus] = React.useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [maxStepReached, setMaxStepReached] = React.useState(currentStep);
  const watchedInfrastructure = form.watch('infrastructure.type');
  const watchedCloudProviders = form.watch('infrastructure.cloudProviders') ?? [];
  const watchedHostsOwnHardware = form.watch('infrastructure.hostsOwnHardware') ?? false;
  const watchedValues = form.watch();
  const trainingToolSuggestions = useMemo(
    () => getRecommendedTrainingTools(watchedValues.subservices ?? []),
    [watchedValues.subservices],
  );

  useEffect(() => {
    setCustomSubserviceVendorIds((previous) => {
      const next: Record<string, boolean> = {};

      fields.forEach((entry, index) => {
        const currentName = watchedValues.subservices?.[index]?.name?.trim() ?? '';
        next[entry.id] = previous[entry.id] ?? (currentName.length > 0 && !isKnownSubserviceVendor(currentName));
      });

      return next;
    });
  }, [fields, watchedValues.subservices]);

  useEffect(() => {
    setCustomSubserviceRoleIds((previous) => {
      const next: Record<string, boolean> = {};

      fields.forEach((entry, index) => {
        const currentRole = watchedValues.subservices?.[index]?.role?.trim() ?? '';
        next[entry.id] = previous[entry.id] ?? (currentRole.length > 0 && !isKnownSubserviceRole(currentRole));
      });

      return next;
    });
  }, [fields, watchedValues.subservices]);

  useEffect(() => {
    if (!hasHydrated || !organization) {
      return;
    }

    setOrganization(organization.id);

    if (organizationId && organizationId !== organization.id) {
      reset(organization.id);
      form.reset(defaultWizardValues);
      lastServerSavedSnapshotRef.current = JSON.stringify(defaultWizardValues);
      hasLoadedPersistedDraft.current = true;
      return;
    }

    if (!hasLoadedPersistedDraft.current) {
      hasLoadedPersistedDraft.current = true;

      // Try to load server-side draft. If it's newer than localStorage, prefer it.
      loadWizardDraftAction().then((result) => {
        if (result.ok && result.payload) {
          setData(result.payload);
          setCurrentStep(result.currentStep);
          setMaxStepReached(result.currentStep);
          form.reset(result.payload);
          lastServerSavedSnapshotRef.current = JSON.stringify(result.payload);
          setDraftSyncStatus('saved');
        } else {
          form.reset(data);
          lastServerSavedSnapshotRef.current = JSON.stringify(data);
        }
      });
    }
  }, [data, form, hasHydrated, organization, organizationId, reset, setCurrentStep, setData, setOrganization]);

  useEffect(() => {
    const subscription = form.watch((value) => {
      setData(value as WizardData);
    });

    return () => subscription.unsubscribe();
  }, [form, setData]);

  const autosaveIntervalMinutes = organization?.wizardAutosaveIntervalMinutes ?? 5;

  useEffect(() => {
    if (!hasHydrated || !organization || autosaveIntervalMinutes <= 0) {
      return;
    }

    const interval = window.setInterval(() => {
      if (autosaveInFlightRef.current || isGenerating) {
        return;
      }

      const payload = form.getValues();
      const snapshot = JSON.stringify(payload);

      if (snapshot === lastServerSavedSnapshotRef.current) {
        return;
      }

      autosaveInFlightRef.current = true;
      setDraftSyncStatus('saving');

      saveWizardDraftAction(payload, currentStep)
        .then((result) => {
          if (result.ok) {
            lastServerSavedSnapshotRef.current = snapshot;
          }

          setDraftSyncStatus(result.ok ? 'saved' : 'error');
        })
        .finally(() => {
          autosaveInFlightRef.current = false;
        });
    }, autosaveIntervalMinutes * 60_000);

    return () => window.clearInterval(interval);
  }, [autosaveIntervalMinutes, currentStep, form, hasHydrated, isGenerating, organization]);

  const completion = ((currentStep + 1) / wizardStepTitles.length) * 100;
  const selectedTsc = selectedTscLabels(watchedValues as WizardData);
  const organizationRelationship = form.watch('company.organizationRelationship');

  useEffect(() => {
    if (!organization || organizationRelationship !== 'same-as-company') {
      return;
    }

    if (form.getValues('company.name') !== organization.name) {
      form.setValue('company.name', organization.name, {
        shouldDirty: false,
        shouldTouch: false,
        shouldValidate: currentStep === 0,
      });
    }
  }, [currentStep, form, organization, organizationRelationship]);

  const reviewParseResult = useMemo(() => wizardSchema.safeParse(watchedValues), [watchedValues]);
  const reviewSummary = reviewParseResult.success ? reviewParseResult.data : null;
  const reviewErrors = reviewParseResult.success ? [] : reviewParseResult.error.issues.map((issue) => issue.message);

  const assessmentSummary = useMemo(() => computeAssessmentSummary(watchedValues as WizardData), [watchedValues]);
  const stepCompletions = useMemo(() => computeStepCompletions(watchedValues as WizardData, maxStepReached), [watchedValues, maxStepReached]);
  const currentWizardData = watchedValues as WizardData;
  const activeTscWarningRules = getActiveWizardRules(currentWizardData, 'tsc-selection', 'warning') as WizardWarningRule[];
  const activeInfrastructureWarningRules = getActiveWizardRules(currentWizardData, 'infrastructure', 'warning') as WizardWarningRule[];
  const activeGovernanceBranchingRules = getActiveWizardRules(currentWizardData, 'governance', 'branching');
  const activeOperationsBranchingRules = getActiveWizardRules(currentWizardData, 'operations', 'branching');
  const getWarningRulesForField = (step: 'governance' | 'operations', field: string) =>
    getActiveWizardRulesForField(currentWizardData, step, field, 'warning') as WizardWarningRule[];
  const getDeepDiveRulesForField = (step: 'governance' | 'operations', field: string) =>
    getActiveWizardRulesForField(currentWizardData, step, field, 'deep-dive') as WizardDeepDiveRule[];
  const activeTrainingRecommendationRules = getActiveWizardRules(currentWizardData, 'governance', 'recommendation') as WizardRecommendationRule[];
  const decisionTraceItems = useMemo(() => getWizardDecisionTrace(currentWizardData), [currentWizardData]);
  const hasActiveGovernanceRule = (ruleId: string) => activeGovernanceBranchingRules.some((rule) => rule.id === ruleId);
  const hasActiveOperationsRule = (ruleId: string) => activeOperationsBranchingRules.some((rule) => rule.id === ruleId);

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

  function scrollToFormTop() {
    requestAnimationFrame(() => {
      formTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  function navigateToStep(step: number) {
    setCurrentStep(step);
    scrollToFormTop();
  }

  if (!organization) {
    return null;
  }

  async function goToNextStep() {
    const fieldsToValidate = getStepValidationFields(currentStep, currentWizardData) as FieldPath<WizardData>[];
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

    const nextStep = Math.min(currentStep + 1, wizardStepTitles.length - 1);
    navigateToStep(nextStep);
    setMaxStepReached((prev) => Math.max(prev, nextStep));

    // Persist draft server-side on every step advance
    setDraftSyncStatus('saving');
    saveWizardDraftAction(form.getValues(), nextStep).then((result) => {
      if (result.ok) {
        lastServerSavedSnapshotRef.current = JSON.stringify(form.getValues());
      }

      setDraftSyncStatus(result.ok ? 'saved' : 'error');
    });
  }

  function goToPreviousStep() {
    navigateToStep(Math.max(currentStep - 1, 0));
  }

  function jumpToStep(step: number) {
    navigateToStep(step);
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
    <div className="space-y-6">
      <Card className="lg:hidden">
        <CardHeader>
          <CardTitle>Wizard Navigation</CardTitle>
          <CardDescription>Compact step navigation for smaller screens.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-medium uppercase tracking-[0.24em] text-primary/70">
              <span>Progress</span>
              <span>{Math.round(completion)}%</span>
            </div>
            <Progress value={completion} />
          </div>
          <div className="rounded-2xl bg-secondary/50 p-3 text-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/70">Current step</p>
            <p className="mt-1.5 font-medium text-foreground">{wizardStepTitles[currentStep]}</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {wizardStepTitles.map((stepTitle, index) => {
              const sc = stepCompletions[index];
              const statusLabel = sc?.status === 'complete' ? 'Complete' : sc?.status === 'partial' ? 'In progress' : 'Not started';

              return (
                <button
                  key={stepTitle}
                  type="button"
                  onClick={() => jumpToStep(index)}
                  className={cn(
                    'rounded-2xl border px-3 py-2.5 text-left transition-colors',
                    index === currentStep ? 'border-primary bg-primary/10 text-foreground' : 'border-border bg-background hover:bg-secondary/50'
                  )}
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary/70">Step {index + 1}</p>
                  <p className="mt-1 text-sm font-medium text-foreground">{stepTitle}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{statusLabel}</p>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Form {...form}>
        <form className="space-y-6" onSubmit={(event) => event.preventDefault()}>
          <div id="wizard-form-top" ref={formTopRef} className="space-y-2 lg:space-y-0">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/70 lg:hidden">Draft status</p>
            <p className={cn(
              'text-[11px] font-medium uppercase tracking-wide lg:hidden',
              draftSyncStatus === 'saved'  && 'text-emerald-600',
              draftSyncStatus === 'saving' && 'text-amber-500',
              draftSyncStatus === 'error'  && 'text-red-500',
              draftSyncStatus === 'idle'   && 'text-muted-foreground/60',
            )}>
              {draftSyncStatus === 'saved'  && '✓ Draft saved to server'}
              {draftSyncStatus === 'saving' && '⟳ Saving draft…'}
              {draftSyncStatus === 'error'  && '✗ Save failed — localStorage only'}
              {draftSyncStatus === 'idle'   && 'Draft in local storage'}
            </p>
            <p className="text-[10px] text-muted-foreground/70 lg:hidden">
              {autosaveIntervalMinutes > 0
                ? `Server autosave every ${autosaveIntervalMinutes} minute${autosaveIntervalMinutes === 1 ? '' : 's'}`
                : 'Timed server autosave disabled'}
            </p>
          </div>
          <Card className="min-w-0 overflow-hidden">
            <CardContent className="p-6">
              {currentStep === 0 ? (
                <StepShell
                  title="Welcome & Onboarding"
                  description="Capture the company metadata the template compiler will use across every generated policy."
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="company.organizationRelationship"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>How does this workspace organization relate to the company in scope?</FormLabel>
                          <FormControl>
                            <RadioGroup
                              value={field.value}
                              onValueChange={(value) => {
                                field.onChange(value);

                                if (value === 'same-as-company') {
                                  form.setValue('company.name', organization.name, {
                                    shouldDirty: true,
                                    shouldTouch: true,
                                    shouldValidate: true,
                                  });
                                }
                              }}
                              className="mt-2 grid gap-3 md:grid-cols-2"
                            >
                              <label
                                className={cn(
                                  'flex cursor-pointer flex-col gap-1.5 rounded-2xl border p-4 transition-colors',
                                  field.value === 'same-as-company'
                                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                                    : 'border-border bg-white hover:bg-secondary/40'
                                )}
                              >
                                <div className="flex items-center gap-2">
                                  <RadioGroupItem value="same-as-company" id="org-rel-same" />
                                  <span className="text-sm font-medium text-foreground">The org is the company</span>
                                </div>
                                <p className="pl-6 text-xs text-muted-foreground">Use the workspace organization name directly in the company field and generated documentation.</p>
                              </label>
                              <label
                                className={cn(
                                  'flex cursor-pointer flex-col gap-1.5 rounded-2xl border p-4 transition-colors',
                                  field.value === 'governing-company'
                                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                                    : 'border-border bg-white hover:bg-secondary/40'
                                )}
                              >
                                <div className="flex items-center gap-2">
                                  <RadioGroupItem value="governing-company" id="org-rel-governing" />
                                  <span className="text-sm font-medium text-foreground">The org governs another company</span>
                                </div>
                                <p className="pl-6 text-xs text-muted-foreground">Keep the workspace org as the governing entity, but enter the governed company name below for the generated policy set.</p>
                              </label>
                            </RadioGroup>
                          </FormControl>
                          <FormDescription>
                            Workspace org: <span className="font-medium text-foreground">{organization.name}</span>
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="company.name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company name</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              disabled={organizationRelationship === 'same-as-company'}
                              value={organizationRelationship === 'same-as-company' ? organization.name : field.value}
                              placeholder={organizationRelationship === 'same-as-company' ? organization.name : 'Acme, Inc.'}
                            />
                          </FormControl>
                          <FormDescription>
                            {organizationRelationship === 'same-as-company'
                              ? 'Copied from the workspace organization because this org is the company in scope.'
                              : 'Enter the specific company this workspace organization governs so the generated documents reference the correct operating entity.'}
                          </FormDescription>
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
                    <FormField
                      control={form.control}
                      name="company.orgAge"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>How long has your organization been operating?</FormLabel>
                          <FormControl>
                            <select {...field} className="h-11 w-full rounded-2xl border border-input bg-white px-4 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                              {orgAgeOptions.map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
                            </select>
                          </FormControl>
                          <FormDescription>Used in the System Description and evidence timeline recommendations.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="company.complianceMaturity"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>What best describes your compliance experience?</FormLabel>
                          <FormControl>
                            <RadioGroup value={field.value} onValueChange={(v) => {
                              field.onChange(v);
                              // Auto-update audit type recommendation when maturity changes
                              const newRec = recommendAuditType(
                                v as WizardData['company']['complianceMaturity'],
                                form.getValues('company.orgAge')
                              );
                              if (form.getValues('company.targetAuditType') === 'unsure') {
                                form.setValue('company.targetAuditType', newRec);
                              }
                            }} className="mt-2 grid gap-3 md:grid-cols-3">
                              {complianceMaturityOptions.map((opt) => (
                                <label
                                  key={opt.value}
                                  className={cn(
                                    'flex cursor-pointer flex-col gap-1.5 rounded-2xl border p-4 transition-colors',
                                    field.value === opt.value
                                      ? 'border-primary bg-primary/5 ring-1 ring-primary'
                                      : 'border-border bg-white hover:bg-secondary/40'
                                  )}
                                >
                                  <div className="flex items-center gap-2">
                                    <RadioGroupItem value={opt.value} id={`maturity-${opt.value}`} />
                                    <span className="text-sm font-medium text-foreground">{opt.label}</span>
                                  </div>
                                  <p className="pl-6 text-xs text-muted-foreground">{opt.description}</p>
                                </label>
                              ))}
                            </RadioGroup>
                          </FormControl>
                          <FormDescription>
                            This calibrates guidance throughout the wizard — first-time organizations see &quot;getting started&quot; recommendations instead of remediation language.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="company.targetAuditType"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormControl>
                            <AuditTypeGuidance
                              value={field.value}
                              maturity={form.watch('company.complianceMaturity')}
                              orgAge={form.watch('company.orgAge')}
                              onChange={(v: TargetAuditType) => field.onChange(v)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </StepShell>
              ) : null}

              {currentStep === 2 ? (
                <StepShell
                  title="Governance, People & Training"
                  description="Capture the organizational controls that auditors evaluate for CC1 (Control Environment), CC4 (Monitoring), and CC1.4 (Competence). These questions determine which governance documents and evidence the checklist will generate."
                >
                  <div className="space-y-6">
                    {hasActiveGovernanceRule('welcome-first-time-guidance') && (
                      <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm space-y-1">
                        <p className="font-semibold text-blue-900">First-time compliance guidance</p>
                        <p className="text-xs text-blue-700">
                          Answer each question based on what your organization <strong>currently does</strong> — not what you plan to do.
                          If you haven&apos;t established a practice yet, select &ldquo;Not yet&rdquo; where available or leave the checkbox unchecked.
                          The wizard will generate the policies needed to establish each practice from scratch.
                        </p>
                      </div>
                    )}
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
                          <FormDescription>
                            How often employees sign or digitally confirm they have read and agree to the code of conduct and security policies.
                            {field.value === 'not-yet' && (
                              <span className="mt-1 block rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-blue-700">
                                <strong>Getting started:</strong> The most common starting point is &quot;At hire + annual renewal&quot;. This means every new employee signs at onboarding, and all employees re-sign once a year. Most SOC 2 auditors consider annual renewal sufficient for Type II. You can use a simple DocuSign, Google Form, or HR system acknowledgement — it doesn&apos;t need to be a formal tool.
                              </span>
                            )}
                            {field.value === 'hire-only' && (
                              <span className="mt-1 block rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-amber-700">
                                <strong>Auditor note:</strong> At-hire-only acknowledgement is the minimum. SOC 2 auditors generally prefer annual renewals to evidence ongoing awareness. Consider upgrading to annual if you plan a Type II audit.
                              </span>
                            )}
                          </FormDescription>
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
                      {getWarningRulesForField('governance', 'governance.hasBoardOrAdvisory').map((rule) => (
                        <RuleWarningCard key={rule.id} rule={rule} />
                      ))}
                      {getDeepDiveRulesForField('governance', 'governance.hasBoardOrAdvisory').map((rule) => (
                        <DeepDiveSelectCard key={rule.id} control={form.control} rule={rule} />
                      ))}
                      {hasActiveGovernanceRule('governance-board-frequency') && (
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
                      {getWarningRulesForField('governance', 'governance.hasDedicatedSecurityOfficer').map((rule) => (
                        <RuleWarningCard key={rule.id} rule={rule} />
                      ))}
                      {getDeepDiveRulesForField('governance', 'governance.hasDedicatedSecurityOfficer').map((rule) => (
                        <DeepDiveSelectCard key={rule.id} control={form.control} rule={rule} />
                      ))}
                      {hasActiveGovernanceRule('governance-security-officer-title') && (
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
                      {hasActiveGovernanceRule('governance-org-chart-maintenance') && (
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
                      {getWarningRulesForField('governance', 'governance.hasInternalAuditProgram').map((rule) => (
                        <RuleWarningCard key={rule.id} rule={rule} />
                      ))}
                      {getDeepDiveRulesForField('governance', 'governance.hasInternalAuditProgram').map((rule) => (
                        <DeepDiveSelectCard key={rule.id} control={form.control} rule={rule} />
                      ))}
                      {hasActiveGovernanceRule('governance-internal-audit-frequency') && (
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
                          <FormControl>
                            <Input
                              {...field}
                              list="security-awareness-training-tool-options"
                              placeholder="Select or type a training platform"
                            />
                          </FormControl>
                          <datalist id="security-awareness-training-tool-options">
                            {trainingToolSuggestions.ordered.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </datalist>
                          <FormDescription>
                            Choose the platform used to deliver and track security awareness training. Recommendations refresh whenever you add or update the sub-service organizations captured in System Scope.
                          </FormDescription>
                          {trainingToolSuggestions.recommended.length > 0 && activeTrainingRecommendationRules.length > 0 ? (
                            <div className="space-y-2 rounded-xl border border-blue-200 bg-blue-50 p-3">
                              <p className="text-xs font-medium text-blue-900">Suggested based on your current sub-service organizations</p>
                              <p className="text-xs text-blue-800">{activeTrainingRecommendationRules[0]?.recommendation}</p>
                              <div className="flex flex-wrap gap-2">
                                {trainingToolSuggestions.recommended.map((option) => (
                                  <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => field.onChange(option.value)}
                                    className="rounded-full border border-blue-300 bg-white px-3 py-1 text-xs font-medium text-blue-800 transition-colors hover:border-blue-400 hover:bg-blue-100"
                                  >
                                    {option.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div className="rounded-xl border border-border bg-white px-3 py-2 text-xs text-muted-foreground">
                              Common options include KnowBe4, Proofpoint ZenGuide, Hoxhunt, Wizer, Curricula, Microsoft Defender for Office 365 Attack Simulation Training, Google Workspace Security Awareness, and Manual / In-house.
                            </div>
                          )}
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
                          {field.value === 'not-yet' && (
                            <FormDescription>
                              <span className="block rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-blue-700">
                                <strong>Getting started:</strong> Security awareness training doesn&apos;t require a paid platform to start. A recorded lunch-and-learn, a written guide, or a short video counts. The key requirement is that completion is <em>tracked</em> and employees sign off. Free options include Google Forms with a quiz at the end, or a simple spreadsheet log.
                              </span>
                            </FormDescription>
                          )}
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

              {currentStep === 1 ? (
                <StepShell
                  title="System Scope"
                  description="Define the product boundary, key sub-service organizations, and data flows that the generated policies should describe."
                >
                  <div className="grid gap-6">

                    {/* System Name */}
                    <FormField
                      control={form.control}
                      name="scope.systemName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>In-scope system name <span className="text-destructive">*</span></FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g. Acme Cloud Platform" />
                          </FormControl>
                          <FormDescription>
                            This is the formal name that appears throughout every generated policy and your SOC 2 System Description.
                            Use your product&apos;s market name — not your company name.
                            <span className="mt-1 block text-xs text-muted-foreground/70">Example: &ldquo;TrustScaffold Cloud&rdquo; not &ldquo;TrustScaffold Inc.&rdquo;</span>
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* System Description */}
                    <FormField
                      control={form.control}
                      name="scope.systemDescription"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>System description <span className="text-destructive">*</span></FormLabel>
                          <FormControl>
                            <Textarea {...field} rows={4} placeholder="e.g. A multi-tenant SaaS platform that enables security teams to generate and manage SOC 2 policy documentation. Processes organization metadata and compliance questionnaire data on behalf of B2B customers." />
                          </FormControl>
                          <FormDescription>
                            Auditors read this verbatim. Include: <strong>what the system does</strong>, <strong>who the users are</strong> (internal staff, B2B customers, consumers), and <strong>what types of data flow through it</strong>.
                            Keep it to 2–4 sentences — specific but not exhaustive.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="space-y-4 rounded-2xl border border-border bg-white p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-foreground">Sub-service organizations</p>
                          <p className="text-sm text-muted-foreground">Capture the vendors or service providers that materially support the in-scope system so Governance can recommend aligned training and vendor-management language on the first pass.</p>
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

                      <p className="text-sm text-muted-foreground">Examples: your cloud host, identity provider, HRIS, customer support platform, or any vendor that processes customer or employee data for this system.</p>

                      <div className="space-y-4">
                        {fields.length === 0 ? (
                          <div className="rounded-2xl border border-dashed border-border bg-secondary/30 px-4 py-6 text-sm text-muted-foreground">
                            Add the major vendors tied to this system if you rely on them for hosting, identity, workforce operations, monitoring, or customer data processing.
                          </div>
                        ) : null}

                        {fields.map((subserviceField, index) => (
                          <div key={subserviceField.id} className="space-y-3 rounded-2xl bg-secondary/50 p-4">
                            <div className="grid gap-3 md:grid-cols-[1fr_1.6fr_auto] md:items-start">
                            <FormField
                              control={form.control}
                              name={`subservices.${index}.name`}
                              render={({ field }) => {
                                const isCustomVendor = customSubserviceVendorIds[subserviceField.id] || Boolean(field.value && !isKnownSubserviceVendor(field.value));
                                const selectedVendorValue = isCustomVendor ? customSubserviceVendorValue : field.value || '';

                                return (
                                  <FormItem>
                                    <FormLabel>Vendor name</FormLabel>
                                    <FormControl>
                                      <select
                                        value={selectedVendorValue}
                                        onChange={(event) => {
                                          const nextValue = event.target.value;
                                          const isCustom = nextValue === customSubserviceVendorValue;
                                          const vendorFieldPath = `subservices.${index}.name` as const;
                                          const roleFieldPath = `subservices.${index}.role` as const;
                                          const currentVendorName = form.getValues(vendorFieldPath) ?? '';
                                          const currentRole = form.getValues(roleFieldPath) ?? '';
                                          const previousSuggestedRole = getSuggestedSubserviceRole(currentVendorName);
                                          const nextVendorName = isCustom ? '' : nextValue;
                                          const nextSuggestedRole = getSuggestedSubserviceRole(nextVendorName);

                                          setCustomSubserviceVendorIds((previous) => ({
                                            ...previous,
                                            [subserviceField.id]: isCustom,
                                          }));

                                          field.onChange(nextVendorName);

                                          if (!currentRole || currentRole === previousSuggestedRole) {
                                            setCustomSubserviceRoleIds((previous) => ({
                                              ...previous,
                                              [subserviceField.id]: false,
                                            }));
                                            setAutoFilledSubserviceRoleIds((previous) => ({
                                              ...previous,
                                              [subserviceField.id]: Boolean(nextSuggestedRole),
                                            }));
                                            form.setValue(roleFieldPath, nextSuggestedRole, {
                                              shouldDirty: true,
                                              shouldTouch: true,
                                              shouldValidate: true,
                                            });
                                          }
                                        }}
                                        className="h-11 w-full rounded-2xl border border-input bg-white px-4 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                      >
                                        <option value="">Select a vendor</option>
                                        {subserviceVendorGroups.map((group) => (
                                          <optgroup key={group.label} label={group.label}>
                                            {group.options.map((option) => (
                                              <option key={option} value={option}>
                                                {option}
                                              </option>
                                            ))}
                                          </optgroup>
                                        ))}
                                        <option value={customSubserviceVendorValue}>Other</option>
                                      </select>
                                    </FormControl>
                                    {isCustomVendor ? (
                                      <div className="mt-3">
                                        <Input
                                          value={field.value ?? ''}
                                          onChange={(event) => field.onChange(event.target.value)}
                                          placeholder="Enter vendor name"
                                        />
                                      </div>
                                    ) : null}
                                    <FormMessage />
                                  </FormItem>
                                );
                              }}
                            />
                            <FormField
                              control={form.control}
                              name={`subservices.${index}.description`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Description</FormLabel>
                                  <FormControl>
                                    <Input {...field} placeholder="Identity provider used for workforce SSO and MFA" />
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
                                render={({ field }) => {
                                  const isCustomRole = customSubserviceRoleIds[subserviceField.id] || Boolean(field.value && !isKnownSubserviceRole(field.value));
                                  const selectedRoleValue = isCustomRole ? customSubserviceRoleValue : field.value || '';
                                  const showAutoFilledHint = autoFilledSubserviceRoleIds[subserviceField.id] && Boolean(field.value) && !isCustomRole;

                                  return (
                                    <FormItem>
                                      <FormLabel>Role <span className="text-xs text-muted-foreground">(classify what this vendor does for the system)</span></FormLabel>
                                      <FormControl>
                                        <select
                                          value={selectedRoleValue}
                                          onChange={(event) => {
                                            const nextValue = event.target.value;
                                            const isCustom = nextValue === customSubserviceRoleValue;

                                            setCustomSubserviceRoleIds((previous) => ({
                                              ...previous,
                                              [subserviceField.id]: isCustom,
                                            }));
                                            setAutoFilledSubserviceRoleIds((previous) => ({
                                              ...previous,
                                              [subserviceField.id]: false,
                                            }));

                                            field.onChange(isCustom ? '' : nextValue);
                                          }}
                                          className="h-11 w-full rounded-2xl border border-input bg-white px-4 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                        >
                                          <option value="">Select a role</option>
                                          {subserviceRoleOptions.map((option) => (
                                            <option key={option} value={option}>
                                              {option}
                                            </option>
                                          ))}
                                          <option value={customSubserviceRoleValue}>Other</option>
                                        </select>
                                      </FormControl>
                                      {isCustomRole ? (
                                        <div className="mt-3">
                                          <Input
                                            value={field.value ?? ''}
                                            onChange={(event) => {
                                              setAutoFilledSubserviceRoleIds((previous) => ({
                                                ...previous,
                                                [subserviceField.id]: false,
                                              }));
                                              field.onChange(event.target.value);
                                            }}
                                            placeholder="Enter vendor role"
                                          />
                                        </div>
                                      ) : null}
                                      {showAutoFilledHint ? (
                                        <p className="mt-2 text-xs text-muted-foreground">Auto-filled from vendor selection.</p>
                                      ) : null}
                                    </FormItem>
                                  );
                                }}
                              />
                              <FormField
                                control={form.control}
                                name={`subservices.${index}.dataShared`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Data shared <span className="text-xs text-muted-foreground">(e.g., PII, credentials, support artifacts)</span></FormLabel>
                                    <FormControl>
                                      <Input {...field} placeholder="Workforce identities and MFA metadata" />
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

                      <AuditorLensCallout
                        criterion="CC9.2"
                        message="Every sub-service organization listed here becomes a row in your vendor-management matrix. Auditors will ask for due-diligence artifacts such as SOC reports, penetration test summaries, and review cadence evidence for each one."
                      />
                    </div>

                    {/* Data Types */}
                    <FormField
                      control={form.control}
                      name="scope.dataTypesHandled"
                      render={() => (
                        <FormItem>
                          <div className="mb-2 space-y-1">
                            <FormLabel>Data types handled</FormLabel>
                            <p className="text-sm text-muted-foreground">
                              Select every category your system stores, processes, or transmits — even indirectly.
                              Click <Info className="inline h-3.5 w-3.5 text-muted-foreground" /> to understand what each type includes and how it affects your audit scope.
                            </p>
                          </div>
                          <div className="grid gap-3 md:grid-cols-2">
                            {dataTypeOptions.map((option) => (
                              <FormField
                                key={option.label}
                                control={form.control}
                                name="scope.dataTypesHandled"
                                render={({ field }) => (
                                  <FormItem className="flex items-start gap-3 rounded-2xl border border-border bg-white p-3 transition-colors hover:border-primary/30">
                                    <FormControl>
                                      <Checkbox
                                        className="mt-0.5"
                                        checked={field.value.includes(option.label)}
                                        onCheckedChange={(checked) => {
                                          field.onChange(
                                            checked
                                              ? [...field.value, option.label]
                                              : field.value.filter((v) => v !== option.label),
                                          );
                                        }}
                                      />
                                    </FormControl>
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-1.5">
                                        <FormLabel className="font-medium leading-none">{option.label}</FormLabel>
                                        {option.triggersPrivacy ? (
                                          <Badge className="bg-purple-100 text-purple-700 text-[9px] px-1.5 py-0">Triggers Privacy TSC</Badge>
                                        ) : null}
                                        <Popover>
                                          <PopoverTrigger asChild>
                                            <button
                                              type="button"
                                              className="ml-auto rounded p-0.5 text-muted-foreground hover:text-foreground focus:outline-none"
                                              aria-label={`Learn about ${option.label}`}
                                            >
                                              <Info className="h-3.5 w-3.5" />
                                            </button>
                                          </PopoverTrigger>
                                          <PopoverContent side="right" align="start" className="space-y-3">
                                            <div>
                                              <p className="text-sm font-semibold text-foreground">{option.label}</p>
                                              <p className="mt-1 text-xs text-muted-foreground">{option.description}</p>
                                            </div>
                                            <div>
                                              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Examples</p>
                                              <ul className="mt-1 space-y-0.5">
                                                {option.examples.map((ex) => (
                                                  <li key={ex} className="flex items-start gap-1.5 text-xs text-foreground">
                                                    <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-primary/40" />
                                                    {ex}
                                                  </li>
                                                ))}
                                              </ul>
                                            </div>
                                            <div className="rounded-xl border border-amber-200 bg-amber-50 p-2.5">
                                              <p className="text-xs font-semibold text-amber-800">SOC 2 note</p>
                                              <p className="mt-0.5 text-xs text-amber-700">{option.socNote}</p>
                                            </div>
                                          </PopoverContent>
                                        </Popover>
                                      </div>
                                    </div>
                                  </FormItem>
                                )}
                              />
                            ))}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Deployment Model */}
                    <FormField
                      control={form.control}
                      name="scope.isMultiTenant"
                      render={({ field }) => (
                        <FormItem>
                          <div className="mb-2 space-y-1">
                            <FormLabel>Deployment model</FormLabel>
                            <p className="text-sm text-muted-foreground">
                              This determines how auditors evaluate data isolation and logical access controls.
                            </p>
                          </div>
                          <RadioGroup value={field.value ? 'multi' : 'single'} onValueChange={(v) => field.onChange(v === 'multi')} className="grid gap-3 md:grid-cols-2">
                            <label htmlFor="tenant-multi" className={cn(
                              'flex cursor-pointer items-start gap-4 rounded-2xl border bg-white p-4 transition-colors hover:border-primary/40',
                              field.value ? 'border-primary/60 bg-primary/5' : 'border-border',
                            )}>
                              <RadioGroupItem value="multi" id="tenant-multi" className="mt-0.5 shrink-0" />
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <Users className="h-4 w-4 text-primary" />
                                  <p className="text-sm font-semibold text-foreground">Multi-tenant SaaS</p>
                                </div>
                                <p className="text-xs text-muted-foreground">Multiple customers share the same infrastructure. Data is isolated logically (row-level, org-scoped) rather than physically.</p>
                                <p className="text-xs text-muted-foreground/70">Choose this if customers log into the same application and their data lives in shared databases or cloud accounts.</p>
                              </div>
                            </label>
                            <label htmlFor="tenant-single" className={cn(
                              'flex cursor-pointer items-start gap-4 rounded-2xl border bg-white p-4 transition-colors hover:border-primary/40',
                              !field.value ? 'border-primary/60 bg-primary/5' : 'border-border',
                            )}>
                              <RadioGroupItem value="single" id="tenant-single" className="mt-0.5 shrink-0" />
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <Building2 className="h-4 w-4 text-muted-foreground" />
                                  <p className="text-sm font-semibold text-foreground">Single-tenant / dedicated</p>
                                </div>
                                <p className="text-xs text-muted-foreground">Each customer gets their own dedicated environment — separate database, cloud account, or compute cluster.</p>
                                <p className="text-xs text-muted-foreground/70">Choose this if you deploy separate infrastructure per customer or operate an on-premises product.</p>
                              </div>
                            </label>
                          </RadioGroup>
                          <div className="rounded-xl border border-border bg-secondary/40 p-3 text-xs text-muted-foreground space-y-0.5">
                            <p className="font-medium text-foreground">Not sure?</p>
                            <p>If your customers share a database and you filter their data by an org/tenant ID column, you&apos;re multi-tenant. If each customer has their own deployment stack, you&apos;re single-tenant.</p>
                          </div>
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

                    {activeTscWarningRules.length > 0 ? (
                      <div className="space-y-2">
                        {activeTscWarningRules.map((rule) => (
                          <RuleWarningCard key={rule.id} rule={rule} />
                        ))}
                      </div>
                    ) : null}
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

                    {activeInfrastructureWarningRules.length > 0 ? (
                      <div className="space-y-2">
                        {activeInfrastructureWarningRules.map((rule) => (
                          <RuleWarningCard key={rule.id} rule={rule} />
                        ))}
                      </div>
                    ) : null}

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
                                'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white',
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
                      <DomainHeader
                        label="Document Review" criteria="CC2.1, CC5.2"
                        score={assessmentSummary.domains[0].score} answered={assessmentSummary.domains[0].answered} total={assessmentSummary.domains[0].total}
                        readiness={assessmentSummary.domains[0].readiness} expanded={expandedDomains.documentReview}
                        onToggle={() => toggleDomain('documentReview')}
                      />
                      {expandedDomains.documentReview && (
                        <div className="space-y-1 px-4 pb-4">
                          <p className="mb-3 text-xs text-muted-foreground">
                            Assessors verify that security documentation — policies, procedures, network diagrams, and asset inventories — is accurate, complete, and current.
                            {watchedCloudProviders.includes('aws') ? ' For AWS, this includes VPC diagrams, IAM policy documents, and CloudFormation/Terraform templates.' : ''}
                            {watchedCloudProviders.includes('azure') ? ' For Azure, this includes VNET topology exports, ARM templates, and Entra ID configuration docs.' : ''}
                            {watchedCloudProviders.includes('gcp') ? ' For GCP, this includes VPC network diagrams, IAM bindings, and Deployment Manager configs.' : ''}
                          </p>
                          {assessmentSummary.isFirstTimer && (
                            <FirstTimerTip tip="Start with a policy inventory spreadsheet listing each policy document, its owner, and last review date. Even a shared Google Sheet counts as an inventory for a first audit." />
                          )}
                          <div className="pb-2 pt-1">
                            <ReadinessCards control={form.control} name="securityAssessment.documentReview.readiness" />
                          </div>
                          <ControlRow control={form.control} name="securityAssessment.documentReview.hasSecurityPolicyInventory" label="A centralized inventory of all security policies exists." gap={domainBoolFields.documentReview[0].gap} recommendation={domainBoolFields.documentReview[0].recommendation} />
                          <ControlRow control={form.control} name="securityAssessment.documentReview.hasNetworkDiagrams" label="Up-to-date network architecture diagrams are maintained." gap={domainBoolFields.documentReview[1].gap} recommendation={domainBoolFields.documentReview[1].recommendation} />
                          <ControlRow control={form.control} name="securityAssessment.documentReview.hasDataFlowDiagrams" label="Data flow diagrams show how customer data traverses systems." gap={domainBoolFields.documentReview[2].gap} recommendation={domainBoolFields.documentReview[2].recommendation} />
                          <ControlRow control={form.control} name="securityAssessment.documentReview.hasAssetInventory" label="A hardware and software asset inventory is maintained." gap={domainBoolFields.documentReview[3].gap} recommendation={domainBoolFields.documentReview[3].recommendation} />
                          <ControlRow control={form.control} name="securityAssessment.documentReview.hasChangeManagementDocs" label="Change management procedures are documented and followed." gap={domainBoolFields.documentReview[4].gap} recommendation={domainBoolFields.documentReview[4].recommendation} />
                          <div className="pt-2">
                            <AuditorLensCallout criterion="CC2.1" message="Auditors will request the full policy inventory, current network diagrams, data flow diagrams, and asset lists. Missing or outdated documentation is one of the most common audit findings." />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* ── Log Review ── */}
                    <div id="domain-logReview" className="rounded-2xl bg-secondary/50">
                      <DomainHeader
                        label="Log Review" criteria="CC7.2, CC7.3"
                        score={assessmentSummary.domains[1].score} answered={assessmentSummary.domains[1].answered} total={assessmentSummary.domains[1].total}
                        readiness={assessmentSummary.domains[1].readiness} expanded={expandedDomains.logReview}
                        onToggle={() => toggleDomain('logReview')}
                      />
                      {expandedDomains.logReview && (
                        <div className="space-y-1 px-4 pb-4">
                          <p className="mb-3 text-xs text-muted-foreground">
                            Assessors examine system and application logs for signs of unauthorized access, inadequate controls, and proper retention.
                            {watchedCloudProviders.includes('aws') ? ' For AWS, this includes CloudTrail, VPC Flow Logs, GuardDuty findings, and CloudWatch log groups.' : ''}
                            {watchedCloudProviders.includes('azure') ? ' For Azure, this includes Activity Logs, NSG Flow Logs, Sentinel alerts, and Log Analytics workspaces.' : ''}
                            {watchedCloudProviders.includes('gcp') ? ' For GCP, this includes Cloud Audit Logs, VPC Flow Logs, and Security Command Center findings.' : ''}
                          </p>
                          {assessmentSummary.isFirstTimer && (
                            <FirstTimerTip tip="Enable your cloud provider's built-in audit log first — CloudTrail, Activity Logs, or Cloud Audit Logs are always-on and free. That alone covers authentication and configuration changes without any additional tooling." />
                          )}
                          <div className="pb-2 pt-1">
                            <ReadinessCards control={form.control} name="securityAssessment.logReview.readiness" />
                          </div>
                          <ControlRow control={form.control} name="securityAssessment.logReview.hasCentralizedLogging" label="Logs are aggregated into a centralized platform." gap={domainBoolFields.logReview[0].gap} recommendation={domainBoolFields.logReview[0].recommendation} />
                          {form.watch('securityAssessment.logReview.hasCentralizedLogging') && (
                            <FormField control={form.control} name="securityAssessment.logReview.centralizedLoggingTool" render={({ field }) => (
                              <FormItem className="ml-8">
                                <FormLabel>Centralized logging tool</FormLabel>
                                <FormControl><Input {...field} placeholder="e.g. Datadog, Splunk, ELK, CloudWatch" /></FormControl>
                              </FormItem>
                            )} />
                          )}
                          <ControlRow control={form.control} name="securityAssessment.logReview.logsCoverAuthentication" label="Authentication events (login, logout, MFA) are logged." gap={domainBoolFields.logReview[1].gap} recommendation={domainBoolFields.logReview[1].recommendation} />
                          <ControlRow control={form.control} name="securityAssessment.logReview.logsCoverNetworkActivity" label="Network activity (firewall, flow logs) is logged." gap={domainBoolFields.logReview[2].gap} recommendation={domainBoolFields.logReview[2].recommendation} />
                          <ControlRow control={form.control} name="securityAssessment.logReview.logsCoverSystemChanges" label="System configuration changes are logged (audit trails)." gap={domainBoolFields.logReview[3].gap} recommendation={domainBoolFields.logReview[3].recommendation} />
                          <ControlRow control={form.control} name="securityAssessment.logReview.hasLogRetentionPolicy" label="A formal log retention policy is defined and enforced." gap={domainBoolFields.logReview[4].gap} recommendation={domainBoolFields.logReview[4].recommendation} />
                          <ControlRow control={form.control} name="securityAssessment.logReview.hasAutomatedLogAnalysis" label="Automated log analysis or correlation rules are in place (SIEM alerts)." gap={domainBoolFields.logReview[5].gap} recommendation={domainBoolFields.logReview[5].recommendation} />
                          <div className="pt-2">
                            <AuditorLensCallout criterion="CC7.2" message="Auditors sample log entries to verify breadth of coverage, then ask to see the retention policy document. They also test that alerts fire on suspicious activity — be ready to demonstrate a detection flow end-to-end." />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* ── Ruleset Review ── */}
                    <div id="domain-rulesetReview" className="rounded-2xl bg-secondary/50">
                      <DomainHeader
                        label="Ruleset Review" criteria="CC6.1, CC6.6"
                        score={assessmentSummary.domains[2].score} answered={assessmentSummary.domains[2].answered} total={assessmentSummary.domains[2].total}
                        readiness={assessmentSummary.domains[2].readiness} expanded={expandedDomains.rulesetReview}
                        onToggle={() => toggleDomain('rulesetReview')}
                      />
                      {expandedDomains.rulesetReview && (
                        <div className="space-y-1 px-4 pb-4">
                          <p className="mb-3 text-xs text-muted-foreground">
                            Assessors analyze firewall rules, network ACLs, and security group configurations for overly permissive access.
                            {watchedCloudProviders.includes('aws') ? ' For AWS, this includes Security Groups, NACLs, WAF rules, and AWS Network Firewall policies.' : ''}
                            {watchedCloudProviders.includes('azure') ? ' For Azure, this includes NSGs, Azure Firewall rules, and Application Gateway WAF policies.' : ''}
                            {watchedCloudProviders.includes('gcp') ? ' For GCP, this includes VPC firewall rules, Cloud Armor policies, and hierarchical firewall policies.' : ''}
                          </p>
                          {assessmentSummary.isFirstTimer && (
                            <FirstTimerTip tip="Audit your security groups/NSGs for any rules allowing all inbound traffic (0.0.0.0/0 on any port). Removing or restricting those is a fast win — it's also one of the most common findings auditors flag." />
                          )}
                          <div className="pb-2 pt-1">
                            <ReadinessCards control={form.control} name="securityAssessment.rulesetReview.readiness" />
                          </div>
                          <ControlRow control={form.control} name="securityAssessment.rulesetReview.hasFirewallRulesets" label="Firewall or cloud-native firewall rulesets are documented." gap={domainBoolFields.rulesetReview[0].gap} recommendation={domainBoolFields.rulesetReview[0].recommendation} />
                          <ControlRow control={form.control} name="securityAssessment.rulesetReview.hasSecurityGroupRules" label="Security group / NSG rules follow least-privilege principles." gap={domainBoolFields.rulesetReview[1].gap} recommendation={domainBoolFields.rulesetReview[1].recommendation} />
                          <ControlRow control={form.control} name="securityAssessment.rulesetReview.hasNaclRules" label="Network ACL rules are reviewed and documented." gap={domainBoolFields.rulesetReview[2].gap} recommendation={domainBoolFields.rulesetReview[2].recommendation} />
                          <ControlRow control={form.control} name="securityAssessment.rulesetReview.reviewsRulesetsRegularly" label="Rulesets are reviewed on a regular cadence." gap={domainBoolFields.rulesetReview[3].gap} recommendation={domainBoolFields.rulesetReview[3].recommendation} />
                          {form.watch('securityAssessment.rulesetReview.reviewsRulesetsRegularly') && (
                            <FormField control={form.control} name="securityAssessment.rulesetReview.rulesetReviewCadence" render={({ field }) => (
                              <FormItem className="ml-8">
                                <FormLabel>Review cadence</FormLabel>
                                <FormControl><Input {...field} placeholder="e.g. Quarterly, Semi-annual" /></FormControl>
                              </FormItem>
                            )} />
                          )}
                          <ControlRow control={form.control} name="securityAssessment.rulesetReview.hasDefaultDenyPolicy" label="A default-deny (implicit deny) policy is enforced at the network boundary." gap={domainBoolFields.rulesetReview[4].gap} recommendation={domainBoolFields.rulesetReview[4].recommendation} />
                          <div className="pt-2">
                            <AuditorLensCallout criterion="CC6.6" message="Auditors export your firewall rules and look for any 0.0.0.0/0 ingress, unused rules, or undocumented open ports. They cross-reference rules against your documented justifications for each allowed port and service." />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* ── System Configuration Review ── */}
                    <div id="domain-configReview" className="rounded-2xl bg-secondary/50">
                      <DomainHeader
                        label="System Configuration Review" criteria="CC6.1, CC6.7, CC6.8"
                        score={assessmentSummary.domains[3].score} answered={assessmentSummary.domains[3].answered} total={assessmentSummary.domains[3].total}
                        readiness={assessmentSummary.domains[3].readiness} expanded={expandedDomains.configReview}
                        onToggle={() => toggleDomain('configReview')}
                      />
                      {expandedDomains.configReview && (
                        <div className="space-y-1 px-4 pb-4">
                          <p className="mb-3 text-xs text-muted-foreground">
                            Assessors verify that systems are configured according to security baselines and hardened against known vulnerabilities.
                            {watchedCloudProviders.includes('aws') ? ' For AWS, this includes AWS Config rules, SSM patch compliance, AMI hardening, and Security Hub benchmarks (CIS/AWS Foundational).' : ''}
                            {watchedCloudProviders.includes('azure') ? ' For Azure, this includes Azure Policy, Defender for Cloud secure score, and CIS benchmarks for Azure.' : ''}
                            {watchedCloudProviders.includes('gcp') ? ' For GCP, this includes Security Health Analytics, OS patch management, and CIS benchmarks for GCP.' : ''}
                          </p>
                          {assessmentSummary.isFirstTimer && (
                            <FirstTimerTip tip="Adopt a CIS Benchmark for your primary OS or cloud platform as your baseline. Even documenting 'we follow CIS Level 1 with these 3 exceptions' is significantly better than no documented baseline — auditors understand first-timers." />
                          )}
                          <div className="pb-2 pt-1">
                            <ReadinessCards control={form.control} name="securityAssessment.configReview.readiness" />
                          </div>
                          <ControlRow control={form.control} name="securityAssessment.configReview.hasHardeningBaselines" label="Security hardening baselines (CIS, DISA STIG, vendor guides) are defined." gap={domainBoolFields.configReview[0].gap} recommendation={domainBoolFields.configReview[0].recommendation} />
                          {form.watch('securityAssessment.configReview.hasHardeningBaselines') && (
                            <FormField control={form.control} name="securityAssessment.configReview.hardeningFramework" render={({ field }) => (
                              <FormItem className="ml-8">
                                <FormLabel>Hardening framework</FormLabel>
                                <FormControl><Input {...field} placeholder="e.g. CIS Benchmark Level 1, DISA STIG" /></FormControl>
                              </FormItem>
                            )} />
                          )}
                          <ControlRow control={form.control} name="securityAssessment.configReview.hasAutomatedConfigScanning" label="Automated configuration compliance scanning is in place." gap={domainBoolFields.configReview[1].gap} recommendation={domainBoolFields.configReview[1].recommendation} />
                          {form.watch('securityAssessment.configReview.hasAutomatedConfigScanning') && (
                            <FormField control={form.control} name="securityAssessment.configReview.configScanningTool" render={({ field }) => (
                              <FormItem className="ml-8">
                                <FormLabel>Configuration scanning tool</FormLabel>
                                <FormControl><Input {...field} placeholder="e.g. AWS Config, Chef InSpec, Prisma Cloud" /></FormControl>
                              </FormItem>
                            )} />
                          )}
                          <ControlRow control={form.control} name="securityAssessment.configReview.hasPatchManagementProcess" label="A patch management process with defined SLAs exists." gap={domainBoolFields.configReview[2].gap} recommendation={domainBoolFields.configReview[2].recommendation} />
                          {form.watch('securityAssessment.configReview.hasPatchManagementProcess') && (
                            <FormField control={form.control} name="securityAssessment.configReview.patchSlaBusinessDays" render={({ field }) => (
                              <FormItem className="ml-8">
                                <FormLabel>Critical patch SLA (business days)</FormLabel>
                                <FormControl>
                                  <Input type="number" {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
                                </FormControl>
                                <FormDescription>Maximum business days to apply critical security patches.</FormDescription>
                              </FormItem>
                            )} />
                          )}
                          <ControlRow control={form.control} name="securityAssessment.configReview.hasImageBuildPipeline" label="Server/container images are built from hardened base images via a pipeline." gap={domainBoolFields.configReview[3].gap} recommendation={domainBoolFields.configReview[3].recommendation} />
                          <div className="pt-2">
                            <AuditorLensCallout criterion="CC6.1" message="Auditors sample system configurations against your stated baseline and check patch levels on production instances. They look for deviations without documented exceptions — even a simple exception log shows maturity." />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* ── Network Traffic Analysis ── */}
                    <div id="domain-networkAnalysis" className="rounded-2xl bg-secondary/50">
                      <DomainHeader
                        label="Network Traffic Analysis" criteria="CC6.1, CC6.6"
                        score={assessmentSummary.domains[4].score} answered={assessmentSummary.domains[4].answered} total={assessmentSummary.domains[4].total}
                        readiness={assessmentSummary.domains[4].readiness} expanded={expandedDomains.networkAnalysis}
                        onToggle={() => toggleDomain('networkAnalysis')}
                      />
                      {expandedDomains.networkAnalysis && (
                        <div className="space-y-1 px-4 pb-4">
                          <p className="mb-3 text-xs text-muted-foreground">
                            Assessors verify encryption in transit, network segmentation, and the ability to detect anomalous traffic.
                            {watchedCloudProviders.includes('aws') ? ' For AWS, this includes VPC Flow Logs, Transit Gateway attachments, PrivateLink endpoints, and ACM certificate management.' : ''}
                            {watchedCloudProviders.includes('azure') ? ' For Azure, this includes NSG Flow Logs, VNet peering, Private Endpoints, and Azure Key Vault certificate management.' : ''}
                            {watchedCloudProviders.includes('gcp') ? ' For GCP, this includes VPC Flow Logs, Shared VPC, Private Service Connect, and Google-managed SSL certificates.' : ''}
                          </p>
                          {assessmentSummary.isFirstTimer && (
                            <FirstTimerTip tip="Enforce HTTPS-only on all endpoints (most cloud load balancers support this in one click) and separate prod and dev into different VPCs or VNets. These two steps address the most common network findings with minimal effort." />
                          )}
                          <div className="pb-2 pt-1">
                            <ReadinessCards control={form.control} name="securityAssessment.networkAnalysis.readiness" />
                          </div>
                          <ControlRow control={form.control} name="securityAssessment.networkAnalysis.hasNetworkSegmentation" label="Network segmentation separates production, staging, and corporate environments." gap={domainBoolFields.networkAnalysis[0].gap} recommendation={domainBoolFields.networkAnalysis[0].recommendation} />
                          <ControlRow control={form.control} name="securityAssessment.networkAnalysis.hasEncryptionInTransit" label="All data in transit is encrypted (TLS 1.2+)." gap={domainBoolFields.networkAnalysis[1].gap} recommendation={domainBoolFields.networkAnalysis[1].recommendation} />
                          {form.watch('securityAssessment.networkAnalysis.hasEncryptionInTransit') && (
                            <FormField control={form.control} name="securityAssessment.networkAnalysis.encryptionProtocol" render={({ field }) => (
                              <FormItem className="ml-8">
                                <FormLabel>Minimum encryption protocol</FormLabel>
                                <FormControl><Input {...field} placeholder="e.g. TLS 1.2, TLS 1.3" /></FormControl>
                              </FormItem>
                            )} />
                          )}
                          <ControlRow control={form.control} name="securityAssessment.networkAnalysis.hasNetworkMonitoring" label="Network traffic monitoring or anomaly detection is deployed." gap={domainBoolFields.networkAnalysis[2].gap} recommendation={domainBoolFields.networkAnalysis[2].recommendation} />
                          {form.watch('securityAssessment.networkAnalysis.hasNetworkMonitoring') && (
                            <FormField control={form.control} name="securityAssessment.networkAnalysis.networkMonitoringTool" render={({ field }) => (
                              <FormItem className="ml-8">
                                <FormLabel>Network monitoring tool</FormLabel>
                                <FormControl><Input {...field} placeholder="e.g. GuardDuty, Zeek, Darktrace" /></FormControl>
                              </FormItem>
                            )} />
                          )}
                          <ControlRow control={form.control} name="securityAssessment.networkAnalysis.hasDnsFiltering" label="DNS filtering or sinkholing is configured to block malicious domains." gap={domainBoolFields.networkAnalysis[3].gap} recommendation={domainBoolFields.networkAnalysis[3].recommendation} />
                          <div className="pt-2">
                            <AuditorLensCallout criterion="CC6.6" message="Auditors verify TLS is enforced (not just available) and that environments are isolated. They often request certificate management documentation and flow log samples showing normal vs. anomalous traffic patterns." />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* ── File Integrity Checking ── */}
                    <div id="domain-fileIntegrity" className="rounded-2xl bg-secondary/50">
                      <DomainHeader
                        label="File Integrity Checking" criteria="CC6.1, CC7.1"
                        score={assessmentSummary.domains[5].score} answered={assessmentSummary.domains[5].answered} total={assessmentSummary.domains[5].total}
                        readiness={assessmentSummary.domains[5].readiness} expanded={expandedDomains.fileIntegrity}
                        onToggle={() => toggleDomain('fileIntegrity')}
                      />
                      {expandedDomains.fileIntegrity && (
                        <div className="space-y-1 px-4 pb-4">
                          <p className="mb-3 text-xs text-muted-foreground">
                            Assessors verify that critical files — system binaries, configuration files, and application artifacts — are monitored for unauthorized changes using hash verification.
                            {watchedCloudProviders.includes('aws') ? ' For AWS, this includes AWS Config file tracking, SSM Inventory, and artifact signing with AWS Signer.' : ''}
                            {watchedCloudProviders.includes('azure') ? ' For Azure, this includes Defender for Server FIM, Azure Policy guest configuration, and Azure Artifacts signing.' : ''}
                            {watchedCloudProviders.includes('gcp') ? ' For GCP, this includes Security Health Analytics, Binary Authorization for containers, and artifact signing.' : ''}
                          </p>
                          {assessmentSummary.isFirstTimer && (
                            <FirstTimerTip tip="If you deploy containers, start with image digest pinning in your deployment manifests — it's a quick win that demonstrates artifact integrity. For VMs, cloud-native FIM options (Defender for Server, AWS Config) have low setup overhead." />
                          )}
                          <div className="pb-2 pt-1">
                            <ReadinessCards control={form.control} name="securityAssessment.fileIntegrity.readiness" />
                          </div>
                          <ControlRow control={form.control} name="securityAssessment.fileIntegrity.hasFileIntegrityMonitoring" label="File integrity monitoring (FIM) is deployed on production systems." gap={domainBoolFields.fileIntegrity[0].gap} recommendation={domainBoolFields.fileIntegrity[0].recommendation} />
                          {form.watch('securityAssessment.fileIntegrity.hasFileIntegrityMonitoring') && (
                            <FormField control={form.control} name="securityAssessment.fileIntegrity.fimTool" render={({ field }) => (
                              <FormItem className="ml-8">
                                <FormLabel>FIM tool</FormLabel>
                                <FormControl><Input {...field} placeholder="e.g. OSSEC, Tripwire, Wazuh, CrowdStrike" /></FormControl>
                              </FormItem>
                            )} />
                          )}
                          <ControlRow control={form.control} name="securityAssessment.fileIntegrity.monitorsCriticalSystemFiles" label="Critical system files (OS binaries, kernel modules) are monitored." gap={domainBoolFields.fileIntegrity[1].gap} recommendation={domainBoolFields.fileIntegrity[1].recommendation} />
                          <ControlRow control={form.control} name="securityAssessment.fileIntegrity.monitorsConfigurationFiles" label="Configuration files (e.g. /etc/*, cloud provider configs) are monitored." gap={domainBoolFields.fileIntegrity[2].gap} recommendation={domainBoolFields.fileIntegrity[2].recommendation} />
                          <ControlRow control={form.control} name="securityAssessment.fileIntegrity.monitorsApplicationBinaries" label="Application binaries and container images are integrity-checked." gap={domainBoolFields.fileIntegrity[3].gap} recommendation={domainBoolFields.fileIntegrity[3].recommendation} />
                          <ControlRow control={form.control} name="securityAssessment.fileIntegrity.hasArtifactSigningOrHashing" label="Deployment artifacts are signed or hash-verified before production use." gap={domainBoolFields.fileIntegrity[4].gap} recommendation={domainBoolFields.fileIntegrity[4].recommendation} />
                          <div className="pt-2">
                            <AuditorLensCallout criterion="CC7.1" message="Assessors verify FIM coverage matches your asset inventory, that alerts are acted upon, and that integrity baselines are refreshed after authorized changes. They also verify artifact provenance in your CI/CD pipeline." />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </StepShell>
              ) : null}

              {currentStep === 6 ? (
                <StepShell
                  title="Security Tooling"
                  description="Identify the security and monitoring tools in your environment. This drives evidence checklist items for CC6.6 (external threats), CC6.8 (malware prevention), CC7.1 (vulnerability management), and A1.1 (capacity monitoring)."
                >
                  <div className="space-y-6">

                    {/* ── Security Monitoring ── */}
                    <div className="space-y-1 rounded-2xl bg-secondary/50 p-4">
                      <p className="text-sm font-medium text-foreground">Security monitoring <span className="font-normal text-xs text-muted-foreground">(CC6.6, CC7.2)</span></p>
                      <p className="mb-3 text-xs text-muted-foreground">Auditors verify you have centralized visibility into your environment — alerts, log aggregation, and active threat detection. Without these, you have no evidence of ongoing security monitoring.</p>
                      {assessmentSummary.isFirstTimer && (
                        <div className="mb-3">
                          <FirstTimerTip tip="A SIEM doesn't need to be expensive to start. AWS Security Hub, Azure Sentinel free tier, or even a well-configured CloudWatch dashboard demonstrates monitoring maturity for a first audit." />
                        </div>
                      )}
                      <FormField control={form.control} name="securityTooling.siemTool" render={({ field }) => (
                        <FormItem className="mb-2">
                          <FormLabel>SIEM or security monitoring platform</FormLabel>
                          <FormControl><Input {...field} placeholder="e.g., Datadog Security, Splunk, Elastic SIEM, AWS Security Hub" /></FormControl>
                          <FormDescription>Leave blank if no centralized security monitoring is in place.</FormDescription>
                        </FormItem>
                      )} />
                      <ControlRow
                        control={form.control}
                        name="securityTooling.hasIdsIps"
                        label="An intrusion detection / prevention system (IDS/IPS) is deployed."
                        gap="Without IDS/IPS, network-level intrusion attempts — port scans, lateral movement, C2 callbacks — go undetected until after damage occurs."
                        recommendation="Enable GuardDuty (AWS), Microsoft Defender for Cloud (Azure), or Security Command Center (GCP) — all are managed services that require minimal configuration. For on-prem, consider Snort or Suricata."
                      />
                      <ControlRow
                        control={form.control}
                        name="securityTooling.hasWaf"
                        label="A web application firewall (WAF) protects public-facing applications."
                        gap="Public-facing applications are exposed to OWASP Top 10 attacks (SQL injection, XSS, CSRF) without a blocking layer in front of them."
                        recommendation="Use AWS WAF + CloudFront, Azure Application Gateway WAF, or GCP Cloud Armor. Enable the managed Core Rule Set — it blocks the most common attacks with minimal tuning required."
                      />
                      <FormField control={form.control} name="securityTooling.logRetentionDays" render={({ field }) => (
                        <FormItem className="mt-2">
                          <FormLabel>Log retention period (days)</FormLabel>
                          <FormControl><Input type="number" min={30} max={730} value={field.value} onChange={(e) => field.onChange(Number(e.target.value))} /></FormControl>
                          <FormDescription>SOC 2 Type II commonly requires 90+ days. 365 days is standard for higher-assurance environments.</FormDescription>
                        </FormItem>
                      )} />
                      <div className="pt-3">
                        <AuditorLensCallout criterion="CC6.6" message="Auditors request SIEM alert configurations and sample alerts from the past quarter, plus evidence of how detected incidents were triaged and responded to. IDS/IPS and WAF deployments are verified via configuration exports or dashboard screenshots." />
                      </div>
                    </div>

                    {/* ── Endpoint & Device Protection ── */}
                    <div className="space-y-1 rounded-2xl bg-secondary/50 p-4">
                      <p className="text-sm font-medium text-foreground">Endpoint & device protection <span className="font-normal text-xs text-muted-foreground">(CC6.8)</span></p>
                      <p className="mb-3 text-xs text-muted-foreground">Auditors check that company-owned devices are protected against malware and can be remotely managed or wiped. Unmanaged devices are frequently flagged as a gap in device trust boundaries.</p>
                      {assessmentSummary.isFirstTimer && (
                        <div className="mb-3">
                          <FirstTimerTip tip="Start by enforcing full-disk encryption and a screen lock policy through MDM — both are one-policy enablements in any MDM platform and satisfy the core CC6.8 device control requirement." />
                        </div>
                      )}
                      <FormField control={form.control} name="securityTooling.endpointProtectionTool" render={({ field }) => (
                        <FormItem className="mb-2">
                          <FormLabel>Endpoint protection / antivirus</FormLabel>
                          <FormControl><Input {...field} placeholder="e.g., CrowdStrike, SentinelOne, Microsoft Defender" /></FormControl>
                          <FormDescription>Leave blank if no endpoint protection is deployed.</FormDescription>
                        </FormItem>
                      )} />
                      <ControlRow
                        control={form.control}
                        name="securityTooling.hasMdm"
                        label="Mobile device management (MDM) is enforced on company devices."
                        gap="Without MDM, company devices may lack enforced disk encryption, screen lock policies, or remote wipe capability — leaving sensitive data at risk if a device is lost or stolen."
                        recommendation="Jamf Pro/Now (macOS/iOS), Kandji (Apple-focused), or Microsoft Intune (cross-platform) are common options. Start by enforcing disk encryption and screen lock, then add patch compliance reporting."
                      />
                      {form.watch('securityTooling.hasMdm') && (
                        <FormField control={form.control} name="securityTooling.mdmTool" render={({ field }) => (
                          <FormItem className="ml-8">
                            <FormLabel>MDM tool</FormLabel>
                            <FormControl><Input {...field} placeholder="e.g., Jamf, Kandji, Intune" /></FormControl>
                          </FormItem>
                        )} />
                      )}
                      <div className="pt-3">
                        <AuditorLensCallout criterion="CC6.8" message="Auditors request MDM enrollment reports showing coverage across the full device fleet, plus evidence that antivirus alerts are actively monitored. A single unmanaged device handling customer data is a finding — document any exceptions." />
                      </div>
                    </div>

                    {/* ── Vulnerability Management ── */}
                    <div className="space-y-1 rounded-2xl bg-secondary/50 p-4">
                      <p className="text-sm font-medium text-foreground">Vulnerability management <span className="font-normal text-xs text-muted-foreground">(CC7.1)</span></p>
                      <p className="mb-3 text-xs text-muted-foreground">Auditors expect a repeating cycle of scanning, prioritization, and remediation. Penetration testing is required for Type II — the frequency signals how seriously you treat your attack surface.</p>
                      {assessmentSummary.isFirstTimer && (
                        <div className="mb-3">
                          <FirstTimerTip tip="Annual pen testing is the minimum threshold for SOC 2 Type II. If you haven't done one yet, get one scheduled — even a scoped web app test from a reputable firm produces the evidence artifacts auditors need." />
                        </div>
                      )}
                      <FormField control={form.control} name="securityTooling.vulnerabilityScanningTool" render={({ field }) => (
                        <FormItem className="mb-2">
                          <FormLabel>Vulnerability scanning tool</FormLabel>
                          <FormControl><Input {...field} placeholder="e.g., Qualys, Nessus, AWS Inspector, Snyk" /></FormControl>
                          <FormDescription>Leave blank if no vulnerability scanning is in place.</FormDescription>
                        </FormItem>
                      )} />
                      <ControlRow
                        control={form.control}
                        name="securityTooling.hasDast"
                        label="Dynamic application security testing (DAST) is performed."
                        gap="Static code reviews don't catch runtime vulnerabilities. Without DAST, auth flaws, injection, and SSRF vulnerabilities in your live application go undetected until an external attacker finds them."
                        recommendation="OWASP ZAP and Burp Suite Community Edition are free starting points. Commercial options include StackHawk, Invicti, and Veracode. Integrate into CI/CD on a weekly scheduled scan for continuous coverage."
                      />
                      <FormField control={form.control} name="securityTooling.penetrationTestFrequency" render={({ field }) => (
                        <FormItem className="mt-2">
                          <FormLabel>Penetration testing frequency</FormLabel>
                          <FormControl>
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                              {[
                                { value: 'none', label: 'None', desc: 'No scheduled testing', note: 'Requires written risk acceptance for Type II', selColor: 'border-red-400 bg-red-50 ring-2 ring-red-300' },
                                { value: 'annual', label: 'Annual', desc: 'Once per year', note: 'Minimum threshold for Type II', selColor: 'border-amber-400 bg-amber-50 ring-2 ring-amber-300' },
                                { value: 'semi-annual', label: 'Semi-annual', desc: 'Twice per year', note: 'Common for growth-stage SaaS', selColor: 'border-emerald-400 bg-emerald-50 ring-2 ring-emerald-300' },
                                { value: 'quarterly', label: 'Quarterly', desc: 'Four times per year', note: 'High-assurance environments', selColor: 'border-emerald-400 bg-emerald-50 ring-2 ring-emerald-300' },
                              ].map((opt) => (
                                <button key={opt.value} type="button"
                                  onClick={() => field.onChange(opt.value)}
                                  className={cn('rounded-xl border-2 px-2 py-2.5 text-left transition-all',
                                    field.value === opt.value ? opt.selColor : 'border-slate-200 bg-white hover:border-slate-300'
                                  )}
                                >
                                  <p className="text-xs font-semibold">{opt.label}</p>
                                  <p className="mt-0.5 text-[10px] leading-tight text-muted-foreground">{opt.desc}</p>
                                  <p className="mt-1 text-[10px] leading-tight text-muted-foreground/70 italic">{opt.note}</p>
                                </button>
                              ))}
                            </div>
                          </FormControl>
                        </FormItem>
                      )} />
                      <div className="pt-3">
                        <AuditorLensCallout criterion="CC7.1" message="Auditors request vulnerability scan reports and pen test reports with linked remediation tickets. Selecting 'None' requires documented risk acceptance signed by leadership — it's a significant gap for Type II. Scope the pen test to cover your primary system boundary." />
                      </div>
                    </div>

                    {/* ── Capacity & Availability Monitoring ── */}
                    <div className="space-y-1 rounded-2xl bg-secondary/50 p-4">
                      <p className="text-sm font-medium text-foreground">Capacity & availability monitoring <span className="font-normal text-xs text-muted-foreground">(A1.1)</span></p>
                      <p className="mb-3 text-xs text-muted-foreground">Auditors look for evidence that you actively track infrastructure capacity, receive alerts before availability is impacted, and can automatically scale to handle demand changes.</p>
                      {assessmentSummary.isFirstTimer && (
                        <div className="mb-3">
                          <FirstTimerTip tip="Cloud provider native monitoring (CloudWatch, Azure Monitor, GCP Cloud Monitoring) covers the basics with no additional cost. Configure a dashboard and set alerts on CPU, memory, and error rate thresholds before your audit window opens." />
                        </div>
                      )}
                      <FormField control={form.control} name="securityTooling.monitoringTool" render={({ field }) => (
                        <FormItem className="mb-2">
                          <FormLabel>Infrastructure monitoring tool</FormLabel>
                          <FormControl><Input {...field} placeholder="e.g., Datadog, CloudWatch, Grafana, New Relic" /></FormControl>
                          <FormDescription>Leave blank if no dedicated infrastructure monitoring is in place.</FormDescription>
                        </FormItem>
                      )} />
                      <ControlRow
                        control={form.control}
                        name="securityTooling.hasAutoscaling"
                        label="Auto-scaling is configured for production workloads."
                        gap="Without auto-scaling, production infrastructure cannot respond to traffic spikes automatically, risking availability failures during peak load — a direct gap against A1.1 capacity management."
                        recommendation="Enable Auto Scaling Groups (AWS), VM Scale Sets (Azure), or Managed Instance Groups (GCP) for your compute layer. Set scale-out policies on CPU utilization and request-rate thresholds."
                      />
                      <div className="pt-3">
                        <AuditorLensCallout criterion="A1.1" message="Auditors review monitoring dashboard screenshots and alert configurations. Auto-scaling evidence is typically a screenshot of scale-out events during a past incident or load test. They also look for capacity review meetings in your incident management records." />
                      </div>
                    </div>

                  </div>
                </StepShell>
              ) : null}

              {currentStep === 7 ? (
                <StepShell
                  title="Operational Context"
                  description="Capture the tools, SLAs, and controls that drive both policy language and the evidence checklist your auditor will use. Everything here maps to a specific audit request."
                >
                  <div className="space-y-6">

                    {/* ── Systems & Providers ── */}
                    <div className="space-y-4 rounded-2xl bg-secondary/50 p-4">
                      <div>
                        <p className="text-sm font-medium text-foreground">Systems & providers <span className="font-normal text-xs text-muted-foreground">(CC6.3, CC6.4)</span></p>
                        <p className="mt-1 text-xs text-muted-foreground">These tool names appear verbatim in your generated policy documents and populate the evidence checklist your auditor will follow. Use the actual product name, not a category.</p>
                      </div>
                      {assessmentSummary.isFirstTimer && (
                        <FirstTimerTip tip="Don't overthink these — just name the actual tools you use today. Auditors verify what's documented matches what's in use, so accuracy matters more than sounding impressive." />
                      )}
                      <div className="grid gap-4 md:grid-cols-3">
                        <FormField control={form.control} name="operations.versionControlSystem" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Version control system</FormLabel>
                            <FormControl><Input {...field} placeholder="e.g., GitHub, GitLab, Bitbucket" /></FormControl>
                            <FormDescription>Where source code changes are tracked and reviewed.</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="operations.ticketingSystem" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Ticketing system</FormLabel>
                            <FormControl><Input {...field} placeholder="e.g., Jira, Linear, GitHub Issues" /></FormControl>
                            <FormDescription>Used to track changes, incidents, and access requests.</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="operations.onCallTool" render={({ field }) => (
                          <FormItem>
                            <FormLabel>On-call / alerting tool</FormLabel>
                            <FormControl><Input {...field} placeholder="e.g., PagerDuty, OpsGenie, Alertmanager" /></FormControl>
                            <FormDescription>Receives production alerts and pages the on-call engineer.</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <FormField control={form.control} name="operations.vcsProvider" render={({ field }) => (
                          <FormItem>
                            <FormLabel>VCS provider</FormLabel>
                            <FormControl>
                              <select {...field} className="h-11 w-full rounded-2xl border border-input bg-white px-4 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                                {vcsProviderOptions.map((provider) => (
                                  <option key={provider} value={provider}>{provider}</option>
                                ))}
                              </select>
                            </FormControl>
                            <FormDescription>Unlocks contextual "Show Me How" guides for branch protection and peer review controls.</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="operations.hrisProvider" render={({ field }) => (
                          <FormItem>
                            <FormLabel>HRIS provider</FormLabel>
                            <FormControl>
                              <select {...field} className="h-11 w-full rounded-2xl border border-input bg-white px-4 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                                {hrisProviderOptions.map((provider) => (
                                  <option key={provider} value={provider}>{provider}</option>
                                ))}
                              </select>
                            </FormControl>
                            <FormDescription>Where employee records, onboarding, and offboarding are managed.</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <FormField control={form.control} name="operations.terminationSlaHours" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Termination SLA (hours)</FormLabel>
                            <FormControl>
                              <Input type="number" min={1} max={168} value={field.value} onChange={(e) => field.onChange(Number(e.target.value))} />
                            </FormControl>
                            <FormDescription>How quickly access is revoked when an employee leaves. Auditors sample terminated employees and verify this window was met — 24–48h is typical for SOC 2.</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="operations.onboardingSlaDays" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Onboarding SLA (business days)</FormLabel>
                            <FormControl>
                              <Input type="number" min={1} max={30} value={field.value} onChange={(e) => field.onChange(Number(e.target.value))} />
                            </FormControl>
                            <FormDescription>How long until new hires complete security training and receive appropriate access. Drives onboarding evidence language in your policies.</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>
                      <AuditorLensCallout criterion="CC6.3" message="Auditors verify access provisioning and deprovisioning by pulling HRIS records and cross-referencing against IdP access logs. The termination SLA is a specific evidence point — they'll sample 5–10 terminations and check that access was removed within your stated window." />
                    </div>

                    {/* ── Access & Change Controls ── */}
                    <div className="space-y-1 rounded-2xl bg-secondary/50 p-4">
                      <p className="text-sm font-medium text-foreground">Access & change controls <span className="font-normal text-xs text-muted-foreground">(CC6.1, CC8.1)</span></p>
                      <p className="mb-3 text-xs text-muted-foreground">Check each toggle only if it reflects your actual operating state — these drive specific evidence checklist items and policy language. Auditors will request proof that each enabled control is enforced, not just documented.</p>
                      {assessmentSummary.isFirstTimer && (
                        <div className="mb-3">
                          <FirstTimerTip tip="MFA and peer review are the two controls auditors check first in nearly every SOC 2 engagement. If you have nothing else, these two should be your priority before the audit window opens." />
                        </div>
                      )}
                      <ControlRow
                        control={form.control}
                        name="operations.requiresMfa"
                        label="MFA is required for workforce or privileged access."
                        gap="Without enforced MFA, access to production systems is protected only by passwords — making phishing and credential stuffing attacks highly effective against your environment."
                        recommendation="Enforce MFA through your IdP (Okta, Entra ID, Google Workspace) via authentication policies. Apply to all workforce, not just admins. FIDO2/passkeys are the strongest option."
                      />
                      {getWarningRulesForField('operations', 'operations.requiresMfa').map((rule) => (
                        <RuleWarningCard key={rule.id} rule={rule} />
                      ))}
                      {getDeepDiveRulesForField('operations', 'operations.requiresMfa').map((rule) => (
                        <DeepDiveSelectCard key={rule.id} control={form.control} rule={rule} />
                      ))}
                      <ControlRow
                        control={form.control}
                        name="operations.requiresPeerReview"
                        label="Peer review is required before merging production-affecting changes."
                        gap="Without required peer review, a single developer can deploy unauthorized or untested changes to production — a fundamental CC8.1 change management gap."
                        recommendation="Enable branch protection in your VCS requiring at least one approving reviewer before merge. This creates an immutable audit trail of who reviewed each change."
                      />
                      {getWarningRulesForField('operations', 'operations.requiresPeerReview').map((rule) => (
                        <RuleWarningCard key={rule.id} rule={rule} />
                      ))}
                      {getDeepDiveRulesForField('operations', 'operations.requiresPeerReview').map((rule) => (
                        <DeepDiveSelectCard key={rule.id} control={form.control} rule={rule} />
                      ))}
                      <ControlRow
                        control={form.control}
                        name="operations.requiresCyberInsurance"
                        label="Cyber insurance is maintained as an operational risk control."
                        gap="Without cyber insurance, there is no financial backstop for breach response costs, ransomware, or regulatory fines — auditors view this as a risk management maturity gap."
                        recommendation="Work with your broker to obtain a cyber liability policy covering first-party costs (breach response, business interruption) and third-party coverage (customer notification, legal defense)."
                      />
                      <LoneWolfWarning
                        requiresPeerReview={form.watch('operations.requiresPeerReview')}
                        requiresMfa={form.watch('operations.requiresMfa')}
                      />
                      {hasActiveOperationsRule('operations-mfa-entra-guidance') && (
                        <ShowMeHow {...SHOW_ME_HOW_ENTRA_MFA} />
                      )}
                      {hasActiveOperationsRule('operations-mfa-okta-guidance') && (
                        <ShowMeHow {...SHOW_ME_HOW_OKTA_MFA} />
                      )}
                      {hasActiveOperationsRule('operations-peer-review-github-guidance') && (
                        <ShowMeHow {...SHOW_ME_HOW_GITHUB_BRANCH_PROTECTION} />
                      )}
                      {hasActiveOperationsRule('operations-peer-review-azure-guidance') && (
                        <ShowMeHow {...SHOW_ME_HOW_AZURE_DEVOPS_BRANCH_POLICY} />
                      )}
                      {hasActiveOperationsRule('operations-aws-scp-guidance') && (
                        <ShowMeHow {...SHOW_ME_HOW_AWS_SCPs} />
                      )}
                      <div className="pt-2">
                        <AuditorLensCallout criterion="CC8.1" message="MFA and peer review are among the most frequently sampled controls in a SOC 2 engagement. Auditors request screenshots of IdP authentication policy configuration and VCS branch protection settings — they verify controls are technically enforced, not just stated in policy." />
                      </div>
                    </div>

                    {/* ── Communication & Risk Management ── */}
                    <div className="space-y-1 rounded-2xl bg-secondary/50 p-4">
                      <p className="text-sm font-medium text-foreground">Communication & risk management <span className="font-normal text-xs text-muted-foreground">(CC2.2, CC2.3, CC3.2, CC3.3)</span></p>
                      <p className="mb-3 text-xs text-muted-foreground">These controls cover how you communicate security commitments to customers and how you identify and manage risk. Auditors look for documented processes, not perfection.</p>
                      {assessmentSummary.isFirstTimer && (
                        <div className="mb-3">
                          <FirstTimerTip tip="A risk register doesn't need to be sophisticated — even a Google Sheet with identified risks, likelihood, impact, and treatment decisions satisfies CC3.1–3.3 for a first-time audit." />
                        </div>
                      )}
                      <FormField control={form.control} name="operations.policyPublicationMethod" render={({ field }) => (
                        <FormItem className="mb-2">
                          <FormLabel>How are security policies published to employees?</FormLabel>
                          <FormControl>
                            <select {...field} className="h-11 w-full rounded-2xl border border-input bg-white px-4 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                              {policyPublicationMethodOptions.map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
                            </select>
                          </FormControl>
                          <FormDescription>Auditors request the URL or location where policies live and verify employees can access them. The method matters less than the accessibility and version control.</FormDescription>
                        </FormItem>
                      )} />
                      <ControlRow
                        control={form.control}
                        name="operations.hasCustomerContracts"
                        label="Standardized customer contracts, MSAs, or Terms of Service exist."
                        gap="Without documented customer agreements, there are no formal security or data handling commitments — a gap in how you communicate your security posture under CC2.2."
                        recommendation="Implement standardized MSAs or ToS that include data processing terms, liability limits, and your security posture commitments. These become evidence of formal, documented security obligations to customers."
                      />
                      <ControlRow
                        control={form.control}
                        name="operations.hasCustomerSupportChannel"
                        label="A documented customer support channel exists (support email, portal, etc.)."
                        gap="Without a documented support channel, customers have no way to report security concerns or incidents — CC2.3 requires you to communicate relevant security information to affected parties."
                        recommendation="Establish a documented support channel (security@, support portal, or ticketing). Publish it in your privacy policy and website footer. A dedicated security@ alias is easy to set up and demonstrates intent."
                      />
                      <ControlRow
                        control={form.control}
                        name="operations.hasReleaseNotePractice"
                        label="Change notifications or release notes are published to customers."
                        gap="Without customer change notifications, customers are unaware of changes that may affect their security or integrations — CC2.3 requires communicating system changes that impact user commitments."
                        recommendation="Publish a changelog (Notion page, status page announcements, or email newsletter). For security-relevant changes, direct email notification is stronger evidence than a passive changelog."
                      />
                      <ControlRow
                        control={form.control}
                        name="operations.hasRiskRegister"
                        label="A risk register or formal risk assessment document is maintained."
                        gap="Without a documented risk register, risk assessments exist only in someone's head — auditors need a written document to verify CC3.1–3.3 (risk identification, analysis, and response)."
                        recommendation="Maintain a spreadsheet or JIRA project listing identified risks, likelihood × impact scores, and treatment decisions. Review and update it at least annually. Even 10 rows is a meaningful starting point."
                      />
                      <ControlRow
                        control={form.control}
                        name="operations.includesFraudRiskInAssessment"
                        label="Fraud risk (intentional manipulation, control override) is included in risk assessments."
                        gap="Omitting fraud scenarios from your risk assessment is a CC3.3 gap — the AICPA explicitly requires organizations to consider the possibility of fraud when assessing risk."
                        recommendation="Add a fraud section to your risk register covering scenarios like employee privilege abuse, social engineering, and unauthorized insider access. Document mitigating controls (separation of duties, monitoring) for each."
                      />
                      <div className="pt-2">
                        <AuditorLensCallout criterion="CC3.2" message="Auditors review customer contracts, support ticket samples, and your risk register in detail. The risk register is particularly scrutinized — it should show risks identified, assessed (likelihood × impact), and treated with documented decisions. An empty or stale register is a common finding." />
                      </div>
                    </div>

                    {/* ── Confidentiality & Data Lifecycle ── */}
                    <div className="space-y-1 rounded-2xl bg-secondary/50 p-4">
                      <p className="text-sm font-medium text-foreground">Confidentiality & data lifecycle <span className="font-normal text-xs text-muted-foreground">(C1.1, C1.2)</span></p>
                      <p className="mb-3 text-xs text-muted-foreground">These controls govern how confidential information is protected from creation to destruction. They're required if you selected the Confidentiality TSC and are best practices regardless.</p>
                      {assessmentSummary.isFirstTimer && (
                        <div className="mb-3">
                          <FirstTimerTip tip="NDA collection at onboarding is the fastest win here — add it to your onboarding checklist and collect signatures through your HRIS. This alone closes the C1.1 gap that many first-timers miss." />
                        </div>
                      )}
                      <ControlRow
                        control={form.control}
                        name="operations.hasNdaProcess"
                        label="NDAs or confidentiality agreements are required for employees and contractors."
                        gap="Without signed confidentiality agreements, employees and contractors have no formal obligation not to disclose customer data — a direct C1.1 exposure."
                        recommendation="Require NDA or confidentiality agreement signatures during onboarding (or at offer stage for sensitive roles). Store signed copies in your HRIS or a document management system and include it in your onboarding checklist."
                      />
                      <ControlRow
                        control={form.control}
                        name="operations.dataRetentionDefined"
                        label="Data retention schedules are defined and documented for each data type."
                        gap="Without documented retention schedules, data is kept indefinitely by default — exposing you to both C1.2 (retention obligations) and Privacy TSC requirements if you handle personal data."
                        recommendation="Define retention periods for each data type: customer records, audit logs, backups, and support tickets. Document these in a data retention schedule and configure automated lifecycle rules (S3 lifecycle, Azure Blob lifecycle) where possible."
                      />
                      <ControlRow
                        control={form.control}
                        name="operations.hasDataDisposalProcedure"
                        label="Data disposal or destruction procedures exist with documented evidence."
                        gap="Without provable data destruction, end-of-life data may persist past agreed retention periods — creating C1.2 gaps and potential evidence of customer data retained beyond contractual commitments."
                        recommendation="Document your disposal process (secure delete, crypto shredding, or certified media destruction). For cloud, lifecycle rules + deletion API calls with logged confirmation events are auditor-acceptable evidence."
                      />
                      <div className="pt-2">
                        <AuditorLensCallout criterion="C1.2" message="Auditors sample onboarding records to verify NDA signatures, then cross-reference your data retention schedule against actual storage configurations. They test that data past its retention period is actually deleted — not just policy-stated. Lifecycle rule exports from your cloud provider are strong evidence." />
                      </div>
                    </div>

                    <AuditorLensCallout
                      criterion="CC9.2"
                      message="Every sub-service organization listed here becomes a row in your vendor-management matrix. Auditors will ask for due-diligence artifacts (SOC 2 reports, penetration test summaries) for each one. Include the role and data shared to generate accurate risk language."
                    />
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
                      <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                        <p className="font-semibold">Required fields missing</p>
                        <p className="mt-0.5 text-xs opacity-80">Fix these before generating — use the Edit buttons on the cards below to jump directly to each section.</p>
                        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs">
                          {reviewErrors.map((error) => (
                            <li key={error}>{error}</li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500">
                          <Check className="h-3.5 w-3.5 text-white" />
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-emerald-900">Ready to generate</p>
                          <p className="text-xs text-emerald-700">All required fields are present. Review the summary below, then proceed to Generate.</p>
                        </div>
                      </div>
                    )}

                    {/* Audit type summary */}
                    {(() => {
                      const auditType = watchedValues.company?.targetAuditType ?? 'unsure';
                      const auditLabels: Record<string, { label: string; color: string; note: string }> = {
                        type1: { label: 'SOC 2 Type I', color: 'text-emerald-700 bg-emerald-50 border-emerald-200', note: 'Point-in-time design assessment — ideal for organizations establishing their control environment.' },
                        type2: { label: 'SOC 2 Type II', color: 'text-blue-700 bg-blue-50 border-blue-200', note: 'Period-of-time operating effectiveness — the standard required by most enterprise customers.' },
                        unsure: { label: 'Audit type not yet decided', color: 'text-amber-700 bg-amber-50 border-amber-200', note: 'Generated policies satisfy both Type I and Type II requirements. Revisit this in Step 1.' },
                      };
                      const meta = auditLabels[auditType] ?? auditLabels.unsure;
                      return (
                        <div className={cn('flex items-start gap-3 rounded-2xl border p-4 text-sm', meta.color)}>
                          <div className="min-w-0 space-y-0.5">
                            <p className="font-semibold">Target audit: {meta.label}</p>
                            <p className="text-xs opacity-80">{meta.note}</p>
                          </div>
                          <button type="button" onClick={() => jumpToStep(0)} className="shrink-0 text-xs underline underline-offset-2 opacity-70 hover:opacity-100">Change</button>
                        </div>
                      );
                    })()}

                    <StepProgressCard completions={stepCompletions} onNavigateToStep={jumpToStep} />

                    <GapAnalysisCard summary={assessmentSummary} onNavigateToAssessment={() => jumpToStep(5)} />

                    <DecisionTraceCard items={decisionTraceItems} />

                    {reviewSummary ? (
                      <div className="grid gap-4 lg:grid-cols-2">

                        {/* Company */}
                        <Card>
                          <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-base">Company</CardTitle>
                            <button type="button" onClick={() => jumpToStep(0)} className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground">Edit</button>
                          </CardHeader>
                          <CardContent className="space-y-1.5">
                            <ReviewRow label="Company name" value={reviewSummary.company.name} required />
                            <ReviewRow
                              label="Org relationship"
                              value={reviewSummary.company.organizationRelationship === 'same-as-company' ? 'Workspace org is the company' : `Workspace org governs ${reviewSummary.company.name}`}
                            />
                            {reviewSummary.company.organizationRelationship === 'governing-company' ? (
                              <ReviewRow label="Workspace org" value={organization.name} />
                            ) : null}
                            <ReviewRow label="Website" value={reviewSummary.company.website} />
                            <ReviewRow label="Contact name" value={reviewSummary.company.primaryContactName} />
                            <ReviewRow label="Contact email" value={reviewSummary.company.primaryContactEmail} />
                            <ReviewRow label="Industry" value={reviewSummary.company.industry} />
                            <ReviewRow label="Compliance maturity" value={reviewSummary.company.complianceMaturity} />
                            <ReviewRow label="Target audit" value={reviewSummary.company.targetAuditType} />
                          </CardContent>
                        </Card>

                        {/* System Scope */}
                        <Card>
                          <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-base">System scope</CardTitle>
                            <button type="button" onClick={() => jumpToStep(2)} className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground">Edit</button>
                          </CardHeader>
                          <CardContent className="space-y-2">
                            <ReviewRow label="System name" value={reviewSummary.scope.systemName} required />
                            <ReviewRow label="Description" value={reviewSummary.scope.systemDescription} required />
                            <div>
                              <p className="mb-1 text-xs text-muted-foreground">Data types</p>
                              {reviewSummary.scope.dataTypesHandled.length > 0
                                ? <div className="flex flex-wrap gap-1.5">{reviewSummary.scope.dataTypesHandled.map((dt) => <Badge key={dt} variant="secondary" className="text-xs">{dt}</Badge>)}</div>
                                : <span className="text-xs italic text-muted-foreground/40">None selected</span>
                              }
                            </div>
                            <ReviewRow label="Tenancy" value={reviewSummary.scope.isMultiTenant ? 'Multi-tenant SaaS' : 'Single-tenant'} />
                          </CardContent>
                        </Card>

                        {/* TSC & Infrastructure */}
                        <Card>
                          <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-base">TSC & infrastructure</CardTitle>
                            <div className="flex gap-3">
                              <button type="button" onClick={() => jumpToStep(3)} className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground">Edit TSC</button>
                              <button type="button" onClick={() => jumpToStep(4)} className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground">Edit infra</button>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-2">
                            <div>
                              <p className="mb-1 text-xs text-muted-foreground">Trust Service Criteria</p>
                              <div className="flex flex-wrap gap-1.5">{selectedTsc.map((label) => <Badge key={label} className="text-xs">{label}</Badge>)}</div>
                            </div>
                            <ReviewRow label="Cloud providers" value={reviewSummary.infrastructure.cloudProviders?.join(', ') || reviewSummary.infrastructure.type || '—'} />
                            <ReviewRow label="Identity provider" value={reviewSummary.infrastructure.idpProvider} />
                            <ReviewRow label="Availability zones" value={reviewSummary.infrastructure.usesAvailabilityZones ? 'Yes' : 'No'} />
                            <ReviewRow label="VPN logging" value={reviewSummary.infrastructure.usesCloudVpn ? 'Enabled' : 'No'} />
                            {reviewSummary.infrastructure.hostsOwnHardware && (
                              <ReviewRow label="On-premises hardware" value="Yes" />
                            )}
                          </CardContent>
                        </Card>

                        {/* Governance & Training */}
                        <Card>
                          <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-base">Governance & training</CardTitle>
                            <button type="button" onClick={() => jumpToStep(1)} className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground">Edit</button>
                          </CardHeader>
                          <CardContent className="space-y-2">
                            <div className="flex flex-wrap gap-1.5">
                              {reviewSummary.governance.hasEmployeeHandbook && <Badge variant="secondary" className="text-xs">Employee handbook</Badge>}
                              {reviewSummary.governance.hasCodeOfConduct && <Badge variant="secondary" className="text-xs">Code of conduct</Badge>}
                              {reviewSummary.governance.hasDisciplinaryProcedures && <Badge variant="secondary" className="text-xs">Disciplinary procedures</Badge>}
                              {reviewSummary.governance.hasBoardOrAdvisory && <Badge variant="secondary" className="text-xs">Board / advisory</Badge>}
                              {reviewSummary.governance.hasDedicatedSecurityOfficer && <Badge variant="secondary" className="text-xs">{reviewSummary.governance.securityOfficerTitle || 'Security officer'}</Badge>}
                              {reviewSummary.governance.hasOrgChart && <Badge variant="secondary" className="text-xs">Org chart</Badge>}
                              {reviewSummary.governance.hasJobDescriptions && <Badge variant="secondary" className="text-xs">Job descriptions</Badge>}
                              {reviewSummary.governance.hasInternalAuditProgram && <Badge variant="secondary" className="text-xs">Internal audit</Badge>}
                            </div>
                            <ReviewRow label="Policy acknowledgement" value={reviewSummary.governance.acknowledgementCadence} />
                            <ReviewRow label="Training tool" value={reviewSummary.training.securityAwarenessTrainingTool || undefined} />
                            <ReviewRow label="Training cadence" value={reviewSummary.training.trainingCadence} />
                            {reviewSummary.training.hasPhishingSimulation && (
                              <ReviewRow label="Phishing sim" value={reviewSummary.training.phishingSimulationFrequency} />
                            )}
                          </CardContent>
                        </Card>

                        {/* Security Tooling */}
                        <Card>
                          <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-base">Security tooling</CardTitle>
                            <button type="button" onClick={() => jumpToStep(6)} className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground">Edit</button>
                          </CardHeader>
                          <CardContent className="space-y-2">
                            <div className="flex flex-wrap gap-1.5">
                              {reviewSummary.securityTooling.siemTool && <Badge variant="secondary" className="text-xs">SIEM: {reviewSummary.securityTooling.siemTool}</Badge>}
                              {reviewSummary.securityTooling.hasIdsIps && <Badge variant="secondary" className="text-xs">IDS/IPS</Badge>}
                              {reviewSummary.securityTooling.hasWaf && <Badge variant="secondary" className="text-xs">WAF</Badge>}
                              {reviewSummary.securityTooling.endpointProtectionTool && <Badge variant="secondary" className="text-xs">EPP: {reviewSummary.securityTooling.endpointProtectionTool}</Badge>}
                              {reviewSummary.securityTooling.hasMdm && <Badge variant="secondary" className="text-xs">MDM{reviewSummary.securityTooling.mdmTool ? `: ${reviewSummary.securityTooling.mdmTool}` : ''}</Badge>}
                              {reviewSummary.securityTooling.vulnerabilityScanningTool && <Badge variant="secondary" className="text-xs">Vuln scan: {reviewSummary.securityTooling.vulnerabilityScanningTool}</Badge>}
                              {reviewSummary.securityTooling.hasDast && <Badge variant="secondary" className="text-xs">DAST</Badge>}
                              {reviewSummary.securityTooling.monitoringTool && <Badge variant="secondary" className="text-xs">Monitoring: {reviewSummary.securityTooling.monitoringTool}</Badge>}
                              {reviewSummary.securityTooling.hasAutoscaling && <Badge variant="secondary" className="text-xs">Autoscaling</Badge>}
                            </div>
                            <ReviewRow label="Pen test frequency" value={reviewSummary.securityTooling.penetrationTestFrequency} />
                            <ReviewRow label="Log retention" value={`${reviewSummary.securityTooling.logRetentionDays} days`} />
                          </CardContent>
                        </Card>

                        {/* Operations */}
                        <Card>
                          <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-base">Operations</CardTitle>
                            <button type="button" onClick={() => jumpToStep(7)} className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground">Edit</button>
                          </CardHeader>
                          <CardContent className="space-y-2">
                            <ReviewRow label="Version control" value={reviewSummary.operations.versionControlSystem} />
                            <ReviewRow label="VCS provider" value={reviewSummary.operations.vcsProvider} />
                            <ReviewRow label="Ticketing" value={reviewSummary.operations.ticketingSystem} />
                            <ReviewRow label="On-call tool" value={reviewSummary.operations.onCallTool} />
                            <ReviewRow label="HRIS" value={reviewSummary.operations.hrisProvider} />
                            <ReviewRow label="Termination SLA" value={`${reviewSummary.operations.terminationSlaHours} hours`} />
                            <ReviewRow label="Onboarding SLA" value={`${reviewSummary.operations.onboardingSlaDays} business days`} />
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {reviewSummary.operations.requiresMfa && <Badge variant="secondary" className="text-xs">MFA required</Badge>}
                              {reviewSummary.operations.requiresPeerReview && <Badge variant="secondary" className="text-xs">Peer review</Badge>}
                              {reviewSummary.operations.requiresCyberInsurance && <Badge variant="secondary" className="text-xs">Cyber insurance</Badge>}
                              {reviewSummary.operations.hasRiskRegister && <Badge variant="secondary" className="text-xs">Risk register</Badge>}
                              {reviewSummary.operations.hasNdaProcess && <Badge variant="secondary" className="text-xs">NDAs</Badge>}
                              {reviewSummary.operations.dataRetentionDefined && <Badge variant="secondary" className="text-xs">Retention schedule</Badge>}
                            </div>
                            {reviewSummary.subservices.filter(s => s.name).length > 0 && (
                              <div className="space-y-1.5 pt-1">
                                <p className="text-xs text-muted-foreground">Subservice organizations</p>
                                {reviewSummary.subservices.filter(s => s.name).map((s) => (
                                  <div key={s.name} className="rounded-xl bg-secondary/60 px-3 py-2">
                                    <p className="text-xs font-medium text-foreground">{s.name}</p>
                                    <p className="text-[10px] text-muted-foreground">{s.role}{s.hasAssuranceReport ? ` · ${s.assuranceReportType}` : ' · No assurance report'}</p>
                                  </div>
                                ))}
                              </div>
                            )}
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
                    onNavigateToStep={jumpToStep}
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
