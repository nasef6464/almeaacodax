import type { BoardAction, TeachingStoryboard } from '../../../server/src/modules/ai/contracts/teachingStoryboard';

export type BoardElement = { id: string; kind: 'text' | 'formula'; content: string; emphasis?: 'highlight' | 'box'; progress: number; inkProgress?: number; history?: boolean; sourceId?: string; active?: boolean };
export const actionDuration = (action: BoardAction) =>
  action.type === 'write' || action.type === 'transform' ? Math.min(1600, Math.max(450, action.content.length * 22)) : 250;
export const sceneDuration = (plan: TeachingStoryboard, index: number) =>
  plan.scenes[index].actions.reduce((sum, action) => sum + actionDuration(action), 0);

/** Replaying from the beginning makes seeking and resuming deterministic. */
export function boardAt(plan: TeachingStoryboard, sceneIndex: number, elapsedMs: number, keepHistory = false): BoardElement[] {
  const elements = new Map<string, BoardElement>();
  let activeId: string | undefined;
  for (let i = 0; i <= sceneIndex && i < plan.scenes.length; i++) {
    let actionStart = 0;
    for (const [actionIndex, action] of plan.scenes[i].actions.entries()) {
      const duration = actionDuration(action);
      if (i === sceneIndex && elapsedMs < actionStart) break;
      const progress = i < sceneIndex ? 1 : Math.min(1, Math.max(0, (elapsedMs - actionStart) / duration));
      if (action.type === 'write') {
        elements.set(action.id, { id: action.id, kind: action.kind, content: action.content, progress });
        activeId = action.id;
      } else if (action.type === 'erase') {
        elements.delete(action.target);
        if (keepHistory) for (const [id, element] of elements) {
          if (element.history && element.sourceId === action.target) elements.delete(id);
        }
        if (activeId === action.target) activeId = undefined;
      }
      else {
        const element = elements.get(action.target);
        if (keepHistory && element && action.type === 'transform' && element.content !== action.content) {
          // ':' cannot occur in validated provider IDs, so local history keys cannot collide.
          const id = `history:${i}:${actionIndex}:${action.target}`;
          const previous = [...elements];
          elements.clear();
          for (const [key, value] of previous) elements.set(key === action.target ? id : key, key === action.target
            ? { ...element, id, progress: 1, emphasis: undefined, inkProgress: undefined, history: true, sourceId: action.target } : value);
        }
        if (element) elements.set(action.target, action.type === 'transform'
          ? { ...element, content: action.content, progress, emphasis: undefined, ...(keepHistory ? { inkProgress: undefined } : {}) }
          : { ...element, emphasis: action.type, ...(keepHistory ? { inkProgress: progress } : {}) });
        if (element) activeId = action.target;
      }
      actionStart += duration;
    }
  }
  return [...elements.values()].map(element => keepHistory ? { ...element, active: element.id === activeId } : element);
}

export const estimateNarrationMs = (text: string) => Math.min(60000, Math.max(1200, text.trim().split(/\s+/).length * 430));
