'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FileText, LayoutDashboard, Settings, ShieldCheck, Users } from 'lucide-react';

import { cn } from '@/lib/utils';

const navigation = [
  { href: '/dashboard' as Route, label: 'Dashboard', icon: LayoutDashboard },
  { href: '/wizard' as Route, label: 'Policy Wizard', icon: ShieldCheck },
  { href: '/generated-docs' as Route, label: 'Generated Docs', icon: FileText },
  { href: '/team' as Route, label: 'Team', icon: Users },
  { href: '/settings' as Route, label: 'Settings', icon: Settings },
];

export function DashboardSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-72 shrink-0 border-r border-white/60 bg-white/70 px-5 py-6 backdrop-blur lg:block">
      <div className="mb-8 px-3">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/70">TrustScaffold</p>
        <h1 className="mt-3 text-2xl font-semibold text-foreground">Compliance Workspace</h1>
        <p className="mt-2 text-sm text-muted-foreground">Secure-by-default scaffolding for policy generation and review.</p>
      </div>
      <nav className="space-y-2">
        {navigation.map((item) => {
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
    </aside>
  );
}
