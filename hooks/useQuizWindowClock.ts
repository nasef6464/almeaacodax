import { useEffect, useState } from 'react';
import type { QuizWindow } from '../utils/quizAvailability';

// A local boundary timer updates labels without polling the server.
export const useQuizWindowClock = (quizzes: QuizWindow[]) => {
  const [now, setNow] = useState(Date.now);
  const key = quizzes.map(q => [q.opensAt, q.closesAt || q.dueDate].join('|')).join(';');
  useEffect(() => setNow(Date.now()), [key]);
  useEffect(() => {
    const current = Date.now();
    const next = key.split(/[|;]/).map(Date.parse).filter(t => Number.isFinite(t) && t >= current).sort((a, b) => a - b)[0];
    if (next === undefined) return;
    const timer = window.setTimeout(() => setNow(Date.now()), Math.min(next - current + 1, 2147483647));
    return () => window.clearTimeout(timer);
  }, [key, now]);
  return now;
};
