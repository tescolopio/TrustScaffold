import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { getDashboardContext } from '@/lib/auth/get-dashboard-context';
import { createSupabaseServerClient } from '@/lib/supabase-server';

import { deleteIntegrationAction, deleteIntegrationTokenAction, saveIntegrationAction } from './actions';
import {
  createAuditSnapshotAction,
  createAuditorPortalTokenAction,
  createOrganizationApiKeyAction,
  generateWebhookSecretAction,
  promotePortalStageAction,
  revokeAuditorPortalTokenAction,
  revokeOrganizationApiKeyAction,
} from './control-graph-actions';

export default async function SettingsPage({
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

  const supabase = await createSupabaseServerClient();
  const { data: integrations, error } = await supabase
    .from('organization_integrations')
    .select('id, provider, repo_owner, repo_name, default_branch, encrypted_token, webhook_secret, updated_at')
    .eq('organization_id', context.organization.id)
    .order('provider', { ascending: true });

  if (error) {
    throw new Error(`Unable to load integrations: ${error.message}`);
  }

  const isAdmin = context.organization.role === 'admin';

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Settings</CardTitle>
          <CardDescription>
            Configure per-organization delivery targets for approved documents. These settings are the foundation for the GitHub and Azure DevOps export actions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          {successMessage ? <p className="rounded-2xl bg-primary/10 px-4 py-3 text-primary">{successMessage}</p> : null}
          {errorMessage ? <p className="rounded-2xl bg-destructive/10 px-4 py-3 text-destructive">{errorMessage}</p> : null}
          <div className="flex flex-wrap gap-2">
            <Badge>Organization: {context.organization.name}</Badge>
            <Badge variant="secondary">Role: {context.organization.role}</Badge>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Configured Integrations</CardTitle>
            <CardDescription>Tokens are stored encrypted at the application layer and are never rendered back to the client.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!integrations?.length ? (
              <p className="text-sm text-muted-foreground">No GitOps targets configured yet.</p>
            ) : (
              integrations.map((integration) => (
                <div key={integration.id} className="rounded-2xl border border-border bg-white p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-base font-semibold text-foreground">{integration.provider}</p>
                    <Badge variant="secondary">{integration.repo_owner}/{integration.repo_name}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">Default branch: {integration.default_branch}</p>
                  <p className="text-sm text-muted-foreground">
                    {integration.provider === 'azure_devops'
                      ? 'Azure DevOps owner format: organization/project'
                      : 'GitHub owner format: org-or-user'}
                  </p>
                  <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                    Token configured: {integration.encrypted_token ? 'yes' : 'no'} · Updated {new Date(integration.updated_at).toLocaleString()}
                  </p>
                  {isAdmin ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      <form action={deleteIntegrationTokenAction}>
                        <input type="hidden" name="integration_id" value={integration.id} />
                        <Button type="submit" size="sm" variant="outline">Delete token</Button>
                      </form>
                      <form action={deleteIntegrationAction}>
                        <input type="hidden" name="integration_id" value={integration.id} />
                        <Button type="submit" size="sm" variant="ghost">Delete integration</Button>
                      </form>
                      {integration.provider === 'github' ? (
                        <form action={generateWebhookSecretAction}>
                          <input type="hidden" name="integration_id" value={integration.id} />
                          <Button type="submit" size="sm" variant="secondary">
                            {integration.webhook_secret ? 'Rotate' : 'Generate'} webhook secret
                          </Button>
                        </form>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Save Integration</CardTitle>
            <CardDescription>
              One target per provider per organization. This is admin-only because it controls where approved documents are delivered.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isAdmin ? (
              <form action={saveIntegrationAction} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground" htmlFor="provider">Provider</label>
                  <select
                    id="provider"
                    name="provider"
                    defaultValue="github"
                    className="h-11 w-full rounded-2xl border border-input bg-white px-4 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="github">GitHub</option>
                    <option value="azure_devops">Azure DevOps</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground" htmlFor="repo_owner">Repo owner / project</label>
                  <Input id="repo_owner" name="repo_owner" placeholder="acme-security or contoso/security-project" required />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground" htmlFor="repo_name">Repo name</label>
                  <Input id="repo_name" name="repo_name" placeholder="trustscaffold-docs" required />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground" htmlFor="default_branch">Default branch</label>
                  <Input id="default_branch" name="default_branch" defaultValue="main" required />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground" htmlFor="token">PAT / access token</label>
                  <Input id="token" name="token" type="password" placeholder="Paste a new token to set or rotate it" />
                </div>
                <p className="text-xs text-muted-foreground">
                  Saving with a new token rotates the existing credential. Leaving the token blank keeps the current encrypted token unchanged.
                </p>
                <Button type="submit" className="w-full">Save integration</Button>
              </form>
            ) : (
              <p className="text-sm text-muted-foreground">Only admins can configure GitOps targets.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <ControlGraphSection organizationId={context.organization.id} isAdmin={isAdmin} />
    </div>
  );
}

async function ControlGraphSection({ organizationId, isAdmin }: { organizationId: string; isAdmin: boolean }) {
  const supabase = await createSupabaseServerClient();

  const { data: snapshots } = await supabase
    .from('audit_snapshots')
    .select('id, tag_name, audit_period_start, audit_period_end, description, created_at')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });

  const { data: portalTokens } = await supabase
    .from('auditor_portal_tokens')
    .select('id, snapshot_id, label, expires_at, last_accessed_at, created_at, stage')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });

  const { data: apiKeys } = await supabase
    .from('organization_api_keys')
    .select('id, key_prefix, label, scopes, last_used_at, expires_at, revoked_at, created_at')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });

  return (
    <>
      {/* ─── Audit Snapshots ────────────────────────────────────────────── */}
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Audit Snapshots</CardTitle>
            <CardDescription>
              Point-in-time freezes that lock specific document revisions to an audit period. Each snapshot can be shared with auditors via a portal token.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!snapshots?.length ? (
              <p className="text-sm text-muted-foreground">No audit snapshots yet. Create one when ready for auditor review.</p>
            ) : (
              snapshots.map((snapshot) => (
                <div key={snapshot.id} className="rounded-2xl border border-border bg-white p-4">
                  <div className="flex items-center gap-2">
                    <Badge>{snapshot.tag_name}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {snapshot.audit_period_start} — {snapshot.audit_period_end}
                    </span>
                  </div>
                  {snapshot.description ? <p className="mt-2 text-sm text-muted-foreground">{snapshot.description}</p> : null}
                  <p className="mt-1 text-xs text-muted-foreground">Created {new Date(snapshot.created_at).toLocaleString()}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Create Snapshot</CardTitle>
            <CardDescription>
              Freezes the latest approved revision of every approved document into this snapshot.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isAdmin ? (
              <form action={createAuditSnapshotAction} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground" htmlFor="tag_name">Tag name</label>
                  <Input id="tag_name" name="tag_name" placeholder="audit-2026" required />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground" htmlFor="audit_period_start">Period start</label>
                    <Input id="audit_period_start" name="audit_period_start" type="date" required />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground" htmlFor="audit_period_end">Period end</label>
                    <Input id="audit_period_end" name="audit_period_end" type="date" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground" htmlFor="snapshot_description">Description (optional)</label>
                  <Input id="snapshot_description" name="description" placeholder="Annual SOC 2 Type II audit" />
                </div>
                <Button type="submit" className="w-full">Create snapshot</Button>
              </form>
            ) : (
              <p className="text-sm text-muted-foreground">Only admins can create audit snapshots.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ─── Auditor Portal Tokens ─────────────────────────────────────── */}
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Auditor Portal Tokens</CardTitle>
            <CardDescription>
              Time-boxed, read-only access tokens that let auditors view a snapshot via the public portal at <code className="rounded bg-secondary px-1 py-0.5 text-xs">/auditor/[token]</code>.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!portalTokens?.length ? (
              <p className="text-sm text-muted-foreground">No portal tokens created yet.</p>
            ) : (
              portalTokens.map((pt) => (
                <div key={pt.id} className="rounded-2xl border border-border bg-white p-4">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground">{pt.label}</p>
                    <Badge variant="secondary">
                      {new Date(pt.expires_at) < new Date() ? 'Expired' : 'Active'}
                    </Badge>
                    <Badge variant={pt.stage === 'evidence' ? 'default' : 'outline'} className="text-[10px]">
                      {pt.stage === 'evidence' ? 'Stage 2 — Evidence' : 'Stage 1 — Presentation'}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Expires: {new Date(pt.expires_at).toLocaleDateString()} · Last accessed: {pt.last_accessed_at ? new Date(pt.last_accessed_at).toLocaleString() : 'Never'}
                  </p>
                  {isAdmin ? (
                    <div className="mt-3 flex items-center gap-2">
                      {pt.stage !== 'evidence' && (
                        <form action={promotePortalStageAction}>
                          <input type="hidden" name="token_id" value={pt.id} />
                          <Button type="submit" size="sm" variant="outline">Promote to Stage 2</Button>
                        </form>
                      )}
                      <form action={revokeAuditorPortalTokenAction}>
                        <input type="hidden" name="token_id" value={pt.id} />
                        <Button type="submit" size="sm" variant="ghost">Revoke</Button>
                      </form>
                    </div>
                  ) : null}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Create Portal Token</CardTitle>
            <CardDescription>Generate a time-boxed token for an auditor to access a snapshot.</CardDescription>
          </CardHeader>
          <CardContent>
            {isAdmin && snapshots?.length ? (
              <form action={createAuditorPortalTokenAction} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground" htmlFor="portal_snapshot_id">Snapshot</label>
                  <select
                    id="portal_snapshot_id"
                    name="snapshot_id"
                    className="h-11 w-full rounded-2xl border border-input bg-white px-4 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    required
                  >
                    {snapshots.map((s) => (
                      <option key={s.id} value={s.id}>{s.tag_name} ({s.audit_period_start} — {s.audit_period_end})</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground" htmlFor="portal_label">Label</label>
                  <Input id="portal_label" name="label" placeholder="Deloitte Audit 2026" required />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground" htmlFor="portal_expires">Expires in (days)</label>
                  <Input id="portal_expires" name="expires_in_days" type="number" defaultValue="30" min="1" max="365" required />
                </div>
                <Button type="submit" className="w-full">Create portal token</Button>
              </form>
            ) : isAdmin ? (
              <p className="text-sm text-muted-foreground">Create an audit snapshot first before generating portal tokens.</p>
            ) : (
              <p className="text-sm text-muted-foreground">Only admins can create portal tokens.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ─── Organization API Keys ─────────────────────────────────────── */}
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Evidence API Keys</CardTitle>
            <CardDescription>
              API keys for CI/CD pipelines to submit evidence via <code className="rounded bg-secondary px-1 py-0.5 text-xs">POST /api/v1/evidence/ingest</code>.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!apiKeys?.length ? (
              <p className="text-sm text-muted-foreground">No API keys created yet.</p>
            ) : (
              apiKeys.map((key) => (
                <div key={key.id} className="rounded-2xl border border-border bg-white p-4">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground">{key.label}</p>
                    <Badge variant="secondary" className="font-mono text-xs">{key.key_prefix}...</Badge>
                    {key.revoked_at ? <Badge className="bg-red-100 text-red-700">Revoked</Badge> : <Badge className="bg-emerald-100 text-emerald-700">Active</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Scopes: {(key.scopes as string[]).join(', ')} · Last used: {key.last_used_at ? new Date(key.last_used_at).toLocaleString() : 'Never'}
                  </p>
                  {isAdmin && !key.revoked_at ? (
                    <form action={revokeOrganizationApiKeyAction} className="mt-3">
                      <input type="hidden" name="key_id" value={key.id} />
                      <Button type="submit" size="sm" variant="ghost">Revoke</Button>
                    </form>
                  ) : null}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Create API Key</CardTitle>
            <CardDescription>Generate an API key for your CI/CD pipeline to submit Steampipe or CloudQuery evidence.</CardDescription>
          </CardHeader>
          <CardContent>
            {isAdmin ? (
              <form action={createOrganizationApiKeyAction} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground" htmlFor="api_key_label">Label</label>
                  <Input id="api_key_label" name="label" placeholder="GitHub Actions – Steampipe runner" required />
                </div>
                <Button type="submit" className="w-full">Create API key</Button>
              </form>
            ) : (
              <p className="text-sm text-muted-foreground">Only admins can create API keys.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
