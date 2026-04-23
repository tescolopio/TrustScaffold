/**
 * Handlebars Edge-Case Template Compiler Test
 *
 * Compiles every active template against a matrix of wizard configurations to
 * verify that no combination produces legally ambiguous, contradictory, or
 * broken output. Run with: npx tsx scripts/test-templates.ts
 */

import { renderTemplate } from '../lib/documents/template-engine';
import { buildTemplatePayload } from '../lib/wizard/template-payload';
import type { WizardData } from '../lib/wizard/schema';
import { defaultWizardValues } from '../lib/wizard/schema';

/* ── Template source extraction ───────────────────────────────────────────── */

// We read template markdown from the seed SQL by connecting to the local
// Supabase Postgres instance. If unavailable, fall back to a simpler check.
import { execSync } from 'child_process';

function loadTemplatesFromDB(): { slug: string; name: string; markdown_template: string }[] {
  try {
    const result = execSync(
      `PGPASSWORD=postgres psql 'postgresql://postgres@127.0.0.1:54322/postgres' -t -A -F '|||' -c "SELECT slug, name, markdown_template FROM public.templates WHERE is_active = true ORDER BY output_filename_pattern;"`,
      { encoding: 'utf-8', timeout: 10_000 },
    );

    return result
      .trim()
      .split('\n')
      .filter((line) => line.includes('|||'))
      .map((line) => {
        const [slug, name, ...rest] = line.split('|||');
        return { slug, name, markdown_template: rest.join('|||') };
      });
  } catch {
    console.error('⚠  Could not connect to local Supabase DB. Ensure `bash scripts/setup.sh --yes` has completed or `npx supabase@latest start` is running.');
    process.exit(1);
  }
}

/* ── Wizard configuration matrix ──────────────────────────────────────────── */

function deepMerge(base: WizardData, overrides: Record<string, unknown>): WizardData {
  const merged = JSON.parse(JSON.stringify(base)) as Record<string, unknown>;
  for (const [key, value] of Object.entries(overrides)) {
    if (value && typeof value === 'object' && !Array.isArray(value) && merged[key] && typeof merged[key] === 'object') {
      merged[key] = { ...(merged[key] as Record<string, unknown>), ...(value as Record<string, unknown>) };
    } else {
      merged[key] = value;
    }
  }
  return merged as unknown as WizardData;
}

type TestConfig = { label: string; overrides: Record<string, unknown> };

const TEST_CONFIGS: TestConfig[] = [
  // ── Cloud provider combinations ──
  {
    label: 'AWS only',
    overrides: {
      company: { name: 'AwsCorp', website: 'https://aws.example.com', primaryContactName: 'Alice', primaryContactEmail: 'alice@aws.example.com', industry: 'SaaS' },
      scope: { systemName: 'AwsApp', systemDescription: 'A cloud-native application running exclusively on AWS infrastructure.', dataTypesHandled: ['Customer PII'], isMultiTenant: true },
      infrastructure: { type: 'aws', cloudProviders: ['aws'], hostsOwnHardware: false, idpProvider: 'Entra ID', usesAvailabilityZones: true, usesCloudVpn: false, hasPhysicalServerRoom: false, hasHardwareFailover: false, requiresBiometricRackAccess: false, tracksMediaDestruction: false, usesAwsIam: true, usesMacie: false, usesAzureEntraId: false, usesAzureKeyVault: false, usesAzurePurviewDlp: false, usesGcpIam: false, usesSecurityCommandCenter: false },
    },
  },
  {
    label: 'Azure only',
    overrides: {
      company: { name: 'AzureCorp', website: 'https://azure.example.com', primaryContactName: 'Bob', primaryContactEmail: 'bob@azure.example.com', industry: 'FinTech' },
      scope: { systemName: 'AzureApp', systemDescription: 'A financial services platform hosted on Microsoft Azure.', dataTypesHandled: ['Customer PII', 'Payment data'], isMultiTenant: false },
      infrastructure: { type: 'azure', cloudProviders: ['azure'], hostsOwnHardware: false, idpProvider: 'Entra ID', usesAvailabilityZones: true, usesCloudVpn: false, hasPhysicalServerRoom: false, hasHardwareFailover: false, requiresBiometricRackAccess: false, tracksMediaDestruction: false, usesAwsIam: false, usesMacie: false, usesAzureEntraId: true, usesAzureKeyVault: true, usesAzurePurviewDlp: false, usesGcpIam: false, usesSecurityCommandCenter: false },
    },
  },
  {
    label: 'GCP only',
    overrides: {
      company: { name: 'GcpCorp', website: 'https://gcp.example.com', primaryContactName: 'Charlie', primaryContactEmail: 'charlie@gcp.example.com', industry: 'HealthTech' },
      scope: { systemName: 'GcpApp', systemDescription: 'A health data analytics platform running on Google Cloud.', dataTypesHandled: ['Customer PII', 'Employee data'], isMultiTenant: true },
      infrastructure: { type: 'gcp', cloudProviders: ['gcp'], hostsOwnHardware: false, idpProvider: 'Google Workspace', usesAvailabilityZones: true, usesCloudVpn: false, hasPhysicalServerRoom: false, hasHardwareFailover: false, requiresBiometricRackAccess: false, tracksMediaDestruction: false, usesAwsIam: false, usesMacie: false, usesAzureEntraId: false, usesAzureKeyVault: false, usesAzurePurviewDlp: false, usesGcpIam: true, usesSecurityCommandCenter: true },
    },
  },
  {
    label: 'Multi-cloud (AWS + Azure + GCP)',
    overrides: {
      company: { name: 'MultiCloud Inc', website: 'https://multi.example.com', primaryContactName: 'Dana', primaryContactEmail: 'dana@multi.example.com', industry: 'Enterprise SaaS' },
      scope: { systemName: 'MultiApp', systemDescription: 'An enterprise platform spanning AWS, Azure, and GCP.', dataTypesHandled: ['Customer PII', 'Employee data', 'Payment data', 'Authentication secrets'], isMultiTenant: true },
      infrastructure: { type: 'hybrid', cloudProviders: ['aws', 'azure', 'gcp'], hostsOwnHardware: false, idpProvider: 'Okta', usesAvailabilityZones: true, usesCloudVpn: true, hasPhysicalServerRoom: false, hasHardwareFailover: false, requiresBiometricRackAccess: false, tracksMediaDestruction: false, usesAwsIam: true, usesMacie: true, usesAzureEntraId: true, usesAzureKeyVault: true, usesAzurePurviewDlp: true, usesGcpIam: true, usesSecurityCommandCenter: true },
    },
  },

  // ── Self-hosted / hybrid ──
  {
    label: 'Self-hosted with physical server room',
    overrides: {
      company: { name: 'OnPremCorp', website: 'https://onprem.example.com', primaryContactName: 'Eve', primaryContactEmail: 'eve@onprem.example.com', industry: 'Government' },
      scope: { systemName: 'OnPremApp', systemDescription: 'A government application hosted entirely on-premises.', dataTypesHandled: ['Customer PII', 'Employee data'], isMultiTenant: false },
      infrastructure: { type: 'self-hosted', cloudProviders: ['aws'], hostsOwnHardware: true, idpProvider: 'JumpCloud', usesAvailabilityZones: false, usesCloudVpn: true, hasPhysicalServerRoom: true, hasHardwareFailover: true, requiresBiometricRackAccess: true, tracksMediaDestruction: true, usesAwsIam: false, usesMacie: false, usesAzureEntraId: false, usesAzureKeyVault: false, usesAzurePurviewDlp: false, usesGcpIam: false, usesSecurityCommandCenter: false },
    },
  },
  {
    label: 'Hybrid (AWS + on-prem)',
    overrides: {
      company: { name: 'HybridCorp', website: 'https://hybrid.example.com', primaryContactName: 'Frank', primaryContactEmail: 'frank@hybrid.example.com', industry: 'Manufacturing' },
      scope: { systemName: 'HybridApp', systemDescription: 'A manufacturing IoT platform with hybrid cloud and on-prem components.', dataTypesHandled: ['Product telemetry', 'Employee data'], isMultiTenant: false },
      infrastructure: { type: 'hybrid', cloudProviders: ['aws'], hostsOwnHardware: true, idpProvider: 'Okta', usesAvailabilityZones: true, usesCloudVpn: true, hasPhysicalServerRoom: true, hasHardwareFailover: true, requiresBiometricRackAccess: false, tracksMediaDestruction: true, usesAwsIam: true, usesMacie: false, usesAzureEntraId: false, usesAzureKeyVault: false, usesAzurePurviewDlp: false, usesGcpIam: false, usesSecurityCommandCenter: false },
    },
  },

  // ── TSC scope variations ──
  {
    label: 'All TSC categories enabled',
    overrides: {
      company: { name: 'FullScope LLC', website: 'https://full.example.com', primaryContactName: 'Grace', primaryContactEmail: 'grace@full.example.com', industry: 'Insurance' },
      scope: { systemName: 'FullApp', systemDescription: 'An insurance platform with all TSC categories in scope.', dataTypesHandled: ['Customer PII', 'Payment data', 'Employee data'], isMultiTenant: true },
      tscSelections: { security: true, availability: true, confidentiality: true, processingIntegrity: true, privacy: true },
    },
  },
  {
    label: 'Security only (minimal TSC)',
    overrides: {
      company: { name: 'MinCorp', website: 'https://min.example.com', primaryContactName: 'Hank', primaryContactEmail: 'hank@min.example.com', industry: 'Consulting' },
      scope: { systemName: 'MinApp', systemDescription: 'A lightweight consulting tool with minimal scope.', dataTypesHandled: ['Support tickets'], isMultiTenant: false },
      tscSelections: { security: true, availability: false, confidentiality: false, processingIntegrity: false, privacy: false },
    },
  },

  // ── Operations edge cases ──
  {
    label: 'No MFA, no peer review (Lone Wolf)',
    overrides: {
      company: { name: 'LoneWolf Inc', website: 'https://lone.example.com', primaryContactName: 'Ivan', primaryContactEmail: 'ivan@lone.example.com', industry: 'Startup' },
      scope: { systemName: 'LoneApp', systemDescription: 'A solo-founder startup application.', dataTypesHandled: ['Customer PII'], isMultiTenant: true },
      operations: { ticketingSystem: 'Linear', versionControlSystem: 'GitHub', onCallTool: 'Opsgenie', vcsProvider: 'GitHub', hrisProvider: 'Gusto', terminationSlaHours: 24, onboardingSlaDays: 5, requiresMfa: false, requiresPeerReview: false, requiresCyberInsurance: false },
    },
  },
  {
    label: 'No subprocessors',
    overrides: {
      company: { name: 'NoVendors Corp', website: 'https://novendors.example.com', primaryContactName: 'Jane', primaryContactEmail: 'jane@novendors.example.com', industry: 'EdTech' },
      scope: { systemName: 'NoVendorApp', systemDescription: 'An education platform with no third-party vendors.', dataTypesHandled: ['Customer PII', 'Employee data'], isMultiTenant: true },
      subservices: [],
    },
  },
  {
    label: 'Azure DevOps VCS provider',
    overrides: {
      company: { name: 'AdoCorp', website: 'https://ado.example.com', primaryContactName: 'Karl', primaryContactEmail: 'karl@ado.example.com', industry: 'Finance' },
      scope: { systemName: 'AdoApp', systemDescription: 'A financial application using Azure DevOps for version control.', dataTypesHandled: ['Payment data', 'Customer PII'], isMultiTenant: true },
      operations: { ticketingSystem: 'Azure Boards', versionControlSystem: 'Azure DevOps', onCallTool: 'PagerDuty', vcsProvider: 'Azure DevOps', hrisProvider: 'BambooHR', terminationSlaHours: 8, onboardingSlaDays: 3, requiresMfa: true, requiresPeerReview: true, requiresCyberInsurance: true },
    },
  },
  {
    label: 'Multiple subprocessors',
    overrides: {
      company: { name: 'BigStack Inc', website: 'https://bigstack.example.com', primaryContactName: 'Lara', primaryContactEmail: 'lara@bigstack.example.com', industry: 'E-Commerce' },
      scope: { systemName: 'BigApp', systemDescription: 'An e-commerce platform with multiple vendor dependencies.', dataTypesHandled: ['Customer PII', 'Payment data', 'Authentication secrets'], isMultiTenant: true },
      subservices: [
        { name: 'Stripe', description: 'Payment processing', role: 'Payment Processor', dataShared: 'Payment card data', reviewCadence: 'annual' as const },
        { name: 'AWS', description: 'Cloud infrastructure', role: 'IaaS Provider', dataShared: 'All application data', reviewCadence: 'annual' as const },
        { name: 'Datadog', description: 'Observability', role: 'Monitoring Provider', dataShared: 'Application telemetry', reviewCadence: 'semi-annual' as const },
        { name: 'Okta', description: 'Identity provider', role: 'IdP', dataShared: 'User identities and access metadata', reviewCadence: 'quarterly' as const },
      ],
    },
  },
];

/* ── Validation rules ─────────────────────────────────────────────────────── */

type Issue = { severity: 'error' | 'warning'; message: string };

function validateOutput(compiled: string, slug: string, label: string): Issue[] {
  const issues: Issue[] = [];

  // Check for unresolved Handlebars expressions
  const unresolvedMatches = compiled.match(/\{\{[^}]+\}\}/g);
  if (unresolvedMatches) {
    // Filter out YAML frontmatter template expressions (they're in the raw template)
    const real = unresolvedMatches.filter((m) => !m.includes('{{') || compiled.indexOf(m) > compiled.indexOf('---\n\n'));
    if (real.length > 0) {
      issues.push({ severity: 'error', message: `Unresolved Handlebars expressions: ${real.join(', ')}` });
    }
  }

  // Check for empty sections (## Header followed immediately by another ## or end)
  const emptySection = compiled.match(/^##\s+.+\n(?=##\s|\n*$)/gm);
  if (emptySection) {
    issues.push({ severity: 'warning', message: `Empty section(s) detected: ${emptySection.map((s) => s.trim()).join('; ')}` });
  }

  // Check for contradictory language patterns
  if (compiled.includes('is required') && compiled.includes('is not enforced') && slug !== 'evidence-checklist') {
    issues.push({ severity: 'warning', message: 'Potentially contradictory: "is required" and "is not enforced" both appear' });
  }

  // Check for "undefined" or "null" text in output
  if (/\bundefined\b/.test(compiled) || /\bnull\b/.test(compiled)) {
    // Exclude the YAML frontmatter area and known safe contexts
    const bodyStart = compiled.indexOf('---\n\n');
    const body = bodyStart > 0 ? compiled.slice(bodyStart) : compiled;
    if (/\bundefined\b/.test(body)) {
      issues.push({ severity: 'error', message: 'Literal "undefined" appears in compiled output' });
    }
    if (/\bnull\b/.test(body) && !body.includes('null byte') && !body.includes('not null')) {
      issues.push({ severity: 'warning', message: 'Literal "null" appears in compiled output — verify intentional' });
    }
  }

  // Check for broken Markdown table rows (pipes misaligned)
  const tableRows = compiled.match(/^\|.*\|$/gm);
  if (tableRows && tableRows.length > 1) {
    const columnCounts = tableRows.map((row) => row.split('|').length);
    const firstCount = columnCounts[0];
    const mismatched = columnCounts.filter((c) => c !== firstCount);
    if (mismatched.length > 0) {
      issues.push({ severity: 'warning', message: `Table column count mismatch: expected ${firstCount}, found ${[...new Set(mismatched)].join(', ')}` });
    }
  }

  // Check for double-blank lines (grammatically broken rendering)
  if (/\n{4,}/.test(compiled)) {
    issues.push({ severity: 'warning', message: 'Excessive blank lines (4+) detected — may indicate empty conditional blocks' });
  }

  return issues;
}

/* ── Main ─────────────────────────────────────────────────────────────────── */

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║  TrustScaffold — Handlebars Edge-Case Template Test            ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  const templates = loadTemplatesFromDB();
  console.log(`Loaded ${templates.length} active templates from local Supabase.\n`);

  let totalErrors = 0;
  let totalWarnings = 0;
  let totalCompiled = 0;

  for (const config of TEST_CONFIGS) {
    console.log(`\n── Config: ${config.label} ${'─'.repeat(Math.max(0, 50 - config.label.length))}`);

    const wizardData = deepMerge(defaultWizardValues, config.overrides);
    const payload = buildTemplatePayload(wizardData);

    for (const template of templates) {
      try {
        const compiled = renderTemplate(template.markdown_template, payload);
        totalCompiled++;

        const issues = validateOutput(compiled, template.slug, config.label);
        const errors = issues.filter((i) => i.severity === 'error');
        const warnings = issues.filter((i) => i.severity === 'warning');

        totalErrors += errors.length;
        totalWarnings += warnings.length;

        if (errors.length > 0 || warnings.length > 0) {
          const status = errors.length > 0 ? '❌' : '⚠';
          console.log(`  ${status} ${template.slug}`);
          for (const issue of issues) {
            const icon = issue.severity === 'error' ? '    ✖' : '    ⚡';
            console.log(`${icon} ${issue.message}`);
          }
        } else {
          console.log(`  ✅ ${template.slug}`);
        }
      } catch (err) {
        totalErrors++;
        console.log(`  ❌ ${template.slug}`);
        console.log(`    ✖ Compilation error: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }

  // ── Summary ──
  console.log('\n╔══════════════════════════════════════════════════════════════════╗');
  console.log(`║  Results: ${totalCompiled} compilations, ${totalErrors} errors, ${totalWarnings} warnings`);
  console.log('╚══════════════════════════════════════════════════════════════════╝');

  if (totalErrors > 0) {
    console.log('\n❌ FAIL — Fix compilation errors before release.\n');
    process.exit(1);
  } else if (totalWarnings > 0) {
    console.log('\n⚠  PASS with warnings — Review before release.\n');
    process.exit(0);
  } else {
    console.log('\n✅ PASS — All templates compile cleanly across all configurations.\n');
    process.exit(0);
  }
}

main();
