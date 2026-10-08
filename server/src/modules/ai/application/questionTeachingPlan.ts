import { validateTeachingStoryboard, type TeachingStoryboard } from '../contracts/teachingStoryboard.js';
import { compileCompactTeachingPlan, compactTeachingInstruction, type CompactTeachingMode } from './compactTeachingPlan.js';

export const teachingPlanInstruction = compactTeachingInstruction('lesson');

/** Safe structural diagnostics; never include question text or raw provider output. */
export function inspectQuestionTeachingPlan(raw: string) {
  try {
    const parsed = JSON.parse(raw);
    const compiled = compileCompactTeachingPlan(parsed);
    const elements = new Set<string>();
    const issues = { missingFields: 0, invalidIds: 0, duplicateWrites: 0, missingTargets: 0, invalidHints: 0 };
    for (const scene of compiled?.scenes || (Array.isArray(parsed?.scenes) ? parsed.scenes : [])) {
      if (!scene || typeof scene.narration !== 'string' || !Array.isArray(scene.actions)) { issues.missingFields++; continue; }
      if (!/^[A-Za-z][A-Za-z0-9_-]{0,39}$/.test(String(scene.id || ''))) issues.invalidIds++;
      if (scene.checkpoint && (!Array.isArray(scene.checkpoint.hints) || scene.checkpoint.hints.length !== 2)) issues.invalidHints++;
      for (const action of scene.actions) {
        if (action?.type === 'write') {
          if (!/^[A-Za-z][A-Za-z0-9_-]{0,39}$/.test(String(action.id || ''))) issues.invalidIds++;
          if (elements.has(action.id)) issues.duplicateWrites++;
          elements.add(action.id);
          if (typeof action.content !== 'string' || !['text', 'formula'].includes(action.kind)) issues.missingFields++;
        } else if (!elements.has(action?.target)) issues.missingTargets++;
        if (action?.type === 'erase') elements.delete(action.target);
      }
    }
    const scenes = compiled?.scenes || (Array.isArray(parsed?.scenes) ? parsed.scenes : []);
    return { jsonComplete: true, valid: Boolean(compiled || validateTeachingStoryboard(parsed)), issues,
      versionCorrect: parsed?.version === 1 || parsed?.format === 'compact_v1', languageCorrect: ['ar-SA','en-US'].includes(parsed?.language),
      scenes: scenes.length, checkpointIndices: scenes.flatMap((scene: any, index: number) => scene?.checkpoint ? [index] : []) };
  } catch { return { jsonComplete: false, valid: false, chars: raw.length }; }
}

/** Existing cache stores a string; no collection migration is necessary. */
export function decodeQuestionTeachingPlan(raw: string): { text: string; storyboard?: TeachingStoryboard } {
  try {
    const parsed = JSON.parse(raw);
    const storyboard = compileCompactTeachingPlan(parsed) || validateTeachingStoryboard(parsed);
    if (storyboard) return { text: storyboard.scenes.map(scene => scene.narration).join('\n'), storyboard };
  } catch { /* legacy text */ }
  return { text: raw };
}

export function normalizeQuestionTeachingPlan(raw: string, fallback: string, expected?: {
  mode: CompactTeachingMode; language?: TeachingStoryboard['language'];
}): string {
  if (expected) {
    try {
      const plan = compileCompactTeachingPlan(JSON.parse(raw), expected);
      if (plan) return JSON.stringify(plan);
    } catch { /* safe trusted fallback below */ }
    return fallback;
  }
  const decoded = decodeQuestionTeachingPlan(raw);
  if (decoded.storyboard) return JSON.stringify(decoded.storyboard);
  // Never expose invalid JSON as a lesson; use the already-authorized explanation.
  const text = raw.trim();
  return (!text || /^[{\[]|^```/.test(text)) ? fallback : text.slice(0, 4000);
}
