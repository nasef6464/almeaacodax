import React, { useEffect, useRef, useState } from 'react';
import { Circle, Eraser, ImagePlus, Minus, MousePointer2, Pencil, Square, TriangleRight } from 'lucide-react';

type DrawingMode = 'freehand' | 'line' | 'rectangle' | 'circle' | 'angle';

interface Point {
  x: number;
  y: number;
}

interface QuestionDrawingPadProps {
  onInsertImage: (dataUrl: string) => void;
}

const CANVAS_WIDTH = 720;
const CANVAS_HEIGHT = 360;

const modes: Array<{ id: DrawingMode; label: string; Icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'freehand', label: 'رسم حر', Icon: Pencil },
  { id: 'line', label: 'خط', Icon: Minus },
  { id: 'rectangle', label: 'مستطيل', Icon: Square },
  { id: 'circle', label: 'دائرة', Icon: Circle },
  { id: 'angle', label: 'زاوية', Icon: TriangleRight },
];

const getCanvasPoint = (canvas: HTMLCanvasElement, event: React.PointerEvent<HTMLCanvasElement>): Point => {
  const rect = canvas.getBoundingClientRect();

  return {
    x: ((event.clientX - rect.left) / rect.width) * canvas.width,
    y: ((event.clientY - rect.top) / rect.height) * canvas.height,
  };
};

const prepareCanvas = (canvas: HTMLCanvasElement) => {
  const context = canvas.getContext('2d');
  if (!context) return;

  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = '#0f172a';
  context.lineWidth = 4;
  context.lineCap = 'round';
  context.lineJoin = 'round';
};

export const QuestionDrawingPad: React.FC<QuestionDrawingPadProps> = ({ onInsertImage }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const snapshotRef = useRef<ImageData | null>(null);
  const [mode, setMode] = useState<DrawingMode>('line');
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<Point | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    prepareCanvas(canvas);
  }, []);

  const drawShape = (point: Point) => {
    const canvas = canvasRef.current;
    const start = startPoint;
    const context = canvas?.getContext('2d');
    if (!canvas || !context || !start || !snapshotRef.current) return;

    context.putImageData(snapshotRef.current, 0, 0);
    context.beginPath();

    if (mode === 'line') {
      context.moveTo(start.x, start.y);
      context.lineTo(point.x, point.y);
    }

    if (mode === 'rectangle') {
      context.rect(start.x, start.y, point.x - start.x, point.y - start.y);
    }

    if (mode === 'circle') {
      const radius = Math.hypot(point.x - start.x, point.y - start.y);
      context.arc(start.x, start.y, radius, 0, Math.PI * 2);
    }

    if (mode === 'angle') {
      context.moveTo(start.x, start.y);
      context.lineTo(point.x, point.y);
      context.moveTo(start.x, start.y);
      context.lineTo(start.x + Math.abs(point.x - start.x), start.y);
    }

    context.stroke();
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;

    const point = getCanvasPoint(canvas, event);
    setIsDrawing(true);
    setStartPoint(point);
    snapshotRef.current = context.getImageData(0, 0, canvas.width, canvas.height);
    canvas.setPointerCapture(event.pointerId);

    if (mode === 'freehand') {
      context.beginPath();
      context.moveTo(point.x, point.y);
    }
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;

    const point = getCanvasPoint(canvas, event);
    if (mode === 'freehand') {
      context.lineTo(point.x, point.y);
      context.stroke();
      return;
    }

    drawShape(point);
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (canvas?.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }
    setIsDrawing(false);
    setStartPoint(null);
    snapshotRef.current = null;
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    prepareCanvas(canvas);
  };

  const handleInsert = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    onInsertImage(canvas.toDataURL('image/png'));
  };

  return (
    <div className="border-b border-gray-100 bg-white px-3 py-3" data-testid="question-editor-drawing-pad" dir="rtl">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {modes.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setMode(id)}
              className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border text-slate-700 transition ${
                mode === id ? 'border-indigo-300 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white hover:bg-slate-50'
              }`}
              title={label}
              aria-label={label}
            >
              <Icon className="h-4 w-4" />
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleClear}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-rose-100 bg-rose-50 text-rose-600 hover:bg-rose-100"
            title="مسح الرسم"
            aria-label="مسح الرسم"
          >
            <Eraser className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={handleInsert}
            className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700 hover:bg-emerald-100"
            data-testid="question-editor-insert-drawing"
          >
            <ImagePlus className="h-4 w-4" />
            إدراج الرسم
          </button>
        </div>
      </div>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-2">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="block aspect-[2/1] w-full touch-none rounded-lg border border-slate-200 bg-white"
          data-testid="question-editor-drawing-canvas"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        />
      </div>
      <div className="mt-2 flex items-center gap-2 text-[11px] font-bold text-slate-500">
        <MousePointer2 className="h-3.5 w-3.5" />
        ارسم الشكل ثم اضغط إدراج الرسم ليظهر داخل نص السؤال.
      </div>
    </div>
  );
};
