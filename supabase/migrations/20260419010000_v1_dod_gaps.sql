-- V1.0 DoD: population list, auto-snapshot, JCS canonicalization, system description

-- ─── VCS Merge Events (population list for SoD analysis) ────────────────────

create table public.vcs_merge_events (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  integration_id uuid not null references public.organization_integrations(id) on delete cascade,
  pr_number integer not null,
  pr_title text not null,
  pr_url text,
  author_login text not null,
  merger_login text not null,
  reviewer_logins text[] not null default '{}',
  is_self_merged boolean generated always as (author_login = merger_login) stored,
  has_review boolean generated always as (array_length(reviewer_logins, 1) > 0) stored,
  merge_commit_sha text not null,
  merged_at timestamp with time zone not null,
  files_changed integer not null default 0,
  additions integer not null default 0,
  deletions integer not null default 0,
  created_at timestamp with time zone not null default now()
);

create index vcs_merge_events_org_idx on public.vcs_merge_events(organization_id, merged_at desc);
create index vcs_merge_events_self_merged_idx on public.vcs_merge_events(organization_id) where is_self_merged;
create unique index vcs_merge_events_unique_pr_idx on public.vcs_merge_events(integration_id, pr_number);

comment on table public.vcs_merge_events is
  'Population list of all merged PRs. Auditors sample from this to test CC8.1 (Change Management) and Segregation of Duties.';
comment on column public.vcs_merge_events.is_self_merged is
  'True when the PR author and merger are the same person — a Segregation of Duties flag.';

-- ─── RLS for vcs_merge_events ───────────────────────────────────────────────

alter table public.vcs_merge_events enable row level security;

create policy "Members can read VCS merge events" on public.vcs_merge_events
  for select
  using (
    public.current_user_has_org_role(
      organization_id,
      array['admin', 'editor', 'viewer', 'approver']::public.org_role[]
    )
  );

-- Insert via service role only (from webhook handler)
