/**
 * TrustScaffold E2E Test Helpers
 *
 * Provides authenticated Supabase clients for each test user,
 * constants for staging seed UUIDs, and assertion utilities.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// ── Environment ──────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const APP_URL = process.env.APP_URL ?? 'http://127.0.0.1:3000';

if (!SUPABASE_ANON_KEY) throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is required');
if (!SUPABASE_SERVICE_ROLE_KEY) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required');

// ── Staging Seed UUIDs ───────────────────────────────────────────────────────

export const ORG = {
  ACME: 'a0000000-0000-4000-a000-000000000001',
  BETA: 'b0000000-0000-4000-b000-000000000002',
  GAMMA: 'c0000000-0000-4000-c000-000000000003',
} as const;

export const USER = {
  ACME_ADMIN:    { id: 'aa000000-0000-4000-a000-000000000001', email: 'admin@acme.test' },
  ACME_EDITOR:   { id: 'aa000000-0000-4000-a000-000000000002', email: 'editor@acme.test' },
  ACME_VIEWER:   { id: 'aa000000-0000-4000-a000-000000000003', email: 'viewer@acme.test' },
  ACME_APPROVER: { id: 'aa000000-0000-4000-a000-000000000004', email: 'approver@acme.test' },
  BETA_ADMIN:    { id: 'bb000000-0000-4000-b000-000000000001', email: 'admin@beta.test' },
  BETA_EDITOR:   { id: 'bb000000-0000-4000-b000-000000000002', email: 'editor@beta.test' },
  BETA_VIEWER:   { id: 'bb000000-0000-4000-b000-000000000003', email: 'viewer@beta.test' },
  BETA_APPROVER: { id: 'bb000000-0000-4000-b000-000000000004', email: 'approver@beta.test' },
  GAMMA_ADMIN:   { id: 'cc000000-0000-4000-c000-000000000001', email: 'admin@gamma.test' },
  GAMMA_EDITOR:  { id: 'cc000000-0000-4000-c000-000000000002', email: 'editor@gamma.test' },
  GAMMA_VIEWER:  { id: 'cc000000-0000-4000-c000-000000000003', email: 'viewer@gamma.test' },
  GAMMA_APPROVER:{ id: 'cc000000-0000-4000-c000-000000000004', email: 'approver@gamma.test' },
} as const;

export const DOC = {
  ACME_ISP: 'd0000000-0000-4000-a000-000000000001',
  ACME_AC:  'd0000000-0000-4000-a000-000000000002',
  ACME_IR:  'd0000000-0000-4000-a000-000000000003',
  BETA_ISP: 'd0000000-0000-4000-b000-000000000001',
  GAMMA_ISP:'d0000000-0000-4000-c000-000000000001',
} as const;

export const SNAPSHOT = {
  ACME_Q1: 'f2000000-0000-4000-a000-000000000001',
} as const;

export const INTEGRATION = {
  ACME_GITHUB: 'f0000000-0000-4000-a000-000000000001',
} as const;

export const API_KEY = {
  ACME: 'ts_acme_test_key_0000000000000000000000000000000000000000',
  BETA: 'ts_beta_test_key_0000000000000000000000000000000000000000',
} as const;

export const PORTAL_TOKEN = {
  ACME: 'staging_portal_token_acme_0000000000000000000000000000',
} as const;

export const WEBHOOK_SECRET = 'whsec_staging_test_secret_do_not_use_in_production';

const TEST_PASSWORD = 'TestPassword1!';

// ── Client Factories ─────────────────────────────────────────────────────────

/** Creates a service-role client that bypasses RLS (for setup/teardown). */
export function serviceClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Creates an anon client and signs in as the specified user. */
export async function authClient(email: string): Promise<SupabaseClient> {
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await client.auth.signInWithPassword({ email, password: TEST_PASSWORD });
  if (error) throw new Error(`Auth failed for ${email}: ${error.message}`);
  return client;
}

// ── HTTP Helpers ─────────────────────────────────────────────────────────────

export { APP_URL };

export async function httpPost(path: string, body: unknown, headers: Record<string, string> = {}): Promise<Response> {
  return fetch(`${APP_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

// ── Test Runner ──────────────────────────────────────────────────────────────

type TestFn = () => Promise<void>;

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  durationMs: number;
}

const results: TestResult[] = [];
let currentSuite = '';

export function suite(name: string): void {
  currentSuite = name;
  console.log(`\n═══ ${name} ═══\n`);
}

export function test(name: string, fn: TestFn): void {
  const fullName = currentSuite ? `${currentSuite} > ${name}` : name;
  const entry: TestResult = { name: fullName, passed: false, durationMs: 0 };
  results.push(entry);

  const runTest = async () => {
    const start = performance.now();
    try {
      await fn();
      entry.passed = true;
      entry.durationMs = Math.round(performance.now() - start);
      console.log(`  ✓ ${name} (${entry.durationMs}ms)`);
    } catch (err) {
      entry.durationMs = Math.round(performance.now() - start);
      entry.error = err instanceof Error ? err.message : String(err);
      console.log(`  ✗ ${name} (${entry.durationMs}ms)`);
      console.log(`    Error: ${entry.error}`);
    }
  };

  // Queue for sequential execution via runAll
  testQueue.push(runTest);
}

const testQueue: (() => Promise<void>)[] = [];

export async function runAll(): Promise<void> {
  for (const fn of testQueue) {
    await fn();
  }
  testQueue.length = 0;
}

export function printSummary(): void {
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;

  console.log('\n═══════════════════════════════════════════');
  console.log(`  Results: ${passed} passed, ${failed} failed, ${total} total`);
  console.log('═══════════════════════════════════════════');

  if (failed > 0) {
    console.log('\nFailed tests:');
    for (const r of results.filter(r => !r.passed)) {
      console.log(`  ✗ ${r.name}: ${r.error}`);
    }
    process.exit(1);
  }
}

// ── Assertions ───────────────────────────────────────────────────────────────

export function assert(condition: boolean, msg: string): asserts condition {
  if (!condition) throw new Error(`Assertion failed: ${msg}`);
}

export function assertEqual<T>(actual: T, expected: T, label: string): void {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

export function assertIncludes(haystack: string, needle: string, label: string): void {
  if (!haystack.includes(needle)) {
    throw new Error(`${label}: expected string to include "${needle}"`);
  }
}

export function assertEmpty(arr: unknown[], label: string): void {
  if (arr.length !== 0) {
    throw new Error(`${label}: expected empty array, got ${arr.length} items`);
  }
}
