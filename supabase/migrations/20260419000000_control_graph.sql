-- Control Graph schema: revision ledger, evidence artifacts, audit snapshots, auditor portal, API keys

-- ─── New Enums ──────────────────────────────────────────────────────────────

create type public.revision_source as enum ('generated', 'reviewer_edited', 'approved', 'exported', 'merged');
create type public.evidence_status as enum ('PASS', 'FAIL', 'ERROR', 'UNKNOWN');

-- ─── Document Revisions (immutable ledger) ──────────────────────────────────

create table public.document_revisions (
  id uuid primary key default uuid_generate_v4(),
  document_id uuid not null references public.generated_docs(id) on delete cascade,
  source public.revision_source not null,
  content_markdown text not null,
  content_hash text not null,
  commit_sha text,
  pr_url text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamp with time zone not null default now()
);

create index document_revisions_document_id_idx on public.document_revisions(document_id, created_at desc);
create index document_revisions_commit_sha_idx on public.document_revisions(commit_sha) where commit_sha is not null;

-- ─── Organization API Keys (evidence ingestion auth) ────────────────────────

create table public.organization_api_keys (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  key_hash text not null,
  key_prefix text not null,
  label text not null,
  scopes text[] not null default '{evidence:write}'::text[],
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamp with time zone not null default now(),
  last_used_at timestamp with time zone,
  expires_at timestamp with time zone,
  revoked_at timestamp with time zone
);

create index organization_api_keys_org_idx on public.organization_api_keys(organization_id);
create index organization_api_keys_prefix_idx on public.organization_api_keys(key_prefix);

-- ─── Evidence Artifacts ─────────────────────────────────────────────────────

create table public.evidence_artifacts (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  control_mapping text not null,
  artifact_name text not null,
  status public.evidence_status not null,
  collection_tool text not null,
  source_system text not null,
  run_id text not null,
  raw_data_hash text not null,
  storage_path text not null,
  collected_at timestamp with time zone not null,
  ingested_at timestamp with time zone not null default now(),
  created_at timestamp with time zone not null default now()
);

create index evidence_artifacts_org_idx on public.evidence_artifacts(organization_id);
create index evidence_artifacts_control_idx on public.evidence_artifacts(organization_id, control_mapping);
create index evidence_artifacts_run_idx on public.evidence_artifacts(run_id);

-- ─── Audit Snapshots (point-in-time freezes) ────────────────────────────────

create table public.audit_snapshots (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  tag_name text not null,
  audit_period_start date not null,
  audit_period_end date not null,
  description text,
  commit_sha text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamp with time zone not null default now(),
  unique (organization_id, tag_name),
  check (audit_period_end > audit_period_start)
);

create index audit_snapshots_org_idx on public.audit_snapshots(organization_id);

-- ─── Audit Snapshot Revisions (join table) ──────────────────────────────────

create table public.audit_snapshot_revisions (
  snapshot_id uuid not null references public.audit_snapshots(id) on delete cascade,
  revision_id uuid not null references public.document_revisions(id) on delete cascade,
  primary key (snapshot_id, revision_id)
);

-- ─── Auditor Portal Tokens (time-boxed access) ─────────────────────────────

create table public.auditor_portal_tokens (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  snapshot_id uuid not null references public.audit_snapshots(id) on delete cascade,
  token_hash text not null unique,
  label text not null,
  expires_at timestamp with time zone not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamp with time zone not null default now(),
  last_accessed_at timestamp with time zone
);

create index auditor_portal_tokens_hash_idx on public.auditor_portal_tokens(token_hash);
create index auditor_portal_tokens_org_idx on public.auditor_portal_tokens(organization_id);

-- ─── Add webhook_secret to integrations ─────────────────────────────────────

alter table public.organization_integrations
  add column if not exists webhook_secret text;

-- ─── RLS for new tables ─────────────────────────────────────────────────────

alter table public.document_revisions enable row level security;
alter table public.organization_api_keys enable row level security;
alter table public.evidence_artifacts enable row level security;
alter table public.audit_snapshots enable row level security;
alter table public.audit_snapshot_revisions enable row level security;
alter table public.auditor_portal_tokens enable row level security;

-- document_revisions: members can read, editors/admins can insert
create policy "Members can read document revisions" on public.document_revisions
  for select
  using (
    exists (
      select 1 from public.generated_docs gd
      where gd.id = document_revisions.document_id
        and public.current_user_has_org_role(
              gd.organization_id,
              array['admin', 'editor', 'viewer', 'approver']::public.org_role[]
            )
    )
  );

create policy "Editors can insert document revisions" on public.document_revisions
  for insert
  with check (
    exists (
      select 1 from public.generated_docs gd
      where gd.id = document_revisions.document_id
        and public.current_user_has_org_role(
              gd.organization_id,
              array['admin', 'editor']::public.org_role[]
            )
    )
  );

-- organization_api_keys: admins only
create policy "Admins can manage API keys" on public.organization_api_keys
  for all
  using (public.current_user_has_org_role(organization_id, array['admin']::public.org_role[]))
  with check (public.current_user_has_org_role(organization_id, array['admin']::public.org_role[]));

-- evidence_artifacts: members can read, insert via service role
create policy "Members can read evidence artifacts" on public.evidence_artifacts
  for select
  using (
    public.current_user_has_org_role(
      organization_id,
      array['admin', 'editor', 'viewer', 'approver']::public.org_role[]
    )
  );

-- audit_snapshots: members can read, admins can manage
create policy "Members can read audit snapshots" on public.audit_snapshots
  for select
  using (
    public.current_user_has_org_role(
      organization_id,
      array['admin', 'editor', 'viewer', 'approver']::public.org_role[]
    )
  );

create policy "Admins can manage audit snapshots" on public.audit_snapshots
  for all
  using (public.current_user_has_org_role(organization_id, array['admin']::public.org_role[]))
  with check (public.current_user_has_org_role(organization_id, array['admin']::public.org_role[]));

-- audit_snapshot_revisions: inherit read from snapshot
create policy "Members can read snapshot revisions" on public.audit_snapshot_revisions
  for select
  using (
    exists (
      select 1 from public.audit_snapshots s
      where s.id = audit_snapshot_revisions.snapshot_id
        and public.current_user_has_org_role(
              s.organization_id,
              array['admin', 'editor', 'viewer', 'approver']::public.org_role[]
            )
    )
  );

create policy "Admins can manage snapshot revisions" on public.audit_snapshot_revisions
  for all
  using (
    exists (
      select 1 from public.audit_snapshots s
      where s.id = audit_snapshot_revisions.snapshot_id
        and public.current_user_has_org_role(s.organization_id, array['admin']::public.org_role[])
    )
  )
  with check (
    exists (
      select 1 from public.audit_snapshots s
      where s.id = audit_snapshot_revisions.snapshot_id
        and public.current_user_has_org_role(s.organization_id, array['admin']::public.org_role[])
    )
  );

-- auditor_portal_tokens: admins can manage
create policy "Admins can manage auditor portal tokens" on public.auditor_portal_tokens
  for all
  using (public.current_user_has_org_role(organization_id, array['admin']::public.org_role[]))
  with check (public.current_user_has_org_role(organization_id, array['admin']::public.org_role[]));

-- ─── Helper: insert a document revision and return it ───────────────────────

create or replace function public.insert_document_revision(
  p_document_id uuid,
  p_source public.revision_source,
  p_content_markdown text,
  p_commit_sha text default null,
  p_pr_url text default null
)
returns public.document_revisions
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  rev public.document_revisions;
  org_id uuid;
begin
  select gd.organization_id into org_id
  from public.generated_docs gd
  where gd.id = p_document_id;

  if not found then
    raise exception 'Generated document not found';
  end if;

  insert into public.document_revisions (
    document_id, source, content_markdown, content_hash, commit_sha, pr_url, created_by
  )
  values (
    p_document_id,
    p_source,
    p_content_markdown,
    encode(extensions.digest(p_content_markdown, 'sha256'), 'hex'),
    p_commit_sha,
    p_pr_url,
    auth.uid()
  )
  returning * into rev;

  perform public.append_audit_log(
    org_id,
    'document.revision_created',
    'document_revision',
    rev.id,
    jsonb_build_object('source', p_source::text, 'document_id', p_document_id)
  );

  return rev;
end;
$$;

grant execute on function public.insert_document_revision(uuid, public.revision_source, text, text, text) to authenticated;

-- ─── Supabase Storage bucket for evidence ───────────────────────────────────
-- Only create if storage schema exists (disabled in minimal local dev configs)

do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'storage' and table_name = 'buckets') then
    insert into storage.buckets (id, name, public)
    values ('evidence', 'evidence', false)
    on conflict (id) do nothing;

    execute format(
      'do $p$ begin if not exists (select 1 from pg_policies where schemaname = %L and tablename = %L and policyname = %L) then '
      'create policy %I on storage.objects for all using (bucket_id = %L) with check (bucket_id = %L); end if; end $p$',
      'storage', 'objects', 'Service role can manage evidence storage',
      'Service role can manage evidence storage', 'evidence', 'evidence'
    );
  else
    raise notice 'storage.buckets does not exist — skipping evidence bucket creation';
  end if;
end $$;
