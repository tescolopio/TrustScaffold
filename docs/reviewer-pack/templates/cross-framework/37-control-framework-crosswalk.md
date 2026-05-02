# Control-to-Framework Crosswalk

> Baseline reviewer copy. Handlebars placeholders such as `{{organization_name}}` are intentionally preserved so this can be reviewed before organization-specific answers are inserted.

<!-- Mapping: A1.1, A1.2, A1.3, C1.1, C1.2, CC1.1, CC1.2, CC1.3, CC1.4, CC1.5, CC2.1, CC2.2, CC2.3, CC3.1, CC3.2, CC3.3, CC3.4, CC4.1, CC4.2, CC5.1, CC5.2, CC5.3, CC6.1, CC6.2, CC6.3, CC6.4, CC6.5, CC6.6, CC6.7, CC6.8, CC7.1, CC7.2, CC7.3, CC7.4, CC7.5, CC8.1, CC9.1, CC9.2, COMMON, HIPAA, ISO27001, P1.1, P2.1, P3.1, P3.2, P4.1, P4.2, P4.3, P5.1, P5.2, P6.1, P6.2, P6.3, P6.4, P6.5, P6.6, P6.7, P7.1, P8.1, PCI, PI1.1, PI1.2, PI1.3, PI1.4, PI1.5, SOX -->

| Field | Value |
| --- | --- |
| Template slug | `control-framework-crosswalk` |
| TSC category | Universal |
| Criteria mapped | COMMON, CC1, CC2, CC3, CC4, CC5, CC6, CC7, CC8, CC9, A1, C1, PI1, P1, P2, P3, P4, P5, P6, P7, P8, ISO27001, HIPAA, PCI, SOX |
| Purpose | Matrix showing how each generated artifact supports SOC 2 and adjacent frameworks such as NIST CSF, ISO 27001, HIPAA, PCI-DSS, and SOX / ITGC. |
| Output filename | `37-control-framework-crosswalk.md` |

---

---
title: Control-to-Framework Crosswalk
slug: control-framework-crosswalk
tsc_category: Universal
criteria_mapped:
  - COMMON
  - CC1
  - CC2
  - CC3
  - CC4
  - CC5
  - CC6
  - CC7
  - CC8
  - CC9
  - A1
  - C1
  - PI1
  - P1
  - P2
  - P3
  - P4
  - P5
  - P6
  - P7
  - P8
  - ISO27001
  - HIPAA
  - PCI
  - SOX
generated_for: {{organization_name}}
effective_date: {{effective_date}}
version: {{policy_version}}
---

# Control-to-Framework Crosswalk

## Purpose
This matrix shows how the current generated-document set supports multiple control frameworks at once. It is intended to accelerate customer diligence and internal scoping conversations, not to replace framework-specific testing or assessor judgment.

## Crosswalk Matrix
| Generated Artifact | SOC 2 Coverage | NIST CSF Coverage | ISO 27001 | HIPAA | PCI-DSS | SOX / ITGC | Mapping Basis |
| --- | --- | --- | --- | --- | --- | --- | --- |
{{#each control_framework_crosswalk_rows}}
| {{document_name}} | {{soc2_coverage}} | {{nist_csf_coverage}} | {{iso27001_coverage}} | {{hipaa_coverage}} | {{pci_coverage}} | {{sox_coverage}} | {{mapping_basis}} |
{{/each}}

## Review Note
Framework coverage labels reflect direct artifact intent versus shared-control support. Reviewers should still confirm scope, inheritance, and any compensating controls before relying on this crosswalk externally.
