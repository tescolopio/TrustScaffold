create type public.integration_provider as enum ('github', 'azure_devops');

create table public.organization_integrations (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  provider public.integration_provider not null,
  repo_owner text not null,
  repo_name text not null,
  default_branch text not null default 'main',
  encrypted_token text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  unique (organization_id, provider)
);

create index organization_integrations_organization_id_idx on public.organization_integrations(organization_id);

create trigger organization_integrations_set_updated_at
before update on public.organization_integrations
for each row execute function public.set_updated_at();

alter table public.organization_integrations enable row level security;

create policy "Admins can manage organization integrations" on public.organization_integrations
  for all
  using (public.current_user_has_org_role(organization_id, array['admin']::public.org_role[]))
  with check (public.current_user_has_org_role(organization_id, array['admin']::public.org_role[]));

create or replace function public.approve_generated_document(p_document_id uuid)
returns public.generated_docs
language plpgsql
set search_path = public
as $$
declare
  target_doc public.generated_docs;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required to approve documents';
  end if;

  select *
    into target_doc
  from public.generated_docs
  where id = p_document_id;

  if not found then
    raise exception 'Generated document not found';
  end if;

  if not public.current_user_has_org_role(target_doc.organization_id, array['admin', 'approver']::public.org_role[]) then
    raise exception 'Only admins and approvers can approve documents';
  end if;

  update public.generated_docs
  set status = 'approved',
      approved_by = auth.uid(),
      approved_at = now()
  where id = p_document_id
  returning * into target_doc;

  perform public.append_audit_log(
    target_doc.organization_id,
    'document.approved',
    'generated_doc',
    target_doc.id,
    jsonb_build_object('version', target_doc.version, 'status', target_doc.status)
  );

  return target_doc;
end;
$$;

grant execute on function public.approve_generated_document(uuid) to authenticated;

create or replace function public.archive_generated_document(p_document_id uuid)
returns public.generated_docs
language plpgsql
set search_path = public
as $$
declare
  target_doc public.generated_docs;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required to archive documents';
  end if;

  select *
    into target_doc
  from public.generated_docs
  where id = p_document_id;

  if not found then
    raise exception 'Generated document not found';
  end if;

  if not public.current_user_has_org_role(target_doc.organization_id, array['admin']::public.org_role[]) then
    raise exception 'Only admins can archive documents';
  end if;

  update public.generated_docs
  set status = 'archived',
      approved_by = null,
      approved_at = null
  where id = p_document_id
  returning * into target_doc;

  perform public.append_audit_log(
    target_doc.organization_id,
    'document.archived',
    'generated_doc',
    target_doc.id,
    jsonb_build_object('version', target_doc.version, 'status', target_doc.status)
  );

  return target_doc;
end;
$$;

grant execute on function public.archive_generated_document(uuid) to authenticated;