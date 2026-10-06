import React from "react";
import { Bot, Loader2, Mic, MicOff, Send, Volume2, VolumeX, X } from "lucide-react";
import { api } from "../../services/api";

type AssistantContext = "result_review" | "saved_review" | "mistake_review" | "mastery_review";

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: any) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

const getSpeechRecognition = (): (new () => SpeechRecognitionLike) | null => {
  if (typeof window === "undefined") return null;
  const target = window as typeof window & {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return target.SpeechRecognition || target.webkitSpeechRecognition || null;
};

type SmartTeacherTurn = {
  id: string;
  role: "student" | "teacher";
  text: string;
};

const speakArabic = (text: string) => {
  if (typeof window === "undefined" || !("speechSynthesis" in window) || !text.trim()) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "ar-SA";
  utterance.rate = 0.94;
  window.speechSynthesis.speak(utterance);
};

export const InteractiveSmartTeacher: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  resultId?: string;
  questionId: string;
  context: AssistantContext;
  tutorSessionId: string;
}> = ({ isOpen, onClose, resultId, questionId, context, tutorSessionId }) => {
  const [turns, setTurns] = React.useState<SmartTeacherTurn[]>([]);
  const [message, setMessage] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState("");
  const [autoVoice, setAutoVoice] = React.useState(true);
  const [listening, setListening] = React.useState(false);
  const recognitionRef = React.useRef<SpeechRecognitionLike | null>(null);

  React.useEffect(() => {
    if (!isOpen) {
      recognitionRef.current?.stop();
      recognitionRef.current = null;
      setListening(false);
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const ask = async (
    studentText: string,
    helpLevel: "concept" | "steps" | "follow_up" = "follow_up",
  ) => {
    const clean = studentText.trim();
    if (!clean || pending) return;

    const studentTurn: SmartTeacherTurn = {
      id: `student-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      role: "student",
      text: clean,
    };
    setTurns((current) => [...current, studentTurn]);
    setPending(true);
    setError("");
    setMessage("");

    try {
      const response = await api.aiQuestionAssistant({
        ...(resultId ? { resultId } : {}),
        context,
        questionId,
        helpLevel,
        message: clean.slice(0, 800),
        tutorSessionId,
      });
      const text = String(response.text || "").trim();
      if (!text) throw new Error("لم يصل شرح الآن. حاول مرة أخرى.");
      setTurns((current) => [
        ...current,
        {
          id: `teacher-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          role: "teacher",
          text,
        },
      ]);
      if (autoVoice) speakArabic(text);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "تعذر تشغيل المعلم الذكي الآن.");
    } finally {
      setPending(false);
    }
  };

  const toggleListening = () => {
    if (listening) {
      recognitionRef.current?.stop();
      recognitionRef.current = null;
      setListening(false);
      return;
    }
    if (pending) return;
    const SpeechRecognitionCtor = getSpeechRecognition();
    if (!SpeechRecognitionCtor) {
      setError("المحادثة الصوتية غير مدعومة في هذا المتصفح. جرّب Chrome.");
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = "ar-SA";
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onresult = (event: any) => {
      const transcript = String(event?.results?.[0]?.[0]?.transcript || "").trim();
      recognitionRef.current = null;
      setListening(false);
      if (transcript) void ask(transcript, "follow_up");
    };
    recognition.onerror = () => {
      recognitionRef.current = null;
      setListening(false);
      setError("لم ألتقط الكلام بوضوح. جرّب مرة أخرى.");
    };
    recognition.onend = () => {
      recognitionRef.current = null;
      setListening(false);
    };
    recognitionRef.current = recognition;
    setListening(true);
    setError("");
    recognition.start();
  };

  const latestTeacherTurn = [...turns].reverse().find((turn) => turn.role === "teacher");

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/75 p-2 backdrop-blur-sm sm:p-5"
      dir="rtl"
      role="dialog"
      aria-modal="true"
      aria-label="المعلم الذكي التفاعلي"
    >
      <div className="flex h-[96vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-white/15 bg-slate-950 shadow-2xl sm:h-[92vh]">
        <header className="flex items-center justify-between border-b border-white/10 bg-slate-900 px-4 py-3 text-white sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-600">
              <Bot size={22} />
            </span>
            <div>
              <h2 className="font-black">المعلم الذكي التفاعلي</h2>
              <p className="text-[11px] font-bold text-slate-400">اشرح • ناقش • جرّب مثالًا • اسأل لماذا</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setAutoVoice((value) => !value)}
              className="rounded-xl border border-white/10 p-2 text-slate-200 hover:bg-white/10"
              title={autoVoice ? "إيقاف القراءة الصوتية" : "تشغيل القراءة الصوتية"}
            >
              {autoVoice ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-white/10 p-2 text-slate-200 hover:bg-white/10"
              aria-label="إغلاق المعلم الذكي"
            >
              <X size={19} />
            </button>
          </div>
        </header>

        <div className="grid min-h-0 flex-1 gap-0 lg:grid-cols-[minmax(0,1.45fr)_minmax(300px,.55fr)]">
          <section className="flex min-h-0 flex-col bg-slate-900 p-3 sm:p-5">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <div className="text-sm font-black text-white">السبورة الذكية</div>
                <div className="text-[11px] font-bold text-slate-400">
                  الشرح هنا مساعد تعليمي فقط؛ الدرجة والإتقان يحسبهما النظام.
                </div>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto rounded-3xl border border-slate-700 bg-slate-50 p-5 shadow-inner sm:p-8">
              {!latestTeacherTurn ? (
                <div className="flex h-full min-h-64 flex-col items-center justify-center text-center">
                  <Bot size={42} className="text-violet-600" />
                  <h3 className="mt-4 text-xl font-black text-slate-900">السبورة جاهزة</h3>
                  <p className="mt-2 max-w-md text-sm font-bold leading-7 text-slate-500">
                    ابدأ بالشرح، أو اطلب تبسيط الفكرة، أو ناقش المعلم في سبب كل خطوة.
                  </p>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => void ask("ابدأ شرح هذا السؤال خطوة بخطوة وناقشني باختصار.", "steps")}
                    className="mt-5 rounded-2xl bg-violet-600 px-5 py-3 text-sm font-black text-white disabled:opacity-50"
                  >
                    ابدأ الشرح
                  </button>
                </div>
              ) : (
                <div className="whitespace-pre-wrap text-lg font-bold leading-9 text-slate-800 sm:text-xl sm:leading-10">
                  {latestTeacherTurn.text}
                </div>
              )}
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                ["أبسط أكثر", "اشرح لي نفس الفكرة بطريقة أبسط جدًا وبخطوات أقصر."],
                ["مثال آخر", "أعطني مثالًا مشابهًا بسيطًا ثم اسألني سؤالًا صغيرًا لأتأكد أنني فهمت."],
                ["لماذا؟", "لماذا نستخدم هذه الفكرة أو الخطوة هنا؟ اربط السبب بالسؤال."],
                ["أعد الشرح", "أعد شرح السؤال من البداية خطوة بخطوة بطريقة مختلفة."],
              ].map(([label, prompt]) => (
                <button
                  key={label}
                  type="button"
                  disabled={pending}
                  onClick={() => void ask(prompt, label === "أعد الشرح" ? "steps" : "follow_up")}
                  className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-xs font-black text-white hover:bg-slate-700 disabled:opacity-50"
                >
                  {label}
                </button>
              ))}
            </div>
          </section>

          <aside className="flex min-h-0 flex-col border-t border-white/10 bg-slate-950 p-3 lg:border-r lg:border-t-0 sm:p-4">
            <div className="text-sm font-black text-white">الحوار</div>
            <div className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto">
              {turns.length === 0 ? (
                <p className="rounded-2xl bg-slate-900 p-4 text-xs font-bold leading-6 text-slate-400">
                  تقدر تسأل المعلم عن أي خطوة داخل هذا السؤال فقط.
                </p>
              ) : (
                turns.map((turn) => (
                  <div
                    key={turn.id}
                    className={`rounded-2xl p-3 text-xs font-bold leading-6 ${
                      turn.role === "student"
                        ? "mr-6 bg-violet-600 text-white"
                        : "ml-6 bg-slate-800 text-slate-100"
                    }`}
                  >
                    {turn.text}
                  </div>
                ))
              )}
              {pending ? (
                <div className="ml-6 flex items-center gap-2 rounded-2xl bg-slate-800 p-3 text-xs font-bold text-slate-300">
                  <Loader2 size={14} className="animate-spin" />
                  المعلم يفكر…
                </div>
              ) : null}
            </div>

            {error ? (
              <div className="my-2 rounded-xl border border-rose-900/60 bg-rose-950/40 p-2 text-[11px] font-bold text-rose-300">
                {error}
              </div>
            ) : null}

            <form
              className="mt-3 flex gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                void ask(message, "follow_up");
              }}
            >
              <input
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                disabled={pending}
                maxLength={800}
                placeholder="اسأل المعلم…"
                className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm font-bold text-white outline-none placeholder:text-slate-500 focus:border-violet-500"
              />
              <button
                type="button"
                onClick={toggleListening}
                disabled={pending}
                className={`flex h-11 w-11 items-center justify-center rounded-xl border disabled:opacity-50 ${
                  listening
                    ? "border-rose-500 bg-rose-600 text-white"
                    : "border-slate-700 bg-slate-900 text-slate-200"
                }`}
                aria-label={listening ? "إيقاف الاستماع" : "التحدث مع المعلم"}
                title={listening ? "إيقاف الاستماع" : "تحدث مع المعلم"}
              >
                {listening ? <MicOff size={17} /> : <Mic size={17} />}
              </button>
              <button
                type="submit"
                disabled={pending || !message.trim()}
                className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-600 text-white disabled:opacity-50"
                aria-label="إرسال السؤال للمعلم"
              >
                <Send size={17} />
              </button>
            </form>
          </aside>
        </div>
      </div>
    </div>
  );
};
