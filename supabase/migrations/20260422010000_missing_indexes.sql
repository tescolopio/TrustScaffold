-- Indexes missing from initial migrations, identified by audit.
-- Adds solo indexes on high-cardinality FK columns used in filtered queries.

-- evidence_artifacts: queries filtering by org alone (e.g. list all evidence for org)
create index if not exists evidence_artifacts_organization_id_idx
  on public.evidence_artifacts(organization_id);

-- document_revisions: queries fetching revision history for a single document
create index if not exists document_revisions_document_id_idx
  on public.document_revisions(document_id);

-- wizard_drafts: belt-and-suspenders (unique constraint already covers this, but explicit for query planner)
create index if not exists wizard_drafts_updated_at_idx
  on public.wizard_drafts(updated_at desc);
