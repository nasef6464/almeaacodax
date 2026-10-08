import React from 'react';
import { Bot, ChevronLeft, ChevronRight, Loader2, MessageCircle, Mic, MicOff, Pause, Play, RotateCcw, Send, Volume2, VolumeX, X } from 'lucide-react';
import { api } from '../../services/api';
import { InteractiveWhiteboardCanvas } from './InteractiveWhiteboardCanvas';
import { validateTeachingStoryboard, type TeachingStoryboard } from '../../server/src/modules/ai/contracts/teachingStoryboard';
import { TeachingBoard } from './teaching/TeachingBoard';
import { useTeachingPlayback } from './teaching/useTeachingPlayback';
import { BrowserNarrationEngine } from './teaching/narrationEngine';
import { PracticeCheckpoint } from './teaching/PracticeCheckpoint';

type AssistantContext = 'result_review' | 'saved_review' | 'mistake_review' | 'mastery_review';
type SpeechRecognitionLike = {
  lang: string; interimResults: boolean; continuous: boolean;
  onresult: ((event: any) => void) | null; onerror: (() => void) | null; onend: (() => void) | null;
  start(): void; stop(): void;
};
type TeacherLesson = { text: string; plan: TeachingStoryboard | null };
type SmartTeacherTurn = { id: string; role: 'student' | 'teacher'; text: string };

export const InteractiveSmartTeacher: React.FC<{
  isOpen: boolean; onClose: () => void; resultId?: string; questionId: string;
  context: AssistantContext; tutorSessionId: string;
}> = ({ isOpen, onClose, resultId, questionId, context, tutorSessionId }) => {
  const [turns, setTurns] = React.useState<SmartTeacherTurn[]>([]);
  const [lesson, setLesson] = React.useState<TeacherLesson | null>(null);
  const [reply, setReply] = React.useState<TeacherLesson | null>(null);
  const [message, setMessage] = React.useState('');
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState('');
  const [autoVoice, setAutoVoice] = React.useState(true);
  const [listening, setListening] = React.useState(false);
  const [chatOpen, setChatOpen] = React.useState(false);
  const recognitionRef = React.useRef<SpeechRecognitionLike | null>(null);
  const requestRef = React.useRef(false);
  const generation = React.useRef(0);
  const dialogRef = React.useRef<HTMLDivElement>(null);
  const legacyNarrator = React.useMemo(() => new BrowserNarrationEngine(), []);
  const main = useTeachingPlayback(lesson?.plan || null, autoVoice, isOpen && !reply && !pending && !listening);
  const branch = useTeachingPlayback(reply?.plan || null, autoVoice, isOpen && !pending && !listening, false);
  const active = reply ? branch : main;
  const activeLesson = reply || lesson;

  const stopListening = () => {
    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    if (recognition) {
      recognition.onresult = null; recognition.onerror = null; recognition.onend = null;
      recognition.stop();
    }
    setListening(false);
  };
  const interrupt = () => { main.pause(); branch.pause(); legacyNarrator.cancel(); };

  const ask = async (studentText: string, helpLevel: 'concept' | 'steps' | 'follow_up' = 'follow_up', replaceLesson = false) => {
    const clean = studentText.trim();
    if (!clean || requestRef.current) return;
    const interruptedContext = active.context || activeLesson?.text.slice(0, 1000) || '';
    interrupt(); stopListening();
    requestRef.current = true;
    const requestGeneration = generation.current;
    setTurns(current => [...current, { id: `student-${Date.now()}`, role: 'student', text: clean }]);
    setPending(true); setError(''); setMessage('');
    if (lesson && !replaceLesson) setChatOpen(true);
    try {
      const response = await api.aiQuestionAssistant({
        ...(resultId ? { resultId } : {}), context, questionId, helpLevel,
        message: clean.slice(0, 800), tutorSessionId, boardMode: 'storyboard_v1',
        ...(interruptedContext && !replaceLesson ? { boardContext: interruptedContext } : {}),
      });
      if (requestGeneration !== generation.current) return;
      const text = String(response.text || '').trim();
      if (!text) throw new Error('لم يصل شرح الآن. حاول مرة أخرى.');
      const next = { text, plan: validateTeachingStoryboard(response.storyboard) };
      setTurns(current => [...current, { id: `teacher-${Date.now()}`, role: 'teacher', text }]);
      if (!lesson || replaceLesson) { setLesson(next); setReply(null); }
      else setReply(next);
      if (!next.plan && autoVoice) legacyNarrator.speak(text, 'ar-SA', () => {});
      return true;
    } catch (requestError) {
      if (requestGeneration === generation.current) setError(requestError instanceof Error ? requestError.message : 'تعذر تشغيل المعلم الذكي الآن.');
      return false;
    } finally {
      if (requestGeneration === generation.current) { requestRef.current = false; setPending(false); }
    }
  };

  const attemptStep = async (answer: string) => {
    if (!main.checkpoint) return false;
    const result = await ask(`راجع محاولتي لهذه الخطوة: ${main.checkpoint.prompt}\nإجابتي: ${answer.slice(0, 350)}\nوضح صحة الخطوة من المرجع؛ إن أخطأت أعطني تلميحاً موجهاً دون كشف الحل كله. لا تحسب درجة أو إتقاناً.`);
    if (result) main.completeCheckpoint();
    return result;
  };

  React.useEffect(() => {
    if (!isOpen) return;
    setLesson(null); setReply(null); setTurns([]); setMessage(''); setError(''); setChatOpen(false);
    requestRef.current = false;
    void ask('اشرح حل هذا السؤال مباشرة بخطوات قصيرة، واكتب المعطيات والمعادلات على السبورة.', 'steps', true);
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement as HTMLElement | null;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key !== 'Tab') return;
      const controls = dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled)');
      const first = controls?.[0], last = controls?.[controls.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) {
        event.preventDefault(); last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      generation.current += 1;
      requestRef.current = false;
      stopListening(); legacyNarrator.cancel();
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
      previousFocus?.focus();
    };
  }, [isOpen, questionId, resultId, context, tutorSessionId]);
  React.useEffect(() => { if (!autoVoice) legacyNarrator.cancel(); }, [autoVoice, legacyNarrator]);

  const toggleListening = () => {
    if (listening) { stopListening(); return; }
    if (requestRef.current) return;
    const target = window as typeof window & {
      SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };
    const Recognition = target.SpeechRecognition || target.webkitSpeechRecognition;
    if (!Recognition) { setError('الصوت غير متاح في هذا المتصفح. يمكنك كتابة سؤالك.'); setChatOpen(true); return; }
    interrupt(); setChatOpen(true);
    const recognition = new Recognition();
    recognition.lang = activeLesson?.plan?.language || 'ar-SA';
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onresult = (event: any) => {
      const transcript = String(event?.results?.[0]?.[0]?.transcript || '').trim();
      recognitionRef.current = null; setListening(false);
      if (transcript) void (main.checkpoint && !reply ? attemptStep(transcript) : ask(transcript));
    };
    recognition.onerror = () => { recognitionRef.current = null; setListening(false); setError('لم ألتقط الكلام بوضوح. جرّب مرة أخرى أو اكتب سؤالك.'); };
    recognition.onend = () => { if (recognitionRef.current === recognition) { recognitionRef.current = null; setListening(false); } };
    recognitionRef.current = recognition;
    try { recognition.start(); setListening(true); setError(''); }
    catch { recognitionRef.current = null; setListening(false); setError('تعذر تشغيل الميكروفون. يمكنك كتابة سؤالك.'); }
  };

  if (!isOpen) return null;
  return (
    <div ref={dialogRef} tabIndex={-1} className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/75 p-2 backdrop-blur-sm sm:p-5" dir="rtl" role="dialog" aria-modal="true" aria-label="المعلم الذكي التفاعلي">
      <div className="flex h-[96dvh] w-full max-w-7xl flex-col overflow-hidden rounded-3xl border border-white/15 bg-slate-950 text-white shadow-2xl sm:h-[92dvh]">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-slate-900 px-4 py-3">
          <div className="flex items-center gap-2"><Bot className="text-violet-400" size={24} /><div><h2 className="font-black">المعلم الذكي التفاعلي</h2><p className="text-xs text-slate-400">السبورة الذكية • الدرجة والإتقان يحسبهما النظام</p></div></div>
          <div className="flex items-center gap-2">
            <button type="button" className="min-h-11 min-w-11 rounded-xl bg-slate-800 p-2" onClick={() => setAutoVoice(value => !value)} aria-label={autoVoice ? 'إيقاف الصوت' : 'تشغيل الصوت'} aria-pressed={autoVoice}>{autoVoice ? <Volume2 size={19} /> : <VolumeX size={19} />}</button>
            <button type="button" className="min-h-11 rounded-xl bg-violet-600 px-3" onClick={() => { interrupt(); setChatOpen(value => !value); }} aria-expanded={chatOpen} aria-controls="teacher-dialogue"><MessageCircle className="inline" size={18} /> اسأل المعلم</button>
            <button type="button" className="min-h-11 min-w-11 rounded-xl bg-slate-800 p-2" onClick={onClose} aria-label="إغلاق المعلم الذكي"><X size={19} /></button>
          </div>
        </header>
        <div className={`grid min-h-0 flex-1 ${chatOpen ? 'grid-rows-[minmax(0,1fr)_minmax(180px,.6fr)] lg:grid-rows-1 lg:grid-cols-[minmax(0,4fr)_minmax(260px,1fr)]' : 'grid-cols-1'}`}>
          <section className="flex min-h-0 flex-col gap-3 bg-slate-900 p-3 sm:p-5">
            <div className="min-h-0 flex-1 overflow-auto rounded-2xl border border-slate-800 bg-slate-950">
              {activeLesson?.plan ? <TeachingBoard elements={active.elements} narration={active.narration} language={activeLesson.plan.language} /> : activeLesson ?
                <InteractiveWhiteboardCanvas text={activeLesson.text} viewMode="full_chalkboard" isPlaying={false} showInternalControls={false} isPending={pending} onAskAboutStep={prompt => void ask(prompt)} /> :
                <div className="flex min-h-64 flex-col items-center justify-center gap-4 p-5 text-center"><Bot size={40} className="text-emerald-400" /><p>{pending ? 'المعلم يجهز الشرح…' : 'السبورة جاهزة'}</p>{!pending && <button type="button" className="rounded-xl bg-emerald-600 px-4 py-3" onClick={() => void ask('اشرح السؤال خطوة بخطوة.', 'steps', true)}>ابدأ الشرح</button>}</div>}
            </div>
            {pending && <p role="status" className="flex items-center gap-2 text-sm text-emerald-300"><Loader2 size={16} className="animate-spin" /> المعلم يفكر…</p>}
            {main.checkpoint && !reply && <PracticeCheckpoint key={`${questionId}-${main.sceneIndex}`} checkpoint={main.checkpoint} pending={pending}
              onAttempt={attemptStep} onSkip={() => main.completeCheckpoint(true)} />}
            {reply && <button type="button" disabled={pending} className="min-h-11 rounded-xl bg-emerald-600 px-4 font-bold disabled:opacity-50" onClick={() => { branch.pause(); legacyNarrator.cancel(); setReply(null); setChatOpen(false); main.toggle(); }}>نكمل الشرح من نفس النقطة</button>}
            {activeLesson?.plan && <div className="flex items-center justify-center gap-3">
              <button type="button" className="min-h-11 min-w-11 rounded-xl bg-slate-800 p-2 disabled:opacity-40" disabled={pending || listening || active.sceneIndex === 0} onClick={() => active.seek(active.sceneIndex - 1)} aria-label="الخطوة السابقة"><ChevronRight size={20} /></button>
              <button type="button" className="flex min-h-11 items-center gap-2 rounded-xl bg-emerald-600 px-5 disabled:opacity-40" disabled={pending || listening || Boolean(active.checkpoint)} onClick={active.toggle}>{active.playing ? <Pause size={18} /> : <Play size={18} />}{active.playing ? 'إيقاف مؤقت' : 'تشغيل'}</button>
              <span className="text-sm text-slate-300">{active.sceneIndex + 1}/{activeLesson.plan.scenes.length}</span>
              <button type="button" className="min-h-11 min-w-11 rounded-xl bg-slate-800 p-2 disabled:opacity-40" disabled={pending || listening || active.sceneIndex >= activeLesson.plan.scenes.length - 1} onClick={() => active.seek(active.sceneIndex + 1)} aria-label="الخطوة التالية"><ChevronLeft size={20} /></button>
              <button type="button" className="min-h-11 min-w-11 rounded-xl bg-slate-800 p-2" onClick={() => active.seek(0)} aria-label="إعادة تشغيل الشرح"><RotateCcw size={18} /></button>
            </div>}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{[
              ['أبسط أكثر', 'اشرح النقطة الحالية ببساطة وبخطوات أقصر.'], ['مثال آخر', 'اعرض مثالاً مشابهاً للنقطة الحالية واسألني سؤالاً صغيراً.'],
              ['لماذا؟', 'لماذا قمنا بهذه الخطوة تحديداً؟'], ['أعد الشرح', 'أعد شرح السؤال من البداية بطريقة أوضح.'],
            ].map(([label, prompt]) => <button key={label} type="button" disabled={pending || listening} className="min-h-11 rounded-xl bg-slate-800 px-3 text-sm disabled:opacity-40" onClick={() => void ask(prompt, label === 'أعد الشرح' ? 'steps' : 'follow_up', label === 'أعد الشرح')}>{label}</button>)}</div>
            {error && <p role="alert" className="rounded-xl bg-rose-950/60 p-3 text-sm text-rose-300">{error}</p>}
          </section>
          {chatOpen && <aside id="teacher-dialogue" className="flex min-h-0 flex-col border-t border-white/10 p-3 lg:border-r lg:border-t-0">
            <div className="flex items-center justify-between"><h3 className="font-bold">الحوار</h3><button type="button" onClick={() => setChatOpen(false)} className="min-h-11 min-w-11 p-2" aria-label="إخفاء الحوار"><X size={18} /></button></div>
            <div className="min-h-0 flex-1 space-y-3 overflow-auto">{turns.map(turn => <p key={turn.id} className={`rounded-xl p-3 text-sm leading-7 ${turn.role === 'student' ? 'bg-violet-600' : 'bg-slate-800'}`}>{turn.text}</p>)}</div>
            <form className="mt-3 flex gap-2" onSubmit={event => { event.preventDefault(); void ask(message); }}>
              <input aria-label="سؤالك للمعلم" value={message} onChange={event => setMessage(event.target.value)} onFocus={interrupt} disabled={pending || listening} maxLength={800} placeholder="اسأل المعلم…" className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2" />
              <button type="button" onClick={toggleListening} disabled={pending} className={`min-h-11 min-w-11 rounded-xl p-2 ${listening ? 'bg-rose-600' : 'bg-slate-800'}`} aria-label={listening ? 'إيقاف الاستماع' : 'التحدث مع المعلم'}>{listening ? <MicOff size={18} /> : <Mic size={18} />}</button>
              <button type="submit" disabled={pending || listening || !message.trim()} className="min-h-11 min-w-11 rounded-xl bg-violet-600 p-2 disabled:opacity-40" aria-label="إرسال السؤال للمعلم"><Send size={18} /></button>
            </form>
          </aside>}
        </div>
      </div>
    </div>
  );
};
