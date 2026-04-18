-- TrustScaffold initial schema
-- Section 2 – Database Schema (Supabase)

create extension if not exists "uuid-ossp";
create type org_role as enum ('admin', 'editor', 'viewer', 'approver');

create table organizations (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text unique not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  logo_url text,
  industry text,
  tsc_scope jsonb,
  cloud_config jsonb,
  system_description text,
  metadata jsonb default '{}'::jsonb
);

create table templates (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  tsc_category text not null,
  criteria_mapped text[],
  markdown_template text not null,
  is_active boolean default true
);

create table generated_docs (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid references organizations(id) on delete cascade,
  template_id uuid references templates(id) on delete restrict,
  title text not null,
  content_markdown text not null,
  version integer default 1,
  committed_to_repo boolean default false,
  repo_url text,
  pr_url text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table audit_logs (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid references organizations(id) on delete restrict,
  user_id uuid references auth.users(id) on delete restrict,
  action text not null,
  entity_type text,
  entity_id uuid,
  details jsonb,
  created_at timestamp with time zone default now()
);

-- organization_members join table (multi-user organizations)
create table organization_members (
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role org_role not null,
  created_at timestamp with time zone default now(),
  primary key (organization_id, user_id)
);

create index organization_members_user_id_idx on organization_members(user_id);
create index generated_docs_organization_id_idx on generated_docs(organization_id);
create index audit_logs_organization_id_idx on audit_logs(organization_id);

-- keep updated_at columns fresh
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger organizations_set_updated_at
before update on organizations
for each row execute function public.set_updated_at();

create trigger generated_docs_set_updated_at
before update on generated_docs
for each row execute function public.set_updated_at();

-- Enable RLS on all tables
alter table organizations enable row level security;
alter table templates enable row level security;
alter table generated_docs enable row level security;
alter table audit_logs enable row level security;
alter table organization_members enable row level security;

-- Section 1.1 + Section 2: tenant isolation via organization membership
create policy "Org members can read their own org" on organizations
  for select
  using (
    auth.uid() in (
      select om.user_id
      from organization_members om
      where om.organization_id = organizations.id
    )
  );

create policy "Org admins can update their own org" on organizations
  for update
  using (
    auth.uid() in (
      select om.user_id
      from organization_members om
      where om.organization_id = organizations.id
        and om.role = 'admin'
    )
  )
  with check (
    auth.uid() in (
      select om.user_id
      from organization_members om
      where om.organization_id = organizations.id
        and om.role = 'admin'
    )
  );

create policy "Org admins can delete their own org" on organizations
  for delete
  using (
    auth.uid() in (
      select om.user_id
      from organization_members om
      where om.organization_id = organizations.id
        and om.role = 'admin'
    )
  );

create policy "Authenticated users can create organizations" on organizations
  for insert
  with check (auth.uid() is not null);

create policy "Org members can read templates" on templates
  for select
  using (
    exists (
      select 1
      from organization_members om
      where om.user_id = auth.uid()
    )
  );

create policy "Users can access docs in their org" on generated_docs
  for all
  using (
    exists (
      select 1
      from organization_members om
      where om.organization_id = generated_docs.organization_id
        and om.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from organization_members om
      where om.organization_id = generated_docs.organization_id
        and om.user_id = auth.uid()
    )
  );

create policy "Users can access audit logs in their org" on audit_logs
  for select
  using (
    exists (
      select 1
      from organization_members om
      where om.organization_id = audit_logs.organization_id
        and om.user_id = auth.uid()
    )
  );

create policy "Users can create audit logs in their org" on audit_logs
  for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from organization_members om
      where om.organization_id = audit_logs.organization_id
        and om.user_id = auth.uid()
    )
  );

create policy "Users can view org memberships" on organization_members
  for select
  using (
    auth.uid() = user_id
    or exists (
      select 1
      from organization_members admin_member
      where admin_member.organization_id = organization_members.organization_id
        and admin_member.user_id = auth.uid()
        and admin_member.role = 'admin'
    )
  );

create policy "Admins can manage org memberships" on organization_members
  for all
  using (
    exists (
      select 1
      from organization_members admin_member
      where admin_member.organization_id = organization_members.organization_id
        and admin_member.user_id = auth.uid()
        and admin_member.role = 'admin'
    )
  )
  with check (
    exists (
      select 1
      from organization_members admin_member
      where admin_member.organization_id = organization_members.organization_id
        and admin_member.user_id = auth.uid()
        and admin_member.role = 'admin'
    )
  );
