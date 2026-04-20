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
  - CC1
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

## Role Changes and Reviews
- Access is reviewed every {{access_review_frequency}}.
- Privileged roles are re-certified by the system owner.

## Offboarding
- Access revocation begins within {{offboarding_sla_hours}} hours of termination notice.
- Device return, token revocation, and credential invalidation are documented.

## Evidence
{{organization_name}} retains approval and revocation records in its ticketing and identity systems.
$$,
    '{
      "organization_name": "Example Corp",
      "effective_date": "2026-04-18",
      "policy_version": "v0.1",
      "approver_name": "Head of Security",
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

## Logging and Evidence
Security-relevant events from infrastructure, identity, and application layers are retained according to the log retention schedule.

## Cloud Context
{{#if uses_aws}}
- AWS CloudTrail, GuardDuty, and service-native logs are reviewed during incident investigation.
{{/if}}
{{#if uses_azure}}
- Azure Activity Logs, Entra ID logs, and Defender alerts are reviewed during incident investigation.
{{/if}}
$$,
    '{
      "organization_name": "Example Corp",
      "effective_date": "2026-04-18",
      "policy_version": "v0.1",
      "incident_commander_name": "Head of Security",
      "communications_lead_name": "Operations Lead",
      "executive_sponsor_name": "Chief Executive Officer",
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

## Emergency Changes
Emergency changes may bypass normal approval only to restore availability or reduce active risk, and must be retrospectively reviewed within {{post_incident_review_window}}.

## Infrastructure-Specific Requirements
{{#if uses_aws}}
- Infrastructure changes in AWS are performed through reviewed infrastructure-as-code repositories.
{{/if}}
{{#if uses_azure}}
- Platform and identity changes in Azure are tracked through pull requests and activity logs.
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
Continuity and recovery procedures are tested every {{bcdr_test_frequency}}.
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
| Vendor | Service Description | Assurance Review Cadence |
| --- | --- | --- |
{{#each subprocessors}}
| {{name}} | {{service_description}} | {{review_cadence}} |
{{/each}}
{{/if}}

## Review Cadence
Critical vendors are reviewed every {{vendor_review_frequency}}.
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

## Engineering Controls
- Code changes require peer review before merge.
- Dependencies are reviewed and patched based on severity.
- Security issues are tracked through remediation to closure.

## Validation
{{#if runs_sast}}
- Static analysis is executed on pull requests or pre-release builds.
{{/if}}
{{#if runs_dependency_scanning}}
- Dependency scanning is executed to identify known vulnerabilities.
{{/if}}
{{#if has_production_change_reviews}}
- Production-affecting changes require release approval and rollback planning.
{{/if}}
$$,
    '{
      "organization_name": "Example Corp",
      "effective_date": "2026-04-18",
      "policy_version": "v0.1",
      "runs_sast": true,
      "runs_dependency_scanning": true,
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
{{organization_name}} expects workforce members to use company systems responsibly, lawfully, and in a manner consistent with company values.

## Requirements
- Users must protect credentials and company-issued devices.
- Company systems may not be used for harassment, unlawful activity, or unauthorized disclosure.
- Security concerns must be reported to {{security_contact_email}}.

## Acknowledgement
All personnel acknowledge these expectations during onboarding and during annual policy review cycles.
$$,
    '{
      "organization_name": "Example Corp",
      "effective_date": "2026-04-18",
      "policy_version": "v0.1",
      "security_contact_email": "security@example.com"
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

## Governance & Control Environment Evidence (CC1.1–CC1.5)

### Integrity and Ethical Values (CC1.1)
{{#if has_employee_handbook}}
- [ ] Employee handbook (current version with revision date).
{{else}}
- [ ] **GAP**: Document rationale for not maintaining an employee handbook.
{{/if}}
{{#if has_code_of_conduct}}
- [ ] Code of conduct document (current version).
- [ ] Signed acknowledgement forms (new-hire acknowledgements and {{acknowledgement_cadence}} renewals).
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
- [ ] Training completion records from {{security_awareness_training_tool}} for all employees ({{training_cadence}} cadence).
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
- [ ] Penetration test report ({{penetration_test_frequency}} cadence) from qualified third party.
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

## Vendor and Subprocessor Evidence (CC9.2)
{{#if has_subprocessors}}
{{#each subprocessors}}
### {{name}}
- [ ] Security review package for {{name}} covering {{service_description}}.
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

## I. Company Overview

{{organization_name}} provides {{system_description}} deployed as a {{deployment_model}} application. This description covers the {{organization_name}} production system and supporting infrastructure for the period under examination.

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
{{organization_name}} shall establish an internal audit review cadence of at least **annual** frequency.
{{/if}}

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
- Policy acknowledgements are verified per the established cadence ({{acknowledgement_cadence}}).
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
- **{{name}}**: Data shared ({{data_shared}}) is subject to {{name}}'s retention and disposal procedures as evaluated during vendor review ({{review_cadence}} cadence).
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
