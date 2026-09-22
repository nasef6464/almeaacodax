import React from 'react';
import { Square, Volume2 } from 'lucide-react';
import type { QuestionVoiceExplanation } from '../../types';

export const QuestionVoiceExplanationPlayer: React.FC<{
  voiceExplanation?: QuestionVoiceExplanation;
}> = ({ voiceExplanation }) => {
  const [isSpeaking, setIsSpeaking] = React.useState(false);
  const text = String(voiceExplanation?.text || '').trim();
  const audioUrl = String(voiceExplanation?.audioUrl || '').trim();

  React.useEffect(() => () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }, []);

  if (!audioUrl && !text) return null;

  const stopSpeech = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  };

  const speakTeacherText = () => {
    if (!text || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ar-SA';
    utterance.rate = 0.95;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  return (
    <div className="rounded-2xl border border-sky-100 bg-sky-50/60 p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm font-black text-sky-950">
        <Volume2 size={17} />
        شرح المعلم الصوتي
      </div>

      {audioUrl ? (
        <audio controls preload="metadata" className="w-full" src={audioUrl}>
          متصفحك لا يدعم تشغيل الصوت.
        </audio>
      ) : (
        <button
          type="button"
          onClick={isSpeaking ? stopSpeech : speakTeacherText}
          className="inline-flex items-center gap-2 rounded-xl border border-sky-200 bg-white px-3 py-2 text-xs font-black text-sky-900"
        >
          {isSpeaking ? <Square size={14} /> : <Volume2 size={15} />}
          {isSpeaking ? 'إيقاف الشرح' : 'استمع لشرح المعلم'}
        </button>
      )}

      <p className="text-[11px] font-bold leading-5 text-sky-800">
        {audioUrl ? 'هذا تسجيل صوتي اعتمده المعلم لهذا السؤال.' : 'يُقرأ النص اليدوي الذي كتبه المعلم لهذا السؤال.'}
      </p>
    </div>
  );
};
