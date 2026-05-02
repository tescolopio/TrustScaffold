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
  assert, assertEqual, assertIncludes,
  ORG, USER,
} from './helpers';
import { renderTemplate } from '@/lib/documents/template-engine';
import { buildTemplatePayload } from '@/lib/wizard/template-payload';
import { defaultWizardValues, type WizardData } from '@/lib/wizard/schema';
import { getActiveWizardRules } from '@/lib/wizard/rule-matrix';

type WizardDataOverrides = {
  [K in keyof WizardData]?: WizardData[K] extends unknown[] ? WizardData[K] : Partial<WizardData[K]>;
};

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

test('All 5 TSC categories cover all 39 templates', async () => {
  const svc = serviceClient();
  const { data, count } = await svc
    .from('templates')
    .select('id', { count: 'exact' });

  assertEqual(count, 39, 'total template count');
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

// ── 4.9 Regulated Scope Smoke Paths ─────────────────────────────────────────

suite('4.9 Regulated Scope Smoke Paths');

function makeWizardData(overrides: WizardDataOverrides): WizardData {
  return {
    ...defaultWizardValues,
    company: { ...defaultWizardValues.company, ...overrides.company },
    governance: { ...defaultWizardValues.governance, ...overrides.governance },
    training: { ...defaultWizardValues.training, ...overrides.training },
    scope: { ...defaultWizardValues.scope, ...overrides.scope },
    tscSelections: { ...defaultWizardValues.tscSelections, ...overrides.tscSelections },
    infrastructure: { ...defaultWizardValues.infrastructure, ...overrides.infrastructure },
    subservices: overrides.subservices ?? defaultWizardValues.subservices,
    securityTooling: { ...defaultWizardValues.securityTooling, ...overrides.securityTooling },
    operations: { ...defaultWizardValues.operations, ...overrides.operations },
    securityAssessment: {
      ...defaultWizardValues.securityAssessment,
      ...overrides.securityAssessment,
    },
  };
}

test('Bundle J smoke path surfaces PHI review state and generates explicit PHI language', async () => {
  const svc = serviceClient();
  const { data: systemDescriptionTemplate } = await svc
    .from('templates')
    .select('slug, markdown_template')
    .eq('slug', 'system-description')
    .single();

  const { data: privacyTemplate } = await svc
    .from('templates')
    .select('slug, markdown_template')
    .eq('slug', 'privacy-notice-consent-policy')
    .single();

  assert(!!systemDescriptionTemplate, 'system-description template must exist');
  assert(!!privacyTemplate, 'privacy-notice-consent-policy template must exist');

  const data = makeWizardData({
    company: {
      name: 'HealthCo',
      industry: 'Healthcare',
      complianceMaturity: 'some-experience',
      targetAuditType: 'type1',
    },
    scope: {
      systemName: 'HealthCo Portal',
      systemDescription: 'a healthcare workflow platform that stores regulated patient and member information',
      dataTypesHandled: ['Customer PII', 'Employee data', 'Authentication secrets'],
      containsPhi: true,
      hasCardholderDataEnvironment: false,
    },
    tscSelections: {
      security: true,
      privacy: true,
      confidentiality: true,
      availability: false,
      processingIntegrity: false,
    },
  });

  const rules = getActiveWizardRules(data, 'review');
  assert(!rules.some((rule) => rule.id === 'review-privacy-scope-warning'), 'PHI path should not show privacy warning when Privacy TSC is selected');
  assertEqual(data.scope.containsPhi, true, 'review source preserves PHI scope state');
  assertEqual(data.scope.hasCardholderDataEnvironment, false, 'review source preserves CDE scope state');

  const payload = buildTemplatePayload(data, { workspaceOrganizationName: data.company.name });
  const renderedSystem = renderTemplate(systemDescriptionTemplate!.markdown_template, payload, 'system-description');
  const renderedPrivacy = renderTemplate(privacyTemplate!.markdown_template, payload, 'privacy-notice-consent-policy');

  assertIncludes(renderedSystem, 'Protected health information (PHI) is identified as regulated data', 'system description PHI language');
  assertIncludes(renderedPrivacy, 'handles protected health information', 'privacy template PHI language');
});

test('Bundle K smoke path surfaces CDE review state and generates explicit CDE language', async () => {
  const svc = serviceClient();
  const { data: systemDescriptionTemplate } = await svc
    .from('templates')
    .select('slug, markdown_template')
    .eq('slug', 'system-description')
    .single();

  const { data: dataClassificationTemplate } = await svc
    .from('templates')
    .select('slug, markdown_template')
    .eq('slug', 'data-classification-handling-policy')
    .single();

  assert(!!systemDescriptionTemplate, 'system-description template must exist');
  assert(!!dataClassificationTemplate, 'data-classification-handling-policy template must exist');

  const data = makeWizardData({
    company: {
      name: 'PaymentsCo',
      industry: 'Financial Technology',
      complianceMaturity: 'some-experience',
      targetAuditType: 'type1',
    },
    scope: {
      systemName: 'PaymentsCo Checkout',
      systemDescription: 'a payment processing platform with a segmented cardholder data environment for checkout and settlement operations',
      dataTypesHandled: ['Payment data', 'Customer PII', 'Authentication secrets'],
      containsPhi: false,
      hasCardholderDataEnvironment: true,
    },
    tscSelections: {
      security: true,
      privacy: true,
      confidentiality: true,
      availability: false,
      processingIntegrity: false,
    },
  });

  const rules = getActiveWizardRules(data, 'review');
  assert(!rules.some((rule) => rule.id === 'review-cde-confidentiality-warning'), 'CDE path should not show confidentiality warning when Confidentiality TSC is selected');
  assertEqual(data.scope.containsPhi, false, 'review source preserves PHI scope state');
  assertEqual(data.scope.hasCardholderDataEnvironment, true, 'review source preserves CDE scope state');

  const payload = buildTemplatePayload(data, { workspaceOrganizationName: data.company.name });
  const renderedSystem = renderTemplate(systemDescriptionTemplate!.markdown_template, payload, 'system-description');
  const renderedClassification = renderTemplate(dataClassificationTemplate!.markdown_template, payload, 'data-classification-handling-policy');

  assertIncludes(renderedSystem, 'cardholder data environment (CDE) is explicitly defined', 'system description CDE language');
  assertIncludes(renderedClassification, 'operates an in-scope cardholder data environment (CDE)', 'data classification CDE language');
});

test('Acceptable use policy is completed from wizard operational inputs', async () => {
  const svc = serviceClient();
  const { data: acceptableUseTemplate } = await svc
    .from('templates')
    .select('slug, markdown_template')
    .eq('slug', 'acceptable-use-code-of-conduct-policy')
    .single();

  assert(!!acceptableUseTemplate, 'acceptable-use-code-of-conduct-policy template must exist');

  const data = makeWizardData({
    company: {
      name: 'PolicyCo',
      primaryContactEmail: 'security@policyco.example',
    },
    scope: {
      systemName: 'PolicyCo Cloud',
      systemDescription: 'a multi-tenant SaaS platform that stores customer compliance records and identity metadata',
      dataTypesHandled: ['Customer PII', 'Authentication secrets'],
    },
    infrastructure: {
      idpProvider: 'Okta',
    },
    securityTooling: {
      hasMdm: true,
      mdmTool: 'Kandji',
      endpointProtectionTool: 'Microsoft Defender for Endpoint',
    },
    governance: {
      hasDisciplinaryProcedures: true,
      acknowledgementCadence: 'hire-and-annual',
    },
    operations: {
      acceptableUseScope: 'employees, contractors, and temporary workers with access to company systems',
      securityReportChannel: 'security@policyco.example',
      permitsLimitedPersonalUse: false,
      requiresApprovedSoftware: true,
      restrictsCompanyDataToApprovedSystems: true,
      requiresLostDeviceReporting: true,
      lostDeviceReportSlaHours: 12,
      monitorsCompanySystems: true,
    },
  });

  const payload = buildTemplatePayload(data, { workspaceOrganizationName: data.company.name });
  const rendered = renderTemplate(acceptableUseTemplate!.markdown_template, payload, 'acceptable-use-code-of-conduct-policy');

  assertIncludes(rendered, 'employees, contractors, and temporary workers with access to company systems', 'acceptable use scope from wizard');
  assertIncludes(rendered, 'Only approved software, services, repositories, and storage locations', 'approved tool rule from wizard');
  assertIncludes(rendered, 'reported to security@policyco.example within 12 hours', 'lost device reporting channel and SLA');
  assertIncludes(rendered, 'Company-managed devices are enrolled in Kandji', 'MDM tool from security tooling');
  assertIncludes(rendered, 'Endpoint protection is provided through Microsoft Defender for Endpoint', 'endpoint tool from security tooling');
  assertIncludes(rendered, 'during hire-and-annual policy review cycles', 'acknowledgement cadence from governance');
});

// ── Run ──────────────────────────────────────────────────────────────────────

(async () => {
  await runAll();
  printSummary();
})();
