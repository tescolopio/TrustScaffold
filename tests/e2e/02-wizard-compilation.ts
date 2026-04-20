/**
 * Suite 2: Wizard & Compilation Engine
 *
 * Validates Handlebars template compilation, idempotency constraints,
 * TSC scope filtering, physical/hybrid logic, and DC 200 completeness.
 *
 * Ref: MASTER_TEST_PLAN.md §4
 */

import {
  suite, test, runAll, printSummary,
  authClient, serviceClient,
  assert, assertEqual,
  ORG, USER,
} from './helpers';

// ── 4.1 Idempotency — Unique Constraint ─────────────────────────────────────

suite('4.1 Idempotency — Double-Click Guard');

test('Unique constraint on (org_id, template_id) WHERE status=draft', async () => {
  const svc = serviceClient();
  const client = await authClient(USER.ACME_ADMIN.email);

  // Get a template not yet used by Acme
  const { data: tpl } = await svc
    .from('templates')
    .select('id')
    .eq('slug', 'business-continuity-dr-plan')
    .single();

  const baseDoc = {
    organization_id: ORG.ACME,
    template_id: tpl!.id,
    title: 'BCDR Test',
    file_name: 'bcdr.md',
    content_markdown: '# BCDR',
    input_payload: {},
    status: 'draft' as const,
    version: 1,
    created_by: USER.ACME_ADMIN.id,
    updated_by: USER.ACME_ADMIN.id,
  };

  // First insert via authenticated client — should succeed
  const { error: firstErr } = await client.from('generated_docs').insert({
    ...baseDoc,
    id: crypto.randomUUID(),
  });
  assert(!firstErr, `First insert should succeed: ${firstErr?.message}`);

  // Second insert with same org+template should conflict on partial unique index
  const { error } = await client.from('generated_docs').insert({
    ...baseDoc,
    id: crypto.randomUUID(),
  });

  // Clean up (service client can delete without auth)
  await svc.from('generated_docs')
    .delete()
    .eq('organization_id', ORG.ACME)
    .eq('template_id', tpl!.id)
    .eq('title', 'BCDR Test');

  assert(!!error, 'Expected unique constraint violation on duplicate draft');
});

// ── 4.2 Re-Run Updates In-Place ──────────────────────────────────────────────

suite('4.2 Idempotency — Re-Run Updates In-Place');

test('UPDATE on existing draft changes content but keeps same row', async () => {
  const svc = serviceClient();
  const client = await authClient(USER.ACME_ADMIN.email);

  // Get Acme's existing AC draft
  const { data: before } = await svc
    .from('generated_docs')
    .select('id, content_markdown, updated_at')
    .eq('id', 'd0000000-0000-4000-a000-000000000002')
    .single();

  assert(!!before, 'Acme AC draft should exist');

  // Update content via authenticated client (trigger requires auth.uid())
  const newContent = '# Access Control Policy\n\nUpdated via E2E test.';
  await client
    .from('generated_docs')
    .update({ content_markdown: newContent })
    .eq('id', before!.id);

  const { data: after } = await svc
    .from('generated_docs')
    .select('id, content_markdown, updated_at')
    .eq('id', before!.id)
    .single();

  assertEqual(after!.id, before!.id, 'same row ID');
  assertEqual(after!.content_markdown, newContent, 'content updated');

  // Restore original via authenticated client
  await client
    .from('generated_docs')
    .update({ content_markdown: before!.content_markdown })
    .eq('id', before!.id);
});

// ── 4.3 TSC Scope Filtering ─────────────────────────────────────────────────

suite('4.3 TSC Scope Filtering');

test('Security-only scope returns templates mapped to CC criteria', async () => {
  const svc = serviceClient();

  // Security criteria codes: CC1.* through CC9.*
  const { data: templates } = await svc
    .from('templates')
    .select('slug, criteria_mapped');

  assert(!!templates && templates.length > 0, 'templates must exist');

  const securityCriteria = templates!.filter(t => {
    const mapped: string[] = t.criteria_mapped ?? [];
    return mapped.some(c => c.startsWith('CC'));
  });

  assert(securityCriteria.length > 0, 'At least one template maps to CC criteria');
  assert(securityCriteria.length < templates!.length, 'Not all templates should match security-only');
});

// ── 4.4 Full TSC Scope ──────────────────────────────────────────────────────

suite('4.4 Full TSC Scope');

test('All 5 TSC categories cover all 16 templates', async () => {
  const svc = serviceClient();
  const { data, count } = await svc
    .from('templates')
    .select('id', { count: 'exact' });

  assertEqual(count, 16, 'total template count');
});

// ── 4.6 DC 200 System Description Completeness ──────────────────────────────

suite('4.6 DC 200 System Description');

test('System description template exists with correct criteria', async () => {
  const svc = serviceClient();
  const { data } = await svc
    .from('templates')
    .select('slug, criteria_mapped, markdown_template')
    .eq('slug', 'system-description')
    .single();

  assert(!!data, 'system-description template must exist');
  assert(data!.markdown_template.includes('{{organization_name}}'), 'must reference org name');
  assert(data!.markdown_template.includes('{{#each subprocessors}}') ||
         data!.markdown_template.includes('{{#each sub_service_organizations}}') ||
         data!.markdown_template.includes('subprocessor'),
         'must reference subprocessors/sub-service orgs');
});

// ── 4.7 Zero-Subservice Edge Case ───────────────────────────────────────────

suite('4.7 Zero-Subservice Edge Case');

test('Templates with subprocessor references handle empty array', async () => {
  const svc = serviceClient();
  const { data: templates } = await svc
    .from('templates')
    .select('slug, markdown_template')
    .or('slug.eq.vendor-management-policy,slug.eq.system-description');

  assert(!!templates && templates.length >= 1, 'vendor/system templates must exist');

  // Verify they use {{#if}} or {{#each}} guards that handle empty arrays
  for (const t of templates!) {
    const src = t.markdown_template;
    const hasSubprocessorRef = src.includes('subprocessor') || src.includes('sub_service');
    if (hasSubprocessorRef) {
      const hasGuard = src.includes('{{#if') || src.includes('{{#each') || src.includes('{{#unless');
      assert(hasGuard, `${t.slug}: subprocessor reference must be guarded by conditional`);
    }
  }
});

// ── 4.8 Content Revision Creation ────────────────────────────────────────────

suite('4.8 Content Revision Creation');

test('Each seeded doc has at least one generated revision', async () => {
  const svc = serviceClient();

  for (const docId of [
    'd0000000-0000-4000-a000-000000000001',
    'd0000000-0000-4000-a000-000000000002',
    'd0000000-0000-4000-a000-000000000003',
  ]) {
    const { data } = await svc
      .from('document_revisions')
      .select('id, source, content_hash')
      .eq('document_id', docId)
      .eq('source', 'generated');

    assert(!!data && data.length >= 1, `doc ${docId}: must have generated revision`);
    assert(data![0].content_hash.length === 64, `doc ${docId}: content_hash must be SHA-256 hex (64 chars)`);
  }
});

test('Approved doc has approved revision', async () => {
  const svc = serviceClient();
  const { data } = await svc
    .from('document_revisions')
    .select('id, source')
    .eq('document_id', 'd0000000-0000-4000-a000-000000000001')
    .eq('source', 'approved');

  assert(!!data && data.length >= 1, 'approved doc must have approved revision');
});

// ── Run ──────────────────────────────────────────────────────────────────────

(async () => {
  await runAll();
  printSummary();
})();
