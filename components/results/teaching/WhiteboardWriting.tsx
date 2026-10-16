import React from 'react';
import { WhiteboardHand } from './WhiteboardHand';

/** Read rendered row geometry; never turn Arabic or mathematical notation into guessed glyphs. */
export function WhiteboardWriting({ progress, rtl, active, children }: {
  progress: number; rtl: boolean; active: boolean; children: React.ReactNode;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [size, setSize] = React.useState({ width: 0, height: 0, rows: [{ top: 0, bottom: 0 }] });
  React.useLayoutEffect(() => {
    const node = ref.current!;
    const measure = () => {
      const bounds = node.getBoundingClientRect();
      const formulas = node.querySelectorAll('[data-testid="teaching-formula-line"]');
      const prose = node.querySelector('p');
      const lineHeight = prose ? parseFloat(getComputedStyle(prose).lineHeight) : bounds.height;
      const count = Math.max(1, Math.round(bounds.height / (lineHeight || bounds.height || 1)));
      const rows = formulas.length ? [...formulas].map(element => {
        const row = element.getBoundingClientRect();
        return { top: row.top - bounds.top, bottom: row.bottom - bounds.top };
      }) : Array.from({ length: count }, (_, i) => ({ top: i * bounds.height / count, bottom: (i + 1) * bounds.height / count }));
      setSize({ width: bounds.width, height: bounds.height, rows });
    };
    measure();
    const observer = new ResizeObserver(measure); observer.observe(node);
    return () => observer.disconnect();
  }, []);
  const bounded = Math.max(0, Math.min(1, progress));
  const row = Math.min(size.rows.length - 1, Math.floor(bounded * size.rows.length));
  const fraction = bounded === 1 ? 1 : bounded * size.rows.length - row;
  const bounds = size.rows[row];
  const top = bounds.top / (size.height || 1) * 100;
  const bottom = bounds.bottom / (size.height || 1) * 100;
  const edge = rtl ? 100 - fraction * 100 : fraction * 100;
  const polygon = rtl
    ? `polygon(0 0,100% 0,100% ${bottom}%,${edge}% ${bottom}%,${edge}% ${top}%,0 ${top}%)`
    : `polygon(0 0,100% 0,100% ${top}%,${edge}% ${top}%,${edge}% ${bottom}%,0 ${bottom}%)`;
  return <>
    <div ref={ref} className={`teaching-writing ${rtl ? 'teaching-writing-rtl' : ''}`}
      style={{ '--reveal': `${Math.round(bounded * 100)}%`, clipPath: bounded === 1 ? 'none' : polygon } as React.CSSProperties}>{children}</div>
    {active && bounded > 0 && bounded < 1 && <WhiteboardHand x={12 + edge / 100 * size.width}
      y={8 + bounds.top + (0.82 + Math.sin(fraction * Math.PI * 12) * 0.07) * (bounds.bottom - bounds.top)} />}
  </>;
}
