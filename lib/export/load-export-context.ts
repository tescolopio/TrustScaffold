import 'server-only';

import { getDashboardContext } from '@/lib/auth/get-dashboard-context';
import { decryptIntegrationToken } from '@/lib/integrations/token-crypto';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import type { IntegrationProvider } from '@/lib/types';

import type { ExportableDoc } from './export-helpers';

export async function loadExportContext(provider: IntegrationProvider, formData: FormData) {
  const context = await getDashboardContext();

  if (!context?.organization) {
    throw new Error('No active organization found for this session');
  }

  if (context.organization.role !== 'admin') {
    throw new Error('Only admins can export approved documents');
  }

  const selectedDocIds = formData
    .getAll('selected_doc_ids')
    .map((value) => String(value).trim())
    .filter(Boolean);

  const supabase = await createSupabaseServerClient();
  const { data: integration, error: integrationError } = await supabase
    .from('organization_integrations')
    .select('id, provider, repo_owner, repo_name, default_branch, encrypted_token')
    .eq('organization_id', context.organization.id)
    .eq('provider', provider)
    .single();

  if (integrationError || !integration) {
    throw new Error(integrationError?.message ?? `No ${provider} integration is configured for this organization`);
  }

  const token = decryptIntegrationToken(integration.encrypted_token);

  if (!token) {
    throw new Error(`No access token is configured for the ${provider} integration`);
  }

  let docsQuery = supabase
    .from('generated_docs')
    .select('id, title, file_name, content_markdown, version, input_payload, templates(slug, name)')
    .eq('organization_id', context.organization.id)
    .eq('status', 'approved')
    .order('title', { ascending: true });

  if (selectedDocIds.length) {
    docsQuery = docsQuery.in('id', selectedDocIds);
  }

  const { data: docs, error: docsError } = await docsQuery;

  if (docsError) {
    throw new Error(docsError.message);
  }

  if (!docs?.length) {
    throw new Error(selectedDocIds.length ? 'No approved documents matched the current selection' : 'No approved documents are available for export');
  }

  return {
    context,
    supabase,
    integration,
    token,
    docs: docs as ExportableDoc[],
  };
}