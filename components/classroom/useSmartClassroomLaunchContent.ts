import { useEffect, useState } from 'react';
import { api } from '../../services/api';
import type { ClassroomPreparedTemplate } from './ClassroomPreparedTemplatesManager';

export const SCHOOL_DAYS = [
  { id: 'sun', label: 'الأحد' },
  { id: 'mon', label: 'الإثنين' },
  { id: 'tue', label: 'الثلاثاء' },
  { id: 'wed', label: 'الأربعاء' },
  { id: 'thu', label: 'الخميس' },
];

export const PERIODS = [
  { id: '1', label: 'الحصة 1 (الصباحية الأولى)' },
  { id: '2', label: 'الحصة 2' },
  { id: '3', label: 'الحصة 3' },
  { id: '4', label: 'الحصة 4' },
  { id: '5', label: 'الحصة 5' },
  { id: '6', label: 'الحصة 6' },
  { id: '7', label: 'الحصة 7' },
];

export const useSmartClassroomLaunchContent = (isOpen: boolean, schoolId: string) => {
  const [templates, setTemplates] = useState<ClassroomPreparedTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [availableQuestions, setAvailableQuestions] = useState<any[]>([]);
  const [selectedSingleQuestionId, setSelectedSingleQuestionId] = useState('');

  useEffect(() => {
    if (!isOpen || !schoolId) return;
    try {
      const prefix = `smart_classroom_templates_${schoolId}_`;
      const customTemplates: ClassroomPreparedTemplate[] = [];
      const seenIds = new Set<string>();

      for (let index = 0; index < localStorage.length; index += 1) {
        const key = localStorage.key(index);
        if (!key || !key.startsWith(prefix)) continue;
        try {
          const raw = localStorage.getItem(key);
          const parsed = raw ? JSON.parse(raw) : null;
          if (!Array.isArray(parsed)) continue;
          for (const template of parsed) {
            if (template?.id && !seenIds.has(template.id)) {
              seenIds.add(template.id);
              customTemplates.push(template);
            }
          }
        } catch {
          // ignore malformed local template storage
        }
      }

      const defaultTemplates: ClassroomPreparedTemplate[] = [
        {
          id: 'tpl_qudurat_speed_6',
          title: 'تحدي القدرات العامة وسرعة البديهة (6 أسئلة)',
          schoolId,
          questionIds: ['q-math-1', 'q-verbal-2', 'q-speed-3', 'q-math-4', 'q-verbal-5', 'q-challenge-6'],
          challengeIds: ['q-speed-3', 'q-challenge-6'],
          createdAt: new Date().toISOString().slice(0, 10),
          badge: 'نموذج قياسي جاهز ⭐',
        },
        {
          id: 'tpl_geometry_focus_5',
          title: 'حزمة إتقان الهندسة والمساحات (5 أسئلة)',
          schoolId,
          questionIds: ['q-math-1', 'q-math-4', 'q-challenge-6'],
          challengeIds: ['q-challenge-6'],
          createdAt: new Date().toISOString().slice(0, 10),
          badge: 'علاج الفجوات 🎯',
        },
      ];

      const combined = [
        ...customTemplates,
        ...defaultTemplates.filter((template) => !seenIds.has(template.id)),
      ];
      setTemplates(combined);
      setSelectedTemplateId((current) => current || combined[0]?.id || '');
    } catch {
      // preserve legacy fail-safe behavior
    }
  }, [isOpen, schoolId]);

  useEffect(() => {
    if (!isOpen || !schoolId) return;
    api.getClassroomQuestions(schoolId)
      .then((response) => {
        const questions = response.questions || [];
        setAvailableQuestions(questions);
        setSelectedSingleQuestionId((current) => current || questions[0]?.questionId || '');
      })
      .catch(() => {
        // preserve legacy fail-safe behavior
      });
  }, [isOpen, schoolId]);

  return {
    templates,
    selectedTemplateId,
    setSelectedTemplateId,
    availableQuestions,
    selectedSingleQuestionId,
    setSelectedSingleQuestionId,
  };
};
