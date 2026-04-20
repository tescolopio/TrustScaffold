-- ─── Auditor Portal Stages ──────────────────────────────────────────────────
-- Adds a stage column so admins can gate what auditors see:
--   'presentation' — Control design overview (Type I lens)
--   'evidence'     — Full documents, provenance & evidence (Type II lens)
-- Tokens start at 'presentation'; admins promote to 'evidence'.

create type public.portal_stage as enum ('presentation', 'evidence');

alter table public.auditor_portal_tokens
  add column stage public.portal_stage not null default 'presentation';

comment on column public.auditor_portal_tokens.stage is
  'Controls which audit phase the auditor can access. Admin-gated promotion.';
