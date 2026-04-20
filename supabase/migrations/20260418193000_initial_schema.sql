-- TrustScaffold initial schema
-- Section 2 – Database Schema (Supabase)

create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

create type public.org_role as enum ('admin', 'editor', 'viewer', 'approver');
create type public.doc_status as enum ('draft', 'in_review', 'approved', 'archived');

create table public.organizations (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text unique not null check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  logo_url text,
  industry text,
  tsc_scope jsonb,
  cloud_config jsonb,
  system_description text,
  metadata jsonb not null default '{}'::jsonb
);

create table public.templates (
  id uuid primary key default uuid_generate_v4(),
  slug text unique not null,
  name text not null,
  description text,
  tsc_category text not null,
  criteria_mapped text[] not null default '{}'::text[],
  output_filename_pattern text not null,
  markdown_template text not null,
  default_variables jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table public.generated_docs (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  template_id uuid not null references public.templates(id) on delete restrict,
  title text not null,
  file_name text not null,
  content_markdown text not null,
  input_payload jsonb not null default '{}'::jsonb,
  status public.doc_status not null default 'draft',
  version integer not null default 1 check (version > 0),
  committed_to_repo boolean not null default false,
  repo_url text,
  pr_url text,
  created_by uuid not null references auth.users(id) on delete restrict default auth.uid(),
  updated_by uuid not null references auth.users(id) on delete restrict default auth.uid(),
  approved_by uuid references auth.users(id) on delete restrict,
  approved_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  check (
    (status = 'approved' and approved_by is not null and approved_at is not null)
    or (status <> 'approved')
  )
);

create table public.audit_logs (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  details jsonb not null default '{}'::jsonb,
  previous_event_checksum text,
  event_checksum text not null,
  created_at timestamp with time zone not null default now(),
  check (char_length(trim(action)) > 0),
  check (char_length(trim(entity_type)) > 0)
);

create table public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.org_role not null,
  created_at timestamp with time zone not null default now(),
  primary key (organization_id, user_id)
);

create index organization_members_user_id_idx on public.organization_members(user_id);
create index generated_docs_organization_id_idx on public.generated_docs(organization_id);
create index generated_docs_template_id_idx on public.generated_docs(template_id);
create unique index generated_docs_single_draft_per_template_idx
  on public.generated_docs(organization_id, template_id)
  where status = 'draft';
create index audit_logs_organization_id_idx on public.audit_logs(organization_id, created_at desc);
create index templates_slug_idx on public.templates(slug);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.slugify(input text)
returns text
language sql
immutable
as $$
  select trim(both '-' from regexp_replace(lower(coalesce(input, '')), '[^a-z0-9]+', '-', 'g'));
$$;

create or replace function public.generate_unique_organization_slug(base_name text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_slug text;
  candidate_slug text;
  suffix integer := 0;
begin
  normalized_slug := nullif(public.slugify(base_name), '');

  if normalized_slug is null then
    normalized_slug := 'organization';
  end if;

  candidate_slug := normalized_slug;

  while exists (
    select 1
    from public.organizations org
    where org.slug = candidate_slug
  ) loop
    suffix := suffix + 1;
    candidate_slug := normalized_slug || '-' || suffix::text;
  end loop;

  return candidate_slug;
end;
$$;

create or replace function public.current_user_has_org_role(
  target_organization_id uuid,
  allowed_roles public.org_role[] default null
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members om
    where om.organization_id = target_organization_id
      and om.user_id = auth.uid()
      and (allowed_roles is null or om.role = any(allowed_roles))
  );
$$;

create or replace function public.enforce_generated_doc_write_constraints()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication is required to write generated documents';
  end if;

  if tg_op = 'INSERT' then
    new.created_by := coalesce(new.created_by, auth.uid());
    new.updated_by := auth.uid();

    if new.status <> 'draft' then
      raise exception 'New generated documents must start in draft status';
    end if;

    if new.approved_by is not null or new.approved_at is not null then
      raise exception 'Approval metadata may only be set during an approval action';
    end if;

    if new.committed_to_repo then
      raise exception 'Repository delivery metadata may only be set by server-side admin workflows';
    end if;

    return new;
  end if;

  if new.organization_id <> old.organization_id then
    raise exception 'organization_id is immutable';
  end if;

  if new.template_id <> old.template_id then
    raise exception 'template_id is immutable';
  end if;

  if new.created_by <> old.created_by then
    raise exception 'created_by is immutable';
  end if;

  new.updated_by := auth.uid();

  if (
    new.committed_to_repo is distinct from old.committed_to_repo
    or new.repo_url is distinct from old.repo_url
    or new.pr_url is distinct from old.pr_url
  ) and not public.current_user_has_org_role(new.organization_id, array['admin']::public.org_role[]) then
    raise exception 'Only org admins can update repository delivery metadata';
  end if;

  if (
    new.status is distinct from old.status
    or new.approved_by is distinct from old.approved_by
    or new.approved_at is distinct from old.approved_at
  ) then
    if new.status = 'approved' then
      if not public.current_user_has_org_role(new.organization_id, array['admin', 'approver']::public.org_role[]) then
        raise exception 'Only org approvers and admins can approve generated documents';
      end if;

      new.approved_by := coalesce(new.approved_by, auth.uid());
      new.approved_at := coalesce(new.approved_at, now());
      return new;
    end if;

    if not public.current_user_has_org_role(new.organization_id, array['admin', 'editor']::public.org_role[]) then
      raise exception 'Only org editors and admins can move documents outside approved status';
    end if;

    new.approved_by := null;
    new.approved_at := null;
    return new;
  end if;

  if not public.current_user_has_org_role(new.organization_id, array['admin', 'editor']::public.org_role[]) then
    raise exception 'Only org editors and admins can modify generated document content';
  end if;

  return new;
end;
$$;

create or replace function public.compute_audit_log_checksum()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  previous_checksum text;
begin
  new.created_at := coalesce(new.created_at, now());

  select al.event_checksum
    into previous_checksum
  from public.audit_logs al
  where al.organization_id = new.organization_id
  order by al.created_at desc, al.id desc
  limit 1;

  new.previous_event_checksum := previous_checksum;
  new.event_checksum := encode(
    extensions.digest(
      concat_ws(
        '|',
        new.organization_id::text,
        coalesce(new.actor_user_id::text, 'system'),
        new.action,
        new.entity_type,
        coalesce(new.entity_id::text, ''),
        coalesce(new.details::text, '{}'::text),
        new.created_at::text,
        coalesce(previous_checksum, '')
      ),
      'sha256'
    ),
    'hex'
  );

  return new;
end;
$$;

create or replace function public.prevent_audit_log_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'audit_logs is append-only and cannot be modified';
end;
$$;

create or replace function public.audit_entity_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  affected_organization_id uuid;
  affected_entity_id uuid;
  payload jsonb;
begin
  if tg_table_name = 'organizations' then
    affected_organization_id := coalesce(new.id, old.id);
    affected_entity_id := coalesce(new.id, old.id);
    payload := jsonb_build_object(
      'name', coalesce(new.name, old.name),
      'slug', coalesce(new.slug, old.slug)
    );
  elsif tg_table_name = 'generated_docs' then
    affected_organization_id := coalesce(new.organization_id, old.organization_id);
    affected_entity_id := coalesce(new.id, old.id);
    payload := jsonb_build_object(
      'title', coalesce(new.title, old.title),
      'file_name', coalesce(new.file_name, old.file_name),
      'status', coalesce(new.status::text, old.status::text),
      'version', coalesce(new.version, old.version)
    );
  elsif tg_table_name = 'organization_members' then
    affected_organization_id := coalesce(new.organization_id, old.organization_id);
    affected_entity_id := null;
    payload := jsonb_build_object(
      'member_user_id', coalesce(new.user_id, old.user_id),
      'role', coalesce(new.role::text, old.role::text)
    );
  else
    return coalesce(new, old);
  end if;

  insert into public.audit_logs (
    organization_id,
    actor_user_id,
    action,
    entity_type,
    entity_id,
    details
  )
  values (
    affected_organization_id,
    auth.uid(),
    lower(tg_table_name) || '.' || lower(tg_op),
    tg_table_name,
    affected_entity_id,
    jsonb_build_object(
      'operation', lower(tg_op),
      'data', payload
    )
  );

  return coalesce(new, old);
end;
$$;

create or replace function public.append_audit_log(
  p_organization_id uuid,
  p_action text,
  p_entity_type text,
  p_entity_id uuid default null,
  p_details jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_audit_log_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required to append audit logs';
  end if;

  if not public.current_user_has_org_role(
    p_organization_id,
    array['admin', 'editor', 'viewer', 'approver']::public.org_role[]
  ) then
    raise exception 'Not authorized to append audit logs for this organization';
  end if;

  insert into public.audit_logs (
    organization_id,
    actor_user_id,
    action,
    entity_type,
    entity_id,
    details
  )
  values (
    p_organization_id,
    auth.uid(),
    p_action,
    p_entity_type,
    p_entity_id,
    coalesce(p_details, '{}'::jsonb)
  )
  returning id into new_audit_log_id;

  return new_audit_log_id;
end;
$$;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  organization_name text;
  organization_slug text;
  created_organization_id uuid;
begin
  if coalesce((new.raw_user_meta_data ->> 'suppress_org_bootstrap')::boolean, false) then
    return new;
  end if;

  organization_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'organization_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'company_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    split_part(new.email, '@', 1),
    'My Organization'
  );

  organization_slug := public.generate_unique_organization_slug(organization_name);

  insert into public.organizations (
    name,
    slug,
    created_by,
    metadata
  )
  values (
    organization_name,
    organization_slug,
    new.id,
    jsonb_build_object(
      'bootstrap_source', 'auth_signup',
      'bootstrap_user_id', new.id,
      'bootstrap_email', new.email
    )
  )
  returning id into created_organization_id;

  insert into public.organization_members (
    organization_id,
    user_id,
    role
  )
  values (
    created_organization_id,
    new.id,
    'admin'
  );

  return new;
end;
$$;

create trigger organizations_set_updated_at
before update on public.organizations
for each row execute function public.set_updated_at();

create trigger templates_set_updated_at
before update on public.templates
for each row execute function public.set_updated_at();

create trigger generated_docs_set_updated_at
before update on public.generated_docs
for each row execute function public.set_updated_at();

create trigger generated_docs_write_guard
before insert or update on public.generated_docs
for each row execute function public.enforce_generated_doc_write_constraints();

create trigger audit_logs_checksum_trigger
before insert on public.audit_logs
for each row execute function public.compute_audit_log_checksum();

create trigger audit_logs_prevent_update
before update or delete on public.audit_logs
for each row execute function public.prevent_audit_log_mutation();

create trigger organizations_audit_trigger
after insert or update or delete on public.organizations
for each row execute function public.audit_entity_change();

create trigger generated_docs_audit_trigger
after insert or update or delete on public.generated_docs
for each row execute function public.audit_entity_change();

create trigger organization_members_audit_trigger
after insert or update or delete on public.organization_members
for each row execute function public.audit_entity_change();

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

alter table public.organizations enable row level security;
alter table public.templates enable row level security;
alter table public.generated_docs enable row level security;
alter table public.audit_logs enable row level security;
alter table public.organization_members enable row level security;

revoke all on table public.audit_logs from anon, authenticated;
grant select on table public.audit_logs to authenticated;
grant execute on function public.append_audit_log(uuid, text, text, uuid, jsonb) to authenticated;

create policy "Members can read their organizations" on public.organizations
  for select
  using (
    public.current_user_has_org_role(
      id,
      array['admin', 'editor', 'viewer', 'approver']::public.org_role[]
    )
  );

create policy "Admins can update their organizations" on public.organizations
  for update
  using (public.current_user_has_org_role(id, array['admin']::public.org_role[]))
  with check (public.current_user_has_org_role(id, array['admin']::public.org_role[]));

create policy "Admins can delete their organizations" on public.organizations
  for delete
  using (public.current_user_has_org_role(id, array['admin']::public.org_role[]));

create policy "Authenticated users can read active templates" on public.templates
  for select
  using (auth.uid() is not null and is_active = true);

create policy "Members can read generated docs in their organization" on public.generated_docs
  for select
  using (
    public.current_user_has_org_role(
      organization_id,
      array['admin', 'editor', 'viewer', 'approver']::public.org_role[]
    )
  );

create policy "Editors can create draft generated docs" on public.generated_docs
  for insert
  with check (
    public.current_user_has_org_role(
      organization_id,
      array['admin', 'editor']::public.org_role[]
    )
    and status = 'draft'
    and approved_by is null
    and approved_at is null
    and committed_to_repo = false
  );

create policy "Editors can revise non-approved generated docs" on public.generated_docs
  for update
  using (
    public.current_user_has_org_role(
      organization_id,
      array['admin', 'editor']::public.org_role[]
    )
    and status in ('draft', 'in_review', 'archived')
  )
  with check (
    public.current_user_has_org_role(
      organization_id,
      array['admin', 'editor']::public.org_role[]
    )
    and status in ('draft', 'in_review', 'archived')
    and approved_by is null
    and approved_at is null
  );

create policy "Approvers can approve generated docs" on public.generated_docs
  for update
  using (
    public.current_user_has_org_role(
      organization_id,
      array['admin', 'approver']::public.org_role[]
    )
  )
  with check (
    public.current_user_has_org_role(
      organization_id,
      array['admin', 'approver']::public.org_role[]
    )
    and status = 'approved'
    and approved_by is not null
    and approved_at is not null
  );

create policy "Admins can record repository delivery metadata" on public.generated_docs
  for update
  using (public.current_user_has_org_role(organization_id, array['admin']::public.org_role[]))
  with check (public.current_user_has_org_role(organization_id, array['admin']::public.org_role[]));

create policy "Admins can delete generated docs" on public.generated_docs
  for delete
  using (public.current_user_has_org_role(organization_id, array['admin']::public.org_role[]));

create policy "Members can read audit logs for their organization" on public.audit_logs
  for select
  using (
    public.current_user_has_org_role(
      organization_id,
      array['admin', 'editor', 'viewer', 'approver']::public.org_role[]
    )
  );

create policy "Members can view organization memberships" on public.organization_members
  for select
  using (
    public.current_user_has_org_role(
      organization_id,
      array['admin', 'editor', 'viewer', 'approver']::public.org_role[]
    )
  );

create policy "Admins can manage organization memberships" on public.organization_members
  for all
  using (public.current_user_has_org_role(organization_id, array['admin']::public.org_role[]))
  with check (public.current_user_has_org_role(organization_id, array['admin']::public.org_role[]));
