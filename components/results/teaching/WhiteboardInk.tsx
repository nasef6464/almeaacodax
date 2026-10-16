import React from 'react';

/** A bounded local pen mark anchored to actual rendered content, never guessed image coordinates. */
export function WhiteboardInk({ kind }: { kind: 'highlight' | 'box' }) {
  return <svg aria-hidden="true" data-testid="whiteboard-ink" className={`whiteboard-ink pointer-events-none absolute inset-0 h-full w-full ${kind === 'box' ? 'text-emerald-500' : 'text-amber-500'}`}
    viewBox="0 0 100 100" preserveAspectRatio="none" fill="none">
    <path pathLength="1" vectorEffect="non-scaling-stroke" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
      d={kind === 'box' ? 'M 4 5 Q 48 2 96 5 L 97 94 Q 48 98 3 94 L 4 5' : 'M 3 91 Q 42 94 97 89'} />
  </svg>;
}
