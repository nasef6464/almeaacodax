import React from "react";
import {
  BrainCircuit,
  Loader2,
  Mic,
  MicOff,
  RefreshCcw,
  Send,
  Sparkles,
  Volume2,
  X,
} from "lucide-react";
import { api } from "../../services/api";

type AssistantContext =
  | "result_review"
  | "saved_review"
  | "mistake_review"
  | "mastery_review";

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

const recognitionCtor = () => {
  if (typeof window === "undefined") return null;
  const target = window as typeof window & {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return target.SpeechRecognition || target.webkitSpeechRecognition || null;
};

const speak = (text: string) => {
  if (
    typeof window === "undefined" ||
    !("speechSynthesis" in window) ||
    !text.trim()
  ) {
    return;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "ar-SA";
  utterance.rate = 0.92;
  window.speechSynthesis.speak(utterance);
};

export const SmartTeacherBoard: React.FC<{
  open: boolean;
  onClose: () => void;
  questionId: string;
  resultId?: string;
  context: AssistantContext;
  tutorSessionId: string;
}> = ({ open, onClose, questionId, resultId, context, tutorSessionId }) => {
  const [pending, setPending] = React.useState(false);
  const [listening, setListening] = React.useState(false);
  const [input, setInput] = React.useState("");
  const [answer, setAnswer] = React.useState("");
  const [visibleWords, setVisibleWords] = React.useState(0);
  const [error, setError] = React.useState("");
  const recognitionRef = React.useRef<SpeechRecognitionLike | null>(null);

  const words = React.useMemo(
    () => answer.split(/\s+/).filter(Boolean),
    [answer],
  );

  React.useEffect(() => {
    if (!answer) {
      setVisibleWords(0);
      return;
    }
    setVisibleWords(1);
    const timer = window.setInterval(() => {
      setVisibleWords((current) => {
        if (current >= words.length) {
          window.clearInterval(timer);
          return current;
        }
        return Math.min(words.length, current + 2);
      });
    }, 85);
    return () => window.clearInterval(timer);
  }, [answer, words.length]);

  React.useEffect(
    () => () => {
      recognitionRef.current?.stop();
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    },
    [],
  );

  const ask = async (
    message: string,
    helpLevel: "hint" | "stronger_hint" | "concept" | "steps" | "follow_up" = "follow_up",
  ) => {
    const clean = message.trim();
    if (!clean || pending) return;
    setPending(true);
    setError("");
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
      if (!text) throw new Error("لم يصل شرح الآن.");
      setAnswer(text);
      speak(text);
    } catch (askError) {
      setError(
        askError instanceof Error
          ? askError.message
          : "تعذر تشغيل المعلم الذكي الآن.",
      );
    } finally {
      setPending(false);
    }
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setListening(false);
  };

  const startListening = () => {
    if (pending || listening) return;
    const Ctor = recognitionCtor();
    if (!Ctor) {
      setError("الإدخال الصوتي غير مدعوم في هذا المتصفح.");
      return;
    }
    setError("");
    const recognition = new Ctor();
    recognition.lang = "ar-SA";
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onresult = (event: any) => {
      const transcript = String(event?.results?.[0]?.[0]?.transcript || "").trim();
      setListening(false);
      recognitionRef.current = null;
      if (transcript) {
        setInput(transcript);
        void ask(transcript);
      }
    };
    recognition.onerror = () => {
      setListening(false);
      recognitionRef.current = null;
      setError("لم ألتقط الكلام بوضوح. حاول مرة أخرى.");
    };
    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;
    };
    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  };

  const submit = () => {
    const message = input.trim();
    if (!message) return;
    setInput("");
    void ask(message);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[120] flex flex-col bg-slate-950/95"
      dir="rtl"
      data-testid="smart-teacher-board"
    >
      <header className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3 text-white">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-violet-500/20">
            <BrainCircuit size={22} />
          </span>
          <div>
            <h2 className="text-base font-black">المعلم الذكي</h2>
            <p className="text-[11px] font-bold text-slate-300">
              نفس سؤال المراجعة • شرح تفاعلي على السبورة
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 hover:bg-white/20"
          aria-label="إغلاق المعلم الذكي"
        >
          <X size={20} />
        </button>
      </header>

      <main className="flex min-h-0 flex-1 flex-col gap-3 p-3 md:p-5">
        <section className="relative min-h-0 flex-1 overflow-auto rounded-3xl bg-white p-5 shadow-2xl md:p-8">
          <div
            className="pointer-events-none absolute inset-0 opacity-30"
            style={{
              backgroundImage:
                "linear-gradient(#e2e8f0 1px, transparent 1px), linear-gradient(90deg, #e2e8f0 1px, transparent 1px)",
              backgroundSize: "28px 28px",
            }}
          />
          <div className="relative">
            <div className="mb-4 flex items-center gap-2 text-sm font-black text-violet-700">
              <Sparkles size={17} />
              السبورة الذكية
            </div>

            {!answer && !pending ? (
              <div className="mx-auto max-w-2xl py-10 text-center">
                <h3 className="text-xl font-black text-slate-900">
                  اسأل عن السؤال بأي طريقة تحب
                </h3>
                <p className="mt-2 text-sm font-bold leading-7 text-slate-500">
                  اطلب تبسيط الفكرة، مثالًا آخر، سبب خطوة معينة، أو اشرح بطريقتك
                  وسيناقشك المعلم على نفس السؤال.
                </p>
                <button
                  type="button"
                  onClick={() =>
                    void ask(
                      "ابدأ بشرح هذا السؤال على السبورة من الفكرة الأساسية، ثم اسألني سؤال تحقق قصير.",
                      "concept",
                    )
                  }
                  className="mt-5 rounded-xl bg-violet-600 px-5 py-3 text-sm font-black text-white"
                >
                  ابدأ الشرح
                </button>
              </div>
            ) : null}

            {pending ? (
              <div className="flex min-h-40 items-center justify-center gap-2 text-sm font-black text-violet-700">
                <Loader2 size={20} className="animate-spin" />
                المعلم يرتب الشرح…
              </div>
            ) : null}

            {answer && !pending ? (
              <div className="mx-auto max-w-4xl whitespace-pre-wrap text-lg font-bold leading-10 text-slate-900 md:text-xl">
                {words.slice(0, visibleWords).join(" ")}
                {visibleWords < words.length ? (
                  <span className="mr-1 inline-block h-5 w-1 animate-pulse bg-violet-500 align-middle" />
                ) : null}
              </div>
            ) : null}
          </div>
        </section>

        <div className="flex flex-wrap gap-2">
          <QuickAction
            label="أبسط أكثر"
            onClick={() =>
              void ask("بسّط الشرح أكثر وبأقل خطوات ممكنة.", "stronger_hint")
            }
          />
          <QuickAction
            label="مثال آخر"
            onClick={() =>
              void ask("أعطني مثالًا مشابهًا بأرقام أو صياغة مختلفة ثم دعني أحاول.", "concept")
            }
          />
          <QuickAction
            label="لماذا؟"
            onClick={() =>
              void ask("اشرح لي لماذا هذه الفكرة أو الخطوة صحيحة، بدون قفزات.", "concept")
            }
          />
          <QuickAction
            label="أعد الشرح"
            icon={<RefreshCcw size={14} />}
            onClick={() =>
              void ask("أعد شرح السؤال من البداية بطريقة مختلفة.", "steps")
            }
          />
          {answer ? (
            <button
              type="button"
              onClick={() => speak(answer)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-2 text-xs font-black text-white"
            >
              <Volume2 size={14} />
              اسمع مرة أخرى
            </button>
          ) : null}
        </div>

        <div className="flex items-center gap-2 rounded-2xl bg-white/10 p-2">
          <button
            type="button"
            onClick={listening ? stopListening : startListening}
            disabled={pending}
            className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl text-white disabled:opacity-50 ${
              listening ? "bg-rose-600" : "bg-violet-600"
            }`}
            aria-label={listening ? "إيقاف الاستماع" : "التحدث مع المعلم"}
          >
            {listening ? <MicOff size={19} /> : <Mic size={19} />}
          </button>
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") submit();
            }}
            placeholder={listening ? "أسمعك الآن…" : "اكتب سؤالك للمعلم…"}
            className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white px-3 py-2.5 text-sm font-bold text-slate-900 outline-none"
          />
          <button
            type="button"
            onClick={submit}
            disabled={pending || !input.trim()}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-600 text-white disabled:opacity-50"
            aria-label="إرسال السؤال"
          >
            {pending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </button>
        </div>
        {error ? (
          <div className="rounded-xl bg-rose-500/15 px-3 py-2 text-xs font-bold text-rose-200">
            {error}
          </div>
        ) : null}
      </main>
    </div>
  );
};

const QuickAction: React.FC<{
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
}> = ({ label, onClick, icon }) => (
  <button
    type="button"
    onClick={onClick}
    className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-2 text-xs font-black text-white hover:bg-white/15"
  >
    {icon}
    {label}
  </button>
);
