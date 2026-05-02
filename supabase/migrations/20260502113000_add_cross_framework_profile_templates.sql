insert into public.templates (
  slug,
  name,
  description,
  tsc_category,
  criteria_mapped,
  output_filename_pattern,
  markdown_template,
  default_variables,
  is_active
)
values
  (
    'nist-csf-profile',
    'NIST CSF Profile',
    'NIST Cybersecurity Framework profile translating the current wizard posture into Govern, Identify, Protect, Detect, Respond, and Recover functions with evidence and priority actions.',
    'Universal',
    array['COMMON', 'CC1', 'CC3', 'CC6', 'CC7', 'CC8', 'CC9', 'A1', 'C1', 'PI1', 'ISO27001', 'HIPAA', 'PCI'],
    '36-nist-csf-profile.md',
    $$---
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
$$,
    '{
      "organization_name": "Example Corp",
      "primary_product_name": "Example Cloud",
      "effective_date": "2026-05-02",
      "policy_version": "v0.1",
      "selected_trust_service_categories_text": "Security, Confidentiality, and Privacy",
      "generated_document_count": 38,
      "nist_csf_profile_rows": [
        {
          "function_id": "GV",
          "function_name": "Govern",
          "mapped_criteria": "COMMON, CC1, CC2, CC3, CC4",
          "status": "Partially established",
          "current_profile": "Security owner designated as Security Lead; formal risk register and review cadence are captured in the operating model",
          "target_profile": "Management assigns ownership, reviews risks on a defined cadence, tracks deficiencies, and can produce governance records for internal and external stakeholders.",
          "representative_evidence": "Information Security Policy; Risk Management Policy; Internal Audit and Monitoring Policy; management review records.",
          "priority_actions": "Document the real oversight path so generated governance language stays truthful.; Confirm governance ownership, documented review cadence, and retained management evidence.",
          "related_documents": "Information Security Policy; Risk Management Policy; Management Assertion Letter"
        }
      ]
    }'::jsonb,
    true
  ),
  (
    'control-framework-crosswalk',
    'Control-to-Framework Crosswalk',
    'Matrix showing how each generated artifact supports SOC 2 and adjacent frameworks such as NIST CSF, ISO 27001, HIPAA, PCI-DSS, and SOX / ITGC.',
    'Universal',
    array['COMMON', 'CC1', 'CC2', 'CC3', 'CC4', 'CC5', 'CC6', 'CC7', 'CC8', 'CC9', 'A1', 'C1', 'PI1', 'P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8', 'ISO27001', 'HIPAA', 'PCI', 'SOX'],
    '37-control-framework-crosswalk.md',
    $$---
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
$$,
    '{
      "organization_name": "Example Corp",
      "effective_date": "2026-05-02",
      "policy_version": "v0.1",
      "control_framework_crosswalk_rows": [
        {
          "document_name": "System Description (DC 200)",
          "soc2_coverage": "CC1, CC2, CC3, CC4, CC5, CC6, CC7, CC8, CC9",
          "nist_csf_coverage": "GV, ID, PR, DE, RS, RC",
          "iso27001_coverage": "Shared Annex A support",
          "hipaa_coverage": "Shared HIPAA safeguard support",
          "pci_coverage": "Shared PCI control support",
          "sox_coverage": "Shared ITGC support",
          "mapping_basis": "Auditor-facing narrative describing the in-scope system, system boundary, infrastructure, people, procedures, data, vendors, and control environment."
        }
      ]
    }'::jsonb,
    true
  ),
  (
    'network-and-data-flow-diagrams',
    'Network and Data Flow Diagrams',
    'Mermaid-based draft network and data-flow diagrams derived from the current wizard system boundary, infrastructure, vendor, and operational answers.',
    'Universal',
    array['COMMON', 'CC2', 'CC6', 'CC7', 'CC9', 'A1', 'C1', 'HIPAA', 'PCI'],
    '38-network-and-data-flow-diagrams.md',
    $$---
title: Network and Data Flow Diagrams
slug: network-and-data-flow-diagrams
tsc_category: Universal
criteria_mapped:
  - COMMON
  - CC2
  - CC6
  - CC7
  - CC9
  - A1
  - C1
  - HIPAA
  - PCI
generated_for: {{organization_name}}
effective_date: {{effective_date}}
version: {{policy_version}}
---

# Network and Data Flow Diagrams

## Purpose
This document provides draft Mermaid diagrams derived from the current wizard profile for {{primary_product_name}}. They are intended to accelerate architecture review, customer diligence, and assessor preparation.

## Network Topology Draft
{{network_diagram_status}}

```mermaid
{{network_topology_mermaid}}
```

### Network Diagram Assumptions
{{#each network_diagram_assumptions}}
- {{this}}
{{/each}}

## Data Flow Draft
{{data_flow_diagram_status}}

```mermaid
{{data_flow_mermaid}}
```

### Data Flow Assumptions
{{#each data_flow_diagram_assumptions}}
- {{this}}
{{/each}}

## Review Note
These diagrams are generated from questionnaire answers and should be validated against actual deployment architecture, segmentation boundaries, data stores, and approved third-party integrations before external distribution.
$$,
    '{
      "organization_name": "Example Corp",
      "primary_product_name": "Example Cloud",
      "effective_date": "2026-05-02",
      "policy_version": "v0.1",
      "network_diagram_status": "The wizard indicates a formal network diagram is still missing; this Mermaid draft is a starting point for review.",
      "data_flow_diagram_status": "The wizard indicates a formal data-flow diagram is still missing; this Mermaid draft is a starting point for review.",
      "network_topology_mermaid": "flowchart LR\n  internet[\"Internet / customer traffic\"] --> edge[\"Public application edge\"]\n  workforce[\"Workforce and administrators\"] --> idp[\"Identity provider: Okta\"]\n  idp --> app[\"In-scope system\"]\n  edge --> app\n  app --> platform[\"aws application workloads\"]\n  platform --> datastore[\"Primary application data stores\"]\n  platform --> monitor[\"Monitoring and logging\"]",
      "data_flow_mermaid": "flowchart TD\n  actors[\"Customers, workforce, and approved integrations\"] --> system[\"Example Cloud\"]\n  system --> datastore[\"Primary stores for Customer PII and Authentication secrets\"]\n  system --> logs[\"Operational logs and monitoring\"]",
      "network_diagram_assumptions": [
        "Draft generated from wizard answers; confirm exact services, segments, and trust boundaries before customer or auditor distribution.",
        "Edge protection should be reviewed to confirm whether WAF or equivalent controls are in place."
      ],
      "data_flow_diagram_assumptions": [
        "Draft generated from wizard answers; verify data classifications, flows, and system boundaries before relying on the diagram as evidence.",
        "The current flow is based on the general data types selected in the wizard profile."
      ]
    }'::jsonb,
    true
  )
on conflict (slug) do update
set
  name = excluded.name,
  description = excluded.description,
  tsc_category = excluded.tsc_category,
  criteria_mapped = excluded.criteria_mapped,
  output_filename_pattern = excluded.output_filename_pattern,
  markdown_template = excluded.markdown_template,
  default_variables = excluded.default_variables,
  is_active = excluded.is_active,
  updated_at = now();
