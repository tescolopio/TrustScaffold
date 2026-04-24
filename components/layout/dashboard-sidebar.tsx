'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Check, Circle, CircleDashed, FileText, LayoutDashboard, Settings, ShieldCheck, Users } from 'lucide-react';

import { cn } from '@/lib/utils';
import { useWizardStore } from '@/lib/wizard/store';
import { wizardStepTitles } from '@/lib/wizard/schema';

export const dashboardNavigation = [
  { href: '/dashboard' as Route, label: 'Dashboard', icon: LayoutDashboard },
  { href: '/wizard' as Route, label: 'Policy Wizard', icon: ShieldCheck },
  { href: '/generated-docs' as Route, label: 'Generated Docs', icon: FileText },
  { href: '/team' as Route, label: 'Team', icon: Users },
  { href: '/settings' as Route, label: 'Settings', icon: Settings },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const currentStep = useWizardStore((state) => state.currentStep);
  const hasHydrated = useWizardStore((state) => state.hasHydrated);
  const setCurrentStep = useWizardStore((state) => state.setCurrentStep);
  const showWizardSteps = pathname === '/wizard';

  function jumpToWizardStep(step: number) {
    setCurrentStep(step);
    requestAnimationFrame(() => {
      document.getElementById('wizard-form-top')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  return (
    <aside className="hidden w-72 shrink-0 border-r border-white/60 bg-white/70 px-5 py-6 backdrop-blur dark:border-border dark:bg-card/80 lg:block">
      <div className="mb-8 px-3">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/70">TrustScaffold</p>
        <h1 className="mt-3 text-2xl font-semibold text-foreground">Compliance Workspace</h1>
        <p className="mt-2 text-sm text-muted-foreground">Secure-by-default scaffolding for policy generation and review.</p>
      </div>
      <nav className="space-y-2">
        {dashboardNavigation.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-colors',
                isActive ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-white hover:text-foreground'
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      {showWizardSteps ? (
        <div className="mt-8 space-y-3 border-t border-border/70 px-3 pt-6">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/70">Wizard Steps</p>
            <p className="text-xs text-muted-foreground">Desktop step navigation now lives here so the form keeps the full content width.</p>
          </div>
          <ol className="space-y-1.5">
            {wizardStepTitles.map((stepTitle, index) => {
              const statusIcon = !hasHydrated
                ? <CircleDashed className="h-3.5 w-3.5 text-slate-400" />
                : index < currentStep
                  ? <Check className="h-3.5 w-3.5 text-emerald-600" />
                  : index === currentStep
                    ? <Circle className="h-3.5 w-3.5 text-primary" />
                    : <CircleDashed className="h-3.5 w-3.5 text-slate-400" />;

              return (
                <li key={stepTitle}>
                  <button
                    type="button"
                    onClick={() => jumpToWizardStep(index)}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-left transition-colors hover:bg-secondary/60',
                      hasHydrated && index === currentStep ? 'bg-primary/10 text-foreground' : 'text-muted-foreground'
                    )}
                  >
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary/70 text-[11px] font-semibold text-foreground">
                      {index + 1}
                    </span>
                    <span className="flex-1 truncate text-xs font-medium">{stepTitle}</span>
                    {statusIcon}
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
      ) : null}
    </aside>
  );
}
