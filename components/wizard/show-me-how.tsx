'use client';

import { useState } from 'react';

import { ExternalLink, ChevronDown, ChevronRight } from 'lucide-react';

type ShowMeHowProps = {
  title: string;
  steps: readonly string[];
  docUrl?: string;
  docLabel?: string;
};

export function ShowMeHow({ title, steps, docUrl, docLabel }: ShowMeHowProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50 text-sm">
      <button
        type="button"
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-blue-800 hover:bg-blue-100"
        onClick={() => setOpen(!open)}
      >
        {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        <span className="font-medium">Show me how: {title}</span>
      </button>
      {open && (
        <div className="border-t border-blue-200 px-4 py-3">
          <ol className="list-inside list-decimal space-y-1 text-blue-900">
            {steps.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
          {docUrl && (
            <a
              href={docUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-blue-700 underline hover:text-blue-900"
            >
              <ExternalLink className="h-3 w-3" />
              {docLabel ?? 'Official documentation'}
            </a>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Prebuilt snippet configs ──────────────────────────────────────── */

export const SHOW_ME_HOW_GITHUB_BRANCH_PROTECTION = {
  title: 'Enable GitHub Branch Protection',
  steps: [
    'Go to Settings → Branches in your repository.',
    'Click "Add branch protection rule" for your default branch.',
    'Check "Require a pull request before merging".',
    'Check "Require approvals" and set the minimum to 1.',
    'Check "Require status checks to pass before merging".',
    'Click "Create" or "Save changes".',
  ],
  docUrl: 'https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-a-branch-protection-rule/managing-a-branch-protection-rule',
  docLabel: 'GitHub docs: Branch protection rules',
} as const;

export const SHOW_ME_HOW_AZURE_DEVOPS_BRANCH_POLICY = {
  title: 'Enable Azure DevOps Branch Policies',
  steps: [
    'Go to Repos → Branches in your Azure DevOps project.',
    'Click the "…" menu on the default branch and select "Branch policies".',
    'Toggle "Require a minimum number of reviewers" and set to 1.',
    'Toggle "Check for linked work items" if you want traceability.',
    'Toggle "Build validation" to require passing CI before merge.',
  ],
  docUrl: 'https://learn.microsoft.com/en-us/azure/devops/repos/git/branch-policies',
  docLabel: 'Azure DevOps docs: Branch policies',
} as const;

export const SHOW_ME_HOW_ENTRA_MFA = {
  title: 'Enforce MFA in Entra ID (Azure AD)',
  steps: [
    'Go to Microsoft Entra admin center → Protection → Conditional Access.',
    'Click "New policy".',
    'Under Assignments → Users, select "All users".',
    'Under Grant, select "Require multifactor authentication".',
    'Set "Enable policy" to On and click Create.',
  ],
  docUrl: 'https://learn.microsoft.com/en-us/entra/identity/conditional-access/howto-conditional-access-policy-all-users-mfa',
  docLabel: 'Microsoft docs: MFA Conditional Access',
} as const;

export const SHOW_ME_HOW_OKTA_MFA = {
  title: 'Enforce MFA in Okta',
  steps: [
    'Go to Security → Multifactor in the Okta Admin console.',
    'Enable your preferred factors (e.g., Okta Verify, FIDO2).',
    'Go to Security → Authentication Policies.',
    'Edit the "Default" policy to require MFA for every sign-on.',
  ],
  docUrl: 'https://help.okta.com/en-us/content/topics/security/mfa/mfa-overview.htm',
  docLabel: 'Okta docs: MFA configuration',
} as const;

export const SHOW_ME_HOW_AWS_SCPs = {
  title: 'Apply AWS Service Control Policies',
  steps: [
    'Go to AWS Organizations → Policies → Service control policies.',
    'Click "Create policy" to define guardrails (e.g., deny public S3).',
    'Attach the SCP to the OU containing production accounts.',
    'Test with IAM Policy Simulator to verify deny behavior.',
  ],
  docUrl: 'https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_scps.html',
  docLabel: 'AWS docs: Service control policies',
} as const;
