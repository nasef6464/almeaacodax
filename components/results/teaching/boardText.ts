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
