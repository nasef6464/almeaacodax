import React from 'react';

/** Locally authored vector hand. Its origin is the nib, shared with the ink path. */
export function WhiteboardHand({ x, y }: { x: number; y: number }) {
  return <span aria-hidden="true" data-testid="whiteboard-marker" className="whiteboard-hand pointer-events-none absolute z-[2]"
    style={{ left: x, top: y, width: 68, height: 86 }}>
    <svg viewBox="0 0 68 86" className="h-full w-full overflow-visible" fill="none">
      <path d="M37 82 29 61 17 44Q10 35 15 31Q19 28 25 36L20 17Q19 10 24 10Q28 10 30 18L36 34 32 15Q31 9 36 9Q40 9 42 17L47 34 46 23Q46 18 50 19Q54 19 55 25L60 43Q64 55 57 65L64 79" fill="#e9b88e" stroke="#ac7656" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M0 0 3 12 35 50Q39 54 43 50Q46 47 42 43L9 7Z" fill="#164e63" stroke="#083344" strokeWidth="1.3" />
      <path d="m0 0 3 12 6-5Z" fill="#f8fafc" /><path d="m0 0 2 5 2-2Z" fill="#0f172a" />
      <path d="M27 46 20 37Q17 32 21 30Q24 28 28 33L38 42Q43 47 39 52Q34 57 29 52" fill="#f1c49e" stroke="#ac7656" strokeWidth="1.4" />
      <path d="m34 78 27-8 6 16H38Z" fill="#0e7490" /><path d="m34 78 27-8" stroke="#67e8f9" strokeWidth="2" />
    </svg>
  </span>;
}
