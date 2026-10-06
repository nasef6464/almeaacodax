import React, { useState, useEffect } from 'react';
import { UserPlus, UserMinus, Search, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface LinkedStudent {
  id: string;
  name: string;
  role: string;
  schoolId?: string | null;
}

interface ParentStudentLinkerProps {
  linkedStudentIds: string[];
  onLinked?: (student: LinkedStudent) => void;
  onUnlinked?: (studentId: string) => void;
}

type InputMode = 'nationalId' | 'phone';

export const ParentStudentLinker: React.FC<ParentStudentLinkerProps> = ({
  linkedStudentIds: initialIds,
  onLinked,
  onUnlinked,
}) => {
  const { user } = useAuth();
  const [mode, setMode] = useState<InputMode>('nationalId');
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingExisting, setFetchingExisting] = useState(false);
  const [unlinkingId, setUnlinkingId] = useState<string | null>(null);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [linkedStudents, setLinkedStudents] = useState<LinkedStudent[]>([]);

  // Load already-linked students on mount
  useEffect(() => {
    if (!user) return;
    setFetchingExisting(true);
    api.get('/auth/parent/linked-students')
      .then((data: unknown) => {
        const students = Array.isArray(data) ? data : (data as { students?: LinkedStudent[] }).students ?? [];
        setLinkedStudents(students as LinkedStudent[]);
      })
      .catch(() => { /* silently ignore if endpoint not ready */ })
      .finally(() => setFetchingExisting(false));
  }, [user]);


  const handleLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || !inputValue.trim()) return;
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const digits = inputValue.replace(/\D/g, '');
      const payload =
        mode === 'nationalId'
          ? { nationalId: digits }
          : { phone: inputValue.trim() };

      const result = await api.parentLinkStudent(payload);
      setSuccess(`✅ تم ربط الطالب "${result.student.name}" بنجاح`);
      setInputValue('');
      setLinkedStudents((prev) => {
        if (prev.some((s) => s.id === result.student.id)) return prev;
        return [...prev, result.student];
      });
      onLinked?.(result.student);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'حدث خطأ أثناء الربط';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleUnlink = async (studentId: string) => {
    if (unlinkingId) return;
    setUnlinkingId(studentId);
    setError('');
    setSuccess('');
    try {
      await api.parentUnlinkStudent(studentId);
      setLinkedStudents((prev) => prev.filter((s) => s.id !== studentId));
      setSuccess('تم إلغاء ربط الطالب');
      onUnlinked?.(studentId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'حدث خطأ أثناء إلغاء الربط';
      setError(msg);
    } finally {
      setUnlinkingId(null);
    }
  };

  const placeholder =
    mode === 'nationalId'
      ? 'رقم الهوية الوطنية (10 أرقام، تبدأ بـ 1 أو 2)'
      : 'رقم جوال الطالب (مثال: 05xxxxxxxx)';

  const isValidInput =
    mode === 'nationalId'
      ? /^[12]\d{9}$/.test(inputValue.replace(/\D/g, ''))
      : inputValue.replace(/\D/g, '').length >= 8;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-l from-emerald-50 to-white px-5 py-4 border-b border-gray-100 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center">
          <UserPlus size={18} className="text-white" />
        </div>
        <div>
          <h3 className="font-black text-gray-900 text-sm">ربط الطالب بحسابك</h3>
          <p className="text-xs text-gray-500">أضف أبناءك لمتابعة تقدمهم الدراسي</p>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Mode toggle */}
        <div className="flex gap-2 bg-gray-100 rounded-xl p-1">
          <button
            type="button"
            onClick={() => { setMode('nationalId'); setInputValue(''); setError(''); setSuccess(''); }}
            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
              mode === 'nationalId' ? 'bg-white shadow text-emerald-700' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            🪪 رقم الهوية
          </button>
          <button
            type="button"
            onClick={() => { setMode('phone'); setInputValue(''); setError(''); setSuccess(''); }}
            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
              mode === 'phone' ? 'bg-white shadow text-emerald-700' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            📱 رقم الجوال
          </button>
        </div>

        {/* Error / Success */}
        {error && (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
            <AlertCircle size={15} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="flex items-start gap-2 p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-sm text-emerald-700">
            <CheckCircle size={15} className="mt-0.5 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLink} className="flex gap-2">
          <input
            type={mode === 'phone' ? 'tel' : 'text'}
            inputMode="numeric"
            dir="ltr"
            value={inputValue}
            onChange={(e) => { setInputValue(e.target.value); setError(''); setSuccess(''); }}
            placeholder={placeholder}
            className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:border-emerald-400 focus:ring-0 outline-none transition-colors"
          />
          <button
            type="submit"
            disabled={loading || !isValidInput}
            className="px-4 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            {loading ? (
              <Loader size={16} className="animate-spin" />
            ) : (
              <Search size={16} />
            )}
            <span className="hidden sm:inline">ربط</span>
          </button>
        </form>

        {/* Hint */}
        <p className="text-xs text-gray-400">
          {mode === 'nationalId'
            ? 'أدخل رقم الهوية الوطنية الخاص بالطالب (10 أرقام)'
            : 'أدخل رقم الجوال المسجل به حساب الطالب في المنصة'}
        </p>

        {/* Linked students list */}
        {linkedStudents.length > 0 && (
          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-bold text-gray-500 mb-2">الطلاب المرتبطون في هذه الجلسة:</p>
            <div className="space-y-2">
              {linkedStudents.map((student) => (
                <div
                  key={student.id}
                  className="flex items-center justify-between gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-black text-xs">
                      {student.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-800">{student.name}</p>
                      {student.schoolId && (
                        <p className="text-xs text-gray-400">رقم المدرسة: {student.schoolId}</p>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleUnlink(student.id)}
                    disabled={unlinkingId === student.id}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                    title="إلغاء الربط"
                  >
                    {unlinkingId === student.id ? (
                      <Loader size={14} className="animate-spin" />
                    ) : (
                      <UserMinus size={14} />
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Info note */}
        <div className="bg-blue-50 rounded-xl p-3 text-xs text-blue-600 border border-blue-100">
          <strong>ملاحظة:</strong> يجب أن يكون الطالب مسجلاً في المنصة وأن تكون بياناته (الهوية أو الجوال) محدّثة في ملفه الشخصي.
        </div>
      </div>
    </div>
  );
};
