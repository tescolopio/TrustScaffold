# TrustScaffold

**The modern wizard that scaffolds your SOC 2 policies - cloud-aware, TSC-mapped, and delivered straight to GitHub or Azure DevOps.**

[![License: AGPLv3](https://img.shields.io/badge/License-AGPLv3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org)
[![Supabase](https://img.shields.io/badge/Supabase-3F46FF?logo=supabase)](https://supabase.com)

TrustScaffold is a **self-hostable web application** that guides early-stage SaaS companies through an intelligent 7-stage wizard to generate high-quality, TSC-aligned SOC 2 policy templates.  

Choose your Trust Services Criteria, describe your infrastructure (public cloud providers, hybrid deployments, or entirely self-hosted environments), identify your sub-service organizations, and instantly receive pre-filled, legal-review-ready starting-point documentation that lands directly in your Git repository as a pull request.

No more staring at blank Markdown files. No more manual copy-paste. Just a delightful, modern experience that gets your SOC 2 documentation foundation done in minutes.

## Features

- **7-stage guided wizard** – Onboarding → Scope → TSC selection → Cloud profiling → Operations → Review → Output destination
- **Cloud-native intelligence** – Dynamic questions and pre-filled language for Azure, AWS, GCP, hybrid, and on-prem
- **TSC-mapped templates** – 14+ high-quality starters seeded from Comply + enhanced with conditional Handlebars logic
- **Zero-friction delivery** – Commit files or open a PR directly in GitHub or Azure DevOps
- **Built-in disclaimers** – Every document clearly states these are starting-point templates only
- **Real-time collaboration** – Powered by Supabase
- **Export options** – Markdown, PDF, DOCX with branding and version stamps
- **Multi-tenant ready** – Row Level Security by default
- **Fully self-hostable** – Run it privately inside your own SaaS company

## Quick Start (Recommended – 5–10 minutes)

### Option 1: One-Click Deploy (Vercel + Supabase)

1. Click the button below to deploy on Vercel:
   [![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR-USERNAME/trustscaffold)  
   *(Replace `YOUR-USERNAME` with your GitHub username after you fork the repo)*

2. Create a new Supabase project at [supabase.com](https://supabase.com)

3. Copy the following environment variables into Vercel:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   GITHUB_CLIENT_ID=your-github-app-client-id          # optional but recommended
   GITHUB_CLIENT_SECRET=your-github-app-client-secret

4. Run the Supabase migrations (one-click in Supabase dashboard or via `supabase db push`)
5. Open the deployed URL → start your first wizard!

### Option 2: Full Self-Host (Docker + Coolify / Railway)

See `docs/SELF-HOSTING.md` (will be added in the repo).

## How the Wizard Works

1. Welcome & Onboarding – Company name, logo, industry
2. Company Profile & Scope – Systems, data types, and critical sub-service organizations
3. TSC Selection – Security (mandatory) + optional Availability, Processing Integrity, Confidentiality, Privacy
4. Infrastructure Profiling – Smart branching questions adapting to your architecture (Public Cloud, Hybrid, or Self-Hosted SaaS)
5. Additional Context – Change management, incident response, risk register
6. Review & Generate – Summary + instant template generation with environment-specific snippets
7. Output Destination – Download ZIP or commit/PR directly to your version control provider

## Included Template Library

The wizard generates one Markdown file per selected TSC from this battle-tested library:

- Information Security Policy (CC1–CC9)
- Access Control & On/Offboarding Policy (CC6)
- Incident Response Plan (CC7)
- Change Management Policy (CC8)
- Risk Management Policy (CC3, CC9)
- Business Continuity & DR Plan (A1)
- Backup & Recovery Policy (A1)
- Data Classification & Handling Policy (C1)
- Encryption Policy (C1)
- Privacy Notice & Consent Policy (P1–P8)
- Vendor Management Policy (CC3, CC9)
- Secure Software Development Life Cycle (SDLC) Policy (CC8)
- Physical Security Policy (CC6)
- Acceptable Use Policy (UAP) / Code of Conduct (CC1, CC2)

All templates include:

- YAML frontmatter with precise TSC mappings for automated auditor ingestion
- Handlebars placeholders dynamically replacing your company name, cloud platforms, and sub-service organizations
- Conditional clauses that include or exclude specific policy rules based on your selected infrastructure (e.g., self-hosted vs cloud-native)
- Prominent disclaimer banner ensuring teams review rather than blindly adopt

## Tech Stack

- Frontend – Next.js 15 (App Router) + Tailwind CSS + shadcn/ui
- Database & Auth – Supabase (PostgreSQL + Realtime + Auth + Storage)
- Editor – Tiptap (ProseMirror)
- Templating – Handlebars
- Integrations – @octokit/rest (GitHub) + Azure DevOps REST API
- Forms – React Hook Form + Zod
- Deployment – Vercel or Docker/Coolify

## Repository Structure
See `docs/BUILD_SPEC.md` for the complete architecture and database schema.

## License
This project is licensed under AGPLv3.
You are free to self-host, modify, and use it. If you run a modified version as a service (even internally), you must make your changes publicly available under the same license.

## Contributing
We welcome contributions! Please see CONTRIBUTING.md (coming soon).

1. Fork the repo
2. Create a feature branch
3. Make your changes
4. Open a PR

## Roadmap

### MVP (v0.1)

- Full 7-stage wizard
- Cloud profiling (Azure + AWS + GCP)
- Template generation + GitHub/Azure DevOps output
- Basic dashboard

### v0.2

- Collaborative Tiptap editor
- Evidence uploader linked to controls
- PDF/DOCX export polish

### Future

- AI-assisted policy refinement
- Continuous compliance integrations (Azure Monitor, AWS Config, etc.)
- White-label / embeddable mode for SaaS vendors

Built for early-stage SaaS teams who just want their SOC 2 documentation done right — without the overwhelm.

Questions? Open an issue or reach out on X @DByooki or on LinkedIn at LinkedIn.com/in/tescolopio.
Ready to get started? Fork & Deploy.
