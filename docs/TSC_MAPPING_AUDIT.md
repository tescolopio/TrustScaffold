# AICPA TSC Mapping Audit

**Audit Date:** 2026-04-19
**Auditor:** TrustScaffold Engineering (pre-launch self-assessment)
**Standard:** AICPA Trust Services Criteria (2017)
**Status:** Pending formal CPA review

> This document provides a line-by-line mapping of every TrustScaffold Handlebars template to the AICPA Trust Services Criteria (2017). It is intended as a working artifact for a compliance expert to validate before V1.0 release.

---

## Template Coverage Matrix

| # | Template | Slug | Mapped Criteria | Status |
|---|----------|------|-----------------|--------|
| 1 | Information Security Policy | `information-security-policy` | CC1, CC2, CC5, CC6, CC7, CC8, CC9 | ✅ Covered |
| 2 | Access Control & On/Offboarding | `access-control-on-offboarding-policy` | CC6 | ✅ Covered |
| 3 | Incident Response Plan | `incident-response-plan` | CC7 | ✅ Covered |
| 4 | Change Management Policy | `change-management-policy` | CC8 | ✅ Covered |
| 5 | Risk Management Policy | `risk-management-policy` | CC3, CC9 | ✅ Covered |
| 6 | Business Continuity & DR | `business-continuity-dr-plan` | A1 | ✅ Covered (conditional) |
| 7 | Backup & Recovery Policy | `backup-recovery-policy` | A1 | ✅ Covered (conditional) |
| 8 | Data Classification & Handling | `data-classification-handling-policy` | C1 | ✅ Covered (conditional) |
| 9 | Encryption Policy | `encryption-policy` | C1 | ✅ Covered (conditional) |
| 10 | Privacy Notice & Consent | `privacy-notice-consent-policy` | P1–P8 | ✅ Covered (conditional) |
| 11 | Vendor Management Policy | `vendor-management-policy` | CC3, CC9 | ✅ Covered |
| 12 | Secure SDLC Policy | `secure-sdlc-policy` | CC8 | ✅ Covered |
| 13 | Physical Security Policy | `physical-security-policy` | CC6 | ✅ Covered |
| 14 | Acceptable Use / Code of Conduct | `acceptable-use-code-of-conduct-policy` | CC1, CC2 | ✅ Covered |
| 15 | SOC 2 Evidence Checklist | `evidence-checklist` | CC1 | ✅ Covered |
| 16 | System Description (DC 200) | `system-description` | CC1–CC9 | ✅ Covered |

---

## Criteria-to-Template Mapping (AICPA TSC 2017)

### CC1 — Control Environment (COSO Principles 1–5)

| Criterion | Requirement | Template(s) | Section(s) | Notes |
|-----------|-------------|-------------|------------|-------|
| CC1.1 | Commitment to integrity and ethical values | acceptable-use-code-of-conduct-policy | Statement, Requirements | Ethical use expectations communicated to workforce |
| CC1.2 | Board independence and oversight | information-security-policy | Roles and Responsibilities | Executive Sponsor and Security Owner roles defined |
| CC1.3 | Management structures and reporting lines | system-description | IV. People — Organizational Structure | Functional roles (Executive, Engineering, Security, HR) documented |
| CC1.4 | Attract, develop, retain competent individuals | system-description | IV. People — Personnel Controls | Background checks, security awareness training |
| CC1.5 | Accountability for internal controls | information-security-policy | Exceptions | Exception approval with expiration and compensating controls |

### CC2 — Communication and Information (COSO Principles 13–15)

| Criterion | Requirement | Template(s) | Section(s) | Notes |
|-----------|-------------|-------------|------------|-------|
| CC2.1 | Quality information for internal control | system-description | V. Procedures — Monitoring Activities | Monitoring coverage reviewed annually |
| CC2.2 | Internal communication of control information | information-security-policy | Policy Statements #2–#4 | Security events logged, changes documented, vendor evaluations communicated |
| CC2.3 | External communication | privacy-notice-consent-policy | Privacy Commitments | Privacy questions routed to contact; DSAR acknowledgement window defined |

### CC3 — Risk Assessment (COSO Principles 6–9)

| Criterion | Requirement | Template(s) | Section(s) | Notes |
|-----------|-------------|-------------|------------|-------|
| CC3.1 | Specify objectives with clarity | risk-management-policy | Objective | Protects confidentiality, integrity, availability |
| CC3.2 | Identify and analyze risks | risk-management-policy | Process #1–#2 | Risk register with owner, likelihood, impact, treatment |
| CC3.3 | Consider potential for fraud | risk-management-policy | Sources of Risk | Engineering changes, vendor changes, incidents, audit findings |
| CC3.4 | Identify changes impacting internal control | risk-management-policy | Process #3 | Periodic review cadence (configurable) |

### CC4 — Monitoring Activities (COSO Principles 16–17)

| Criterion | Requirement | Template(s) | Section(s) | Notes |
|-----------|-------------|-------------|------------|-------|
| CC4.1 | Ongoing and/or separate evaluations | system-description | V. Procedures — Monitoring Activities | "Security monitoring covers infrastructure, application, and access events" |
| CC4.2 | Evaluate and communicate deficiencies | system-description | V. Procedures — Monitoring Activities | "Alerts are routed to the appropriate team; monitoring coverage reviewed annually" |

**⚠ Reviewer Note:** CC4 is addressed in the System Description and implicitly through audit log monitoring. No standalone Monitoring Policy template exists. A CPA may require a dedicated Monitoring Activities policy or explicit monitoring procedures annex depending on the engagement.

### CC5 — Control Activities (COSO Principles 10–12)

| Criterion | Requirement | Template(s) | Section(s) | Notes |
|-----------|-------------|-------------|------------|-------|
| CC5.1 | Control activities mitigating risks | information-security-policy | Policy Statements #1, #3 | Access based on need, changes require review |
| CC5.2 | General technology controls | secure-sdlc-policy | Engineering Controls | Peer review, dependency scanning, SAST |
| CC5.3 | Policies establishing expectations | information-security-policy | Entire document | Overarching policy establishing expectations |

### CC6 — Logical and Physical Access Controls

| Criterion | Requirement | Template(s) | Section(s) | Notes |
|-----------|-------------|-------------|------------|-------|
| CC6.1 | Logical access security | access-control-on-offboarding-policy | Authentication | MFA requirement, federated identities, password managers |
| CC6.2 | Registration and authorization | access-control-on-offboarding-policy | Provisioning | Hiring managers submit requests, admin approval, no shared accounts |
| CC6.3 | Access modification and removal | access-control-on-offboarding-policy | Offboarding, Role Changes | Revocation within SLA, periodic recertification |
| CC6.4 | Physical access controls | physical-security-policy | Self-Hosted Facilities, Hybrid Environment | Badge, biometric, visitor logs, media destruction; conditional on `hosts_own_hardware` |
| CC6.5 | Logical access disposal | access-control-on-offboarding-policy | Offboarding | Token revocation, credential invalidation documented |
| CC6.6 | External access controls | information-security-policy | Environment Summary | Cloud-specific baselines, tenant-aware access controls |
| CC6.7 | Data transmission security | encryption-policy | Requirements | TLS 1.2+, provider-managed encryption |
| CC6.8 | Threat detection | information-security-policy | Policy Statement #2 | Security events logged, reviewed, escalated |

### CC7 — System Operations

| Criterion | Requirement | Template(s) | Section(s) | Notes |
|-----------|-------------|-------------|------------|-------|
| CC7.1 | Vulnerability management | secure-sdlc-policy | Validation | SAST, dependency scanning on PRs |
| CC7.2 | Security event monitoring | incident-response-plan | Cloud Context | CloudTrail, GuardDuty, Azure Activity Logs, Defender alerts |
| CC7.3 | Evaluate security events | incident-response-plan | Severity and Escalation | Triage SLA, escalation workflows |
| CC7.4 | Incident response | incident-response-plan | Response Lifecycle | Detect, contain, eradicate, review |
| CC7.5 | Incident recovery | incident-response-plan | Response Lifecycle #3–#4 | Root cause eradication, post-incident review |

### CC8 — Change Management

| Criterion | Requirement | Template(s) | Section(s) | Notes |
|-----------|-------------|-------------|------------|-------|
| CC8.1 | Change authorization | change-management-policy | Standard Changes, Emergency Changes | Peer review, rollback plan, high-risk approval; emergency retrospective review |

**Additional coverage:** secure-sdlc-policy provides engineering-specific change controls (code review, SAST, dependency scanning).

### CC9 — Risk Mitigation

| Criterion | Requirement | Template(s) | Section(s) | Notes |
|-----------|-------------|-------------|------------|-------|
| CC9.1 | Risk identification from business disruptions | business-continuity-dr-plan | Recovery Strategy | RTO/RPO, multi-region, failover |
| CC9.2 | Vendor and partner risk | vendor-management-policy | Minimum Due Diligence, Approved Vendors | Due diligence checklist, vendor table, review cadence |

### A1 — Availability (Conditional: `tscSelections.availability`)

| Criterion | Requirement | Template(s) | Section(s) | Notes |
|-----------|-------------|-------------|------------|-------|
| A1.1 | Capacity management | business-continuity-dr-plan | Critical Commitments | RTO/RPO, support hours |
| A1.2 | Environmental protections | business-continuity-dr-plan | Recovery Strategy | Multi-region, hardware failover, VPN recovery |
| A1.3 | Recovery plan testing | business-continuity-dr-plan | Testing | BCDR test frequency (configurable) |

### C1 — Confidentiality (Conditional: `tscSelections.confidentiality`)

| Criterion | Requirement | Template(s) | Section(s) | Notes |
|-----------|-------------|-------------|------------|-------|
| C1.1 | Identify confidential information | data-classification-handling-policy | Classification Levels | Dynamic from `data_classifications` array |
| C1.2 | Dispose of confidential information | data-classification-handling-policy | Handling Requirements | Customer data exports require approval |

### PI1 — Processing Integrity (Conditional: `tscSelections.processingIntegrity`)

| Criterion | Requirement | Template(s) | Section(s) | Notes |
|-----------|-------------|-------------|------------|-------|
| PI1.1–PI1.5 | Processing completeness, accuracy, inputs, outputs, storage | system-description | VII. TSC Mapping (conditional row) | Mapped to Sections III, V |

**⚠ Reviewer Note:** Processing Integrity is addressed only in the System Description's conditional TSC mapping table. No standalone Processing Integrity policy template exists. Organizations selecting PI1 should supplement with application-specific data validation and reconciliation procedures. A CPA may require additional narrative or a dedicated PI policy annex.

### P1–P8 — Privacy (Conditional: `tscSelections.privacy`)

| Criterion | Requirement | Template(s) | Section(s) | Notes |
|-----------|-------------|-------------|------------|-------|
| P1.1 | Privacy notice | privacy-notice-consent-policy | Purpose | Privacy contact, processing description |
| P2.1 | Choice and consent | privacy-notice-consent-policy | Consent | Conditional on `requires_consent` |
| P3.1–P3.2 | Collection limitation | privacy-notice-consent-policy | (implicit) | Template defers to privacy notice updates |
| P4.1–P4.3 | Use, retention, disposal | privacy-notice-consent-policy | Retention | Legal, contractual, operational requirements |
| P5.1–P5.2 | Access and correction | privacy-notice-consent-policy | Privacy Commitments | DSAR acknowledgement window |
| P6.1–P6.7 | Disclosure and notification | privacy-notice-consent-policy | (implicit) | Template references privacy commitments |
| P7.1 | Data quality | (not explicitly addressed) | — | **Gap: consider adding data quality clause** |
| P8.1 | Monitoring and enforcement | (not explicitly addressed) | — | **Gap: consider adding complaint handling clause** |

**⚠ Reviewer Note:** P7 (Data Quality) and P8 (Monitoring & Enforcement) are only implicitly covered. The privacy template should be supplemented with explicit data quality assurance and complaint-handling procedures for organizations selecting the Privacy category. Recommend adding two optional sections to the privacy template in a future iteration.

---

## Coverage Summary

| Category | Criteria Count | Templates Covering | Coverage |
|----------|---------------|-------------------|----------|
| CC1 — Control Environment | 5 | information-security-policy, acceptable-use, system-description | ✅ Full |
| CC2 — Communication | 3 | information-security-policy, privacy-notice, system-description | ✅ Full |
| CC3 — Risk Assessment | 4 | risk-management-policy, system-description | ✅ Full |
| CC4 — Monitoring Activities | 2 | system-description | ⚠ Implicit only |
| CC5 — Control Activities | 3 | information-security-policy, secure-sdlc, system-description | ✅ Full |
| CC6 — Access Controls | 8 | access-control, physical-security, information-security, encryption | ✅ Full |
| CC7 — System Operations | 5 | incident-response-plan, secure-sdlc | ✅ Full |
| CC8 — Change Management | 1 | change-management-policy, secure-sdlc | ✅ Full |
| CC9 — Risk Mitigation | 2 | vendor-management, risk-management, bcdr | ✅ Full |
| A1 — Availability | 3 | business-continuity-dr, backup-recovery | ✅ Full |
| C1 — Confidentiality | 2 | data-classification, encryption | ✅ Full |
| PI1 — Processing Integrity | 5 | system-description (conditional) | ⚠ Minimal |
| P1–P8 — Privacy | 14 | privacy-notice-consent | ⚠ P7, P8 implicit |

### Open Items for CPA Review

1. **CC4 (Monitoring Activities):** No standalone monitoring policy. System Description addresses it in Section V. Determine if a dedicated template is required.
2. **PI1 (Processing Integrity):** Only referenced in System Description TSC mapping table. Organizations selecting PI1 may need a standalone Processing Integrity annex.
3. **P7 (Data Quality):** Not explicitly addressed in the privacy template. Consider adding a "Data Quality Assurance" section.
4. **P8 (Monitoring & Enforcement):** Not explicitly addressed. Consider adding a "Complaint Handling & Enforcement" section.
5. **Template language quality:** All templates include the `> This document is a starting-point compliance template and must be reviewed` disclaimer. A CPA should validate that the default language meets board-grade expectations for each engagement type.

---

## Handlebars Variable Validation

All 16 templates were validated against the `buildTemplatePayload()` function in `lib/wizard/template-payload.ts`. The following variables are confirmed to be populated:

| Variable | Source | Used By |
|----------|--------|---------|
| `organization_name` | `company.name` | All templates |
| `primary_product_name` | `scope.systemName` | 6 templates |
| `effective_date` | `Date.now()` | All templates |
| `policy_version` | Fixed `v0.1-draft` | All templates |
| `approver_name` | `company.primaryContactName` | 8 templates |
| `executive_sponsor_name` | `company.primaryContactName` | 2 templates |
| `system_owner_name` | `company.primaryContactName` | 1 template |
| `security_contact_email` | `company.primaryContactEmail` | 3 templates |
| `privacy_contact_email` | `company.primaryContactEmail` | 1 template |
| `deployment_model` | Derived from `isMultiTenant` | 4 templates |
| `idp_provider` | `infrastructure.idpProvider` | 3 templates |
| `cloud_providers` | `infrastructure.cloudProviders` | 1 template |
| `uses_aws` / `uses_azure` / `uses_gcp` | Derived booleans | 10 templates |
| `uses_hybrid` / `is_self_hosted` | Derived booleans | 5 templates |
| `hosts_own_hardware` | `infrastructure.hostsOwnHardware` | 1 template |
| `is_multi_tenant` | `scope.isMultiTenant` | 2 templates |
| `requires_mfa` | `operations.requiresMfa` | 3 templates |
| `requires_peer_review` | `operations.requiresPeerReview` | 3 templates |
| `requires_cyber_insurance` | `operations.requiresCyberInsurance` | 1 template |
| `has_subprocessors` | Derived from subservices length | 5 templates |
| `subprocessors[]` | `subservices` mapped to flat objects | 4 templates |
| `data_classifications[]` | `dataTypesHandled` mapped | 2 templates |
| `termination_sla_hours` | `operations.terminationSlaHours` | 2 templates |
| `onboarding_sla_days` | `operations.onboardingSlaDays` | 2 templates |
| `vcs_provider` | `operations.vcsProvider` | 3 templates |
| `hris_provider` | `operations.hrisProvider` | 2 templates |
| `ticketing_system` | `operations.ticketingSystem` | 2 templates |
| `on_call_tool` | `operations.onCallTool` | 2 templates |
| `system_description` | `scope.systemDescription` | 1 template |
| `scope_includes_*` | TSC selection booleans | 1 template |

All variables resolve without `undefined` when the wizard is completed with valid data.
