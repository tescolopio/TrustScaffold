# Document Generation Requirements

This document defines when the TrustScaffold wizard must generate each baseline document.

The implementation has two layers:

1. The human-readable generation contract in this document.
2. The typed rule source in [lib/wizard/document-generation-rules.ts](../lib/wizard/document-generation-rules.ts), which feeds the wizard expected-document preview.

The compile action still performs the final database selection by computing selected criteria from wizard answers and selecting active templates whose `criteria_mapped` overlap those criteria.

## Generation Model

Security is mandatory for SOC 2 readiness in TrustScaffold. The wizard schema requires `tscSelections.security` to be `true`, so Security documents are generated for every successful compile.

Optional Trust Services Criteria add documents when selected:

| Wizard Answer | Criteria Added | Document Effect |
| --- | --- | --- |
| `tscSelections.security === true` | `CC1` through `CC9` | Generate all Security baseline documents. This is always true. |
| `tscSelections.availability === true` | `A1` | Add Availability documents. |
| `tscSelections.confidentiality === true` | `C1` | Add Confidentiality documents. |
| `tscSelections.processingIntegrity === true` | `PI1` | Add Processing Integrity documents. |
| `tscSelections.privacy === true` | `P1` through `P8` | Add Privacy documents. |
| `scope.containsPhi === true` | `HIPAA` | Add HIPAA high-water-mark documents. |
| `scope.hasCardholderDataEnvironment === true` | `PCI` | Add PCI-DSS high-water-mark documents. |
| `company.soxApplicability !== 'none'` | `SOX` | Add SOX / ITGC readiness documents. |
| `company.hasPublicWebsite === true` and (`company.websiteTargetsEuOrUkResidents === true` or `company.websiteUsesCookiesAnalytics === true`) | `GDPR` | Add GDPR/privacy high-water-mark coverage and DPIA support. |
| `company.hasPublicWebsite === true` and (`company.websiteTargetsCaliforniaResidents === true` or `company.websiteSellsOrSharesPersonalInformation === true`) | `CCPA` | Add CCPA/CPRA obligations to the legal registry. |
| Security baseline | `COMMON` | Add universal common-control foundation documents. |
| `governance.iso27001.targeted === true` | `ISO27001` | Add ISO 27001 readiness documents. |

Other wizard answers generally tailor document content rather than determine whether a document is generated. For example, cloud provider, IdP, VCS provider, subservice organizations, peer review, MFA, and internal audit answers change language, sections, warnings, and evidence requests inside generated documents.

## Compile Preconditions

The compile action must not generate documents unless the wizard payload passes schema validation and these fields are present:

| Required Field | Reason |
| --- | --- |
| `company.name` | Used in all generated documents and filenames. |
| `scope.systemName` | Required for system boundary and product references. |
| `scope.systemDescription` | Required for the System Description and audit-readiness narrative. |
| Active dashboard organization | Required to assign generated documents to the current workspace. |
| User role is `admin` or `editor` | Required to create or update generated drafts. |

## Document Rules

| Document | Slug | Generated When | Wizard Answer Trigger | Criteria |
| --- | --- | --- | --- | --- |
| System Description (DC 200) | `system-description` | Always, after compile preconditions pass. | `tscSelections.security` is always true. | `CC1`, `CC2`, `CC3`, `CC4`, `CC5`, `CC6`, `CC7`, `CC8`, `CC9` |
| Information Security Policy | `information-security-policy` | Always. | `tscSelections.security` is always true. | `CC1`, `CC2`, `CC5`, `CC6`, `CC7`, `CC8`, `CC9` |
| Access Control and On/Offboarding Policy | `access-control-on-offboarding-policy` | Always. | `tscSelections.security` is always true. | `CC6` |
| Incident Response Plan | `incident-response-plan` | Always. | `tscSelections.security` is always true. | `CC7` |
| Change Management Policy | `change-management-policy` | Always. | `tscSelections.security` is always true. | `CC8` |
| Risk Management Policy | `risk-management-policy` | Always. | `tscSelections.security` is always true. | `CC3`, `CC9` |
| Business Continuity and Disaster Recovery Policy | `business-continuity-dr-plan` | When Availability is selected. | `tscSelections.availability === true` | `A1` |
| Backup and Recovery Policy | `backup-recovery-policy` | When Availability is selected. | `tscSelections.availability === true` | `A1` |
| Data Classification and Handling Policy | `data-classification-handling-policy` | When Confidentiality is selected. | `tscSelections.confidentiality === true` | `C1` |
| Encryption Policy | `encryption-policy` | When Confidentiality is selected. | `tscSelections.confidentiality === true` | `C1` |
| Privacy Notice and Consent Framework | `privacy-notice-consent-policy` | When Privacy is selected. | `tscSelections.privacy === true` | `P1`, `P2`, `P3`, `P4`, `P5`, `P6`, `P7`, `P8` |
| Vendor Management Policy | `vendor-management-policy` | Always, even when no subservice organizations are listed. | `tscSelections.security` is always true. | `CC3`, `CC9` |
| Secure Software Development Life Cycle Policy | `secure-sdlc-policy` | Always. | `tscSelections.security` is always true. | `CC8` |
| Physical Security Policy | `physical-security-policy` | Always. | `tscSelections.security` is always true. | `CC6` |
| Acceptable Use and Code of Conduct Policy | `acceptable-use-code-of-conduct-policy` | Always. | `tscSelections.security` is always true. | `CC1`, `CC2` |
| SOC 2 Evidence Checklist | `evidence-checklist` | Always. Optional TSC answers add conditional evidence sections inside the document. | `tscSelections.security` is always true. | `CC1`, `CC2`, `CC3`, `CC4`, `CC5`, `CC6`, `CC7`, `CC8`, `CC9` |
| Internal Audit and Monitoring Policy | `internal-audit-monitoring-policy` | Always. | `tscSelections.security` is always true. | `CC2`, `CC4` |
| Data Retention and Disposal Policy | `data-retention-disposal-policy` | Always. Privacy and Confidentiality answers tailor content, but do not solely control generation. | `tscSelections.security` is always true. | `CC6`, `CC9` |
| Processing Integrity Policy | `processing-integrity-policy` | When Processing Integrity is selected. | `tscSelections.processingIntegrity === true` | `PI1` |
| Business Associate Agreement Template | `business-associate-agreement-template` | When PHI is in scope. | `scope.containsPhi === true` | `HIPAA` |
| PHI Data Flow and Inventory Map | `phi-data-flow-inventory-map` | When PHI is in scope. | `scope.containsPhi === true` | `HIPAA` |
| Tokenization and Cardholder Data Policy | `tokenization-cardholder-data-policy` | When a CDE is in scope. | `scope.hasCardholderDataEnvironment === true` | `PCI` |
| Quarterly Vulnerability Scanning SOP | `quarterly-vulnerability-scanning-sop` | When a CDE is in scope. | `scope.hasCardholderDataEnvironment === true` | `PCI` |
| ISO 27001 Statement of Applicability | `iso27001-statement-of-applicability` | When ISO 27001 targeting is enabled. | `governance.iso27001.targeted === true` | `ISO27001` |
| Legal and Regulatory Registry | `legal-regulatory-registry` | When ISO 27001 targeting is enabled. Website, PHI, CDE, GDPR, CCPA, and SOX answers tailor rows. | `governance.iso27001.targeted === true`; SOX row renders only when `company.soxApplicability !== 'none'`. | `ISO27001`, `GDPR`, `CCPA`, `HIPAA`, `PCI`, `SOX` |
| Data Protection Impact Assessment | `data-protection-impact-assessment` | When Privacy is selected or website answers indicate GDPR/UK GDPR exposure. | `tscSelections.privacy === true`, or `company.hasPublicWebsite === true` with `company.websiteTargetsEuOrUkResidents === true` or `company.websiteUsesCookiesAnalytics === true` | `GDPR`, `P1`-`P8` |
| Asset Management and Cryptographic Inventory | `asset-management-cryptographic-inventory` | Always, as a universal common-control foundation. | `tscSelections.security` is always true. | `COMMON`, `CC6`, `CC7`, `C1`, `ISO27001`, `PCI`, `SOX` |
| SOX IT General Controls Matrix | `sox-itgc-control-matrix` | When SOX / ITGC applicability is selected. | `company.soxApplicability !== 'none'` | `COMMON`, `SOX` |
| SOX Access and Change Evidence Request List | `sox-evidence-request-list` | When SOX / ITGC applicability is selected. | `company.soxApplicability !== 'none'` | `COMMON`, `SOX` |
| SOX Key Report Inventory | `sox-key-report-inventory` | When SOX / ITGC applicability is selected. | `company.soxApplicability !== 'none'` | `COMMON`, `SOX` |
| SOX Interface Control Register | `sox-interface-control-register` | When SOX / ITGC applicability is selected. | `company.soxApplicability !== 'none'` | `COMMON`, `SOX` |
| Complementary User Entity Controls Matrix | `complementary-user-entity-controls-matrix` | Always. Availability, Processing Integrity, and vendor answers tailor the rows. | `tscSelections.security` is always true. | `COMMON`, `CC6`, `CC7`, `CC9` |
| Complementary Subservice Organization Controls Register | `complementary-subservice-organization-controls-register` | Always. Subservice answers populate vendor-specific rows; otherwise the document states no material subservices are currently listed. | `tscSelections.security` is always true. | `COMMON`, `CC3`, `CC6`, `CC9`, `ISO27001` |
| Management Assertion Letter | `management-assertion-letter` | Always. Optional TSC selections and active decision-trace items tailor scope and focus areas. | `tscSelections.security` is always true. | `COMMON`, `CC1`, `CC2`, `CC3`, `CC4` |
| Points of Focus Gap Analysis | `points-of-focus-gap-analysis` | Always. Rows are driven by the active wizard decision trace and expanded into an assessor-style matrix with mapped criterion theme, evidence expectations, and target-state guidance. | `tscSelections.security` is always true. | `COMMON`, `CC1`, `CC2`, `CC3`, `CC4`, `CC6`, `CC7`, `CC8`, `CC9` |
| Bridge Letter / Comfort Letter | `bridge-letter-comfort-letter` | Always. Uses the generated document set plus a customer-facing subset of prioritized gap-analysis rows, filtered to the active framework scope and auto-selecting one primary audience view such as privacy-sensitive, healthcare, or payments customers when applicable. | `tscSelections.security` is always true. | `COMMON`, `CC2`, `CC3`, `CC4` |
| NIST CSF Profile | `nist-csf-profile` | Always. Translates existing wizard answers, selected criteria, and active readiness signals into the NIST CSF Govern, Identify, Protect, Detect, Respond, and Recover functions. | `tscSelections.security` is always true. | `COMMON`, `CC1`, `CC3`, `CC6`, `CC7`, `CC8`, `CC9`, `A1`, `C1`, `PI1`, `ISO27001`, `HIPAA`, `PCI` |
| Control-to-Framework Crosswalk | `control-framework-crosswalk` | Always. Uses the selected document rules and active framework profile to show which generated artifacts are direct versus shared-control support for adjacent frameworks. | `tscSelections.security` is always true. | `COMMON`, `CC1`, `CC2`, `CC3`, `CC4`, `CC5`, `CC6`, `CC7`, `CC8`, `CC9`, `A1`, `C1`, `PI1`, `P1`-`P8`, `ISO27001`, `HIPAA`, `PCI`, `SOX` |
| Network and Data Flow Diagrams | `network-and-data-flow-diagrams` | Always. Produces Mermaid draft diagrams from the current system boundary, infrastructure, vendor, and operational answers, with caveats based on whether the wizard says formal diagrams already exist. | `tscSelections.security` is always true; `securityAssessment.documentReview.hasNetworkDiagrams` and `hasDataFlowDiagrams` tailor status messaging only. | `COMMON`, `CC2`, `CC6`, `CC7`, `CC9`, `A1`, `C1`, `HIPAA`, `PCI` |

## Recommendation-Only Triggers

Some answers should warn, recommend, or tailor content, but should not silently change the generated document set unless the user selects the corresponding TSC.

| Answer Pattern | Wizard Behavior | Generation Behavior |
| --- | --- | --- |
| `scope.dataTypesHandled` includes `Customer PII` and Privacy is not selected | Warn or recommend Privacy. | Do not generate the Privacy Notice unless `tscSelections.privacy` is true; website GDPR/CCPA answers may still update legal-registry/DPIA outputs. |
| `scope.containsPhi === true` and Privacy is not selected | Warn that PHI often requires privacy-oriented handling. | Generate HIPAA high-water-mark documents; do not generate the Privacy Notice unless `tscSelections.privacy` is true. |
| `scope.hasCardholderDataEnvironment === true` and Confidentiality is not selected | Warn that CDE scope may require confidentiality-oriented controls and PCI segmentation language. | Generate PCI high-water-mark documents; do not generate Confidentiality documents unless `tscSelections.confidentiality` is true. |
| Website exists and collects personal data, uses cookies/analytics, targets EU/UK residents, targets California residents, sells/shares personal information, or allows children under 13 | Ask website privacy and regulatory applicability questions. | Generate legal-registry coverage; generate DPIA when GDPR/UK GDPR or Privacy triggers are present. |
| `subservices.length === 0` | Warn or request confirmation that no material vendors are in scope. | Still generate Vendor Management Policy and Evidence Checklist. |
| `infrastructure.hostsOwnHardware === true` | Show self-hosted/hybrid physical security guidance. | Still generate Physical Security Policy either way; content changes. |
| `company.soxApplicability !== 'none'` | Ask whether SOX / ITGC readiness applies and surface readiness context on the dashboard and review step. | Generate SOX / ITGC templates only when this explicit company-level answer is selected. |
| `securityAssessment.documentReview.hasNetworkDiagrams === false` or `hasDataFlowDiagrams === false` | Warn that architecture evidence is incomplete. | Still generate the draft Network and Data Flow Diagrams document so the team has a structured starting point. |
| `operations.requiresPeerReview === false` | Warn about change-management segregation-of-duties risk. | Still generate Change Management Policy; content includes compensating-control language. |
| `governance.hasInternalAuditProgram === false` | Ask for the current monitoring approach and show readiness guidance. | Still generate Internal Audit and Monitoring Policy; content describes the needed cadence. |

## Source Of Truth Responsibilities

| Surface | Responsibility |
| --- | --- |
| [lib/wizard/document-generation-rules.ts](../lib/wizard/document-generation-rules.ts) | Typed rule inventory used by wizard preview and docs. |
| [lib/wizard/schema.ts](../lib/wizard/schema.ts) | Computes selected criteria with `selectedCriteriaCodes(data)`. |
| [app/actions/compile-docs.ts](../app/actions/compile-docs.ts) | Selects active templates where `criteria_mapped` overlaps selected criteria and renders drafts. |
| `public.templates.criteria_mapped` | Database-level mapping that determines final compile inclusion. |
| [lib/wizard/template-manifest.ts](../lib/wizard/template-manifest.ts) | UI-facing expected-template preview derived from typed generation rules. |

## Change Control Requirements

When adding, removing, or changing a generated document:

1. Update the database seed template and any migration needed for existing databases.
2. Update [lib/wizard/document-generation-rules.ts](../lib/wizard/document-generation-rules.ts).
3. Confirm [lib/wizard/template-manifest.ts](../lib/wizard/template-manifest.ts) still derives the expected preview from the rules.
4. Update this document.
5. Run `npx tsx scripts/test-templates.ts`.
6. Run `npx tsx scripts/export-reviewer-pack.ts`.
7. Run `npm run typecheck`.
