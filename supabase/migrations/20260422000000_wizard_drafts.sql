-- Persists the wizard payload server-side so drafts survive port changes,
-- device switches, and browser storage clears. One row per organization;
-- upserted on every step advance.

create table public.wizard_drafts (
  id               uuid        primary key default gen_random_uuid(),
  organization_id  uuid        not null references public.organizations(id) on delete cascade,
  payload          jsonb       not null default '{}'::jsonb,
  schema_version   integer     not null default 6,
  current_step     integer     not null default 0,
  updated_at       timestamptz not null default now(),
  constraint wizard_drafts_organization_id_unique unique (organization_id)
);

create index wizard_drafts_organization_id_idx on public.wizard_drafts(organization_id);

-- Auto-update updated_at on upsert
create or replace function public.touch_wizard_draft()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger wizard_drafts_touch
  before update on public.wizard_drafts
  for each row execute procedure public.touch_wizard_draft();

-- ── RLS ───────────────────────────────────────────────────────────────────────
alter table public.wizard_drafts enable row level security;

-- Any org member can read their draft
create policy "Members can read their org wizard draft"
  on public.wizard_drafts for select
  using (public.current_user_has_org_role(organization_id, array['admin','editor','viewer']::public.org_role[]));

-- Editors and admins can create
create policy "Editors can insert wizard draft"
  on public.wizard_drafts for insert
  with check (public.current_user_has_org_role(organization_id, array['admin','editor']::public.org_role[]));

-- Editors and admins can update
create policy "Editors can update wizard draft"
  on public.wizard_drafts for update
  using (public.current_user_has_org_role(organization_id, array['admin','editor']::public.org_role[]));
