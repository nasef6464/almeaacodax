// Five synthetic renderer examples. No real questions, AI requests or persisted progress.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { TeachingBoard } from '../../components/results/teaching/TeachingBoard';
import { useTeachingPlayback } from '../../components/results/teaching/useTeachingPlayback';
import type { TeachingStoryboard } from '../../server/src/modules/ai/contracts/teachingStoryboard';
import { boardAt, actionDuration } from '../../components/results/teaching/boardState';

const examples = [
  { name: 'جمع', content: '12+8=20', text: 'اجمع العددين.' },
  { name: 'كسور', content: '\\frac{1}{2}+\\frac{1}{4}=\\frac{3}{4}\nx=2', text: 'اجمع الكسرين.' },
  { name: 'هندسة', content: 'A=6\\times4=24', text: 'أوجد مساحة المستطيل.', imageUrl: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='95'%3E%3Crect x='30' y='10' width='160' height='65' fill='none' stroke='%230e7490' stroke-width='3'/%3E%3Ctext x='105' y='92'%3E6%3C/text%3E%3Ctext x='200' y='48'%3E4%3C/text%3E%3C/svg%3E" },
  { name: 'عربي', content: 'نقرأ الجملة كاملة ثم نحدد العلاقة بين الكلمات.\nنستبعد الاختيار الذي لا يكمل المعنى.', text: 'كيف نفهم سياق الجملة؟', prose: true },
  { name: 'English', content: 'She has been studying for two hours.\nThe action started earlier and continues now.', text: 'Explain the tense.', prose: true, english: true },
];
class Utterance { constructor(public text: string) {} }
(window as any).SpeechSynthesisUtterance = Utterance;
Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: {
  speak: (speech: any) => { (window as any).speech = speech; }, pause() {}, resume() {}, cancel() {},
} });
function Demo() {
  const [index, setIndex] = React.useState(0);
  const [time, setTime] = React.useState<number | null>(null);
  const [speed, setSpeed] = React.useState(1);
  const example = examples[index];
  const plan = React.useMemo<TeachingStoryboard>(() => ({ version: 1, language: example.english ? 'en-US' : 'ar-SA', scenes: [{
    id: 'demo', narration: example.text, actions: [
      { type: 'write', id: 'step', kind: example.prose ? 'text' : 'formula', content: example.content },
      { type: 'highlight', target: 'step' }, { type: 'box', target: 'step' },
    ],
  }] }), [example]);
  const playback = useTeachingPlayback(plan, true, true, false, speed);
  (window as any).motion = { elapsed: playback.elapsedMs, writeDuration: actionDuration(plan.scenes[0].actions[0]) };
  return <main className="mx-auto max-w-2xl p-2">
    <nav className="flex flex-wrap gap-2">{examples.map((item, i) => <button key={item.name} onClick={() => { setIndex(i); setTime(null); }}>{item.name}</button>)}</nav>
    <button onClick={playback.toggle}>{playback.playing ? 'Pause' : 'Play'}</button>
    <button onClick={() => playback.seek(0, true)}>Replay</button>
    <button onClick={() => { setTime(400); playback.pause(); }}>Writing</button>
    <button onClick={() => { setTime(actionDuration(plan.scenes[0].actions[0]) * 0.6); playback.pause(); }}>Second line</button>
    <button onClick={() => { setTime(actionDuration(plan.scenes[0].actions[0]) + 125); playback.pause(); }}>Underline</button>
    <button onClick={() => { setTime(actionDuration(plan.scenes[0].actions[0]) + 375); playback.pause(); }}>Box</button>
    <button onClick={() => setSpeed(1.5)}>Faster</button>
    <TeachingBoard elements={time === null ? playback.elements : boardAt(plan, 0, time, true)} narration={playback.narration}
      language={plan.language} question={{ text: example.text, imageUrl: example.imageUrl }} />
  </main>;
}
createRoot(document.getElementById('root')!).render(<Demo />);
