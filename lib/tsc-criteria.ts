/**
 * AICPA Trust Services Criteria (TSC) 2017 reference map.
 * Used by the Auditor Portal to render the criteria navigation and detail views.
 */

export type TscCriterion = {
  code: string;
  title: string;
  description: string;
  category: string;
};

export const TSC_CATEGORIES = [
  'Control Environment',
  'Communication and Information',
  'Risk Assessment',
  'Monitoring Activities',
  'Control Activities',
  'Logical and Physical Access Controls',
  'System Operations',
  'Change Management',
  'Risk Mitigation',
  'Availability',
  'Confidentiality',
  'Processing Integrity',
  'Privacy',
] as const;

export const TSC_CRITERIA: TscCriterion[] = [
  // CC1 – Control Environment
  { code: 'CC1.1', title: 'COSO Principle 1', description: 'The entity demonstrates a commitment to integrity and ethical values.', category: 'Control Environment' },
  { code: 'CC1.2', title: 'COSO Principle 2', description: 'The board of directors demonstrates independence from management and exercises oversight.', category: 'Control Environment' },
  { code: 'CC1.3', title: 'COSO Principle 3', description: 'Management establishes structures, reporting lines, and authorities.', category: 'Control Environment' },
  { code: 'CC1.4', title: 'COSO Principle 4', description: 'The entity demonstrates a commitment to attract, develop, and retain competent individuals.', category: 'Control Environment' },
  { code: 'CC1.5', title: 'COSO Principle 5', description: 'The entity holds individuals accountable for their internal control responsibilities.', category: 'Control Environment' },

  // CC2 – Communication and Information
  { code: 'CC2.1', title: 'COSO Principle 13', description: 'The entity obtains or generates and uses relevant, quality information.', category: 'Communication and Information' },
  { code: 'CC2.2', title: 'COSO Principle 14', description: 'The entity internally communicates information necessary to support the functioning of internal control.', category: 'Communication and Information' },
  { code: 'CC2.3', title: 'COSO Principle 15', description: 'The entity communicates with external parties regarding matters affecting the functioning of internal control.', category: 'Communication and Information' },

  // CC3 – Risk Assessment
  { code: 'CC3.1', title: 'COSO Principle 6', description: 'The entity specifies objectives with sufficient clarity to enable identification and assessment of risk.', category: 'Risk Assessment' },
  { code: 'CC3.2', title: 'COSO Principle 7', description: 'The entity identifies risks to the achievement of its objectives and analyzes risks.', category: 'Risk Assessment' },
  { code: 'CC3.3', title: 'COSO Principle 8', description: 'The entity considers the potential for fraud in assessing risks.', category: 'Risk Assessment' },
  { code: 'CC3.4', title: 'COSO Principle 9', description: 'The entity identifies and assesses changes that could significantly impact the system of internal control.', category: 'Risk Assessment' },

  // CC4 – Monitoring Activities
  { code: 'CC4.1', title: 'COSO Principle 16', description: 'The entity selects, develops, and performs ongoing and/or separate evaluations.', category: 'Monitoring Activities' },
  { code: 'CC4.2', title: 'COSO Principle 17', description: 'The entity evaluates and communicates internal control deficiencies in a timely manner.', category: 'Monitoring Activities' },

  // CC5 – Control Activities
  { code: 'CC5.1', title: 'COSO Principle 10', description: 'The entity selects and develops control activities that contribute to the mitigation of risks.', category: 'Control Activities' },
  { code: 'CC5.2', title: 'COSO Principle 11', description: 'The entity selects and develops general control activities over technology.', category: 'Control Activities' },
  { code: 'CC5.3', title: 'COSO Principle 12', description: 'The entity deploys control activities through policies that establish what is expected.', category: 'Control Activities' },

  // CC6 – Logical and Physical Access Controls
  { code: 'CC6.1', title: 'Logical Access Security', description: 'The entity implements logical access security software, infrastructure, and architectures to protect information assets.', category: 'Logical and Physical Access Controls' },
  { code: 'CC6.2', title: 'User Registration and Authorization', description: 'Prior to issuing system credentials, the entity registers and authorizes new internal and external users.', category: 'Logical and Physical Access Controls' },
  { code: 'CC6.3', title: 'Access Modification and Removal', description: 'The entity authorizes, modifies, or removes access to data, software, functions, and other protected assets.', category: 'Logical and Physical Access Controls' },
  { code: 'CC6.4', title: 'Physical Access Controls', description: 'The entity restricts physical access to facilities and protected information assets.', category: 'Logical and Physical Access Controls' },
  { code: 'CC6.5', title: 'Logical Access Disposal', description: 'The entity discontinues logical and physical protections over physical assets only after the ability to read or recover data has been diminished.', category: 'Logical and Physical Access Controls' },
  { code: 'CC6.6', title: 'External Access Controls', description: 'The entity implements logical access security measures to protect against threats from sources outside its system boundaries.', category: 'Logical and Physical Access Controls' },
  { code: 'CC6.7', title: 'Data Transmission Security', description: 'The entity restricts the transmission, movement, and removal of information to authorized internal and external users.', category: 'Logical and Physical Access Controls' },
  { code: 'CC6.8', title: 'Threat Detection', description: 'The entity implements controls to prevent or detect and act upon the introduction of unauthorized or malicious software.', category: 'Logical and Physical Access Controls' },

  // CC7 – System Operations
  { code: 'CC7.1', title: 'Vulnerability Management', description: 'The entity uses detection and monitoring procedures to identify changes to configurations.', category: 'System Operations' },
  { code: 'CC7.2', title: 'Security Event Monitoring', description: 'The entity monitors system components and the operation for anomalies.', category: 'System Operations' },
  { code: 'CC7.3', title: 'Incident Response', description: 'The entity evaluates security events to determine whether they could constitute incidents.', category: 'System Operations' },
  { code: 'CC7.4', title: 'Incident Containment', description: 'The entity responds to identified security incidents by executing a defined incident response program.', category: 'System Operations' },
  { code: 'CC7.5', title: 'Incident Recovery', description: 'The entity identifies, develops, and implements activities to recover from identified security incidents.', category: 'System Operations' },

  // CC8 – Change Management
  { code: 'CC8.1', title: 'Change Authorization', description: 'The entity authorizes, designs, develops or acquires, configures, documents, tests, approves, and implements changes to infrastructure, data, software, and procedures.', category: 'Change Management' },

  // CC9 – Risk Mitigation
  { code: 'CC9.1', title: 'Risk Identification and Assessment', description: 'The entity identifies, selects, and develops risk mitigation activities for risks arising from potential business disruptions.', category: 'Risk Mitigation' },
  { code: 'CC9.2', title: 'Vendor Risk Management', description: 'The entity assesses and manages risks associated with vendors and business partners.', category: 'Risk Mitigation' },

  // A1 – Availability
  { code: 'A1.1', title: 'Capacity Management', description: 'The entity maintains, monitors, and evaluates current processing capacity and use of system components.', category: 'Availability' },
  { code: 'A1.2', title: 'Environmental Protections', description: 'The entity authorizes, designs, develops or acquires, implements, operates, approves, maintains, and monitors environmental protections.', category: 'Availability' },
  { code: 'A1.3', title: 'Recovery Planning', description: 'The entity tests recovery plan procedures supporting system recovery to meet its objectives.', category: 'Availability' },

  // C1 – Confidentiality
  { code: 'C1.1', title: 'Confidential Information Identification', description: 'The entity identifies and maintains confidential information to meet the entity\'s objectives.', category: 'Confidentiality' },
  { code: 'C1.2', title: 'Confidential Information Disposal', description: 'The entity disposes of confidential information to meet the entity\'s objectives.', category: 'Confidentiality' },

  // PI1 – Processing Integrity
  { code: 'PI1.1', title: 'Processing Completeness and Accuracy', description: 'The entity obtains or generates, uses, and communicates relevant, quality information regarding processing objectives.', category: 'Processing Integrity' },
  { code: 'PI1.2', title: 'Processing Inputs', description: 'The entity implements policies and procedures over system inputs.', category: 'Processing Integrity' },
  { code: 'PI1.3', title: 'Processing Quality', description: 'The entity implements policies and procedures over system processing to result in products, services, and reporting to meet objectives.', category: 'Processing Integrity' },
  { code: 'PI1.4', title: 'Processing Outputs', description: 'The entity implements policies and procedures to make available or deliver output completely, accurately, and timely.', category: 'Processing Integrity' },
  { code: 'PI1.5', title: 'Processing Storage', description: 'The entity implements policies and procedures to store inputs, items in processing, and outputs completely, accurately, and timely.', category: 'Processing Integrity' },

  // P1–P8 – Privacy
  { code: 'P1.1', title: 'Privacy Notice', description: 'The entity provides notice to data subjects about its privacy practices.', category: 'Privacy' },
  { code: 'P2.1', title: 'Choice and Consent', description: 'The entity communicates choices available regarding the collection, use, retention, disclosure, and disposal of personal information.', category: 'Privacy' },
  { code: 'P3.1', title: 'Collection Limitation', description: 'Personal information is collected consistent with the entity\'s objectives related to privacy.', category: 'Privacy' },
  { code: 'P3.2', title: 'Collection Sources', description: 'For information requiring explicit consent, the entity communicates the need for such consent.', category: 'Privacy' },
  { code: 'P4.1', title: 'Use and Retention', description: 'The entity limits the use of personal information to the purposes identified in the entity\'s objectives.', category: 'Privacy' },
  { code: 'P4.2', title: 'Retention Period', description: 'The entity retains personal information consistent with the entity\'s objectives.', category: 'Privacy' },
  { code: 'P4.3', title: 'Disposal', description: 'The entity securely disposes of personal information to meet the entity\'s objectives.', category: 'Privacy' },
  { code: 'P5.1', title: 'Access by Data Subjects', description: 'The entity grants identified and authenticated data subjects the ability to access their stored personal information.', category: 'Privacy' },
  { code: 'P5.2', title: 'Correction Requests', description: 'The entity corrects, amends, or appends personal information based on information provided by data subjects.', category: 'Privacy' },
  { code: 'P6.1', title: 'Disclosure to Third Parties', description: 'The entity discloses personal information to third parties with the consent of the data subject.', category: 'Privacy' },
  { code: 'P6.2', title: 'Third Party Disclosures', description: 'The entity creates and retains a complete, accurate, and timely record of authorized disclosures.', category: 'Privacy' },
  { code: 'P6.3', title: 'Unauthorized Disclosures', description: 'The entity creates and retains a complete, accurate, and timely record of detected or reported unauthorized disclosures.', category: 'Privacy' },
  { code: 'P6.4', title: 'Third Party Authorization', description: 'The entity obtains privacy commitments from vendors and other third parties.', category: 'Privacy' },
  { code: 'P6.5', title: 'Third Party Compliance', description: 'The entity assesses compliance with privacy commitments of vendors and other third parties.', category: 'Privacy' },
  { code: 'P6.6', title: 'Data Subject Notification', description: 'The entity provides notification of breaches and incidents to affected data subjects, regulators, and others.', category: 'Privacy' },
  { code: 'P6.7', title: 'Account for Disclosures', description: 'The entity provides data subjects with an accounting of the personal information held and disclosed.', category: 'Privacy' },
  { code: 'P7.1', title: 'Data Quality', description: 'The entity collects and maintains accurate, up-to-date, complete, and relevant personal information.', category: 'Privacy' },
  { code: 'P8.1', title: 'Monitoring and Enforcement', description: 'The entity implements a process for receiving, addressing, resolving, and communicating complaints.', category: 'Privacy' },
];

/** Get TSC criteria grouped by category */
export function getCriteriaByCategory() {
  const grouped = new Map<string, TscCriterion[]>();

  for (const criterion of TSC_CRITERIA) {
    const existing = grouped.get(criterion.category) ?? [];
    existing.push(criterion);
    grouped.set(criterion.category, existing);
  }

  return grouped;
}

/** Get a single criterion by code */
export function getCriterionByCode(code: string) {
  return TSC_CRITERIA.find((c) => c.code === code) ?? null;
}

/** Map a template criteria_mapped array (CC6, CC7, etc.) to specific sub-criteria codes */
export function expandCriteriaCodes(codes: string[]): string[] {
  const expanded = new Set<string>();

  for (const code of codes) {
    for (const criterion of TSC_CRITERIA) {
      if (criterion.code.startsWith(code)) {
        expanded.add(criterion.code);
      }
    }
  }

  return [...expanded].sort();
}
