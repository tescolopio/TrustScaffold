import 'server-only';

import { cache } from 'react';

import { createSupabaseServerClient } from '@/lib/supabase-server';
import type { DashboardContext, OrganizationSummary } from '@/lib/types';

export const getDashboardContext = cache(async (): Promise<DashboardContext | null> => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: memberships, error } = await supabase
    .from('organization_members')
    .select('role, organizations!inner(id, name, slug, metadata)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`Unable to load organization membership: ${error.message}`);
  }

  const firstMembership = memberships?.[0];
  const firstOrganization = Array.isArray(firstMembership?.organizations)
    ? firstMembership.organizations[0]
    : firstMembership?.organizations;

  const metadata = firstOrganization?.metadata && typeof firstOrganization.metadata === 'object'
    ? firstOrganization.metadata as Record<string, unknown>
    : {};
  const wizardAutosaveIntervalMinutes = (() => {
    const value = metadata.wizardAutosaveIntervalMinutes;

    return typeof value === 'number' && Number.isFinite(value) ? value : 5;
  })();

  const organization = firstMembership && firstOrganization
    ? {
        id: firstOrganization.id,
        name: firstOrganization.name,
        slug: firstOrganization.slug,
        role: firstMembership.role,
        wizardAutosaveIntervalMinutes,
      }
    : null;

  return {
    userId: user.id,
    email: user.email ?? null,
    organization: organization as OrganizationSummary | null,
  };
});
