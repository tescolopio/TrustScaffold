#!/usr/bin/env bash
# setup.sh — Cold-fork bootstrap for TrustScaffold local development.
# Runs setup verification with interactive defaults, or unattended with --yes.
# Usage: bash scripts/setup.sh [--yes] [--skip-build]

set -euo pipefail

# ── Colours ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
ok()   { echo -e "${GREEN}✓${NC} $*"; }
warn() { echo -e "${YELLOW}⚠${NC}  $*"; }
fail() { echo -e "${RED}✗${NC} $*"; exit 1; }
step() { echo -e "\n${CYAN}▶ $*${NC}"; }

NON_INTERACTIVE=0
DEFAULT_DB_CHOICE="s"
DEFAULT_ENV_CHOICE="y"
DEFAULT_SEED_CHOICE="n"
DEFAULT_BUILD_CHOICE="n"

usage() {
  cat <<'EOF'
Usage: bash scripts/setup.sh [--yes] [--skip-build] [--help]

  --yes         Run non-interactively with local-safe defaults
                (db push, overwrite .env.local, reset bad template seed, run build)
  --skip-build  Skip the optional production build prompt/check
  --help        Show this help text
EOF
}

prompt_choice() {
  local prompt=$1
  local default=$2
  local result_var=$3
  local value

  if [[ "$NON_INTERACTIVE" -eq 1 ]]; then
    warn "Non-interactive mode: ${prompt} ${default}"
    printf -v "$result_var" '%s' "$default"
    return 0
  fi

  printf "%s" "$prompt"
  read -r value </dev/tty
  value=${value:-$default}
  printf -v "$result_var" '%s' "$value"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --yes)
      NON_INTERACTIVE=1
      DEFAULT_DB_CHOICE="p"
      DEFAULT_ENV_CHOICE="y"
      DEFAULT_SEED_CHOICE="y"
      DEFAULT_BUILD_CHOICE="y"
      ;;
    --skip-build)
      DEFAULT_BUILD_CHOICE="n"
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      fail "Unknown argument: $1"
      ;;
  esac
  shift
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

if [[ ! -r /dev/tty ]]; then
  NON_INTERACTIVE=1
fi

# ── Port utilities ─────────────────────────────────────────────────────────────
# Returns 0 (true) if the port is NOT bound on any interface.
is_port_free() {
  local port=$1
  if command -v ss &>/dev/null; then
    ! ss -tlnp 2>/dev/null | grep -qE ":${port}[[:space:]]"
  elif command -v nc &>/dev/null; then
    ! nc -z 127.0.0.1 "$port" 2>/dev/null
  else
    ! (bash -c ">/dev/tcp/127.0.0.1/$port" 2>/dev/null)
  fi
}

# Prints first free port in [start, start+range) or fails.
find_free_port() {
  local start=$1 count=${2:-10}
  for ((p=start; p<start+count; p++)); do
    if is_port_free "$p"; then echo "$p"; return 0; fi
  done
  fail "No free port found in range ${start}–$((start+count-1)). Free a port and retry."
}

# ── 1. Node version ───────────────────────────────────────────────────────────
step "Checking Node.js"
NODE_MAJOR=$(node -e "process.stdout.write(process.versions.node.split('.')[0])" 2>/dev/null) || fail "Node.js not found. Install Node 22+."
[[ "$NODE_MAJOR" -ge 22 ]] || fail "Node $NODE_MAJOR detected — Node 22+ required."
ok "Node $(node --version)"

# ── 2. Local prerequisites ────────────────────────────────────────────────────
step "Checking local prerequisites"
command -v docker &>/dev/null || fail "Docker not found. Install Docker 20+ and retry."
docker info >/dev/null 2>&1 || fail "Docker daemon not reachable. Start Docker and retry."
command -v curl &>/dev/null || fail "curl not found. Install curl and retry."
if ! command -v psql &>/dev/null; then
  warn "psql not found. Template-count verification will be skipped."
fi
ok "Docker and CLI prerequisites ready"

# ── 3. Install dependencies ───────────────────────────────────────────────────
step "Installing dependencies"
if [[ -f package-lock.json ]]; then
  npm ci --prefer-offline --no-audit --no-fund 2>&1 | tail -3
  ok "npm ci complete"
else
  npm install --prefer-offline --no-audit --no-fund 2>&1 | tail -3
  ok "npm install complete"
fi

# ── 4. Supabase CLI ───────────────────────────────────────────────────────────
step "Checking Supabase CLI"
SUPA_CMD=(npx --yes supabase@latest)
if ! "${SUPA_CMD[@]}" --version &>/dev/null 2>&1; then
  fail "Supabase CLI not available through npx. Check network access and retry."
fi
ok "Supabase CLI ready via ${SUPA_CMD[*]}"

# ── 5. Check Supabase ports before starting ───────────────────────────────────
step "Checking Supabase port availability"
SUPA_PORTS=(54321 54322 54327)
SUPA_LABELS=("API" "DB" "Analytics")
SUPA_CONFLICT=0
for i in "${!SUPA_PORTS[@]}"; do
  p="${SUPA_PORTS[$i]}"
  label="${SUPA_LABELS[$i]}"
  if ! is_port_free "$p"; then
    warn "Port $p (Supabase ${label}) is already in use — Supabase may already be running or another process owns it."
    SUPA_CONFLICT=1
  fi
done
if [[ "$SUPA_CONFLICT" -eq 0 ]]; then
  ok "Supabase ports 54321/54322/54327 are free"
else
  warn "Supabase start will attempt to reuse the running instance. If it fails, run: npx supabase@latest stop && bash scripts/setup.sh"
fi

# ── 6. Start Supabase or apply pending migrations ─────────────────────────────
step "Starting Supabase local stack"
if ! is_port_free 54321; then
  warn "Supabase is already running."
  echo -e "  ${CYAN}r${NC}) Reset — wipe all data and reseed from scratch"
  echo -e "  ${CYAN}p${NC}) Push — apply pending migrations only (preserves data)"
  echo -e "  ${CYAN}s${NC}) Skip — leave the database as-is"
  prompt_choice "  Choice [r/p/S]: " "$DEFAULT_DB_CHOICE" DB_CHOICE
  case "${DB_CHOICE,,}" in
    r)
      step "Resetting database"
      "${SUPA_CMD[@]}" db reset --local 2>&1 | grep -E '(Applying|Seeding|Resetting|error|Error)' || true
      ok "Database reset complete" ;;
    p)
      step "Applying pending migrations"
      "${SUPA_CMD[@]}" db push --local 2>&1 | grep -E '(Applying|Applied|No migrations|error|Error)' || true
      ok "Migrations applied" ;;
    *)
      ok "Database left unchanged" ;;
  esac
else
  "${SUPA_CMD[@]}" start 2>&1 | grep -E '(Starting|Applying|Seeding|Started|Error|failed)' || true
fi
ok "Supabase stack ready"

# ── 7. Parse supabase status → env vars ──────────────────────────────────────
step "Reading Supabase connection details"

PROJECT_URL=""; ANON_KEY=""; SERVICE_KEY=""

# Strategy 1: --output env (Supabase CLI v2 native, most reliable)
if ENV_OUT=$("${SUPA_CMD[@]}" status --output env 2>/dev/null) && [[ -n "$ENV_OUT" ]]; then
  PROJECT_URL=$(echo "$ENV_OUT" | grep -i 'API_URL\|SUPABASE_URL\|PROJECT_URL'  | head -1 | cut -d= -f2- | tr -d '[:space:]"')
  ANON_KEY=$(echo    "$ENV_OUT" | grep -i 'ANON_KEY'                            | head -1 | cut -d= -f2- | tr -d '[:space:]"')
  SERVICE_KEY=$(echo "$ENV_OUT" | grep -i 'SERVICE_ROLE_KEY\|SERVICE_KEY'       | head -1 | cut -d= -f2- | tr -d '[:space:]"')
fi

# Strategy 2: grep patterns against the human-readable table (strips box chars)
if [[ -z "$PROJECT_URL" || -z "$ANON_KEY" || -z "$SERVICE_KEY" ]]; then
  STATUS=$("${SUPA_CMD[@]}" status 2>/dev/null)
  [[ -z "$PROJECT_URL" ]] && PROJECT_URL=$(echo "$STATUS" | grep -i "Project URL\|api_url" | grep -oE 'https?://[^[:space:]]+' | head -1)
  [[ -z "$ANON_KEY" ]]    && ANON_KEY=$(echo    "$STATUS" | grep -i "Publishable\|anon_key" | grep -oE 'sb_publishable_[A-Za-z0-9_-]+|eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+' | head -1)
  [[ -z "$SERVICE_KEY" ]] && SERVICE_KEY=$(echo "$STATUS" | grep -i "Secret\|service_role"  | grep -oE 'sb_secret_[A-Za-z0-9_-]+|eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+'      | head -1)
fi

# Strategy 3: well-known local dev defaults (always correct for stock config)
[[ -z "$PROJECT_URL" ]] && { warn "Falling back to default local Supabase URL"; PROJECT_URL="http://127.0.0.1:54321"; }
[[ -z "$ANON_KEY" ]]    && fail "Could not determine anon key. Run: npx supabase@latest status"
[[ -z "$SERVICE_KEY" ]] && fail "Could not determine service role key. Run: npx supabase@latest status"

ok "Supabase connection details parsed"

# ── 8. Detect free Next.js port ───────────────────────────────────────────────
step "Detecting available port for Next.js dev server"
NEXTJS_PORT=$(find_free_port 3000 10)
if [[ "$NEXTJS_PORT" -ne 3000 ]]; then
  warn "Port 3000 is occupied (Grafana or another service). Next.js will use port ${NEXTJS_PORT}."
else
  ok "Port 3000 is free"
fi
ok "Next.js will bind to port ${NEXTJS_PORT}"

# ── 9. Write .env.local ───────────────────────────────────────────────────────
step "Generating .env.local"

# Compare against any existing .env.local and warn on drift
if [[ -f .env.local ]]; then
  EXISTING_URL=$(grep -i 'NEXT_PUBLIC_SUPABASE_URL'     .env.local | cut -d= -f2- | tr -d '[:space:]"' || true)
  EXISTING_ANON=$(grep -i 'NEXT_PUBLIC_SUPABASE_ANON_KEY' .env.local | cut -d= -f2- | tr -d '[:space:]"' || true)
  EXISTING_SVC=$(grep -i 'SUPABASE_SERVICE_ROLE_KEY'    .env.local | cut -d= -f2- | tr -d '[:space:]"' || true)
  EXISTING_PORT=$(grep -i '^PORT='                       .env.local | cut -d= -f2- | tr -d '[:space:]"' || true)

  DRIFT=0
  [[ "$EXISTING_URL"  != "$PROJECT_URL" ]]   && { warn "URL mismatch:  existing=$EXISTING_URL  new=$PROJECT_URL";  DRIFT=1; }
  [[ "$EXISTING_ANON" != "$ANON_KEY" ]]       && { warn "Anon key mismatch — keys have rotated or env is stale";   DRIFT=1; }
  [[ "$EXISTING_SVC"  != "$SERVICE_KEY" ]]    && { warn "Service key mismatch — keys have rotated or env is stale"; DRIFT=1; }
  [[ "$EXISTING_PORT" != "$NEXTJS_PORT" ]]    && { warn "PORT mismatch: existing=${EXISTING_PORT:-unset}  new=${NEXTJS_PORT}"; DRIFT=1; }

  if [[ "$DRIFT" -eq 0 ]]; then
    ok ".env.local already correct — no changes needed"
  else
    prompt_choice "  Overwrite .env.local with current values? [Y/n]: " "$DEFAULT_ENV_CHOICE" ENV_CHOICE
    case "${ENV_CHOICE,,}" in
      n|no)
        warn ".env.local left unchanged — app may behave unexpectedly" ;;
      *)
        printf 'NEXT_PUBLIC_SUPABASE_URL=%s\nNEXT_PUBLIC_SUPABASE_ANON_KEY=%s\nSUPABASE_SERVICE_ROLE_KEY=%s\nPORT=%s\n' \
          "$PROJECT_URL" "$ANON_KEY" "$SERVICE_KEY" "$NEXTJS_PORT" > .env.local
        ok ".env.local updated" ;;
    esac
  fi
else
  printf 'NEXT_PUBLIC_SUPABASE_URL=%s\nNEXT_PUBLIC_SUPABASE_ANON_KEY=%s\nSUPABASE_SERVICE_ROLE_KEY=%s\nPORT=%s\n' \
    "$PROJECT_URL" "$ANON_KEY" "$SERVICE_KEY" "$NEXTJS_PORT" > .env.local
  ok ".env.local created"
fi

echo "  NEXT_PUBLIC_SUPABASE_URL=$PROJECT_URL"
echo "  NEXT_PUBLIC_SUPABASE_ANON_KEY=${ANON_KEY:0:20}…"
echo "  SUPABASE_SERVICE_ROLE_KEY=${SERVICE_KEY:0:12}…"
echo "  PORT=$NEXTJS_PORT"

# ── 10. Create evidence storage bucket ────────────────────────────────────────
step "Creating evidence storage bucket"
BUCKET_RESPONSE=$(curl -s -X POST "${PROJECT_URL}/storage/v1/bucket" \
  -H "Authorization: Bearer ${SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"id":"evidence","name":"evidence","public":false}' 2>/dev/null)

if echo "$BUCKET_RESPONSE" | grep -q '"name"'; then
  ok "Storage bucket 'evidence' created"
elif echo "$BUCKET_RESPONSE" | grep -qi "already exists"; then
  ok "Storage bucket 'evidence' already exists"
elif echo "$BUCKET_RESPONSE" | grep -qi "name resolution failed\|storage.*disabled\|not found"; then
  warn "Storage bucket request failed. Storage is enabled in supabase/config.toml, so the local stack is stale or storage failed to boot."
  warn "Run: npx supabase@latest stop && npx supabase@latest start, then re-run this script."
  warn "Evidence ingestion (test plan §6) will be unavailable until fixed."
else
  warn "Storage bucket creation returned: $BUCKET_RESPONSE"
  warn "Evidence ingestion (test plan §6) may be unavailable."
fi

# ── 11. Verify template seed ──────────────────────────────────────────────────
step "Verifying template seed"
DB_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
TEMPLATE_COUNT=$(PGPASSWORD=postgres psql "$DB_URL" -t -c "SELECT COUNT(*) FROM public.templates;" 2>/dev/null | tr -d '[:space:]')

if [[ -z "$TEMPLATE_COUNT" ]]; then
  warn "Could not query template count — psql may not be installed. Skipping."
elif [[ "$TEMPLATE_COUNT" -ge 16 ]]; then
  ok "Template seed verified: $TEMPLATE_COUNT templates"
else
  warn "Expected ≥16 templates, found $TEMPLATE_COUNT — seed may be incomplete."
  prompt_choice "  Run db reset now to fix it? [Y/n]: " "$DEFAULT_SEED_CHOICE" SEED_CHOICE
  case "${SEED_CHOICE,,}" in
    n|no)
      warn "Skipping reset — template-dependent features will not work correctly" ;;
    *)
      "${SUPA_CMD[@]}" db reset --local 2>&1 | grep -E '(Applying|Seeding|Resetting|error|Error)' || true
      ok "Database reset complete" ;;
  esac
fi

# ── 12. Production build ──────────────────────────────────────────────────────
step "Production build"
prompt_choice "  Run production build now? (slow ~30–60s, safe to skip for dev) [Y/n]: " "$DEFAULT_BUILD_CHOICE" BUILD_CHOICE
case "${BUILD_CHOICE,,}" in
  n|no)
    warn "Skipping production build — run 'npm run build' before deploying" ;;
  *)
    npm run build 2>&1 | grep -E '(Compiled|error|Error|warn|✓|✗|Route)' | grep -v '^$' || true
    [[ -d ".next" ]] || fail "Build failed — .next/ directory not created."
    ok "Build passed" ;;
esac

# ── 13. Optional integrations guidance ───────────────────────────────────────
step "Optional integrations (configure after first login)"
cat <<'GUIDE'
  Evidence storage    — always local (Supabase DB + Storage bucket). No setup needed.

  GitOps export       — push approved policies to GitHub or Azure DevOps as a PR.
    Configure in:       Settings → Save Integration (admin only)

    GitHub PAT:         github.com/settings/tokens
                        Scope required: repo  (or fine-grained: Contents + Pull requests)

    Azure DevOps PAT:   dev.azure.com → User Settings → Personal access tokens
                        Scope required: Code — Read & Write

  Webhook (optional)  — enables merge detection and git-tag audit snapshots.
    After saving a GitHub integration, click "Generate webhook secret" in Settings.
    Add the webhook in GitHub → repo Settings → Webhooks:
      Payload URL:  https://<your-domain>/api/webhooks/github
      Content type: application/json
      Events:       Pull requests + Create

  Evidence ingestion  — CI/CD pipelines submit scan results via API key.
    Create an Evidence API key in Settings after org setup.
    POST to:  /api/v1/evidence/ingest
    Supports: Steampipe, Prowler, CloudQuery, custom payloads

GUIDE

# ── Done ──────────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  Setup complete. Start the dev server with:${NC}"
echo -e "${GREEN}    npm run dev${NC}"
echo -e "${GREEN}  Then open: http://localhost:${NEXTJS_PORT}/signup${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
