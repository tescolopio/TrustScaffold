-- TrustScaffold initial template seed data
-- Naming conventions for Handlebars variables:
-- - Use snake_case for top-level values: organization_name, effective_date, system_owner_name.
-- - Use has_/uses_/is_ prefixes for booleans: has_subprocessors, uses_aws, is_multi_tenant.
-- - Use plural names for arrays: subprocessors, repositories, office_locations.
-- - Nested objects mirror wizard sections: cloud.aws, cloud.azure, operations, security_contacts.
-- - Keep optional values nullable and guard them with #if blocks.

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
    'information-security-policy',
    'Information Security Policy',
    'Core governance policy covering organization-wide security expectations.',
    'Security',
    array['CC1', 'CC2', 'CC5', 'CC6', 'CC7', 'CC8', 'CC9'],
    '01-information-security-policy.md',
    $$---
title: Information Security Policy
slug: information-security-policy
tsc_category: Security
criteria_mapped:
      "iso27001_targeted": true,
      "iso27001_program_status": "Targeted for ISO 27001 certification",
      "iso27001_scope_statement": "The Example Corp production platform, its supporting engineering and security processes, and the cloud infrastructure used to deliver the service.",
      "iso27001_certification_body": "Not yet selected",
      "iso27001_exclusion_rationale": "No Annex A exclusions have been formally approved yet.",
  - CC1
      "iso_annex_domain_rows": [
        {
          "domain": "Organizational controls",
          "applicability": "Applicable",
          "rationale": "Governance, risk, supplier, incident, and legal controls are required for the ISMS regardless of certification timing.",
          "support": "Information Security Policy; Risk Management Policy; Vendor Management Policy; Legal and Regulatory Registry",
          "owner": "Example Owner",
          "status": "In active certification scope"
        }
      ],
      "iso_derived_control_rows": [
        {
          "control": "A.8.24 Use of cryptography",
          "applicability": "Applicable",
          "rationale": "Sensitive or regulated data types in scope require encryption and key-management controls.",
          "support": "Encryption Policy; Cryptographic Inventory",
          "owner": "Example Owner",
          "status": "Seeded from wizard answers"
        }
      ],
  - CC2
  - CC5
  - CC6
  - CC7
  - CC8
  - CC9
generated_for: {{organization_name}}
effective_date: {{effective_date}}
version: {{policy_version}}
---

> This document is a starting-point compliance template and must be reviewed by {{approver_name}} before adoption.

# Information Security Policy

## Purpose
{{organization_name}} maintains an information security program designed to protect customer and company data used by {{primary_product_name}}.

## Scope
This policy applies to all workforce members, contractors, and systems that support {{primary_product_name}}.

## Security Objectives
- Protect the confidentiality, integrity, and availability of systems within the documented scope.
- Maintain least-privilege access to production systems and supporting tooling.
- Record and review security-relevant changes and incidents.

## Environment Summary
{{organization_name}} operates as a {{deployment_model}} service.
{{#if uses_aws}}
- AWS services are used for core infrastructure and must follow approved account and IAM baselines.
{{/if}}
{{#if uses_azure}}
- Azure services are used for identity and platform controls and must follow approved tenant and subscription baselines.
{{/if}}
{{#if uses_gcp}}
- GCP services are used for supporting workloads and must inherit approved project-level guardrails.
{{/if}}
{{#if is_multi_tenant}}
- Production workloads are multi-tenant and require tenant-aware logical access controls.
{{/if}}

## Roles and Responsibilities
- Executive Sponsor: {{executive_sponsor_name}}
- Security Owner: {{system_owner_name}}
- Primary Contact: {{security_contact_email}}

## Policy Statements
1. Access to systems and data is granted based on documented business need.
2. Security events are logged, reviewed, and escalated according to the incident response plan.
3. Changes to production systems require documented review and approval.
4. Vendors handling sensitive data are evaluated before onboarding and periodically thereafter.

## Exceptions
Exceptions require written approval from {{approver_name}} and must include an expiration date and compensating controls.
$$,
    '{
      "organization_name": "Example Corp",
      "primary_product_name": "TrustScaffold Cloud",
      "effective_date": "2026-04-18",
      "policy_version": "v0.1",
      "approver_name": "Chief Executive Officer",
      "executive_sponsor_name": "Chief Executive Officer",
      "system_owner_name": "Head of Security",
      "security_contact_email": "security@example.com",
      "deployment_model": "multi-tenant SaaS",
      "uses_aws": true,
      "uses_azure": false,
      "uses_gcp": false,
      "is_multi_tenant": true
    }'::jsonb,
    true
  ),
  (
    'access-control-on-offboarding-policy',
    'Access Control and On/Offboarding Policy',
    'User provisioning, privilege management, and access revocation requirements.',
    'Security',
    array['CC6'],
    '02-access-control-on-offboarding-policy.md',
    $$---
title: Access Control and On/Offboarding Policy
slug: access-control-on-offboarding-policy
tsc_category: Security
criteria_mapped:
  - CC6
generated_for: {{organization_name}}
effective_date: {{effective_date}}
version: {{policy_version}}
---

> This document is a starting-point compliance template and must be reviewed before use.

# Access Control and On/Offboarding Policy

## Objective
{{organization_name}} grants access according to least privilege and removes access promptly when employment or engagement changes.

## Provisioning
- Hiring managers submit access requests with role, systems, and justification.
- Access to production systems requires approval from {{approver_name}} or a delegated admin.
- Shared accounts are prohibited unless explicitly approved and logged.

## Authentication
- MFA is required for administrative access.
- Passwords must be stored only in approved password managers.
{{#if uses_azure}}
- Workforce identities are managed through Microsoft Entra ID conditional access policies.
{{/if}}
{{#if uses_aws}}
- Console access in AWS requires federated or SSO-backed identities wherever feasible.
{{/if}}
{{#if uses_gcp}}
- Console access in GCP requires federated or SSO-backed identities, least-privilege IAM roles, and monitored privileged access.
{{/if}}

## Role Changes and Reviews
- Access is reviewed every {{access_review_frequency}}.
- Privileged roles are re-certified by the system owner.

## Offboarding
- Access revocation begins within {{offboarding_sla_hours}} hours of termination notice.
- Device return, token revocation, and credential invalidation are documented.

## Standard Operating Procedure: Access Requests and Revocation
1. The requester opens an access ticket in {{ticketing_system}} with the user, role, system, business justification, and requested access duration.
2. The approving manager or system owner validates the access need and records approval before provisioning.
3. The control operator provisions only the approved role or group and attaches provisioning evidence to the ticket.
4. Access changes, privileged grants, and emergency access are reviewed during the next access review cycle.
5. Offboarding tickets document account disablement, session/token revocation, device return, and evidence retained by the control operator.

## Evidence
{{organization_name}} retains approval and revocation records in its ticketing and identity systems.
$$,
    '{
      "organization_name": "Example Corp",
      "effective_date": "2026-04-18",
      "policy_version": "v0.1",
      "approver_name": "Head of Security",
      "ticketing_system": "Jira",
      "access_review_frequency": "quarter",
      "offboarding_sla_hours": 4,
      "uses_aws": true,
      "uses_azure": true
    }'::jsonb,
    true
  ),
  (
    'incident-response-plan',
    'Incident Response Plan',
    'Preparation, detection, containment, and notification requirements for security incidents.',
    'Security',
    array['CC7'],
    '03-incident-response-plan.md',
    $$---
title: Incident Response Plan
slug: incident-response-plan
tsc_category: Security
criteria_mapped:
  - CC7
generated_for: {{organization_name}}
effective_date: {{effective_date}}
version: {{policy_version}}
---

# Incident Response Plan

## Purpose
{{organization_name}} responds to suspected or confirmed security incidents using documented roles, escalation paths, and recovery procedures.

## Incident Team
- Incident Commander: {{incident_commander_name}}
- Communications Lead: {{communications_lead_name}}
- Executive Sponsor: {{executive_sponsor_name}}

## Severity and Escalation
- Triage begins within {{triage_sla_minutes}} minutes of detection.
- Customer-impacting incidents trigger executive escalation and communication workflows.
{{#if has_customer_notification_commitment}}
- External notifications are issued within {{customer_notification_window}} when contractual or regulatory obligations apply.
{{/if}}

## Response Lifecycle
1. Detect and validate the event.
2. Contain the threat and preserve evidence.
3. Eradicate the root cause and restore service.
4. Conduct a post-incident review and assign corrective actions.

## Standard Operating Procedure: Incident Execution
1. The on-call responder opens or updates an incident ticket in {{ticketing_system}} and records detection source, affected systems, initial severity, and timeline start.
2. The Incident Commander assigns investigation, containment, communications, and evidence-preservation owners.
3. Responders preserve relevant logs, alerts, screenshots, forensic artifacts, and customer-impact analysis before destructive remediation where feasible.
4. The Communications Lead documents internal and external notification decisions, including rationale when notification is not required.
5. The post-incident review records root cause, corrective actions, owners, due dates, and evidence of completion.

## Logging and Evidence
Security-relevant events from infrastructure, identity, and application layers are retained according to the log retention schedule.

## Cloud Context
{{#if uses_aws}}
- AWS CloudTrail, GuardDuty, and service-native logs are reviewed during incident investigation.
{{/if}}
{{#if uses_azure}}
- Azure Activity Logs, Entra ID logs, and Defender alerts are reviewed during incident investigation.
{{/if}}
{{#if uses_gcp}}
- GCP Cloud Audit Logs, Security Command Center findings, and project-level IAM changes are reviewed during incident investigation.
{{/if}}
{{#if uses_hybrid}}
- Hybrid and on-premise investigations include VPN, bastion, physical-access, and endpoint telemetry where those systems may affect incident scope.
{{/if}}
$$,
    '{
      "organization_name": "Example Corp",
      "effective_date": "2026-04-18",
      "policy_version": "v0.1",
      "incident_commander_name": "Head of Security",
      "communications_lead_name": "Operations Lead",
      "executive_sponsor_name": "Chief Executive Officer",
      "ticketing_system": "Jira",
      "triage_sla_minutes": 30,
      "has_customer_notification_commitment": true,
      "customer_notification_window": "72 hours",
      "uses_aws": true,
      "uses_azure": false
    }'::jsonb,
    true
  ),
  (
    'change-management-policy',
    'Change Management Policy',
    'Requirements for planning, reviewing, approving, and validating changes.',
    'Security',
    array['CC8'],
    '04-change-management-policy.md',
    $$---
title: Change Management Policy
slug: change-management-policy
tsc_category: Security
criteria_mapped:
  - CC8
generated_for: {{organization_name}}
effective_date: {{effective_date}}
version: {{policy_version}}
---

# Change Management Policy

## Purpose
Changes to systems supporting {{primary_product_name}} must be documented, reviewed, approved, and validated before release unless emergency procedures apply.

## Standard Changes
- Every change includes a summary, affected services, rollback plan, and testing evidence.
- Peer review is required before deployment to production.
- High-risk changes require approval from {{approver_name}}.

## Segregation of Duties in Deployments
- Production deployments require {{approval_count}} peer approval before merge or release, recorded in {{ticketing_system}} or {{source_control_tool}}.
- Technical guardrails in {{source_control_tool}} enforce branch protection, required reviews, status checks, restricted merges, and administrative override logging for production branches.
- Self-approval is prohibited: the same individual may not author, approve, and deploy a production change without documented compensating management review.
- Emergency changes that bypass a normal guardrail must receive independent retrospective review within {{post_incident_review_window}}.

## Emergency Changes
Emergency changes may bypass normal approval only to restore availability or reduce active risk, and must be retrospectively reviewed within {{post_incident_review_window}}.

## Standard Operating Procedure: Production Change Workflow
1. The change owner opens a ticket in {{ticketing_system}} with scope, risk, affected services, validation plan, rollback plan, and requested release window.
2. The author submits the change through {{source_control_tool}} and links the pull request, merge request, or release record to the change ticket.
3. Required reviewers validate design, testing, security impact, and rollback readiness before approval.
4. Technical guardrails prevent merge or deployment until required reviews and status checks pass.
5. The control operator attaches deployment evidence, validation results, and rollback outcome to the change record after release.

## Infrastructure-Specific Requirements
{{#if uses_aws}}
- Infrastructure changes in AWS are performed through reviewed infrastructure-as-code repositories.
{{/if}}
{{#if uses_azure}}
- Platform and identity changes in Azure are tracked through pull requests and activity logs.
{{/if}}
{{#if uses_gcp}}
- Platform, IAM, and organization-policy changes in GCP are tracked through reviewed infrastructure-as-code or approved administrative change records.
{{/if}}
{{#if uses_hybrid}}
- Hybrid and on-premise changes include validation of cloud connectivity, segmentation, physical dependency impact, and rollback steps.
{{/if}}

## Evidence
Deployment history, code review records, and validation results are retained for audit support.
$$,
    '{
      "organization_name": "Example Corp",
      "primary_product_name": "TrustScaffold Cloud",
      "effective_date": "2026-04-18",
      "policy_version": "v0.1",
      "approver_name": "Head of Engineering",
      "approval_count": "at least one",
      "ticketing_system": "Jira",
      "source_control_tool": "GitHub",
      "post_incident_review_window": "1 business day",
      "uses_aws": true,
      "uses_azure": true
    }'::jsonb,
    true
  ),
  (
    'risk-management-policy',
    'Risk Management Policy',
    'Risk identification, scoring, treatment, and review expectations.',
    'Security',
    array['CC3', 'CC9'],
    '05-risk-management-policy.md',
    $$---
title: Risk Management Policy
slug: risk-management-policy
tsc_category: Security
criteria_mapped:
  - CC3
  - CC9
generated_for: {{organization_name}}
effective_date: {{effective_date}}
version: {{policy_version}}
---

# Risk Management Policy

## Objective
{{organization_name}} identifies, evaluates, and treats risks that could affect the confidentiality, integrity, and availability of systems and data.

## Process
1. Risks are logged in the risk register.
2. Each risk is assigned an owner, likelihood, impact, and treatment plan.
3. Open risks are reviewed every {{risk_review_frequency}}.

## Sources of Risk
- Product and engineering changes
- Vendor and subprocessor changes
- Security incidents and audit findings
- Regulatory or contractual obligations

{{#if has_subprocessors}}
## Current Critical Subprocessors
{{#each subprocessors}}
- {{name}}: {{service_description}}
{{/each}}
{{/if}}

## Approval
The risk register is reviewed by {{approver_name}} and executive leadership.
$$,
    '{
      "organization_name": "Example Corp",
      "effective_date": "2026-04-18",
      "policy_version": "v0.1",
      "risk_review_frequency": "quarter",
      "approver_name": "Chief Executive Officer",
      "has_subprocessors": true,
      "subprocessors": [
        {
          "name": "Supabase",
          "service_description": "Managed Postgres and authentication"
        },
        {
          "name": "Vercel",
          "service_description": "Application hosting and edge delivery"
        }
      ]
    }'::jsonb,
    true
  ),
  (
    'business-continuity-dr-plan',
    'Business Continuity and Disaster Recovery Plan',
    'Recovery strategy, roles, and resilience commitments for critical services.',
    'Availability',
    array['A1'],
    '06-business-continuity-dr-plan.md',
    $$---
title: Business Continuity and Disaster Recovery Plan
slug: business-continuity-dr-plan
tsc_category: Availability
criteria_mapped:
  - A1
generated_for: {{organization_name}}
effective_date: {{effective_date}}
version: {{policy_version}}
---

# Business Continuity and Disaster Recovery Plan

## Objective
{{organization_name}} maintains continuity and recovery plans for services that support {{primary_product_name}}.

## Critical Commitments
- Recovery Time Objective: {{recovery_time_objective}}
- Recovery Point Objective: {{recovery_point_objective}}
- Critical Support Hours: {{critical_support_hours}}

## Capacity and Dependency Monitoring
- Capacity, saturation, and service-health signals are monitored through {{monitoring_tool}} or equivalent operational tooling.
- Capacity thresholds are reviewed during continuity planning and after material infrastructure changes.
- Critical dependencies, including cloud providers, identity services, payment providers, and hybrid connectivity, are mapped to recovery owners and escalation paths.

## Recovery Strategy
{{#if uses_multi_region}}
- Critical infrastructure is deployed across multiple regions or failover zones.
{{/if}}
{{#if uses_backups}}
- Backups are performed and restoration tests are completed on a scheduled basis.
{{/if}}
{{#if uses_hybrid}}
- Recovery runbooks cover both cloud zone failover and restoration of dependent on-premise systems.
{{/if}}
{{#if has_hardware_failover}}
- Physical hardware failover steps, spare capacity expectations, and replacement part ownership are documented.
{{/if}}
{{#if uses_cloud_vpn}}
- Recovery validation includes VPN or private network path checks for administrative access into the recovered environment.
{{/if}}

## Roles
- Recovery Lead: {{recovery_lead_name}}
- Communications Lead: {{communications_lead_name}}

## Testing
Continuity and recovery procedures are tested {{bcdr_test_frequency}}.
Each test records the scenario exercised, actual recovery time, data-loss result against the RPO, failed steps, remediation owner, and retest evidence.
$$,
    '{
      "organization_name": "Example Corp",
      "primary_product_name": "TrustScaffold Cloud",
      "effective_date": "2026-04-18",
      "policy_version": "v0.1",
      "recovery_time_objective": "8 hours",
      "recovery_point_objective": "4 hours",
      "critical_support_hours": "24x7 for severity 1 incidents",
      "recovery_lead_name": "Platform Lead",
      "communications_lead_name": "Operations Lead",
      "bcdr_test_frequency": "annually",
      "uses_multi_region": false,
      "uses_backups": true
    }'::jsonb,
    true
  ),
  (
    'backup-recovery-policy',
    'Backup and Recovery Policy',
    'Backup scheduling, protection, retention, and restoration validation.',
    'Availability',
    array['A1'],
    '07-backup-recovery-policy.md',
    $$---
title: Backup and Recovery Policy
slug: backup-recovery-policy
tsc_category: Availability
criteria_mapped:
  - A1
generated_for: {{organization_name}}
effective_date: {{effective_date}}
version: {{policy_version}}
---

# Backup and Recovery Policy

## Purpose
{{organization_name}} performs backups for critical systems and validates that backup data can be restored within business requirements.

## Backup Scope
- Databases supporting {{primary_product_name}}
- Configuration repositories and infrastructure definitions
- Critical operational records and policy artifacts

## Requirements
- Backup frequency: {{backup_frequency}}
- Retention period: {{backup_retention_period}}
- Restore test cadence: {{restore_test_frequency}}
{{#if backup_encryption_enabled}}
- Backups are encrypted at rest and in transit.
{{/if}}

## Verification
Restore tests are documented and reviewed by {{approver_name}}.
$$,
    '{
      "organization_name": "Example Corp",
      "primary_product_name": "TrustScaffold Cloud",
      "effective_date": "2026-04-18",
      "policy_version": "v0.1",
      "backup_frequency": "daily",
      "backup_retention_period": "35 days",
      "restore_test_frequency": "quarterly",
      "backup_encryption_enabled": true,
      "approver_name": "Platform Lead"
    }'::jsonb,
    true
  ),
  (
    'data-classification-handling-policy',
    'Data Classification and Handling Policy',
    'Classification levels and handling requirements for company and customer data.',
    'Confidentiality',
    array['C1'],
    '08-data-classification-handling-policy.md',
    $$---
title: Data Classification and Handling Policy
slug: data-classification-handling-policy
tsc_category: Confidentiality
criteria_mapped:
  - C1
generated_for: {{organization_name}}
effective_date: {{effective_date}}
version: {{policy_version}}
---

# Data Classification and Handling Policy

## Classification Levels
{{#each data_classifications}}
- {{name}}: {{description}}
{{/each}}

## Handling Requirements
- Data is shared only with approved personnel and vendors.
- Sensitive data is stored only in approved systems.
- Customer data exports require documented approval.

## Scope Notes
{{#if stores_customer_pii}}
{{organization_name}} stores customer personal information and applies heightened access and retention controls.
{{/if}}
{{#if stores_phi}}
{{organization_name}} handles protected health information (PHI) and applies regulated healthcare safeguards, minimum-necessary access controls, and enhanced incident-handling requirements.
{{/if}}
{{#if has_cardholder_data_environment}}
{{organization_name}} operates an in-scope cardholder data environment (CDE) and restricts cardholder-data access, transmission, and storage to approved systems within that boundary.
{{/if}}
{{#if has_subprocessors}}
Approved subprocessors handling sensitive data are listed in the vendor register.
{{/if}}
$$,
    '{
      "organization_name": "Example Corp",
      "effective_date": "2026-04-18",
      "policy_version": "v0.1",
      "stores_customer_pii": true,
      "has_subprocessors": true,
      "data_classifications": [
        { "name": "Public", "description": "Approved for open publication" },
        { "name": "Internal", "description": "Internal business data not intended for public release" },
        { "name": "Confidential", "description": "Sensitive company or customer information requiring restricted access" }
      ]
    }'::jsonb,
    true
  ),
  (
    'encryption-policy',
    'Encryption Policy',
    'Encryption requirements for data in transit, at rest, and key management.',
    'Confidentiality',
    array['C1'],
    '09-encryption-policy.md',
    $$---
title: Encryption Policy
slug: encryption-policy
tsc_category: Confidentiality
criteria_mapped:
  - C1
generated_for: {{organization_name}}
effective_date: {{effective_date}}
version: {{policy_version}}
---

# Encryption Policy

## Objective
{{organization_name}} protects sensitive data through approved encryption controls and key management processes.

## Requirements
- Data in transit uses TLS {{minimum_tls_version}} or stronger.
- Data at rest uses provider-managed or customer-managed encryption for critical systems.
- Secrets are stored in approved secret-management tooling.

{{#if uses_aws}}
## AWS Controls
- KMS-managed encryption is enabled for supported storage and database services.
{{/if}}
{{#if uses_azure}}
## Azure Controls
- Key Vault or equivalent managed key services are used for secrets and key material.
{{/if}}
{{#if uses_gcp}}
## GCP Controls
- Cloud KMS or equivalent managed key services are used for secrets and key material in GCP workloads.
- GCP audit logs and key-access events are routed to centralized monitoring for review.
{{/if}}
{{#if uses_hybrid}}
## Hybrid and On-Premises Controls
- On-premise secrets, certificates, and encryption keys are inventoried, access-controlled, rotated, and monitored with the same risk-based expectations as cloud key material.
{{/if}}

## Exceptions
Exceptions require approval from {{approver_name}} and a documented compensating control.
$$,
    '{
      "organization_name": "Example Corp",
      "effective_date": "2026-04-18",
      "policy_version": "v0.1",
      "minimum_tls_version": "1.2",
      "approver_name": "Head of Security",
      "uses_aws": true,
      "uses_azure": true
    }'::jsonb,
    true
  ),
  (
    'privacy-notice-consent-policy',
    'Privacy Notice and Consent Policy',
    'Privacy posture, consent handling, and data subject request commitments.',
    'Privacy',
    array['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8'],
    '10-privacy-notice-consent-policy.md',
    $$---
title: Privacy Notice and Consent Policy
slug: privacy-notice-consent-policy
tsc_category: Privacy
criteria_mapped:
  - P1
  - P2
  - P3
  - P4
  - P5
  - P6
  - P7
  - P8
generated_for: {{organization_name}}
effective_date: {{effective_date}}
version: {{policy_version}}
---

# Privacy Notice and Consent Policy

## Purpose
{{organization_name}} communicates how personal information is collected, used, retained, and disclosed in connection with {{primary_product_name}}.

## Privacy Commitments
- Privacy questions are routed to {{privacy_contact_email}}.
- Data subject requests are acknowledged within {{dsar_acknowledgement_window}}.
- Privacy notices are updated when material processing changes occur.

{{#if requires_consent}}
## Consent
Explicit consent is obtained before processing categories of personal data that require opt-in consent.
{{/if}}

## Retention
Personal data is retained according to documented legal, contractual, and operational requirements.

## Data Quality and Correction
- Personal information used for customer-facing processing is maintained with accuracy, completeness, and timeliness controls appropriate to its purpose.
- Data subject access, correction, deletion, and restriction requests are tracked through {{ticketing_system}} or an equivalent workflow until closure.
- Corrections to personal information are reviewed for downstream system and subprocessor impact before closure.

## Complaint Handling and Enforcement
- Privacy complaints, suspected privacy policy violations, and inquiries about privacy commitments are logged, assigned an owner, investigated, and resolved with documented outcomes.
- Material privacy issues are escalated to security, legal, and executive stakeholders as appropriate.
- Repeated or significant privacy control deficiencies are tracked through the risk register or internal audit remediation process.

{{#if stores_phi}}
## Healthcare-Regulated Information
Where {{primary_product_name}} handles protected health information, privacy and security obligations for regulated healthcare data are incorporated into notice, access, retention, and incident-response procedures.

## HIPAA Administrative Safeguards
- Workforce members with access to PHI are granted access based on role and business need.
- Access changes and terminations are coordinated through {{hris_provider}} and identity controls administered through {{idp_provider}}.
- Security awareness training and sanctions processes apply to personnel handling regulated healthcare information.
- Security incidents involving PHI are escalated through {{ticketing_system}} and {{on_call_tool}} for investigation, containment, and documentation.
- Vendors with PHI access are reviewed through the vendor-management process and must satisfy contractual and assurance expectations before use.
{{/if}}
$$,
    '{
      "organization_name": "Example Corp",
      "primary_product_name": "TrustScaffold Cloud",
      "effective_date": "2026-04-18",
      "policy_version": "v0.1",
      "privacy_contact_email": "privacy@example.com",
      "dsar_acknowledgement_window": "5 business days",
      "requires_consent": true
    }'::jsonb,
    true
  ),
  (
    'processing-integrity-policy',
    'Processing Integrity Policy',
    'Processing completeness, accuracy, authorization, exception handling, and reconciliation expectations.',
    'Processing Integrity',
    array['PI1'],
    '18-processing-integrity-policy.md',
    $$---
title: Processing Integrity Policy
slug: processing-integrity-policy
tsc_category: Processing Integrity
criteria_mapped:
  - PI1
generated_for: {{organization_name}}
effective_date: {{effective_date}}
version: {{policy_version}}
---

# Processing Integrity Policy

## Purpose
{{organization_name}} maintains processing controls so {{primary_product_name}} transactions, workflows, reports, and customer-facing outputs are complete, valid, accurate, timely, and authorized.

## Scope
This policy applies to production processing for {{primary_product_name}}, including customer data ingestion, identity and access workflows, payment metadata workflows, regulated analytics, support workflows, integrations, scheduled jobs, and administrative processing.

## Processing Objectives
- Processing requirements are defined before material workflows are released or changed.
- Inputs are validated for required fields, format, source authorization, duplicate detection, and business-rule conformance.
- Processing jobs and service workflows record success, failure, retry, and exception states in approved logs or queues.
- Outputs, reports, notifications, and exports are reviewed or tested to confirm completeness and accuracy before release or delivery.
- Processing data is retained, protected, and disposed of according to the Data Retention and Disposal Policy.

## Input and Authorization Controls
- Production processing accepts inputs only from approved users, services, integrations, or subservice organizations.
- Administrative overrides, manual corrections, and privileged processing actions require documented business justification and approval.
- Changes to validation rules, transformation logic, reconciliation jobs, and output generation follow the Change Management Policy.

## Reconciliation and Exception Handling
- High-risk workflows are reconciled against source records, downstream outputs, or control totals at a cadence appropriate to the workflow criticality.
- Processing exceptions are captured in {{ticketing_system}}, assigned an owner, prioritized by customer and compliance impact, and resolved within {{processing_exception_sla}} or documented with an approved exception.
- Failed or partially completed jobs are reviewed to determine customer impact, data correction needs, and notification obligations.

## Procedural Annex: Data Validation and Error Handling
- Procedures for {{primary_product_name}} data validation document the workflow owner, approved input sources, required fields, authorization checks, validation logic, and expected outputs for each material processing workflow.
- Data integrity checks include {{data_integrity_checks}}.
- Validation logic includes {{validation_logic}} and is tested before release through the Change Management Policy.
- Exception queues, failed jobs, reconciliation differences, and manual corrections are reviewed by {{processing_integrity_owner}} or a delegate and linked to tickets in {{ticketing_system}}.
- Corrections preserve the original record, correction rationale, approver, timestamp, and evidence of downstream output review when customer-facing data or reports are affected.

## Monitoring and Evidence
- Processing integrity monitoring is reviewed {{processing_integrity_review_frequency}} by {{processing_integrity_owner}} or a delegate.
- Evidence includes job run logs, validation test results, reconciliation records, exception tickets, correction approvals, and output-review artifacts.
- Material processing defects are evaluated through incident response, risk management, and customer communication procedures when applicable.

## PCI, PHI, and Privacy-Sensitive Processing
{{#if has_cardholder_data_environment}}
- Payment and cardholder-data workflows are designed to keep raw cardholder data within the approved CDE boundary and rely on tokenized or masked values outside that boundary.
{{/if}}
{{#if stores_phi}}
- PHI processing workflows apply minimum-necessary access, audit logging, and correction controls consistent with healthcare-regulated data obligations.
{{/if}}
{{#if scope_includes_privacy}}
- Privacy-impacting processing changes are reviewed for notice, consent, retention, data quality, and data-subject-request implications.
{{/if}}

## Review
This policy is reviewed at least annually and after material changes to processing logic, integrations, payment workflows, regulated analytics, or customer-facing reports.
$$,
    '{
      "organization_name": "Example Corp",
      "primary_product_name": "TrustScaffold Cloud",
      "effective_date": "2026-04-18",
      "policy_version": "v0.1",
      "ticketing_system": "Jira",
      "processing_exception_sla": "2 business days",
      "processing_integrity_review_frequency": "quarterly",
      "processing_integrity_owner": "Head of Operations",
      "data_integrity_checks": "input validation tests, control-total reconciliations, duplicate checks, failed-job review, output sampling, and correction approval records",
      "validation_logic": "required-field checks, source authorization checks, duplicate detection, format validation, reconciliation rules, and exception queue review",
      "has_cardholder_data_environment": false,
      "stores_phi": false,
      "scope_includes_privacy": false
    }'::jsonb,
    true
  ),
  (
    'vendor-management-policy',
    'Vendor Management Policy',
    'Due diligence, monitoring, and approval expectations for vendors and subprocessors.',
    'Security',
    array['CC3', 'CC9'],
    '11-vendor-management-policy.md',
    $$---
title: Vendor Management Policy
slug: vendor-management-policy
tsc_category: Security
criteria_mapped:
  - CC3
  - CC9
generated_for: {{organization_name}}
effective_date: {{effective_date}}
version: {{policy_version}}
---

# Vendor Management Policy

## Purpose
{{organization_name}} evaluates vendors before onboarding and monitors ongoing vendor risk based on the services provided.

## Minimum Due Diligence
- Security review aligned to data sensitivity and system criticality
- Contract review for confidentiality and privacy obligations
- Documentation of service owner and business justification

{{#if has_subprocessors}}
## Approved Vendors
| Vendor | Role | Service Description | Data Shared | Assurance | Inclusion | Review Cadence |
| --- | --- | --- | --- | --- | --- | --- |
{{#each subprocessors}}
| {{name}} | {{role}} | {{service_description}} | {{data_shared}} | {{#if has_assurance_report}}{{assurance_report_type}}{{else}}None documented{{/if}} | {{#if has_assurance_report}}{{control_inclusion}}{{else}}N/A{{/if}} | {{review_cadence}} |
{{/each}}
{{/if}}

## Complementary Controls
{{#if has_subprocessors}}
{{#each subprocessors}}
{{#if has_assurance_report}}
{{#if (eq control_inclusion 'carve-out')}}
- {{@root.organization_name}} maintains complementary subservice organization controls for {{name}}, including access restrictions, data-transfer controls, monitoring of vendor-relevant events, and review of applicable SOC report user-control considerations.
{{else}}
- {{name}} controls are evaluated through the inclusive assurance report and mapped to {{@root.organization_name}}'s control responsibilities.
{{/if}}
{{else}}
- {{@root.organization_name}} documents compensating due-diligence procedures for {{name}} until an assurance report is available.
{{/if}}
{{/each}}
{{/if}}

## Review Cadence
Critical vendors are reviewed {{vendor_review_frequency}}.
$$,
    '{
      "organization_name": "Example Corp",
      "effective_date": "2026-04-18",
      "policy_version": "v0.1",
      "vendor_review_frequency": "annually",
      "has_subprocessors": true,
      "subprocessors": [
        {
          "name": "Supabase",
          "service_description": "Managed database and authentication"
        }
      ]
    }'::jsonb,
    true
  ),
  (
    'secure-sdlc-policy',
    'Secure Software Development Life Cycle Policy',
    'Engineering controls for secure design, code review, and vulnerability response.',
    'Security',
    array['CC8'],
    '12-secure-sdlc-policy.md',
    $$---
title: Secure SDLC Policy
slug: secure-sdlc-policy
tsc_category: Security
criteria_mapped:
  - CC8
generated_for: {{organization_name}}
effective_date: {{effective_date}}
version: {{policy_version}}
---

# Secure Software Development Life Cycle Policy

## Objective
{{organization_name}} integrates security controls into design, development, testing, and release workflows.

## Secure Design
{{#if has_threat_modeling}}
- Threat modeling is performed using the {{threat_modeling_approach}} approach on a {{threat_modeling_cadence}} cadence for new features, architectural changes, or other material delivery risk.
{{else}}
- Formal threat modeling is not yet consistently performed; engineering leadership uses code review, vulnerability triage, and release review to identify design and implementation risk.
{{/if}}
{{#if has_security_champion_program}}
- A designated security champion or equivalent engineering security owner supports secure design and remediation decisions.
{{/if}}

## Engineering Controls
- Code changes follow documented review expectations before production release.
- Dependencies are reviewed and patched based on severity and exploitability.
- Security issues are tracked through remediation to closure.

## Validation
{{#if has_sast}}
- Static analysis is executed using {{sast_tool}} on pull requests or pre-release builds.
{{/if}}
{{#if has_secrets_scanning}}
- Secrets scanning is executed using {{secrets_scanning_tool}} to detect committed credentials and tokens.
{{/if}}
{{#if has_dependency_scanning}}
- Dependency scanning is executed using {{dependency_scanning_tool}} to identify known vulnerabilities and supply-chain risk.
{{/if}}
{{#if has_dast}}
- Dynamic application security testing is performed against running application surfaces or pre-production environments.
{{/if}}
{{#if has_production_change_reviews}}
- Production-affecting changes require release approval and rollback planning.
{{/if}}

## Remediation Expectations
- Critical security findings are remediated within {{remediation_sla_critical_days}} days.
- High-severity security findings are remediated within {{remediation_sla_high_days}} days.
- Findings remain tracked until remediation, exception approval, or documented risk acceptance is completed.

## External Reporting
{{#if has_vulnerability_disclosure}}
- {{organization_name}} accepts externally reported vulnerabilities through {{vulnerability_disclosure_channel}} and routes validated reports into the remediation workflow.
{{else}}
- {{organization_name}} does not maintain a public vulnerability disclosure program today; security issues are primarily identified through internal review, testing, and vendor or customer escalation.
{{/if}}
$$,
    '{
      "organization_name": "Example Corp",
      "effective_date": "2026-04-18",
      "policy_version": "v0.1",
      "has_sast": true,
      "sast_tool": "CodeQL",
      "has_secrets_scanning": true,
      "secrets_scanning_tool": "GitHub Secret Scanning",
      "has_dependency_scanning": true,
      "dependency_scanning_tool": "Dependabot",
      "has_threat_modeling": true,
      "threat_modeling_approach": "STRIDE",
      "threat_modeling_cadence": "per feature or major design change",
      "has_security_champion_program": true,
      "remediation_sla_critical_days": 7,
      "remediation_sla_high_days": 30,
      "has_vulnerability_disclosure": true,
      "vulnerability_disclosure_channel": "security@example.com",
      "has_dast": true,
      "has_production_change_reviews": true
    }'::jsonb,
    true
  ),
  (
    'physical-security-policy',
    'Physical Security Policy',
    'Physical access expectations for offices, devices, and on-premise assets.',
    'Security',
    array['CC6'],
    '13-physical-security-policy.md',
    $$---
title: Physical Security Policy
slug: physical-security-policy
tsc_category: Security
criteria_mapped:
  - CC6
generated_for: {{organization_name}}
effective_date: {{effective_date}}
version: {{policy_version}}
---

# Physical Security Policy

## Purpose
{{organization_name}} protects offices, devices, and physical assets from unauthorized access and damage.

## Requirements
- Company-issued devices must use screen locks and full-disk encryption.
- Visitors to controlled spaces must be escorted.
- Disposal of media and equipment follows documented sanitization procedures.

{{#if is_self_hosted}}
## Self-Hosted Facilities
{{#if has_physical_server_room}}
- Server rooms, cages, or colocation racks are access-controlled and logged.
{{/if}}
{{#if requires_biometric_rack_access}}
- Biometric or equivalent high-assurance access controls protect physical racks and cages.
{{/if}}
{{#if tracks_media_destruction}}
- Media destruction certificates or destruction logs are retained for retired drives and removable media.
{{/if}}
{{/if}}

{{#if uses_hybrid}}
## Hybrid Environment Requirements
- Physical site controls for on-premise assets are reviewed together with cloud identity and network controls.
{{#if uses_cloud_vpn}}
- VPN and bastion access logs bridging cloud and on-premise environments are retained and reviewed.
{{/if}}
{{/if}}

{{#if has_office_locations}}
## Office Locations
{{#each office_locations}}
- {{city}}, {{country}}: {{security_notes}}
{{/each}}
{{else}}
{{organization_name}} primarily operates remotely and relies on device-level controls and approved coworking practices.
{{/if}}
$$,
    '{
      "organization_name": "Example Corp",
      "effective_date": "2026-04-18",
      "policy_version": "v0.1",
      "has_office_locations": false,
      "office_locations": []
    }'::jsonb,
    true
  ),
  (
    'acceptable-use-code-of-conduct-policy',
    'Acceptable Use and Code of Conduct Policy',
    'Workforce expectations for lawful, ethical, and secure use of company systems.',
    'Security',
    array['CC1', 'CC2'],
    '14-acceptable-use-code-of-conduct-policy.md',
    $$---
title: Acceptable Use and Code of Conduct Policy
slug: acceptable-use-code-of-conduct-policy
tsc_category: Security
criteria_mapped:
  - CC1
  - CC2
generated_for: {{organization_name}}
effective_date: {{effective_date}}
version: {{policy_version}}
---

# Acceptable Use and Code of Conduct Policy

## Statement
{{organization_name}} expects workforce members to use company systems responsibly, lawfully, ethically, and in a manner consistent with company values and security obligations.

## Scope
This policy applies to {{acceptable_use_scope}}. It covers all company systems, including {{primary_product_name}}, {{idp_provider}}, company-issued devices, source code repositories, collaboration tools, ticketing systems, and approved storage locations used to process or access company or customer data.

## Acceptable Use
- Company systems are provided for authorized business purposes{{#if permits_limited_personal_use}}, with limited incidental personal use permitted only when it does not interfere with work, violate law or policy, or create security, confidentiality, or availability risk{{/if}}.
- Workforce members must protect credentials, MFA factors, access tokens, and company-issued devices from unauthorized use.
- Workforce members must use company systems in a professional manner and may not harass, threaten, discriminate, or misuse company communication channels.
{{#if requires_approved_software}}
- Only approved software, services, repositories, and storage locations may be used to create, process, transmit, or store company or customer data.
{{/if}}
{{#if restricts_company_data_to_approved_systems}}
- Company and customer data must remain in approved systems and may not be copied into personal accounts, unmanaged devices, or unapproved artificial intelligence, file-sharing, messaging, or storage services.
{{/if}}

## Prohibited Use
Workforce members may not use company systems to:

- Perform unlawful activity, harassment, discrimination, retaliation, or other conduct inconsistent with the code of conduct.
- Attempt to bypass access controls, logging, security monitoring, endpoint protection, or other security safeguards.
- Share accounts, passwords, MFA factors, API keys, session tokens, or privileged access with another person.
- Access, disclose, modify, download, or transmit company, customer, employee, or vendor data without authorization and business need.
- Install unauthorized software, connect unmanaged devices, or introduce malware, unauthorized scanning tools, or unapproved automation into company environments.

## Device and Data Handling
- Company-issued devices must be protected with screen locks, encryption where supported, and current security updates.
{{#if has_mdm}}
- Company-managed devices are enrolled in {{mdm_tool}} or an equivalent management process for baseline configuration, remote lock, and remote wipe support.
{{else}}
- {{organization_name}} shall establish a device-management process for enforcing baseline device controls as the program matures.
{{/if}}
{{#if has_endpoint_protection}}
- Endpoint protection is provided through {{endpoint_protection_tool}} or an equivalent protective control.
{{else}}
- {{organization_name}} shall establish endpoint protection for company-managed devices as the program matures.
{{/if}}
{{#if requires_lost_device_reporting}}
- Lost, stolen, or suspected-compromised devices must be reported to {{security_report_channel}} within {{lost_device_report_sla_hours}} hours so access can be reviewed and remote lock, wipe, or containment actions can be initiated.
{{/if}}

## Security Reporting
Workforce members must promptly report suspected phishing, credential exposure, policy violations, unauthorized access, lost devices, suspicious activity, or other security concerns to {{security_report_channel}}.

## Monitoring and Enforcement
{{#if monitors_company_systems}}
Company systems, networks, devices, repositories, and logs may be monitored for security, compliance, operational, and incident-response purposes, subject to applicable law.
{{else}}
{{organization_name}} reviews security-relevant activity as needed for incident response, investigation, and compliance purposes, subject to applicable law.
{{/if}}
{{#if has_disciplinary_procedures}}
Violations of this policy may result in disciplinary action up to and including access removal, termination, contract termination, and legal action.
{{else}}
{{organization_name}} shall define disciplinary procedures for policy violations and document how violations are reviewed and remediated.
{{/if}}

## Acknowledgement
{{#if (eq acknowledgement_cadence 'not-yet')}}
{{organization_name}} shall establish an onboarding and periodic acknowledgement process for this policy.
{{else}}
All personnel acknowledge these expectations during onboarding and during {{acknowledgement_cadence}} policy review cycles.
{{/if}}
$$,
    '{
      "organization_name": "Example Corp",
      "effective_date": "2026-04-18",
      "policy_version": "v0.1",
      "primary_product_name": "Example Cloud",
      "idp_provider": "Okta",
      "acceptable_use_scope": "employees, contractors, consultants, temporary workers, and any other workforce members with access to company systems",
      "permits_limited_personal_use": false,
      "requires_approved_software": true,
      "restricts_company_data_to_approved_systems": true,
      "has_mdm": true,
      "mdm_tool": "Jamf",
      "has_endpoint_protection": true,
      "endpoint_protection_tool": "Microsoft Defender for Endpoint",
      "requires_lost_device_reporting": true,
      "lost_device_report_sla_hours": 24,
      "security_report_channel": "security@example.com",
      "monitors_company_systems": true,
      "has_disciplinary_procedures": true,
      "acknowledgement_cadence": "hire-and-annual"
    }'::jsonb,
    true
  ),
  (
    'evidence-checklist',
    'SOC 2 Evidence Checklist',
    'Operational evidence inventory generated from the same wizard inputs as the policy set.',
    'Security',
    array['CC1', 'CC2', 'CC3', 'CC4', 'CC5', 'CC6', 'CC7', 'CC8', 'CC9'],
    '15-soc2-evidence-checklist.md',
    $$---
title: SOC 2 Evidence Checklist
slug: evidence-checklist
tsc_category: Security
criteria_mapped:
  - CC1
  - CC2
  - CC3
  - CC4
  - CC5
  - CC6
  - CC7
  - CC8
  - CC9
generated_for: {{organization_name}}
effective_date: {{effective_date}}
version: {{policy_version}}
---

# SOC 2 Evidence Checklist

This checklist is generated from the exact infrastructure and operating assumptions captured in the TrustScaffold wizard for {{organization_name}}.

## Evidence Retention Expectations

| Evidence Area | Minimum Retention Period | Verification Notes |
| --- | --- | --- |
| Security logs and monitoring records | {{log_retention_days}} days | Confirm SIEM, cloud logging, and alerting retention settings match the policy. |
| Backup and restore evidence | {{backup_retention_period}} | Confirm backup retention and restore-test artifacts are retained for the stated period. |
| Access reviews and access tickets | At least annually, or longer if required by the audit period | Confirm sampled access evidence covers the audit period under review. |
| Change-management records | At least annually, or longer if required by the audit period | Confirm change tickets retain approvals, peer reviews, deployment records, and rollback evidence. |
| Vendor assurance review records | At least annually | Confirm current SOC reports, review notes, and follow-up tickets are retained. |
| Incident response records | At least annually, or longer for material incidents | Confirm incident timelines, decisions, notifications, and post-incident actions are retained. |

## Governance & Control Environment Evidence (CC1.1–CC1.5)

### Integrity and Ethical Values (CC1.1)
{{#if has_employee_handbook}}
- [ ] Employee handbook (current version with revision date).
{{else}}
- [ ] **GAP**: Document rationale for not maintaining an employee handbook.
{{/if}}
{{#if has_code_of_conduct}}
- [ ] Code of conduct document (current version).
{{#if (eq acknowledgement_cadence 'not-yet')}}
- [ ] Signed acknowledgement forms once the formal acknowledgement cadence is established.
{{else}}
- [ ] Signed acknowledgement forms (new-hire acknowledgements and {{acknowledgement_cadence}} renewals).
{{/if}}
{{else}}
- [ ] **GAP**: Document rationale for not maintaining a separate code of conduct.
{{/if}}
{{#if has_disciplinary_procedures}}
- [ ] Disciplinary procedures document showing consequences for policy violations.
{{/if}}
- [ ] Background check completion evidence for sampled new hires (redacted as appropriate).

### Board Independence and Oversight (CC1.2)
{{#if has_board_or_advisory}}
- [ ] Board or advisory charter defining oversight responsibilities.
- [ ] Board meeting minutes showing security/risk is a standing agenda item ({{board_meeting_frequency}} cadence).
- [ ] Evidence that risk assessment results are presented to the board.
{{else}}
- [ ] **GAP**: Document the governance oversight structure in absence of a formal board (e.g., executive committee meeting notes).
{{/if}}

### Organizational Structure (CC1.3)
{{#if has_org_chart}}
- [ ] Current organizational chart (maintained via {{org_chart_maintenance}}).
{{else}}
- [ ] **GAP**: Produce and maintain an organizational chart.
{{/if}}
{{#if has_job_descriptions}}
- [ ] Job descriptions with defined roles and responsibilities for security-relevant positions.
{{else}}
- [ ] **GAP**: Create job descriptions for key roles (at minimum: security officer, engineering lead, HR lead).
{{/if}}
{{#if has_dedicated_security_officer}}
- [ ] Evidence of designated {{security_officer_title}} role with documented responsibilities.
{{/if}}

### Training and Competence (CC1.4)
{{#if security_awareness_training_tool}}
{{#if (eq training_cadence 'not-yet')}}
- [ ] Security awareness training implementation plan for {{security_awareness_training_tool}}, including the target completion cadence.
{{else}}
- [ ] Training completion records from {{security_awareness_training_tool}} for all employees ({{training_cadence}} cadence).
{{/if}}
- [ ] New-hire training completion evidence showing training was completed before system access was granted.
{{else}}
- [ ] **GAP**: Implement and track security awareness training program.
{{/if}}
{{#if has_phishing_simulation}}
- [ ] Phishing simulation campaign results ({{phishing_simulation_frequency}} cadence) including failure rates and remediation completion.
{{else}}
- [ ] **GAP**: Consider implementing phishing simulation campaigns to demonstrate ongoing awareness.
{{/if}}
{{#if has_security_bulletin_subscription}}
- [ ] Evidence of security bulletin subscription and response process (e.g., vendor advisories, CVE notifications).
{{/if}}

### Accountability (CC1.5)
{{#if has_performance_reviews_linked_to_controls}}
- [ ] Performance review template showing internal control responsibilities are evaluated.
- [ ] Sample completed performance review (redacted) demonstrating accountability for security duties.
{{else}}
- [ ] **GAP**: Update performance review process to include accountability for internal control responsibilities.
{{/if}}

## Information and Communication Evidence (CC2.1–CC2.3)

### Internal Communication (CC2.1–CC2.2)
- [ ] Policy publication evidence showing policies are accessible to employees via {{policy_publication_method}}.
{{#if has_internal_audit_program}}
- [ ] Internal audit reports or controls monitoring results ({{internal_audit_frequency}} cadence).
- [ ] Evidence that deficiencies identified in monitoring are tracked to remediation.
{{else}}
- [ ] **GAP**: Establish an internal controls monitoring program.
{{/if}}

### External Communication (CC2.3)
{{#if has_customer_contracts}}
- [ ] Sample customer contract / MSA / ToS showing security commitments and obligations.
{{else}}
- [ ] **GAP**: Formalize customer-facing security commitments in contracts or terms of service.
{{/if}}
{{#if has_customer_support_channel}}
- [ ] Customer support channel documentation showing how customers can report security concerns.
{{else}}
- [ ] **GAP**: Document the customer support channel for security-related inquiries.
{{/if}}
{{#if has_release_note_practice}}
- [ ] Sample release notes or change notifications sent to customers.
{{/if}}

## Risk Assessment Evidence (CC3.1–CC3.4)

### Risk Register and Assessment (CC3.1–CC3.2)
{{#if has_risk_register}}
- [ ] Risk register with identified risks, owners, likelihood/impact scores, and treatment plans.
- [ ] Evidence the risk register was reviewed within the audit period.
{{else}}
- [ ] **GAP**: Create and maintain a formal risk register.
{{/if}}

### Fraud Risk (CC3.3)
{{#if includes_fraud_risk_in_assessment}}
- [ ] Evidence that fraud risk scenarios (management override, unauthorized data manipulation) are included in the risk assessment.
{{else}}
- [ ] **GAP**: Add fraud risk consideration (intentional manipulation, override of controls) to risk assessment methodology.
{{/if}}

## Monitoring Activities Evidence (CC4.1–CC4.2)
{{#if has_internal_audit_program}}
- [ ] Internal audit schedule showing planned and completed reviews ({{internal_audit_frequency}}).
- [ ] Internal audit report with findings, recommendations, and management responses.
- [ ] Remediation tracking evidence showing deficiencies were addressed.
{{else}}
- [ ] **GAP**: Implement a formal internal audit or controls monitoring program to satisfy CC4.1–CC4.2.
{{/if}}

## Identity and Access Evidence (CC5, CC6.1–CC6.5)
- [ ] Directory export from {{idp_provider}} showing active workforce accounts.
{{#if requires_mfa}}
- [ ] Screenshot of MFA enforcement policy in {{idp_provider}}.
{{else}}
- [ ] Documented exception showing why MFA is not enforced and what compensating controls exist.
{{/if}}
- [ ] Quarterly access review artifact.
- [ ] Offboarding evidence showing access revoked within {{termination_sla_hours}} hours.
- [ ] Onboarding evidence showing access provisioned within {{onboarding_sla_days}} business days.
- [ ] Sample access-request ticket (e.g., Jira, ServiceNow) showing approval chain for a privileged role grant.
- [ ] Sample access-removal ticket showing revocation was initiated by HR or the manager, not the departing user.

## Security Tooling Evidence (CC6.6, CC6.8, CC7.1)

### Threat Detection (CC6.6)
{{#if has_siem}}
- [ ] SIEM dashboard or log export from {{siem_tool}} showing security event correlation.
- [ ] Alert configuration evidence showing monitoring rules for suspicious activity.
- [ ] Log retention configuration showing {{log_retention_days}}-day retention.
{{else}}
- [ ] **GAP**: Implement centralized security monitoring (SIEM) or document compensating detective controls.
{{/if}}
{{#if has_ids_ips}}
- [ ] IDS/IPS configuration evidence showing active monitoring rules.
- [ ] Sample IDS/IPS alert or blocked-event evidence.
{{/if}}
{{#if has_waf}}
- [ ] WAF configuration evidence showing protection rules for public-facing applications.
- [ ] Sample WAF log showing blocked requests.
{{/if}}

### Malware Prevention (CC6.8)
{{#if has_endpoint_protection}}
- [ ] Endpoint protection deployment evidence from {{endpoint_protection_tool}} showing coverage across fleet.
- [ ] Endpoint protection configuration showing real-time scanning and auto-update are enabled.
{{else}}
- [ ] **GAP**: Deploy endpoint protection on company-managed devices.
{{/if}}
{{#if has_mdm}}
- [ ] MDM enrollment evidence from {{mdm_tool}} showing device compliance status.
- [ ] MDM policy configuration (disk encryption, screen lock, OS updates).
{{else}}
- [ ] **GAP**: Consider implementing MDM to enforce device security baselines on company devices.
{{/if}}

### Vulnerability Management (CC7.1)
{{#if has_vulnerability_scanning}}
- [ ] Vulnerability scan report from {{vulnerability_scanning_tool}} (most recent).
- [ ] Evidence showing critical/high vulnerabilities were remediated within SLA.
{{else}}
- [ ] **GAP**: Implement vulnerability scanning for infrastructure and application components.
{{/if}}
{{#if has_penetration_testing}}
- [ ] Penetration test report from the {{penetration_test_frequency}} testing cycle, provided by a qualified third party.
- [ ] Remediation evidence for findings identified in the pen test.
{{else}}
- [ ] **GAP**: Conduct penetration testing (recommended annually at minimum) and document risk acceptance if deferred.
{{/if}}
{{#if has_dast}}
- [ ] DAST scan report for public-facing application(s).
{{/if}}

## Engineering Change Management Evidence (CC8.1)
{{#if (eq vcs_provider 'GitHub')}}
- [ ] Screenshot of GitHub Branch Protection Rules for the default branch.
- [ ] Screenshot of GitHub repository admin and write access configuration.
{{else}}
  {{#if (eq vcs_provider 'Azure DevOps')}}
- [ ] Screenshot of Azure DevOps branch policies for the default branch.
- [ ] Screenshot of Azure DevOps repository permission assignments.
  {{else}}
- [ ] Screenshot of branch protection or merge policy configuration in {{vcs_provider}}.
- [ ] Screenshot of repository permissions in {{vcs_provider}}.
  {{/if}}
{{/if}}
{{#if requires_peer_review}}
- [ ] Pull request sample showing peer review before merge.
{{else}}
- [ ] Approved exception for changes merged without peer review.
{{/if}}
- [ ] Change ticket linked to a production deployment.
- [ ] Emergency change record showing post-hoc review was completed (CC8.1).
- [ ] Evidence that deployment rollback was tested or exercised at least once in the audit period.

## Workforce Operations Evidence
- [ ] Current employee roster from {{hris_provider}}.
- [ ] New-hire record mapped to onboarding tasks.
- [ ] Termination record mapped to access revocation tasks.
- [ ] Sample onboarding checklist showing security-awareness training was completed before system access was granted.
- [ ] Background check completion evidence for a sampled hire (redacted as appropriate).

## Security Operations Evidence (CC7.2–CC7.5)
- [ ] Incident or security event ticket from {{ticketing_system}}.
- [ ] On-call or escalation artifact from {{on_call_tool}}.
{{#if has_monitoring_tool}}
- [ ] Infrastructure monitoring dashboard or alert configuration from {{monitoring_tool}}.
{{#if has_autoscaling}}
- [ ] Auto-scaling configuration evidence for production workloads.
{{/if}}
{{else}}
- [ ] **GAP**: Implement infrastructure monitoring for capacity and availability (A1.1).
{{/if}}
- [ ] Post-mortem or post-incident review document for a resolved security event (demonstrates lessons-learned loop).
- [ ] Evidence that incident playbook was followed during a real or tabletop exercise (CC7.4).
{{#if requires_cyber_insurance}}
- [ ] Current cyber insurance certificate.
{{else}}
- [ ] Documented rationale for operating without cyber insurance.
{{/if}}

## Infrastructure and Data Protection Evidence
- [ ] System inventory for the {{deployment_model}} environment.
{{#if uses_aws}}
- [ ] Screenshot of AWS IAM or federation baseline.
{{#if uses_availability_zones}}
- [ ] AWS Config Rules for S3 Public Access and public exposure monitoring.
- [ ] IAM MFA enforcement screenshots for privileged roles in AWS.
{{/if}}
{{/if}}
{{#if uses_azure}}
- [ ] Screenshot of Azure tenant security baseline or Conditional Access configuration.
{{#if uses_availability_zones}}
- [ ] Azure Monitor or Defender policy evidence for cloud logging and alert coverage.
{{/if}}
{{/if}}
{{#if uses_gcp}}
- [ ] Screenshot of GCP IAM bindings or Security Command Center overview.
{{#if uses_availability_zones}}
- [ ] Cloud Logging or Security Command Center evidence for public exposure and logging coverage.
{{/if}}
{{/if}}
{{#if uses_hybrid}}
- [ ] Physical server room access log covering the on-premise portion of the hybrid environment.
{{#if uses_cloud_vpn}}
- [ ] VPN or private connectivity logs showing administrative access into the hybrid boundary.
{{/if}}
{{/if}}
{{#if is_self_hosted}}
{{#if has_physical_server_room}}
- [ ] Physical access logs for the server room, rack, or cage.
{{/if}}
{{#if requires_biometric_rack_access}}
- [ ] Evidence of biometric or badge-plus-PIN enforcement for server racks or cages.
{{/if}}
{{#if tracks_media_destruction}}
- [ ] Media destruction logs or certificates for retired storage devices.
{{/if}}
{{else}}
- [ ] Physical data center controls are inherited from the cloud service provider and are covered by vendor assurance reports.
{{/if}}
- [ ] Backup execution evidence and one restore test artifact.
- [ ] Encryption configuration evidence for data at rest and in transit.

## Confidentiality and Data Lifecycle Evidence (C1.1–C1.2)
{{#if has_nda_process}}
- [ ] Sample NDA or confidentiality agreement (employee and/or contractor).
- [ ] NDA tracking evidence showing coverage across workforce.
{{else}}
- [ ] **GAP**: Implement NDA/confidentiality agreements for employees and contractors with access to confidential data.
{{/if}}
{{#if data_retention_defined}}
- [ ] Data retention schedule mapping data types to retention periods.
{{else}}
- [ ] **GAP**: Define and document data retention schedules for all data classifications.
{{/if}}
{{#if has_data_disposal_procedure}}
- [ ] Data disposal procedure document.
- [ ] Sample disposal ticket or certificate showing secure destruction was completed.
{{else}}
- [ ] **GAP**: Implement and document data disposal procedures with verifiable evidence of secure destruction.
{{/if}}

{{#if scope_includes_processing_integrity}}
## Processing Integrity Evidence (PI1.1-PI1.5)

- [ ] Processing objective inventory identifying critical workflows, reports, scheduled jobs, integrations, and customer-facing outputs for {{primary_product_name}}.
- [ ] Input validation evidence showing required fields, authorization checks, duplicate handling, and business-rule validation for sampled critical workflows.
- [ ] Job run logs or processing-monitoring dashboards showing successful, failed, retried, and exception states.
- [ ] Reconciliation records comparing source records, control totals, downstream outputs, or customer-facing reports.
- [ ] Exception tickets from {{ticketing_system}} showing owner assignment, root cause, correction, approval, and closure within {{processing_exception_sla}} or documented exception approval.
- [ ] Output review or report QA evidence showing completeness, accuracy, timeliness, and authorized delivery.
{{#if has_cardholder_data_environment}}
- [ ] Payment-processing evidence showing cardholder data remains tokenized, masked, or isolated inside the approved CDE boundary.
{{/if}}
{{#if stores_phi}}
- [ ] PHI processing sample showing minimum-necessary access, audit trail, and correction workflow evidence.
{{/if}}
{{/if}}

{{#if scope_includes_privacy}}
## Privacy Evidence (P1-P8)

- [ ] Current privacy notice and change history showing notice updates for material processing changes.
- [ ] Consent capture or opt-in evidence for processing activities that require explicit consent.
- [ ] Data subject request log showing acknowledgement within {{dsar_acknowledgement_window}}, identity verification, completion date, and closure evidence.
- [ ] Data quality or correction evidence showing personal information corrections are reviewed and propagated to downstream systems or subprocessors where applicable.
- [ ] Privacy complaint register showing intake channel, owner, investigation steps, outcome, and escalation decision.
- [ ] Privacy monitoring or internal audit evidence showing privacy commitments are tested and deficiencies are tracked to closure.
{{/if}}

## Vendor and Subprocessor Evidence (CC9.2)
{{#if has_subprocessors}}
{{#each subprocessors}}
### {{name}}
- [ ] Security review package for {{name}}: {{service_description}}
{{#if has_assurance_report}}
- [ ] {{assurance_report_type}} report from {{name}} (current period).
{{#if (eq control_inclusion 'carve-out')}}
- [ ] Evidence that complementary subservice organization controls (CSOCs) required by the carve-out are implemented by {{organization_name}}.
{{else}}
- [ ] Confirmation that {{name}} controls are tested inclusively within the SOC report.
{{/if}}
{{else}}
- [ ] **GAP**: Obtain assurance report (SOC 2 preferred) from {{name}} or document compensating due-diligence procedures.
{{/if}}
{{/each}}
{{else}}
- [ ] Confirmation that no subprocessors with material access are currently in scope.
{{/if}}
$$,
    '{
      "organization_name": "Example Corp",
      "effective_date": "2026-04-18",
      "policy_version": "v0.1",
      "idp_provider": "Entra ID",
      "vcs_provider": "GitHub",
      "hris_provider": "Rippling",
      "termination_sla_hours": 4,
      "onboarding_sla_days": 2,
      "requires_mfa": true,
      "requires_peer_review": true,
      "requires_cyber_insurance": false,
      "deployment_model": "multi-tenant SaaS",
      "ticketing_system": "Jira",
      "on_call_tool": "PagerDuty",
      "uses_aws": true,
      "uses_azure": false,
      "uses_gcp": false,
      "has_subprocessors": true,
      "subprocessors": [
        {
          "name": "Supabase",
          "service_description": "Managed database and authentication",
          "has_assurance_report": true,
          "assurance_report_type": "SOC 2 Type II",
          "control_inclusion": "carve-out"
        }
      ],
      "has_employee_handbook": true,
      "has_code_of_conduct": true,
      "acknowledgement_cadence": "hire-and-annual",
      "has_disciplinary_procedures": true,
      "has_board_or_advisory": false,
      "has_dedicated_security_officer": true,
      "security_officer_title": "CISO",
      "has_org_chart": true,
      "org_chart_maintenance": "hris-auto",
      "has_job_descriptions": true,
      "has_internal_audit_program": true,
      "internal_audit_frequency": "annual",
      "has_performance_reviews_linked_to_controls": true,
      "security_awareness_training_tool": "KnowBe4",
      "training_cadence": "onboarding-and-annual",
      "has_phishing_simulation": true,
      "phishing_simulation_frequency": "quarterly",
      "has_security_bulletin_subscription": true,
      "has_siem": true,
      "siem_tool": "Datadog Security",
      "has_ids_ips": false,
      "has_waf": true,
      "log_retention_days": 90,
      "has_endpoint_protection": true,
      "endpoint_protection_tool": "CrowdStrike",
      "has_mdm": true,
      "mdm_tool": "Jamf",
      "has_vulnerability_scanning": true,
      "vulnerability_scanning_tool": "Snyk",
      "has_penetration_testing": true,
      "penetration_test_frequency": "annual",
      "has_dast": false,
      "has_monitoring_tool": true,
      "monitoring_tool": "Datadog",
      "has_autoscaling": true,
      "policy_publication_method": "wiki",
      "has_customer_contracts": true,
      "has_customer_support_channel": true,
      "has_release_note_practice": true,
      "has_risk_register": true,
      "includes_fraud_risk_in_assessment": true,
      "has_nda_process": true,
      "data_retention_defined": true,
      "has_data_disposal_procedure": true
    }'::jsonb,
    true
  ),
  (
    'system-description',
    'System Description (DC 200)',
    'AICPA DC 3 system description covering infrastructure, software, people, procedures, and data.',
    'Security',
    array['CC1', 'CC2', 'CC3', 'CC4', 'CC5', 'CC6', 'CC7', 'CC8', 'CC9'],
    '00-system-description.md',
    $$---
title: System Description
slug: system-description
tsc_category: Security
criteria_mapped:
  - CC1
  - CC2
  - CC3
  - CC4
  - CC5
  - CC6
  - CC7
  - CC8
  - CC9
generated_for: {{organization_name}}
effective_date: {{effective_date}}
version: {{policy_version}}
---

# System Description

> Audit readiness warning: auditors will expect current data-flow diagrams or a procedural annex showing system boundaries, data ingress, processing paths, storage locations, third-party transfers, and data egress. If these diagrams are missing or stale, the System Description may be rejected as incomplete.

## I. Company Overview

{{organization_name}} provides {{primary_product_name}}. {{system_description}}

### Audit Readiness Context

{{#if is_type1}}
This package is prepared for a **SOC 2 Type I** readiness path, focusing on point-in-time control design and implementation evidence.
{{/if}}
{{#if is_type2}}
This package is prepared for a **SOC 2 Type II** readiness path, focusing on control design and operating effectiveness across the audit period.
{{/if}}
{{#if is_audit_type_unsure}}
This package is prepared for an undecided SOC 2 audit path and is written to support either Type I design readiness or Type II operating-effectiveness evidence once the audit period is confirmed.
{{/if}}

### Principal Service Commitments and System Requirements

{{organization_name}} has established the following commitments to its users:
- Security: The system is protected against unauthorized access, both physical and logical.
{{#if scope_includes_availability}}
- Availability: The system is available for operation and use as committed or agreed.
{{/if}}
{{#if scope_includes_confidentiality}}
- Confidentiality: Information designated as confidential is protected as committed or agreed.
{{/if}}
{{#if scope_includes_privacy}}
- Privacy: Personal information is collected, used, retained, disclosed, and disposed of in conformity with the commitments in the entity's privacy notice.
{{/if}}
{{#if scope_includes_processing_integrity}}
- Processing Integrity: System processing is complete, valid, accurate, timely, and authorized.
{{/if}}

## II. Infrastructure

### Cloud Infrastructure

{{#if uses_aws}}
#### Amazon Web Services (AWS)
{{organization_name}} uses AWS as a primary cloud provider. Compute, storage, and networking services are provisioned in production AWS accounts.
{{#if uses_availability_zones}}
- Production workloads are distributed across multiple Availability Zones for resilience.
{{/if}}
- AWS IAM is used for cloud identity and access management with least-privilege policies.
- Service Control Policies (SCPs) enforce organizational guardrails across accounts.
{{/if}}

{{#if uses_azure}}
#### Microsoft Azure
{{organization_name}} uses Azure as a cloud provider. Compute, storage, and networking services are provisioned in production Azure subscriptions.
{{#if uses_availability_zones}}
- Production workloads are distributed across multiple Availability Zones.
{{/if}}
- Azure Active Directory / Entra ID is used for cloud identity management.
- Azure Policy and Management Groups enforce organizational guardrails.
{{/if}}

{{#if uses_gcp}}
#### Google Cloud Platform (GCP)
{{organization_name}} uses GCP as a cloud provider. Compute, storage, and networking services are provisioned in production GCP projects.
{{#if uses_availability_zones}}
- Production workloads are distributed across multiple zones within regions.
{{/if}}
- GCP IAM bindings are used for cloud identity and access management.
- Organization Policies enforce guardrails across projects.
{{/if}}

{{#if is_self_hosted}}
### On-Premises Infrastructure
{{organization_name}} maintains physical infrastructure for hosting production systems.
{{#if has_physical_server_room}}
- Server rooms are access-controlled with logged entry and exit.
{{/if}}
{{#if requires_biometric_rack_access}}
- Biometric or badge-plus-PIN enforcement controls protect server racks.
{{/if}}
{{#if tracks_media_destruction}}
- Media destruction procedures are in place for retired storage devices.
{{/if}}
{{/if}}

{{#if uses_hybrid}}
### Hybrid Environment
{{organization_name}} operates a hybrid architecture spanning cloud and on-premises infrastructure. Network connectivity between environments is maintained through secure channels.
{{#if uses_cloud_vpn}}
- VPN or private connectivity links cloud and on-premises environments with encrypted transit.
{{/if}}
{{/if}}

### Network Architecture
- All external traffic is encrypted in transit using TLS 1.2 or higher.
- Internal service-to-service communication uses encrypted channels.
- Network segmentation separates production, staging, and development environments.

## III. Software

### Application Stack
- The primary application is built and deployed using modern software engineering practices.
- Version control is managed in {{vcs_provider}}.
{{#if requires_peer_review}}
- All production-affecting changes require peer review before merge.
{{else}}
- A documented exception process exists for changes merged without peer review.
{{/if}}

### Supporting Software
{{#if (eq idp_provider 'Entra ID')}}
- Identity Provider: Microsoft Entra ID (Azure AD)
{{else}}
  {{#if (eq idp_provider 'Okta')}}
- Identity Provider: Okta
  {{else}}
- Identity Provider: {{idp_provider}}
  {{/if}}
{{/if}}
- HR Information System: {{hris_provider}}
- Ticketing System: {{ticketing_system}}
- On-Call/Escalation: {{on_call_tool}}
{{#if requires_mfa}}
- Multi-Factor Authentication is enforced for all workforce access via {{idp_provider}}.
{{/if}}

## IV. People

### Organizational Structure
{{#if has_org_chart}}
{{organization_name}} maintains a current organizational chart (updated {{org_chart_maintenance}}).
{{/if}}
{{#if has_dedicated_security_officer}}
A designated {{security_officer_title}} owns the information security program and reports to executive leadership.
{{/if}}
{{#if has_board_or_advisory}}
A board of directors or advisory board provides governance oversight, meeting {{board_meeting_frequency}} to review risk assessments and control effectiveness.
{{/if}}

{{organization_name}} maintains the following functional roles relevant to the system:
- **Executive Leadership**: Responsible for setting security policy, risk appetite, and organizational commitments.
{{#if has_dedicated_security_officer}}
- **{{security_officer_title}}**: Designated owner of the information security program.
{{/if}}
- **Engineering**: Responsible for developing, testing, and deploying the system.
- **Security/Compliance**: Responsible for security operations, incident response, and compliance monitoring.
- **Human Resources**: Responsible for onboarding, offboarding, and personnel management via {{hris_provider}}.

### Personnel Controls
- Background checks are conducted for new hires.
{{#if has_employee_handbook}}
- An employee handbook and {{#if has_code_of_conduct}}code of conduct are{{else}}policies are{{/if}} acknowledged by employees ({{acknowledgement_cadence}}).
{{/if}}
{{#if security_awareness_training_tool}}
- Security awareness training is delivered via {{security_awareness_training_tool}} ({{training_cadence}} cadence).
{{else}}
- Security awareness training is completed during onboarding and renewed annually.
{{/if}}
{{#if has_phishing_simulation}}
- Simulated phishing campaigns are conducted {{phishing_simulation_frequency}} to measure and improve awareness.
{{/if}}
- Access provisioning is completed within {{onboarding_sla_days}} business days of hire.
- Access revocation is completed within {{termination_sla_hours}} hours of termination.
{{#if has_performance_reviews_linked_to_controls}}
- Performance reviews include accountability for internal control responsibilities.
{{/if}}

## V. Procedures

### Change Management (CC8.1)
- Changes are tracked in {{vcs_provider}} with pull request workflows.
{{#if requires_peer_review}}
- Peer review is mandatory before production merge.
{{/if}}
- Deployments follow a defined release process with rollback capability.

### Incident Response (CC7.2–CC7.5)
- Incidents are tracked in {{ticketing_system}}.
- On-call escalation is managed via {{on_call_tool}}.
- Post-incident reviews are conducted and documented.

### Risk Management (CC3.1–CC3.4)
{{#if has_risk_register}}
- {{organization_name}} maintains a risk register that is reviewed periodically.
{{else}}
- {{organization_name}} conducts periodic risk assessments.
{{/if}}
- Risk assessments consider changes to infrastructure, personnel, and regulatory requirements.
{{#if includes_fraud_risk_in_assessment}}
- Fraud risk, including management override and intentional manipulation of data, is included in the risk assessment process.
{{/if}}

### Monitoring Activities (CC4.1–CC4.2)
{{#if has_internal_audit_program}}
- {{organization_name}} maintains an internal audit program with {{internal_audit_frequency}} reviews of control effectiveness.
- Deficiencies identified through monitoring are tracked to remediation.
{{/if}}
- Security monitoring covers infrastructure, application, and access events.
{{#if has_siem}}
- Centralized security monitoring is provided by {{siem_tool}}.
{{/if}}
{{#if has_monitoring_tool}}
- Infrastructure monitoring and capacity alerting is provided by {{monitoring_tool}}.
{{/if}}
- Alerts are routed to the appropriate team via {{on_call_tool}}.
- Monitoring coverage is reviewed at least annually.

### Security Tooling
{{#if has_endpoint_protection}}
- Endpoint protection is deployed on company devices via {{endpoint_protection_tool}}.
{{/if}}
{{#if has_mdm}}
- Mobile device management is enforced via {{mdm_tool}}.
{{/if}}
{{#if has_ids_ips}}
- Intrusion detection/prevention systems are deployed.
{{/if}}
{{#if has_waf}}
- A web application firewall protects public-facing applications.
{{/if}}
{{#if has_vulnerability_scanning}}
- Vulnerability scanning is performed using {{vulnerability_scanning_tool}}.
{{/if}}
{{#if has_penetration_testing}}
- Penetration testing is conducted {{penetration_test_frequency}} by qualified testers.
{{/if}}

## VI. Data

### Data Classification
{{#if data_classifications}}
{{organization_name}} classifies data into the following categories:
{{#each data_classifications}}
- **{{label}}**: {{description}}
{{/each}}
{{else}}
{{organization_name}} classifies data into standard categories (Public, Internal, Confidential, Restricted) as defined in the Data Classification and Handling Policy.
{{/if}}

### Data Protection
- Data at rest is encrypted using AES-256 or equivalent.
- Data in transit is encrypted using TLS 1.2+.
- Backups are performed regularly and restore tests are conducted at least annually.
{{#if stores_phi}}
- Protected health information (PHI) is identified as regulated data requiring heightened access restrictions, audit logging, and workforce handling controls.
{{/if}}
{{#if has_cardholder_data_environment}}
- The cardholder data environment (CDE) is explicitly defined and protected through boundary controls, approved payment-system access, and monitored administrative activity.
{{/if}}

{{#if has_cardholder_data_environment}}
### PCI Segmentation Responsibilities
- The cardholder data environment boundary is documented and reviewed when infrastructure, payment flows, or connected services change.
- Inbound and outbound connections to the CDE are restricted to approved services, ports, and administrative paths.
- Administrative access into the CDE requires strong authentication, approved access methods, and logging.
- Changes affecting segmentation controls are reviewed through {{vcs_provider}} change-management workflows before deployment.
- Connected vendors and service providers that could affect the CDE are reviewed through the vendor-management process.
{{/if}}

### Subservice Organizations
{{#if has_subprocessors}}
The following subservice organizations are included in the system boundary:

| Vendor | Role | Data Shared | Assurance | Inclusion |
|--------|------|-------------|-----------|-----------|
{{#each subprocessors}}
| {{name}} | {{role}} | {{data_shared}} | {{#if has_assurance_report}}{{assurance_report_type}}{{else}}None{{/if}} | {{#if has_assurance_report}}{{control_inclusion}}{{else}}N/A{{/if}} |
{{/each}}

{{#each subprocessors}}
{{#if has_assurance_report}}
{{#if (eq control_inclusion 'carve-out')}}
For {{name}}, controls are presented on a carve-out basis. {{organization_name}} has implemented the complementary subservice organization controls (CSOCs) required by the carve-out.
{{else}}
For {{name}}, controls are tested inclusively within the vendor's assurance report.
{{/if}}
{{/if}}
{{/each}}
{{else}}
No subservice organizations with material system access are currently in scope.
{{/if}}

## VII. Trust Services Criteria Mapping

This system description, together with the policy set and evidence artifacts generated by TrustScaffold, maps to the following AICPA Trust Services Criteria:

| Category | Criteria | Description |
|----------|----------|-------------|
| CC1 | Control Environment | Sections I, IV |
| CC2 | Communication and Information | Section I, policies |
| CC3 | Risk Assessment | Section V |
| CC4 | Monitoring Activities | Section V |
| CC5 | Control Activities | Sections II, III, V |
| CC6 | Logical and Physical Access | Sections II, III, IV |
| CC7 | System Operations | Section V |
| CC8 | Change Management | Section V |
| CC9 | Risk Mitigation | Sections V, VI |
{{#if scope_includes_availability}}
| A1 | Availability | Sections II, V |
{{/if}}
{{#if scope_includes_confidentiality}}
| C1 | Confidentiality | Section VI |
{{/if}}
{{#if scope_includes_privacy}}
| P1–P8 | Privacy | Section VI |
{{/if}}
{{#if scope_includes_processing_integrity}}
| PI1 | Processing Integrity | Sections III, V |
{{/if}}
$$,
    '{
      "organization_name": "Example Corp",
      "effective_date": "2026-04-18",
      "policy_version": "v0.1",
      "system_description": "a compliance automation platform",
      "deployment_model": "multi-tenant SaaS",
      "scope_includes_availability": true,
      "scope_includes_confidentiality": false,
      "scope_includes_privacy": false,
      "scope_includes_processing_integrity": false,
      "uses_aws": true,
      "uses_azure": false,
      "uses_gcp": false,
      "uses_availability_zones": true,
      "is_self_hosted": false,
      "uses_hybrid": false,
      "vcs_provider": "GitHub",
      "idp_provider": "Entra ID",
      "hris_provider": "Rippling",
      "ticketing_system": "Jira",
      "on_call_tool": "PagerDuty",
      "requires_mfa": true,
      "requires_peer_review": true,
      "onboarding_sla_days": 2,
      "termination_sla_hours": 4,
      "has_subprocessors": true,
      "subprocessors": [
        {
          "name": "Supabase",
          "role": "Database and Authentication Provider",
          "data_shared": "Application data, user credentials",
          "has_assurance_report": true,
          "assurance_report_type": "SOC 2 Type II",
          "control_inclusion": "carve-out"
        }
      ],
      "data_classifications": [
        { "label": "Public", "description": "Information intended for public disclosure" },
        { "label": "Internal", "description": "General business information" },
        { "label": "Confidential", "description": "Sensitive business and customer data" },
        { "label": "Restricted", "description": "Regulated data subject to contractual or legal obligations" }
      ],
      "has_employee_handbook": true,
      "has_code_of_conduct": true,
      "acknowledgement_cadence": "hire-and-annual",
      "has_board_or_advisory": false,
      "has_dedicated_security_officer": true,
      "security_officer_title": "CISO",
      "has_org_chart": true,
      "org_chart_maintenance": "hris-auto",
      "has_job_descriptions": true,
      "has_internal_audit_program": true,
      "internal_audit_frequency": "annual",
      "has_performance_reviews_linked_to_controls": true,
      "security_awareness_training_tool": "KnowBe4",
      "training_cadence": "onboarding-and-annual",
      "has_phishing_simulation": true,
      "phishing_simulation_frequency": "quarterly",
      "has_siem": true,
      "siem_tool": "Datadog Security",
      "has_monitoring_tool": true,
      "monitoring_tool": "Datadog",
      "has_endpoint_protection": true,
      "endpoint_protection_tool": "CrowdStrike",
      "has_mdm": true,
      "mdm_tool": "Jamf",
      "has_ids_ips": false,
      "has_waf": true,
      "has_vulnerability_scanning": true,
      "vulnerability_scanning_tool": "Snyk",
      "has_penetration_testing": true,
      "penetration_test_frequency": "annual",
      "has_risk_register": true,
      "includes_fraud_risk_in_assessment": true
    }'::jsonb,
    true
  ),
  (
    'internal-audit-monitoring-policy',
    'Internal Audit and Monitoring Policy',
    'Defines the internal audit program, controls monitoring cadence, and deficiency remediation process.',
    'Security',
    array['CC2', 'CC4'],
    '16-internal-audit-monitoring-policy.md',
    $$---
title: Internal Audit and Monitoring Policy
slug: internal-audit-monitoring-policy
tsc_category: Security
criteria_mapped:
  - CC2
  - CC4
generated_for: {{organization_name}}
effective_date: {{effective_date}}
version: {{policy_version}}
---

> This document is a starting-point compliance template and must be reviewed by {{approver_name}} before adoption.

# Internal Audit and Monitoring Policy

## 1. Purpose

This policy establishes {{organization_name}}'s internal audit program and ongoing monitoring activities to evaluate the design and operating effectiveness of internal controls, as required by AICPA Trust Services Criteria CC2.1, CC4.1, and CC4.2.

## 2. Scope

This policy applies to all controls within the SOC 2 trust services criteria boundary, including:
- Logical and physical access controls
- Change management controls
- Security operations controls
- Vendor management controls
- Availability and data protection controls

## 3. Internal Audit Program

### 3.1 Audit Cadence
{{#if has_internal_audit_program}}
{{organization_name}} conducts formal internal audit reviews on a **{{internal_audit_frequency}}** basis.
{{else}}
{{organization_name}} shall establish an internal audit review cadence of at least annually.
{{/if}}
The selected internal audit cadence must be documented as monthly, quarterly, or annually, and annual is the minimum acceptable cadence for SOC 2 readiness.

### 3.2 Audit Activities
Internal audit reviews shall include, at minimum:
- Sampling of access reviews to verify timeliness and completeness.
- Sampling of change management records to verify peer review and approval.
- Review of incident response records for adherence to playbooks.
- Verification that vendor assurance reports are current and reviewed.
- Verification that training completion rates meet the required cadence.
- Review of risk register updates and treatment plan progress.

### 3.3 Audit Independence
Internal audit activities are conducted by personnel who are independent of the processes being reviewed, or by qualified external parties. Where separation of duties is limited by organization size, compensating controls (such as management review) are documented.

## 4. Ongoing Monitoring

### 4.0 Monitoring Frequency Selection
Management reviews control-monitoring results on a **{{control_monitoring_frequency}}** basis. The selected frequency is documented in the audit plan and must be one of monthly, quarterly, or annually.

| Monitoring Area | Minimum Frequency | Evidence |
| --- | --- | --- |
| Access review completion | Quarterly | Completed access review records and remediation tickets |
| Change-management sampling | {{control_monitoring_frequency}} | Sampled change tickets, peer reviews, approvals, and deployment records |
| Incident-response records | {{control_monitoring_frequency}} | Incident tickets, severity classifications, post-incident reviews, and corrective actions |
| Vendor assurance review status | At least annually | Current assurance reports, review notes, and follow-up tickets |
| Risk register and treatment plans | {{control_monitoring_frequency}} | Updated risk register entries and treatment-plan status |

### 4.1 Automated Monitoring
{{#if has_siem}}
- Security events are monitored centrally via {{siem_tool}}.
{{/if}}
{{#if has_monitoring_tool}}
- Infrastructure and capacity metrics are monitored via {{monitoring_tool}}.
{{/if}}
- Alerting thresholds are configured for anomalous access patterns, failed authentication attempts, and unauthorized configuration changes.

### 4.2 Manual Monitoring
- Access reviews are performed quarterly.
{{#if (eq acknowledgement_cadence 'not-yet')}}
- A formal policy acknowledgement cadence is being established and will be verified once adopted.
{{else}}
- Policy acknowledgements are verified per the established cadence ({{acknowledgement_cadence}}).
{{/if}}
{{#if has_phishing_simulation}}
- Phishing simulation results are reviewed {{phishing_simulation_frequency}} to identify awareness gaps.
{{/if}}

## 5. Deficiency Remediation

### 5.1 Identification
Control deficiencies identified through internal audit, monitoring, or external feedback are logged in {{ticketing_system}} with:
- Description of the deficiency
- Affected criteria and control objective
- Severity classification (Critical, High, Medium, Low)

### 5.2 Remediation and Tracking
- Critical and High deficiencies require a remediation plan within **5 business days**.
- All deficiencies are tracked to closure with evidence of remediation.
- Unresolved deficiencies beyond 90 days are escalated to executive leadership{{#if has_board_or_advisory}} and reported to the board/advisory body{{/if}}.

### 5.3 Lessons Learned
Significant deficiencies trigger a review of the control design and, where appropriate, updates to policies, procedures, or monitoring rules.

## 6. Reporting

{{#if has_board_or_advisory}}
Internal audit results are presented to the board or advisory body on a **{{board_meeting_frequency}}** basis.
{{else}}
Internal audit results are presented to executive leadership at least annually.
{{/if}}
Reports include:
- Summary of reviews conducted
- Deficiencies identified and remediation status
- Trends in control effectiveness
- Recommendations for control improvements

## 7. Policy Review

This policy is reviewed and updated at least annually, or following significant organizational changes.
$$,
    '{
      "organization_name": "Example Corp",
      "effective_date": "2026-04-18",
      "policy_version": "v0.1",
      "approver_name": "Jane Doe",
      "has_internal_audit_program": true,
      "internal_audit_frequency": "annual",
      "control_monitoring_frequency": "quarterly",
      "has_siem": true,
      "siem_tool": "Datadog Security",
      "has_monitoring_tool": true,
      "monitoring_tool": "Datadog",
      "acknowledgement_cadence": "hire-and-annual",
      "has_phishing_simulation": true,
      "phishing_simulation_frequency": "quarterly",
      "ticketing_system": "Jira",
      "has_board_or_advisory": false,
      "board_meeting_frequency": "quarterly"
    }'::jsonb,
    true
  ),
  (
    'data-retention-disposal-policy',
    'Data Retention and Disposal Policy',
    'Defines data retention schedules, disposal procedures, and evidence requirements for secure data destruction.',
    'Confidentiality',
    array['CC6', 'CC9'],
    '17-data-retention-disposal-policy.md',
    $$---
title: Data Retention and Disposal Policy
slug: data-retention-disposal-policy
tsc_category: Confidentiality
criteria_mapped:
  - CC6
  - CC9
generated_for: {{organization_name}}
effective_date: {{effective_date}}
version: {{policy_version}}
---

> This document is a starting-point compliance template and must be reviewed by {{approver_name}} before adoption.

# Data Retention and Disposal Policy

## 1. Purpose

This policy defines {{organization_name}}'s requirements for data retention and secure disposal, ensuring confidential information is retained only as long as necessary and destroyed securely when no longer needed, as required by AICPA Trust Services Criteria C1.2 and related controls.

## 2. Scope

This policy applies to all data collected, processed, or stored by {{organization_name}} across all environments, including production, staging, backups, and archived data.

## 3. Data Classification

{{#if data_classifications}}
{{organization_name}} classifies data into the following categories:
{{#each data_classifications}}
- **{{name}}**: {{description}}
{{/each}}
{{else}}
Data is classified according to the Data Classification and Handling Policy.
{{/if}}

## 4. Retention Schedules

{{#if data_retention_defined}}
{{organization_name}} maintains documented retention schedules for each data classification.
{{else}}
{{organization_name}} shall define retention schedules for each data classification based on business need and regulatory requirements.
{{/if}}

### 4.1 Minimum Retention Requirements
| Data Type | Minimum Retention | Maximum Retention | Basis |
|-----------|-------------------|-------------------|-------|
| Audit logs | {{log_retention_days}} days | {{log_retention_days}} days | Operational/compliance |
| Customer data | Duration of contract + 30 days | Duration of contract + 90 days | Contractual |
| Employee records | Employment + 3 years | Employment + 7 years | Legal/regulatory |
| Backup data | {{backup_retention_period}} | {{backup_retention_period}} | Operational |
| Incident records | 3 years | 7 years | Compliance |

### 4.2 Regulatory Overrides
Where regulations (e.g., GDPR, CCPA, HIPAA) impose stricter retention limits, the regulatory requirement takes precedence.

## 5. Disposal Procedures

### 5.1 Electronic Data
- Production database records are purged using secure deletion methods.
- Backup media is overwritten or cryptographically erased.
- Cloud storage objects are deleted with verification that replicas are removed.
{{#if tracks_media_destruction}}
- Physical storage media is destroyed following documented media destruction procedures, with certificates retained.
{{/if}}

### 5.2 Paper Records
- Confidential paper records are cross-cut shredded.
- Shredding is performed on-site or by a bonded destruction service.

### 5.3 Disposal Evidence
{{#if has_data_disposal_procedure}}
All disposal actions are tracked with:
- Date of disposal
- Description of data destroyed
- Method of destruction
- Personnel who performed or witnessed the destruction
- Ticket or certificate reference
{{else}}
{{organization_name}} shall implement tracked disposal procedures with verifiable evidence of secure destruction.
{{/if}}

## 6. Customer Data Deletion

### 6.1 Contract Termination
Upon contract termination or customer request:
- Customer data is deleted from production systems within **30 days**.
- Backup copies are purged within the normal backup rotation cycle (maximum {{backup_retention_period}}).
- A confirmation of deletion is provided to the customer upon request.

### 6.2 Data Subject Requests
{{#if requires_consent}}
Data subject access and deletion requests are handled in accordance with the Privacy Policy, with acknowledgement within {{dsar_acknowledgement_window}}.
{{else}}
Data deletion requests from customers are handled per the terms of the customer agreement.
{{/if}}

## 7. Subprocessor Data Handling
{{#if has_subprocessors}}
{{#each subprocessors}}
- **{{name}}**: Data shared ({{data_shared}}) is subject to {{name}}'s retention and disposal procedures as evaluated during {{review_cadence}}.
{{/each}}
{{else}}
No subprocessors with material data access are currently in scope.
{{/if}}

## 8. Confidentiality Agreements
{{#if has_nda_process}}
All employees and contractors with access to confidential data are required to sign NDAs or confidentiality agreements prior to access provisioning.
{{else}}
{{organization_name}} shall implement NDA or confidentiality agreement requirements for personnel with access to confidential information.
{{/if}}

## 9. Policy Review

This policy is reviewed and updated at least annually, or following significant changes to data handling practices, regulations, or contractual obligations.
$$,
    '{
      "organization_name": "Example Corp",
      "effective_date": "2026-04-18",
      "policy_version": "v0.1",
      "approver_name": "Jane Doe",
      "data_retention_defined": true,
      "has_data_disposal_procedure": true,
      "has_nda_process": true,
      "tracks_media_destruction": false,
      "requires_consent": false,
      "dsar_acknowledgement_window": "5 business days",
      "log_retention_days": 90,
      "backup_retention_period": "35 days",
      "has_subprocessors": true,
      "subprocessors": [
        {
          "name": "Supabase",
          "data_shared": "Application data, user credentials",
          "review_cadence": "annual"
        }
      ],
      "data_classifications": [
        { "name": "Public", "description": "Information intended for public disclosure" },
        { "name": "Confidential", "description": "Sensitive business and customer data" }
      ]
    }'::jsonb,
    true
  ),
  (
    'business-associate-agreement-template',
    'Business Associate Agreement Template',
    'HIPAA Business Associate Agreement baseline for vendors that create, receive, maintain, or transmit PHI.',
    'HIPAA',
    array['HIPAA'],
    '19-business-associate-agreement-template.md',
    $$---
title: Business Associate Agreement Template
slug: business-associate-agreement-template
tsc_category: HIPAA
criteria_mapped:
  - HIPAA
generated_for: {{organization_name}}
effective_date: {{effective_date}}
version: {{policy_version}}
---

# Business Associate Agreement Template

## Purpose
This template defines minimum Business Associate Agreement (BAA) terms required before {{organization_name}} permits a vendor, subprocessor, contractor, or other business associate to create, receive, maintain, or transmit protected health information (PHI) for {{primary_product_name}}.

## Required Parties
- Covered entity or customer: to be completed during contract review.
- Business associate: vendor or service provider handling PHI.
- {{organization_name}} owner: {{policy_owner}}.
- Legal or privacy approver: {{privacy_contact_email}}.

## Required BAA Terms
1. The business associate may use or disclose PHI only as permitted by the agreement and applicable law.
2. The business associate must implement administrative, physical, and technical safeguards appropriate to the PHI handled.
3. The business associate must report security incidents, breaches, or unauthorized uses or disclosures to {{organization_name}} without unreasonable delay and no later than {{breach_notification_window}}.
4. Subcontractors that handle PHI must agree to equivalent restrictions and safeguards.
5. PHI must be returned, destroyed, or protected under continuing obligations at contract termination.
6. The business associate must make relevant records available for compliance review where required by law or contract.

## Vendor Review Procedure
{{#if has_subprocessors}}
Vendors with PHI access are reviewed through the vendor-management process:

| Vendor | Role | Data Shared | Assurance | Review Cadence |
| --- | --- | --- | --- | --- |
{{#each subprocessors}}
| {{name}} | {{role}} | {{data_shared}} | {{#if has_assurance_report}}{{assurance_report_type}}{{else}}None documented{{/if}} | {{review_cadence}} |
{{/each}}
{{else}}
No current PHI-handling vendors are listed. The business owner must confirm vendor scope before PHI is shared.
{{/if}}

## Evidence
- Executed BAA or contract addendum for each PHI-handling vendor.
- Vendor security review and assurance report, where available.
- Subcontractor flow-down confirmation.
- Breach notification contact and escalation path.
- Annual BAA review evidence retained {{baa_review_frequency}}.
$$,
    '{
      "organization_name": "Example Corp",
      "primary_product_name": "Example Health Cloud",
      "effective_date": "2026-04-18",
      "policy_version": "v0.1",
      "policy_owner": "Privacy Officer",
      "privacy_contact_email": "privacy@example.com",
      "breach_notification_window": "60 calendar days",
      "baa_review_frequency": "annually",
      "has_subprocessors": false,
      "subprocessors": []
    }'::jsonb,
    true
  ),
  (
    'phi-data-flow-inventory-map',
    'PHI Data Flow and Inventory Map',
    'HIPAA-focused inventory of PHI fields, systems, flows, recipients, safeguards, and retention.',
    'HIPAA',
    array['HIPAA'],
    '20-phi-data-flow-inventory-map.md',
    $$---
title: PHI Data Flow and Inventory Map
slug: phi-data-flow-inventory-map
tsc_category: HIPAA
criteria_mapped:
  - HIPAA
generated_for: {{organization_name}}
effective_date: {{effective_date}}
version: {{policy_version}}
---

# PHI Data Flow and Inventory Map

## Purpose
{{organization_name}} maintains this PHI inventory to document where protected health information enters, moves through, is stored by, is disclosed from, and is deleted from {{primary_product_name}}.

## PHI Inventory
| PHI Element / Dataset | Source | System Of Record | Purpose | Access Roles | Retention | Safeguards |
| --- | --- | --- | --- | --- | --- | --- |
| Treatment, diagnosis, claims, medical record, or healthcare-regulated fields | Customer, integration, import, or support workflow | To be completed | To be completed | Minimum necessary roles | Per retention schedule | Encryption, access logging, MFA, review |

## Data Flow Register
| Flow | Origin | Destination | Transfer Method | Vendor / Recipient | Logging | Approval Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| PHI ingestion | Customer or authorized integration | {{primary_product_name}} production environment | Encrypted transfer | Internal systems | Application and access logs | Integration/change record |
| PHI support access | Authorized support workflow | Ticketing and support tooling | Approved workflow | {{ticketing_system}} | Ticket and access logs | Support access ticket |

{{#if has_subprocessors}}
## PHI-Handling Vendors
| Vendor | PHI Shared | Assurance | BAA Required | Review Cadence |
| --- | --- | --- | --- | --- |
{{#each subprocessors}}
| {{name}} | {{data_shared}} | {{#if has_assurance_report}}{{assurance_report_type}}{{else}}None documented{{/if}} | Yes if PHI is shared | {{review_cadence}} |
{{/each}}
{{/if}}

## Review Requirements
- The PHI inventory is reviewed {{phi_inventory_review_frequency}} and after material product, vendor, integration, or data-flow changes.
- PHI access must follow minimum-necessary principles.
- Missing field-level inventory items are tracked as compliance gaps until remediated.
$$,
    '{
      "organization_name": "Example Corp",
      "primary_product_name": "Example Health Cloud",
      "effective_date": "2026-04-18",
      "policy_version": "v0.1",
      "ticketing_system": "Jira",
      "phi_inventory_review_frequency": "quarterly",
      "has_subprocessors": false,
      "subprocessors": []
    }'::jsonb,
    true
  ),
  (
    'tokenization-cardholder-data-policy',
    'Tokenization and Cardholder Data Policy',
    'PCI-DSS high-water policy for cardholder data storage, masking, tokenization, and CDE boundary controls.',
    'PCI-DSS',
    array['PCI'],
    '21-tokenization-cardholder-data-policy.md',
    $$---
title: Tokenization and Cardholder Data Policy
slug: tokenization-cardholder-data-policy
tsc_category: PCI-DSS
criteria_mapped:
  - PCI
generated_for: {{organization_name}}
effective_date: {{effective_date}}
version: {{policy_version}}
---

# Tokenization and Cardholder Data Policy

## Purpose
{{organization_name}} protects cardholder data (CHD) by minimizing storage, using tokenization where feasible, masking display values, and restricting all CHD handling to the approved cardholder data environment (CDE).

## PCI Scope Baseline
- Cardholder data in scope: {{cardholder_data_elements_text}}

## Policy Requirements
- Only the approved in-scope PCI data elements ({{cardholder_data_elements_text}}) may enter the CDE or connected scanning boundary.
- Raw primary account numbers (PANs) may not be stored outside the approved CDE.
- Sensitive authentication data, including full track data, CVV/CVC, and PIN data, may not be stored after authorization.
- PAN display is masked except for personnel with documented business need.
- Tokenized values are used outside the CDE whenever processing does not require raw CHD.
- CDE boundary diagrams, connected systems, administrative paths, and vendor dependencies are reviewed after material changes.
- Encryption and key management follow approved algorithms: {{approved_encryption_algorithms}}.

## Tokenization Procedure
1. Payment workflows identify whether {{cardholder_data_elements_text}} are received, transmitted, processed, stored, or tokenized by a payment processor.
2. Raw CHD is routed only through approved payment components and service providers.
3. Tokens are stored in application systems instead of raw PAN wherever feasible.
4. Logs, support tickets, telemetry, and exports are monitored to prevent CHD leakage.
5. Exceptions require approval from {{approver_name}} and documented compensating controls.

## Evidence
- CDE boundary diagram and system inventory.
- Tokenization or payment-processor configuration.
- Masking screenshots or configuration evidence.
- Key-management and encryption configuration evidence.
- CHD leakage monitoring or log-scrubbing evidence.
$$,
    '{
      "organization_name": "Example Corp",
      "effective_date": "2026-04-18",
      "policy_version": "v0.1",
      "approver_name": "Head of Security",
      "approved_encryption_algorithms": "AES-256, TLS 1.2+, and provider-managed key protection"
    }'::jsonb,
    true
  ),
  (
    'quarterly-vulnerability-scanning-sop',
    'Quarterly Vulnerability Scanning SOP',
    'PCI-DSS SOP for quarterly ASV scanning, internal scanning, remediation, rescans, and evidence retention.',
    'PCI-DSS',
    array['PCI'],
    '22-quarterly-vulnerability-scanning-sop.md',
    $$---
title: Quarterly Vulnerability Scanning SOP
slug: quarterly-vulnerability-scanning-sop
tsc_category: PCI-DSS
criteria_mapped:
  - PCI
generated_for: {{organization_name}}
effective_date: {{effective_date}}
version: {{policy_version}}
---

# Quarterly Vulnerability Scanning SOP

## Purpose
{{organization_name}} performs recurring vulnerability scans for systems in or connected to the CDE and retains evidence needed for PCI-DSS readiness.

## Scan Program Baseline
- PCI data elements in scope: {{cardholder_data_elements_text}}

## Scan Cadence
- External ASV scans are performed {{asv_scan_frequency}} and after significant CDE changes.
- Internal vulnerability scans are performed {{pci_scan_frequency}} for CDE systems and connected services.
- Failed scans are remediated and rescanned until passing results are obtained.

## Procedure
1. Confirm current CDE scope, in-scope PCI data elements ({{cardholder_data_elements_text}}), internet-facing assets, connected systems, and payment-provider integrations.
2. Schedule ASV scans and internal authenticated scans.
3. Triage results by severity, exploitability, exposure, and CDE impact.
4. Track remediation in {{ticketing_system}} with owner, due date, evidence, and rescan result.
5. Retain scan reports, attestation status, remediation tickets, and exception approvals.

## Remediation Expectations
High-risk findings must be remediated within {{vulnerability_remediation_sla}}. Exceptions require risk acceptance by {{approver_name}}, compensating controls, and a target remediation date.
$$,
    '{
      "organization_name": "Example Corp",
      "effective_date": "2026-04-18",
      "policy_version": "v0.1",
      "asv_scan_frequency": "every 90 days",
      "pci_scan_frequency": "quarterly",
      "ticketing_system": "Jira",
      "vulnerability_remediation_sla": "30 days for high-risk findings and before scan attestation for failing ASV findings",
      "approver_name": "Head of Security"
    }'::jsonb,
    true
  ),
  (
    'iso27001-statement-of-applicability',
    'ISO 27001 Statement of Applicability',
    'ISO 27001 Annex A master index showing applicability, implementation status, rationale, owners, and linked evidence.',
    'ISO 27001',
    array['ISO27001'],
    '23-iso27001-statement-of-applicability.md',
    $$---
title: ISO 27001 Statement of Applicability
slug: iso27001-statement-of-applicability
tsc_category: ISO 27001
criteria_mapped:
  - ISO27001
generated_for: {{organization_name}}
effective_date: {{effective_date}}
version: {{policy_version}}
---

# ISO 27001 Statement of Applicability

## Purpose
The Statement of Applicability (SoA) is {{organization_name}}'s master index for ISO 27001 Annex A controls. It records whether each control is applicable, why it is included or excluded, implementation status, ownership, and linked TrustScaffold documentation.

## SoA Review Requirements
- Reviewed {{soa_review_frequency}}.
- Updated after material changes to scope, risk assessment, vendors, infrastructure, products, or legal obligations.
- Exclusions require documented rationale and approval from {{approver_name}}.

## Starter Annex A Applicability Matrix
| Annex A Domain | Applicability | Rationale | TrustScaffold Support | Owner | Status | Reviewer Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Organizational controls | Applicable | Governance, risk, policy, supplier, legal, and incident controls are required for the ISMS. | Information Security Policy; Risk Management Policy; Vendor Management Policy; Legal and Regulatory Registry | {{policy_owner}} | Draft |  |
| People controls | Applicable | Workforce screening, training, acceptable use, and disciplinary expectations apply to all personnel. | Acceptable Use and Code of Conduct Policy; Evidence Checklist | {{control_operator}} | Draft |  |
| Physical controls | Applicable | Physical controls apply through offices, remote work, inherited cloud data center controls, or self-hosted assets. | Physical Security Policy; System Description | {{control_operator}} | Draft |  |
| Technological controls | Applicable | Identity, access, cryptography, logging, vulnerability, change, backup, and secure development controls apply to the system. | Access Control; Encryption; Secure SDLC; Change Management; Asset and Cryptographic Inventory | {{control_operator}} | Draft |  |

## Exclusion Register
| Control / Domain | Excluded? | Rationale | Compensating Control | Approver | Date |
| --- | --- | --- | --- | --- | --- |
| To be completed during ISO scoping |  |  |  | {{approver_name}} | {{effective_date}} |
$$,
    '{
      "organization_name": "Example Corp",
      "effective_date": "2026-04-18",
      "policy_version": "v0.1",
      "soa_review_frequency": "annually and after material scope changes",
      "approver_name": "Chief Executive Officer",
      "policy_owner": "Security Owner",
      "control_operator": "Control Operator"
    }'::jsonb,
    true
  ),
  (
    'legal-regulatory-registry',
    'Legal and Regulatory Registry',
    'ISO 27001-oriented registry of legal, regulatory, statutory, contractual, and framework obligations.',
    'ISO 27001',
    array['ISO27001', 'GDPR', 'CCPA', 'HIPAA', 'PCI', 'SOX'],
    '24-legal-regulatory-registry.md',
    $$---
title: Legal and Regulatory Registry
slug: legal-regulatory-registry
tsc_category: ISO 27001
criteria_mapped:
  - ISO27001
  - GDPR
  - CCPA
  - HIPAA
  - PCI
  - SOX
generated_for: {{organization_name}}
effective_date: {{effective_date}}
version: {{policy_version}}
---

# Legal and Regulatory Registry

## Purpose
{{organization_name}} maintains this registry to identify laws, regulations, standards, contractual obligations, and customer commitments that affect {{primary_product_name}}.

## Registry
| Obligation | Applies? | Trigger | Owner | Required Documentation | Review Cadence | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| SOC 2 Trust Services Criteria | Yes | TrustScaffold readiness package | {{policy_owner}} | Policy set, System Description, Evidence Checklist | Annually | Security is baseline. |
| ISO 27001 | Yes | Multi-framework readiness baseline | {{policy_owner}} | SoA, legal registry, risk register, asset inventory | {{legal_registry_review_frequency}} | Confirm certification scope before external audit. |
| GDPR / UK GDPR | {{#if website_targets_eu_or_uk_residents}}Yes{{else}}{{#if scope_includes_privacy}}Review needed{{else}}No EU/UK targeting indicated{{/if}}{{/if}} | EU/UK visitors, customers, monitoring, cookies, or behavioral tracking | {{privacy_contact_email}} | Privacy Notice, DPIA, DSAR log, cookie consent, vendor privacy terms | {{legal_registry_review_frequency}} | Website: {{company_website}} |
| CCPA / CPRA | {{#if website_targets_california_residents}}Yes{{else}}{{#if website_sells_or_shares_personal_information}}Yes{{else}}Review needed{{/if}}{{/if}} | California residents, sale/share, targeted advertising, or consumer privacy requests | {{privacy_contact_email}} | Privacy notice, opt-out links, DSAR log, retention schedule | {{legal_registry_review_frequency}} |  |
| HIPAA | {{#if stores_phi}}Yes{{else}}No PHI indicated{{/if}} | PHI handled by system or vendors | {{privacy_contact_email}} | BAA, PHI inventory, security incident records | {{legal_registry_review_frequency}} |  |
| PCI-DSS | {{#if has_cardholder_data_environment}}Yes{{else}}No CDE indicated{{/if}} | CDE stores, processes, transmits, or connects to CHD | {{policy_owner}} | CDE inventory, ASV scans, tokenization policy | Quarterly |  |
{{#if is_sox_applicable}}
| SOX / ICFR | {{sox_applicability_label}} | Public company obligations, IPO readiness, parent-company controls, or systems that feed financial reporting | {{finance_system_owner}} | SOX ITGC matrix, access review evidence, change tickets, key report inventory | {{sox_review_frequency}} | Confirm whether {{primary_product_name}} or connected systems are in scope for financial reporting. |
{{/if}}
| Cookie / tracking consent | {{#if website_uses_cookies_analytics}}Review needed{{else}}No tracking indicated{{/if}} | Cookies, analytics, ads, pixels, session replay, or similar tracking | {{privacy_contact_email}} | Cookie banner, preference center, vendor list, consent log | {{legal_registry_review_frequency}} | Banner present: {{#if website_has_cookie_banner}}Yes{{else}}No{{/if}} |
| Children's privacy | {{#if website_allows_children_under_13}}Review needed{{else}}No child-directed use indicated{{/if}} | Site directed to children or knowingly collecting data from children under 13 | {{privacy_contact_email}} | Parental consent, age-screening, retention and deletion workflow | {{legal_registry_review_frequency}} |  |

## Maintenance Procedure
1. Review new products, data types, customers, regions, vendors, and contracts for new obligations.
2. Assign each obligation an owner and evidence location.
3. Track changes in {{ticketing_system}} or the compliance register.
4. Escalate unclear obligations to legal counsel or qualified compliance advisors.
$$,
    '{
      "organization_name": "Example Corp",
      "primary_product_name": "Example Cloud",
      "effective_date": "2026-04-18",
      "policy_version": "v0.1",
      "policy_owner": "Security Owner",
      "finance_system_owner": "Controller",
      "privacy_contact_email": "privacy@example.com",
      "legal_registry_review_frequency": "quarterly",
      "is_sox_applicable": false,
      "sox_applicability_label": "No current SOX / ITGC driver",
      "sox_review_frequency": "quarterly",
      "ticketing_system": "Jira",
      "company_website": "https://example.com",
      "scope_includes_privacy": true,
      "stores_phi": false,
      "has_cardholder_data_environment": false,
      "has_customer_pii": true,
      "website_targets_eu_or_uk_residents": true,
      "website_targets_california_residents": true,
      "website_uses_cookies_analytics": true,
      "website_has_cookie_banner": true,
      "website_sells_or_shares_personal_information": false,
      "website_allows_children_under_13": false
    }'::jsonb,
    true
  ),
  (
    'data-protection-impact-assessment',
    'Data Protection Impact Assessment',
    'GDPR/privacy DPIA template for high-risk personal-data processing activities.',
    'GDPR / Privacy',
    array['GDPR', 'P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8'],
    '25-data-protection-impact-assessment.md',
    $$---
title: Data Protection Impact Assessment
slug: data-protection-impact-assessment
tsc_category: GDPR / Privacy
criteria_mapped:
  - GDPR
  - P1
  - P2
  - P3
  - P4
  - P5
  - P6
  - P7
  - P8
generated_for: {{organization_name}}
effective_date: {{effective_date}}
version: {{policy_version}}
---

# Data Protection Impact Assessment

## Purpose
This DPIA records privacy risks, safeguards, and approval decisions for high-risk processing activities in {{primary_product_name}}.

## Processing Description
| Area | Description |
| --- | --- |
| Processing purpose | To be completed for the workflow under review. |
| Data subjects | Customers, users, workforce members, or other individuals whose personal information is processed. |
| Personal data categories | {{#each data_classifications}}{{name}}{{#unless @last}}, {{/unless}}{{/each}} |
| Systems and vendors | {{primary_product_name}}{{#if has_subprocessors}} and approved subprocessors{{/if}} |
| Retention | Per Data Retention and Disposal Policy. |

## Necessity and Proportionality
- Processing purpose is documented and communicated in the privacy notice.
- Data collection is limited to what is necessary for the stated purpose.
- Access is restricted to approved roles.
- Data subject request and correction workflows are tracked in {{ticketing_system}}.

## Risk Assessment
| Risk | Impact | Mitigation | Owner | Residual Risk | Notes |
| --- | --- | --- | --- | --- | --- |
| Unauthorized access to personal information | High | MFA, least privilege, logging, access reviews | {{control_operator}} | To be assessed |  |
| Excessive collection or retention | Medium | Data minimization and retention schedule | {{policy_owner}} | To be assessed |  |
| Unauthorized disclosure to vendor | High | Vendor review, privacy terms, disclosure register | {{policy_owner}} | To be assessed |  |
| Inaccurate or stale personal data | Medium | Correction workflow and downstream propagation | {{privacy_contact_email}} | To be assessed |  |

## Approval and Review
- DPIAs are reviewed {{dpia_review_frequency}}.
- High residual risk is escalated to executive leadership, legal counsel, or the appropriate supervisory authority when required.
- Material processing changes require DPIA update before release.
$$,
    '{
      "organization_name": "Example Corp",
      "primary_product_name": "Example Cloud",
      "effective_date": "2026-04-18",
      "policy_version": "v0.1",
      "ticketing_system": "Jira",
      "policy_owner": "Privacy Officer",
      "control_operator": "Control Operator",
      "privacy_contact_email": "privacy@example.com",
      "dpia_review_frequency": "annually and before high-risk processing changes",
      "has_subprocessors": false,
      "data_classifications": [{ "name": "Customer PII", "description": "Personal information" }]
    }'::jsonb,
    true
  ),
  (
    'asset-management-cryptographic-inventory',
    'Asset Management and Cryptographic Inventory',
    'Universal common-control inventory for assets, data stores, encryption mechanisms, keys, certificates, and owners.',
    'Universal',
    array['COMMON', 'CC6', 'CC7', 'C1', 'ISO27001', 'PCI', 'SOX'],
    '26-asset-management-cryptographic-inventory.md',
    $$---
title: Asset Management and Cryptographic Inventory
slug: asset-management-cryptographic-inventory
tsc_category: Universal
criteria_mapped:
  - COMMON
  - CC6
  - CC7
  - C1
  - ISO27001
  - PCI
  - SOX
generated_for: {{organization_name}}
effective_date: {{effective_date}}
version: {{policy_version}}
---

# Asset Management and Cryptographic Inventory

## Purpose
{{organization_name}} maintains an asset and cryptographic inventory to support SOC 2, ISO 27001, SOX / ITGC, PCI-DSS, HIPAA, and privacy control expectations.

## Asset Inventory
| Asset / System | Type | Environment | Data Classification | Owner | Criticality | Evidence Location |
| --- | --- | --- | --- | --- | --- | --- |
| {{primary_product_name}} production application | Application | Production | Confidential / regulated as applicable | {{system_owner_name}} | High | System Description |
| Identity provider: {{idp_provider}} | Identity service | Production | Workforce identity data | {{control_operator}} | High | Access-control evidence |
| Ticketing system: {{ticketing_system}} | Workflow system | Production | Operational and incident records | {{control_operator}} | Medium | Ticket exports |

## Cryptographic Inventory
| Mechanism | Purpose | Algorithm / Standard | Key Owner | Rotation Cadence | Storage / Service | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| Data at rest encryption | Protect stored customer and company data | AES-256 or provider equivalent | {{control_operator}} | {{key_rotation_frequency}} | Cloud KMS or managed service | Encryption configuration |
| Data in transit encryption | Protect network transmission | TLS {{minimum_tls_version}} or stronger | {{control_operator}} | Certificate lifecycle | Load balancer / application endpoint | TLS scan or certificate record |
| Backup encryption | Protect backup copies | Provider-managed encryption | {{control_operator}} | {{key_rotation_frequency}} | Backup service | Backup configuration |

## Review Procedure
- Inventory owners review assets and cryptographic mechanisms {{cryptographic_inventory_review_frequency}}.
- New systems, data stores, keys, certificates, payment components, PHI stores, or privacy-impacting datasets must be added before production use.
- Retired assets must be removed only after data disposal, access revocation, and evidence retention are complete.
- Weak, deprecated, unknown, or undocumented algorithms are tracked as remediation items in {{ticketing_system}}.
$$,
    '{
      "organization_name": "Example Corp",
      "primary_product_name": "Example Cloud",
      "effective_date": "2026-04-18",
      "policy_version": "v0.1",
      "system_owner_name": "Head of Security",
      "control_operator": "Control Operator",
      "idp_provider": "Okta",
      "ticketing_system": "Jira",
      "minimum_tls_version": "1.2",
      "key_rotation_frequency": "annually or upon suspected compromise",
      "cryptographic_inventory_review_frequency": "quarterly"
    }'::jsonb,
    true
  ),
  (
    'sox-itgc-control-matrix',
    'SOX IT General Controls Matrix',
    'SOX-oriented IT general controls matrix for entity-level governance, access, change management, and system operations.',
    'SOX / ITGC',
    array['COMMON', 'SOX'],
    '27-sox-itgc-control-matrix.md',
    $$---
title: SOX IT General Controls Matrix
slug: sox-itgc-control-matrix
tsc_category: SOX / ITGC
criteria_mapped:
  - COMMON
  - SOX
generated_for: {{organization_name}}
effective_date: {{effective_date}}
version: {{policy_version}}
---

# SOX IT General Controls Matrix

## Purpose
{{organization_name}} maintains this matrix to map IT general controls that may support Sarbanes-Oxley (SOX) internal control over financial reporting (ICFR), IPO readiness, parent-company control requests, and internal-audit evidence collection.

## Scoping Note
- This is a baseline ITGC matrix, not a legal determination that {{primary_product_name}} is in scope for SOX.
- Selected SOX / ITGC driver: {{sox_applicability_label}}.
- Finance, controllership, internal audit, and system owners should confirm whether the product, connected systems, key reports, interfaces, or spreadsheets affect financial reporting.

## ITGC Matrix
| Control Domain | Control Objective | TrustScaffold Baseline | Typical Evidence | Owner | Review Frequency | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Entity-level governance | Management assigns control ownership, review cadence, and escalation for ITGC issues. | Policy governance, internal audit cadence, and management review operate through the security baseline. | Policy approvals, governance meeting minutes, deficiency log | {{sox_control_owner}} | {{sox_review_frequency}} | Draft |
| User provisioning | Access to in-scope systems is approved before access is granted. | Access requests, approvals, and onboarding flow are documented through the access-control policy and {{hris_provider}} lifecycle process. | Access tickets, approval records, onboarding evidence | {{control_operator}} | {{sox_access_review_frequency}} | Draft |
| Access modification and removal | Role changes and terminations are reflected promptly in connected systems. | Joiner / mover / leaver control relies on {{hris_provider}}, {{idp_provider}}, and the offboarding SLA. | HR change record, termination ticket, deprovisioning screenshots | {{control_operator}} | {{sox_access_review_frequency}} | Draft |
| Privileged access | Elevated access is limited, approved, and reviewed. | MFA, privileged-access restriction, and periodic review expectations are part of the baseline control set. | Admin roster, privileged group export, MFA policy, review sign-off | {{control_operator}} | {{sox_access_review_frequency}} | Draft |
| Access recertification | Management reviews access for key systems on a recurring basis. | Quarterly access review cadence is expected for systems with material operational or reporting impact. | Access review workbook, reviewer sign-off, remediation tickets | {{sox_control_owner}} | {{sox_access_review_frequency}} | Draft |
| Change management | Changes are authorized, tested, reviewed, and promoted through controlled workflows. | Changes to {{primary_product_name}} move through {{source_control_tool}} and {{ticketing_system}} with peer review and approval expectations. | Change ticket, pull request, test evidence, deployment log | {{control_operator}} | {{sox_change_review_frequency}} | Draft |
| Emergency changes | Emergency changes are separately identified, approved, and retrospectively reviewed. | Emergency changes follow the baseline change policy and require after-the-fact review. | Emergency ticket, incident reference, post-change approval | {{control_operator}} | {{sox_change_review_frequency}} | Draft |
| Job operations and monitoring | Scheduled jobs, incident response, and production exceptions are monitored and resolved. | Incident, monitoring, and backup controls create the baseline operating evidence set. | Monitoring alerts, incident tickets, failed-job log, backup results | {{control_operator}} | {{sox_review_frequency}} | Draft |
| Interfaces and key reports | Systems and reports used in reporting or reconciliations are inventoried and reviewed. | To be completed during finance and internal-audit scoping. | Report inventory, interface list, reconciliation evidence | {{finance_system_owner}} | {{sox_review_frequency}} | To be scoped |

## Next Steps
1. Mark systems, reports, integrations, and data extracts that affect ICFR.
2. Assign owners for each access, change, and operations control.
3. Link each control to evidence retained in {{ticketing_system}}, {{source_control_tool}}, {{idp_provider}}, and related systems.
4. Add compensating controls where segregation of duties or automation is limited.
$$,
    '{
      "organization_name": "Example Corp",
      "primary_product_name": "Example Cloud",
      "effective_date": "2026-04-26",
      "policy_version": "v0.1",
      "sox_control_owner": "Head of Internal Controls",
      "finance_system_owner": "Controller",
      "control_operator": "Security Operations Lead",
      "sox_applicability_label": "Public company or IPO readiness",
      "sox_review_frequency": "quarterly",
      "sox_access_review_frequency": "quarterly",
      "sox_change_review_frequency": "per release with quarterly control-owner review",
      "hris_provider": "Workday",
      "idp_provider": "Okta",
      "source_control_tool": "GitHub",
      "ticketing_system": "Jira"
    }'::jsonb,
    true
  ),
  (
    'sox-evidence-request-list',
    'SOX Access and Change Evidence Request List',
    'SOX-oriented evidence request list for access management, change management, privileged access, and key-report controls.',
    'SOX / ITGC',
    array['COMMON', 'SOX'],
    '28-sox-evidence-request-list.md',
    $$---
title: SOX Access and Change Evidence Request List
slug: sox-evidence-request-list
tsc_category: SOX / ITGC
criteria_mapped:
  - COMMON
  - SOX
generated_for: {{organization_name}}
effective_date: {{effective_date}}
version: {{policy_version}}
---

# SOX Access and Change Evidence Request List

## Purpose
This checklist helps {{organization_name}} collect the evidence commonly requested for SOX ITGC reviews across access provisioning, privileged access, access recertification, change management, deployments, and key-report controls for the selected driver: {{sox_applicability_label}}.

## Access Management Evidence
- [ ] Current user listings for in-scope systems from {{idp_provider}} and connected applications.
- [ ] New-access requests with documented approval.
- [ ] Role-change requests and approvals.
- [ ] Termination / offboarding samples showing revocation within {{termination_sla_hours}} hours.
- [ ] Privileged-access roster and business justification.
- [ ] MFA policy screenshots or configuration exports.
- [ ] Quarterly access review sign-off package covering key systems.

## Change Management Evidence
- [ ] Change tickets from {{ticketing_system}} tied to releases or production changes.
- [ ] Pull requests or merge requests from {{source_control_tool}} showing reviewer approval.
- [ ] Test evidence for selected changes.
- [ ] Deployment log or release record.
- [ ] Emergency-change list with retrospective approval.
- [ ] Segregation-of-duties exceptions and compensating controls, if any.

## Operations and Monitoring Evidence
- [ ] Monitoring alerts and incident tickets for material production events.
- [ ] Backup success / restore evidence for critical environments.
- [ ] Problem-management or recurring-issue tracking for failed jobs, integrations, or reconciliations.

## Key Reports and Interfaces
- [ ] Inventory of key reports, data extracts, spreadsheets, and interfaces used in financial reporting or management review.
- [ ] Evidence showing report logic or query ownership.
- [ ] Review or reconciliation evidence for report completeness and accuracy.
- [ ] Change evidence when report logic, interface mappings, or spreadsheet formulas change.

## Review Notes
- Access evidence should be refreshed {{sox_access_review_frequency}}.
- Change-control evidence should be retained {{sox_change_review_frequency}}.
- Internal audit, finance, and system owners should confirm whether additional population exports or reconciliations are required for ICFR scoping.
$$,
    '{
      "organization_name": "Example Corp",
      "effective_date": "2026-04-26",
      "policy_version": "v0.1",
      "idp_provider": "Okta",
      "source_control_tool": "GitHub",
      "ticketing_system": "Jira",
      "termination_sla_hours": 24,
      "sox_applicability_label": "Public company or IPO readiness",
      "sox_access_review_frequency": "quarterly",
      "sox_change_review_frequency": "per release with quarterly control-owner review"
    }'::jsonb,
    true
  ),
  (
    'sox-key-report-inventory',
    'SOX Key Report Inventory',
    'SOX-oriented inventory of key reports, spreadsheet dependencies, management reviews, and evidence owners.',
    'SOX / ITGC',
    array['COMMON', 'SOX'],
    '29-sox-key-report-inventory.md',
    $$---
title: SOX Key Report Inventory
slug: sox-key-report-inventory
tsc_category: SOX / ITGC
criteria_mapped:
  - COMMON
  - SOX
generated_for: {{organization_name}}
effective_date: {{effective_date}}
version: {{policy_version}}
---

# SOX Key Report Inventory

## Purpose
{{organization_name}} maintains this inventory to identify key reports, data extracts, spreadsheets, and management-review artifacts that may support financial reporting controls for {{sox_applicability_label}}.

## Key Report Register
| Report / Spreadsheet | Business Purpose | Source System | Owner | Logic Owner | Review Control | Evidence Location |
| --- | --- | --- | --- | --- | --- | --- |
| Revenue or billing exception report | Detect unusual billing events or missing approvals | {{primary_product_name}} or connected finance workflow | {{finance_system_owner}} | {{control_operator}} | Management review with sign-off | {{ticketing_system}} or finance evidence folder |
| Access review population export | Support quarterly access recertification | {{idp_provider}} and in-scope applications | {{sox_control_owner}} | {{control_operator}} | Reviewer sign-off and remediation tracking | {{ticketing_system}} |
| Change approval population | Support release and deployment review | {{source_control_tool}} and {{ticketing_system}} | {{control_operator}} | {{control_operator}} | Control-owner review | {{ticketing_system}} |

## Review Guidance
- Confirm whether the report is complete and accurate enough to support management review.
- Record where the logic lives: query, report builder, spreadsheet formula, BI layer, or manual extract.
- Capture changes to logic, source fields, or reconciliation expectations through change management.
- Revalidate the inventory {{sox_review_frequency}} and after material report changes.
$$,
    '{
      "organization_name": "Example Corp",
      "effective_date": "2026-04-26",
      "policy_version": "v0.1",
      "primary_product_name": "Example Cloud",
      "finance_system_owner": "Controller",
      "sox_control_owner": "Head of Internal Controls",
      "control_operator": "Security Operations Lead",
      "ticketing_system": "Jira",
      "idp_provider": "Okta",
      "source_control_tool": "GitHub",
      "sox_applicability_label": "Public company or IPO readiness",
      "sox_review_frequency": "quarterly"
    }'::jsonb,
    true
  ),
  (
    'sox-interface-control-register',
    'SOX Interface Control Register',
    'SOX-oriented register for inbound and outbound interfaces, reconciliations, exception handling, and change ownership.',
    'SOX / ITGC',
    array['COMMON', 'SOX'],
    '30-sox-interface-control-register.md',
    $$---
title: SOX Interface Control Register
slug: sox-interface-control-register
tsc_category: SOX / ITGC
criteria_mapped:
  - COMMON
  - SOX
generated_for: {{organization_name}}
effective_date: {{effective_date}}
version: {{policy_version}}
---

# SOX Interface Control Register

## Purpose
{{organization_name}} maintains this register to document interfaces, file transfers, and system dependencies that may affect financial reporting or management-review controls for {{sox_applicability_label}}.

## Interface Register
| Interface | Direction | Data / Purpose | Source | Destination | Control Owner | Reconciliation / Monitoring | Change Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Product-to-finance export | Outbound | Usage, billing, or adjustment data | {{primary_product_name}} | Finance workflow or data mart | {{finance_system_owner}} | Scheduled reconciliation, exception review, and ticket escalation | Pull request, ticket, deployment log |
| Identity-to-access review export | Outbound | User and privileged-access population | {{idp_provider}} | Access review package | {{sox_control_owner}} | Quarterly access review and remediation log | Ticket export and reviewer sign-off |
| Change-management evidence feed | Inbound | Approved change, deployment, and emergency-change records | {{ticketing_system}} / {{source_control_tool}} | SOX evidence package | {{control_operator}} | Control-owner review and completeness check | Ticket, PR, and release evidence |

## Control Notes
- Record the population owner, completeness check, reconciliation owner, and exception path for each interface.
- Changes to interfaces, mappings, schedules, or reconciliation logic should follow formal change control.
- Failed runs, data mismatches, and manual workarounds should be tracked in {{ticketing_system}} and reviewed {{sox_review_frequency}}.
$$,
    '{
      "organization_name": "Example Corp",
      "effective_date": "2026-04-26",
      "policy_version": "v0.1",
      "primary_product_name": "Example Cloud",
      "finance_system_owner": "Controller",
      "sox_control_owner": "Head of Internal Controls",
      "control_operator": "Security Operations Lead",
      "ticketing_system": "Jira",
      "idp_provider": "Okta",
      "source_control_tool": "GitHub",
      "sox_applicability_label": "Public company or IPO readiness",
      "sox_review_frequency": "quarterly"
    }'::jsonb,
    true
  ),
  (
    'complementary-user-entity-controls-matrix',
    'Complementary User Entity Controls Matrix',
    'Customer-operated controls that must function alongside the TrustScaffold-generated control set.',
    'Universal',
    array['COMMON', 'CC6', 'CC7', 'CC9'],
    '31-complementary-user-entity-controls-matrix.md',
    $$---
title: Complementary User Entity Controls Matrix
slug: complementary-user-entity-controls-matrix
tsc_category: Universal
criteria_mapped:
  - COMMON
  - CC6
  - CC7
  - CC9
generated_for: {{organization_name}}
effective_date: {{effective_date}}
version: {{policy_version}}
---

# Complementary User Entity Controls Matrix

## Control Ownership
- Policy Owner: {{policy_owner}}
- Control Operator: {{control_operator}}

## Purpose
{{organization_name}} uses this matrix to document the controls that user entities must operate in order to rely on the services, safeguards, and monitoring described throughout the TrustScaffold readiness pack for {{primary_product_name}}.

## Usage Notes
- These controls are complementary to, not replacements for, the controls operated by {{organization_name}}.
- User entities should evaluate these expectations during onboarding, annual review, and after material service changes.
- This matrix should be shared with customer success, implementation, security review, and procurement stakeholders when control responsibility questions arise.

## Matrix
| Control Area | User Entity Responsibility | Why It Matters | Related TrustScaffold Controls | Example Evidence |
| --- | --- | --- | --- | --- |
{{#each cuec_rows}}
| {{area}} | {{customer_responsibility}} | {{rationale}} | {{related_controls}} | {{evidence_examples}} |
{{/each}}

## Review Guidance
- Review this matrix {{cuec_review_frequency}}.
- Reconfirm the matrix whenever authentication, data-sharing patterns, customer-managed integrations, or major vendor dependencies materially change.
- Escalate exceptions through the documented security or support contact path before relying on alternate customer-managed procedures.
$$,
    '{
      "organization_name": "Example Corp",
      "effective_date": "2026-05-01",
      "policy_version": "v0.1",
      "policy_owner": "Security Lead",
      "control_operator": "Compliance Manager",
      "primary_product_name": "Example Cloud",
      "cuec_review_frequency": "annually and after material service or dependency changes",
      "cuec_rows": [
        {
          "area": "Identity and access administration",
          "customer_responsibility": "Approve user access, maintain role appropriateness, and promptly remove access that is no longer needed.",
          "rationale": "Logical access controls rely on customer approval of users and privileges.",
          "related_controls": "Access Control and On/Offboarding Policy; Information Security Policy",
          "evidence_examples": "Access approval records and periodic access reviews."
        },
        {
          "area": "Incident and support coordination",
          "customer_responsibility": "Maintain current escalation contacts and validate support requesters before sensitive changes are made.",
          "rationale": "Timely incident handling depends on approved customer contacts and support authorization.",
          "related_controls": "Incident Response Plan; Vendor Management Policy",
          "evidence_examples": "Escalation matrices, support authorization records, and incident communications."
        }
      ]
    }'::jsonb,
    true
  ),
  (
    'complementary-subservice-organization-controls-register',
    'Complementary Subservice Organization Controls Register',
    'Register of material subservice organizations, assurance posture, and retained monitoring obligations.',
    'Universal',
    array['COMMON', 'CC3', 'CC6', 'CC9', 'ISO27001'],
    '32-complementary-subservice-organization-controls-register.md',
    $$---
title: Complementary Subservice Organization Controls Register
slug: complementary-subservice-organization-controls-register
tsc_category: Universal
criteria_mapped:
  - COMMON
  - CC3
  - CC6
  - CC9
  - ISO27001
generated_for: {{organization_name}}
effective_date: {{effective_date}}
version: {{policy_version}}
---

# Complementary Subservice Organization Controls Register

## Control Ownership
- Policy Owner: {{policy_owner}}
- Control Operator: {{control_operator}}

## Purpose
{{organization_name}} maintains this register to document third-party services, hosting platforms, and other subservice organizations that materially support {{primary_product_name}}, along with the control model used to evaluate those dependencies.

## Dependency Summary
- Material subservice organizations listed: {{subservice_count}}
- Inclusive method dependencies: {{inclusive_subservice_count}}
- Carve-out method dependencies: {{carve_out_subservice_count}}
- Dependencies without current assurance evidence: {{subservice_without_assurance_count}}

## Register
| Subservice Organization | Service Scope | Data Shared / Dependency | Assurance Basis | Control Model | Retained {{organization_name}} Controls | Customer Monitoring Considerations | Review Cadence |
| --- | --- | --- | --- | --- | --- | --- | --- |
{{#each csoc_rows}}
| {{vendor_name}} | {{service_scope}} | {{data_shared}} | {{assurance_basis}} | {{control_model}} | {{trustscaffold_controls}} | {{customer_monitoring}} | {{review_cadence}} |
{{/each}}

## Review Guidance
- Review this register {{csoc_review_frequency}}.
- Update the register when a new material subservice organization is onboarded, when an assurance report expires or changes method, or when a bridge period introduces compensating controls.
- Where the control model is carve-out, confirm downstream user-control considerations are disclosed to affected customers and reflected in related CUEC materials.
$$,
    '{
      "organization_name": "Example Corp",
      "effective_date": "2026-05-01",
      "policy_version": "v0.1",
      "policy_owner": "Security Lead",
      "control_operator": "Compliance Manager",
      "primary_product_name": "Example Cloud",
      "subservice_count": 2,
      "inclusive_subservice_count": 1,
      "carve_out_subservice_count": 1,
      "subservice_without_assurance_count": 0,
      "csoc_review_frequency": "quarterly vendor review and after material dependency changes",
      "csoc_rows": [
        {
          "vendor_name": "AWS",
          "service_scope": "Cloud hosting platform",
          "data_shared": "Application workloads and encrypted data",
          "assurance_basis": "SOC 2 Type II using the inclusive method",
          "control_model": "Inclusive method",
          "trustscaffold_controls": "Map AWS assurance coverage into the vendor review process and track any exceptions.",
          "customer_monitoring": "Understand the dependency and confirm approved configurations remain in place.",
          "review_cadence": "Annual review"
        },
        {
          "vendor_name": "Support Vendor",
          "service_scope": "Ticketing and support workflow",
          "data_shared": "Support metadata and limited customer context",
          "assurance_basis": "SOC 2 Type II using the carve-out method",
          "control_model": "Carve-out method",
          "trustscaffold_controls": "Retain complementary monitoring and evaluate user-control considerations from the vendor.",
          "customer_monitoring": "Review disclosed carve-out assumptions and confirm approved configurations remain aligned.",
          "review_cadence": "Quarterly review"
        }
      ]
    }'::jsonb,
    true
  ),
  (
    'management-assertion-letter',
    'Management Assertion Letter',
    'Draft management assertion summarizing scope, control responsibility, and current focus areas for the generated reviewer pack.',
    'Universal',
    array['COMMON', 'CC1', 'CC2', 'CC3', 'CC4'],
    '33-management-assertion-letter.md',
    $$---
title: Management Assertion Letter
slug: management-assertion-letter
tsc_category: Universal
criteria_mapped:
  - COMMON
  - CC1
  - CC2
  - CC3
  - CC4
generated_for: {{organization_name}}
effective_date: {{effective_date}}
version: {{policy_version}}
---

# Management Assertion Letter

## Control Ownership
- Policy Owner: {{policy_owner}}
- Control Operator: {{control_operator}}
- Executive Sponsor: {{executive_sponsor_name}}

## Draft Assertion
Management of {{organization_name}} is responsible for establishing, implementing, and maintaining controls over {{primary_product_name}} and the supporting processes, infrastructure, people, and dependencies described in the TrustScaffold reviewer pack.

{{management_assertion_coverage_statement}}

Management asserts that:
- The system description, complementary control materials, and generated policy set describe the current intended operating model for {{primary_product_name}} as of {{effective_date}}.
- Control responsibilities that remain with customers, vendors, and subservice organizations are identified in the generated reviewer-pack materials where applicable.
- The attached documentation set is intended to support readiness discussions, auditor scoping, customer security reviews, and formal remediation planning.

## Scope Summary
- Selected trust service categories and related frameworks: {{selected_trust_service_categories_text}}
- Generated reviewer-pack documents: {{generated_document_count}}
- Primary system owner: {{system_owner_name}}
- Security contact: {{security_contact_email}}

## Included Generated Documents
| Document | TSC / Framework | Criteria Hint | Output |
| --- | --- | --- | --- |
{{#each generated_document_rows}}
| {{name}} | {{tsc}} | {{criteria_hint}} | {{output_filename}} |
{{/each}}

## Current Management Focus Areas
{{#if management_assertion_focus_area_count}}
{{#each management_assertion_focus_areas}}
### {{title}}
- Wizard step: {{step}}
- Current signal: {{summary}}
- Management follow-up: {{recommendation}}
{{/each}}
{{else}}
Management did not identify any active focus areas from the current wizard decision trace at the time this draft was produced.
{{/if}}

## Limitations of This Draft
- This letter is a draft management assertion generated from current wizard answers and should be reviewed against actual operating evidence before external use.
- If the operating model, control ownership, vendor profile, or scope changes materially, management should regenerate the reviewer pack and reconfirm the assertions above.
$$,
    '{
      "organization_name": "Example Corp",
      "effective_date": "2026-05-01",
      "policy_version": "v0.1",
      "policy_owner": "Security Lead",
      "control_operator": "Compliance Manager",
      "executive_sponsor_name": "Chief Operating Officer",
      "primary_product_name": "Example Cloud",
      "management_assertion_coverage_statement": "Example Corp prepared documentation covering Security, Availability, and Confidentiality based on the current wizard profile and supporting operating assumptions.",
      "selected_trust_service_categories_text": "Security, Availability, and Confidentiality",
      "generated_document_count": 3,
      "system_owner_name": "Platform Owner",
      "security_contact_email": "security@example.com",
      "generated_document_rows": [
        {
          "name": "System Description (DC 200)",
          "tsc": "Security",
          "criteria_hint": "All Security common criteria",
          "output_filename": "00-system-description.md"
        },
        {
          "name": "Complementary User Entity Controls Matrix",
          "tsc": "Universal",
          "criteria_hint": "Common criteria, logical access, incident response, and vendor dependencies",
          "output_filename": "31-complementary-user-entity-controls-matrix.md"
        },
        {
          "name": "Complementary Subservice Organization Controls Register",
          "tsc": "Universal",
          "criteria_hint": "Common criteria, vendor risk, access, supplier dependencies, and ISO supplier governance",
          "output_filename": "32-complementary-subservice-organization-controls-register.md"
        }
      ],
      "management_assertion_focus_area_count": 2,
      "management_assertion_focus_areas": [
        {
          "title": "MFA is not currently required",
          "step": "Operations",
          "summary": "MFA is one of the first technically-enforced controls auditors look for.",
          "recommendation": "Capture the real blocker now so the remediation plan can be specific instead of generic."
        },
        {
          "title": "No formal oversight body selected",
          "step": "Governance",
          "summary": "No board or advisory group means the wizard should ask how security and risk oversight actually happens today.",
          "recommendation": "Document the real oversight path so generated governance language stays truthful."
        }
      ]
    }'::jsonb,
    true
  ),
  (
    'points-of-focus-gap-analysis',
    'Points of Focus Gap Analysis',
    'Rule-matrix-driven remediation and evidence worklist linked to generated document coverage.',
    'Universal',
    array['COMMON', 'CC1', 'CC2', 'CC3', 'CC4', 'CC6', 'CC7', 'CC8', 'CC9'],
    '34-points-of-focus-gap-analysis.md',
    $$---
title: Points of Focus Gap Analysis
slug: points-of-focus-gap-analysis
tsc_category: Universal
criteria_mapped:
  - COMMON
  - CC1
  - CC2
  - CC3
  - CC4
  - CC6
  - CC7
  - CC8
  - CC9
generated_for: {{organization_name}}
effective_date: {{effective_date}}
version: {{policy_version}}
---

# Points of Focus Gap Analysis

## Control Ownership
- Policy Owner: {{policy_owner}}
- Control Operator: {{control_operator}}

## Purpose
{{organization_name}} uses this gap analysis to translate active wizard findings into an assessor-style readiness matrix covering criterion intent, evidence expectations, and concrete remediation before an auditor or customer relies on the generated pack.

## Analysis Basis
- Active points of focus identified: {{points_of_focus_gap_count}}
- Selected criteria in scope: {{selected_criteria_codes}}
- Generated reviewer-pack documents considered: {{generated_document_count}}

## Assessor Readiness Matrix
{{#if points_of_focus_gap_count}}
| Priority | Primary Criterion | Criterion Theme | Point of Focus | Wizard Step | Focus Area | Severity | Owner | Status | Signal Type | Assessment Basis | Expected Evidence | Target State | Related Generated Documents |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
{{#each points_of_focus_gap_rows}}
| {{priority_rank}} | {{primary_criterion}} | {{criterion_title}} | {{point_of_focus}} | {{step}} | {{focus_area}} | {{severity}} | {{owner}} | {{status}} | {{signal_type}} | {{assessment_basis}} | {{expected_evidence}} | {{target_state}} | {{related_documents}} |
{{/each}}
{{else}}
No active readiness gaps or evidence prompts were identified from the current wizard decision trace at the time this matrix was generated.
{{/if}}

## How To Use This Matrix
- Start with the lowest-numbered rows and any entries marked `High` severity, then confirm the `Expected Evidence` exists before treating the mapped criterion as audit-ready.
- Use the `Point of Focus` and `Target State` columns as the assessor-style statement of what management should be able to demonstrate for that row.
- Where multiple rows point to the same generated document, update the source policy or supporting evidence once and record how the change satisfies each mapped criterion.
- Re-run the wizard and regenerate the reviewer pack after material remediation so this matrix reflects the current operating model rather than stale decisions.
$$,
    '{
      "organization_name": "Example Corp",
      "effective_date": "2026-05-01",
      "policy_version": "v0.1",
      "policy_owner": "Security Lead",
      "control_operator": "Compliance Manager",
      "points_of_focus_gap_count": 2,
      "selected_criteria_codes": ["COMMON", "CC6", "CC8"],
      "generated_document_count": 3,
      "points_of_focus_gap_rows": [
        {
          "priority_rank": 1,
          "step": "Operations",
          "primary_criterion": "CC6.1",
          "criterion_title": "Logical and Physical Access Controls",
          "point_of_focus": "Identity, access, configuration, and data-handling controls are enforced across the shared-responsibility boundary.",
          "focus_area": "MFA is not currently required",
          "severity": "High",
          "owner": "Security Lead",
          "status": "Needs remediation",
          "signal_type": "Gap signal",
          "criteria": "CC6.1",
          "assessment_basis": "MFA is one of the first technically-enforced controls auditors look for.",
          "current_state": "MFA is one of the first technically-enforced controls auditors look for.",
          "expected_evidence": "Access approvals, MFA settings, tenant hardening records, joiner/mover/leaver tickets, and configuration evidence.",
          "target_state": "Capture the real blocker now so the remediation plan can be specific instead of generic.",
          "recommended_action": "Capture the real blocker now so the remediation plan can be specific instead of generic.",
          "related_documents": "Access Control and On/Offboarding Policy; Complementary User Entity Controls Matrix"
        },
        {
          "priority_rank": 2,
          "step": "Governance",
          "primary_criterion": "CC1.2",
          "criterion_title": "Control Environment",
          "point_of_focus": "Governance structure, control ownership, and oversight responsibilities are defined and evidenced.",
          "focus_area": "No formal oversight body selected",
          "severity": "Medium",
          "owner": "Security Lead",
          "status": "Needs evidence and decision",
          "signal_type": "Evidence prompt",
          "criteria": "CC1.2",
          "assessment_basis": "No board or advisory group means the wizard should ask how security and risk oversight actually happens today.",
          "current_state": "No board or advisory group means the wizard should ask how security and risk oversight actually happens today.",
          "expected_evidence": "Board or management-review records, org chart, role ownership assignments, policy acknowledgements, and governance meeting notes.",
          "target_state": "Document the real oversight path so generated governance language stays truthful.",
          "recommended_action": "Document the real oversight path so generated governance language stays truthful.",
          "related_documents": "Information Security Policy; Management Assertion Letter"
        }
      ]
    }'::jsonb,
    true
  ),
  (
    'bridge-letter-comfort-letter',
    'Bridge Letter / Comfort Letter',
    'Customer-facing current-state letter summarizing available documentation, active remediation priorities, and the next planned review date.',
    'Universal',
    array['COMMON', 'CC2', 'CC3', 'CC4'],
    '35-bridge-letter-comfort-letter.md',
    $$---
title: Bridge Letter / Comfort Letter
slug: bridge-letter-comfort-letter
tsc_category: Universal
criteria_mapped:
  - COMMON
  - CC2
  - CC3
  - CC4
generated_for: {{organization_name}}
effective_date: {{effective_date}}
version: {{policy_version}}
---

# Bridge Letter / Comfort Letter

## Control Ownership
- Executive Sponsor: {{executive_sponsor_name}}
- Policy Owner: {{policy_owner}}
- Control Operator: {{control_operator}}

## Current Status Summary
As of {{effective_date}}, {{organization_name}} has prepared the attached TrustScaffold reviewer-pack materials for {{primary_product_name}} to support customer diligence, readiness conversations, and current-state control communication.

{{bridge_letter_program_status}}

The current documentation set covers {{selected_trust_service_categories_text}} and includes {{generated_document_count}} generated documents describing the system boundary, policy framework, complementary controls, and current management follow-up priorities.

This customer-facing status view is scoped to {{bridge_letter_active_frameworks_text}} so privacy-oriented recipients see privacy-relevant follow-up items while HIPAA, PCI-DSS, or other framework-specific items appear only when those frameworks are relevant to the current pack.

## Customer Communication Notes
- This letter is intended to bridge the period between formal assessments, refreshed evidence requests, or customer-specific diligence reviews.
- The attached materials describe management’s current understanding of the operating model, control ownership, and prioritized remediation items.
- Customers should review the complementary user-entity and subservice-organization control materials alongside this letter when evaluating shared responsibility assumptions.

## Available Documentation Snapshot
| Document | TSC / Framework | Output |
| --- | --- | --- |
{{#each generated_document_rows}}
| {{name}} | {{tsc}} | {{output_filename}} |
{{/each}}

## Highest-Priority Active Follow-Up Items
{{#if bridge_letter_customer_priority_count}}
| Priority | Focus Area | Framework Scope | Customer View | Review Owner | Current Follow-Up |
| --- | --- | --- | --- | --- | --- |
{{#each bridge_letter_customer_priorities}}
| {{priority_rank}} | {{focus_area}} | {{framework_scope}} | {{priority_band}} | {{review_owner}} | {{customer_follow_up}} |
{{/each}}
{{else}}
No active follow-up items were identified from the current wizard decision trace at the time this letter was generated.
{{/if}}

## Primary Audience View
{{#if bridge_letter_has_primary_audience}}
### {{bridge_letter_primary_audience.label}}
- Audience scope: {{bridge_letter_primary_audience.framework_scope_text}}
- Why this view exists: {{bridge_letter_primary_audience.description}}
{{#if bridge_letter_primary_audience.priority_count}}
| Priority | Focus Area | Framework Scope | Customer View | Review Owner |
| --- | --- | --- | --- | --- |
{{#each bridge_letter_primary_audience.priorities}}
| {{priority_rank}} | {{focus_area}} | {{framework_scope}} | {{customer_view}} | {{review_owner}} |
{{/each}}
{{else}}
No customer-facing priorities currently map to the primary audience profile.
{{/if}}
{{else}}
No primary audience profile is currently derived from the active framework profile.
{{/if}}

## Additional Audience Views
{{#if bridge_letter_additional_audience_count}}
{{#each bridge_letter_additional_audiences}}
### {{label}}
- Audience scope: {{framework_scope_text}}
- Why this view exists: {{description}}
{{#if priority_count}}
| Priority | Focus Area | Framework Scope | Customer View | Review Owner |
| --- | --- | --- | --- | --- |
{{#each priorities}}
| {{priority_rank}} | {{focus_area}} | {{framework_scope}} | {{customer_view}} | {{review_owner}} |
{{/each}}
{{else}}
No customer-facing priorities currently map to this audience profile.
{{/if}}
{{/each}}
{{else}}
No additional audience-specific views are currently derived beyond the primary audience profile.
{{/if}}

## Next Review Date
Management expects to review and refresh this bridge letter, the associated prioritized gap register, and the supporting generated documentation no later than {{bridge_letter_next_review_date}}, or earlier if the system boundary, customer commitments, or control environment changes materially.
$$,
    '{
      "organization_name": "Example Corp",
      "effective_date": "2026-05-01",
      "policy_version": "v0.1",
      "executive_sponsor_name": "Chief Operating Officer",
      "policy_owner": "Security Lead",
      "control_operator": "Compliance Manager",
      "primary_product_name": "Example Cloud",
      "bridge_letter_program_status": "Control environment is active and maturing, with customer-relevant diligence items currently being tracked by management.",
      "bridge_letter_active_frameworks_text": "Security and Privacy",
      "bridge_letter_has_primary_audience": true,
      "bridge_letter_primary_audience": {
        "label": "Privacy-sensitive customer",
        "description": "Customer-facing view for customers focused on personal-data handling, privacy notices, and privacy program obligations.",
        "framework_scope_text": "Security and Privacy",
        "priority_count": 1,
        "priorities": [
          {
            "priority_rank": 1,
            "focus_area": "Cookies or analytics without consent tooling",
            "framework_scope": "Privacy",
            "customer_view": "Immediate customer diligence item",
            "review_owner": "Security Lead"
          }
        ]
      },
      "bridge_letter_additional_audience_count": 1,
      "bridge_letter_additional_audiences": [
        {
          "label": "General security customer",
          "description": "Default customer-facing status view for customers reviewing baseline security and shared-responsibility expectations.",
          "framework_scope_text": "Security",
          "priority_count": 2,
          "priorities": [
            {
              "priority_rank": 1,
              "focus_area": "MFA is not currently required",
              "framework_scope": "Security",
              "customer_view": "Immediate customer diligence item",
              "review_owner": "Security Lead"
            },
            {
              "priority_rank": 2,
              "focus_area": "No formal oversight body selected",
              "framework_scope": "Security",
              "customer_view": "Shared-responsibility follow-up",
              "review_owner": "Chief Operating Officer"
            }
          ]
        }
      ],
      "bridge_letter_audience_profile_count": 2,
      "bridge_letter_audience_profiles": [
        {
          "label": "General security customer",
          "description": "Default customer-facing status view for customers reviewing baseline security and shared-responsibility expectations.",
          "framework_scope_text": "Security",
          "priority_count": 2,
          "priorities": [
            {
              "priority_rank": 1,
              "focus_area": "MFA is not currently required",
              "framework_scope": "Security",
              "customer_view": "Immediate customer diligence item",
              "review_owner": "Security Lead"
            },
            {
              "priority_rank": 2,
              "focus_area": "No formal oversight body selected",
              "framework_scope": "Security",
              "customer_view": "Shared-responsibility follow-up",
              "review_owner": "Chief Operating Officer"
            }
          ]
        },
        {
          "label": "Privacy-sensitive customer",
          "description": "Customer-facing view for customers focused on personal-data handling, privacy notices, and privacy program obligations.",
          "framework_scope_text": "Security and Privacy",
          "priority_count": 1,
          "priorities": [
            {
              "priority_rank": 1,
              "focus_area": "Cookies or analytics without consent tooling",
              "framework_scope": "Privacy",
              "customer_view": "Immediate customer diligence item",
              "review_owner": "Security Lead"
            }
          ]
        }
      ],
      "selected_trust_service_categories_text": "Security, Availability, and Confidentiality",
      "generated_document_count": 3,
      "generated_document_rows": [
        {
          "name": "System Description (DC 200)",
          "tsc": "Security",
          "output_filename": "00-system-description.md"
        },
        {
          "name": "Points of Focus Gap Analysis",
          "tsc": "Universal",
          "output_filename": "34-points-of-focus-gap-analysis.md"
        },
        {
          "name": "Management Assertion Letter",
          "tsc": "Universal",
          "output_filename": "33-management-assertion-letter.md"
        }
      ],
      "bridge_letter_customer_priority_count": 2,
      "bridge_letter_customer_priorities": [
        {
          "priority_rank": 1,
          "focus_area": "MFA is not currently required",
          "framework_scope": "Security",
          "priority_band": "Immediate customer diligence item",
          "review_owner": "Security Lead",
          "customer_follow_up": "Management is tracking capture the real blocker now so the remediation plan can be specific instead of generic."
        },
        {
          "priority_rank": 2,
          "focus_area": "No formal oversight body selected",
          "framework_scope": "Security",
          "priority_band": "Shared-responsibility follow-up",
          "review_owner": "Chief Operating Officer",
          "customer_follow_up": "Management is monitoring this area and incorporating the follow-up into the readiness workplan."
        }
      ],
      "bridge_letter_next_review_date": "2026-07-30"
    }'::jsonb,
    true
  ),
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

update public.templates
set
  markdown_template = regexp_replace(
    markdown_template,
    E'(^# [^\n]+\n)',
    E'\\1\n## Control Ownership\n- Policy Owner: {{policy_owner}}\n- Control Operator: {{control_operator}}\n\n',
    'm'
  ),
  default_variables = default_variables || '{"policy_owner": "Control Owner", "control_operator": "Control Operator"}'::jsonb,
  updated_at = now()
where markdown_template not like '%## Control Ownership%';

update public.templates
set
  markdown_template = replace(
    markdown_template,
    E'---\n\n#',
    E'---\n\n<!-- Mapping: ' || array_to_string(criteria_mapped, ', ') || E' -->\n\n#'
  ),
  updated_at = now()
where markdown_template not like '%<!-- Mapping:%';
