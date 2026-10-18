import { validateTeachingStoryboard, type TeachingStoryboard, type TeachingScene } from '../../../server/src/modules/ai/contracts/teachingStoryboard';
import {validateTeachingPlan,type TeachingPlan} from '../../../server/src/modules/ai/contracts/teachingImageStoryboard';

/** Presentation only: preserve the trusted plan/cache; opt into practice locally. */
export function quickTeachingPlan(plan: TeachingPlan | null, practice: boolean): TeachingPlan | null {
  if (!plan) return null;
  const scenes: TeachingScene[] = [];
  const remap = new Map<string,string>();
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
    remap.set(scene.id,'quick_step_0');
    lines.forEach((content, index) => {
      const last = index === lines.length - 1;
      scenes.push({ id: last ? scene.id : `quick_step_${index}`, narration: last ? scene.narration : content,
        actions: [{ ...action, id: last ? action.id : `quick_line_${index}`, content },
          ...(last ? scene.actions.slice(1) : [])] });
    });
  }
  // Collisions or over-bound plans safely retain original scene structure.
  const image = plan.version === 2 && plan.image ? { ...plan.image, marks:plan.image.marks.map(mark=>({...mark,sceneId:remap.get(mark.sceneId)||mark.sceneId})) } : undefined;
  return validateTeachingPlan({ ...plan, scenes, ...(image?{image}:{}) }) || validateTeachingPlan({ ...plan,
    scenes: plan.scenes.map(({ checkpoint, ...scene }) => ({ ...scene, ...(practice && checkpoint ? { checkpoint } : {}) })) });
}
