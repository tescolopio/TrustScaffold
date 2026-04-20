# Build Spec

> Repository structure, database schema, API surface, and build pipeline for TrustScaffold V1.0.

---

## Repository Structure

```
trustscaffold/
├── app/                          # Next.js App Router
│   ├── (dashboard)/              # Authenticated layout group
│   │   ├── dashboard/            # Main dashboard
│   │   ├── generated-docs/       # Document list + [id] detail
│   │   ├── wizard/               # 7-step policy wizard
│   │   ├── team/                 # Organization member management
│   │   └── settings/             # Org config, control graph settings
│   ├── (public)/
│   │   └── auditor/[token]/      # Read-only auditor portal
│   ├── api/
│   │   ├── v1/evidence/ingest/   # POST evidence ingestion
│   │   └── webhooks/github/      # GitHub webhook handler
│   ├── auth/callback/            # OAuth callback
│   ├── login/                    # Login page + server action
│   └── signup/                   # Signup page + server action
│
├── components/
│   ├── layout/                   # Dashboard header, sidebar
│   ├── providers/                # Org context provider
│   ├── ui/                       # shadcn/ui primitives
│   └── wizard/                   # Policy wizard components
│       ├── policy-wizard.tsx      # Main form (7 steps)
│       ├── auditor-lens-callout.tsx
│       ├── lone-wolf-warning.tsx  # SoD / MFA warnings
│       └── show-me-how.tsx        # Config guide snippets
│
├── lib/
│   ├── auth/                     # getDashboardContext()
│   ├── documents/
│   │   └── template-engine.ts    # Handlebars compilation
│   ├── evidence/
│   │   ├── canonicalize.ts       # RFC 8785 JCS
│   │   └── scanner-normalizers.ts # Prowler/Steampipe/CloudQuery
│   ├── export/
│   │   ├── export-helpers.ts     # GitHub/ADO export logic
│   │   └── load-export-context.ts
│   ├── integrations/
│   │   └── token-crypto.ts       # AES-256-GCM token encryption
│   ├── synthesis/
│   │   └── llm-synthesis.ts      # Stateless LLM narrative layer
│   ├── wizard/
│   │   ├── schema.ts             # Zod schema + TSC helpers
│   │   ├── store.ts              # Zustand persisted store
│   │   └── template-payload.ts   # Wizard → Handlebars variables
│   ├── supabase.ts               # Browser client
│   ├── supabase-server.ts        # Server client
│   ├── supabase-service.ts       # Service role client
│   ├── supabase-server-env.ts    # Server env bindings
│   ├── supabase-public-env.ts    # Public env bindings
│   ├── tsc-criteria.ts           # AICPA TSC 2017 reference
│   ├── types.ts                  # Shared TypeScript types
│   └── utils.ts                  # cn() utility
│
├── scripts/
│   ├── verify-hashes.sh          # Auditor hash verification
│   └── test-templates.ts         # Handlebars edge-case tests
│
├── supabase/
│   ├── config.toml               # Local dev config
│   ├── seed.sql                  # 16 Handlebars templates
│   └── migrations/
│       ├── 20260418193000_initial_schema.sql
│       ├── 20260418235500_lifecycle_and_integrations.sql
│       ├── 20260419000000_control_graph.sql
│       └── 20260419010000_v1_dod_gaps.sql
│
├── docs/
│   ├── CONTROL_GRAPH_ARCHITECTURE.md
│   ├── PRODUCT_SPEC_V1.md
│   ├── BUILD_SPEC.md              # (this file)
│   ├── TSC_MAPPING_AUDIT.md
│   ├── LOCAL_DEV.md
│   └── SELF-HOSTING.md
│
├── middleware.ts                  # Route protection
├── package.json                  # v0.1.0
├── next.config.ts                # typedRoutes enabled
├── tsconfig.json                 # TypeScript 5.7
├── tailwind.config.ts
├── LICENSE                       # AGPLv3
├── NOTICE                        # Third-party licenses
└── README.md
```

---

## Database Schema

### Migrations (applied in order)

| Migration | Tables Created | Key Features |
|-----------|---------------|--------------|
| `20260418193000_initial_schema.sql` | organizations, templates, generated_docs, audit_logs, organization_members | Enums (org_role, doc_status), slug generation, RLS, audit triggers, hash-chain checksums, auth signup handler |
| `20260418235500_lifecycle_and_integrations.sql` | organization_integrations | Encrypted token storage, approve/archive functions |
| `20260419000000_control_graph.sql` | document_revisions, organization_api_keys, evidence_artifacts, audit_snapshots, audit_snapshot_revisions, auditor_portal_tokens | Enums (revision_source, evidence_status), evidence storage bucket, insert_document_revision() |
| `20260419010000_v1_dod_gaps.sql` | vcs_merge_events | is_self_merged/has_review generated columns, unique PR index |

### Extensions Required

- `uuid-ossp` — UUID generation
- `pgcrypto` — SHA-256 hashing (`digest()`), encryption

### Entity Relationship (simplified)

```
auth.users
    │
    ├── organization_members ── organizations
    │                              │
    │                    ┌─────────┼─────────┬──────────────┐
    │                    │         │         │              │
    │              generated_docs  │   audit_logs    organization_integrations
    │                    │         │                        │
    │           document_revisions │                 vcs_merge_events
    │                    │         │
    │         audit_snapshot_revisions
    │                    │
    │              audit_snapshots
    │                    │
    │         auditor_portal_tokens
    │
    │              organization_api_keys
    │                    │
    │             evidence_artifacts
    │
    └── templates (global, no org FK)
```

---

## API Surface

### Protected Routes (require auth via middleware)

| Route | Method | Purpose |
|-------|--------|---------|
| `/dashboard` | GET | Main dashboard |
| `/wizard` | GET | 7-step wizard form |
| `/generated-docs` | GET | Document list |
| `/generated-docs/[id]` | GET | Document detail + revisions |
| `/team` | GET | Member management |
| `/settings` | GET | Org settings |

### Public Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/login` | GET/POST | Email auth |
| `/signup` | GET/POST | Registration + org bootstrap |
| `/auth/callback` | GET | OAuth redirect |
| `/auditor/[token]` | GET | Read-only auditor portal |

### API Endpoints

| Route | Method | Auth | Purpose |
|-------|--------|------|---------|
| `/api/v1/evidence/ingest` | POST | API key (Bearer) | Evidence artifact ingestion |
| `/api/webhooks/github` | POST | Webhook signature | GitHub PR/tag events |

---

## Build Pipeline

### Scripts

| Command | Action |
|---------|--------|
| `npm run dev` | Start Next.js dev server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript type checking |
| `npx tsx scripts/test-templates.ts` | Handlebars edge-case tests |

### Build Requirements

- Node.js 22+
- Docker (for local Supabase)
- Supabase CLI (`npx supabase@latest`)

### Environment Variables

**Required:**
```env
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
```

**Optional (integrations):**
```env
GITHUB_CLIENT_ID=<github-oauth-app-client-id>
GITHUB_CLIENT_SECRET=<github-oauth-app-client-secret>
AZURE_DEVOPS_PAT=<azure-devops-personal-access-token>
```

### Supabase Local Stack

Optimized `config.toml` disables Studio, Storage UI, Realtime, and other optional services for fast startup. Core services:

| Service | Port |
|---------|------|
| API (PostgREST) | 54321 |
| Database (Postgres) | 54322 |
| Shadow DB | 54320 |
| Auth (GoTrue) | 54321 (via API) |

---

## Security Architecture

### Client-Side Boundaries

- Browser-safe config: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` only.
- No PATs, webhook secrets, or service-role keys in client bundle.
- All Git operations happen server-side via API routes.
- Token encryption uses `SUPABASE_SERVICE_ROLE_KEY` as AES-256-GCM key material.

### Server-Side Auth

- `middleware.ts` protects routes under `/dashboard`, `/wizard`, `/generated-docs`, `/team`, `/settings`.
- `@supabase/ssr` handles cookie-based session management.
- Service role client used only in API routes (evidence ingestion, webhooks).

### RLS Enforcement

All application tables enforce Row Level Security. The `current_user_has_org_role()` function validates organization membership and role for every query.

### Audit Immutability

- `audit_logs` table: `BEFORE UPDATE/DELETE` trigger raises exception.
- `REVOKE ALL` on `anon`/`authenticated` roles; only `SELECT` granted.
- Hash-chain integrity verifiable with `scripts/verify-hashes.sh`.
