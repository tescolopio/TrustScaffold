'use server';

import { revalidatePath } from 'next/cache';

import { renderTemplate, stripMappingMetadata } from '@/lib/documents/template-engine';
import { canRejectOrRegenerateDocuments } from '@/lib/auth/roles';
import { getDashboardContext } from '@/lib/auth/get-dashboard-context';
import { deriveDocumentArtifactStates } from '@/lib/documents/document-artifacts';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { buildTemplatePayload } from '@/lib/wizard/template-payload';
import { selectedCriteriaCodes, wizardSchema, type WizardData } from '@/lib/wizard/schema';

type CompileDocsResult =
  | { ok: true; insertedCount: number }
  | { ok: false; error: string };

type CompiledDocument = {
  organization_id: string;
  template_id: string;
  template_slug: string;
  title: string;
  file_name: string;
  content_markdown: string;
  input_payload: WizardData;
  artifact_state: ReturnType<typeof deriveDocumentArtifactStates>;
  status: 'draft';
  version: number;
};

export async function compileDocsAction(rawWizardData: WizardData): Promise<CompileDocsResult> {
  const parsed = wizardSchema.safeParse(rawWizardData);

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Wizard payload failed validation' };
  }

  const { company, scope } = parsed.data;
  const missing: string[] = [];
  if (!company.name?.trim()) missing.push('Company name (Step 0 — Company Info)');
  if (!scope.systemName?.trim()) missing.push('System name (System Scope step)');
  if (!scope.systemDescription?.trim()) missing.push('System description (System Scope step)');
  if (missing.length) {
    return { ok: false, error: `Required fields missing: ${missing.join('; ')}` };
  }

  const context = await getDashboardContext();

  if (!context?.organization) {
    return { ok: false, error: 'No active organization was found for this session' };
  }

  const organization = context.organization;

  if (!canRejectOrRegenerateDocuments(organization.role)) {
    return { ok: false, error: 'Only admins and editors can generate policy drafts' };
  }

  const supabase = await createSupabaseServerClient();
  const criteriaCodes = selectedCriteriaCodes(parsed.data);
  const { data: templates, error: templateError } = await supabase
    .from('templates')
    .select('id, name, slug, output_filename_pattern, markdown_template, default_variables, criteria_mapped')
    .eq('is_active', true)
    .overlaps('criteria_mapped', criteriaCodes)
    .order('name', { ascending: true });

  if (templateError) {
    return { ok: false, error: templateError.message };
  }

  if (!templates?.length) {
    return { ok: false, error: 'No templates matched the selected Trust Services Criteria' };
  }

  const payload = {
    ...buildTemplatePayload(parsed.data, { workspaceOrganizationName: organization.name }),
    wizard_data: parsed.data,
  };

  const docs: CompiledDocument[] = [];
  for (const template of templates) {
    const mergedVariables = { ...(template.default_variables ?? {}), ...payload };
    try {
      docs.push({
        organization_id: organization.id,
        template_id: template.id,
        template_slug: template.slug,
        title: template.name,
        file_name: renderTemplate(template.output_filename_pattern, mergedVariables, template.name),
        content_markdown: stripMappingMetadata(renderTemplate(template.markdown_template, mergedVariables, template.name)),
        input_payload: parsed.data,
        artifact_state: deriveDocumentArtifactStates({
          documentSlug: template.slug,
          documentStatus: 'draft',
          sourcePayload: parsed.data,
          currentDraftPayload: parsed.data,
        }),
        status: 'draft',
        version: 1,
      });
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : `Failed to render ${template.name}` };
    }
  }

  const { data: existingDocs, error: existingDocsError } = await supabase
    .from('generated_docs')
    .select('id, template_id, status, version')
    .eq('organization_id', organization.id)
    .in('template_id', docs.map((doc) => doc.template_id))
    .order('version', { ascending: false });

  if (existingDocsError) {
    return { ok: false, error: existingDocsError.message };
  }

  const draftByTemplateId = new Map<string, { id: string; version: number }>();
  const maxVersionByTemplateId = new Map<string, number>();

  for (const existingDoc of existingDocs ?? []) {
    if (!maxVersionByTemplateId.has(existingDoc.template_id)) {
      maxVersionByTemplateId.set(existingDoc.template_id, existingDoc.version);
    }

    if (existingDoc.status === 'draft' && !draftByTemplateId.has(existingDoc.template_id)) {
      draftByTemplateId.set(existingDoc.template_id, {
        id: existingDoc.id,
        version: existingDoc.version,
      });
    }
  }

  let affectedCount = 0;

  for (const doc of docs) {
    const existingDraft = draftByTemplateId.get(doc.template_id);

    if (existingDraft) {
      const { error: updateError } = await supabase
        .from('generated_docs')
        .update({
          title: doc.title,
          file_name: doc.file_name,
          content_markdown: doc.content_markdown,
          input_payload: doc.input_payload,
          artifact_state: doc.artifact_state,
          artifact_state_updated_at: new Date().toISOString(),
        })
        .eq('id', existingDraft.id);

      if (updateError) {
        return { ok: false, error: updateError.message };
      }

      affectedCount += 1;
      continue;
    }

    const nextVersion = (maxVersionByTemplateId.get(doc.template_id) ?? 0) + 1;
    const { data: insertedDoc, error: insertError } = await supabase.from('generated_docs').insert({
      organization_id: doc.organization_id,
      template_id: doc.template_id,
      title: doc.title,
      file_name: doc.file_name,
      content_markdown: doc.content_markdown,
      input_payload: doc.input_payload,
      artifact_state: doc.artifact_state,
      artifact_state_updated_at: new Date().toISOString(),
      status: doc.status,
      version: nextVersion,
    }).select('id').single();

    if (insertError) {
      return { ok: false, error: insertError.message };
    }

    affectedCount += 1;
  }

  // Create "generated" revision for each compiled doc
  const { data: allDocs } = await supabase
    .from('generated_docs')
    .select('id, content_markdown')
    .eq('organization_id', organization.id)
    .eq('status', 'draft')
    .in('template_id', docs.map((doc) => doc.template_id));

  if (allDocs?.length) {
    for (const doc of allDocs) {
      await supabase.rpc('insert_document_revision', {
        p_document_id: doc.id,
        p_source: 'generated',
        p_content_markdown: doc.content_markdown,
      });
    }
  }

  revalidatePath('/generated-docs');
  revalidatePath('/dashboard');

  return { ok: true, insertedCount: affectedCount };
}
