# Control Graph Architecture

> Internal technical reference. Describes the immutable ledger, evidence pipeline, and audit snapshot model that form TrustScaffold's "Canonical Compliance Ledger."

---

## Overview

The Control Graph transforms TrustScaffold from a document generator into a provable compliance system. Every state change — document edit, approval, merge, evidence ingestion — is captured in an append-only, hash-chained Postgres ledger that an auditor can independently verify.

```
Wizard → Templates → generated_docs (mutable draft)
                           │
                    ┌──────┴──────┐
                    ▼              ▼
          document_revisions    audit_logs
          (immutable ledger)    (hash-chain)
                    │              │
                    ▼              ▼
          audit_snapshots    auditor_portal_tokens
          (point-in-time)    (time-boxed read access)
                    │
                    ▼
          evidence_artifacts + Supabase Storage
          (canonicalized, hashed)
```

---

## Hash-Chain Audit Logging

### Design

Every mutation to `organizations`, `generated_docs`, and `organization_members` fires an `AFTER INSERT/UPDATE/DELETE` trigger that inserts a row into `audit_logs`.

Before each insert, the `compute_audit_log_checksum()` trigger computes:

```
event_checksum = SHA-256(
  organization_id | actor_user_id | action | entity_type |
  entity_id | details | created_at | previous_event_checksum
)
```

The `previous_event_checksum` is the most recent checksum for the same organization, forming an unbroken chain. Any gap or modification in the chain is detectable.

### Immutability Enforcement

- `audit_logs` has a `BEFORE UPDATE OR DELETE` trigger (`prevent_audit_log_mutation`) that raises an exception unconditionally.
- No `UPDATE` or `DELETE` RLS policies exist for the table.
- The `anon` and `authenticated` roles are `REVOKE ALL`; only `SELECT` and the `append_audit_log()` function are granted.

### Verification

The `scripts/verify-hashes.sh` script walks the `audit_logs` table in `created_at` order and recomputes each checksum, verifying:
1. `previous_event_checksum` matches the prior row's `event_checksum`.
2. Recomputed SHA-256 matches the stored `event_checksum`.

---

## Document Revision Ledger

### Schema: `document_revisions`

| Column | Type | Purpose |
|--------|------|---------|
| `id` | uuid | Primary key |
| `document_id` | uuid → `generated_docs` | Parent document |
| `source` | enum: `generated`, `reviewer_edited`, `approved`, `exported`, `merged` | How this revision was created |
| `content_markdown` | text | Full Markdown content |
| `content_hash` | text | SHA-256 of `content_markdown` |
| `commit_sha` | text | Git commit (for exported/merged) |
| `pr_url` | text | Pull request URL |
| `created_by` | uuid → `auth.users` | Who created it |
| `created_at` | timestamptz | Immutable system timestamp |

### Lifecycle

1. **Generated** — Wizard creates `generated_docs` row (mutable draft). The `insert_document_revision()` function appends a `source = 'generated'` revision.
2. **Edited** — User edits append `source = 'reviewer_edited'` revisions.
3. **Approved** — Admin/approver transitions status; appends `source = 'approved'` revision.
4. **Exported** — GitOps export creates branch + PR; appends `source = 'exported'` with `commit_sha` and `pr_url`.
5. **Merged** — GitHub webhook detects PR merge, compares content hash, appends `source = 'merged'` if content changed.

Each revision is a new row — no overwrites. The `content_hash` enables tamper detection.

---

## Evidence Ingestion Pipeline

### Flow

```
CI/CD Job → POST /api/v1/evidence/ingest
                    │
         ┌──────────┴───────────┐
         ▼                      ▼
  Auto-detect format     Validate API key
  (Prowler / Steampipe   (organization_api_keys)
   / CloudQuery / raw)
         │
         ▼
  RFC 8785 JCS canonicalization
         │
         ▼
  SHA-256 hash of canonical form
         │
    ┌────┴────┐
    ▼         ▼
  Supabase   evidence_artifacts row
  Storage    (hash, control_mapping,
  (frozen)    status, metadata)
```

### Scanner Normalizers

`lib/evidence/scanner-normalizers.ts` provides auto-detection and normalization for:

| Scanner | Detection Key | Normalized Fields |
|---------|--------------|-------------------|
| **Prowler** | `StatusExtended`, `ResourceArn` | control_id, status, resource_id, region, timestamp |
| **Steampipe** | `control_id`, `resource` | control_id, status, resource_id, region, timestamp |
| **CloudQuery** | `_cq_sync_time`, `arn` | control_id, status, resource_id, region, timestamp |

Raw payloads (non-scanner) pass through without normalization.

### Canonicalization

`lib/evidence/canonicalize.ts` implements RFC 8785 JSON Canonicalization Scheme:
- Deterministic key ordering (lexicographic)
- No whitespace
- Consistent number and string serialization

This ensures the same logical payload always produces the same SHA-256 hash regardless of property ordering.

### Storage

Canonical JSON is stored in the `evidence` Supabase Storage bucket at path: `{org_id}/{run_id}/{artifact_name}.json`

The bucket is private (not public). Auditors access artifacts through the portal or verification scripts.

---

## Audit Snapshots

### Schema: `audit_snapshots`

| Column | Type | Purpose |
|--------|------|---------|
| `id` | uuid | Primary key |
| `organization_id` | uuid | Parent org |
| `tag_name` | text | Git tag (e.g., `audit/2026-Q1`) |
| `audit_period_start` | date | Start of audit window |
| `audit_period_end` | date | End of audit window |
| `commit_sha` | text | Git commit at snapshot time |
| `created_at` | timestamptz | Snapshot creation time |

### Schema: `audit_snapshot_revisions`

Join table linking a snapshot to frozen `document_revisions` rows:

| Column | Type |
|--------|------|
| `snapshot_id` | uuid → `audit_snapshots` |
| `revision_id` | uuid → `document_revisions` |

### Snapshot Triggers

1. **Manual:** Admin creates a snapshot through the dashboard.
2. **Automatic:** The GitHub webhook handler intercepts `create` events for tags matching `audit/*`. It creates a snapshot, computes the 12-month audit period, and freezes the latest approved revision for every document.

---

## VCS Merge Events (Population List)

### Schema: `vcs_merge_events`

Records every merged PR from GitHub webhooks for CC8.1 (Change Management) and Segregation of Duties testing.

| Column | Type | Purpose |
|--------|------|---------|
| `pr_number` | integer | PR number |
| `pr_title` | text | PR title |
| `author_login` | text | PR author |
| `merger_login` | text | Who merged |
| `reviewer_logins` | text[] | Who reviewed |
| `is_self_merged` | boolean (generated) | `author_login = merger_login` |
| `has_review` | boolean (generated) | `reviewer_logins` is non-empty |
| `merge_commit_sha` | text | Merge commit |
| `files_changed` / `additions` / `deletions` | integer | Change stats |

Auditors use this table to:
1. Select a sample of PRs for change management testing.
2. Identify self-merged PRs (SoD violations) for focused inquiry.
3. Verify that bot noise is separated from human changes.

---

## Auditor Portal

### Token-Based Access

`auditor_portal_tokens` provides time-boxed, read-only access:

| Column | Type | Purpose |
|--------|------|---------|
| `token_hash` | text | SHA-256 of raw token |
| `snapshot_id` | uuid | Which snapshot to display |
| `expires_at` | timestamptz | Auto-expiration (e.g., 30 days) |
| `label` | text | Human-readable label |

### Portal Features

- **System Description** — Rendered from the `system-description` template
- **TSC Matrix Navigation** — AICPA criteria menu (CC1–CC9, A1, C1, PI1, P1–P8)
- **Provenance Timeline** — For each document: Drafted → Approved → Exported → Merged with immutable timestamps from the hash-chain
- **Anti-Theater Metadata** — Hash-chain checksums and ledger timestamps displayed alongside each revision, proving evidence was created concurrently with the event
- **Evidence Linkage** — `evidence_artifacts` linked to criteria

---

## Database Tables Summary

| Table | Migration | Purpose |
|-------|-----------|---------|
| `organizations` | initial_schema | Multi-tenant root |
| `organization_members` | initial_schema | Role-based membership |
| `templates` | initial_schema | Handlebars template library |
| `generated_docs` | initial_schema | Mutable document drafts |
| `audit_logs` | initial_schema | Hash-chained event ledger |
| `organization_integrations` | lifecycle_and_integrations | GitHub/Azure DevOps connections |
| `document_revisions` | control_graph | Immutable revision ledger |
| `organization_api_keys` | control_graph | Evidence ingestion auth |
| `evidence_artifacts` | control_graph | Ingested scanner results |
| `audit_snapshots` | control_graph | Point-in-time document freezes |
| `audit_snapshot_revisions` | control_graph | Snapshot ↔ revision join |
| `auditor_portal_tokens` | control_graph | Time-boxed portal access |
| `vcs_merge_events` | v1_dod_gaps | PR population list |

---

## RLS Policy Summary

All tables have Row Level Security enabled. Access rules:

| Role | organizations | generated_docs | audit_logs | document_revisions | evidence_artifacts | audit_snapshots |
|------|--------------|----------------|------------|-------------------|--------------------|----------------|
| admin | CRUD | CRUD | SELECT | INSERT + SELECT | SELECT | CRUD |
| editor | SELECT | CRU (draft/review) | SELECT | INSERT + SELECT | SELECT | SELECT |
| approver | SELECT | UPDATE (approve) | SELECT | SELECT | SELECT | SELECT |
| viewer | SELECT | SELECT | SELECT | SELECT | SELECT | SELECT |
| service_role | Full | Full | Full | Full | Full (insert) | Full |

Evidence artifacts and VCS merge events are inserted via the service role (from API routes/webhook handlers), not through authenticated user RLS policies.
