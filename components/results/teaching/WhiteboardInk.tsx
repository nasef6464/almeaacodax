import React from 'react';
import { WhiteboardHand } from './WhiteboardHand';

/** A bounded local pen mark anchored to actual rendered content, never guessed image coordinates. */
export function WhiteboardInk({ kind, progress = 1, active = false }: { kind: 'highlight' | 'box'; progress?: number; active?: boolean }) {
  const path = React.useRef<SVGPathElement>(null);
  const [point, setPoint] = React.useState({ x: 0, y: 0 });
  React.useLayoutEffect(() => {
    const node = path.current;
    if (!node || !active) return;
    const update = () => {
      const tip = node.getPointAtLength(node.getTotalLength() * Math.max(0, Math.min(1, progress)));
      const bounds = node.ownerSVGElement!.getBoundingClientRect();
      setPoint({ x: tip.x * bounds.width / 100, y: tip.y * bounds.height / 100 });
    };
    update();
    const observer = new ResizeObserver(update); observer.observe(node.ownerSVGElement!);
    return () => observer.disconnect();
  }, [kind, progress, active]);
  return <><svg aria-hidden="true" data-testid="whiteboard-ink" className={`whiteboard-ink pointer-events-none absolute inset-0 h-full w-full ${kind === 'box' ? 'text-emerald-500' : 'text-amber-500'}`}
    viewBox="0 0 100 100" preserveAspectRatio="none" fill="none">
    <path ref={path} pathLength="1" strokeDasharray="1" strokeDashoffset={1 - progress} vectorEffect="non-scaling-stroke" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
      d={kind === 'box' ? 'M 4 5 Q 48 2 96 5 L 97 94 Q 48 98 3 94 L 4 5' : 'M 3 91 Q 42 94 97 89'} />
  </svg>{active && progress < 1 && <WhiteboardHand {...point} />}</>;
}
