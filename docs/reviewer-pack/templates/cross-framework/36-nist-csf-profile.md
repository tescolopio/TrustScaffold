# NIST CSF Profile

> Baseline reviewer copy. Handlebars placeholders such as `{{organization_name}}` are intentionally preserved so this can be reviewed before organization-specific answers are inserted.

<!-- Mapping: A1.1, A1.2, A1.3, C1.1, C1.2, CC1.1, CC1.2, CC1.3, CC1.4, CC1.5, CC3.1, CC3.2, CC3.3, CC3.4, CC6.1, CC6.2, CC6.3, CC6.4, CC6.5, CC6.6, CC6.7, CC6.8, CC7.1, CC7.2, CC7.3, CC7.4, CC7.5, CC8.1, CC9.1, CC9.2, COMMON, HIPAA, ISO27001, PCI, PI1.1, PI1.2, PI1.3, PI1.4, PI1.5 -->

| Field | Value |
| --- | --- |
| Template slug | `nist-csf-profile` |
| TSC category | Universal |
| Criteria mapped | COMMON, CC1, CC3, CC6, CC7, CC8, CC9, A1, C1, PI1, ISO27001, HIPAA, PCI |
| Purpose | NIST Cybersecurity Framework profile translating the current wizard posture into Govern, Identify, Protect, Detect, Respond, and Recover functions with evidence and priority actions. |
| Output filename | `36-nist-csf-profile.md` |

---

---
title: NIST CSF Profile
slug: nist-csf-profile
tsc_category: Universal
criteria_mapped:
  - COMMON
  - CC1
  - CC3
  - CC6
  - CC7
  - CC8
  - CC9
  - A1
  - C1
  - PI1
  - ISO27001
  - HIPAA
  - PCI
generated_for: {{organization_name}}
effective_date: {{effective_date}}
version: {{policy_version}}
---

# NIST CSF Profile

## Purpose
This profile translates the current TrustScaffold wizard posture for {{primary_product_name}} into the NIST Cybersecurity Framework functions so customers, assessors, and internal stakeholders can review the same operating model through a NIST-oriented lens.

## Scope Summary
- Organization: {{organization_name}}
- System: {{primary_product_name}}
- Active framework scope: {{selected_trust_service_categories_text}}
- Generated-document baseline: {{generated_document_count}} documents

## Function Profile Matrix
| Function | Mapped Criteria | Status | Current Profile | Target Profile | Representative Evidence | Priority Actions | Related Documents |
| --- | --- | --- | --- | --- | --- | --- | --- |
{{#each nist_csf_profile_rows}}
| {{function_id}} {{function_name}} | {{mapped_criteria}} | {{status}} | {{current_profile}} | {{target_profile}} | {{representative_evidence}} | {{priority_actions}} | {{related_documents}} |
{{/each}}

## Management Note
This profile is derived from the current wizard answers, active decision-trace items, and generated baseline documents. It is a translation layer for readiness review, not a claim of independent NIST validation.
