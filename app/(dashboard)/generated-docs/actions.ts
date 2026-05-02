'use server';

import { revalidatePath } from 'next/cache';
import type { Route } from 'next';
import { redirect } from 'next/navigation';

import { exportApprovedDocsToAzureDevOpsAction } from '@/app/actions/export-to-azure-devops';
import { exportApprovedDocsToGithubAction } from '@/app/actions/export-to-github';
import { canApproveDocuments, canRejectOrRegenerateDocuments, isAdminRole } from '@/lib/auth/roles';
import { deriveDocumentArtifactStates } from '@/lib/documents/document-artifacts';
import {
  buildGeneratedDocErrorRoute,
  buildGeneratedDocsErrorRoute,
  buildGeneratedDocsSuccessRoute,
  buildGeneratedDocSuccessRoute,
} from '@/lib/documents/generated-doc-navigation';
import { renderTemplate, stripMappingMetadata } from '@/lib/documents/template-engine';
import { getDashboardContext } from '@/lib/auth/get-dashboard-context';
import { buildQueuedSharePointPdfMetadata } from '@/lib/publications/sharepoint';
import { buildTemplatePayload, isBridgeLetterPrimaryAudienceId, type BridgeLetterPrimaryAudienceId } from '@/lib/wizard/template-payload';
import { wizardSchema } from '@/lib/wizard/schema';
import { createSupabaseServerClient } from '@/lib/supabase-server';

function parseBridgeLetterPrimaryAudienceOverride(
  formData: FormData,
  options?: { errorDocumentId?: string },
): BridgeLetterPrimaryAudienceId | null {
  const rawValue = String(formData.get('bridge_letter_primary_audience_override') ?? '').trim();

  if (!rawValue || rawValue === 'auto') {
    return null;
  }

  if (!isBridgeLetterPrimaryAudienceId(rawValue)) {
    if (options?.errorDocumentId) {
      redirect(buildGeneratedDocErrorRoute(options.errorDocumentId, 'Invalid bridge letter audience override'));
    }

    redirect(buildGeneratedDocsErrorRoute('Invalid bridge letter audience override'));
  }

  return rawValue;
}

async function getDocumentAndRole(documentId: string) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: document, error: documentError } = await supabase
    .from('generated_docs')
    .select('id, organization_id, status, version')
    .eq('id', documentId)
    .single();

  if (documentError || !document) {
    throw new Error(documentError?.message ?? 'Generated document not found');
  }

  const { data: membership, error: membershipError } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', document.organization_id)
    .eq('user_id', user.id)
    .single();

  if (membershipError || !membership) {
    throw new Error('You are not a member of this organization');
  }

  return { supabase, document, role: membership.role, userId: user.id };
}

function getSelectedDocIds(formData: FormData) {
  return formData
    .getAll('selected_doc_ids')
    .map((value) => String(value).trim())
    .filter(Boolean);
}

export async function approveGeneratedDocAction(formData: FormData) {
  const documentId = String(formData.get('document_id') ?? '').trim();
  const approvalReason = String(formData.get('approval_reason') ?? '').trim();

  if (!documentId) {
    redirect(buildGeneratedDocsErrorRoute('Missing document identifier'));
  }

  if (approvalReason.length < 10) {
    redirect(buildGeneratedDocErrorRoute(documentId, 'Provide a clear approval message (10+ characters).'));
  }

  const { supabase, document, role, userId } = await getDocumentAndRole(documentId);

  if (!canApproveDocuments(role)) {
    redirect(buildGeneratedDocErrorRoute(documentId, 'Only admins and approvers can approve documents'));
  }

  if (document.status === 'approved') {
    redirect(buildGeneratedDocErrorRoute(documentId, 'Document is already approved'));
  }

  const { data: docForArtifactState } = await supabase
    .from('generated_docs')
    .select('input_payload, templates(slug)')
    .eq('id', documentId)
    .single();
  const { data: currentDraft } = await supabase
    .from('wizard_drafts')
    .select('payload')
    .eq('organization_id', document.organization_id)
    .maybeSingle();
  const artifactTemplate = docForArtifactState?.templates;
  const artifactTemplateRelation = Array.isArray(artifactTemplate) ? artifactTemplate[0] : artifactTemplate;
  const artifactState = deriveDocumentArtifactStates({
    documentSlug: artifactTemplateRelation?.slug,
    documentStatus: 'approved',
    sourcePayload: docForArtifactState?.input_payload,
    currentDraftPayload: currentDraft?.payload,
  });

  const { error } = await supabase
    .from('generated_docs')
    .update({
      status: 'approved',
      approved_by: userId,
      approved_at: new Date().toISOString(),
      artifact_state: artifactState,
      artifact_state_updated_at: new Date().toISOString(),
    })
    .eq('id', documentId)
    .eq('organization_id', document.organization_id);

  if (error) {
    redirect(buildGeneratedDocErrorRoute(documentId, error.message));
  }

  const { error: auditError } = await supabase.rpc('append_audit_log', {
    p_organization_id: document.organization_id,
    p_action: 'document.approved',
    p_entity_type: 'generated_doc',
    p_entity_id: document.id,
    p_details: {
      reason: approvalReason,
      version: document.version,
      status: 'approved',
    },
  });

  if (auditError) {
    redirect(buildGeneratedDocErrorRoute(documentId, auditError.message));
  }

  // Create an "approved" revision in the ledger
  const { data: approvedDoc } = await supabase
    .from('generated_docs')
    .select('content_markdown')
    .eq('id', documentId)
    .single();

  if (approvedDoc) {
    await supabase.rpc('insert_document_revision', {
      p_document_id: documentId,
      p_source: 'approved',
      p_content_markdown: approvedDoc.content_markdown,
    });
  }

  revalidatePath(`/generated-docs/${documentId}`);
  revalidatePath('/generated-docs');
  redirect(buildGeneratedDocSuccessRoute(documentId, 'Document approved'));
}

export async function archiveGeneratedDocAction(formData: FormData) {
  const documentId = String(formData.get('document_id') ?? '').trim();

  if (!documentId) {
    redirect(buildGeneratedDocsErrorRoute('Missing document identifier'));
  }

  const { supabase, role } = await getDocumentAndRole(documentId);

  if (!isAdminRole(role)) {
    redirect(buildGeneratedDocErrorRoute(documentId, 'Only admins can archive documents'));
  }

  const { error } = await supabase.rpc('archive_generated_document', {
    p_document_id: documentId,
  });

  if (error) {
    redirect(buildGeneratedDocErrorRoute(documentId, error.message));
  }

  revalidatePath(`/generated-docs/${documentId}`);
  revalidatePath('/generated-docs');
  redirect(buildGeneratedDocSuccessRoute(documentId, 'Document archived'));
}

export async function rejectGeneratedDocAction(formData: FormData) {
  const documentId = String(formData.get('document_id') ?? '').trim();
  const rejectionReason = String(formData.get('rejection_reason') ?? '').trim();

  if (!documentId) {
    redirect(buildGeneratedDocsErrorRoute('Missing document identifier'));
  }

  if (rejectionReason.length < 10) {
    redirect(buildGeneratedDocErrorRoute(documentId, 'Provide a clear rejection reason (10+ characters).'));
  }

  const { supabase, document, role } = await getDocumentAndRole(documentId);

  if (!canRejectOrRegenerateDocuments(role)) {
    redirect(buildGeneratedDocErrorRoute(documentId, 'Only admins and editors can reject drafts'));
  }

  if (document.status !== 'draft') {
    redirect(buildGeneratedDocErrorRoute(documentId, 'Only draft documents can be rejected'));
  }

  const { data: docForArtifactState } = await supabase
    .from('generated_docs')
    .select('input_payload, templates(slug)')
    .eq('id', documentId)
    .single();
  const { data: currentDraft } = await supabase
    .from('wizard_drafts')
    .select('payload')
    .eq('organization_id', document.organization_id)
    .maybeSingle();
  const artifactTemplate = docForArtifactState?.templates;
  const artifactTemplateRelation = Array.isArray(artifactTemplate) ? artifactTemplate[0] : artifactTemplate;
  const artifactState = deriveDocumentArtifactStates({
    documentSlug: artifactTemplateRelation?.slug,
    documentStatus: 'archived',
    sourcePayload: docForArtifactState?.input_payload,
    currentDraftPayload: currentDraft?.payload,
  });

  const { error: updateError } = await supabase
    .from('generated_docs')
    .update({
      status: 'archived',
      approved_by: null,
      approved_at: null,
      artifact_state: artifactState,
      artifact_state_updated_at: new Date().toISOString(),
    })
    .eq('id', documentId)
    .eq('organization_id', document.organization_id);

  if (updateError) {
    redirect(buildGeneratedDocErrorRoute(documentId, updateError.message));
  }

  const { error: auditError } = await supabase.rpc('append_audit_log', {
    p_organization_id: document.organization_id,
    p_action: 'document.rejected',
    p_entity_type: 'generated_doc',
    p_entity_id: document.id,
    p_details: {
      reason: rejectionReason,
      from_status: 'draft',
      to_status: 'archived',
      version: document.version,
    },
  });

  if (auditError) {
    redirect(buildGeneratedDocErrorRoute(documentId, auditError.message));
  }

  revalidatePath(`/generated-docs/${documentId}`);
  revalidatePath('/generated-docs');
  redirect(buildGeneratedDocSuccessRoute(documentId, 'Draft rejected and archived with reviewer reason'));
}

export async function archiveSelectedGeneratedDocsAction(formData: FormData) {
  const selectedDocIds = getSelectedDocIds(formData);

  if (!selectedDocIds.length) {
    redirect(buildGeneratedDocsErrorRoute('Select at least one document to archive'));
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: docs, error } = await supabase
    .from('generated_docs')
    .select('id, organization_id')
    .in('id', selectedDocIds);

  if (error || !docs?.length) {
    redirect(buildGeneratedDocsErrorRoute(error?.message ?? 'No documents matched the selection'));
  }

  const organizationId = docs[0].organization_id;
  const { data: membership } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', organizationId)
    .eq('user_id', user.id)
    .single();

  if (!isAdminRole(membership?.role)) {
    redirect(buildGeneratedDocsErrorRoute('Only admins can archive documents'));
  }

  for (const doc of docs) {
    const { error: archiveError } = await supabase.rpc('archive_generated_document', {
      p_document_id: doc.id,
    });

    if (archiveError) {
      redirect(buildGeneratedDocsErrorRoute(archiveError.message));
    }
  }

  revalidatePath('/generated-docs');
  redirect(buildGeneratedDocsSuccessRoute(`Archived ${docs.length} document${docs.length === 1 ? '' : 's'}`));
}

export async function regenerateDocAction(formData: FormData) {
  const documentId = String(formData.get('document_id') ?? '').trim();
  if (!documentId) redirect(buildGeneratedDocsErrorRoute('Missing document identifier'));
  const bridgeLetterPrimaryAudienceOverride = parseBridgeLetterPrimaryAudienceOverride(formData, { errorDocumentId: documentId });

  const context = await getDashboardContext();
  if (!context?.organization) redirect('/login');
  if (!canRejectOrRegenerateDocuments(context.organization.role)) {
    redirect(buildGeneratedDocErrorRoute(documentId, 'Only admins and editors can regenerate documents'));
  }

  const supabase = await createSupabaseServerClient();
  const { data: doc, error: docError } = await supabase
    .from('generated_docs')
    .select('id, template_id, input_payload, version, templates(name, slug, output_filename_pattern, markdown_template, default_variables)')
    .eq('id', documentId)
    .eq('organization_id', context.organization.id)
    .single();

  if (docError || !doc) {
    redirect(buildGeneratedDocErrorRoute(documentId, 'Document not found'));
  }

  const template = Array.isArray(doc.templates) ? doc.templates[0] : doc.templates;
  if (!template) redirect(buildGeneratedDocErrorRoute(documentId, 'Template not found'));

  const parsed = wizardSchema.safeParse(doc.input_payload);
  if (!parsed.success) {
    redirect(buildGeneratedDocErrorRoute(documentId, 'Stored wizard payload is invalid - re-run the full wizard'));
  }

  const payload = {
    ...buildTemplatePayload(parsed.data, {
      workspaceOrganizationName: context.organization.name,
      bridgeLetterPrimaryAudienceOverride,
    }),
    wizard_data: parsed.data,
  };
  const mergedVariables = { ...(template.default_variables ?? {}), ...payload };

  let newFilename: string;
  let newContent: string;
  try {
    newFilename = renderTemplate(template.output_filename_pattern, mergedVariables, template.name);
    newContent = stripMappingMetadata(renderTemplate(template.markdown_template, mergedVariables, template.name));
  } catch (err) {
    redirect(buildGeneratedDocErrorRoute(documentId, err instanceof Error ? err.message : 'Render failed'));
  }

  const { error: updateError } = await supabase
    .from('generated_docs')
    .update({
      file_name: newFilename,
      content_markdown: newContent,
      status: 'draft',
      artifact_state: deriveDocumentArtifactStates({
        documentSlug: template.slug,
        documentStatus: 'draft',
        sourcePayload: parsed.data,
        currentDraftPayload: parsed.data,
      }),
      artifact_state_updated_at: new Date().toISOString(),
    })
    .eq('id', documentId);

  if (updateError) redirect(buildGeneratedDocErrorRoute(documentId, updateError.message));

  await supabase.rpc('insert_document_revision', {
    p_document_id: documentId,
    p_source: 'generated',
    p_content_markdown: newContent,
  });

  revalidatePath(`/generated-docs/${documentId}`);
  revalidatePath('/generated-docs');
  redirect(buildGeneratedDocSuccessRoute(
    documentId,
    bridgeLetterPrimaryAudienceOverride
      ? 'Document regenerated from saved wizard data with bridge letter audience override'
      : 'Document regenerated from saved wizard data',
  ));
}

export async function regenerateAllDocsAction(formData: FormData) {
  const bridgeLetterPrimaryAudienceOverride = parseBridgeLetterPrimaryAudienceOverride(formData);
  const context = await getDashboardContext();
  if (!context?.organization) redirect('/login');

  if (!canRejectOrRegenerateDocuments(context.organization.role)) {
    redirect(buildGeneratedDocsErrorRoute('Only admins and editors can regenerate documents'));
  }

  const supabase = await createSupabaseServerClient();

  const { data: draft } = await supabase
    .from('wizard_drafts')
    .select('payload')
    .eq('organization_id', context.organization.id)
    .maybeSingle();

  if (!draft?.payload) {
    redirect(buildGeneratedDocsErrorRoute('No org profile found. Complete the wizard first.'));
  }

  const parsed = wizardSchema.safeParse(draft.payload);
  if (!parsed.success) {
    redirect(buildGeneratedDocsErrorRoute('Org profile is invalid. Re-run the wizard.'));
  }

  const payload = {
    ...buildTemplatePayload(parsed.data, {
      workspaceOrganizationName: context.organization.name,
      bridgeLetterPrimaryAudienceOverride,
    }),
    wizard_data: parsed.data,
  };

  const { data: docs } = await supabase
    .from('generated_docs')
    .select('id, templates(name, slug, output_filename_pattern, markdown_template, default_variables)')
    .eq('organization_id', context.organization.id)
    .neq('status', 'archived');

  if (!docs?.length) {
    redirect(buildGeneratedDocsErrorRoute('No active documents to regenerate'));
  }

  let successCount = 0;
  for (const doc of docs) {
    const template = Array.isArray(doc.templates) ? doc.templates[0] : doc.templates;
    if (!template) continue;

    const mergedVariables = { ...(template.default_variables ?? {}), ...payload };
    let newFilename: string;
    let newContent: string;
    try {
      newFilename = renderTemplate(template.output_filename_pattern, mergedVariables, template.name);
      newContent = stripMappingMetadata(renderTemplate(template.markdown_template, mergedVariables, template.name));
    } catch {
      continue;
    }

    const { error: updateError } = await supabase
      .from('generated_docs')
      .update({
        file_name: newFilename,
        content_markdown: newContent,
        status: 'draft',
        artifact_state: deriveDocumentArtifactStates({
          documentSlug: template.slug,
          documentStatus: 'draft',
          sourcePayload: parsed.data,
          currentDraftPayload: parsed.data,
        }),
        artifact_state_updated_at: new Date().toISOString(),
      })
      .eq('id', doc.id);

    if (!updateError) {
      await supabase.rpc('insert_document_revision', {
        p_document_id: doc.id,
        p_source: 'generated',
        p_content_markdown: newContent,
      });
      successCount++;
    }
  }

  revalidatePath('/generated-docs');
  const totalCount = docs.length;
  const skippedCount = totalCount - successCount;

  if (skippedCount > 0) {
    redirect(buildGeneratedDocsErrorRoute(`Regenerated ${successCount} of ${totalCount} documents. ${skippedCount} document${skippedCount === 1 ? '' : 's'} were skipped and may still be stale.`));
  }

  redirect(buildGeneratedDocsSuccessRoute(
    bridgeLetterPrimaryAudienceOverride
      ? `Regenerated ${successCount} document${successCount === 1 ? '' : 's'} from current org profile with bridge letter audience override`
      : `Regenerated ${successCount} document${successCount === 1 ? '' : 's'} from current org profile`,
  ));
}

export async function queueSharePointPdfPublicationAction(formData: FormData) {
  const documentId = String(formData.get('document_id') ?? '').trim();

  if (!documentId) {
    redirect(buildGeneratedDocsErrorRoute('Missing document identifier'));
  }

  const { supabase, document, role, userId } = await getDocumentAndRole(documentId);

  if (!isAdminRole(role)) {
    redirect(buildGeneratedDocErrorRoute(documentId, 'Only admins can queue SharePoint publication'));
  }

  if (document.status !== 'approved') {
    redirect(buildGeneratedDocErrorRoute(documentId, 'Only approved documents can be published'));
  }

  const { data: approvedRevision, error: approvedRevisionError } = await supabase
    .from('document_revisions')
    .select('id, content_hash')
    .eq('document_id', documentId)
    .eq('source', 'approved')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (approvedRevisionError || !approvedRevision) {
    redirect(buildGeneratedDocErrorRoute(documentId, approvedRevisionError?.message ?? 'No approved revision found for publication'));
  }

  const { data: docDetails, error: docDetailsError } = await supabase
    .from('generated_docs')
    .select('title, file_name')
    .eq('id', documentId)
    .single();

  if (docDetailsError || !docDetails) {
    redirect(buildGeneratedDocErrorRoute(documentId, docDetailsError?.message ?? 'Unable to load document details'));
  }

  const { data: sharePointIntegration, error: sharePointIntegrationError } = await supabase
    .from('organization_integrations')
    .select('id, provider_config')
    .eq('organization_id', document.organization_id)
    .eq('provider', 'sharepoint')
    .maybeSingle();

  if (sharePointIntegrationError || !sharePointIntegration) {
    redirect(buildGeneratedDocErrorRoute(documentId, sharePointIntegrationError?.message ?? 'No SharePoint integration is configured for this organization yet'));
  }

  const providerConfig = sharePointIntegration.provider_config && typeof sharePointIntegration.provider_config === 'object'
    ? sharePointIntegration.provider_config as Record<string, unknown>
    : {};

  const metadata = buildQueuedSharePointPdfMetadata({
    fileName: docDetails.file_name,
    revisionId: approvedRevision.id,
    contentHash: approvedRevision.content_hash,
    providerConfig,
  });

  const { error: publicationError } = await supabase
    .from('document_publications')
    .insert({
      organization_id: document.organization_id,
      document_id: documentId,
      revision_id: approvedRevision.id,
      integration_id: sharePointIntegration.id,
      provider: 'sharepoint',
      format: 'pdf',
      status: 'queued',
      published_by: userId,
      metadata,
    });

  if (publicationError) {
    redirect(buildGeneratedDocErrorRoute(documentId, publicationError.message));
  }

  const { error: auditError } = await supabase.rpc('append_audit_log', {
    p_organization_id: document.organization_id,
    p_action: 'document.publication_queued',
    p_entity_type: 'generated_doc',
    p_entity_id: documentId,
    p_details: {
      provider: 'sharepoint',
      format: 'pdf',
      revision_id: approvedRevision.id,
      target_file_name: metadata.target_file_name,
    },
  });

  if (auditError) {
    redirect(buildGeneratedDocErrorRoute(documentId, auditError.message));
  }

  revalidatePath(`/generated-docs/${documentId}`);
  revalidatePath('/generated-docs');
  redirect(buildGeneratedDocSuccessRoute(documentId, 'SharePoint PDF publication queued'));
}

export async function exportToGithubFromDashboardAction(formData: FormData) {
  const result = await exportApprovedDocsToGithubAction(formData);

  if (!result.ok) {
    redirect(buildGeneratedDocsErrorRoute(result.error));
  }

  redirect(buildGeneratedDocsSuccessRoute(`Opened GitHub PR for ${result.exportedCount} approved documents`));
}

export async function exportToAzureDevOpsFromDashboardAction(formData: FormData) {
  const result = await exportApprovedDocsToAzureDevOpsAction(formData);

  if (!result.ok) {
    redirect(buildGeneratedDocsErrorRoute(result.error));
  }

  redirect(buildGeneratedDocsSuccessRoute(`Opened Azure DevOps PR for ${result.exportedCount} approved documents`));
}