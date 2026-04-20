'use client';

import { ChevronDown, LogOut } from 'lucide-react';

import { signOut } from '@/app/(dashboard)/actions';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useOrg } from '@/components/providers/org-provider';

export function DashboardHeader() {
  const { email, organization } = useOrg();

  return (
    <header className="flex flex-col gap-4 border-b border-white/60 bg-white/75 px-4 py-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:px-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.26em] text-primary/70">Active Organization</p>
        <h2 className="mt-2 text-2xl font-semibold text-foreground">{organization?.name ?? 'No organization found'}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {organization ? `${organization.role} role · ${organization.id}` : 'Organization context unavailable'}
        </p>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="justify-between gap-3 rounded-2xl px-4">
            <span className="max-w-48 truncate text-left">{email ?? 'Authenticated user'}</span>
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64 rounded-2xl border border-border bg-white p-2 shadow-panel">
          <form action={signOut}>
            <DropdownMenuItem className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm outline-none hover:bg-accent" asChild>
              <button type="submit" className="w-full">
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </DropdownMenuItem>
          </form>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
