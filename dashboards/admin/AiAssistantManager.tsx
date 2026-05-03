import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bot, CheckCircle2, Loader2, MessageCircle, Send, Settings, Sparkles, Zap } from 'lucide-react';
import { api } from '../../services/api';
import { sanitizeArabicText } from '../../utils/sanitizeMojibakeArabic';

type AiStatus = {
    provider: 'gemini' | 'openrouter' | 'deepseek' | 'qwen' | 'openai' | 'ollama' | 'lmstudio' | 'none';
    ollamaConfigured: boolean;
    lmStudioConfigured?: boolean;
    geminiConfigured: boolean;
    providers?: AiProviderStatus[];
    providerOrder?: string[];
    model: string;
    timeoutMs: number;
};

type AiProviderStatus = {
    id: AiStatus['provider'];
    label: string;
    model: string;
    configured: boolean;
    category: 'free-friendly' | 'paid' | 'local' | 'fallback';
    envKeys: string[];
    note: string;
};

type Message = {
    id: string;
    role: 'user' | 'assistant';
    text: string;
};

const providerLabel: Record<AiStatus['provider'], string> = {
    gemini: 'Google Gemini',
    openrouter: 'OpenRouter',
    deepseek: 'DeepSeek',
    qwen: 'Qwen / Alibaba',
    openai: 'OpenAI',
    ollama: 'Ollama محلي',
    lmstudio: 'LM Studio محلي',
    none: 'وضع احتياطي بدون مزود',
};

const cleanText = (value: string) => sanitizeArabicText(value) || value;

const categoryLabel: Record<AiProviderStatus['category'], string> = {
    'free-friendly': 'مناسب للمجاني',
    paid: 'مدفوع / احترافي',
    local: 'محلي',
    fallback: 'احتياطي',
};

export const AiAssistantManager: React.FC = () => {
    const [status, setStatus] = useState<AiStatus | null>(null);
    const [loadingStatus, setLoadingStatus] = useState(true);
    const [statusError, setStatusError] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([
        {
            id: 'welcome',
            role: 'assistant',
            text: 'أنا مساعد المدير. اسألني عن حالة المنصة، أخطاء الطلاب، المحتوى الناقص، أو ما الذي يجب عمله قبل التسليم.',
        },
    ]);
    const [input, setInput] = useState('ما أهم شيء أراجعه الآن؟');
    const [sending, setSending] = useState(false);
    const [testingProvider, setTestingProvider] = useState<string | null>(null);
    const [providerTestResults, setProviderTestResults] = useState<Record<string, string>>({});
    const endRef = useRef<HTMLDivElement>(null);

    const loadStatus = async () => {
        setLoadingStatus(true);
        setStatusError(null);
        try {
            const response = await api.aiStatus();
            setStatus(response as AiStatus);
        } catch (error) {
            console.error('Failed to load AI status', error);
            setStatusError(error instanceof Error ? error.message : 'تعذر قراءة حالة الذكاء الاصطناعي.');
        } finally {
            setLoadingStatus(false);
        }
    };

    useEffect(() => {
        loadStatus();
    }, []);

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const modeDescription = useMemo(() => {
        if (!status) return 'جاري فحص حالة المساعد...';
        if (status.provider === 'none') {
            return 'المساعد يعمل الآن بردود احتياطية ذكية من داخل النظام. هذا مجاني لكنه ليس ذكاء توليديا كاملا.';
        }
        if (status.provider === 'gemini') {
            return 'المساعد مربوط بمزود سحابي. هذا يعطي إجابات أذكى، وقد يحتاج مفتاح API وحساب فوترة حسب استخدامك.';
        }
        return 'المساعد مضبوط على مزود محلي. هذا مناسب للتجارب على جهاز قوي، لكنه لا يعمل عادة على Render المجاني إلا إذا كان المزود متاحا للخادم.';
    }, [status]);

    const sendMessage = async (override?: string) => {
        const text = (override || input).trim();
        if (!text || sending) return;

        setMessages((current) => [...current, { id: `${Date.now()}-user`, role: 'user', text }]);
        setInput('');
        setSending(true);

        try {
            const response = await api.aiAdminAssistant({ message: text });
            setMessages((current) => [
                ...current,
                { id: `${Date.now()}-assistant`, role: 'assistant', text: cleanText(response.text) },
            ]);
            if (response.provider && status?.provider !== response.provider) {
                await loadStatus();
            }
        } catch (error) {
            setMessages((current) => [
                ...current,
                {
                    id: `${Date.now()}-assistant-error`,
                    role: 'assistant',
                    text: error instanceof Error ? error.message : 'تعذر تشغيل مساعد المدير الآن.',
                },
            ]);
        } finally {
            setSending(false);
        }
    };

    const testProvider = async (provider: Exclude<AiStatus['provider'], 'none'>) => {
        setTestingProvider(provider);
        try {
            const response = await api.aiTestProvider({ provider });
            setProviderTestResults((current) => ({
                ...current,
                [provider]: response.ok
                    ? `يعمل - ${response.latencyMs || 0}ms${response.sample ? ` - ${cleanText(response.sample)}` : ''}`
                    : cleanText(response.message || 'لم ينجح الاختبار'),
            }));
        } catch (error) {
            setProviderTestResults((current) => ({
                ...current,
                [provider]: error instanceof Error ? cleanText(error.message) : 'تعذر اختبار المزود',
            }));
        } finally {
            setTestingProvider(null);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 text-sm font-bold text-indigo-600 mb-2">
                        <Bot size={16} />
                        إدارة المساعد الذكي
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">مساعد الطالب ومساعد المدير</h1>
                    <p className="text-sm text-gray-500 mt-2 max-w-3xl">
                        هنا تعرف هل الذكاء الاصطناعي مربوط فعلا، وتجرب مساعد المدير الذي يقرأ حالة المنصة ويعطيك خطوات تشغيل واضحة.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={loadStatus}
                    disabled={loadingStatus}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-gray-900 text-white font-bold hover:bg-gray-800 disabled:opacity-60"
                >
                    {loadingStatus ? <Loader2 size={16} className="animate-spin" /> : <Settings size={16} />}
                    تحديث الحالة
                </button>
            </div>

            {statusError && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{statusError}</div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2 bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                    <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                        <div>
                            <h2 className="font-bold text-gray-900 flex items-center gap-2">
                                <MessageCircle size={18} />
                                مساعد المدير
                            </h2>
                            <p className="text-sm text-gray-500 mt-1">يساعدك في الإدارة والتشخيص، ولا يظهر للطلاب.</p>
                        </div>
                        <span className="text-xs px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 font-bold">
                            خاص بالمدير
                        </span>
                    </div>

                    <div className="h-[430px] overflow-y-auto bg-gray-50 p-5 space-y-4">
                        {messages.map((message) => (
                            <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-start' : 'justify-end'}`}>
                                <div
                                    className={`max-w-[85%] rounded-xl p-4 text-sm leading-7 whitespace-pre-line ${
                                        message.role === 'user'
                                            ? 'bg-indigo-600 text-white rounded-br-none'
                                            : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none'
                                    }`}
                                >
                                    {message.text}
                                </div>
                            </div>
                        ))}
                        {sending && (
                            <div className="flex justify-end">
                                <div className="bg-white border border-gray-200 text-gray-500 rounded-xl rounded-bl-none p-4 text-sm flex items-center gap-2">
                                    <Loader2 size={16} className="animate-spin" />
                                    يفحص حالة المنصة...
                                </div>
                            </div>
                        )}
                        <div ref={endRef} />
                    </div>

                    <div className="p-4 border-t border-gray-100 bg-white">
                        <div className="flex flex-wrap gap-2 mb-3">
                            {[
                                'ما أهم شيء أراجعه الآن؟',
                                'هل المنصة جاهزة للتسليم؟',
                                'اشرح لي حالة الذكاء الاصطناعي',
                            ].map((prompt) => (
                                <button
                                    key={prompt}
                                    type="button"
                                    onClick={() => sendMessage(prompt)}
                                    disabled={sending}
                                    className="px-3 py-1.5 rounded-full bg-gray-100 text-gray-600 text-xs font-bold hover:bg-gray-200 disabled:opacity-60"
                                >
                                    {prompt}
                                </button>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={input}
                                onChange={(event) => setInput(event.target.value)}
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter') void sendMessage();
                                }}
                                placeholder="اسأل مساعد المدير..."
                                className="flex-1 rounded-lg border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                disabled={sending}
                            />
                            <button
                                type="button"
                                onClick={() => void sendMessage()}
                                disabled={sending || !input.trim()}
                                className="px-4 py-3 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
                                aria-label="إرسال"
                            >
                                {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-5">
                        <h2 className="font-bold text-gray-900 flex items-center gap-2">
                            <Zap size={18} />
                            حالة الربط
                        </h2>
                        <div className="mt-4 space-y-4">
                            <div className="rounded-lg bg-gray-50 border border-gray-100 p-4">
                                <p className="text-xs text-gray-500">المزود الحالي</p>
                                <p className="text-lg font-black text-gray-900 mt-1">
                                    {status ? providerLabel[status.provider] : 'جاري الفحص...'}
                                </p>
                            </div>
                            <div className="rounded-lg bg-gray-50 border border-gray-100 p-4">
                                <p className="text-xs text-gray-500">النموذج</p>
                                <p className="text-sm font-bold text-gray-900 mt-1 break-words">{status?.model || 'غير محدد'}</p>
                            </div>
                            <p className="text-sm text-gray-600 leading-6">{modeDescription}</p>
                        </div>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-5">
                        <h2 className="font-bold text-gray-900 flex items-center gap-2">
                            <Settings size={18} />
                            مزودو الذكاء المتاحون
                        </h2>
                        <p className="text-sm text-gray-500 mt-2 leading-6">
                            أضف المفاتيح في Render Environment Variables، وضع الترتيب في AI_PROVIDER_ORDER مثل:
                            <span className="block mt-1 font-mono text-xs bg-gray-50 border border-gray-100 rounded-md p-2 text-gray-700">
                                gemini,openrouter,qwen,deepseek,openai
                            </span>
                        </p>
                        <div className="mt-4 space-y-3">
                            {(status?.providers || []).map((provider) => (
                                <div key={provider.id} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="font-black text-gray-900">{provider.label}</p>
                                            <p className="text-xs text-gray-500 mt-1">{categoryLabel[provider.category]} · {provider.model}</p>
                                        </div>
                                        <span
                                            className={`text-xs px-2 py-1 rounded-full font-bold ${
                                                provider.configured ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-600'
                                            }`}
                                        >
                                            {provider.configured ? 'مفعل' : 'غير مفعل'}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-600 leading-5 mt-2">{cleanText(provider.note)}</p>
                                    {provider.envKeys.length > 0 && (
                                        <p className="text-[11px] text-gray-500 mt-2 font-mono break-words">
                                            {provider.envKeys.join(' · ')}
                                        </p>
                                    )}
                                    {provider.id !== 'none' && (
                                        <div className="mt-3 flex flex-col gap-2">
                                            <button
                                                type="button"
                                                disabled={!provider.configured || testingProvider === provider.id}
                                                onClick={() => void testProvider(provider.id as Exclude<AiStatus['provider'], 'none'>)}
                                                className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                                            >
                                                {testingProvider === provider.id ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                                                اختبار المزود
                                            </button>
                                            {providerTestResults[provider.id] && (
                                                <p className="text-xs text-gray-600 leading-5">{providerTestResults[provider.id]}</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-5">
                        <h2 className="font-bold text-gray-900 flex items-center gap-2">
                            <CheckCircle2 size={18} />
                            ماذا نحتاج للتفعيل الحقيقي؟
                        </h2>
                        <div className="mt-4 space-y-3 text-sm text-gray-600 leading-6">
                            <p>الخيار الأسهل: ربط Gemini بمفتاح API في Render عبر `GEMINI_API_KEY` و `AI_PROVIDER=gemini`.</p>
                            <p>الخيار المحلي: Ollama أو LM Studio مناسب على جهازك، لكنه لا يكون ثابتا للطلاب على الاستضافة السحابية المجانية.</p>
                            <p>بدون مفتاح: المساعد يظل يعمل بردود احتياطية، لكنه ليس ذكاء توليديا كاملا.</p>
                        </div>
                    </div>

                    <div className="bg-emerald-600 rounded-lg p-5 text-white">
                        <h2 className="font-bold flex items-center gap-2">
                            <Sparkles size={18} />
                            الفصل بين المساعدين
                        </h2>
                        <p className="text-sm text-emerald-50 mt-2 leading-6">
                            مساعد الطالب للتعلم فقط. مساعد المدير للإدارة والتشخيص والتسليم، وموجود داخل لوحة الإدارة فقط.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
