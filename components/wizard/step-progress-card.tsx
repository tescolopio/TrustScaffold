'use client';

import { ArrowRight, Check, Circle, CircleDashed } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { StepCompletion } from '@/lib/wizard/security-scoring';

interface StepProgressCardProps {
  completions: StepCompletion[];
  onNavigateToStep: (step: number) => void;
}

const statusConfig = {
  complete: {
    icon: <Check className="h-3.5 w-3.5" />,
    className: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200',
    label: 'Complete',
  },
  partial: {
    icon: <Circle className="h-3.5 w-3.5" />,
    className: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200',
    label: 'In progress',
  },
  empty: {
    icon: <CircleDashed className="h-3.5 w-3.5" />,
    className: 'border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-500/30 dark:bg-slate-500/10 dark:text-slate-200',
    label: 'Not started',
  },
} as const;

const completionSteps = [0, 1, 2, 3, 4, 5, 6, 7];

export function StepProgressCard({ completions, onNavigateToStep }: StepProgressCardProps) {
  const dataSteps = completions.filter((c) => completionSteps.includes(c.step));
  const totalComplete = dataSteps.filter((c) => c.status === 'complete').length;
  const totalPartial = dataSteps.filter((c) => c.status === 'partial').length;
  const incomplete = dataSteps.filter((c) => c.status !== 'complete');

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <CardTitle className="text-lg">Wizard Progress</CardTitle>
          <div className="flex items-center gap-2 rounded-full bg-secondary/60 px-3 py-1 text-xs font-medium text-foreground">
            <span className="text-emerald-600">{totalComplete}</span>
            <span className="text-muted-foreground">/</span>
            <span>{dataSteps.length} complete</span>
            {totalPartial > 0 && (
              <span className="ml-1 text-amber-500">· {totalPartial} in progress</span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Step list */}
        <ol className="space-y-2">
          {dataSteps.map((step) => {
            const config = statusConfig[step.status];
            return (
              <li key={step.step}>
                <button
                  type="button"
                  onClick={() => onNavigateToStep(step.step)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition-colors hover:bg-secondary/30',
                    config.className
                  )}
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-background/80 text-[11px] font-semibold text-foreground">
                    {step.step + 1}
                  </span>
                  <span className="flex-1 text-sm font-medium">{step.label}</span>
                  <span className="flex items-center gap-1.5 text-xs font-medium">
                    {config.icon}
                    {config.label}
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 opacity-40" />
                </button>
              </li>
            );
          })}
        </ol>

        {/* Quick actions for incomplete steps */}
        {incomplete.length > 0 && (
          <div className="rounded-2xl bg-secondary/40 p-3 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {incomplete.length} step{incomplete.length !== 1 ? 's' : ''} need attention
            </p>
            <div className="flex flex-wrap gap-2">
              {incomplete.map((step) => (
                <Button
                  key={step.step}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => onNavigateToStep(step.step)}
                >
                  {step.label}
                  <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              ))}
            </div>
          </div>
        )}

        {incomplete.length === 0 && (
          <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs font-medium text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
            <Check className="h-4 w-4" />
            All steps complete — ready to generate policies
          </div>
        )}
      </CardContent>
    </Card>
  );
}