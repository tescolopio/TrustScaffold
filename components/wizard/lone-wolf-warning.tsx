import { AlertTriangle } from 'lucide-react';

type LoneWolfWarningProps = {
  requiresPeerReview: boolean;
  requiresMfa: boolean;
};

export function LoneWolfWarning({ requiresPeerReview, requiresMfa }: LoneWolfWarningProps) {
  const warnings: { title: string; explanation: string }[] = [];

  if (!requiresPeerReview) {
    warnings.push({
      title: 'Segregation of Duties — No Peer Review',
      explanation:
        'Without mandatory peer review, a single developer can write, approve, and deploy code. Auditors will test CC8.1 (Change Management) by sampling pull requests. Self-merged PRs without review will be flagged as a Segregation of Duties violation. Enable peer review or prepare a documented exception with compensating controls.',
    });
  }

  if (!requiresMfa) {
    warnings.push({
      title: 'Lone Wolf Risk — No MFA Enforcement',
      explanation:
        'Without MFA, a compromised password grants full access. Auditors will test CC6.1 (Logical Access) by checking IdP configuration. The absence of enforced MFA is a common "Lone Wolf" gap that escalates a stolen credential into a full breach. If MFA cannot be enforced, document the compensating control (e.g., hardware keys, conditional access policies).',
    });
  }

  if (!warnings.length) return null;

  return (
    <div className="space-y-3">
      {warnings.map((warning) => (
        <div
          key={warning.title}
          className="flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <div>
            <p className="font-medium text-amber-900">{warning.title}</p>
            <p className="mt-1 text-amber-700">{warning.explanation}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
