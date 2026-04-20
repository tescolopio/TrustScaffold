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
    .select('role, organizations!inner(id, name, slug)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`Unable to load organization membership: ${error.message}`);
  }

  const firstMembership = memberships?.[0];
  const firstOrganization = Array.isArray(firstMembership?.organizations)
    ? firstMembership.organizations[0]
    : firstMembership?.organizations;

  const organization = firstMembership && firstOrganization
    ? {
        id: firstOrganization.id,
        name: firstOrganization.name,
        slug: firstOrganization.slug,
        role: firstMembership.role,
      }
    : null;

  return {
    userId: user.id,
    email: user.email ?? null,
    organization: organization as OrganizationSummary | null,
  };
});
