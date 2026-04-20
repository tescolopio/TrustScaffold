'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { getDashboardContext } from '@/lib/auth/get-dashboard-context';
import { createSupabaseServiceRoleClient } from '@/lib/supabase-service';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import type { OrganizationRole } from '@/lib/types';

const validRoles: OrganizationRole[] = ['admin', 'editor', 'viewer', 'approver'];

function assertAdminContext(context: Awaited<ReturnType<typeof getDashboardContext>>) {
  if (!context?.organization) {
    redirect('/login');
  }

  const organization = context.organization;

  if (organization.role !== 'admin') {
    throw new Error('Only organization admins can manage team members');
  }

  return {
    ...context,
    organization,
  };
}

async function getAdminCountForOrg(organizationId: string) {
  const supabase = await createSupabaseServerClient();
  const { count, error } = await supabase
    .from('organization_members')
    .select('user_id', { head: true, count: 'exact' })
    .eq('organization_id', organizationId)
    .eq('role', 'admin');

  if (error) {
    throw new Error(`Unable to determine admin count: ${error.message}`);
  }

  return count ?? 0;
}

export async function createTeamMemberAction(formData: FormData) {
  const context = assertAdminContext(await getDashboardContext());
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const password = String(formData.get('password') ?? '').trim();
  const fullName = String(formData.get('full_name') ?? '').trim();
  const role = String(formData.get('role') ?? 'viewer') as OrganizationRole;

  if (!email || !password) {
    redirect('/team?error=Email%20and%20temporary%20password%20are%20required');
  }

  if (!validRoles.includes(role)) {
    redirect('/team?error=Invalid%20role%20selection');
  }

  const service = createSupabaseServiceRoleClient();
  const { data: createdUser, error: createUserError } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName || null,
      suppress_org_bootstrap: true,
    },
  });

  if (createUserError || !createdUser.user) {
    redirect(`/team?error=${encodeURIComponent(createUserError?.message ?? 'Unable to create user')}`);
  }

  const { error: membershipError } = await service.from('organization_members').insert({
    organization_id: context.organization.id,
    user_id: createdUser.user.id,
    role,
  });

  if (membershipError) {
    await service.auth.admin.deleteUser(createdUser.user.id);
    redirect(`/team?error=${encodeURIComponent(membershipError.message)}`);
  }

  revalidatePath('/team');
  redirect('/team?success=Team%20member%20created');
}

export async function updateTeamMemberRoleAction(formData: FormData) {
  const context = assertAdminContext(await getDashboardContext());
  const memberUserId = String(formData.get('member_user_id') ?? '').trim();
  const role = String(formData.get('role') ?? '').trim() as OrganizationRole;

  if (!memberUserId || !validRoles.includes(role)) {
    redirect('/team?error=Invalid%20member%20update');
  }

  if (memberUserId === context.userId && role !== 'admin') {
    const adminCount = await getAdminCountForOrg(context.organization.id);
    if (adminCount <= 1) {
      redirect('/team?error=You%20cannot%20demote%20the%20last%20admin');
    }
  }

  const service = createSupabaseServiceRoleClient();
  const { error } = await service
    .from('organization_members')
    .update({ role })
    .eq('organization_id', context.organization.id)
    .eq('user_id', memberUserId);

  if (error) {
    redirect(`/team?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath('/team');
  redirect('/team?success=Member%20role%20updated');
}

export async function removeTeamMemberAction(formData: FormData) {
  const context = assertAdminContext(await getDashboardContext());
  const memberUserId = String(formData.get('member_user_id') ?? '').trim();
  const memberRole = String(formData.get('member_role') ?? '').trim() as OrganizationRole;

  if (!memberUserId) {
    redirect('/team?error=Missing%20member%20identifier');
  }

  if (memberRole === 'admin') {
    const adminCount = await getAdminCountForOrg(context.organization.id);
    if (adminCount <= 1) {
      redirect('/team?error=You%20cannot%20remove%20the%20last%20admin');
    }
  }

  const service = createSupabaseServiceRoleClient();
  const { error } = await service
    .from('organization_members')
    .delete()
    .eq('organization_id', context.organization.id)
    .eq('user_id', memberUserId);

  if (error) {
    redirect(`/team?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath('/team');
  redirect('/team?success=Member%20removed');
}