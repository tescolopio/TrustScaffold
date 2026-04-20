# Local Development

## Prerequisites

- **Node.js 22+** (`node --version` to verify)
- **Docker 20+** (required for local Supabase)
- **Supabase CLI** available through `npx supabase@latest`

## Start the Local Supabase Stack

From the repository root:

```bash
npx supabase@latest init --force
npx supabase@latest start
```

This project uses a reduced local Supabase config that disables Studio, Storage, Realtime, and other optional services so the local stack comes up faster and avoids unnecessary Docker image pulls.

## Reset the Local Database

To reapply the schema and template seed data from scratch:

```bash
npx supabase@latest db reset --local
```

Verification command:

```bash
PGPASSWORD=postgres psql 'postgresql://postgres@127.0.0.1:54322/postgres' -c "select count(*) from public.templates;"
```

Expected result: `16`

## Wire the Next.js App to Local Supabase

Create `.env.local` in the repository root using the values from `npx supabase@latest status`:

```env
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<PUBLISHABLE_KEY>
SUPABASE_SERVICE_ROLE_KEY=<SERVICE_ROLE_KEY>
```

The file is intentionally ignored by git.

## Run the App

Development mode:

```bash
npm install
npm run dev
```

Production-like validation:

```bash
npm run build
npm run start -- --hostname 127.0.0.1 -p 3000
```

## Local Validation Flow

1. Start Supabase.
2. Run the Next.js app.
3. Visit `http://127.0.0.1:3000/signup`.
4. Create a new account with a fresh email and organization name.
5. Confirm you land on `/dashboard` and see the generated organization ID and `admin` role.
6. Visit `/wizard`, complete all seven steps, and click generate.
7. Confirm the compiled Markdown drafts appear on `/generated-docs`.

---

## Run the E2E Test Suite

The full E2E suite (51 tests across 5 suites) and the red team adversarial suite (33 tests) require:

1. Supabase running locally
2. Staging seed applied
3. Next.js dev server running
4. Environment variables loaded

```bash
# Apply the staging seed (3 orgs, 12 users, pre-approved docs, API keys)
PGPASSWORD=postgres psql 'postgresql://postgres@127.0.0.1:54322/postgres' -f tests/seed-staging.sql

# Load environment variables (required — the JWT keys break with other methods)
set -a && source .env.local && set +a

# Run the full E2E suite
npx tsx tests/e2e/run-all.ts

# Run individual suites
npx tsx tests/e2e/01-rbac.ts
npx tsx tests/e2e/02-wizard-compilation.ts
npx tsx tests/e2e/03-control-graph.ts
npx tsx tests/e2e/04-evidence-crypto.ts
npx tsx tests/e2e/05-auditor-portal.ts

# Run the red team adversarial suite
npx tsx tests/e2e/red-team.ts
```

See [`MASTER_TEST_PLAN.md`](MASTER_TEST_PLAN.md) for the full test plan and traceability matrix.

---

## Run Template Edge-Case Tests

After Supabase is running with seeded data, validate all Handlebars templates compile cleanly across 12 infrastructure configurations:

```bash
npx tsx scripts/test-templates.ts
```

This connects to the local Postgres instance and compiles every template against AWS-only, Azure-only, GCP-only, multi-cloud, self-hosted, hybrid, all-TSC, minimal-TSC, lone-wolf, no-vendor, Azure DevOps, and multi-vendor configurations. Any unresolved expressions, empty sections, or broken tables are flagged.

---

## Configure GitHub Integration (Optional)

To test GitOps export and webhook ingestion locally:

1. Create a GitHub OAuth App at `https://github.com/settings/developers`.
2. Set the callback URL to `http://127.0.0.1:3000/auth/callback`.
3. Add to `.env.local`:

```env
GITHUB_CLIENT_ID=<your-client-id>
GITHUB_CLIENT_SECRET=<your-client-secret>
```

4. For webhook testing, expose the local server with a tunnel (e.g., `ngrok http 3000`) and configure the webhook URL as `https://<tunnel-host>/api/webhooks/github`.

---

## Test Evidence Ingestion

With Supabase running, create an API key for your organization and test the ingestion endpoint:

```bash
curl -X POST http://127.0.0.1:3000/api/v1/evidence/ingest \
  -H 'Authorization: Bearer <your-api-key>' \
  -H 'Content-Type: application/json' \
  -d '{
    "run_metadata": {
      "collection_tool": "prowler",
      "source_system": "aws",
      "timestamp": "2026-04-19T00:00:00Z",
      "run_id": "test-run-001"
    },
    "artifacts": [{
      "control_mapping": "CC6.1",
      "artifact_name": "iam-mfa-check",
      "status": "PASS",
      "raw_data": {"check": "iam_mfa_enabled", "status": "PASS"}
    }]
  }'
```

---

## Database Migrations

The V1.0 schema is applied across four migration files in order:

1. `20260418193000_initial_schema.sql` — Core tables, audit triggers, auth bootstrap
2. `20260418235500_lifecycle_and_integrations.sql` — VCS integrations, approve/archive functions
3. `20260419000000_control_graph.sql` — Revision ledger, evidence artifacts, audit snapshots, portal tokens
4. `20260419010000_v1_dod_gaps.sql` — VCS merge events (population list)

All migrations are applied automatically by `npx supabase@latest db reset --local`. Seed data (16 templates) is loaded from `supabase/seed.sql`.

---

## Useful Commands

Check local service URLs and keys:

```bash
npx supabase@latest status -o json
```

Query org bootstrap results after signup:

```bash
PGPASSWORD=postgres psql 'postgresql://postgres@127.0.0.1:54322/postgres' -P pager=off -c "select u.email, o.name, o.id, om.role from auth.users u join public.organization_members om on om.user_id = u.id join public.organizations o on o.id = om.organization_id where u.email = 'you@example.com';"
```
