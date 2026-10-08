/** Recover observed prose separators only; preserve mathematical n and LaTeX commands. */
export function readableBoardText(content: string): string {
  let result = content.replace(/\\n(?![A-Za-z])/g, '\n');
  if (/الخطوة|الخيارات|Step\s+\d|Options:/i.test(result)) {
    result = result.replace(/(?<=[\u0600-\u06ff\d).:])n(?=الخطوة|الخيارات|إذن|Step\s+\d|\d+\))/g, '\n');
    // A bare n before a list marker is only unambiguous after prose or sentence punctuation.
    result = result.replace(/(?<=[\u0600-\u06ff.):])n(?=-\s|•)/g, '\n');
  }
  return result;
}

/** Prose fragments can contain known LaTeX text wrappers/operators outside an equation. */
export function readableBoardProse(content: string): string {
  const operators: Record<string, string> = { times: '×', div: '÷', implies: '⇒', rightarrow: '→', leftarrow: '←', neq: '≠', leq: '≤', geq: '≥', cdot: '·' };
  return content.replace(/\\(?:text|textbf|mathrm|operatorname)\{([^{}]*)\}/g, '$1')
    .replace(/\\(times|div|implies|rightarrow|leftarrow|neq|leq|geq|cdot)(?![A-Za-z])/g, (_match, name: string) => operators[name]);
}
