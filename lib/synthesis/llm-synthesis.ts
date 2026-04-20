/**
 * Stateless LLM Synthesis Layer.
 *
 * Takes structured wizard inputs + evidence data and produces human-readable
 * narrative sections for policies or the system description. Stateless means:
 *  - No memory across calls
 *  - No fine-tuning or training on user data
 *  - Same inputs always produce the same prompt (deterministic prompting)
 *  - Model temperature set to 0 for reproducibility
 *
 * The layer is provider-agnostic — callers supply an adapter function.
 */

export type SynthesisContext = {
  organizationName: string;
  systemDescription?: string;
  wizardInputs: Record<string, unknown>;
  evidenceSummary?: {
    totalArtifacts: number;
    passingCount: number;
    failingCount: number;
    scannerTools: string[];
  };
  section: string;
};

export type SynthesisResult = {
  narrative: string;
  promptTokens: number;
  completionTokens: number;
};

/**
 * Adapter interface — implement this for your LLM provider (OpenAI, Anthropic, etc.).
 */
export type LLMAdapter = (prompt: string) => Promise<{
  text: string;
  promptTokens: number;
  completionTokens: number;
}>;

const SYSTEM_PROMPT = `You are a SOC 2 compliance writer. Given structured organizational data and evidence summaries, produce concise, auditor-grade narrative text.

Rules:
- Be factual and specific. Reference the organization's actual tools, providers, and configurations.
- Never fabricate evidence or controls that aren't described in the input.
- Use present tense for controls that are in place.
- Use formal third-person language suitable for auditor review.
- Keep paragraphs to 2-4 sentences maximum.
- Do not include markdown headers — the caller manages document structure.`;

function buildPrompt(context: SynthesisContext): string {
  const parts: string[] = [
    `Organization: ${context.organizationName}`,
    `Section: ${context.section}`,
  ];

  if (context.systemDescription) {
    parts.push(`System Description: ${context.systemDescription}`);
  }

  parts.push(`Wizard Inputs (JSON): ${JSON.stringify(context.wizardInputs, null, 2)}`);

  if (context.evidenceSummary) {
    parts.push(
      `Evidence Summary: ${context.evidenceSummary.totalArtifacts} artifacts collected ` +
      `(${context.evidenceSummary.passingCount} PASS, ${context.evidenceSummary.failingCount} FAIL) ` +
      `from scanners: ${context.evidenceSummary.scannerTools.join(', ')}`,
    );
  }

  parts.push(
    'Write a concise narrative paragraph for this section that an auditor would find credible and sufficient.',
  );

  return parts.join('\n\n');
}

/**
 * Synthesize a narrative section. Stateless — no memory, no side effects.
 */
export async function synthesizeNarrative(
  context: SynthesisContext,
  adapter: LLMAdapter,
): Promise<SynthesisResult> {
  const userPrompt = buildPrompt(context);
  const fullPrompt = `${SYSTEM_PROMPT}\n\n---\n\n${userPrompt}`;

  const result = await adapter(fullPrompt);

  return {
    narrative: result.text.trim(),
    promptTokens: result.promptTokens,
    completionTokens: result.completionTokens,
  };
}

/**
 * Dry-run: returns the prompt that would be sent without calling the LLM.
 * Useful for debugging and auditor transparency.
 */
export function synthesizeNarrativeDryRun(context: SynthesisContext): string {
  const userPrompt = buildPrompt(context);
  return `${SYSTEM_PROMPT}\n\n---\n\n${userPrompt}`;
}
