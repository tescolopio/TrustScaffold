# Self-Hosting

## Architecture

TrustScaffold consists of two runtime layers:

1. **Next.js 15 App Router application** — serves the UI, wizard, API routes, and webhook handlers
2. **Supabase project** — provides Postgres, Auth, and PostgREST APIs

The app talks to Supabase using:

- Browser-safe publishable config for interactive auth and authenticated data access
- Server-side auth clients for protected actions
- A server-only service role key reserved for privileged maintenance workflows

## Required Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Optional integration secrets:

```env
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
AZURE_DEVOPS_PAT=
```

All secrets must be kept server-side only. See [Security Boundaries](#security-boundaries) below.

---

## Deployment Options

### Option 1: Docker (Recommended for Self-Host)

TrustScaffold ships with a production-ready [`Dockerfile`](../Dockerfile) (3-stage build: deps → build → runner) and a [`docker-compose.yml`](../docker-compose.yml).

#### Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/tescolopio/trustscaffold.git
cd trustscaffold

# 2. Create your environment file
cp .env.example .env
# Edit .env with your Supabase project URL and keys:
#   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
#   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
#   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# 3. Build and start
docker compose up -d --build

# 4. Verify the container is healthy
docker compose ps
curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/
# Expected: 200 or 307 (redirect to login)
```

#### Build the Image Standalone

```bash
docker build \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key \
  -t trustscaffold:latest .

docker run -d \
  -p 3000:3000 \
  -e NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co \
  -e NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key \
  -e SUPABASE_SERVICE_ROLE_KEY=your-service-role-key \
  --name trustscaffold \
  trustscaffold:latest
```

The Dockerfile uses `node:22-alpine` and Next.js standalone output mode for a minimal production image (~150MB).

#### docker-compose.yml Details

The included `docker-compose.yml` configures:

- Build args for Next.js public environment variables (baked at build time)
- Runtime environment variables for server-side secrets
- Health check via `wget --spider` on port 3000
- `restart: unless-stopped` for automatic recovery
- Configurable port via `APP_PORT` (default: 3000)

### Option 2: Managed Supabase + Vercel / Coolify / Railway

- Deploy the Next.js app to Vercel, Coolify, Railway, or any container host.
- Provision a hosted Supabase project at [supabase.com](https://supabase.com).
- Apply the SQL migrations and seed file (see [Database Initialization](#database-initialization)).
- Set the required environment variables on the app host.

### Option 3: Full Self-Hosted Stack

- Run Supabase in Docker via the [official self-hosted guide](https://supabase.com/docs/guides/self-hosting/docker).
- Run the TrustScaffold Next.js app in a separate container using the included Dockerfile.
- Expose the app through a reverse proxy such as Caddy, Nginx, or Traefik.
- Restrict direct database access to internal networks only.

## Security Boundaries

- Never expose `SUPABASE_SERVICE_ROLE_KEY` to the browser bundle.
- Keep `.env.local`-style secrets out of source control.
- Use HTTPS in front of both the app and any public Supabase endpoints.
- Keep RLS enabled on all application tables.
- Treat GitHub and Azure DevOps credentials as server-only integration secrets.

## Database Initialization

Apply all four migrations and the seed file in order:

```bash
npx supabase@latest db reset
```

Or, in hosted Supabase, execute the migrations sequentially:

1. `supabase/migrations/20260418193000_initial_schema.sql` — Core schema, audit triggers, auth
2. `supabase/migrations/20260418235500_lifecycle_and_integrations.sql` — VCS integrations
3. `supabase/migrations/20260419000000_control_graph.sql` — Revision ledger, evidence, snapshots, portal
4. `supabase/migrations/20260419010000_v1_dod_gaps.sql` — VCS merge events
5. `supabase/seed.sql` — 16 Handlebars policy templates

### Required Postgres Extensions

- `uuid-ossp` — UUID generation (included in Supabase by default)
- `pgcrypto` — SHA-256 hashing and encryption (included in Supabase by default)

Both are enabled automatically by the initial migration.

## GitHub Integration Setup

### OAuth App (for user authentication)

1. Create a GitHub OAuth App at `https://github.com/settings/developers`.
2. Set the callback URL to `https://<your-domain>/auth/callback`.
3. Set `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` in your environment.

### Webhook (for two-way Git sync)

1. In your GitHub repository, go to Settings → Webhooks.
2. Set the Payload URL to `https://<your-domain>/api/webhooks/github`.
3. Set Content type to `application/json`.
4. Select events: `Pull requests` and `Create` (tags).
5. The webhook secret is stored encrypted in `organization_integrations.webhook_secret`.

The webhook handler processes:
- **PR merges** — Compares merged content hash with local revision; inserts `merged` revision if changed. Records PR in `vcs_merge_events` for Segregation of Duties analysis.
- **Tag creation** — Tags matching `audit/*` auto-create audit snapshots with a 12-month period and freeze all approved document revisions.

## Evidence Ingestion API

The `POST /api/v1/evidence/ingest` endpoint accepts automated CSPM scanner output:

1. Create an API key for your organization through the Settings page.
2. Include the key as a Bearer token: `Authorization: Bearer <key>`.
3. The endpoint auto-detects Prowler, Steampipe, and CloudQuery formats.
4. Payloads are canonicalized (RFC 8785 JCS), hashed (SHA-256), and frozen in Supabase Storage.

## Auditor Portal

Admins can generate time-boxed portal tokens from the Settings page. Each token:
- Links to a specific audit snapshot.
- Expires after a configurable period (default 30 days).
- Provides read-only access to documents, revisions, evidence, and the provenance timeline.

Portal URL: `https://<your-domain>/auditor/<token>`

## Operational Recommendations

- Monitor signup failures because the auth bootstrap trigger creates the initial organization and admin membership.
- Back up Postgres regularly.
- Rotate integration secrets and service-role keys.
- Keep the Next.js and Supabase versions pinned and upgraded deliberately.

## Current V1.0 Scope

TrustScaffold V1.0 is a compliance automation platform starting with SOC 2 Type II:

- Authenticated multi-tenant organizations with role-based access
- Seven-step compliance wizard with cloud profiling and SoD warnings
- Server-side Handlebars compilation of 16 framework-mapped policy templates
- System Description auto-generation (AICPA DC 200)
- Immutable document revision ledger with hash-chained audit logging
- GitOps export to GitHub with two-way webhook sync
- Automated evidence ingestion API (Prowler, Steampipe, CloudQuery)
- Audit snapshots triggered by Git tags
- Read-only auditor portal with provenance timeline and anti-theater metadata
- Population list generation for Segregation of Duties analysis

The template engine is framework-agnostic. ISO 27001, HIPAA, PCI DSS, and NIST CSF can be added as additional template packs without architectural changes.

See [PRODUCT_SPEC_V1.md](PRODUCT_SPEC_V1.md) for the complete product specification.
