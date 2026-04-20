# Product Spec V1

> Internal product specification for TrustScaffold V1.0. Describes what ships, why, and the user-facing behavior for each feature area.

---

## Vision

TrustScaffold is an open-source compliance automation platform — starting with SOC 2 Type II. The architecture is framework-agnostic: the template engine, evidence pipeline, audit trail, and auditor portal support any compliance framework via additional template packs (ISO 27001, HIPAA, PCI DSS, NIST CSF).

V1.0 transitions from an "AI Document Generator" to a **Canonical Compliance Ledger** (the Control Graph). It captures complex infrastructure intent, enforces an immutable document lifecycle, synchronizes bidirectionally with Git, and presents provable state to external auditors — without relying on human-curated screenshots.

---

## 1. The Wizard (Intake & Infrastructure Modeling)

### Purpose
An educational compliance coach that captures granular infrastructure data while actively warning against startup compliance anti-patterns ("Lone Wolf" configurations, security theater).

### User Flow
7-stage guided process:
1. **Welcome & Onboarding** — Company name, website, primary contact, industry
2. **System Scope** — System name, description, data types handled, multi-tenant flag
3. **TSC Selection** — Security (mandatory) + optional Availability, Confidentiality, Processing Integrity, Privacy
4. **Infrastructure Profiling** — Cloud providers (AWS/Azure/GCP), hybrid/self-hosted flags, IdP selection, cloud-specific toggles (IAM, Macie, Key Vault, SCC, etc.)
5. **Operations** — Ticketing system, VCS provider, HRIS, on-call tooling, MFA/peer-review/insurance toggles, SLA values
6. **Review** — Summary of all selections before generation
7. **Generate** — Server-side Handlebars compilation of 16 templates against wizard data

### Key Behaviors
- **Multi-Cloud Arrays:** User selects multiple cloud providers; compiler outputs conditional Handlebars for all
- **Hybrid/Self-Hosted Logic:** `hostsOwnHardware` flag triggers CC6.4 physical security clauses
- **Sub-Service Mapping:** Vendor array generates Vendor Management Review Matrix
- **Lone Wolf Warnings:** Amber callouts when `requiresPeerReview=false` (CC8.1 SoD) or `requiresMfa=false` (CC6.1)
- **Human-Centric Evidence Prompts:** Evidence checklist prompts for post-mortems, access tickets, onboarding checklists
- **Show Me How Snippets:** Expandable config guides for GitHub branch protection, Azure DevOps branch policies, Entra MFA, Okta MFA, AWS SCPs
- **Idempotency:** Re-running updates existing drafts in-place; never creates duplicates

### Template Library (16 Templates)
See [TSC_MAPPING_AUDIT.md](TSC_MAPPING_AUDIT.md) for the complete criteria-to-template mapping.

---

## 2. Dashboard & The Control Graph (Lifecycle & Sync)

### Purpose
The immutable ledger of truth managing document lifecycle and preventing backdating, fabrication, or security theater.

### Features
- **Immutable Revisions:** `document_revisions` table. Edits, approvals, merges append new rows.
- **Role-Gated Approvals:** Only `admin` or `approver` roles can transition draft → approved.
- **Hash-Chained Audit Logging:** `audit_logs` with SHA-256 checksums chaining to `previous_event_checksum`. `BEFORE UPDATE/DELETE` trigger blocks mutation.
- **GitOps Export:** Approved docs exported to GitHub/Azure DevOps as branch + PR via `@octokit/rest`.
- **Two-Way Git Sync:** `pull_request` (closed/merged) webhooks hash merged content, compare to local revision, insert `merged` revision if changed.
- **Population List:** `vcs_merge_events` table auto-populated from PR webhooks. `is_self_merged` and `has_review` computed columns for SoD analysis.
- **Audit Snapshots:** `create` (tag) webhooks matching `audit/*` auto-freeze approved revision IDs into `audit_snapshots`.

---

## 3. The Auditor Portal (Distribution)

### Purpose
Zero-setup, read-only verification for external CPAs. Replace evidence chaos with structured, timeline-backed proof.

### Features
- **Time-Boxed Authentication:** Admin generates secure magic link with configurable expiration (default 30 days).
- **Global Overview:** System Description summary, audit dates, snapshot tag under review.
- **TSC Matrix Navigation:** AICPA criteria menu (CC1–CC9, A1, C1, PI1, P1–P8).
- **Provenance Timeline:** Visual Drafted → Approved → Exported → Merged timeline with immutable system timestamps from hash-chain.
- **Anti-Theater Metadata:** SHA-256 checksums and ledger timestamps displayed alongside each revision.
- **Evidence Linkage:** `evidence_artifacts` mapped to specific criteria.

---

## 4. Telemetry-Driven Evidence Ingestion API

### Purpose
Transition from manual screenshot curation to continuous, API-driven telemetry.

### Endpoint
`POST /api/v1/evidence/ingest` — Secured via org-specific API key.

### Features
- **CSPM Integrations:** Auto-detects and normalizes Prowler, Steampipe, CloudQuery JSON.
- **Canonicalized Tamper-Evidence:** RFC 8785 JCS canonicalization → SHA-256 → frozen in Supabase Storage → logged in `evidence_artifacts`.
- **Handlebars Data Binding:** Evidence checklist template renders scanner results as Markdown tables via `{{#each evidence_runs}}` with `countByStatus` and `formatDate` helpers.
- **Stateless LLM Synthesis:** Optional provider-agnostic layer (`lib/synthesis/llm-synthesis.ts`) for formal compliance narrative generation. Raw payloads excluded from prompts. Dry-run mode for auditor transparency.
- **Auditor Verification:** `scripts/verify-hashes.sh` enables independent hash and chain verification.

---

## 5. Non-Functional Requirements

- **Idempotency:** Wizard updates existing drafts; never creates duplicates (enforced by unique partial index on `organization_id, template_id WHERE status = 'draft'`).
- **Zero-Trust Client Access:** No PATs, webhook secrets, or service-role keys in client bundle. All Git operations server-side.
- **Tenant Isolation:** RLS on all tables. Organization-scoped access verified by `current_user_has_org_role()`.
- **Build Integrity:** `npm run typecheck`, `npm run lint`, `npm run build` — zero errors.

---

## 6. System Description Auto-Generation (AICPA DC 200)

The `system-description` template programmatically generates a 7-section System Description satisfying AICPA Description Criteria (DC 3):

1. **Company Overview** — Service commitments, TSC scope (conditional sections)
2. **Infrastructure** — Cloud providers (AWS/Azure/GCP), on-premises, hybrid, network architecture
3. **Software** — Application stack, VCS, IdP, supporting software
4. **People** — Organizational structure, personnel controls, SLA values
5. **Procedures** — Change management, incident response, risk management, monitoring
6. **Data** — Classifications, encryption, subservice organizations
7. **TSC Mapping** — Criteria-to-section cross-reference table

---

## 7. Compliance Verification & Housekeeping

- **TSC Mapping Audit:** All templates formally mapped to AICPA TSC 2017. See [TSC_MAPPING_AUDIT.md](TSC_MAPPING_AUDIT.md).
- **Edge-Case Testing:** `scripts/test-templates.ts` compiles all 16 templates across 12 configuration variants (AWS-only, Azure-only, GCP-only, multi-cloud, self-hosted, hybrid, all-TSC, minimal-TSC, lone-wolf, no-vendors, Azure DevOps, multi-vendor).
- **Architecture Docs:** [CONTROL_GRAPH_ARCHITECTURE.md](CONTROL_GRAPH_ARCHITECTURE.md), [PRODUCT_SPEC_V1.md](PRODUCT_SPEC_V1.md), [BUILD_SPEC.md](BUILD_SPEC.md).
- **Operator Guides:** [LOCAL_DEV.md](LOCAL_DEV.md), [SELF-HOSTING.md](SELF-HOSTING.md).
- **License Audit:** AGPLv3 with NOTICE file documenting third-party dependencies.

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend | Next.js (App Router) | 15 |
| UI | Tailwind CSS + shadcn/ui | — |
| Runtime | React | 19 |
| Language | TypeScript | 5.7 |
| Database & Auth | Supabase (PostgreSQL + Auth) | — |
| Templating | Handlebars | 4.7 |
| Forms | React Hook Form + Zod | — |
| State | Zustand | 5.0 |
| Git Integration | @octokit/rest | 21.1 |
| Markdown Rendering | react-markdown | 9.0 |
