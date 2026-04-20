'use server';

import { randomBytes, createHash } from 'node:crypto';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { getDashboardContext } from '@/lib/auth/get-dashboard-context';
import { createSupabaseServerClient } from '@/lib/supabase-server';

function requireAdmin(role: string) {
  if (role !== 'admin') {
    redirect('/settings?error=Only%20admins%20can%20perform%20this%20action');
  }
}

// ─── Audit Snapshots ────────────────────────────────────────────────────────

export async function createAuditSnapshotAction(formData: FormData) {
  const context = await getDashboardContext();
  if (!context?.organization) redirect('/login');
  requireAdmin(context.organization.role);

  const tagName = String(formData.get('tag_name') ?? '').trim();
  const periodStart = String(formData.get('audit_period_start') ?? '').trim();
  const periodEnd = String(formData.get('audit_period_end') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim() || null;

  if (!tagName || !periodStart || !periodEnd) {
    redirect('/settings?error=Tag%20name%20and%20audit%20period%20dates%20are%20required');
  }

  const supabase = await createSupabaseServerClient();

  // Create the snapshot
  const { data: snapshot, error: snapshotError } = await supabase
    .from('audit_snapshots')
    .insert({
      organization_id: context.organization.id,
      tag_name: tagName,
      audit_period_start: periodStart,
      audit_period_end: periodEnd,
      description,
      created_by: context.userId,
    })
    .select('id')
    .single();

  if (snapshotError) {
    redirect(`/settings?error=${encodeURIComponent(snapshotError.message)}`);
  }

  // Freeze the latest revision for each approved doc into the snapshot
  const { data: approvedDocs } = await supabase
    .from('generated_docs')
    .select('id')
    .eq('organization_id', context.organization.id)
    .eq('status', 'approved');

  if (approvedDocs?.length) {
    for (const doc of approvedDocs) {
      const { data: latestRevision } = await supabase
        .from('document_revisions')
        .select('id')
        .eq('document_id', doc.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (latestRevision) {
        await supabase.from('audit_snapshot_revisions').insert({
          snapshot_id: snapshot.id,
          revision_id: latestRevision.id,
        });
      }
    }
  }

  revalidatePath('/settings');
  redirect(`/settings?success=${encodeURIComponent(`Audit snapshot "${tagName}" created with ${approvedDocs?.length ?? 0} frozen revisions`)}`);
}

// ─── Auditor Portal Tokens ──────────────────────────────────────────────────

export async function createAuditorPortalTokenAction(formData: FormData) {
  const context = await getDashboardContext();
  if (!context?.organization) redirect('/login');
  requireAdmin(context.organization.role);

  const snapshotId = String(formData.get('snapshot_id') ?? '').trim();
  const label = String(formData.get('label') ?? '').trim();
  const expiresInDays = Number(formData.get('expires_in_days') ?? '30');

  if (!snapshotId || !label) {
    redirect('/settings?error=Snapshot%20and%20label%20are%20required');
  }

  const rawToken = randomBytes(32).toString('hex');
  const tokenHash = createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString();

  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.from('auditor_portal_tokens').insert({
    organization_id: context.organization.id,
    snapshot_id: snapshotId,
    token_hash: tokenHash,
    label,
    expires_at: expiresAt,
    created_by: context.userId,
  });

  if (error) {
    redirect(`/settings?error=${encodeURIComponent(error.message)}`);
  }

  // Return the raw token in the success message (shown once)
  revalidatePath('/settings');
  redirect(`/settings?success=${encodeURIComponent(`Auditor portal token created. Copy this token now — it will not be shown again: ${rawToken}`)}`);
}

export async function revokeAuditorPortalTokenAction(formData: FormData) {
  const context = await getDashboardContext();
  if (!context?.organization) redirect('/login');
  requireAdmin(context.organization.role);

  const tokenId = String(formData.get('token_id') ?? '').trim();
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from('auditor_portal_tokens')
    .delete()
    .eq('id', tokenId)
    .eq('organization_id', context.organization.id);

  if (error) {
    redirect(`/settings?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath('/settings');
  redirect('/settings?success=Portal%20token%20revoked');
}

export async function promotePortalStageAction(formData: FormData) {
  const context = await getDashboardContext();
  if (!context?.organization) redirect('/login');
  requireAdmin(context.organization.role);

  const tokenId = String(formData.get('token_id') ?? '').trim();
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from('auditor_portal_tokens')
    .update({ stage: 'evidence' })
    .eq('id', tokenId)
    .eq('organization_id', context.organization.id);

  if (error) {
    redirect(`/settings?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath('/settings');
  redirect('/settings?success=Portal%20token%20promoted%20to%20Stage%202%20(Evidence%20Review)');
}

// ─── Organization API Keys ──────────────────────────────────────────────────

export async function createOrganizationApiKeyAction(formData: FormData) {
  const context = await getDashboardContext();
  if (!context?.organization) redirect('/login');
  requireAdmin(context.organization.role);

  const label = String(formData.get('label') ?? '').trim();

  if (!label) {
    redirect('/settings?error=API%20key%20label%20is%20required');
  }

  const rawKey = `ts_${randomBytes(32).toString('hex')}`;
  const keyHash = createHash('sha256').update(rawKey).digest('hex');
  const keyPrefix = rawKey.slice(0, 8);

  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.from('organization_api_keys').insert({
    organization_id: context.organization.id,
    key_hash: keyHash,
    key_prefix: keyPrefix,
    label,
    scopes: ['evidence:write'],
    created_by: context.userId,
  });

  if (error) {
    redirect(`/settings?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath('/settings');
  redirect(`/settings?success=${encodeURIComponent(`API key created. Copy this key now — it will not be shown again: ${rawKey}`)}`);
}

export async function revokeOrganizationApiKeyAction(formData: FormData) {
  const context = await getDashboardContext();
  if (!context?.organization) redirect('/login');
  requireAdmin(context.organization.role);

  const keyId = String(formData.get('key_id') ?? '').trim();
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from('organization_api_keys')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', keyId)
    .eq('organization_id', context.organization.id);

  if (error) {
    redirect(`/settings?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath('/settings');
  redirect('/settings?success=API%20key%20revoked');
}

// ─── Webhook Secret ─────────────────────────────────────────────────────────

export async function generateWebhookSecretAction(formData: FormData) {
  const context = await getDashboardContext();
  if (!context?.organization) redirect('/login');
  requireAdmin(context.organization.role);

  const integrationId = String(formData.get('integration_id') ?? '').trim();
  const webhookSecret = randomBytes(32).toString('hex');

  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from('organization_integrations')
    .update({ webhook_secret: webhookSecret })
    .eq('id', integrationId)
    .eq('organization_id', context.organization.id);

  if (error) {
    redirect(`/settings?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath('/settings');
  redirect(`/settings?success=${encodeURIComponent(`Webhook secret generated. Copy this secret now — configure it in GitHub: ${webhookSecret}`)}`);
}
