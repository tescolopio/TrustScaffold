import Handlebars from 'handlebars/dist/cjs/handlebars';

const engine = Handlebars.create();

engine.registerHelper('eq', (left: unknown, right: unknown) => left === right);
engine.registerHelper('includes', (arr: unknown, value: unknown) => Array.isArray(arr) && arr.includes(value));

export function renderTemplate(source: string, variables: Record<string, unknown>) {
  return engine.compile(source, { noEscape: true })(variables);
}