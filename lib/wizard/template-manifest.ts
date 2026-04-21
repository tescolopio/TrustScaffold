import type { WizardData } from './schema';

export interface TemplateManifestEntry {
  name: string;
  tsc: string;
  criteriaHint: string;
}

// Mirrors the active templates in the database seed.
// Security (CC1–CC9) is always included; optional TSCs add extra templates.
const SECURITY_TEMPLATES: TemplateManifestEntry[] = [
  { name: 'Information Security Policy', tsc: 'Security', criteriaHint: 'CC1–CC9' },
  { name: 'Access Control & Offboarding Policy', tsc: 'Security', criteriaHint: 'CC6' },
  { name: 'Incident Response Plan', tsc: 'Security', criteriaHint: 'CC7' },
  { name: 'Change Management Policy', tsc: 'Security', criteriaHint: 'CC8' },
  { name: 'Risk Management Policy', tsc: 'Security', criteriaHint: 'CC3, CC9' },
  { name: 'Vendor Management Policy', tsc: 'Security', criteriaHint: 'CC3, CC9' },
  { name: 'Secure SDLC Policy', tsc: 'Security', criteriaHint: 'CC8' },
  { name: 'Physical Security Policy', tsc: 'Security', criteriaHint: 'CC6' },
  { name: 'Acceptable Use Policy', tsc: 'Security', criteriaHint: 'CC1, CC2' },
  { name: 'Internal Audit & Monitoring Policy', tsc: 'Security', criteriaHint: 'CC2, CC4' },
  { name: 'Data Retention & Disposal Policy', tsc: 'Security', criteriaHint: 'CC6, CC9' },
  { name: 'SOC 2 Evidence Checklist', tsc: 'Security', criteriaHint: 'All criteria' },
  { name: 'System Description (DC 200)', tsc: 'Security', criteriaHint: 'All criteria' },
];

const AVAILABILITY_TEMPLATES: TemplateManifestEntry[] = [
  { name: 'Business Continuity & Disaster Recovery Policy', tsc: 'Availability', criteriaHint: 'A1' },
  { name: 'Backup & Recovery Policy', tsc: 'Availability', criteriaHint: 'A1' },
];

const CONFIDENTIALITY_TEMPLATES: TemplateManifestEntry[] = [
  { name: 'Data Classification & Handling Policy', tsc: 'Confidentiality', criteriaHint: 'C1' },
  { name: 'Encryption Policy', tsc: 'Confidentiality', criteriaHint: 'C1' },
];

const PRIVACY_TEMPLATES: TemplateManifestEntry[] = [
  { name: 'Privacy Notice & Consent Framework', tsc: 'Privacy', criteriaHint: 'P1–P8' },
];

export function getExpectedTemplates(tscSelections: WizardData['tscSelections']): TemplateManifestEntry[] {
  return [
    ...SECURITY_TEMPLATES,
    ...(tscSelections.availability ? AVAILABILITY_TEMPLATES : []),
    ...(tscSelections.confidentiality ? CONFIDENTIALITY_TEMPLATES : []),
    ...(tscSelections.privacy ? PRIVACY_TEMPLATES : []),
  ];
}
