# Network and Data Flow Diagrams

> Baseline reviewer copy. Handlebars placeholders such as `{{organization_name}}` are intentionally preserved so this can be reviewed before organization-specific answers are inserted.

<!-- Mapping: A1.1, A1.2, A1.3, C1.1, C1.2, CC2.1, CC2.2, CC2.3, CC6.1, CC6.2, CC6.3, CC6.4, CC6.5, CC6.6, CC6.7, CC6.8, CC7.1, CC7.2, CC7.3, CC7.4, CC7.5, CC9.1, CC9.2, COMMON, HIPAA, PCI -->

| Field | Value |
| --- | --- |
| Template slug | `network-and-data-flow-diagrams` |
| TSC category | Universal |
| Criteria mapped | COMMON, CC2, CC6, CC7, CC9, A1, C1, HIPAA, PCI |
| Purpose | Mermaid-based draft network and data-flow diagrams derived from the current wizard system boundary, infrastructure, vendor, and operational answers. |
| Output filename | `38-network-and-data-flow-diagrams.md` |

---

---
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
