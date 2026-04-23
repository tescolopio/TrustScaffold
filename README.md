# TrustScaffold

**Open-source compliance automation — starting with SOC 2.**

[![License: AGPLv3](https://img.shields.io/badge/License-AGPLv3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org)
[![Supabase](https://img.shields.io/badge/Supabase-3F46FF?logo=supabase)](https://supabase.com)
[![Tests](https://img.shields.io/badge/E2E_Tests-51_passed-brightgreen)]()
[![Red Team](https://img.shields.io/badge/Red_Team-33_passed-brightgreen)]()

TrustScaffold is a **self-hostable compliance platform** that guides teams through an intelligent 7-stage wizard to generate framework-mapped policy documents, enforce an immutable audit trail, and present provable compliance state to external auditors.

SOC 2 is the first supported framework — covering both **Type I** (control design at a point in time) and **Type II** (operating effectiveness over an audit period). The wizard and templates establish the control design; the evidence ingestion API, hash-chained audit log, and auditor portal prove ongoing effectiveness. The template-driven architecture is designed to support ISO 27001, HIPAA, PCI DSS, and NIST CSF via additional template packs.

Choose your compliance framework and criteria, describe your infrastructure (public cloud, hybrid, or self-hosted), identify your sub-service organizations, and receive pre-filled, legal-review-ready documentation that lands directly in your Git repository as a pull request.

> **No more blank Markdown files. No more manual copy-paste.** Get your compliance documentation foundation done in minutes.

---

## Prerequisites

| Requirement | Version | Notes |
|---|---|---|
| **Node.js** | 22+ | `node --version` to verify |
| **Docker** | 20+ | Required for local Supabase |
| **npm** | 10+ | Ships with Node.js 22 |

---

## Quick Start — Local Development (5 minutes)

```bash
# 1. Clone
git clone https://github.com/tescolopio/trustscaffold.git
cd trustscaffold

# 2. Bootstrap local development
bash scripts/setup.sh
# or unattended cold-fork verification:
# bash scripts/setup.sh --yes

# 3. Start the dev server
npm run dev
```

The setup script checks Node 22+, Docker, curl, installs dependencies with `npm ci` when the lockfile is present, starts or reuses the local Supabase stack, writes `.env.local`, ensures the `evidence` bucket exists, verifies the template seed, and can run the production build for unattended validation.

Open the signup URL printed by the script, then create an account and land on `/dashboard`.

> **Full local development guide:** [`docs/LOCAL_DEV.md`](docs/LOCAL_DEV.md)
> **Run the E2E test suite:** [`docs/MASTER_TEST_PLAN.md`](docs/MASTER_TEST_PLAN.md)

---

## Quick Start — Docker (Self-Host)

```bash
# 1. Clone
git clone https://github.com/tescolopio/trustscaffold.git
cd trustscaffold

# 2. Configure environment
cp .env.example .env
# Edit .env with your Supabase project URL and keys

# 3. Build and start
docker compose up -d --build

# 4. Verify
curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/
# Expected: 200 or 307 (redirect to login)
```

The included [`Dockerfile`](Dockerfile) produces a minimal 3-stage production image. The [`docker-compose.yml`](docker-compose.yml) wires it up with environment variables and health checks.

> **Full self-hosting guide:** [`docs/SELF-HOSTING.md`](docs/SELF-HOSTING.md)

---

## Quick Start — Vercel + Managed Supabase

1. Fork this repository on GitHub.

2. Deploy to Vercel:

   [![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/tescolopio/trustscaffold)

3. Create a Supabase project at [supabase.com](https://supabase.com).

4. Set environment variables in Vercel:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   GITHUB_CLIENT_ID=your-github-app-client-id          # optional
   GITHUB_CLIENT_SECRET=your-github-app-client-secret   # optional
   ```

5. Apply database migrations via the Supabase dashboard SQL editor or `supabase db push`.

6. Open your deployed URL → start your first wizard!

---

## Features

- **7-stage guided wizard** — Onboarding → Scope → Framework & criteria selection → Cloud profiling → Operations → Review → Output destination
- **Cloud-native intelligence** — Dynamic questions and pre-filled language for Azure, AWS, GCP, hybrid, and on-prem
- **Framework-mapped templates** — 16 high-quality starters with conditional Handlebars logic (SOC 2 Type I & II included; extensible to other frameworks)
- **Immutable audit trail** — Hash-chained, append-only audit log with SHA-256 checksums. Tamper-evident by design
- **Evidence ingestion API** — Ingest Prowler, Steampipe, and CloudQuery output via `POST /api/v1/evidence/ingest`
- **GitOps delivery** — Export approved documents as PRs to GitHub or Azure DevOps with two-way webhook sync
- **Auditor portal** — Time-boxed, read-only access for external CPAs with provenance timeline
- **Multi-tenant** — Row Level Security on every table. Full tenant isolation verified by 51 E2E tests
- **Fully self-hostable** — Docker, Vercel, Coolify, Railway — your infrastructure, your data

---

## How the Wizard Works

1. **Welcome & Onboarding** — Company name, logo, industry
2. **Company Profile & Scope** — Systems, data types, sub-service organizations
3. **Criteria Selection** — Security (mandatory) + optional Availability, Processing Integrity, Confidentiality, Privacy
4. **Infrastructure Profiling** — Smart branching questions adapting to your architecture
5. **Operations** — Change management, incident response, risk register
6. **Review & Generate** — Summary + instant template generation with environment-specific snippets
7. **Output Destination** — Download ZIP or commit/PR directly to your VCS provider

---

## Template Library (SOC 2 Type I & Type II)

| Template | TSC Mapping |
|---|---|
| Information Security Policy | CC1–CC9 |
| Access Control & On/Offboarding Policy | CC6 |
| Incident Response Plan | CC7 |
| Change Management Policy | CC8 |
| Risk Management Policy | CC3, CC9 |
| Business Continuity & DR Plan | A1 |
| Backup & Recovery Policy | A1 |
| Data Classification & Handling Policy | C1 |
| Encryption Policy | C1 |
| Privacy Notice & Consent Policy | P1–P8 |
| Vendor Management Policy | CC3, CC9 |
| SDLC Policy | CC8 |
| Physical Security Policy | CC6 |
| Acceptable Use Policy / Code of Conduct | CC1, CC2 |
| Evidence Checklist | All selected criteria |
| System Description (AICPA DC 200) | All selected criteria |

Every template includes YAML frontmatter with precise criteria mappings, Handlebars conditional logic for infrastructure-specific clauses, and a prominent disclaimer banner.

> **Want to add ISO 27001, HIPAA, or another framework?** The template engine is framework-agnostic. Add templates to `supabase/seed.sql` with the appropriate criteria mappings. See [`docs/BUILD_SPEC.md`](docs/BUILD_SPEC.md) for the schema.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 (App Router) + Tailwind CSS + shadcn/ui |
| Database & Auth | Supabase (PostgreSQL + Auth + PostgREST) |
| Templating | Handlebars |
| Forms | React Hook Form + Zod |
| State | Zustand |
| Git Integration | @octokit/rest (GitHub) + Azure DevOps REST API |
| Deployment | Docker, Vercel, or any Node.js host |

---

## Testing

TrustScaffold ships with a comprehensive E2E test suite and a red team adversarial suite:

```bash
# Load environment and run all E2E tests (51 tests across 5 suites)
set -a && source .env.local && set +a
npx tsx tests/e2e/run-all.ts

# Run the red team suite (33 adversarial tests across 10 attack vectors)
npx tsx tests/e2e/red-team.ts
```

| Suite | Tests | Coverage |
|---|---|---|
| Tenant Isolation & RBAC | 16 | Cross-tenant reads, privilege escalation, self-demotion |
| Wizard & Compilation | 8 | Idempotency, TSC filtering, physical logic, DC 200 |
| Control Graph (GitOps) | 7 | Webhook signatures, merge detection, audit snapshots |
| Evidence & Cryptography | 13 | Schema validation, hash chains, JCS canonicalization |
| Auditor Portal | 7 | Token lifecycle, read-only enforcement, cross-org isolation |
| **Red Team** | **33** | Horizontal/vertical escalation, IDOR, SQLi, webhook forgery, audit tampering |

> **Full test plan:** [`docs/MASTER_TEST_PLAN.md`](docs/MASTER_TEST_PLAN.md)

---

## Documentation

| Document | Description |
|---|---|
| [`docs/LOCAL_DEV.md`](docs/LOCAL_DEV.md) | Local development setup, validation flow, useful commands |
| [`docs/SELF-HOSTING.md`](docs/SELF-HOSTING.md) | Production deployment, Docker, security boundaries |
| [`docs/MASTER_TEST_PLAN.md`](docs/MASTER_TEST_PLAN.md) | Complete test plan with traceability matrix |
| [`docs/PRODUCT_SPEC_V1.md`](docs/PRODUCT_SPEC_V1.md) | Product specification and feature descriptions |
| [`docs/BUILD_SPEC.md`](docs/BUILD_SPEC.md) | Repository structure, database schema, API surface |
| [`docs/CONTROL_GRAPH_ARCHITECTURE.md`](docs/CONTROL_GRAPH_ARCHITECTURE.md) | Immutable ledger and evidence pipeline design |
| [`docs/TSC_MAPPING_AUDIT.md`](docs/TSC_MAPPING_AUDIT.md) | AICPA TSC criteria-to-template mapping |

---

## License

AGPLv3. You are free to self-host, modify, and use TrustScaffold. If you run a modified version as a service (even internally), you must make your changes publicly available under the same license.

---

## Contributing

1. Fork the repo
2. Create a feature branch
3. Make your changes
4. Run the test suite: `npx tsx tests/e2e/run-all.ts`
5. Open a PR

---

## Roadmap

### V1.0 (Current)

- Full 7-stage compliance wizard with cloud profiling
- 16 SOC 2 Type I & Type II templates with Handlebars conditional logic
- Immutable document revision ledger with hash-chained audit logging
- GitOps export to GitHub + two-way webhook sync
- Evidence ingestion API (Prowler, Steampipe, CloudQuery)
- Auditor portal with provenance timeline
- Docker self-hosting support

### V1.1

- ISO 27001 template pack (community contribution welcome)
- Collaborative Tiptap editor
- PDF/DOCX export

### Future

- HIPAA, PCI DSS, NIST CSF template packs
- AI-assisted policy refinement
- Continuous compliance integrations (Azure Monitor, AWS Config, etc.)
- White-label / embeddable mode for compliance consultancies

---

Built for teams who want their compliance documentation done right — without the overwhelm.

Questions? Open an issue or reach out on [X @DByooki](https://x.com/DByooki) or [LinkedIn](https://linkedin.com/in/tescolopio).

**Ready to get started? Fork & Deploy.**
