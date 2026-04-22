import Handlebars from 'handlebars/dist/cjs/handlebars';

const engine = Handlebars.create();

engine.registerHelper('eq', (left: unknown, right: unknown) => left === right);
engine.registerHelper('includes', (arr: unknown, value: unknown) => Array.isArray(arr) && arr.includes(value));

export function renderTemplate(source: string, variables: Record<string, unknown>, templateName?: string): string {
  try {
    return engine.compile(source, { noEscape: true })(variables);
  } catch (err) {
    const label = templateName ? ` in template "${templateName}"` : '';
    throw new Error(`Handlebars render failed${label}: ${err instanceof Error ? err.message : String(err)}`);
  }
}