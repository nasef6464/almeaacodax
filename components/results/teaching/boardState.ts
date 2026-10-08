import type { BoardAction, TeachingStoryboard } from '../../../server/src/modules/ai/contracts/teachingStoryboard';

export type BoardElement = { id: string; kind: 'text' | 'formula'; content: string; emphasis?: 'highlight' | 'box'; progress: number };
export const actionDuration = (action: BoardAction) =>
  action.type === 'write' || action.type === 'transform' ? Math.min(1600, Math.max(450, action.content.length * 22)) : 250;
export const sceneDuration = (plan: TeachingStoryboard, index: number) =>
  plan.scenes[index].actions.reduce((sum, action) => sum + actionDuration(action), 0);

/** Replaying from the beginning makes seeking and resuming deterministic. */
export function boardAt(plan: TeachingStoryboard, sceneIndex: number, elapsedMs: number): BoardElement[] {
  const elements = new Map<string, BoardElement>();
  for (let i = 0; i <= sceneIndex && i < plan.scenes.length; i++) {
    let actionStart = 0;
    for (const action of plan.scenes[i].actions) {
      const duration = actionDuration(action);
      if (i === sceneIndex && elapsedMs < actionStart) break;
      const progress = i < sceneIndex ? 1 : Math.min(1, Math.max(0, (elapsedMs - actionStart) / duration));
      if (action.type === 'write') {
        elements.set(action.id, { id: action.id, kind: action.kind, content: action.content, progress });
      } else if (action.type === 'erase') elements.delete(action.target);
      else {
        const element = elements.get(action.target);
        if (element) elements.set(action.target, action.type === 'transform'
          ? { ...element, content: action.content, progress, emphasis: undefined }
          : { ...element, emphasis: action.type });
      }
      actionStart += duration;
    }
  }
  return [...elements.values()];
}

export const estimateNarrationMs = (text: string) => Math.min(60000, Math.max(1200, text.trim().split(/\s+/).length * 430));
