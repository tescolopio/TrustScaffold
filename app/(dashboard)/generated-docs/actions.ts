'use server';

import { revalidatePath } from 'next/cache';
import type { Route } from 'next';
import { redirect } from 'next/navigation';

import { exportApprovedDocsToAzureDevOpsAction } from '@/app/actions/export-to-azure-devops';
import { exportApprovedDocsToGithubAction } from '@/app/actions/export-to-github';
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