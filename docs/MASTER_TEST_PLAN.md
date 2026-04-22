# TrustScaffold V1.0 — Master Test Plan

> **Audience:** Internal Developers, QA, and Red Team Leads
> **Status:** Pre-Launch
> **Last Updated:** 2026-04-22

---

## Table of Contents

0. [Setup Verification (Cold Fork)](#0-setup-verification-cold-fork)
1. [Overview & Philosophy](#1-overview--philosophy)
2. [Test Environment Requirements](#2-test-environment-requirements)
3. [Tenant Isolation & RBAC](#3-tenant-isolation--rbac)
4. [Wizard & Compilation Engine](#4-wizard--compilation-engine)
5. [The Control Graph (GitOps & Webhooks)](#5-the-control-graph-gitops--webhooks)
6. [Evidence Ingestion & Cryptography](#6-evidence-ingestion--cryptography)
7. [Auditor Portal](#7-auditor-portal)
8. [Red Team Pre-Flight & Post-Mortem](#8-red-team-pre-flight--post-mortem)
9. [Traceability Matrix](#9-traceability-matrix)

---

## 0. Setup Verification (Cold Fork)

**Purpose:** Verify that a developer with zero prior context can clone the
repository and reach a fully working local environment in under 5 minutes.
If any step fails, the project is not ready for public release.

### 0.1 Clone & Install

**Steps:**
```bash
git clone https://github.com/tescolopio/trustscaffold.git
cd trustscaffold
npm install
```

**Expected:**
- Clone completes without errors.
- `npm install` exits 0 with no peer dependency errors.
- `node_modules/` is populated. `package-lock.json` is unchanged.

### 0.2 Start Local Supabase

**Steps:**
```bash
npx supabase@latest init --force
npx supabase@latest start
```

**Expected:**
- All Supabase services start (Postgres, Auth, PostgREST at minimum).
- `npx supabase@latest status` reports healthy services with URLs and keys.
- Template seed verification:
  ```bash
  PGPASSWORD=postgres psql 'postgresql://postgres@127.0.0.1:54322/postgres' \
    -c "select count(*) from public.templates;"
  ```
  Expected result: `18`.

### 0.3 Configure Environment

**Steps:**
```bash
bash scripts/setup.sh
```

The setup script detects Supabase service URLs and keys automatically, scans ports 3000–3009 for the first free port, and writes `.env.local` with all required variables. If port 3000 is occupied (e.g., by Grafana or another service) it assigns the next available port and prints the correct URL.

**Expected:**
- `.env.local` exists in project root with `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and `PORT` populated.
- Script outputs the assigned dev URL, e.g. `http://localhost:3001/signup`.

### 0.4 Build Verification

**Steps:**
```bash
npm run build
```

**Expected:**
- Exit code 0.
- Zero TypeScript errors.
- Zero ESLint errors.
- `.next/` directory created with `standalone/` output.

### 0.5 Dev Server Smoke Test

**Steps:**
```bash
# Read PORT from .env.local (default 3000 if unset)
PORT=$(grep '^PORT=' .env.local 2>/dev/null | cut -d= -f2); PORT=${PORT:-3000}
npm run dev &
sleep 5
curl -s -o /dev/null -w '%{http_code}' "http://localhost:${PORT}/"
curl -s -o /dev/null -w '%{http_code}' "http://localhost:${PORT}/login"
curl -s -o /dev/null -w '%{http_code}' "http://localhost:${PORT}/signup"
```

**Expected:**
- Root (`/`) returns `200` or `307` (redirect to login).
- `/login` returns `200`.
- `/signup` returns `200`.

### 0.6 Signup Flow — New User Creates Organization

**Steps:**
1. Open the URL printed by `setup.sh` (e.g., `http://localhost:3001/signup`) in a browser.
2. Enter a fresh email (e.g., `coldstart@test.local`), password `TestPassword1!`, and organization name `Cold Start Corp`.
3. Submit the form.

**Expected:**
- Account is created in Supabase Auth.
- `handle_new_user()` trigger fires, creating an `organizations` row and an `organization_members` row with `role = 'admin'`.
- User lands on `/dashboard`.
- Dashboard displays the organization name and `admin` role.

**Database verification:**
```bash
PGPASSWORD=postgres psql 'postgresql://postgres@127.0.0.1:54322/postgres' -P pager=off \
  -c "SELECT u.email, o.name, om.role FROM auth.users u
      JOIN public.organization_members om ON om.user_id = u.id
      JOIN public.organizations o ON o.id = om.organization_id
      WHERE u.email = 'coldstart@test.local';"
```

Expected: One row with `admin` role under `Cold Start Corp`.

### 0.7 Wizard Flow — Generate Documents

**Steps:**
1. Navigate to `/wizard`.
2. On Step 0 (Company Info), select:
   - Org age: `< 1 year`
   - Compliance maturity: `First time — we're just getting started`
   - Audit type guidance is shown; select `Type I` or leave as recommended.
3. Complete all remaining steps with minimal input (Security TSC only, single cloud provider).
4. Click Generate.

**Expected:**
- Step 0 displays org age, maturity, and audit type fields.
- Server-side Handlebars compilation succeeds for all templates; any render error shows template name in the error message.
- User is redirected to `/generated-docs`.
- Draft documents appear (at minimum: Information Security Policy, Access Control Policy, SDLC Policy, System Description).
- No Handlebars `{{` expressions remain in rendered output.
- Each generated doc detail page shows a **Regenerate** button for admin/editor roles.

**Draft persistence check:**
- Advance to Step 2, then close the browser and reopen `/wizard`.
- Draft is restored from the server (`wizard_drafts` table) — verify step and data are correct even if localStorage is cleared.

**Single-doc regeneration check:**
- Open any generated doc at `/generated-docs/<id>`.
- Click **Regenerate**.
- Verify doc content refreshes (status resets to `draft`) and a new `document_revisions` row appears with `source = 'generated'`.

### 0.8 E2E Suite — Full Pass

**Steps:**
```bash
# Apply staging seed
PGPASSWORD=postgres psql 'postgresql://postgres@127.0.0.1:54322/postgres' \
  -f tests/seed-staging.sql

# Load env and run all tests
set -a && source .env.local && set +a
npx tsx tests/e2e/run-all.ts
```

**Expected:** 51 tests, 0 failures across all 5 suites.

### 0.9 Red Team Suite — Full Pass

**Steps:**
```bash
set -a && source .env.local && set +a
npx tsx tests/e2e/red-team.ts
```

**Expected:** 33 tests, 0 failures. All 10 attack vectors blocked.

### 0.10 Docker Build Verification

**Steps:**
```bash
docker build \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=test \
  -t trustscaffold:test .

docker run -d -p 3001:3000 \
  -e NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 \
  -e NEXT_PUBLIC_SUPABASE_ANON_KEY=test \
  -e SUPABASE_SERVICE_ROLE_KEY=test \
  --name ts-test trustscaffold:test

sleep 5
curl -s -o /dev/null -w '%{http_code}' http://localhost:3001/

docker rm -f ts-test
```

**Expected:**
- Docker build completes without errors.
- Container starts and passes health check.
- HTTP request returns `200` or `307`.

---

## 1. Overview & Philosophy

A clean `npx next build` proves the code compiles. It does **not** prove the state
machine transitions are correct, the cryptographic hash chains are unbroken, or
that RLS policies mathematically prevent cross-tenant reads. This plan tests those
guarantees.

**Test Categories:**

| Category | What it validates | Framework |
|---|---|---|
| RBAC / RLS | Data isolation, privilege escalation | Direct Supabase client calls |
| Wizard & Compilation | Handlebars output correctness, idempotency | Server action + DB assertions |
| Control Graph | Webhook signatures, merge detection, snapshots | HTTP-level integration |
| Evidence & Crypto | Hash chains, canonicalization, tamper detection | Postgres + `verify-hashes.sh` |
| Auditor Portal | Token lifecycle, read-only enforcement | HTTP + token auth |

**All executable test scripts live in `tests/e2e/`.**
Seed data for the staging environment lives in `tests/seed-staging.sql`.

---

## 2. Test Environment Requirements

### 2.1 Staging Stack

| Component | Requirement |
|---|---|
| Supabase | Local (`npx supabase start`) or hosted staging project |
| Postgres Extensions | `uuid-ossp`, `pgcrypto` (enabled by migrations) |
| Next.js | `npm run dev` or production build pointing at staging Supabase |
| GitHub | A dedicated test repository for webhook/export tests |
| Storage | Supabase Storage bucket `evidence` must exist |

### 2.2 Test Users

The staging seed creates **3 organizations** with **4 role-specific users each**:

| Org | Slug | Users |
|---|---|---|
| Acme Corp | `acme-corp` | admin@acme.test, editor@acme.test, viewer@acme.test, approver@acme.test |
| Beta Inc | `beta-inc` | admin@beta.test, editor@beta.test, viewer@beta.test, approver@beta.test |
| Gamma LLC | `gamma-llc` | admin@gamma.test, editor@gamma.test, viewer@gamma.test, approver@gamma.test |

**Password for all test users:** `TestPassword1!`

### 2.3 Running the Tests

```bash
# 1. Start Supabase locally
npx supabase start

# 2. Apply staging seed (on top of normal seed)
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -f tests/seed-staging.sql

# 3. Run the full E2E suite
npx tsx tests/e2e/run-all.ts

# 4. Run individual suites
npx tsx tests/e2e/01-rbac.ts
npx tsx tests/e2e/02-wizard-compilation.ts
npx tsx tests/e2e/03-control-graph.ts
npx tsx tests/e2e/04-evidence-crypto.ts
npx tsx tests/e2e/05-auditor-portal.ts
```

---

## 3. Tenant Isolation & RBAC

### 3.1 Cross-Tenant Attack

**Scenario:** Authenticate as User A (Org A). Attempt to fetch, update, or approve
a `generated_docs` record belonging to Org B using direct Supabase client calls.

**Expected:** Empty result set / RLS rejection. Zero rows returned.

**Verification:**
- SELECT from `generated_docs` filtering by Org B's document ID → `[]`
- SELECT from `document_revisions` via Org B's document → `[]`
- SELECT from `evidence_artifacts` for Org B → `[]`
- SELECT from `audit_logs` for Org B → `[]`
- SELECT from `audit_snapshots` for Org B → `[]`
- SELECT from `organization_api_keys` for Org B → `[]`
- SELECT from `organization_integrations` for Org B → `[]`
- SELECT from `auditor_portal_tokens` for Org B → `[]`

### 3.2 Privilege Escalation — Editor Cannot Approve

**Scenario:** Authenticate as an `editor` role. Call `approve_generated_document()`
on a draft document.

**Expected:** The RPC throws an error. Document remains in `draft` status.

### 3.3 Privilege Escalation — Viewer Cannot Generate

**Scenario:** Authenticate as a `viewer` role. Attempt to INSERT into
`generated_docs`.

**Expected:** RLS blocks the write. Postgres error code `42501` (insufficient_privilege).

### 3.4 Privilege Escalation — Viewer Cannot Edit Content

**Scenario:** Authenticate as `viewer`. Attempt to UPDATE `content_markdown`
on an existing draft.

**Expected:** Zero rows affected. Content unchanged.

### 3.5 Admin Self-Downgrade Guard

**Scenario:** Single admin in org attempts to change own role to `editor` via
`updateTeamMemberRoleAction`.

**Expected:** Action rejected. Admin count remains 1.

### 3.6 Admin Self-Removal Guard

**Scenario:** Single admin attempts `removeTeamMemberAction` on themselves.

**Expected:** Action rejected. Membership row persists.

### 3.7 Cross-Tenant Approval Attack

**Scenario:** Authenticate as Org A admin. Call `approve_generated_document()`
with a document ID belonging to Org B.

**Expected:** RPC rejects. The `current_user_has_org_role()` check fails because
the user has no membership in Org B.

### 3.8 API Key Scope Isolation

**Scenario:** Create an API key for Org A. Use it to ingest evidence, but include
Org B's `organization_id` in the payload body.

**Expected:** Evidence is stored under Org A (the key's org), not Org B. The payload
`organization_id` field is ignored; the key's org takes precedence.

---

## 4. Wizard & Compilation Engine

### 4.1 Idempotency — Double-Click Guard

**Scenario:** Call `compileDocsAction()` with the same wizard data twice in
rapid succession (< 100ms apart).

**Expected:** Exactly one set of drafts is created. The unique constraint on
`(organization_id, template_id) WHERE status = 'draft'` prevents duplicates.
Second call performs UPDATEs on existing rows.

### 4.2 Idempotency — Re-Run Updates In-Place

**Scenario:** Complete the wizard for Config A. Verify N drafts at version 1.
Re-run with Config B.

**Expected:** Same N rows are updated in place. `version` remains 1 (content
changed but not re-approved). No duplicate rows. `updated_at` changes.

### 4.3 TSC Scope Filtering

**Scenario:** Run wizard with `security` only (all other TSC categories false).

**Expected:** Only templates whose `criteria_mapped` overlap with Security
criteria codes (CC1–CC9) are compiled. Privacy, Availability, Confidentiality,
and Processing Integrity-specific templates are excluded.

### 4.4 Full TSC Scope

**Scenario:** Run wizard with all 5 TSC categories enabled.

**Expected:** All 18 templates are compiled (including evidence-checklist
and system-description).

### 4.5 Hybrid / Physical Logic

**Scenario A:** Run with `hostsOwnHardware: true`, `hasPhysicalServerRoom: true`.

**Expected:** Physical Security template (CC6.4) includes badge access, rack
security, and media destruction sections.

**Scenario B:** Re-run with `hostsOwnHardware: false`, `hasPhysicalServerRoom: false`.

**Expected:** Physical controls are replaced with cloud vendor inheritance
language. No badge/rack references remain.

### 4.6 DC 200 System Description Completeness

**Scenario:** Run wizard with 3 subservices, multi-cloud (AWS + Azure + GCP),
and all TSC categories.

**Expected:** `system-description` template output contains:
- All 3 sub-service vendor names in the sub-organization table
- Cloud architecture section mentioning AWS, Azure, and GCP
- All 5 TSC categories listed in scope
- Multi-tenant or single-tenant designation matching wizard input
- Infrastructure type correctly rendered

### 4.7 Zero-Subservice Edge Case

**Scenario:** Run wizard with `subservices: []`.

**Expected:** Vendor management and system description templates render
cleanly with "No sub-service organizations" or equivalent. No Handlebars
errors or unresolved `{{` expressions.

### 4.9 Wizard Maturity — First-Timer Guidance

**Scenario:** Run wizard with `complianceMaturity = 'first-time'`.

**Expected:**
- Step 1 shows a blue "first time" callout banner.
- Gap analysis uses blue styling and "not yet implemented" language instead of red/amber "gaps".
- "Start in Security Assessment" CTA appears instead of "Fix in Security Assessment".
- `acknowledgementCadence` and `trainingCadence` accept `'not-yet'` without validation errors.

### 4.10 Wizard Draft Server Persistence

**Scenario:** Advance to wizard step 3, then clear localStorage and reload.

**Expected:**
- `wizard_drafts` table has a row for this organization with `current_step = 3`.
- On reload, `loadWizardDraftAction()` returns the saved draft; user is placed back at step 3 with data intact.
- Draft survives changing the dev server port (since server state is org-scoped, not cookie/localStorage-scoped).

### 4.8 Content Revision Creation

**Scenario:** After `compileDocsAction()`, query `document_revisions` for
each generated document.

**Expected:** Each document has exactly one revision with `source = 'generated'`
and a non-empty `content_hash` (SHA-256 hex).

---

## 5. The Control Graph (GitOps & Webhooks)

### 5.1 Export to GitHub

**Scenario:** Approve a document, then call `exportApprovedDocsToGithubAction()`.

**Expected:**
- A new branch is created in the test repository
- A PR is opened with the approved markdown as file content
- `generated_docs.committed_to_repo` = true
- `generated_docs.repo_url` and `pr_url` are populated
- A `document_revisions` row exists with `source = 'exported'` and `commit_sha`

### 5.2 Webhook Signature — Forged Payload

**Scenario:** Send a POST to `/api/webhooks/github` with a valid JSON body
but an invalid `x-hub-signature-256` header.

**Expected:** HTTP 401 Unauthorized. No database mutations.

### 5.3 Webhook Signature — Missing Header

**Scenario:** Send a POST to `/api/webhooks/github` with no signature header.

**Expected:** HTTP 401 Unauthorized.

### 5.4 Merge Detection — Unmodified

**Scenario:** Merge the GitHub PR without editing the markdown.

**Expected:**
- Webhook fires and is accepted (HTTP 200)
- System computes content hash and compares to latest `document_revisions` hash
- Hashes match → no new `merged` revision is created
- `vcs_merge_events` row is still inserted (merge happened)

### 5.5 Merge Detection — Modified

**Scenario:** Edit the markdown in GitHub's PR editor, then merge.

**Expected:**
- Webhook fires and is accepted (HTTP 200)
- Content hash differs from latest revision
- New `document_revisions` row inserted with `source = 'merged'`
- `generated_docs.content_markdown` is updated to match merged content
- `vcs_merge_events` row inserted with reviewer info

### 5.6 Audit Snapshot via Git Tag

**Scenario:** Push tag `audit/2026-Q1` to the repository.

**Expected:**
- Webhook fires with `x-github-event: create`, `ref_type: tag`
- `audit_snapshots` row created with `tag_name = 'audit/2026-Q1'`
- `audit_period_start` and `audit_period_end` span 12 months
- All approved `document_revisions` are frozen into `audit_snapshot_revisions`
- `audit_logs` entry created with `action = 'git.tag_created'`

### 5.7 Non-Audit Tag Ignored

**Scenario:** Push tag `v1.0.0` (not matching `audit/*` pattern).

**Expected:** Tag event is logged but no audit snapshot is auto-created.

### 5.8 Self-Merge Detection (SoD)

**Scenario:** Author and merger are the same GitHub user. No reviewers approved.

**Expected:**
- `vcs_merge_events.is_self_merged` = true
- `vcs_merge_events.has_review` = false
- This data surfaces in the population list for SoD analysis

### 5.9 Export to Azure DevOps

**Scenario:** Configure Azure DevOps integration. Approve a document and export.

**Expected:** Push + PR created in Azure DevOps repo. `committed_to_repo` = true.

---

## 6. Evidence Ingestion & Cryptography

### 6.1 Strict Schema Enforcement — Missing run_metadata

**Scenario:** POST to `/api/v1/evidence/ingest` with:
```json
{ "artifacts": [{ "control_mapping": "CC6.1", "artifact_name": "test", "status": "PASS", "raw_data": {} }] }
```

**Expected:** HTTP 400. Body contains `"run_metadata"` in error message.

### 6.2 Strict Schema Enforcement — Invalid Status

**Scenario:** Submit artifact with `"status": "SUCCESS"` (not in enum).

**Expected:** HTTP 400. Body mentions invalid status value.

### 6.3 Strict Schema Enforcement — Invalid Timestamp

**Scenario:** Submit `run_metadata.timestamp` as `"not-a-date"`.

**Expected:** HTTP 400. Timestamp validation rejects.

### 6.4 Strict Schema Enforcement — Empty Artifacts

**Scenario:** Submit `{ "run_metadata": {...}, "artifacts": [] }`.

**Expected:** HTTP 400. At least one artifact required.

### 6.5 API Key Authentication — Missing Bearer

**Scenario:** POST to ingest endpoint with no `Authorization` header.

**Expected:** HTTP 401.

### 6.6 API Key Authentication — Revoked Key

**Scenario:** Create an API key, revoke it via `revokeOrganizationApiKeyAction`,
then attempt ingestion.

**Expected:** HTTP 401. Key recognized but rejected as revoked.

### 6.7 Hash Chain Verification — Happy Path

**Scenario:**
1. Ingest Evidence A. Record its `evidence_artifacts.raw_data_hash`.
2. Ingest Evidence B. Record its hash.
3. Run `scripts/verify-hashes.sh` against the staging environment.

**Expected:** Script reports `chain integrity VERIFIED` and all artifact
hashes match.

### 6.8 Hash Chain Verification — Tamper Detection

**Scenario:**
1. Ingest Evidence A, note its `raw_data_hash`.
2. Ingest Evidence B.
3. Directly UPDATE Evidence A's `raw_data_hash` in the database
   (simulating a DBA tamper).
4. Run `scripts/verify-hashes.sh`.

**Expected:** Script reports `MISMATCH` for Evidence A, identifying the exact
broken artifact.

### 6.9 Audit Log Immutability — UPDATE Blocked

**Scenario:** Using the service role client, attempt:
```sql
UPDATE audit_logs SET action = 'tampered' WHERE id = '<some-id>';
```

**Expected:** The `prevent_audit_log_mutation()` trigger raises an exception.
The UPDATE fails.

### 6.10 Audit Log Immutability — DELETE Blocked

**Scenario:** Using the service role client, attempt:
```sql
DELETE FROM audit_logs WHERE id = '<some-id>';
```

**Expected:** The `prevent_audit_log_mutation()` trigger raises an exception.
The DELETE fails.

### 6.11 Audit Log Chain Break Detection

**Scenario:**
1. Generate several audit log entries via normal operations.
2. Bypass the trigger (using a superuser `ALTER TABLE ... DISABLE TRIGGER`)
   to UPDATE `event_checksum` on a middle row.
3. Re-enable the trigger.
4. Run `scripts/verify-hashes.sh`.

**Expected:** Script detects the chain break at the exact mutated row.

### 6.12 RFC 8785 JCS Canonicalization

**Scenario:** Ingest two artifacts with semantically identical `raw_data` but
different JSON serialization:
- Artifact A: `{"b": 1, "a": 2}`
- Artifact B: `{"a":2,"b":1}`

**Expected:** Both produce the same `raw_data_hash` because JCS canonicalization
sorts keys deterministically.

### 6.13 Scanner Auto-Detection — Prowler

**Scenario:** Submit payload in Prowler format:
```json
{
  "run_metadata": { "collection_tool": "prowler", ... },
  "artifacts": [{ "CheckID": "iam_mfa_enabled", "Status": "PASS", ... }]
}
```

**Expected:** Prowler normalizer activates. `control_mapping` is populated
from `CheckID`. Status is mapped correctly.

### 6.14 Scanner Auto-Detection — Steampipe

**Scenario:** Submit in Steampipe format with `control_id` and `status: "ok"`.

**Expected:** `status` maps to `PASS`. `control_id` maps to `control_mapping`.

### 6.15 Scanner Auto-Detection — CloudQuery

**Scenario:** Submit with `check_id` and `result_status` fields.

**Expected:** Correct mapping to `control_mapping` and status enum.

### 6.16 PII Redaction (Pre-LLM)

**Scenario:** Submit raw_data containing email addresses, IP addresses, or
AWS account IDs.

**Expected:** Canonical stored JSON has PII masked/stripped before reaching
any LLM synthesis layer. Stored `raw_data` in Supabase Storage does not
contain plaintext PII.

---

## 7. Auditor Portal

### 7.1 Token Expiration

**Scenario:**
1. Create a portal token with `expires_at` = now + 1 second.
2. Wait 2 seconds.
3. Attempt to access `/auditor/<token>`.

**Expected:** HTTP 401 or 403 with "token expired" message.

### 7.2 Valid Token Access

**Scenario:** Create a portal token with 24-hour expiry. Access the portal.

**Expected:**
- HTTP 200
- Read-only view of documents, revisions, evidence, and audit timeline
- `last_accessed_at` is updated on the token row

### 7.3 Revoked Token

**Scenario:** Create a token, revoke it, then attempt access.

**Expected:** Token row is deleted. Access returns 401.

### 7.4 Read-Only Enforcement

**Scenario:** Using a valid portal token, attempt to:
- Approve a document
- Edit document content
- Delete an audit snapshot
- Create a new API key

**Expected:** All mutations are rejected. The portal provides no mutation
endpoints.

### 7.5 Cross-Org Token Isolation

**Scenario:** Create a portal token for Org A's snapshot. Attempt to use
it to view Org B's documents or snapshots.

**Expected:** Only Org A's data is visible. Org B's data is completely
inaccessible.

### 7.6 Provenance Timeline Rendering

**Scenario:** Open a document's provenance view in the auditor portal.

**Expected:** Timeline displays `Generated → Approved → Exported → Merged`
nodes with immutable timestamps from `audit_logs`. Each node links to the
corresponding `document_revisions` entry.

---

## 8. Red Team Pre-Flight & Post-Mortem

### 8.1 Pre-Flight Checklist

Before handing the environment to the red team, verify:

- [ ] **Staging Environment Isolated.** Red team tests against
      `staging.trustscaffold.com` (or dedicated Supabase project), NOT
      localhost or production.
- [ ] **Staging seed applied.** 3 organizations, 12 users, pre-approved
      documents, integration tokens, API keys, and evidence artifacts are
      all present. Run `tests/seed-staging.sql` against the staging DB.
- [ ] **Alerting active.** Application monitoring (Sentry/Datadog/Vercel Logs)
      is configured and catching 500 errors in real-time. Share dashboard
      access with the red team lead.
- [ ] **Audit log baseline captured.** Record the current max
      `audit_logs.id` and `event_checksum` before the engagement begins.
      This is your "known good" chain tip.
- [ ] **Service role key NOT shared.** Red team operates only with
      user-level credentials and API keys. Service role access simulates
      a DBA-level insider threat test only if explicitly scoped.
- [ ] **Rate limiting reviewed.** Confirm Vercel/Cloudflare rate limits are
      configured on `/api/v1/evidence/ingest` and `/api/webhooks/github`.
      The ingest route enforces a 50 MB per-request payload cap (HTTP 413 if exceeded)
      but does not yet implement per-org request-rate limits — this is a known gap
      that must be addressed before production launch.
- [ ] **Integration token validation verified.** GitHub and Azure DevOps tokens
      are validated against the upstream API before being stored. Confirm that
      supplying an invalid token surfaces a clear error rather than encrypting junk.
- [ ] **Webhook secret rotated.** Generate a fresh secret for the staging
      environment's webhook integration.
- [ ] **Token encryption key unique to staging.** `SUPABASE_SERVICE_ROLE_KEY`
      for staging must differ from production.

### 8.2 Red Team Scope

The red team should attempt:

| Attack Vector | Target | Success Criteria |
|---|---|---|
| Horizontal Privilege Escalation | Cross-tenant data access | Any row from another org readable |
| Vertical Privilege Escalation | Viewer → Admin actions | Any mutation succeeds for wrong role |
| Token Exfiltration | Integration tokens, API keys | Decrypt or leak any secret |
| Webhook Forgery | `/api/webhooks/github` | Accepted with forged signature |
| Audit Log Tampering | `audit_logs` table | UPDATE/DELETE succeeds without chain break |
| Hash Chain Poisoning | `evidence_artifacts` | Modified hash passes verification |
| IDOR | Document/snapshot/revision IDs | Access resource by guessing UUID |
| Session Hijacking | Auth cookies | Steal or forge session |
| SQL Injection | Any input field | Execute arbitrary SQL |
| XSS | Markdown rendering | Execute JS in auditor portal |

### 8.3 Post-Mortem Checklist

After the red team engagement:

- [ ] **Audit the audit log.** Run `scripts/verify-hashes.sh` against the
      staging DB. Was the red team able to perform an UPDATE on audit_logs
      without breaking the hash chain? If they bypassed
      `prevent_audit_log_mutation()`, the core thesis of the product has a
      critical vulnerability.
- [ ] **Check evidence integrity.** Run artifact hash verification. Any
      mismatches indicate storage or canonicalization vulnerabilities.
- [ ] **Review RLS bypass attempts.** Query `audit_logs` for any entries
      with unexpected `organization_id` values or cross-tenant actions.
- [ ] **Triage findings.**

  | Severity | Definition | SLA |
  |---|---|---|
  | Critical | RBAC bypass, token exfiltration, hash chain break | Fix before launch |
  | High | IDOR, missing rate limits, session issues | Fix before launch |
  | Moderate | Rate limiting gaps, verbose errors, minor XSS | Fix within 2 weeks |
  | Low | Cosmetic, informational | Backlog |

- [ ] **Patch & re-test.** Fix all Critical/High findings. Re-run the
      E2E suite against the patched staging environment.
- [ ] **Clean slate.** Tear down the staging database entirely. Run
      `npx supabase db reset` to eliminate all red-team artifacts, mock
      data, and test tokens before production deployment.
- [ ] **Rotate all secrets.** Even if staging keys differ from production,
      rotate: Supabase service role key, webhook secrets, integration tokens,
      and any API keys created during testing.

---

## 9. Traceability Matrix

Maps each test case to the V1.0 DoD section it validates:

| Test | DoD Section | Tables Touched |
|---|---|---|
| 0.1 Clone & Install | §0 Cold Fork | — (filesystem) |
| 0.2 Start Supabase | §0 Cold Fork | templates (seed verify) |
| 0.4 Build | §0 Cold Fork | — (compilation) |
| 0.5 Smoke Test | §0 Cold Fork | — (HTTP) |
| 0.6 Signup Flow | §0 Cold Fork | organizations, organization_members |
| 0.7 Wizard Flow | §0 Cold Fork | generated_docs, document_revisions |
| 0.8 E2E Full Pass | §0 Cold Fork | All tables |
| 0.9 Red Team Pass | §0 Cold Fork | All tables |
| 0.10 Docker Build | §0 Cold Fork | — (container) |
| 3.1 Cross-Tenant | §1 RLS | All tables |
| 3.2 Editor Approve | §1 RBAC | generated_docs, document_revisions |
| 3.3 Viewer Generate | §1 RBAC | generated_docs |
| 3.7 Cross-Tenant Approve | §1 RLS + RBAC | generated_docs |
| 3.8 API Key Isolation | §1 Tenant Isolation | organization_api_keys, evidence_artifacts |
| 4.1 Double-Click | §2 Idempotency | generated_docs |
| 4.2 Re-Run | §2 Idempotency | generated_docs, document_revisions |
| 4.5 Physical Logic | §2 Template Logic | generated_docs |
| 4.6 DC 200 | §2 System Description | generated_docs |
| 4.9 First-Timer Maturity | §2 Wizard UX | wizard_drafts |
| 4.10 Draft Persistence | §2 Wizard Persistence | wizard_drafts |
| 0.7 Single-Doc Regen | §2 Regeneration | generated_docs, document_revisions |
| 5.1 Export | §3 GitOps | generated_docs, document_revisions |
| 5.2 Forge Webhook | §3 Webhook Security | — (no mutation) |
| 5.4 Unmod Merge | §3 Merge Detection | vcs_merge_events |
| 5.5 Mod Merge | §3 Merge Detection | document_revisions, vcs_merge_events |
| 5.6 Audit Tag | §3 Snapshots | audit_snapshots, audit_snapshot_revisions |
| 6.1–6.4 Schema | §4 Evidence Validation | — (rejected) |
| 6.7 Hash Chain | §4 Crypto Integrity | evidence_artifacts |
| 6.8 Tamper Detect | §4 Crypto Integrity | evidence_artifacts |
| 6.9–6.10 Immutability | §4 Audit Immutability | audit_logs |
| 6.12 JCS | §4 Canonicalization | evidence_artifacts |
| 7.1 Token Expiry | §5 Auditor Portal | auditor_portal_tokens |
| 7.4 Read-Only | §5 Portal Security | — (all rejected) |
| 7.5 Cross-Org Token | §5 Tenant Isolation | auditor_portal_tokens |
