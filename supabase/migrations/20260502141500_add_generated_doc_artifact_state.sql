alter table public.generated_docs
  add column if not exists artifact_state jsonb not null default '[]'::jsonb,
  add column if not exists artifact_state_updated_at timestamp with time zone;

update public.generated_docs
set artifact_state = '[]'::jsonb
where artifact_state is null;