/**
 * TrustScaffold V1.0 — E2E Test Runner
 *
 * Executes all 5 test suites sequentially and reports aggregate results.
 *
 * Usage:
 *   npx tsx tests/e2e/run-all.ts
 *
 * Prerequisites:
 *   1. Supabase running locally (npx supabase start)
 *   2. Staging seed applied (psql ... -f tests/seed-staging.sql)
 *   3. Next.js dev server running (npm run dev)
 *   4. Environment variables set (.env.local or exported)
 */

import { execSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';

const testsDir = dirname(__filename);

const suites = [
  { name: '01 — Tenant Isolation & RBAC',    file: '01-rbac.ts' },
  { name: '02 — Wizard & Compilation Engine', file: '02-wizard-compilation.ts' },
  { name: '03 — Control Graph (GitOps)',      file: '03-control-graph.ts' },
  { name: '04 — Evidence & Cryptography',     file: '04-evidence-crypto.ts' },
  { name: '05 — Auditor Portal',             file: '05-auditor-portal.ts' },
];

console.log('╔═══════════════════════════════════════════════════════════════╗');
console.log('║  TrustScaffold V1.0 — Master E2E Test Suite                 ║');
console.log('╚═══════════════════════════════════════════════════════════════╝');
console.log('');

const results: { name: string; passed: boolean; durationMs: number }[] = [];

for (const s of suites) {
  const filePath = resolve(testsDir, s.file);
  console.log(`\n▸ Running: ${s.name}`);
  console.log('─'.repeat(60));

  const start = performance.now();
  try {
    execSync(`npx tsx "${filePath}"`, {
      stdio: 'inherit',
      env: process.env,
      cwd: resolve(testsDir, '../..'),
    });
    results.push({ name: s.name, passed: true, durationMs: Math.round(performance.now() - start) });
  } catch {
    results.push({ name: s.name, passed: false, durationMs: Math.round(performance.now() - start) });
  }
}

// ── Aggregate Summary ────────────────────────────────────────────────────────

console.log('\n');
console.log('╔═══════════════════════════════════════════════════════════════╗');
console.log('║  Aggregate Results                                           ║');
console.log('╠═══════════════════════════════════════════════════════════════╣');

for (const r of results) {
  const icon = r.passed ? '✓' : '✗';
  const durStr = `${(r.durationMs / 1000).toFixed(1)}s`;
  console.log(`║  ${icon} ${r.name.padEnd(45)} ${durStr.padStart(8)} ║`);
}

const passed = results.filter(r => r.passed).length;
const failed = results.filter(r => !r.passed).length;

console.log('╠═══════════════════════════════════════════════════════════════╣');
console.log(`║  Total: ${passed} passed, ${failed} failed${' '.repeat(35)}║`);
console.log('╚═══════════════════════════════════════════════════════════════╝');

if (failed > 0) {
  process.exit(1);
}
