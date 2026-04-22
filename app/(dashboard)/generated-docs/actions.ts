'use server';

import { revalidatePath } from 'next/cache';
import type { Route } from 'next';
import { redirect } from 'next/navigation';

import { exportApprovedDocsToAzureDevOpsAction } from '@/app/actions/export-to-azure-devops';
import { exportApprovedDocsToGithubAction } from '@/app/actions/export-to-github';
import { renderTemplate } from '@/lib/documents/template-engine';
import { getDashboardContext } from '@/lib/auth/get-dashboard-context';
import { buildTemplatePayload } from '@/lib/wizard/template-payload';
import { wizardSchema } from '@/lib/wizard/schema';
import { createSupabaseServerClient } from '@/lib/supabase-server';

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

  return { supabase, document, role: membership.role };
}

function buildGeneratedDocRoute(documentId: string, query?: string) {
  const basePath = `/generated-docs/${documentId}`;

  if (!query) {
    return basePath as Route;
  }

  return `${basePath}?${query}` as never;
}

function buildGeneratedDocsRoute(query?: string) {
  if (!query) {
    return '/generated-docs' as Route;
  }

  return `/generated-docs?${query}` as never;
}

function getSelectedDocIds(formData: FormData) {
  return formData
    .getAll('selected_doc_ids')
    .map((value) => String(value).trim())
    .filter(Boolean);
}

export async function approveGeneratedDocAction(formData: FormData) {
  const documentId = String(formData.get('document_id') ?? '').trim();

  if (!documentId) {
    redirect('/generated-docs?error=Missing%20document%20identifier');
  }

  const { supabase, role } = await getDocumentAndRole(documentId);

  if (!['admin', 'approver'].includes(role)) {
    redirect(buildGeneratedDocRoute(documentId, 'error=Only%20admins%20and%20approvers%20can%20approve%20documents'));
  }

  const { error } = await supabase.rpc('approve_generated_document', {
    p_document_id: documentId,
  });

  if (error) {
    redirect(buildGeneratedDocRoute(documentId, `error=${encodeURIComponent(error.message)}`));
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
  redirect(buildGeneratedDocRoute(documentId, 'success=Document%20approved'));
}

export async function archiveGeneratedDocAction(formData: FormData) {
  const documentId = String(formData.get('document_id') ?? '').trim();

  if (!documentId) {
    redirect('/generated-docs?error=Missing%20document%20identifier');
  }

  const { supabase, role } = await getDocumentAndRole(documentId);

  if (role !== 'admin') {
    redirect(buildGeneratedDocRoute(documentId, 'error=Only%20admins%20can%20archive%20documents'));
  }

  const { error } = await supabase.rpc('archive_generated_document', {
    p_document_id: documentId,
  });

  if (error) {
    redirect(buildGeneratedDocRoute(documentId, `error=${encodeURIComponent(error.message)}`));
  }

  revalidatePath(`/generated-docs/${documentId}`);
  revalidatePath('/generated-docs');
  redirect(buildGeneratedDocRoute(documentId, 'success=Document%20archived'));
}

export async function archiveSelectedGeneratedDocsAction(formData: FormData) {
  const selectedDocIds = getSelectedDocIds(formData);

  if (!selectedDocIds.length) {
    redirect(buildGeneratedDocsRoute('error=Select%20at%20least%20one%20document%20to%20archive'));
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
    redirect(buildGeneratedDocsRoute(`error=${encodeURIComponent(error?.message ?? 'No documents matched the selection')}`));
  }

  const organizationId = docs[0].organization_id;
  const { data: membership } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', organizationId)
    .eq('user_id', user.id)
    .single();

  if (membership?.role !== 'admin') {
    redirect(buildGeneratedDocsRoute('error=Only%20admins%20can%20archive%20documents'));
  }

  for (const doc of docs) {
    const { error: archiveError } = await supabase.rpc('archive_generated_document', {
      p_document_id: doc.id,
    });

    if (archiveError) {
      redirect(buildGeneratedDocsRoute(`error=${encodeURIComponent(archiveError.message)}`));
    }
  }

  revalidatePath('/generated-docs');
  redirect(buildGeneratedDocsRoute(`success=Archived%20${docs.length}%20document${docs.length === 1 ? '' : 's'}`));
}

export async function regenerateDocAction(formData: FormData) {
  const documentId = String(formData.get('document_id') ?? '').trim();
  if (!documentId) redirect('/generated-docs?error=Missing%20document%20identifier');

  const context = await getDashboardContext();
  if (!context?.organization) redirect('/login');
  if (!['admin', 'editor'].includes(context.organization.role)) {
    redirect(buildGeneratedDocRoute(documentId, 'error=Only%20admins%20and%20editors%20can%20regenerate%20documents'));
  }

  const supabase = await createSupabaseServerClient();
  const { data: doc, error: docError } = await supabase
    .from('generated_docs')
    .select('id, template_id, input_payload, version, templates(name, output_filename_pattern, markdown_template, default_variables)')
    .eq('id', documentId)
    .eq('organization_id', context.organization.id)
    .single();

  if (docError || !doc) {
    redirect(buildGeneratedDocRoute(documentId, 'error=Document+not+found'));
  }

  const template = Array.isArray(doc.templates) ? doc.templates[0] : doc.templates;
  if (!template) redirect(buildGeneratedDocRoute(documentId, 'error=Template+not+found'));

  const parsed = wizardSchema.safeParse(doc.input_payload);
  if (!parsed.success) {
    redirect(buildGeneratedDocRoute(documentId, 'error=Stored+wizard+payload+is+invalid+-+re-run+the+full+wizard'));
  }

  const payload = { ...buildTemplatePayload(parsed.data), wizard_data: parsed.data };
  const mergedVariables = { ...(template.default_variables ?? {}), ...payload };

  let newFilename: string;
  let newContent: string;
  try {
    newFilename = renderTemplate(template.output_filename_pattern, mergedVariables, template.name);
    newContent = renderTemplate(template.markdown_template, mergedVariables, template.name);
  } catch (err) {
    redirect(buildGeneratedDocRoute(documentId, `error=${encodeURIComponent(err instanceof Error ? err.message : 'Render failed')}`));
  }

  const { error: updateError } = await supabase
    .from('generated_docs')
    .update({ file_name: newFilename, content_markdown: newContent, status: 'draft' })
    .eq('id', documentId);

  if (updateError) redirect(buildGeneratedDocRoute(documentId, `error=${encodeURIComponent(updateError.message)}`));

  await supabase.rpc('insert_document_revision', {
    p_document_id: documentId,
    p_source: 'generated',
    p_content_markdown: newContent,
  });

  revalidatePath(`/generated-docs/${documentId}`);
  revalidatePath('/generated-docs');
  redirect(buildGeneratedDocRoute(documentId, 'success=Document+regenerated+from+saved+wizard+data'));
}

export async function exportToGithubFromDashboardAction(formData: FormData) {
  const result = await exportApprovedDocsToGithubAction(formData);

  if (!result.ok) {
    redirect(buildGeneratedDocsRoute(`error=${encodeURIComponent(result.error)}`));
  }

  redirect(buildGeneratedDocsRoute(`success=${encodeURIComponent(`Opened GitHub PR for ${result.exportedCount} approved documents`)}`));
}

export async function exportToAzureDevOpsFromDashboardAction(formData: FormData) {
  const result = await exportApprovedDocsToAzureDevOpsAction(formData);

  if (!result.ok) {
    redirect(buildGeneratedDocsRoute(`error=${encodeURIComponent(result.error)}`));
  }

  redirect(buildGeneratedDocsRoute(`success=${encodeURIComponent(`Opened Azure DevOps PR for ${result.exportedCount} approved documents`)}`));
}