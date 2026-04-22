'use server';

import { revalidatePath } from 'next/cache';
import type { Route } from 'next';
import { redirect } from 'next/navigation';

import { encryptIntegrationToken } from '@/lib/integrations/token-crypto';
import { getDashboardContext } from '@/lib/auth/get-dashboard-context';
import { createSupabaseServerClient } from '@/lib/supabase-server';

import type { IntegrationProvider } from '@/lib/types';

const validProviders: IntegrationProvider[] = ['github', 'azure_devops'];

function buildSettingsRoute(query?: string) {
  if (!query) {
    return '/settings' as Route;
  }

  return `/settings?${query}` as never;
}

export async function saveIntegrationAction(formData: FormData) {
  const context = await getDashboardContext();

  if (!context?.organization) {
    redirect('/login');
  }

  if (context.organization.role !== 'admin') {
    redirect(buildSettingsRoute('error=Only%20admins%20can%20manage%20integrations'));
  }

  const provider = String(formData.get('provider') ?? '').trim() as IntegrationProvider;
  const repoOwner = String(formData.get('repo_owner') ?? '').trim();
  const repoName = String(formData.get('repo_name') ?? '').trim();
  const defaultBranch = String(formData.get('default_branch') ?? 'main').trim() || 'main';
  const token = String(formData.get('token') ?? '');

  if (!validProviders.includes(provider) || !repoOwner || !repoName) {
    redirect(buildSettingsRoute('error=Provider,%20repo%20owner,%20and%20repo%20name%20are%20required'));
  }

  const supabase = await createSupabaseServerClient();
  const { data: existing, error: existingError } = await supabase
    .from('organization_integrations')
    .select('id, encrypted_token')
    .eq('organization_id', context.organization.id)
    .eq('provider', provider)
    .maybeSingle();

  if (existingError) {
    redirect(buildSettingsRoute(`error=${encodeURIComponent(existingError.message)}`));
  }

  // Validate the token against the provider API before storing it
  if (token.trim()) {
    if (provider === 'github') {
      const resp = await fetch('https://api.github.com/user', {
        headers: { Authorization: `Bearer ${token}`, 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'TrustScaffold' },
      });
      if (!resp.ok) {
        redirect(buildSettingsRoute('error=GitHub+token+is+invalid+or+expired.+Verify+the+PAT+in+GitHub+Settings.'));
      }
      const scopeHeader = resp.headers.get('x-oauth-scopes') ?? '';
      const scopes = scopeHeader.split(',').map((s) => s.trim()).filter(Boolean);
      if (!scopes.includes('repo') && !scopes.some((s) => s.startsWith('repo'))) {
        redirect(buildSettingsRoute(`error=${encodeURIComponent(`Token validated but missing 'repo' scope. Found: ${scopes.join(', ') || 'none'}`)}`));
      }
    } else if (provider === 'azure_devops') {
      const b64 = Buffer.from(`:${token}`).toString('base64');
      const resp = await fetch(`https://dev.azure.com/${encodeURIComponent(repoOwner)}/_apis/projects?api-version=7.0`, {
        headers: { Authorization: `Basic ${b64}` },
      });
      if (!resp.ok) {
        redirect(buildSettingsRoute('error=Azure+DevOps+PAT+is+invalid+or+lacks+Code+(Read+%26+Write)+scope.'));
      }
    }
  }

  const encryptedToken = token.trim() ? encryptIntegrationToken(token) : existing?.encrypted_token ?? null;

  const { error } = await supabase.from('organization_integrations').upsert(
    {
      organization_id: context.organization.id,
      provider,
      repo_owner: repoOwner,
      repo_name: repoName,
      default_branch: defaultBranch,
      encrypted_token: encryptedToken,
    },
    {
      onConflict: 'organization_id,provider',
    }
  );

  if (error) {
    redirect(buildSettingsRoute(`error=${encodeURIComponent(error.message)}`));
  }

  revalidatePath('/settings');
  redirect(buildSettingsRoute('success=Integration%20saved'));
}

export async function deleteIntegrationTokenAction(formData: FormData) {
  const context = await getDashboardContext();

  if (!context?.organization) {
    redirect('/login');
  }

  if (context.organization.role !== 'admin') {
    redirect(buildSettingsRoute('error=Only%20admins%20can%20manage%20integrations'));
  }

  const integrationId = String(formData.get('integration_id') ?? '').trim();

  if (!integrationId) {
    redirect(buildSettingsRoute('error=Missing%20integration%20identifier'));
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from('organization_integrations')
    .update({ encrypted_token: null })
    .eq('id', integrationId)
    .eq('organization_id', context.organization.id);

  if (error) {
    redirect(buildSettingsRoute(`error=${encodeURIComponent(error.message)}`));
  }

  revalidatePath('/settings');
  redirect(buildSettingsRoute('success=Integration%20token%20deleted'));
}

export async function deleteIntegrationAction(formData: FormData) {
  const context = await getDashboardContext();

  if (!context?.organization) {
    redirect('/login');
  }

  if (context.organization.role !== 'admin') {
    redirect(buildSettingsRoute('error=Only%20admins%20can%20manage%20integrations'));
  }

  const integrationId = String(formData.get('integration_id') ?? '').trim();

  if (!integrationId) {
    redirect(buildSettingsRoute('error=Missing%20integration%20identifier'));
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from('organization_integrations')
    .delete()
    .eq('id', integrationId)
    .eq('organization_id', context.organization.id);

  if (error) {
    redirect(buildSettingsRoute(`error=${encodeURIComponent(error.message)}`));
  }

  revalidatePath('/settings');
  redirect(buildSettingsRoute('success=Integration%20deleted'));
}