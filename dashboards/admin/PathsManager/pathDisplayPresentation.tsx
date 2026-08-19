import React from 'react';
import type { PathDisplaySettings } from '../../../types';

const colorMap: Record<string, { soft: string; text: string; border: string }> = {
  gray: { soft: '#f3f4f6', text: '#4b5563', border: '#d1d5db' },
  indigo: { soft: '#e0e7ff', text: '#4f46e5', border: '#c7d2fe' },
  amber: { soft: '#fef3c7', text: '#b45309', border: '#fde68a' },
  emerald: { soft: '#d1fae5', text: '#047857', border: '#a7f3d0' },
  purple: { soft: '#ede9fe', text: '#6d28d9', border: '#ddd6fe' },
  rose: { soft: '#ffe4e6', text: '#be123c', border: '#fecdd3' },
  blue: { soft: '#dbeafe', text: '#1d4ed8', border: '#bfdbfe' },
};

export const resolveColor = (value?: string) => {
  if (!value) return colorMap.gray;
  if (value.startsWith('#')) {
    return { soft: `${value}18`, text: value, border: `${value}33` };
  }
  return colorMap[value] || colorMap.gray;
};

const defaultPathDisplaySettings: Required<PathDisplaySettings> = {
  showSubjectCards: true,
  showMockExamCard: true,
  showPackageCard: true,
};

export const resolvePathDisplaySettings = (path?: { settings?: PathDisplaySettings | null }): Required<PathDisplaySettings> => ({
  ...defaultPathDisplaySettings,
  ...(path?.settings || {}),
});

export const getPathIcon = (path: any) => {
  if (path?.iconUrl) return <img src={path.iconUrl} alt={path.name} className="w-8 h-8 object-contain" />;
  return path?.icon || '📚';
};

export const getSubjectIcon = (subject: any) => {
  if (subject?.iconUrl) return <img src={subject.iconUrl} alt={subject.name} className="w-8 h-8 object-contain" />;
  return subject?.icon || '📖';
};
