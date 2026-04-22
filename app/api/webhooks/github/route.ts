import { createHash, timingSafeEqual } from 'node:crypto';

import { NextResponse, type NextRequest } from 'next/server';
import { Octokit } from '@octokit/rest';

import { decryptIntegrationToken } from '@/lib/integrations/token-crypto';
import { applyRateLimit, webhookLimiter } from '@/lib/rate-limit';
import { createSupabaseServiceRoleClient } from '@/lib/supabase-service';

/**
 * GitHub Webhook handler.
 * Listens for:
 *  - pull_request (closed + merged) – ingests merged file content as revisions
 *  - create (tag) – can be used for audit snapshot triggers
 *
 * Verified via x-hub-signature-256 using the org's stored webhook_secret.
 */

function verifySignature(payload: string, signature: string, secret: string): boolean {
  const expected = `sha256=${createHash('sha256').update(payload).update(secret).digest('hex')}`;

  if (expected.length !== signature.length) {
    return false;
  }

  return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

function hashContent(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const event = request.headers.get('x-github-event');
  const signature = request.headers.get('x-hub-signature-256');
  const deliveryId = request.headers.get('x-github-delivery');

  if (!event || !signature || !rawBody) {
    return NextResponse.json({ error: 'Missing required webhook headers' }, { status: 400 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  // Extract repository info to find the matching integration
  const repository = payload.repository as { full_name?: string; owner?: { login?: string }; name?: string } | undefined;
  if (!repository?.owner?.login || !repository?.name) {
    return NextResponse.json({ error: 'Missing repository information' }, { status: 400 });
  }

  const repoOwner = repository.owner.login;
  const repoName = repository.name;

  const supabase = createSupabaseServiceRoleClient();

  // Find the matching integration
  const { data: integration, error: integrationError } = await supabase
    .from('organization_integrations')
    .select('id, organization_id, repo_owner, repo_name, encrypted_token, webhook_secret')
    .eq('provider', 'github')
    .eq('repo_owner', repoOwner)
    .eq('repo_name', repoName)
    .single();

  if (integrationError || !integration) {
    return NextResponse.json({ error: 'No matching integration found' }, { status: 404 });
  }

  // Verify webhook signature
  if (!integration.webhook_secret) {
    return NextResponse.json({ error: 'Webhook secret not configured for this integration' }, { status: 403 });
  }

  if (!verifySignature(rawBody, signature, integration.webhook_secret)) {
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 403 });
  }

  // Per-org rate limit: 60 webhook events/minute
  const rateLimitResponse = await applyRateLimit(webhookLimiter(), integration.organization_id);
  if (rateLimitResponse) return rateLimitResponse;

  // Route by event type
  if (event === 'pull_request') {
    return handlePullRequest(payload, integration, supabase);
  }

  if (event === 'create') {
    return handleCreateEvent(payload, integration, supabase, deliveryId);
  }

  return NextResponse.json({ status: 'ignored', event });
}

type Integration = {
  id: string;
  organization_id: string;
  repo_owner: string;
  repo_name: string;
  encrypted_token: string | null;
  webhook_secret: string | null;
};

async function handlePullRequest(
  payload: Record<string, unknown>,
  integration: Integration,
  supabase: ReturnType<typeof createSupabaseServiceRoleClient>,
) {
  const action = payload.action as string | undefined;
  const pullRequest = payload.pull_request as {
    number?: number;
    title?: string;
    merged?: boolean;
    merge_commit_sha?: string;
    html_url?: string;
    head?: { ref?: string };
    user?: { login?: string };
    merged_by?: { login?: string };
    requested_reviewers?: { login?: string }[];
    additions?: number;
    deletions?: number;
    changed_files?: number;
  } | undefined;

  // Only process merged PRs
  if (action !== 'closed' || !pullRequest?.merged || !pullRequest.merge_commit_sha) {
    return NextResponse.json({ status: 'ignored', reason: 'not a merged PR' });
  }

  const token = decryptIntegrationToken(integration.encrypted_token);
  if (!token) {
    return NextResponse.json({ error: 'Integration token not available' }, { status: 500 });
  }

  const octokit = new Octokit({ auth: token });
  const mergeCommitSha = pullRequest.merge_commit_sha;
  const prUrl = pullRequest.html_url ?? null;
  const authorLogin = pullRequest.user?.login ?? 'unknown';
  const mergerLogin = pullRequest.merged_by?.login ?? authorLogin;

  // Fetch actual reviewers (users who submitted reviews, not just requested)
  let reviewerLogins: string[] = [];
  if (pullRequest.number) {
    try {
      const { data: reviews } = await octokit.pulls.listReviews({
        owner: integration.repo_owner,
        repo: integration.repo_name,
        pull_number: pullRequest.number,
      });
      reviewerLogins = [...new Set(
        reviews
          .filter((r) => r.state === 'APPROVED' || r.state === 'CHANGES_REQUESTED')
          .map((r) => r.user?.login)
          .filter((login): login is string => !!login && login !== authorLogin),
      )];
    } catch {
      // Non-fatal: continue without reviewer data
    }
  }

  // Record in population list (upsert to handle re-deliveries)
  await supabase
    .from('vcs_merge_events')
    .upsert(
      {
        organization_id: integration.organization_id,
        integration_id: integration.id,
        pr_number: pullRequest.number ?? 0,
        pr_title: pullRequest.title ?? '',
        pr_url: prUrl,
        author_login: authorLogin,
        merger_login: mergerLogin,
        reviewer_logins: reviewerLogins,
        merge_commit_sha: mergeCommitSha,
        merged_at: new Date().toISOString(),
        files_changed: pullRequest.changed_files ?? 0,
        additions: pullRequest.additions ?? 0,
        deletions: pullRequest.deletions ?? 0,
      },
      { onConflict: 'integration_id,pr_number' },
    );

  // Get the files changed in this PR's merge commit
  const { data: commit } = await octokit.repos.getCommit({
    owner: integration.repo_owner,
    repo: integration.repo_name,
    ref: mergeCommitSha,
  });

  const changedFiles = (commit.files ?? []).filter(
    (file) => file.filename.endsWith('.md') && (file.status === 'modified' || file.status === 'added'),
  );

  if (!changedFiles.length) {
    return NextResponse.json({ status: 'ok', message: 'No markdown files changed', revisionsCreated: 0 });
  }

  // Load all generated docs for this org to match by filepath
  const { data: docs } = await supabase
    .from('generated_docs')
    .select('id, file_name, content_markdown, templates(slug)')
    .eq('organization_id', integration.organization_id)
    .in('status', ['approved', 'draft']);

  if (!docs?.length) {
    return NextResponse.json({ status: 'ok', message: 'No matching docs found', revisionsCreated: 0 });
  }

  let revisionsCreated = 0;

  for (const file of changedFiles) {
    // Match by filename (strip folder prefix)
    const baseName = file.filename.split('/').pop() ?? '';

    const matchingDoc = docs.find((doc) => {
      if (doc.file_name === baseName) return true;
      // Also try matching against the full path patterns used in export
      const template = Array.isArray(doc.templates) ? doc.templates[0] : doc.templates;
      const slug = template?.slug ?? '';
      let folder = 'policies';
      if (slug === 'evidence-checklist') folder = 'evidence-requests';
      if (slug === 'vendor-management-policy') folder = 'vendor-management';
      return file.filename === `${folder}/${doc.file_name}`;
    });

    if (!matchingDoc) continue;

    // Fetch the file content from GitHub at the merge commit
    const { data: fileContent } = await octokit.repos.getContent({
      owner: integration.repo_owner,
      repo: integration.repo_name,
      path: file.filename,
      ref: mergeCommitSha,
    });

    if (!('content' in fileContent) || !fileContent.content) continue;

    const decodedContent = Buffer.from(fileContent.content, 'base64').toString('utf-8');
    const newHash = hashContent(decodedContent);
    const existingHash = hashContent(matchingDoc.content_markdown);

    // Only create revision if content actually changed
    if (newHash === existingHash) continue;

    // Insert revision via service role (bypasses RLS)
    const { error: revisionError } = await supabase
      .from('document_revisions')
      .insert({
        document_id: matchingDoc.id,
        source: 'merged',
        content_markdown: decodedContent,
        content_hash: newHash,
        commit_sha: mergeCommitSha,
        pr_url: prUrl,
      });

    if (revisionError) continue;

    // Update the generated_docs content to match merged content
    await supabase
      .from('generated_docs')
      .update({ content_markdown: decodedContent })
      .eq('id', matchingDoc.id);

    // Log the merge event
    await supabase.from('audit_logs').insert({
      organization_id: integration.organization_id,
      action: 'pr.merged',
      entity_type: 'generated_doc',
      entity_id: matchingDoc.id,
      details: {
        commit_sha: mergeCommitSha,
        pr_url: prUrl,
        file: file.filename,
      },
      event_checksum: hashContent(`pr.merged:${matchingDoc.id}:${mergeCommitSha}:${Date.now()}`),
    });

    revisionsCreated++;
  }

  return NextResponse.json({ status: 'ok', revisionsCreated });
}

async function handleCreateEvent(
  payload: Record<string, unknown>,
  integration: Integration,
  supabase: ReturnType<typeof createSupabaseServiceRoleClient>,
  deliveryId: string | null,
) {
  const refType = payload.ref_type as string | undefined;
  const ref = payload.ref as string | undefined;

  if (refType !== 'tag' || !ref) {
    return NextResponse.json({ status: 'ignored', reason: 'not a tag creation' });
  }

  // Auto-create audit snapshot for tags matching "audit/*" pattern
  const isAuditTag = ref.startsWith('audit/');

  if (isAuditTag) {
    // Default to a 12-month audit period ending today
    const periodEnd = new Date();
    const periodStart = new Date();
    periodStart.setFullYear(periodStart.getFullYear() - 1);

    // Create the snapshot
    const { data: snapshot, error: snapshotError } = await supabase
      .from('audit_snapshots')
      .upsert(
        {
          organization_id: integration.organization_id,
          tag_name: ref,
          audit_period_start: periodStart.toISOString().split('T')[0],
          audit_period_end: periodEnd.toISOString().split('T')[0],
          description: `Auto-created from Git tag ${ref}`,
          commit_sha: null,
        },
        { onConflict: 'organization_id,tag_name' },
      )
      .select('id')
      .single();

    if (!snapshotError && snapshot) {
      // Freeze all currently approved document revisions into this snapshot
      const { data: approvedRevisions } = await supabase
        .from('document_revisions')
        .select('id, document_id')
        .eq('source', 'approved')
        .in(
          'document_id',
          (
            await supabase
              .from('generated_docs')
              .select('id')
              .eq('organization_id', integration.organization_id)
              .eq('status', 'approved')
          ).data?.map((d) => d.id) ?? [],
        );

      if (approvedRevisions?.length) {
        await supabase.from('audit_snapshot_revisions').upsert(
          approvedRevisions.map((rev) => ({
            snapshot_id: snapshot.id,
            revision_id: rev.id,
          })),
          { onConflict: 'snapshot_id,revision_id' },
        );
      }
    }
  }

  // Log the tag event
  await supabase.from('audit_logs').insert({
    organization_id: integration.organization_id,
    action: 'git.tag_created',
    entity_type: 'organization_integration',
    entity_id: integration.id,
    details: {
      tag: ref,
      delivery_id: deliveryId,
      auto_snapshot: isAuditTag,
    },
    event_checksum: hashContent(`git.tag_created:${integration.id}:${ref}:${Date.now()}`),
  });

  return NextResponse.json({ status: 'ok', tag: ref, auto_snapshot: isAuditTag });
}
