import { validateTeachingStoryboard, type TeachingStoryboard, type TeachingScene } from '../../../server/src/modules/ai/contracts/teachingStoryboard';

/** Presentation only: preserve the trusted plan/cache; opt into practice locally. */
export function quickTeachingPlan(plan: TeachingStoryboard | null, practice: boolean): TeachingStoryboard | null {
  if (!plan) return null;
  const scenes: TeachingScene[] = [];
  for (const scene of plan.scenes) {
    const { checkpoint, ...base } = scene;
    const narration = !practice && checkpoint && scene.narration.endsWith(checkpoint.prompt)
      ? scene.narration.slice(0, -checkpoint.prompt.length).trim() || scene.narration : scene.narration;
    const current = { ...base, narration, ...(practice && checkpoint ? { checkpoint } : {}) };
    // Only expand the canonical compact compiler's solution, never arbitrary provider IDs/references.
    const action = scene.actions[0];
    const lines = scene.id === 'solution' && action?.type === 'write' && action.id === 'solution'
      ? action.content.split('\n').filter(line => line.trim()) : [];
    if (lines.length < 2 || lines.length > 3 || action?.type !== 'write') { scenes.push(current); continue; }
    lines.forEach((content, index) => {
      const last = index === lines.length - 1;
      scenes.push({ id: last ? scene.id : `quick_step_${index}`, narration: last ? scene.narration : content,
        actions: [{ ...action, id: last ? action.id : `quick_line_${index}`, content },
          ...(last ? scene.actions.slice(1) : [])] });
    });
  }
  // Collisions or over-bound plans safely retain original scene structure.
  return validateTeachingStoryboard({ ...plan, scenes }) || validateTeachingStoryboard({ ...plan,
    scenes: plan.scenes.map(({ checkpoint, ...scene }) => ({ ...scene, ...(practice && checkpoint ? { checkpoint } : {}) })) });
}
