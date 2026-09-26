import React from 'react';

export type AiCapabilityId =
  | 'student_chat'
  | 'question_tutor'
  | 'admin_copilot'
  | 'study_plan'
  | 'learning_path'
  | 'remediation'
  | 'authoring'
  | 'course_summary';

export type AiCapabilityProfile = {
  providerOrder: string;
  paidAllowed: boolean;
  maxOutputTokens: number;
};

const capabilityLabel: Record<AiCapabilityId, string> = {
  student_chat: 'مساعد الطالب',
  question_tutor: 'مساعد السؤال',
  admin_copilot: 'مساعد المدير',
  study_plan: 'خطة الدراسة',
  learning_path: 'المسار التعليمي',
  remediation: 'الخطة العلاجية',
  authoring: 'إنشاء المحتوى',
  course_summary: 'ملخص الدورة',
};

export const AI_CAPABILITY_IDS = Object.keys(capabilityLabel) as AiCapabilityId[];

export const createDefaultAiCapabilityProfiles = () =>
  Object.fromEntries(
    AI_CAPABILITY_IDS.map((id) => [id, { providerOrder: '', paidAllowed: false, maxOutputTokens: 700 }]),
  ) as Record<AiCapabilityId, AiCapabilityProfile>;

export const AiCapabilityRoutingEditor: React.FC<{
  profiles: Record<AiCapabilityId, AiCapabilityProfile>;
  onChange: React.Dispatch<React.SetStateAction<Record<AiCapabilityId, AiCapabilityProfile>>>;
}> = ({ profiles, onChange }) => (
  <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs space-y-4">
    <div>
      <h3 className="font-black text-sm text-gray-900">توجيه كل مساعد حسب المهمة</h3>
      <p className="text-xs text-gray-500 mt-1">اترك ترتيب المزودات فارغًا لاستخدام الترتيب العام. السماح المدفوع هنا لا يعمل إلا إذا كان السماح العام مفعّلًا أيضًا.</p>
    </div>
    <div className="space-y-2">
      {AI_CAPABILITY_IDS.map((id) => {
        const profile = profiles[id];
        return (
          <div key={id} className="grid grid-cols-1 lg:grid-cols-[180px_1fr_120px_120px] gap-2 items-center rounded-xl border border-gray-100 bg-gray-50/60 p-3">
            <span className="text-xs font-black text-gray-800">{capabilityLabel[id]}</span>
            <input
              value={profile.providerOrder}
              onChange={(e) => onChange((current) => ({ ...current, [id]: { ...current[id], providerOrder: e.target.value } }))}
              placeholder="مثال: gemini,qwen,openrouter"
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-[11px] font-mono"
            />
            <input
              type="number"
              min={64}
              max={4000}
              value={profile.maxOutputTokens}
              onChange={(e) => onChange((current) => ({ ...current, [id]: { ...current[id], maxOutputTokens: Number(e.target.value || 700) } }))}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs"
              title="أقصى Output Tokens"
            />
            <label className="flex items-center justify-center gap-2 text-[11px] font-bold text-gray-600">
              <input
                type="checkbox"
                checked={profile.paidAllowed}
                onChange={(e) => onChange((current) => ({ ...current, [id]: { ...current[id], paidAllowed: e.target.checked } }))}
              />
              مدفوع
            </label>
          </div>
        );
      })}
    </div>
  </div>
);
