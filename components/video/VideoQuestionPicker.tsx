import React from 'react';
import { Question } from '../../types';

export interface VideoQuestionPickerFilters {
  search?: string;
  subjectId?: string;
  sectionId?: string;
  skillId?: string;
  difficulty?: string;
  type?: string;
}

interface VideoQuestionPickerProps {
  questions: Question[];
  selectedQuestionId?: string;
  onSelect: (question: Question) => void;
}

export const VideoQuestionPicker: React.FC<VideoQuestionPickerProps> = ({
  questions,
  selectedQuestionId,
  onSelect,
}) => {
  return (
    <div className="space-y-2">
      {questions.map((question) => (
        <button
          key={question.id}
          type="button"
          onClick={() => onSelect(question)}
          className={`w-full rounded-xl border p-3 text-right transition ${
            selectedQuestionId === question.id
              ? 'border-indigo-500 bg-indigo-50'
              : 'border-gray-200 bg-white hover:border-indigo-300'
          }`}
        >
          <div className="font-bold text-gray-900">{question.text}</div>
          <div className="mt-1 text-xs text-gray-500">
            {question.difficulty || 'بدون تحديد'}
          </div>
        </button>
      ))}
    </div>
  );
};
