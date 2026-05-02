import { loadEnvConfig } from '@next/env';
import { chromium } from 'playwright';

import { renderTemplate, stripMappingMetadata } from '@/lib/documents/template-engine';
import { buildTemplatePayload } from '@/lib/wizard/template-payload';

import { authClient, serviceClient, USER } from './helpers';

loadEnvConfig(process.cwd());

const DOC_ID = '784e3fea-08c1-494d-aaea-d51488663f42';
const TEST_EMAIL = 'admin@acme.test';
const TEST_PASSWORD = 'TestPassword1!';

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function detectAppUrl() {
  const candidates = [
    process.env.APP_URL,
    'http://127.0.0.1:3000',
    'http://localhost:3000',
    'http://127.0.0.1:3010',
    'http://localhost:3010',
  ].filter(Boolean) as string[];

  for (const candidate of candidates) {
    try {
      const response = await fetch(`${candidate}/login`, { redirect: 'manual' });
      if (response.status < 500) {
        return candidate;
      }
    } catch {
      // Try the next candidate.
    }
  }

  throw new Error('Could not detect a running TrustScaffold app URL on ports 3000 or 3010');
}

async function refreshDiagramDocument() {
  const svc = serviceClient();
  const client = await authClient(USER.ACME_ADMIN.email);

  const { data: doc, error: docError } = await svc
    .from('generated_docs')
    .select('id, input_payload, templates(name, markdown_template, output_filename_pattern, default_variables)')
    .eq('id', DOC_ID)
    .single();

  if (docError || !doc) {
    throw new Error(docError?.message ?? 'Diagram document not found');
  }

  const template = Array.isArray(doc.templates) ? doc.templates[0] : doc.templates;
  if (!template) {
    throw new Error('Template metadata missing for diagram document');
  }

  const payload = {
    ...buildTemplatePayload(doc.input_payload, { workspaceOrganizationName: doc.input_payload.company?.name ?? 'TrustScaffold' }),
    wizard_data: doc.input_payload,
  };
  const mergedVariables = { ...(template.default_variables ?? {}), ...payload };
  const contentMarkdown = stripMappingMetadata(renderTemplate(template.markdown_template, mergedVariables, template.name));
  const fileName = renderTemplate(template.output_filename_pattern, mergedVariables, template.name);

  const { error: updateError } = await client
    .from('generated_docs')
    .update({
      title: template.name,
      file_name: fileName,
      content_markdown: contentMarkdown,
      input_payload: doc.input_payload,
    })
    .eq('id', DOC_ID);

  if (updateError) {
    throw new Error(updateError.message);
  }

  const { error: revisionError } = await client.rpc('insert_document_revision', {
    p_document_id: DOC_ID,
    p_source: 'generated',
    p_content_markdown: contentMarkdown,
  });

  if (revisionError) {
    throw new Error(revisionError.message);
  }
}

async function main() {
  const appUrl = await detectAppUrl();
  await refreshDiagramDocument();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto(`${appUrl}/login?next=%2Fgenerated-docs%2F${DOC_ID}`, { waitUntil: 'networkidle' });

    const loginHeading = page.getByRole('heading', { name: 'Login' });
    if (await loginHeading.count()) {
      await page.getByLabel('Email').fill(TEST_EMAIL);
      await page.getByLabel('Password').fill(TEST_PASSWORD);
      await page.getByRole('button', { name: 'Sign in' }).click();
    }

    await page.waitForURL(`**/generated-docs/${DOC_ID}`, { timeout: 30000 });
    await page.waitForLoadState('networkidle');

    await page.locator('article').getByRole('heading', { name: 'Network and Data Flow Diagrams', exact: true }).waitFor({ timeout: 30000 });

    const requiredLabels = [
      'Actors',
      'Edge and identity boundary',
      'Cardholder data environment',
      'Security and operations',
      'Subservice organizations',
      'Actors and intake',
      'Cardholder data stores',
      'Operational records',
      'Approved downstream processors',
    ];

    for (const label of requiredLabels) {
      await page.getByText(label, { exact: true }).first().waitFor({ timeout: 30000 });
    }

    const pageText = await page.locator('body').innerText();
    assert(pageText.includes('AWS + Azure + GCP workload tier'), 'Expected rendered diagram to include the multi-cloud workload tier label');
    assert(pageText.includes('Primary stores for Cardholder and payment-related data'), 'Expected rendered diagram to include the payment data store label');

    console.log('✓ Diagram UI smoke test passed');
    console.log(`  App URL: ${appUrl}`);
    console.log(`  Document: ${DOC_ID}`);
  } finally {
    await context.close();
    await browser.close();
  }
}

main().catch((error) => {
  console.error('✗ Diagram UI smoke test failed');
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});