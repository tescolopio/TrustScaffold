import { redirect } from 'next/navigation';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getDashboardContext } from '@/lib/auth/get-dashboard-context';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export default async function DashboardPage() {
  const context = await getDashboardContext();

  if (context?.organization) {
    const supabase = await createSupabaseServerClient();
    const { count, error } = await supabase
      .from('generated_docs')
      .select('id', { head: true, count: 'exact' })
      .eq('organization_id', context.organization.id);

    if (error) {
      throw new Error(`Unable to determine onboarding state: ${error.message}`);
    }

    if ((count ?? 0) === 0) {
      redirect('/wizard');
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <Card>
        <CardHeader>
          <CardTitle>Workspace Overview</CardTitle>
          <CardDescription>Phase 2 acceptance target: the authenticated dashboard resolves the active organization and role before rendering.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl bg-secondary/60 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/70">Organization ID</p>
            <p className="mt-3 break-all font-mono text-sm text-foreground">{context?.organization?.id}</p>
          </div>
          <div className="rounded-2xl bg-accent/60 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/70">Role</p>
            <p className="mt-3 text-lg font-semibold text-foreground">{context?.organization?.role}</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>MVP Delivery Notes</CardTitle>
          <CardDescription>Invite acceptance is intentionally deferred to v0.2. Phase 2 assumes single-player organizations or manual membership setup.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>Next milestone: persist wizard state and connect template generation to server actions.</p>
          <p>Current user: {context?.email}</p>
          <p>Active organization: {context?.organization?.name}</p>
        </CardContent>
      </Card>
    </div>
  );
}
