import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Activity, AlertTriangle, Bot, CheckCircle2, Clock, Copy, Loader2, MessageCircle, Send, Settings, ShieldCheck, Sparkles, Target, Users, Zap, Search, Filter, RefreshCw, Trash2, Check, ExternalLink, ChevronDown, BarChart2, Info, X, Play, ArrowLeftRight, CheckSquare } from 'lucide-react';
import { api } from '../../services/api';
import { sanitizeArabicText } from '../../utils/sanitizeMojibakeArabic';

type AiStatus = {
    provider: 'gemini' | 'openrouter' | 'deepseek' | 'qwen' | 'openai' | 'ollama' | 'lmstudio' | 'none';
    ollamaConfigured: boolean;
    lmStudioConfigured?: boolean;
    geminiConfigured: boolean;
    providers?: AiProviderStatus[];
    providerOrder?: string[];
    providerOrderSource?: 'env' | 'admin';
    routingMode?: 'manual' | 'auto';
    model: string;
    timeoutMs: number;
};

type AiProviderStatus = {
    id: AiStatus['provider'];
    label: string;
    model: string;
    configured: boolean;
    source: 'env' | 'admin' | 'runtime-local' | 'fallback';
    category: 'free-friendly' | 'paid' | 'local' | 'fallback';
    envKeys: string[];
    note: string;
};

type Message = {
    id: string;
    role: 'user' | 'assistant';
    text: string;
};

type AiInteractionsResponse = {
    summary: {
        total: number;
        last24h: number;
        fallbackCount: number;
        errorCount: number;
        byAudience: Array<{ audience: string; count: number }>;
        byProvider: Array<{ provider: string; count: number; avgLatencyMs: number }>;
    };
    items: Array<{
        _id: string;
        audience: string;
        endpoint: string;
        provider: AiStatus['provider'];
        model: string;
        status: 'success' | 'fallback' | 'error';
        usedFallback: boolean;
        personalized: boolean;
        latencyMs: number;
        messagePreview: string;
        responsePreview: string;
        responseLength: number;
        error?: string;
        userEmail?: string;
        role?: string;
        createdAt: string;
    }>;
};

type AiReadiness = {
    checkedAt: string;
    score: number;
    activeProvider: AiStatus['provider'];
    configuredProviders: Array<{ id: string; label: string; model: string }>;
    recommendedProviderOrder: string;
    studentAdvisor: {
        ready: boolean;
        studentCount: number;
        studentsWithResults: number;
        weakSkillSignals: number;
        studentChats24h: number;
        personalizedStudentChats7d: number;
        fallbackStudentChats24h: number;
    };
    adminAssistant: {
        ready: boolean;
        chats24h: number;
    };
    monitoring: {
        aiErrors24h: number;
        fallbackStudentChats24h: number;
    };
    nextActions: string[];
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
const formatNumber = (value: number | undefined) => Number(value || 0).toLocaleString('en-US');
const formatDate = (value: string) => {
    try {
        return new Date(value).toLocaleString('ar-SA', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    } catch {
        return value;
    }
};

const categoryLabel: Record<AiProviderStatus['category'], string> = {
    'free-friendly': 'مجاني / اقتصادي',
    paid: 'مدفوع / احترافي',
    local: 'محلي',
    fallback: 'احتياطي',
};

const sourceLabel: Record<AiProviderStatus['source'], string> = {
    admin: 'من الإدارة',
    env: 'من env',
    'runtime-local': 'محلي وقت التشغيل',
    fallback: 'احتياطي',
};

const providerToIntegrationId: Partial<Record<AiStatus['provider'], string>> = {
    gemini: 'ai-gemini',
    openrouter: 'ai-openrouter',
    deepseek: 'ai-deepseek',
    qwen: 'ai-qwen',
    openai: 'ai-openai',
    ollama: 'ai-ollama',
    lmstudio: 'ai-lmstudio',
};

const ADMIN_QUICK_PROMPTS = [
    { label: '🚀 جاهزية المنصة', prompt: 'ما حالة جاهزية المنصة الآن، وما هي النواقص التي يجب حلها أولاً؟' },
    { label: '🔍 المهارات الأضعف', prompt: 'ما هي المهارات والمواد الأكثر تعثراً لدى الطلاب حسب الإشارات الحالية؟' },
    { label: '⚡ فحص الذكاء الاصطناعي', prompt: 'اشرح لي حالة مزودات الذكاء الاصطناعي الحالية ونسبة الردود الاحتياطية' },
    { label: '📝 مراجعة المحتوى', prompt: 'ما أهم شيء يجب مراجعته واعتماده في بنك الأسئلة والاختبارات الآن؟' },
];

export const AiAssistantManager: React.FC = () => {
    const [status, setStatus] = useState<AiStatus | null>(null);
    const [loadingStatus, setLoadingStatus] = useState(true);
    const [statusError, setStatusError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'chat' | 'providers' | 'logs' | 'readiness'>('chat');
    const [messages, setMessages] = useState<Message[]>([
        {
            id: 'welcome',
            role: 'assistant',
            text: 'أهلاً بك! أنا مساعد المدير الذكي لمتابعة وتشخيص المنصة، فحص أخطاء الطلاب، تدقيق المحتوى الناقص، وتحديد أولويات العمل.',
        },
    ]);
    const [input, setInput] = useState('ما أهم شيء أراجعه الآن؟');
    const [sending, setSending] = useState(false);
    const [testingProvider, setTestingProvider] = useState<string | null>(null);
    const [benchmarking, setBenchmarking] = useState(false);
    const [providerTestResults, setProviderTestResults] = useState<Record<string, string>>({});
    const [interactions, setInteractions] = useState<AiInteractionsResponse | null>(null);
    const [readiness, setReadiness] = useState<AiReadiness | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [audienceFilter, setAudienceFilter] = useState<'all' | 'student' | 'admin'>('all');
    const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'fallback' | 'error'>('all');
    const [selectedInteraction, setSelectedInteraction] = useState<AiInteractionsResponse['items'][0] | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const endRef = useRef<HTMLDivElement>(null);

    const loadStatus = async () => {
        setLoadingStatus(true);
        setStatusError(null);
        try {
            const [response, usage, aiReadiness] = await Promise.all([
                api.aiStatus(),
                api.getAiInteractions(30),
                api.aiReadiness(),
            ]);
            setStatus(response as AiStatus);
            setInteractions(usage as AiInteractionsResponse);
            setReadiness(aiReadiness as AiReadiness);
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
            return 'المساعد يعمل الآن بردود احتياطية ذكية من داخل النظام. هذا مجاني لكنه ليس ذكاءً توليدياً كاملاً.';
        }
        if (status.provider === 'gemini') {
            return 'المساعد مربوط بمزود سحابي (Google Gemini). يمنح إجابات توليدية دقيقة وسريعة.';
        }
        return 'المساعد مضبوط على مزود محلي أو خارجي مخصص.';
    }, [status]);

    const readinessLabel = useMemo(() => {
        const score = readiness?.score || 0;
        if (score >= 85) return 'جاهز بقوة';
        if (score >= 65) return 'جاهز مع ملاحظات';
        if (score >= 40) return 'يحتاج ضبط';
        return 'وضع احتياطي';
    }, [readiness?.score]);

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
            } else {
                api.getAiInteractions(30)
                    .then((usage) => setInteractions(usage as AiInteractionsResponse))
                    .catch(() => undefined);
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
                    ? `يعمل بنجاح (${response.latencyMs || 0}ms)${response.sample ? ` - ${cleanText(response.sample)}` : ''}`
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

    const benchmarkAllProviders = async () => {
        if (!status?.providers) return;
        const configured = status.providers.filter(p => p.configured && p.id !== 'none');
        if (configured.length === 0) return;
        setBenchmarking(true);
        for (const p of configured) {
            setTestingProvider(p.id);
            try {
                const res = await api.aiTestProvider({ provider: p.id as Exclude<AiStatus['provider'], 'none'> });
                setProviderTestResults(curr => ({
                    ...curr,
                    [p.id]: res.ok 
                        ? `يعمل بنجاح (${res.latencyMs || 0}ms)${res.sample ? ` - ${cleanText(res.sample)}` : ''}`
                        : cleanText(res.message || 'لم ينجح الاختبار'),
                }));
            } catch (err) {
                setProviderTestResults(curr => ({
                    ...curr,
                    [p.id]: err instanceof Error ? cleanText(err.message) : 'تعذر اختبار المزود',
                }));
            }
        }
        setTestingProvider(null);
        setBenchmarking(false);
    };

    const copyText = async (value: string, id?: string) => {
        try {
            await navigator.clipboard.writeText(value);
            if (id) {
                setCopiedId(id);
                setTimeout(() => setCopiedId(null), 2000);
            }
        } catch {
            // no-op
        }
    };

    const clearChat = () => {
        setMessages([
            {
                id: 'welcome',
                role: 'assistant',
                text: 'أهلاً بك! أنا مساعد المدير الذكي لمتابعة وتشخيص المنصة، فحص أخطاء الطلاب، تدقيق المحتوى الناقص، وتحديد أولويات العمل.',
            },
        ]);
    };

    const copyChatTranscript = async () => {
        const text = messages.map(m => `${m.role === 'user' ? '👤 المدير' : '🤖 المساعد'}:\n${m.text}`).join('\n\n---\n\n');
        await copyText(text, 'chat-transcript');
    };

    const filteredInteractions = useMemo(() => {
        if (!interactions?.items) return [];
        return interactions.items.filter((item) => {
            if (audienceFilter !== 'all' && item.audience !== audienceFilter) return false;
            if (statusFilter !== 'all') {
                if (statusFilter === 'error' && item.status !== 'error') return false;
                if (statusFilter === 'fallback' && (!item.usedFallback || item.status === 'error')) return false;
                if (statusFilter === 'success' && (item.status !== 'success' || item.usedFallback)) return false;
            }
            if (searchQuery.trim()) {
                const query = searchQuery.toLowerCase();
                const inPreview = (item.messagePreview || '').toLowerCase().includes(query);
                const inResponse = (item.responsePreview || '').toLowerCase().includes(query);
                const inModel = (item.model || '').toLowerCase().includes(query);
                if (!inPreview && !inResponse && !inModel) return false;
            }
            return true;
        });
    }, [interactions?.items, audienceFilter, statusFilter, searchQuery]);

    return (
        <div className="space-y-6 animate-fade-in pb-10" dir="rtl">
            {/* ══════════════════════════════════════════════════════════════════════
                الترويسة التنفيذية وأزرار الإجراءات السريعة
            ══════════════════════════════════════════════════════════════════════ */}
            <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-200/90 shadow-xs">
                <div>
                    <div className="flex items-center gap-2 text-xs font-black text-indigo-600 mb-1.5">
                        <span className="p-1 rounded-lg bg-indigo-50 text-indigo-700">
                            <Bot size={16} />
                        </span>
                        <span>مركز قيادة وتشخيص الذكاء الاصطناعي</span>
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            مساعد الطالب والمدير
                        </span>
                    </div>
                    <h1 className="text-2xl font-black text-gray-900">إدارة الذكاء الاصطناعي والمساعدين</h1>
                    <p className="text-xs font-bold text-gray-500 mt-1 max-w-2xl">
                        مركز موحد لمتابعة المساعدين، المزودات، سلسلة الاستجابة، الاستخدام، والجاهزية مع الحفاظ على أقل تكلفة ممكنة.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                    {/* زر قياس سرعة جميع المزودات الجديد */}
                    <button
                        type="button"
                        onClick={benchmarkAllProviders}
                        disabled={benchmarking || loadingStatus}
                        className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl border border-indigo-200 bg-indigo-50/80 text-indigo-700 font-black text-xs hover:bg-indigo-100 transition-all shadow-xs disabled:opacity-50"
                        title="اختبار سرعة استجابة كافة المزودات المفعلة في وقت واحد"
                    >
                        {benchmarking ? <Loader2 size={15} className="animate-spin" /> : <Play size={15} />}
                        <span>قياس سرعة المزودات</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            window.location.hash = '#/admin-dashboard?tab=platform-integrations';
                        }}
                        className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-700 font-black text-xs hover:bg-gray-50 transition-all shadow-xs"
                    >
                        <Settings size={15} />
                        <span>فتح إدارة التكاملات</span>
                    </button>

                    <button
                        type="button"
                        onClick={loadStatus}
                        disabled={loadingStatus}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gray-900 text-white font-black text-xs hover:bg-gray-800 transition-all shadow-xs disabled:opacity-60"
                    >
                        {loadingStatus ? <Loader2 size={15} className="animate-spin text-white" /> : <RefreshCw size={15} />}
                        <span>تحديث الحالة</span>
                    </button>
                </div>
            </div>

            {statusError && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-700 flex items-center gap-2">
                    <AlertTriangle size={16} /> {statusError}
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════════════════
                بطاقات المؤشرات الرئيسية الأربعة (KPIs)
            ══════════════════════════════════════════════ */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {/* البطاقة 1: الجاهزية */}
                <div className="rounded-2xl border border-gray-200/90 bg-white p-5 shadow-xs relative overflow-hidden">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <p className="text-xs font-bold text-gray-500">جاهزية المساعد</p>
                            <div className="flex items-baseline gap-1 mt-1.5">
                                <span className="text-3xl font-black text-gray-900">{formatNumber(readiness?.score)}%</span>
                                <span className={`text-[11px] font-black px-2 py-0.5 rounded-full ${
                                    Number(readiness?.score || 0) >= 80 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                }`}>
                                    {readinessLabel}
                                </span>
                            </div>
                        </div>
                        <div className={`rounded-2xl p-3 ${Number(readiness?.score || 0) >= 80 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                            {Number(readiness?.score || 0) >= 80 ? <ShieldCheck size={26} /> : <AlertTriangle size={26} />}
                        </div>
                    </div>
                    <div className="w-full bg-gray-100 h-1.5 rounded-full mt-3 overflow-hidden">
                        <div
                            className={`h-1.5 rounded-full transition-all duration-500 ${
                                Number(readiness?.score || 0) >= 80 ? 'bg-emerald-500' : 'bg-amber-500'
                            }`}
                            style={{ width: `${Math.min(100, readiness?.score || 0)}%` }}
                        />
                    </div>
                </div>

                {/* البطاقة 2: توجيه الطالب */}
                <div className="rounded-2xl border border-gray-200/90 bg-white p-5 shadow-xs">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <p className="text-xs font-bold text-gray-500">توجيه الطالب</p>
                            <p className="mt-1.5 text-2xl font-black text-gray-900 flex items-center gap-2">
                                {readiness?.studentAdvisor.ready ? 'شخصي ذكي' : 'عام'}
                                <span className="text-[11px] font-bold text-gray-400">
                                    ({formatNumber(readiness?.studentAdvisor.personalizedStudentChats7d)} مخصص)
                                </span>
                            </p>
                        </div>
                        <div className="rounded-2xl p-3 bg-violet-50 text-violet-600">
                            <Target size={26} />
                        </div>
                    </div>
                    <p className="mt-2.5 text-[11px] font-bold text-gray-500 line-clamp-1">
                        {formatNumber(readiness?.studentAdvisor.weakSkillSignals)} إشارة مهارية • {formatNumber(readiness?.studentAdvisor.studentsWithResults)} طالب لديهم نتائج
                    </p>
                </div>

                {/* البطاقة 3: المزودات المفعلة */}
                <div className="rounded-2xl border border-gray-200/90 bg-white p-5 shadow-xs">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <p className="text-xs font-bold text-gray-500">المزودات المفعلة</p>
                            <p className="mt-1.5 text-2xl font-black text-gray-900">
                                {formatNumber(readiness?.configuredProviders.length)} <span className="text-xs font-normal text-gray-400">مزود متاح</span>
                            </p>
                        </div>
                        <div className="rounded-2xl p-3 bg-amber-50 text-amber-600">
                            <Zap size={26} />
                        </div>
                    </div>
                    <p className="mt-2.5 text-[11px] font-bold text-indigo-700 line-clamp-1">
                        النشط: {readiness ? providerLabel[readiness.activeProvider] : 'جاري الفحص...'}
                    </p>
                </div>

                {/* البطاقة 4: استخدام 24 ساعة */}
                <div className="rounded-2xl border border-gray-200/90 bg-white p-5 shadow-xs">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <p className="text-xs font-bold text-gray-500">استخدام 24 ساعة</p>
                            <p className="mt-1.5 text-2xl font-black text-gray-900">
                                {formatNumber((readiness?.studentAdvisor.studentChats24h || 0) + (readiness?.adminAssistant.chats24h || 0))} <span className="text-xs font-normal text-gray-400">محادثة</span>
                            </p>
                        </div>
                        <div className="rounded-2xl p-3 bg-blue-50 text-blue-600">
                            <Users size={26} />
                        </div>
                    </div>
                    <p className="mt-2.5 text-[11px] font-bold text-gray-500 line-clamp-1">
                        أخطاء: {formatNumber(readiness?.monitoring.aiErrors24h)} • احتياطي للطلاب: {formatNumber(readiness?.monitoring.fallbackStudentChats24h)}
                    </p>
                </div>
            </div>

            {/* ══════════════════════════════════════════════════════════════════════
                شريط التبويبات الرئيسي (Navigation Hub)
            ══════════════════════════════════════════════════════════════════════ */}
            <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-2">
                {[
                    { id: 'chat' as const, label: 'مساعد المدير التفاعلي', icon: <MessageCircle size={16} /> },
                    {
                        id: 'providers' as const,
                        label: 'مزودو الذكاء وسلسلة الانتقال',
                        icon: <Zap size={16} />,
                        badge: readiness?.configuredProviders.length,
                    },
                    {
                        id: 'logs' as const,
                        label: 'سجل التفاعلات والمراقبة',
                        icon: <Activity size={16} />,
                        badge: interactions?.summary.total,
                    },
                    { id: 'readiness' as const, label: 'جاهزية المساعد والطلاب', icon: <Target size={16} /> },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all ${
                            activeTab === tab.id
                                ? 'bg-indigo-600 text-white shadow-sm ring-1 ring-indigo-500'
                                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                    >
                        {tab.icon}
                        <span>{tab.label}</span>
                        {tab.badge !== undefined && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                                activeTab === tab.id ? 'bg-indigo-700 text-white' : 'bg-gray-100 text-gray-700'
                            }`}>
                                {formatNumber(tab.badge)}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* ══════════════════════════════════════════════════════════════════════
                التبويب 1: مساعد المدير التفاعلي (Interactive Copilot)
            ══════════════════════════════════════════════════════════════════════ */}
            {activeTab === 'chat' && (
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
                    {/* لوحة المحادثة الرئيسية (8 أعمدة) */}
                    <div className="xl:col-span-8 bg-white border border-gray-200/90 rounded-2xl shadow-xs overflow-hidden flex flex-col">
                        {/* ترويسة المحادثة */}
                        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between bg-gray-50/70">
                            <div className="flex items-center gap-2.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                                <div>
                                    <h3 className="font-black text-xs text-gray-900">محادثة مساعد المدير الإداري</h3>
                                    <p className="text-[10px] font-bold text-gray-400">
                                        المزود النشط: {status ? providerLabel[status.provider] : 'Google Gemini'} · {status?.model || 'تلقائي'}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-1.5">
                                <button
                                    type="button"
                                    onClick={copyChatTranscript}
                                    title="نسخ المحادثة"
                                    className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 transition-all"
                                >
                                    {copiedId === 'chat-transcript' ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                                    <span>{copiedId === 'chat-transcript' ? 'تم النسخ!' : 'نسخ النص'}</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={clearChat}
                                    title="تفريغ المحادثة"
                                    className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-rose-50 text-gray-500 hover:text-rose-600 transition-all"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>

                        {/* سجل الرسائل */}
                        <div className="h-[460px] overflow-y-auto bg-slate-50/50 p-5 space-y-4">
                            {messages.map((message) => (
                                <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-start' : 'justify-end'}`}>
                                    <div
                                        className={`max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed whitespace-pre-line shadow-2xs ${
                                            message.role === 'user'
                                                ? 'bg-indigo-600 text-white rounded-br-xs font-bold'
                                                : 'bg-white border border-gray-200 text-gray-800 rounded-bl-xs font-medium'
                                        }`}
                                    >
                                        <div className="flex items-center gap-1.5 mb-1 text-[10px] opacity-75 font-mono">
                                            {message.role === 'user' ? '👤 المدير' : '🤖 مساعد المنصة'}
                                        </div>
                                        {message.text}
                                    </div>
                                </div>
                            ))}
                            {sending && (
                                <div className="flex justify-end">
                                    <div className="bg-white border border-indigo-100 text-indigo-700 rounded-2xl rounded-bl-xs p-4 text-xs flex items-center gap-2 shadow-2xs font-bold">
                                        <Loader2 size={16} className="animate-spin text-indigo-600" />
                                        <span>يفحص حالة المنصة وبنك الأسئلة وقواعد البيانات...</span>
                                    </div>
                                </div>
                            )}
                            <div ref={endRef} />
                        </div>

                        {/* إدخال الرسالة والمطالبات السريعة */}
                        <div className="p-4 border-t border-gray-100 bg-white space-y-3">
                            <div className="flex flex-wrap gap-1.5">
                                {ADMIN_QUICK_PROMPTS.map((item) => (
                                    <button
                                        key={item.label}
                                        type="button"
                                        onClick={() => sendMessage(item.prompt)}
                                        disabled={sending}
                                        className="px-3 py-1.5 rounded-xl bg-gray-100/80 text-gray-700 text-xs font-bold hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 border border-transparent transition-all disabled:opacity-50"
                                    >
                                        {item.label}
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
                                    placeholder="اكتب استفسارك أو طلب تشخيص للمنصة..."
                                    className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    disabled={sending}
                                />
                                <button
                                    type="button"
                                    onClick={() => void sendMessage()}
                                    disabled={sending || !input.trim()}
                                    className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-black text-xs hover:bg-indigo-700 disabled:opacity-50 shadow-xs flex items-center gap-1.5"
                                >
                                    {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                                    <span>إرسال</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* لوحة المعلومات الجانبية والسريعة (4 أعمدة) */}
                    <div className="xl:col-span-4 space-y-4">
                        {/* حالة الربط وسلسلة التوجيه */}
                        <div className="bg-white border border-gray-200/90 rounded-2xl p-4 shadow-xs space-y-3">
                            <h3 className="font-black text-xs text-gray-900 flex items-center gap-2">
                                <Zap size={15} className="text-amber-500" />
                                <span>حالة محرك الذكاء النشط</span>
                            </h3>

                            <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 space-y-2 text-xs">
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-500 font-bold">المزود النشط:</span>
                                    <span className="font-black text-gray-900">{status ? providerLabel[status.provider] : 'جاري الفحص...'}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-500 font-bold">النموذج:</span>
                                    <span className="font-mono text-indigo-700 font-bold">{status?.model || 'تلقائي'}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-500 font-bold">مصدر ترتيب المزودات:</span>
                                    <span className="font-bold text-gray-800">
                                        {status?.providerOrderSource === 'admin' ? 'من ai-global (الإدارة)' : 'من env'}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-500 font-bold">نمط التوجيه:</span>
                                    <span className="font-bold text-emerald-700">
                                        {status?.routingMode === 'auto' ? 'تلقائي مع انتقال عند التعطل' : 'يدوي'}
                                    </span>
                                </div>
                            </div>
                            <p className="text-[11px] font-bold text-gray-500 leading-relaxed">{modeDescription}</p>
                        </div>

                        {/* خطة التفعيل والجاهزية */}
                        <div className="bg-white border border-gray-200/90 rounded-2xl p-4 shadow-xs space-y-3">
                            <h3 className="font-black text-xs text-gray-900 flex items-center gap-2">
                                <CheckCircle2 size={15} className="text-indigo-600" />
                                <span>جاهزية المساعدين</span>
                            </h3>
                            <div className="space-y-2">
                                {[
                                    {
                                        title: 'طالب مرشد أكاديمي',
                                        status: readiness?.studentAdvisor.ready ? 'جاهز وشخصي' : 'يحتاج نتائج',
                                        ready: readiness?.studentAdvisor.ready,
                                        desc: 'يرد على الطالب وفقاً لنقاط ضعفه ونتائجه.',
                                    },
                                    {
                                        title: 'مدير تشغيلي',
                                        status: readiness?.adminAssistant.ready ? 'جاهز للعمل' : 'غير جاهز',
                                        ready: readiness?.adminAssistant.ready,
                                        desc: 'يفحص المنصة ويقترح أولويات التسليم.',
                                    },
                                    {
                                        title: 'سلسلة الانتقال الاحتياطي',
                                        status: readiness?.recommendedProviderOrder || 'نشط',
                                        ready: true,
                                        desc: 'انتقال تلقائي للبديل عند نفاد الرصيد أو التعطل.',
                                    },
                                ].map((item) => (
                                    <div key={item.title} className="rounded-xl border border-gray-100 bg-gray-50/60 p-2.5">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-black text-gray-800">{item.title}</span>
                                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                                                item.ready ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                            }`}>
                                                {item.status}
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-gray-500 mt-1">{item.desc}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* الإجراءات القادمة المطلوبة */}
                        {(readiness?.nextActions || []).length > 0 && (
                            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 shadow-xs">
                                <h3 className="font-black text-xs text-amber-900 flex items-center gap-1.5 mb-2">
                                    <AlertTriangle size={15} className="text-amber-600" />
                                    <span>المطلوب التالي لرفع الجاهزية</span>
                                </h3>
                                <div className="space-y-1.5">
                                    {readiness?.nextActions.map((action, i) => (
                                        <div key={i} className="text-[11px] font-bold text-amber-800 bg-white/90 p-2 rounded-lg border border-amber-100">
                                            • {action}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════════════════
                التبويب 2: مزودو الذكاء وسلسلة الانتقال (Providers & Routing Chain)
            ══════════════════════════════════════════════════════════════════════ */}
            {activeTab === 'providers' && (
                <div className="space-y-5">
                    {/* مخطط الانتقال التلقائي الذكي */}
                    <div className="bg-gradient-to-r from-indigo-900 to-purple-900 text-white rounded-2xl p-5 shadow-sm">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
                            <div>
                                <h3 className="font-black text-sm flex items-center gap-2">
                                    <ArrowLeftRight size={18} className="text-indigo-300" />
                                    <span>سلسلة التوجيه والانتقال التلقائي (Auto Failover Chain)</span>
                                </h3>
                                <p className="text-xs text-indigo-200 mt-1">
                                    عند حدوث خطأ أو انتهاء الرصيد في المزود الأساسي، ينتقل الطلب تلقائياً للمزود التالي ثم إلى الرد الذكي المحلي.
                                </p>
                            </div>
                            <div className="text-xs font-bold bg-white/10 px-3 py-1.5 rounded-xl border border-white/15">
                                مصدر الترتيب: <span className="font-mono text-indigo-300">{status?.providerOrderSource === 'admin' ? 'الإدارة (ai-global)' : 'env'}</span>
                            </div>
                        </div>

                        {/* خطوات السلسلة التفاعلية */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="bg-white/10 rounded-xl p-3 border border-white/15 backdrop-blur-xs">
                                <span className="text-[10px] font-bold text-indigo-300 block">المرحلة 1 • الأساسي</span>
                                <p className="font-black text-sm mt-0.5">{status ? providerLabel[status.provider] : 'Google Gemini'}</p>
                                <span className="text-[10px] text-emerald-300 font-bold block mt-1">● نشط للاستقبال</span>
                            </div>
                            <div className="bg-white/10 rounded-xl p-3 border border-white/15 backdrop-blur-xs">
                                <span className="text-[10px] font-bold text-indigo-300 block">المرحلة 2 • البديل التلقائي</span>
                                <p className="font-black text-sm mt-0.5">
                                    {readiness?.configuredProviders.find(p => p.id !== status?.provider)?.label || 'DeepSeek / Qwen'}
                                </p>
                                <span className="text-[10px] text-amber-300 font-bold block mt-1">● جاهز عند التعطل</span>
                            </div>
                            <div className="bg-white/10 rounded-xl p-3 border border-white/15 backdrop-blur-xs">
                                <span className="text-[10px] font-bold text-indigo-300 block">المرحلة 3 • خط الدفاع الأخير</span>
                                <p className="font-black text-sm mt-0.5">الرد الذكي المحلي (Fallback)</p>
                                <span className="text-[10px] text-blue-300 font-bold block mt-1">● دائماً متاح مجاناً</span>
                            </div>
                        </div>
                    </div>

                    {/* شبكة بطاقات المزودات */}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {(status?.providers || []).map((provider) => {
                            const isCurrentActive = status?.provider === provider.id;
                            const testResult = providerTestResults[provider.id];
                            return (
                                <div
                                    key={provider.id}
                                    className={`rounded-2xl border p-4 bg-white shadow-xs flex flex-col justify-between transition-all ${
                                        isCurrentActive ? 'border-indigo-400 ring-2 ring-indigo-200' : 'border-gray-200/90 hover:border-gray-300'
                                    }`}
                                >
                                    <div>
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <h4 className="font-black text-sm text-gray-900 flex items-center gap-1.5">
                                                    {provider.label}
                                                    {isCurrentActive && (
                                                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                                                            النشط حالياً
                                                        </span>
                                                    )}
                                                </h4>
                                                <p className="text-xs font-mono text-gray-500 mt-0.5">{provider.model}</p>
                                            </div>
                                            <span
                                                className={`text-[10px] px-2.5 py-1 rounded-full font-black ${
                                                    provider.configured
                                                        ? 'bg-emerald-100 text-emerald-800'
                                                        : 'bg-gray-100 text-gray-500'
                                                }`}
                                            >
                                                {provider.configured ? 'مفعل' : 'غير مفعل'}
                                            </span>
                                        </div>

                                        <div className="mt-3 flex flex-wrap gap-1.5 text-[10px]">
                                            <span className="px-2 py-0.5 rounded-lg bg-gray-100 font-bold text-gray-600">
                                                {categoryLabel[provider.category]}
                                            </span>
                                            <span className="px-2 py-0.5 rounded-lg bg-slate-100 font-bold text-slate-600">
                                                المصدر: {sourceLabel[provider.source] || provider.source}
                                            </span>
                                        </div>

                                        <p className="text-xs font-medium text-gray-600 mt-2.5 leading-relaxed">
                                            {cleanText(provider.note)}
                                        </p>

                                        {testResult && (
                                            <div className="mt-2.5 p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs font-bold text-gray-800">
                                                {testResult}
                                            </div>
                                        )}
                                    </div>

                                    {provider.id !== 'none' && (
                                        <div className="mt-4 pt-3 border-t border-gray-100 space-y-2">
                                            <div className="grid grid-cols-2 gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const integrationId = providerToIntegrationId[provider.id];
                                                        if (integrationId) void copyText(integrationId, provider.id);
                                                    }}
                                                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50 transition-all"
                                                >
                                                    {copiedId === provider.id ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                                                    <span>{copiedId === provider.id ? 'تم النسخ' : 'نسخ AI ID'}</span>
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        window.location.hash = '#/admin-dashboard?tab=platform-integrations';
                                                    }}
                                                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition-all"
                                                >
                                                    <Settings size={13} />
                                                    <span>إعداد المفتاح</span>
                                                </button>
                                            </div>

                                            <button
                                                type="button"
                                                disabled={!provider.configured || testingProvider === provider.id}
                                                onClick={() => void testProvider(provider.id as Exclude<AiStatus['provider'], 'none'>)}
                                                className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-gray-900 hover:bg-gray-800 text-white px-3 py-2 text-xs font-black transition-all disabled:opacity-40"
                                            >
                                                {testingProvider === provider.id ? <Loader2 size={14} className="animate-spin text-white" /> : <Zap size={14} />}
                                                <span>اختبر المزود</span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════════════════
                التبويب 3: سجل التفاعلات والمراقبة (Interactions Monitor)
            ══════════════════════════════════════════════ */}
            {activeTab === 'logs' && (
                <div className="space-y-4">
                    {/* شريط الإحصائيات السريعة */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
                        <div className="p-3 bg-gray-50 rounded-xl">
                            <span className="text-xs font-bold text-gray-500">إجمالي المحادثات</span>
                            <p className="text-xl font-black text-gray-900 mt-1">{formatNumber(interactions?.summary.total)}</p>
                        </div>
                        <div className="p-3 bg-blue-50/70 rounded-xl">
                            <span className="text-xs font-bold text-blue-700">آخر 24 ساعة</span>
                            <p className="text-xl font-black text-blue-900 mt-1">{formatNumber(interactions?.summary.last24h)}</p>
                        </div>
                        <div className="p-3 bg-amber-50/70 rounded-xl">
                            <span className="text-xs font-bold text-amber-700">ردود احتياطية</span>
                            <p className="text-xl font-black text-amber-900 mt-1">{formatNumber(interactions?.summary.fallbackCount)}</p>
                        </div>
                        <div className="p-3 bg-rose-50/70 rounded-xl">
                            <span className="text-xs font-bold text-rose-700">أخطاء مسجلة</span>
                            <p className="text-xl font-black text-rose-900 mt-1">{formatNumber(interactions?.summary.errorCount)}</p>
                        </div>
                    </div>

                    {/* أدوات البحث والفلترة */}
                    <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
                            {/* البحث في السجل */}
                            <div className="relative flex-1 min-w-[200px]">
                                <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="ابحث في نص السؤال أو النموذج..."
                                    className="w-full pr-9 pl-4 py-2 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:border-indigo-500"
                                />
                                {searchQuery && (
                                    <button
                                        type="button"
                                        onClick={() => setSearchQuery('')}
                                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        <X size={13} />
                                    </button>
                                )}
                            </div>

                            {/* فلتر الجمهور */}
                            <select
                                value={audienceFilter}
                                onChange={(e) => setAudienceFilter(e.target.value as any)}
                                className="px-3 py-2 border border-gray-200 rounded-xl text-xs font-bold bg-white focus:outline-none focus:border-indigo-500"
                            >
                                <option value="all">كل الأطراف</option>
                                <option value="student">مساعد الطالب فقط</option>
                                <option value="admin">مساعد المدير فقط</option>
                            </select>

                            {/* فلتر الحالة */}
                            <div className="flex gap-1">
                                {[
                                    { id: 'all' as const, label: 'الكل' },
                                    { id: 'success' as const, label: 'ناجح' },
                                    { id: 'fallback' as const, label: 'احتياطي' },
                                    { id: 'error' as const, label: 'خطأ' },
                                ].map((tab) => (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        onClick={() => setStatusFilter(tab.id)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                            statusFilter === tab.id
                                                ? 'bg-gray-900 text-white'
                                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        }`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <span className="text-xs font-bold text-gray-400">
                            {filteredInteractions.length} تفاعل مطابق
                        </span>
                    </div>

                    {/* قائمة التفاعلات التفاعلية */}
                    <div className="space-y-2.5">
                        {filteredInteractions.length === 0 ? (
                            <div className="py-14 text-center bg-white rounded-2xl border border-dashed border-gray-200 text-gray-400">
                                <Activity size={32} className="mx-auto mb-2 opacity-30 text-indigo-400" />
                                <p className="font-bold text-xs">لا توجد محادثات تطابق الفلتر الحالي</p>
                            </div>
                        ) : (
                            filteredInteractions.map((item) => (
                                <div
                                    key={item._id}
                                    onClick={() => setSelectedInteraction(item)}
                                    className="rounded-2xl border border-gray-200/90 bg-white p-4 shadow-2xs hover:border-indigo-300 hover:shadow-xs transition-all cursor-pointer"
                                >
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-black ${
                                                item.audience === 'admin'
                                                    ? 'bg-purple-100 text-purple-800'
                                                    : 'bg-blue-100 text-blue-800'
                                            }`}>
                                                {item.audience === 'admin' ? 'مساعد المدير' : 'مساعد الطالب'}
                                            </span>
                                            <span className="text-xs font-bold text-gray-700">
                                                {providerLabel[item.provider] || item.provider}
                                            </span>
                                            <span className="text-xs font-mono text-gray-400">({item.model || 'fallback'})</span>
                                            {item.personalized && (
                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                    مخصص للطالب
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <span className={`text-[11px] font-black px-2.5 py-0.5 rounded-full ${
                                                item.status === 'error'
                                                    ? 'bg-rose-100 text-rose-800'
                                                    : item.usedFallback
                                                    ? 'bg-amber-100 text-amber-800'
                                                    : 'bg-emerald-100 text-emerald-800'
                                            }`}>
                                                {item.status === 'error' ? 'خطأ' : item.usedFallback ? 'رد احتياطي' : 'ناجح'}
                                            </span>
                                            <span className="text-[11px] font-mono font-bold text-gray-400">
                                                {formatNumber(item.latencyMs)}ms
                                            </span>
                                        </div>
                                    </div>

                                    {/* نص السؤال والرد */}
                                    <div className="mt-2.5 space-y-1 text-xs">
                                        <p className="font-bold text-gray-800 line-clamp-1">
                                            <span className="text-gray-400">السؤال:</span> {cleanText(item.messagePreview)}
                                        </p>
                                        <p className="text-gray-600 line-clamp-2">
                                            <span className="text-gray-400">الرد:</span> {cleanText(item.responsePreview || '—')}
                                        </p>
                                    </div>

                                    <div className="mt-2 flex items-center justify-between text-[11px] font-bold text-gray-400 pt-2 border-t border-gray-50">
                                        <span className="flex items-center gap-1"><Clock size={12} /> {formatDate(item.createdAt)}</span>
                                        <span className="text-indigo-600 font-bold hover:underline">انقر لمعاينة السؤال والرد كاملاً ←</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════════════════
                التبويب 4: جاهزية المساعد والطلاب (Readiness Matrix)
            ══════════════════════════════════════════════════════════════════════ */}
            {activeTab === 'readiness' && (
                <div className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs">
                            <h3 className="font-black text-sm text-gray-900 flex items-center gap-2 mb-3">
                                <Target size={16} className="text-indigo-600" />
                                <span>إشارات مهارات الطلاب</span>
                            </h3>
                            <p className="text-3xl font-black text-gray-900">{formatNumber(readiness?.studentAdvisor.weakSkillSignals)}</p>
                            <p className="text-xs font-bold text-gray-500 mt-2 leading-relaxed">
                                إشارات مهارية استخلصها النظام من نتائج اختبارات الطلاب لتوجيه أسئلة المساعد بدقة.
                            </p>
                        </div>

                        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs">
                            <h3 className="font-black text-sm text-gray-900 flex items-center gap-2 mb-3">
                                <Users size={16} className="text-violet-600" />
                                <span>طلاب يمتلكون نتائج</span>
                            </h3>
                            <p className="text-3xl font-black text-gray-900">{formatNumber(readiness?.studentAdvisor.studentsWithResults)}</p>
                            <p className="text-xs font-bold text-gray-500 mt-2 leading-relaxed">
                                الطلاب الذين حلوا اختبارات كافية تمكّن المساعد من تخصيص خطتهم بدلاً من الرد العام.
                            </p>
                        </div>

                        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs">
                            <h3 className="font-black text-sm text-gray-900 flex items-center gap-2 mb-3">
                                <Activity size={16} className="text-emerald-600" />
                                <span>تفاعلات مخصصة (7 أيام)</span>
                            </h3>
                            <p className="text-3xl font-black text-gray-900">{formatNumber(readiness?.studentAdvisor.personalizedStudentChats7d)}</p>
                            <p className="text-xs font-bold text-gray-500 mt-2 leading-relaxed">
                                محادثات استفاد فيها الطالب من الإرشاد الأكاديمي المخصص لنتائجه ونقاط ضعفه.
                            </p>
                        </div>
                    </div>

                    {/* قائمة الإجراءات المطلوبة لتحقيق 100% جاهزية */}
                    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs space-y-3">
                        <h3 className="font-black text-sm text-gray-900 flex items-center gap-2">
                            <CheckSquare size={16} className="text-indigo-600" />
                            <span>خطة رفع جاهزية المساعد الذكي في المنصة</span>
                        </h3>
                        <div className="space-y-2">
                            {[
                                {
                                    step: '1',
                                    title: 'تفعيل مزود سحابي ذكي',
                                    desc: 'ربط Google Gemini أو DeepSeek أو OpenRouter بمفتاح صالح لتقديم إجابات توليدية غنية.',
                                    done: (readiness?.configuredProviders.length || 0) > 0,
                                },
                                {
                                    step: '2',
                                    title: 'إجراء اختبارات طلابية لتوليد الإشارات',
                                    desc: 'حل الطلاب للاختبارات التجريبية أو التقييمية يبني سجل نقاط الضعف التي يعتمد عليها المساعد.',
                                    done: (readiness?.studentAdvisor.studentsWithResults || 0) > 0,
                                },
                                {
                                    step: '3',
                                    title: 'تأكيد سلسلة الانتقال التلقائي',
                                    desc: 'ضبط ترتيب المزودات في التكاملات لتفادي التوقف في حال تعطل أحد المزودات.',
                                    done: true,
                                },
                            ].map((item) => (
                                <div key={item.step} className="flex items-start gap-3 p-3.5 rounded-xl border border-gray-100 bg-gray-50/60">
                                    <span className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                                        item.done ? 'bg-emerald-500 text-white' : 'bg-gray-300 text-gray-700'
                                    }`}>
                                        {item.done ? '✓' : item.step}
                                    </span>
                                    <div>
                                        <p className="text-xs font-black text-gray-900">{item.title}</p>
                                        <p className="text-xs font-medium text-gray-500 mt-0.5">{item.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════════════════
                نافذة فحص التفاعل التفصيلية (Interaction Inspector Modal)
            ══════════════════════════════════════════════════════════════════════ */}
            {selectedInteraction && (
                <div
                    className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs"
                    onClick={() => setSelectedInteraction(null)}
                >
                    <div
                        className="bg-white rounded-2xl max-w-2xl w-full p-5 shadow-2xl border border-gray-100 space-y-4 max-h-[90vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                            <div>
                                <h3 className="font-black text-sm text-gray-900">معاينة تفاصيل التفاعل</h3>
                                <p className="text-xs text-gray-400 font-mono mt-0.5">ID: {selectedInteraction._id}</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedInteraction(null)}
                                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-900"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* شارات الحالة */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                            <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-100">
                                <span className="text-gray-400 font-bold block text-[10px]">الجمهور</span>
                                <span className="font-black text-gray-800">{selectedInteraction.audience === 'admin' ? 'مساعد المدير' : 'مساعد الطالب'}</span>
                            </div>
                            <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-100">
                                <span className="text-gray-400 font-bold block text-[10px]">المزود</span>
                                <span className="font-black text-indigo-700">{providerLabel[selectedInteraction.provider] || selectedInteraction.provider}</span>
                            </div>
                            <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-100">
                                <span className="text-gray-400 font-bold block text-[10px]">زمن الاستجابة</span>
                                <span className="font-mono font-black text-gray-800">{selectedInteraction.latencyMs}ms</span>
                            </div>
                            <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-100">
                                <span className="text-gray-400 font-bold block text-[10px]">الحالة</span>
                                <span className={`font-black ${selectedInteraction.status === 'error' ? 'text-rose-600' : selectedInteraction.usedFallback ? 'text-amber-600' : 'text-emerald-600'}`}>
                                    {selectedInteraction.status === 'error' ? 'خطأ' : selectedInteraction.usedFallback ? 'احتياطي' : 'ناجح'}
                                </span>
                            </div>
                        </div>

                        {/* نص السؤال */}
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs font-bold text-gray-500">
                                <span>👤 نص السؤال أو الرسالة:</span>
                                <button
                                    type="button"
                                    onClick={() => copyText(selectedInteraction.messagePreview, 'msg')}
                                    className="text-[11px] text-indigo-600 hover:underline flex items-center gap-1"
                                >
                                    {copiedId === 'msg' ? <Check size={12} /> : <Copy size={12} />}
                                    <span>{copiedId === 'msg' ? 'تم النسخ' : 'نسخ'}</span>
                                </button>
                            </div>
                            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-gray-800 leading-relaxed font-medium whitespace-pre-wrap">
                                {cleanText(selectedInteraction.messagePreview)}
                            </div>
                        </div>

                        {/* رد الذكاء الاصطناعي */}
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs font-bold text-gray-500">
                                <span>🤖 رد المساعد الذكي:</span>
                                <button
                                    type="button"
                                    onClick={() => copyText(selectedInteraction.responsePreview, 'resp')}
                                    className="text-[11px] text-indigo-600 hover:underline flex items-center gap-1"
                                >
                                    {copiedId === 'resp' ? <Check size={12} /> : <Copy size={12} />}
                                    <span>{copiedId === 'resp' ? 'تم النسخ' : 'نسخ'}</span>
                                </button>
                            </div>
                            <div className="p-3.5 rounded-xl bg-indigo-50/40 border border-indigo-100 text-xs text-indigo-950 leading-relaxed font-medium whitespace-pre-wrap max-h-64 overflow-y-auto">
                                {cleanText(selectedInteraction.responsePreview || 'لا يوجد رد متاح.')}
                            </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs text-gray-400">
                            <span>التوقيت: {formatDate(selectedInteraction.createdAt)}</span>
                            <button
                                type="button"
                                onClick={() => setSelectedInteraction(null)}
                                className="px-4 py-1.5 rounded-xl bg-gray-900 text-white font-black text-xs hover:bg-gray-800"
                            >
                                إغلاق
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
