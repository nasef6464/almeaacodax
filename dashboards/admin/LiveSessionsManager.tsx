import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Copy, Download, ExternalLink, Lock, LockOpen, Plus, RefreshCw, Video } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { Activity, Lesson, LessonType } from '../../types';
import { UnifiedLessonBuilder } from './builders/UnifiedLessonBuilder';
import { sanitizeArabicText } from '../../utils/sanitizeMojibakeArabic';
import { api } from '../../services/api';

const LIVE_TYPES: LessonType[] = ['live_youtube', 'zoom', 'google_meet', 'teams'];

const providerLabelMap: Record<LessonType, string> = {
    video: 'فيديو',
    quiz: 'اختبار',
    file: 'ملف',
    assignment: 'واجب',
    text: 'نص',
    live_youtube: 'YouTube Live',
    zoom: 'Zoom',
    google_meet: 'Google Meet',
    teams: 'Microsoft Teams',
};

const displayText = (value?: string | null) => sanitizeArabicText(value) || '';

const downloadCsv = (fileName: string, rows: string[][]) => {
    const csv = rows
        .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
        .join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
};

export const LiveSessionsManager: React.FC = () => {
    const { lessons, paths, subjects, updateLesson, addLesson, deleteLesson } = useStore();
    const [isEditing, setIsEditing] = useState(false);
    const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
    const [copyMessage, setCopyMessage] = useState('');
    const [sessionBookings, setSessionBookings] = useState<Activity[]>([]);
    const [bookingsLoading, setBookingsLoading] = useState(false);
    const [bookingsError, setBookingsError] = useState('');
    const [updatingBookingId, setUpdatingBookingId] = useState('');
    const [activeTab, setActiveTab] = useState<'schedule' | 'private-bookings' | 'readiness-analytics'>('schedule');
    const [searchQuery, setSearchQuery] = useState('');
    const [providerFilter, setProviderFilter] = useState<string>('all');

    const liveLessons = useMemo(
        () =>
            lessons
                .filter((lesson) => LIVE_TYPES.includes(lesson.type))
                .sort((a, b) => {
                    const aDate = a.meetingDate ? new Date(a.meetingDate).getTime() : 0;
                    const bDate = b.meetingDate ? new Date(b.meetingDate).getTime() : 0;
                    return bDate - aDate;
                }),
        [lessons],
    );

    const publishedLessons = liveLessons.filter((lesson) => lesson.approvalStatus === 'approved' && lesson.showOnPlatform);
    const upcomingLessons = liveLessons.filter((lesson) => lesson.meetingDate && new Date(lesson.meetingDate).getTime() >= Date.now());
    const recordedLessons = liveLessons.filter((lesson) => lesson.recordingUrl && lesson.showRecordingOnPlatform);
    const needsSetupLessons = liveLessons.filter((lesson) => !lesson.meetingUrl || !lesson.meetingDate || !lesson.pathId || !lesson.subjectId);
    const pendingBookings = sessionBookings.filter((booking) => (booking.bookingStatus || 'pending') === 'pending');

    const loadSessionBookings = async () => {
        setBookingsLoading(true);
        setBookingsError('');
        try {
            const response = await api.getAdminSessionBookings({ status: 'all', limit: 50 });
            setSessionBookings(((response.bookings || []) as Activity[]).map((booking) => ({
                ...booking,
                id: String(booking.id),
                bookingStatus: booking.bookingStatus || 'pending',
            })));
        } catch (error) {
            setSessionBookings([]);
            setBookingsError(error instanceof Error ? error.message : 'تعذر تحميل طلبات الحصص الآن.');
        } finally {
            setBookingsLoading(false);
        }
    };

    useEffect(() => {
        void loadSessionBookings();
    }, []);

    const createNewLesson = () => {
        setCurrentLesson({
            id: '',
            title: '',
            type: 'zoom',
            duration: '60',
            isCompleted: false,
            pathId: '',
            subjectId: '',
            sectionId: '',
            skillIds: [],
            order: liveLessons.length + 1,
            accessControl: 'public',
            meetingUrl: '',
            meetingDate: '',
            recordingUrl: '',
            joinInstructions: '',
            showRecordingOnPlatform: false,
            approvalStatus: 'draft',
            showOnPlatform: false,
        });
        setIsEditing(true);
    };

    const handleSave = (_moduleId: string | undefined, lessonToSave: Lesson) => {
        if (currentLesson?.id) {
            updateLesson(lessonToSave.id, lessonToSave);
        } else {
            addLesson({
                ...lessonToSave,
                id: `live_${Date.now()}`,
            });
        }
        setIsEditing(false);
        setCurrentLesson(null);
    };

    const togglePlatformVisibility = (lesson: Lesson) => {
        const shouldShow = !lesson.showOnPlatform;
        updateLesson(lesson.id, {
            showOnPlatform: shouldShow,
            ...(shouldShow && lesson.approvalStatus !== 'approved' ? { approvalStatus: 'approved' } : {}),
        });
    };

    const formatMeetingDate = (meetingDate?: string) =>
        meetingDate
            ? new Date(meetingDate).toLocaleString('ar-SA', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            })
            : 'غير محدد';

    const buildInviteText = (lesson: Lesson) => {
        const pathName = displayText(paths.find((path) => path.id === lesson.pathId)?.name) || 'بدون مسار';
        const subjectName = displayText(subjects.find((subject) => subject.id === lesson.subjectId)?.name) || 'بدون مادة';
        return [
            `حصة مباشرة: ${displayText(lesson.title)}`,
            `المسار / المادة: ${pathName} - ${subjectName}`,
            `الموعد: ${formatMeetingDate(lesson.meetingDate)}`,
            lesson.meetingUrl ? `رابط الدخول: ${lesson.meetingUrl}` : 'رابط الدخول سيضاف لاحقًا.',
            lesson.joinInstructions ? `تعليمات: ${displayText(lesson.joinInstructions)}` : '',
        ].filter(Boolean).join('\n');
    };

    const copyInvite = async (lesson: Lesson) => {
        const inviteText = buildInviteText(lesson);
        try {
            await navigator.clipboard.writeText(inviteText);
            setCopyMessage(`تم نسخ دعوة: ${displayText(lesson.title)}`);
        } catch {
            setCopyMessage('تعذر النسخ التلقائي، يمكنك فتح الحصة ونسخ الرابط يدويًا.');
        }
        window.setTimeout(() => setCopyMessage(''), 2500);
    };

    const exportSchedule = () => {
        downloadCsv('live-sessions-schedule.csv', [
            ['الحصة', 'المزود', 'المسار', 'المادة', 'الموعد', 'المدة', 'الحالة', 'الإظهار', 'رابط الدخول', 'رابط التسجيل'],
            ...liveLessons.map((lesson) => [
                displayText(lesson.title),
                providerLabelMap[lesson.type] || lesson.type,
                displayText(paths.find((path) => path.id === lesson.pathId)?.name) || 'بدون مسار',
                displayText(subjects.find((subject) => subject.id === lesson.subjectId)?.name) || 'بدون مادة',
                formatMeetingDate(lesson.meetingDate),
                `${lesson.duration} دقيقة`,
                lesson.approvalStatus === 'approved' ? 'معتمد' : lesson.approvalStatus === 'pending_review' ? 'بانتظار المراجعة' : lesson.approvalStatus === 'rejected' ? 'مرفوض' : 'مسودة',
                lesson.showOnPlatform ? 'ظاهر' : 'مخفي',
                lesson.meetingUrl || '',
                lesson.recordingUrl || '',
            ]),
        ]);
    };

    const updateSessionBooking = async (booking: Activity, bookingStatus: 'pending' | 'confirmed' | 'cancelled') => {
        const assignedTeacherName =
            bookingStatus === 'confirmed'
                ? (window.prompt('اسم المدرس أو المسؤول عن الحصة', booking.assignedTeacherName || '') ?? (booking.assignedTeacherName || ''))
                : booking.assignedTeacherName || '';
        const adminNotes = window.prompt('ملاحظة داخلية للطلب (اختياري)', booking.adminNotes || '') ?? (booking.adminNotes || '');

        try {
            setUpdatingBookingId(booking.id);
            await api.updateAdminSessionBooking(booking.id, {
                bookingStatus,
                assignedTeacherName,
                adminNotes,
            });
            await loadSessionBookings();
        } catch (error) {
            window.alert(error instanceof Error ? error.message : 'تعذر تحديث طلب الحصة الآن.');
        } finally {
            setUpdatingBookingId('');
        }
    };

    const convertBookingToLiveSession = async (booking: Activity) => {
        const meetingUrl = window.prompt('رابط اجتماع الحصة (Zoom/Meet/Teams/YouTube):', '') || '';
        const providerChoice = (window.prompt('نوع المزود (zoom / google_meet / teams / live_youtube):', 'zoom') || 'zoom') as any;

        try {
            setUpdatingBookingId(booking.id);
            const res = await api.convertSessionBookingToLiveSession(booking.id, {
                provider: providerChoice,
                meetingUrl,
                meetingDate: booking.scheduledDate ? `${booking.scheduledDate} ${booking.scheduledTime || ''}` : new Date().toISOString(),
            });
            if (res.success) {
                setCopyMessage('تم تحويل الطلب إلى حصة مباشرة معتمدة بنجاح!');
                await loadSessionBookings();
            }
        } catch (error) {
            window.alert(error instanceof Error ? error.message : 'تعذر تحويل الطلب الآن.');
        } finally {
            setUpdatingBookingId('');
        }
    };

    const filteredLiveLessons = useMemo(() => {
        return liveLessons.filter((lesson) => {
            const matchesSearch = !searchQuery.trim() ||
                lesson.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (lesson.joinInstructions && lesson.joinInstructions.toLowerCase().includes(searchQuery.toLowerCase()));
            const matchesProvider = providerFilter === 'all' || lesson.type === providerFilter;
            return matchesSearch && matchesProvider;
        });
    }, [liveLessons, searchQuery, providerFilter]);

    if (isEditing && currentLesson) {
        return (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-[calc(100vh-120px)] animate-fade-in relative z-50">
                <UnifiedLessonBuilder
                    initialLesson={currentLesson}
                    onSave={handleSave}
                    onCancel={() => {
                        setIsEditing(false);
                        setCurrentLesson(null);
                    }}
                />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">إدارة الحصص المباشرة</h2>
                    <p className="text-gray-500 text-sm mt-1">
                        نظم جلسات Zoom وMeet وTeams والبث المباشر في مساحة مستقلة، ولا تظهر للطالب إلا عند الجاهزية.
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <a
                        href="#/live-sessions"
                        target="_blank"
                        rel="noreferrer"
                        className="bg-white text-indigo-700 border border-indigo-100 px-4 py-2 rounded-xl font-bold hover:bg-indigo-50 transition-colors flex items-center gap-2"
                    >
                        <ExternalLink size={18} />
                        معاينة الطالب
                    </a>
                    <button
                        onClick={exportSchedule}
                        className="bg-emerald-50 text-emerald-700 px-4 py-2 rounded-xl font-bold hover:bg-emerald-100 transition-colors flex items-center gap-2"
                    >
                        <Download size={18} />
                        تصدير الجدول
                    </button>
                    <button
                        onClick={createNewLesson}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-indigo-700 transition-colors flex items-center gap-2"
                    >
                        <Plus size={18} />
                        إضافة حصة مباشرة
                    </button>
                </div>
            </div>

            {copyMessage && (
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-5 py-3 text-sm font-bold text-emerald-700">
                    {copyMessage}
                </div>
            )}

            {/* Category Sub-Navigation Bar */}
            <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-gray-100 bg-white p-2 shadow-sm">
                {[
                    { id: 'schedule', label: 'جدول الحصص المباشرة', icon: '📅', count: liveLessons.length },
                    { id: 'private-bookings', label: 'طلبات الحصص الخاصة', icon: '🎟️', count: pendingBookings.length },
                    { id: 'readiness-analytics', label: 'جاهزية وتقارير البث', icon: '📊', count: null },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black transition-all ${
                            activeTab === tab.id
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                    >
                        <span>{tab.icon}</span>
                        <span>{tab.label}</span>
                        {tab.count !== null && (
                            <span className={`rounded-full px-2 py-0.5 text-xs font-black ${
                                activeTab === tab.id ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-700'
                            }`}>
                                {tab.count}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* TAB 1: SCHEDULE */}
            {activeTab === 'schedule' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        <SummaryCard title="إجمالي الحصص" value={liveLessons.length.toString()} />
                        <SummaryCard title="منشور للطلاب" value={publishedLessons.length.toString()} />
                        <SummaryCard title="قادمة" value={upcomingLessons.length.toString()} />
                        <SummaryCard title="لها تسجيل" value={recordedLessons.length.toString()} />
                        <SummaryCard title="تحتاج ضبط" value={needsSetupLessons.length.toString()} />
                    </div>

                    {/* Filter & Search Bar */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                        <div className="relative w-full sm:w-80">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="بحث عن حصة بالاسم أو الشرح..."
                                className="w-full rounded-xl border border-gray-200 pr-10 pl-4 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                            />
                            <Search size={18} className="absolute right-3 top-2.5 text-gray-400" />
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <span className="text-sm font-bold text-gray-500">المزود:</span>
                            <select
                                value={providerFilter}
                                onChange={(e) => setProviderFilter(e.target.value)}
                                className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-bold text-gray-700 focus:outline-none"
                            >
                                <option value="all">كل المزودين</option>
                                <option value="zoom">Zoom</option>
                                <option value="google_meet">Google Meet</option>
                                <option value="teams">Microsoft Teams</option>
                                <option value="live_youtube">YouTube Live</option>
                            </select>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-right">
                                <thead className="bg-gray-50 border-b border-gray-100">
                                    <tr>
                                        <th className="px-6 py-4 text-sm font-bold text-gray-600">الحصة</th>
                                        <th className="px-6 py-4 text-sm font-bold text-gray-600">المزود</th>
                                        <th className="px-6 py-4 text-sm font-bold text-gray-600">المسار / المادة</th>
                                        <th className="px-6 py-4 text-sm font-bold text-gray-600">الموعد</th>
                                        <th className="px-6 py-4 text-sm font-bold text-gray-600">الحالة</th>
                                        <th className="px-6 py-4 text-sm font-bold text-gray-600">الإظهار</th>
                                        <th className="px-6 py-4 text-sm font-bold text-gray-600">الإجراءات</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredLiveLessons.map((lesson) => {
                                        const pathName = displayText(paths.find((path) => path.id === lesson.pathId)?.name) || 'بدون مسار';
                                        const subjectName = displayText(subjects.find((subject) => subject.id === lesson.subjectId)?.name) || 'بدون مادة';
                                        const meetingDateLabel = formatMeetingDate(lesson.meetingDate);
                                        const readinessNotes = [
                                            !lesson.meetingUrl ? 'ينقص الرابط' : '',
                                            !lesson.meetingDate ? 'ينقص الموعد' : '',
                                            !lesson.pathId || !lesson.subjectId ? 'ينقص التصنيف' : '',
                                        ].filter(Boolean);

                                        return (
                                            <tr key={lesson.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                                            <Video size={18} />
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-gray-800">{displayText(lesson.title) || 'حصة بدون عنوان'}</div>
                                                            <div className="text-xs text-gray-500 mt-1">{lesson.duration} دقيقة</div>
                                                            {readinessNotes.length > 0 && (
                                                                <div className="mt-2 flex flex-wrap gap-1">
                                                                    {readinessNotes.map((note) => (
                                                                        <span key={note} className="rounded-full bg-amber-50 px-2 py-1 text-[11px] font-bold text-amber-700">
                                                                            {note}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-600">{providerLabelMap[lesson.type] || lesson.type}</td>
                                                <td className="px-6 py-4 text-sm text-gray-600">{pathName} - {subjectName}</td>
                                                <td className="px-6 py-4 text-sm text-gray-600">{meetingDateLabel}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                                        lesson.approvalStatus === 'approved'
                                                            ? 'bg-emerald-50 text-emerald-600'
                                                            : lesson.approvalStatus === 'pending_review'
                                                                ? 'bg-amber-50 text-amber-600'
                                                                : lesson.approvalStatus === 'rejected'
                                                                    ? 'bg-rose-50 text-rose-600'
                                                                    : 'bg-gray-100 text-gray-600'
                                                    }`}>
                                                        {lesson.approvalStatus === 'approved'
                                                            ? 'معتمد'
                                                            : lesson.approvalStatus === 'pending_review'
                                                                ? 'بانتظار المراجعة'
                                                                : lesson.approvalStatus === 'rejected'
                                                                    ? 'مرفوض'
                                                                    : 'مسودة'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${lesson.showOnPlatform ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-600'}`}>
                                                        {lesson.showOnPlatform ? 'ظاهر' : 'مخفي'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <button
                                                            onClick={() => togglePlatformVisibility(lesson)}
                                                            className={`px-3 py-2 rounded-lg text-xs font-bold inline-flex items-center gap-1 ${
                                                                lesson.showOnPlatform ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                                            }`}
                                                        >
                                                            {lesson.showOnPlatform ? <Lock size={13} /> : <LockOpen size={13} />}
                                                            {lesson.showOnPlatform ? 'إخفاء' : 'فتح'}
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setCurrentLesson(lesson);
                                                                setIsEditing(true);
                                                            }}
                                                            className="px-3 py-2 rounded-lg bg-blue-50 text-blue-600 text-xs font-bold hover:bg-blue-100"
                                                        >
                                                            تعديل
                                                        </button>
                                                        <button
                                                            onClick={() => void copyInvite(lesson)}
                                                            className="px-3 py-2 rounded-lg bg-amber-50 text-amber-700 text-xs font-bold hover:bg-amber-100 inline-flex items-center gap-1"
                                                        >
                                                            <Copy size={13} />
                                                            نسخ الدعوة
                                                        </button>
                                                        {lesson.meetingUrl ? (
                                                            <a
                                                                href={lesson.meetingUrl}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="px-3 py-2 rounded-lg bg-indigo-50 text-indigo-600 text-xs font-bold hover:bg-indigo-100 inline-flex items-center gap-1"
                                                            >
                                                                <ExternalLink size={13} />
                                                                فتح
                                                            </a>
                                                        ) : null}
                                                        <button
                                                            onClick={() => {
                                                                if (confirm('هل أنت متأكد من حذف هذه الحصة؟')) {
                                                                    deleteLesson(lesson.id);
                                                                }
                                                            }}
                                                            className="px-3 py-2 rounded-lg bg-rose-50 text-rose-600 text-xs font-bold hover:bg-rose-100"
                                                        >
                                                            حذف
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {filteredLiveLessons.length === 0 && (
                                        <tr>
                                            <td colSpan={7} className="px-6 py-10 text-center text-gray-500">
                                                لا توجد حصص مباشرة تطابق البحث أو الفلتر الحالية.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 2: PRIVATE BOOKINGS */}
            {activeTab === 'private-bookings' && (
                <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm overflow-hidden">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b border-indigo-50 bg-indigo-50/50 px-5 py-4">
                        <div>
                            <h3 className="text-lg font-black text-gray-900">طلبات الحصص الخاصة</h3>
                            <p className="text-sm text-gray-500 mt-1">طلبات الطلاب للحصص الفردية. يمكنك تأكيد الطلب أو تحويله مباشرة بحصة معتمدة بضغطة زر.</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => void loadSessionBookings()}
                            disabled={bookingsLoading}
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-indigo-100 bg-white px-4 py-2 text-sm font-black text-indigo-700 hover:bg-indigo-50 disabled:opacity-60"
                        >
                            <RefreshCw size={16} className={bookingsLoading ? 'animate-spin' : ''} />
                            تحديث الطلبات
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 p-5">
                        <SummaryCard title="طلبات جديدة" value={pendingBookings.length.toString()} />
                        <SummaryCard title="كل الطلبات" value={sessionBookings.length.toString()} />
                        <SummaryCard title="تم التأكيد" value={sessionBookings.filter((booking) => booking.bookingStatus === 'confirmed').length.toString()} />
                        <SummaryCard title="ملغاة" value={sessionBookings.filter((booking) => booking.bookingStatus === 'cancelled').length.toString()} />
                    </div>

                    {bookingsError ? (
                        <div className="mx-5 mb-5 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
                            {bookingsError}
                        </div>
                    ) : null}

                    <div className="px-5 pb-5">
                        {sessionBookings.length > 0 ? (
                            <div className="grid gap-3">
                                {sessionBookings.map((booking) => {
                                    const status = booking.bookingStatus || 'pending';
                                    return (
                                        <div key={booking.id} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                                            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                                                <div className="space-y-2 text-right">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span className={`rounded-full px-3 py-1 text-xs font-black ${
                                                            status === 'confirmed'
                                                                ? 'bg-emerald-50 text-emerald-700'
                                                                : status === 'cancelled'
                                                                    ? 'bg-rose-50 text-rose-700'
                                                                    : 'bg-amber-50 text-amber-700'
                                                        }`}>
                                                            {status === 'confirmed' ? 'مؤكد' : status === 'cancelled' ? 'ملغي' : 'جديد'}
                                                        </span>
                                                        <h4 className="text-base font-black text-gray-900">{displayText(booking.title) || 'طلب حصة خاصة'}</h4>
                                                    </div>
                                                    <div className="text-sm text-gray-500">
                                                        الطالب: <span className="font-bold text-gray-700">{displayText(booking.studentName) || booking.studentEmail || 'طالب غير معروف'}</span>
                                                    </div>
                                                    {booking.targetLabel ? <div className="text-sm text-gray-500">المادة/المهارة: {displayText(booking.targetLabel)}</div> : null}
                                                    <div className="text-sm text-gray-500">
                                                        الوقت المطلوب: {[booking.scheduledDate, booking.scheduledTime].filter(Boolean).join(' - ') || 'لم يحدد'}
                                                    </div>
                                                    {booking.notes ? <div className="rounded-xl bg-gray-50 px-3 py-2 text-sm text-gray-600">{displayText(booking.notes)}</div> : null}
                                                    {booking.assignedTeacherName ? <div className="text-sm text-emerald-700">المسؤول: {displayText(booking.assignedTeacherName)}</div> : null}
                                                    {booking.adminNotes ? <div className="text-xs text-gray-400">ملاحظة الإدارة: {displayText(booking.adminNotes)}</div> : null}
                                                </div>
                                                <div className="flex flex-wrap gap-2 lg:justify-end">
                                                    <button
                                                        type="button"
                                                        disabled={updatingBookingId === booking.id}
                                                        onClick={() => void convertBookingToLiveSession(booking)}
                                                        className="rounded-xl bg-indigo-600 px-3 py-2 text-xs font-black text-white hover:bg-indigo-700 disabled:opacity-60 flex items-center gap-1"
                                                    >
                                                        <Plus size={14} />
                                                        تحويل لحصة مباشرة
                                                    </button>
                                                    <button
                                                        type="button"
                                                        disabled={updatingBookingId === booking.id}
                                                        onClick={() => void updateSessionBooking(booking, 'confirmed')}
                                                        className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700 hover:bg-emerald-100 disabled:opacity-60"
                                                    >
                                                        تأكيد
                                                    </button>
                                                    <button
                                                        type="button"
                                                        disabled={updatingBookingId === booking.id}
                                                        onClick={() => void updateSessionBooking(booking, 'pending')}
                                                        className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-black text-amber-700 hover:bg-amber-100 disabled:opacity-60"
                                                    >
                                                        قيد المراجعة
                                                    </button>
                                                    <button
                                                        type="button"
                                                        disabled={updatingBookingId === booking.id}
                                                        onClick={() => void updateSessionBooking(booking, 'cancelled')}
                                                        className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-black text-rose-700 hover:bg-rose-100 disabled:opacity-60"
                                                    >
                                                        إلغاء
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-5 py-8 text-center text-sm font-bold text-gray-500">
                                {bookingsLoading ? 'جاري تحميل طلبات الحصص...' : 'لا توجد طلبات حصص خاصة حتى الآن.'}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* TAB 3: READINESS & ANALYTICS */}
            {activeTab === 'readiness-analytics' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                            <h4 className="font-black text-gray-900 mb-2">توزيع مزودي البث</h4>
                            <div className="space-y-2 text-sm text-gray-600">
                                <div className="flex justify-between"><span>Zoom</span><span className="font-bold">{liveLessons.filter(l => l.type === 'zoom').length}</span></div>
                                <div className="flex justify-between"><span>Google Meet</span><span className="font-bold">{liveLessons.filter(l => l.type === 'google_meet').length}</span></div>
                                <div className="flex justify-between"><span>Microsoft Teams</span><span className="font-bold">{liveLessons.filter(l => l.type === 'teams').length}</span></div>
                                <div className="flex justify-between"><span>YouTube Live</span><span className="font-bold">{liveLessons.filter(l => l.type === 'live_youtube').length}</span></div>
                            </div>
                        </div>
                        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                            <h4 className="font-black text-gray-900 mb-2">جاهزية الروابط والمواعيد</h4>
                            <div className="space-y-2 text-sm text-gray-600">
                                <div className="flex justify-between"><span>جاهزة تمامًا (رابط + موعد)</span><span className="font-bold text-emerald-600">{liveLessons.filter(l => l.meetingUrl && l.meetingDate).length}</span></div>
                                <div className="flex justify-between"><span>ينقصها رابط الدخول</span><span className="font-bold text-amber-600">{liveLessons.filter(l => !l.meetingUrl).length}</span></div>
                                <div className="flex justify-between"><span>ينقصها التصنيف (مادة/مسار)</span><span className="font-bold text-rose-600">{needsSetupLessons.length}</span></div>
                            </div>
                        </div>
                        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                            <h4 className="font-black text-gray-900 mb-2">التسجيلات المتاحة للطلاب</h4>
                            <div className="space-y-2 text-sm text-gray-600">
                                <div className="flex justify-between"><span>حصص بها رابط تسجيل</span><span className="font-bold">{recordedLessons.length}</span></div>
                                <div className="flex justify-between"><span>مفعلة للعرض للطالب</span><span className="font-bold text-indigo-600">{recordedLessons.filter(l => l.showRecordingOnPlatform).length}</span></div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const SummaryCard: React.FC<{ title: string; value: string }> = ({ title, value }) => (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center gap-2 text-sm text-gray-500">
            <CalendarDays size={15} />
            {title}
        </div>
        <div className="text-3xl font-black text-gray-900 mt-2">{value}</div>
    </div>
);
