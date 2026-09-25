import React from 'react';
import { Loader2, Mic, MicOff, Volume2 } from 'lucide-react';
import { api } from '../../services/api';

type AssistantContext = "result_review" | "saved_review" | "mistake_review" | "mastery_review";

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

const getSpeechRecognition = (): (new () => SpeechRecognitionLike) | null => {
  if (typeof window === 'undefined') return null;
  const target = window as typeof window & {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return target.SpeechRecognition || target.webkitSpeechRecognition || null;
};

const speakArabic = (text: string) => {
  if (typeof window === 'undefined' || !('speechSynthesis' in window) || !text.trim()) return false;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'ar-SA';
  utterance.rate = 0.95;
  window.speechSynthesis.speak(utterance);
  return true;
};

export const QuestionAssistantPanel: React.FC<{
  resultId?: string;
  questionId: string;
  hasImage: boolean;
  context?: AssistantContext;
}> = ({ resultId, questionId, context = "result_review" }) => {
  const tutorSessionIdRef = React.useRef(
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? `question:${crypto.randomUUID()}`
      : `question:${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  const recognitionRef = React.useRef<SpeechRecognitionLike | null>(null);
  const [listening, setListening] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [status, setStatus] = React.useState('');
  const [error, setError] = React.useState('');

  const stopListening = () => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setListening(false);
  };

  const sendVoiceTurn = async (message: string) => {
    const clean = message.trim();
    if (!clean || pending) return;
    setPending(true);
    setStatus('المعلم يفكر…');
    setError('');
    try {
      const payload = await api.aiQuestionAssistant({
        ...(resultId ? { resultId } : {}),
        context,
        questionId,
        helpLevel: 'follow_up',
        message: clean.slice(0, 800),
        tutorSessionId: tutorSessionIdRef.current,
      });
      const responseText = String(payload.text || '').trim();
      if (!responseText) {
        setStatus('');
        setError('لم يصل رد صوتي الآن. حاول مرة أخرى.');
        return;
      }
      const spoken = speakArabic(responseText);
      setStatus(spoken ? 'المعلم يشرح الآن…' : 'الرد جاهز، لكن تشغيل الصوت غير متاح على هذا الجهاز.');
    } catch (err) {
      setStatus('');
      setError(err instanceof Error ? err.message : 'تعذر تشغيل المعلم الصوتي الآن.');
    } finally {
      setPending(false);
    }
  };

  const startListening = () => {
    if (!questionId || pending || listening || (context === "result_review" && !resultId)) return;
    const SpeechRecognitionCtor = getSpeechRecognition();
    if (!SpeechRecognitionCtor) {
      setError('المحادثة الصوتية غير مدعومة في هذا المتصفح. جرّب Chrome على الهاتف.');
      return;
    }

    setError('');
    setStatus('تكلّم الآن…');
    const recognition = new SpeechRecognitionCtor();
    recognition.lang = 'ar-SA';
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onresult = (event: any) => {
      const transcript = String(event?.results?.[0]?.[0]?.transcript || '').trim();
      setListening(false);
      recognitionRef.current = null;
      if (transcript) void sendVoiceTurn(transcript);
      else setStatus('');
    };
    recognition.onerror = () => {
      setListening(false);
      recognitionRef.current = null;
      setStatus('');
      setError('لم ألتقط الكلام بوضوح. اضغط الميكروفون وحاول مرة أخرى.');
    };
    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;
    };
    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  };

  if (context === "result_review" && !resultId) return null;

  return (
    <div className="flex flex-col items-center gap-2 py-1" data-testid="question-assistant-panel">
      <button
        type="button"
        onClick={listening ? stopListening : startListening}
        disabled={pending}
        className={`inline-flex h-12 min-w-12 items-center justify-center gap-2 rounded-full px-4 text-sm font-black shadow-sm transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 ${
          listening ? 'bg-rose-600 text-white' : 'bg-violet-600 text-white hover:bg-violet-700'
        }`}
        aria-label={listening ? 'إيقاف الاستماع' : 'التحدث مع المعلم الذكي'}
        title={listening ? 'إيقاف الاستماع' : 'المعلم الذكي الصوتي'}
      >
        {pending ? <Loader2 size={20} className="animate-spin" /> : listening ? <MicOff size={20} /> : <Mic size={20} />}
        <span className="hidden sm:inline">{listening ? 'إيقاف' : 'المعلم الصوتي'}</span>
      </button>
      {status ? (
        <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-500" aria-live="polite">
          {status.includes('يشرح') ? <Volume2 size={13} /> : null}
          {status}
        </div>
      ) : null}
      {error ? <p className="max-w-sm text-center text-[11px] font-bold text-rose-600">{error}</p> : null}
    </div>
  );
};
