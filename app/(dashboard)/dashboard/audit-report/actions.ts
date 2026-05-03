'use server';

import type { Route } from 'next';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { getDashboardContext } from '@/lib/auth/get-dashboard-context';
import { createSupabaseServerClient } from '@/lib/supabase-server';

const AUDIT_REPORT_ROUTE = '/dashboard/audit-report' as Route;

function redirectToAuditReport(searchParams: Record<string, string>) {
  const query = new URLSearchParams(searchParams);
  redirect(`${AUDIT_REPORT_ROUTE}?${query.toString()}` as Route);
}

export async function submitAuditReportAttestationAction(formData: FormData) {
  const context = await getDashboardContext();

  if (!context?.organization) {
    redirect('/login');
  }

  if (!['admin', 'approver', 'editor'].includes(context.organization.role)) {
    redirectToAuditReport({ error: 'You do not have permission to submit attestations' });
  }

  const readiness = String(formData.get('readiness') ?? '').trim();
  const note = String(formData.get('attestation_note') ?? '').trim();

  if (!['ready', 'not-ready'].includes(readiness)) {
    redirectToAuditReport({ error: 'Select a report readiness status' });
  }

  if (note.length < 10) {
    redirectToAuditReport({ error: 'Provide an attestation note (10+ characters)' });
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc('append_audit_log', {
    p_organization_id: context.organization.id,
    p_action: 'audit_report.attested',
    p_entity_type: 'organization',
    p_entity_id: context.organization.id,
    p_details: {
      readiness,
      note,
      submitted_by: context.email ?? context.userId,
      submitted_at: new Date().toISOString(),
    },
  });

  if (error) {
    redirectToAuditReport({ error: error.message });
  }

  revalidatePath(AUDIT_REPORT_ROUTE);
  redirectToAuditReport({ success: 'Attestation submitted' });
}
