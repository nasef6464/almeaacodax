import React, { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
    ArrowRight,
    CalendarDays,
    CheckCircle2,
    Clock,
    Copy,
    ExternalLink,
    PlayCircle,
    Users,
    Video,
    Youtube,
    AlertCircle,
    Wifi,
    Monitor,
    Mic,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { sanitizeArabicText } from '../utils/sanitizeMojibakeArabic';

const displayText = (value?: string | null) => sanitizeArabicText(value) || '';

const providerMeta: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode; hint: string }> = {
    zoom: {
        label: 'Zoom',
        color: 'text-blue-600',
        bg: 'from-blue-500 to-blue-700',
        icon: <Video size={28} />,
        hint: 'سيتم فتح تطبيق Zoom. إذا طُلب اسمك، أدخل اسمك الحقيقي.',
    },
    google_meet: {
        label: 'Google Meet',
        color: 'text-green-600',
        bg: 'from-green-500 to-emerald-600',
        icon: <Video size={28} />,
        hint: 'سيتم فتح Google Meet في المتصفح مباشرةً. لا تحتاج تطبيقاً خاصاً.',
    },
    teams: {
        label: 'Microsoft Teams',
        color: 'text-indigo-600',
        bg: 'from-indigo-500 to-purple-600',
        icon: <Video size={28} />,
        hint: 'سيتم فتح Microsoft Teams. يمكنك الانضمام من المتصفح أو التطبيق.',
    },
    live_youtube: {
        label: 'YouTube Live',
        color: 'text-red-600',
        bg: 'from-red-500 to-rose-600',
        icon: <Youtube size={28} />,
        hint: 'بث مباشر على YouTube. ستنضم كمشاهد وتشاهد الحصة في بيئة YouTube.',
    },
};

const formatMeetingDate = (meetingDate?: string) =>
    meetingDate
        ? new Date(meetingDate).toLocaleString('ar-SA', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
          })
        : 'موعد غير محدد';

const getSessionStatus = (meetingDate?: string) => {
    if (!meetingDate) return 'unknown';
    const now = Date.now();
    const date = new Date(meetingDate).getTime();
    const diffMin = (date - now) / 60000;
    if (diffMin > 30) return 'upcoming';
    if (diffMin >= -120) return 'live'; // within 2 hours = considered live/accessible
    return 'ended';
};

const buildZoomUrl = (rawUrl: string, displayName: string) => {
    try {
        // If it's already a Zoom join link, append the user name
        if (rawUrl.includes('zoom.us/j/') && displayName) {
            const separator = rawUrl.includes('?') ? '&' : '?';
            return `${rawUrl}${separator}uname=${encodeURIComponent(displayName)}`;
        }
    } catch {
        // ignore
    }
    return rawUrl;
};

const LiveSessionLobby: React.FC = () => {
    const { lessonId } = useParams<{ lessonId: string }>();
    const navigate = useNavigate();
    const { lessons, paths, subjects, user } = useStore();
    const [copied, setCopied] = useState(false);
    const [countdown, setCountdown] = useState('');

    const lesson = lessons.find((l) => l.id === lessonId);
    const path = paths.find((p) => p.id === lesson?.pathId);
    const subject = subjects.find((s) => s.id === lesson?.subjectId);

    // Countdown timer
    useEffect(() => {
        if (!lesson?.meetingDate) return;
        const tick = () => {
            const diff = new Date(lesson.meetingDate!).getTime() - Date.now();
            if (diff <= 0) {
                setCountdown('');
                return;
            }
            const h = Math.floor(diff / 3600000);
            const m = Math.floor((diff % 3600000) / 60000);
            const s = Math.floor((diff % 60000) / 1000);
            setCountdown(
                h > 0
                    ? `${h} ساعة و ${m} دقيقة`
                    : m > 0
                      ? `${m} دقيقة و ${s} ثانية`
                      : `${s} ثانية`,
            );
        };
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, [lesson?.meetingDate]);

    if (!lesson) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-8 text-center">
                <AlertCircle size={48} className="text-gray-300" />
                <div>
                    <h2 className="text-xl font-black text-gray-800">الحصة غير موجودة</h2>
                    <p className="mt-2 text-gray-500">تحقق من الرابط أو عُد للحصص المباشرة.</p>
                </div>
                <Link to="/live-sessions" className="rounded-xl bg-indigo-600 px-6 py-3 font-bold text-white hover:bg-indigo-700">
                    عودة للحصص المباشرة
                </Link>
            </div>
        );
    }

    const meta = providerMeta[lesson.type] || providerMeta['zoom'];
    const sessionStatus = getSessionStatus(lesson.meetingDate);
    const displayName = [user?.name, user?.email].filter(Boolean)[0] || 'طالب';
    const joinUrl = lesson.meetingUrl ? buildZoomUrl(lesson.meetingUrl, displayName) : '';

    const copyInvite = async () => {
        const text = [
            `📡 حصة مباشرة: ${displayText(lesson.title)}`,
            path ? `المسار: ${displayText(path.name)}` : '',
            subject ? `المادة: ${displayText(subject.name)}` : '',
            `الموعد: ${formatMeetingDate(lesson.meetingDate)}`,
            lesson.meetingUrl ? `رابط الدخول: ${lesson.meetingUrl}` : '',
            lesson.joinInstructions ? `تعليمات: ${displayText(lesson.joinInstructions)}` : '',
        ]
            .filter(Boolean)
            .join('\n');
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        } catch {
            // ignore
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/20" dir="rtl">
            {/* Header */}
            <div className="sticky top-0 z-10 border-b border-white/50 bg-white/80 backdrop-blur-md">
                <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-1.5 text-sm font-bold text-gray-500 hover:text-indigo-700 transition-colors"
                    >
                        <ArrowRight size={18} />
                        <span>رجوع</span>
                    </button>
                    <div className="mx-2 h-4 w-px bg-gray-200" />
                    <Link to="/live-sessions" className="text-sm font-bold text-indigo-600 hover:text-indigo-800 transition-colors">
                        الحصص المباشرة
                    </Link>
                    <span className="text-gray-300">/</span>
                    <span className="text-sm text-gray-600 font-bold truncate max-w-xs">{displayText(lesson.title)}</span>
                </div>
            </div>

            <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
                {/* Hero Card */}
                <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${meta.bg} p-8 text-white shadow-2xl`}>
                    {/* Background decoration */}
                    <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10" />
                    <div className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-white/10" />

                    <div className="relative">
                        {/* Provider badge */}
                        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 text-sm font-black backdrop-blur-sm">
                            {meta.icon}
                            <span>{meta.label}</span>
                        </div>

                        {/* Session name */}
                        <h1 className="mb-3 text-2xl font-black leading-tight sm:text-3xl">
                            {displayText(lesson.title)}
                        </h1>

                        {/* Meta info */}
                        <div className="flex flex-wrap items-center gap-4 text-sm text-white/80">
                            {path && (
                                <span className="flex items-center gap-1.5">
                                    📚 {displayText(path.name)}
                                </span>
                            )}
                            {subject && (
                                <span className="flex items-center gap-1.5">
                                    📖 {displayText(subject.name)}
                                </span>
                            )}
                            {lesson.duration && (
                                <span className="flex items-center gap-1.5">
                                    <Clock size={14} />
                                    {lesson.duration} دقيقة
                                </span>
                            )}
                            {lesson.assignedTeacherName && (
                                <span className="flex items-center gap-1.5">
                                    <Users size={14} />
                                    {displayText(lesson.assignedTeacherName)}
                                </span>
                            )}
                        </div>

                        {/* Status badge */}
                        <div className="mt-5">
                            {sessionStatus === 'live' && (
                                <span className="inline-flex animate-pulse items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-black text-red-600 shadow-lg">
                                    <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
                                    الحصة جارية الآن
                                </span>
                            )}
                            {sessionStatus === 'upcoming' && countdown && (
                                <span className="inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 text-sm font-black backdrop-blur-sm">
                                    <Clock size={14} />
                                    تبدأ خلال {countdown}
                                </span>
                            )}
                            {sessionStatus === 'ended' && (
                                <span className="inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 text-sm font-black backdrop-blur-sm">
                                    <CheckCircle2 size={14} />
                                    انتهت الحصة
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    {/* Main: Join Section */}
                    <div className="space-y-5 lg:col-span-2">
                        {/* Date & Time Card */}
                        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                            <h3 className="mb-4 flex items-center gap-2 text-base font-black text-gray-800">
                                <CalendarDays size={18} className="text-indigo-500" />
                                موعد الحصة
                            </h3>
                            <p className="text-lg font-bold text-gray-700">{formatMeetingDate(lesson.meetingDate)}</p>
                        </div>

                        {/* Join Instructions */}
                        {lesson.joinInstructions && (
                            <div className="rounded-2xl border border-amber-100 bg-amber-50 p-6">
                                <h3 className="mb-3 flex items-center gap-2 text-base font-black text-amber-800">
                                    📋 تعليمات الدخول
                                </h3>
                                <p className="whitespace-pre-line text-sm leading-7 text-amber-700">
                                    {displayText(lesson.joinInstructions)}
                                </p>
                            </div>
                        )}

                        {/* Provider hint */}
                        <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-5">
                            <p className="text-sm font-bold text-indigo-700">
                                💡 <span className="font-black">{meta.label}:</span> {meta.hint}
                            </p>
                        </div>

                        {/* Join Button (BIG) */}
                        {joinUrl ? (
                            <a
                                href={joinUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="flex w-full items-center justify-center gap-3 rounded-2xl bg-indigo-600 px-8 py-5 text-xl font-black text-white shadow-lg shadow-indigo-200 transition-all hover:bg-indigo-700 hover:shadow-xl hover:scale-[1.01] active:scale-[0.99]"
                            >
                                <ExternalLink size={22} />
                                انضم للحصة الآن
                            </a>
                        ) : (
                            <div className="flex w-full items-center justify-center gap-3 rounded-2xl bg-gray-100 px-8 py-5 text-lg font-black text-gray-500">
                                <CalendarDays size={22} />
                                الرابط لم يُضف بعد – انتظر إشعار المعلم
                            </div>
                        )}

                        {/* Recording (if available) */}
                        {lesson.recordingUrl && lesson.showRecordingOnPlatform && (
                            <a
                                href={lesson.recordingUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="flex w-full items-center justify-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-8 py-4 text-base font-black text-emerald-700 transition-all hover:bg-emerald-100"
                            >
                                <PlayCircle size={20} />
                                مشاهدة تسجيل الحصة
                            </a>
                        )}

                        {/* Copy invite */}
                        <button
                            onClick={() => void copyInvite()}
                            className="flex w-full items-center justify-center gap-3 rounded-2xl border border-gray-200 bg-white px-8 py-4 text-base font-bold text-gray-600 transition-all hover:bg-gray-50"
                        >
                            {copied ? <CheckCircle2 size={20} className="text-emerald-500" /> : <Copy size={20} />}
                            {copied ? 'تم نسخ بيانات الحصة' : 'نسخ بيانات الحصة للمشاركة'}
                        </button>
                    </div>

                    {/* Sidebar: Checklist */}
                    <div className="space-y-4">
                        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                            <h3 className="mb-4 text-base font-black text-gray-800">✅ تحضيرك قبل الحصة</h3>
                            <ul className="space-y-3">
                                {[
                                    { icon: <Wifi size={16} />, text: 'تأكد من اتصال الإنترنت' },
                                    { icon: <Mic size={16} />, text: 'اختبر الميكروفون والكاميرا' },
                                    { icon: <Monitor size={16} />, text: 'أغلق التطبيقات غير الضرورية' },
                                    { icon: <Clock size={16} />, text: 'انضم قبل الموعد بـ 5 دقائق' },
                                ].map((item, i) => (
                                    <li key={i} className="flex items-start gap-3 text-sm text-gray-600">
                                        <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-500">
                                            {item.icon}
                                        </span>
                                        <span className="font-bold">{item.text}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Your info */}
                        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                            <h3 className="mb-3 text-sm font-black text-gray-500 uppercase tracking-wider">ستنضم باسم</h3>
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 font-black text-lg">
                                    {String(displayName).charAt(0)}
                                </div>
                                <div>
                                    <div className="font-black text-gray-800">{displayName}</div>
                                    {user?.email && <div className="text-xs text-gray-400">{user.email}</div>}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LiveSessionLobby;
