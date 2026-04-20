import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { getDashboardContext } from '@/lib/auth/get-dashboard-context';
import { createSupabaseServiceRoleClient } from '@/lib/supabase-service';

import { createTeamMemberAction, removeTeamMemberAction, updateTeamMemberRoleAction } from './actions';

const roleOptions = ['admin', 'editor', 'approver', 'viewer'] as const;

export default async function TeamPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const context = await getDashboardContext();

  if (!context?.organization) {
    return null;
  }

  const resolvedSearchParams = (await searchParams) ?? {};
  const successMessage = typeof resolvedSearchParams.success === 'string' ? resolvedSearchParams.success : null;
  const errorMessage = typeof resolvedSearchParams.error === 'string' ? resolvedSearchParams.error : null;

  const service = createSupabaseServiceRoleClient();
  const { data: memberships, error: membershipError } = await service
    .from('organization_members')
    .select('user_id, role, created_at')
    .eq('organization_id', context.organization.id)
    .order('created_at', { ascending: true });

  if (membershipError) {
    throw new Error(`Unable to load organization members: ${membershipError.message}`);
  }

  const { data: authUsers, error: usersError } = await service.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (usersError) {
    throw new Error(`Unable to load auth users: ${usersError.message}`);
  }

  const usersById = new Map(authUsers.users.map((user) => [user.id, user]));
  const members = (memberships ?? []).map((membership) => {
    const authUser = usersById.get(membership.user_id);

    return {
      userId: membership.user_id,
      role: membership.role,
      createdAt: membership.created_at,
      email: authUser?.email ?? 'Unknown email',
      fullName: typeof authUser?.user_metadata?.full_name === 'string' ? authUser.user_metadata.full_name : null,
      lastSignInAt: authUser?.last_sign_in_at ?? null,
    };
  });

  const isAdmin = context.organization.role === 'admin';

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Team</CardTitle>
          <CardDescription>
            Multi-user organization access lives here. Admins can create accounts, assign roles, and remove members from {context.organization.name}.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <div className="flex flex-wrap gap-2">
            <Badge>Admins manage members and all org settings</Badge>
            <Badge variant="secondary">Editors can generate and revise drafts</Badge>
            <Badge variant="secondary">Approvers can approve documents</Badge>
            <Badge variant="outline">Viewers have read-only access</Badge>
          </div>
          {successMessage ? <p className="rounded-2xl bg-primary/10 px-4 py-3 text-primary">{successMessage}</p> : null}
          {errorMessage ? <p className="rounded-2xl bg-destructive/10 px-4 py-3 text-destructive">{errorMessage}</p> : null}
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>Organization Members</CardTitle>
            <CardDescription>Each member can log in with their own credentials. Role changes take effect on the next request.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!members.length ? (
              <p className="text-sm text-muted-foreground">No members are attached to this organization yet.</p>
            ) : (
              members.map((member) => (
                <div key={member.userId} className="rounded-2xl border border-border bg-white p-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-base font-semibold text-foreground">{member.fullName ?? member.email}</p>
                        <Badge variant={member.role === 'admin' ? 'default' : 'secondary'}>{member.role}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{member.email}</p>
                      <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                        Added {new Date(member.createdAt).toLocaleDateString()} · Last sign-in{' '}
                        {member.lastSignInAt ? new Date(member.lastSignInAt).toLocaleString() : 'never'}
                      </p>
                    </div>

                    {isAdmin ? (
                      <div className="flex flex-col gap-3 sm:flex-row">
                        <form action={updateTeamMemberRoleAction} className="flex items-center gap-2">
                          <input type="hidden" name="member_user_id" value={member.userId} />
                          <select
                            name="role"
                            defaultValue={member.role}
                            className="h-11 rounded-2xl border border-input bg-white px-4 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            {roleOptions.map((role) => (
                              <option key={role} value={role}>
                                {role}
                              </option>
                            ))}
                          </select>
                          <Button type="submit" variant="outline">Update role</Button>
                        </form>

                        <form action={removeTeamMemberAction}>
                          <input type="hidden" name="member_user_id" value={member.userId} />
                          <input type="hidden" name="member_role" value={member.role} />
                          <Button type="submit" variant="ghost">Remove</Button>
                        </form>
                      </div>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Create Member</CardTitle>
            <CardDescription>
              Basic v0.1 flow: an admin creates the user, sets a temporary password, and assigns the initial organization role.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isAdmin ? (
              <form action={createTeamMemberAction} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground" htmlFor="full_name">Full name</label>
                  <Input id="full_name" name="full_name" placeholder="Alex Reviewer" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground" htmlFor="email">Email</label>
                  <Input id="email" name="email" type="email" placeholder="alex@example.com" required />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground" htmlFor="password">Temporary password</label>
                  <Input id="password" name="password" type="text" placeholder="TrustScaffold!123" required />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground" htmlFor="role">Initial role</label>
                  <select
                    id="role"
                    name="role"
                    defaultValue="viewer"
                    className="h-11 w-full rounded-2xl border border-input bg-white px-4 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {roleOptions.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </div>
                <Button type="submit" className="w-full">Create member</Button>
              </form>
            ) : (
              <p className="text-sm text-muted-foreground">Only admins can create or manage organization members.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
