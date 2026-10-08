import React from 'react';
import type { TeachingStoryboard } from '../../../server/src/modules/ai/contracts/teachingStoryboard';
import { boardAt, estimateNarrationMs, sceneDuration } from './boardState';
import { BrowserNarrationEngine } from './narrationEngine';

export function useTeachingPlayback(plan: TeachingStoryboard | null, voice: boolean, enabled: boolean) {
  const [position, setPosition] = React.useState({ scene: 0, elapsed: 0, revision: 0 });
  const [playing, setPlaying] = React.useState(false);
  const narrator = React.useMemo(() => new BrowserNarrationEngine(), []);
  const started = React.useRef(false);
  const finished = React.useRef(false);

  React.useEffect(() => {
    narrator.cancel();
    started.current = false;
    finished.current = !voice;
    return () => narrator.cancel();
  }, [plan, position.scene, position.revision, voice, narrator]);

  React.useEffect(() => {
    if (!plan || !enabled || !playing) {
      narrator.pause();
      return;
    }
    const scene = plan.scenes[position.scene];
    if (!scene) return;
    if (!started.current) {
      started.current = true;
      if (voice) narrator.speak(scene.narration, plan.language, () => { finished.current = true; });
    } else narrator.resume();
    let previous = performance.now();
    const timer = setInterval(() => {
      const now = performance.now();
      const delta = Math.min(250, now - previous);
      previous = now;
      setPosition(current => {
        const elapsed = current.elapsed + delta;
        const visualDuration = sceneDuration(plan, current.scene);
        const minimum = voice ? visualDuration : Math.max(visualDuration, estimateNarrationMs(scene.narration));
        if (elapsed >= minimum && finished.current) {
          if (current.scene === plan.scenes.length - 1) {
            // Defer the other state update outside this updater.
            queueMicrotask(() => setPlaying(false));
            return { ...current, elapsed: Math.max(minimum, current.elapsed) };
          }
          return { ...current, scene: current.scene + 1, elapsed: 0 };
        }
        return { ...current, elapsed };
      });
    }, 50);
    return () => { clearInterval(timer); narrator.pause(); };
  }, [plan, position.scene, position.revision, voice, enabled, playing, narrator]);

  React.useEffect(() => {
    setPlaying(Boolean(plan));
    setPosition({ scene: 0, elapsed: 0, revision: 0 });
  }, [plan]);
  React.useEffect(() => {
    const pauseHidden = () => { if (document.hidden) setPlaying(false); };
    document.addEventListener('visibilitychange', pauseHidden);
    return () => document.removeEventListener('visibilitychange', pauseHidden);
  }, []);

  const seek = (scene: number) => {
    narrator.cancel();
    setPlaying(false);
    setPosition(current => ({ scene: Math.max(0, Math.min((plan?.scenes.length || 1) - 1, scene)), elapsed: 0, revision: current.revision + 1 }));
  };
  const pause = () => { narrator.pause(); setPlaying(false); };
  const toggle = () => { if (playing) pause(); else setPlaying(true); };
  return {
    sceneIndex: position.scene, elapsedMs: position.elapsed, playing, pause, toggle, seek,
    elements: plan ? boardAt(plan, position.scene, position.elapsed) : [],
    narration: plan?.scenes[position.scene]?.narration || '',
    context: plan ? JSON.stringify({ scene: plan.scenes[position.scene]?.id, narration: plan.scenes[position.scene]?.narration,
      board: boardAt(plan, position.scene, position.elapsed).map(({ content }) => content) }).slice(0, 1200) : '',
  };
}
