-- ═══════════════════════════════════════════════════════════════════════════════
-- TrustScaffold V1.0 — Staging Seed Data
--
-- Creates a target-rich environment for E2E testing and red-team engagements:
--   • 3 organizations (Acme Corp, Beta Inc, Gamma LLC)
--   • 4 users per org (admin, editor, viewer, approver)
--   • Pre-compiled drafts and approved documents
--   • API keys, integration configs, evidence artifacts, audit snapshots
--
-- Prerequisites:
--   1. Migrations and normal seed.sql already applied
--   2. Run: psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" \
--            -f tests/seed-staging.sql
--
-- All test user passwords: TestPassword1!
-- ═══════════════════════════════════════════════════════════════════════════════

BEGIN;

-- ── Deterministic UUIDs for referencing across the script ────────────────────

-- Organizations
\set org_acme  '''a0000000-0000-4000-a000-000000000001'''
\set org_beta  '''b0000000-0000-4000-b000-000000000002'''
\set org_gamma '''c0000000-0000-4000-c000-000000000003'''

-- Users (Acme)
\set user_acme_admin    '''aa000000-0000-4000-a000-000000000001'''
\set user_acme_editor   '''aa000000-0000-4000-a000-000000000002'''
\set user_acme_viewer   '''aa000000-0000-4000-a000-000000000003'''
\set user_acme_approver '''aa000000-0000-4000-a000-000000000004'''

-- Users (Beta)
\set user_beta_admin    '''bb000000-0000-4000-b000-000000000001'''
\set user_beta_editor   '''bb000000-0000-4000-b000-000000000002'''
\set user_beta_viewer   '''bb000000-0000-4000-b000-000000000003'''
\set user_beta_approver '''bb000000-0000-4000-b000-000000000004'''

-- Users (Gamma)
\set user_gamma_admin   '''cc000000-0000-4000-c000-000000000001'''
\set user_gamma_editor  '''cc000000-0000-4000-c000-000000000002'''
\set user_gamma_viewer  '''cc000000-0000-4000-c000-000000000003'''
\set user_gamma_approver '''cc000000-0000-4000-c000-000000000004'''

-- Documents
\set doc_acme_isp     '''d0000000-0000-4000-a000-000000000001'''
\set doc_acme_ac      '''d0000000-0000-4000-a000-000000000002'''
\set doc_acme_ir      '''d0000000-0000-4000-a000-000000000003'''
\set doc_beta_isp     '''d0000000-0000-4000-b000-000000000001'''
\set doc_gamma_isp    '''d0000000-0000-4000-c000-000000000001'''

-- Revisions
\set rev_acme_isp_gen '''e0000000-0000-4000-a000-000000000001'''
\set rev_acme_isp_app '''e0000000-0000-4000-a000-000000000002'''
\set rev_acme_ac_gen  '''e0000000-0000-4000-a000-000000000003'''
\set rev_acme_ir_gen  '''e0000000-0000-4000-a000-000000000004'''
\set rev_beta_isp_gen '''e0000000-0000-4000-b000-000000000001'''

-- Integrations / API Keys / Snapshots / Tokens
\set integ_acme       '''f0000000-0000-4000-a000-000000000001'''
\set apikey_acme      '''f1000000-0000-4000-a000-000000000001'''
\set apikey_beta      '''f1000000-0000-4000-b000-000000000001'''
\set snapshot_acme    '''f2000000-0000-4000-a000-000000000001'''
\set portal_acme      '''f3000000-0000-4000-a000-000000000001'''

-- Evidence
\set evidence_acme_1  '''f4000000-0000-4000-a000-000000000001'''
\set evidence_acme_2  '''f4000000-0000-4000-a000-000000000002'''


-- ═══════════════════════════════════════════════════════════════════════════════
-- AUTH USERS (Supabase auth.users)
-- ═══════════════════════════════════════════════════════════════════════════════
-- Password hash for 'TestPassword1!' using bcrypt
-- Generated via: SELECT extensions.crypt('TestPassword1!', extensions.gen_salt('bf'));

DO $$
DECLARE
  pw_hash text;
BEGIN
  pw_hash := extensions.crypt('TestPassword1!', extensions.gen_salt('bf'));

  -- Acme users
  INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, role, aud, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change, email_change_token_new, email_change_token_current, reauthentication_token)
  VALUES
    ('aa000000-0000-4000-a000-000000000001', '00000000-0000-0000-0000-000000000000', 'admin@acme.test',    pw_hash, now(), 'authenticated', 'authenticated', '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Acme Admin"}'::jsonb,    now(), now(), '', '', '', '', '', ''),
    ('aa000000-0000-4000-a000-000000000002', '00000000-0000-0000-0000-000000000000', 'editor@acme.test',   pw_hash, now(), 'authenticated', 'authenticated', '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Acme Editor"}'::jsonb,   now(), now(), '', '', '', '', '', ''),
    ('aa000000-0000-4000-a000-000000000003', '00000000-0000-0000-0000-000000000000', 'viewer@acme.test',   pw_hash, now(), 'authenticated', 'authenticated', '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Acme Viewer"}'::jsonb,   now(), now(), '', '', '', '', '', ''),
    ('aa000000-0000-4000-a000-000000000004', '00000000-0000-0000-0000-000000000000', 'approver@acme.test', pw_hash, now(), 'authenticated', 'authenticated', '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Acme Approver"}'::jsonb, now(), now(), '', '', '', '', '', '')
  ON CONFLICT (id) DO NOTHING;

  -- Beta users
  INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, role, aud, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change, email_change_token_new, email_change_token_current, reauthentication_token)
  VALUES
    ('bb000000-0000-4000-b000-000000000001', '00000000-0000-0000-0000-000000000000', 'admin@beta.test',    pw_hash, now(), 'authenticated', 'authenticated', '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Beta Admin"}'::jsonb,    now(), now(), '', '', '', '', '', ''),
    ('bb000000-0000-4000-b000-000000000002', '00000000-0000-0000-0000-000000000000', 'editor@beta.test',   pw_hash, now(), 'authenticated', 'authenticated', '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Beta Editor"}'::jsonb,   now(), now(), '', '', '', '', '', ''),
    ('bb000000-0000-4000-b000-000000000003', '00000000-0000-0000-0000-000000000000', 'viewer@beta.test',   pw_hash, now(), 'authenticated', 'authenticated', '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Beta Viewer"}'::jsonb,   now(), now(), '', '', '', '', '', ''),
    ('bb000000-0000-4000-b000-000000000004', '00000000-0000-0000-0000-000000000000', 'approver@beta.test', pw_hash, now(), 'authenticated', 'authenticated', '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Beta Approver"}'::jsonb, now(), now(), '', '', '', '', '', '')
  ON CONFLICT (id) DO NOTHING;

  -- Gamma users
  INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, role, aud, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change, email_change_token_new, email_change_token_current, reauthentication_token)
  VALUES
    ('cc000000-0000-4000-c000-000000000001', '00000000-0000-0000-0000-000000000000', 'admin@gamma.test',    pw_hash, now(), 'authenticated', 'authenticated', '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Gamma Admin"}'::jsonb,    now(), now(), '', '', '', '', '', ''),
    ('cc000000-0000-4000-c000-000000000002', '00000000-0000-0000-0000-000000000000', 'editor@gamma.test',   pw_hash, now(), 'authenticated', 'authenticated', '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Gamma Editor"}'::jsonb,   now(), now(), '', '', '', '', '', ''),
    ('cc000000-0000-4000-c000-000000000003', '00000000-0000-0000-0000-000000000000', 'viewer@gamma.test',   pw_hash, now(), 'authenticated', 'authenticated', '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Gamma Viewer"}'::jsonb,   now(), now(), '', '', '', '', '', ''),
    ('cc000000-0000-4000-c000-000000000004', '00000000-0000-0000-0000-000000000000', 'approver@gamma.test', pw_hash, now(), 'authenticated', 'authenticated', '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Gamma Approver"}'::jsonb, now(), now(), '', '', '', '', '', '')
  ON CONFLICT (id) DO NOTHING;

  -- auth.identities (required by Supabase auth)
  INSERT INTO auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
  VALUES
    ('aa000000-0000-4000-a000-000000000001', 'aa000000-0000-4000-a000-000000000001', 'admin@acme.test',    'email', '{"sub":"aa000000-0000-4000-a000-000000000001","email":"admin@acme.test"}'::jsonb,    now(), now(), now()),
    ('aa000000-0000-4000-a000-000000000002', 'aa000000-0000-4000-a000-000000000002', 'editor@acme.test',   'email', '{"sub":"aa000000-0000-4000-a000-000000000002","email":"editor@acme.test"}'::jsonb,   now(), now(), now()),
    ('aa000000-0000-4000-a000-000000000003', 'aa000000-0000-4000-a000-000000000003', 'viewer@acme.test',   'email', '{"sub":"aa000000-0000-4000-a000-000000000003","email":"viewer@acme.test"}'::jsonb,   now(), now(), now()),
    ('aa000000-0000-4000-a000-000000000004', 'aa000000-0000-4000-a000-000000000004', 'approver@acme.test', 'email', '{"sub":"aa000000-0000-4000-a000-000000000004","email":"approver@acme.test"}'::jsonb, now(), now(), now()),
    ('bb000000-0000-4000-b000-000000000001', 'bb000000-0000-4000-b000-000000000001', 'admin@beta.test',    'email', '{"sub":"bb000000-0000-4000-b000-000000000001","email":"admin@beta.test"}'::jsonb,    now(), now(), now()),
    ('bb000000-0000-4000-b000-000000000002', 'bb000000-0000-4000-b000-000000000002', 'editor@beta.test',   'email', '{"sub":"bb000000-0000-4000-b000-000000000002","email":"editor@beta.test"}'::jsonb,   now(), now(), now()),
    ('bb000000-0000-4000-b000-000000000003', 'bb000000-0000-4000-b000-000000000003', 'viewer@beta.test',   'email', '{"sub":"bb000000-0000-4000-b000-000000000003","email":"viewer@beta.test"}'::jsonb,   now(), now(), now()),
    ('bb000000-0000-4000-b000-000000000004', 'bb000000-0000-4000-b000-000000000004', 'approver@beta.test', 'email', '{"sub":"bb000000-0000-4000-b000-000000000004","email":"approver@beta.test"}'::jsonb, now(), now(), now()),
    ('cc000000-0000-4000-c000-000000000001', 'cc000000-0000-4000-c000-000000000001', 'admin@gamma.test',    'email', '{"sub":"cc000000-0000-4000-c000-000000000001","email":"admin@gamma.test"}'::jsonb,    now(), now(), now()),
    ('cc000000-0000-4000-c000-000000000002', 'cc000000-0000-4000-c000-000000000002', 'editor@gamma.test',   'email', '{"sub":"cc000000-0000-4000-c000-000000000002","email":"editor@gamma.test"}'::jsonb,   now(), now(), now()),
    ('cc000000-0000-4000-c000-000000000003', 'cc000000-0000-4000-c000-000000000003', 'viewer@gamma.test',   'email', '{"sub":"cc000000-0000-4000-c000-000000000003","email":"viewer@gamma.test"}'::jsonb,   now(), now(), now()),
    ('cc000000-0000-4000-c000-000000000004', 'cc000000-0000-4000-c000-000000000004', 'approver@gamma.test', 'email', '{"sub":"cc000000-0000-4000-c000-000000000004","email":"approver@gamma.test"}'::jsonb, now(), now(), now())
  ON CONFLICT (id) DO NOTHING;
END $$;


-- ═══════════════════════════════════════════════════════════════════════════════
-- ORGANIZATIONS
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO public.organizations (id, name, slug, created_by, industry, metadata)
VALUES
  ('a0000000-0000-4000-a000-000000000001', 'Acme Corp',  'acme-corp',  'aa000000-0000-4000-a000-000000000001', 'SaaS / Cloud Services', '{"test_org": true}'::jsonb),
  ('b0000000-0000-4000-b000-000000000002', 'Beta Inc',   'beta-inc',   'bb000000-0000-4000-b000-000000000001', 'Healthcare IT',         '{"test_org": true}'::jsonb),
  ('c0000000-0000-4000-c000-000000000003', 'Gamma LLC',  'gamma-llc',  'cc000000-0000-4000-c000-000000000001', 'Financial Services',    '{"test_org": true}'::jsonb)
ON CONFLICT (id) DO NOTHING;


-- ═══════════════════════════════════════════════════════════════════════════════
-- ORGANIZATION MEMBERS (role assignments)
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO public.organization_members (user_id, organization_id, role)
VALUES
  -- Acme Corp
  ('aa000000-0000-4000-a000-000000000001', 'a0000000-0000-4000-a000-000000000001', 'admin'),
  ('aa000000-0000-4000-a000-000000000002', 'a0000000-0000-4000-a000-000000000001', 'editor'),
  ('aa000000-0000-4000-a000-000000000003', 'a0000000-0000-4000-a000-000000000001', 'viewer'),
  ('aa000000-0000-4000-a000-000000000004', 'a0000000-0000-4000-a000-000000000001', 'approver'),
  -- Beta Inc
  ('bb000000-0000-4000-b000-000000000001', 'b0000000-0000-4000-b000-000000000002', 'admin'),
  ('bb000000-0000-4000-b000-000000000002', 'b0000000-0000-4000-b000-000000000002', 'editor'),
  ('bb000000-0000-4000-b000-000000000003', 'b0000000-0000-4000-b000-000000000002', 'viewer'),
  ('bb000000-0000-4000-b000-000000000004', 'b0000000-0000-4000-b000-000000000002', 'approver'),
  -- Gamma LLC
  ('cc000000-0000-4000-c000-000000000001', 'c0000000-0000-4000-c000-000000000003', 'admin'),
  ('cc000000-0000-4000-c000-000000000002', 'c0000000-0000-4000-c000-000000000003', 'editor'),
  ('cc000000-0000-4000-c000-000000000003', 'c0000000-0000-4000-c000-000000000003', 'viewer'),
  ('cc000000-0000-4000-c000-000000000004', 'c0000000-0000-4000-c000-000000000003', 'approver')
ON CONFLICT DO NOTHING;


-- ═══════════════════════════════════════════════════════════════════════════════
-- GENERATED DOCUMENTS
-- Acme: 3 docs (1 approved, 2 drafts). Beta/Gamma: 1 draft each.
-- Template IDs are looked up dynamically from the seed data.
--
-- Disable triggers that require auth.uid() — seed runs as postgres superuser.
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.generated_docs DISABLE TRIGGER generated_docs_write_guard;
ALTER TABLE public.generated_docs DISABLE TRIGGER generated_docs_audit_trigger;

-- Acme ISP — approved
INSERT INTO public.generated_docs (id, organization_id, template_id, title, file_name, content_markdown, input_payload, status, version, created_by, updated_by, approved_by, approved_at)
SELECT
  'd0000000-0000-4000-a000-000000000001',
  'a0000000-0000-4000-a000-000000000001',
  t.id,
  'Information Security Policy',
  'information-security-policy.md',
  '# Information Security Policy' || chr(10) || chr(10) || 'Acme Corp maintains an information security program...',
  '{"company":{"name":"Acme Corp"}}'::jsonb,
  'approved',
  1,
  'aa000000-0000-4000-a000-000000000001',
  'aa000000-0000-4000-a000-000000000001',
  'aa000000-0000-4000-a000-000000000004',
  now() - interval '2 days'
FROM public.templates t WHERE t.slug = 'information-security-policy'
ON CONFLICT (id) DO NOTHING;

-- Acme Access Control — draft
INSERT INTO public.generated_docs (id, organization_id, template_id, title, file_name, content_markdown, input_payload, status, version, created_by, updated_by)
SELECT
  'd0000000-0000-4000-a000-000000000002',
  'a0000000-0000-4000-a000-000000000001',
  t.id,
  'Access Control Policy',
  'access-control.md',
  '# Access Control Policy' || chr(10) || chr(10) || 'Acme Corp restricts access based on least privilege...',
  '{"company":{"name":"Acme Corp"}}'::jsonb,
  'draft',
  1,
  'aa000000-0000-4000-a000-000000000001',
  'aa000000-0000-4000-a000-000000000001'
FROM public.templates t WHERE t.slug = 'access-control-on-offboarding-policy'
ON CONFLICT (id) DO NOTHING;

-- Acme Incident Response — draft
INSERT INTO public.generated_docs (id, organization_id, template_id, title, file_name, content_markdown, input_payload, status, version, created_by, updated_by)
SELECT
  'd0000000-0000-4000-a000-000000000003',
  'a0000000-0000-4000-a000-000000000001',
  t.id,
  'Incident Response Plan',
  'incident-response.md',
  '# Incident Response Plan' || chr(10) || chr(10) || 'In the event of a security incident, Acme Corp will...',
  '{"company":{"name":"Acme Corp"}}'::jsonb,
  'draft',
  1,
  'aa000000-0000-4000-a000-000000000002',
  'aa000000-0000-4000-a000-000000000002'
FROM public.templates t WHERE t.slug = 'incident-response-plan'
ON CONFLICT (id) DO NOTHING;

-- Beta ISP — draft
INSERT INTO public.generated_docs (id, organization_id, template_id, title, file_name, content_markdown, input_payload, status, version, created_by, updated_by)
SELECT
  'd0000000-0000-4000-b000-000000000001',
  'b0000000-0000-4000-b000-000000000002',
  t.id,
  'Information Security Policy',
  'information-security-policy.md',
  '# Information Security Policy' || chr(10) || chr(10) || 'Beta Inc maintains an information security program...',
  '{"company":{"name":"Beta Inc"}}'::jsonb,
  'draft',
  1,
  'bb000000-0000-4000-b000-000000000001',
  'bb000000-0000-4000-b000-000000000001'
FROM public.templates t WHERE t.slug = 'information-security-policy'
ON CONFLICT (id) DO NOTHING;

-- Gamma ISP — draft
INSERT INTO public.generated_docs (id, organization_id, template_id, title, file_name, content_markdown, input_payload, status, version, created_by, updated_by)
SELECT
  'd0000000-0000-4000-c000-000000000001',
  'c0000000-0000-4000-c000-000000000003',
  t.id,
  'Information Security Policy',
  'information-security-policy.md',
  '# Information Security Policy' || chr(10) || chr(10) || 'Gamma LLC maintains an information security program...',
  '{"company":{"name":"Gamma LLC"}}'::jsonb,
  'draft',
  1,
  'cc000000-0000-4000-c000-000000000001',
  'cc000000-0000-4000-c000-000000000001'
FROM public.templates t WHERE t.slug = 'information-security-policy'
ON CONFLICT (id) DO NOTHING;

-- Re-enable triggers now that seed docs are in
ALTER TABLE public.generated_docs ENABLE TRIGGER generated_docs_write_guard;
ALTER TABLE public.generated_docs ENABLE TRIGGER generated_docs_audit_trigger;


-- ═══════════════════════════════════════════════════════════════════════════════
-- DOCUMENT REVISIONS
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO public.document_revisions (id, document_id, source, content_markdown, content_hash, created_by, created_at)
VALUES
  -- Acme ISP: generated + approved revisions
  ('e0000000-0000-4000-a000-000000000001', 'd0000000-0000-4000-a000-000000000001', 'generated',
   '# Information Security Policy' || chr(10) || chr(10) || 'Acme Corp maintains an information security program...',
   encode(extensions.digest('# Information Security Policy' || chr(10) || chr(10) || 'Acme Corp maintains an information security program...', 'sha256'), 'hex'),
   'aa000000-0000-4000-a000-000000000001', now() - interval '3 days'),
  ('e0000000-0000-4000-a000-000000000002', 'd0000000-0000-4000-a000-000000000001', 'approved',
   '# Information Security Policy' || chr(10) || chr(10) || 'Acme Corp maintains an information security program...',
   encode(extensions.digest('# Information Security Policy' || chr(10) || chr(10) || 'Acme Corp maintains an information security program...', 'sha256'), 'hex'),
   'aa000000-0000-4000-a000-000000000004', now() - interval '2 days'),
  -- Acme Access Control: generated
  ('e0000000-0000-4000-a000-000000000003', 'd0000000-0000-4000-a000-000000000002', 'generated',
   '# Access Control Policy' || chr(10) || chr(10) || 'Acme Corp restricts access based on least privilege...',
   encode(extensions.digest('# Access Control Policy' || chr(10) || chr(10) || 'Acme Corp restricts access based on least privilege...', 'sha256'), 'hex'),
   'aa000000-0000-4000-a000-000000000001', now() - interval '3 days'),
  -- Acme Incident Response: generated
  ('e0000000-0000-4000-a000-000000000004', 'd0000000-0000-4000-a000-000000000003', 'generated',
   '# Incident Response Plan' || chr(10) || chr(10) || 'In the event of a security incident, Acme Corp will...',
   encode(extensions.digest('# Incident Response Plan' || chr(10) || chr(10) || 'In the event of a security incident, Acme Corp will...', 'sha256'), 'hex'),
   'aa000000-0000-4000-a000-000000000002', now() - interval '3 days'),
  -- Beta ISP: generated
  ('e0000000-0000-4000-b000-000000000001', 'd0000000-0000-4000-b000-000000000001', 'generated',
   '# Information Security Policy' || chr(10) || chr(10) || 'Beta Inc maintains an information security program...',
   encode(extensions.digest('# Information Security Policy' || chr(10) || chr(10) || 'Beta Inc maintains an information security program...', 'sha256'), 'hex'),
   'bb000000-0000-4000-b000-000000000001', now() - interval '1 day')
ON CONFLICT (id) DO NOTHING;


-- ═══════════════════════════════════════════════════════════════════════════════
-- ORGANIZATION API KEYS
-- Raw keys are logged here for test reference only — in production these are
-- shown once and never stored.
--
-- Acme key:  ts_acme_test_key_0000000000000000000000000000000000000000
-- Beta key:  ts_beta_test_key_0000000000000000000000000000000000000000
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO public.organization_api_keys (id, organization_id, key_hash, key_prefix, label, scopes, created_by)
VALUES
  ('f1000000-0000-4000-a000-000000000001',
   'a0000000-0000-4000-a000-000000000001',
   encode(extensions.digest('ts_acme_test_key_0000000000000000000000000000000000000000', 'sha256'), 'hex'),
   'ts_acme_',
   'Acme CI Pipeline Key',
   '{evidence:write}',
   'aa000000-0000-4000-a000-000000000001'),
  ('f1000000-0000-4000-b000-000000000001',
   'b0000000-0000-4000-b000-000000000002',
   encode(extensions.digest('ts_beta_test_key_0000000000000000000000000000000000000000', 'sha256'), 'hex'),
   'ts_beta_',
   'Beta CI Pipeline Key',
   '{evidence:write}',
   'bb000000-0000-4000-b000-000000000001')
ON CONFLICT (id) DO NOTHING;


-- ═══════════════════════════════════════════════════════════════════════════════
-- ORGANIZATION INTEGRATIONS (GitHub)
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO public.organization_integrations (id, organization_id, provider, repo_owner, repo_name, default_branch, webhook_secret)
VALUES
  ('f0000000-0000-4000-a000-000000000001',
   'a0000000-0000-4000-a000-000000000001',
   'github',
   'acme-corp-test',
   'trust-scaffold-policies',
   'main',
   'whsec_staging_test_secret_do_not_use_in_production')
ON CONFLICT (id) DO NOTHING;


-- ═══════════════════════════════════════════════════════════════════════════════
-- EVIDENCE ARTIFACTS (pre-populated for Acme, hash chain test)
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO public.evidence_artifacts (id, organization_id, control_mapping, artifact_name, status, collection_tool, source_system, run_id, raw_data_hash, storage_path, collected_at, ingested_at)
VALUES
  ('f4000000-0000-4000-a000-000000000001',
   'a0000000-0000-4000-a000-000000000001',
   'CC6.1', 'iam-root-mfa-check', 'PASS', 'prowler', 'aws',
   'staging-run-001',
   encode(extensions.digest('{"check":"iam_root_mfa_enabled","region":"us-east-1","result":"PASS"}', 'sha256'), 'hex'),
   'a0000000-0000-4000-a000-000000000001/staging-run-001/iam-root-mfa-check.json',
   now() - interval '5 days', now() - interval '5 days'),
  ('f4000000-0000-4000-a000-000000000002',
   'a0000000-0000-4000-a000-000000000001',
   'CC6.1', 'iam-user-mfa-check', 'FAIL', 'prowler', 'aws',
   'staging-run-001',
   encode(extensions.digest('{"check":"iam_user_mfa_enabled","region":"us-east-1","result":"FAIL","users_without_mfa":["dev-intern@acme.test"]}', 'sha256'), 'hex'),
   'a0000000-0000-4000-a000-000000000001/staging-run-001/iam-user-mfa-check.json',
   now() - interval '5 days', now() - interval '5 days')
ON CONFLICT (id) DO NOTHING;


-- ═══════════════════════════════════════════════════════════════════════════════
-- AUDIT SNAPSHOTS (Acme has one frozen snapshot)
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO public.audit_snapshots (id, organization_id, tag_name, audit_period_start, audit_period_end, description, created_by)
VALUES
  ('f2000000-0000-4000-a000-000000000001',
   'a0000000-0000-4000-a000-000000000001',
   'audit/2026-Q1',
   '2025-04-01',
   '2026-03-31',
   'Q1 2026 SOC 2 Audit Period',
   'aa000000-0000-4000-a000-000000000001')
ON CONFLICT (id) DO NOTHING;

-- Freeze the approved ISP revision into the snapshot
INSERT INTO public.audit_snapshot_revisions (snapshot_id, revision_id)
VALUES ('f2000000-0000-4000-a000-000000000001', 'e0000000-0000-4000-a000-000000000002')
ON CONFLICT DO NOTHING;


-- ═══════════════════════════════════════════════════════════════════════════════
-- AUDITOR PORTAL TOKENS
-- Raw token: staging_portal_token_acme_0000000000000000000000000000
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO public.auditor_portal_tokens (id, organization_id, snapshot_id, token_hash, label, expires_at, created_by)
VALUES
  ('f3000000-0000-4000-a000-000000000001',
   'a0000000-0000-4000-a000-000000000001',
   'f2000000-0000-4000-a000-000000000001',
   encode(extensions.digest('staging_portal_token_acme_0000000000000000000000000000', 'sha256'), 'hex'),
   'Red Team Auditor Token',
   now() + interval '30 days',
   'aa000000-0000-4000-a000-000000000001')
ON CONFLICT (id) DO NOTHING;


COMMIT;

-- ═══════════════════════════════════════════════════════════════════════════════
-- VERIFICATION
-- ═══════════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  org_count int;
  user_count int;
  doc_count int;
  rev_count int;
BEGIN
  SELECT count(*) INTO org_count FROM organizations WHERE metadata->>'test_org' = 'true';
  SELECT count(*) INTO user_count FROM organization_members om
    JOIN organizations o ON o.id = om.organization_id
    WHERE o.metadata->>'test_org' = 'true';
  SELECT count(*) INTO doc_count FROM generated_docs gd
    JOIN organizations o ON o.id = gd.organization_id
    WHERE o.metadata->>'test_org' = 'true';
  SELECT count(*) INTO rev_count FROM document_revisions dr
    JOIN generated_docs gd ON gd.id = dr.document_id
    JOIN organizations o ON o.id = gd.organization_id
    WHERE o.metadata->>'test_org' = 'true';

  RAISE NOTICE '═══ Staging Seed Verification ═══';
  RAISE NOTICE '  Organizations: % (expected 3)', org_count;
  RAISE NOTICE '  Members:       % (expected 12)', user_count;
  RAISE NOTICE '  Documents:     % (expected 5)', doc_count;
  RAISE NOTICE '  Revisions:     % (expected 5)', rev_count;

  IF org_count != 3 OR user_count != 12 OR doc_count != 5 THEN
    RAISE WARNING 'Staging seed counts do not match expected values!';
  ELSE
    RAISE NOTICE '  ✓ All counts match.';
  END IF;
END $$;
