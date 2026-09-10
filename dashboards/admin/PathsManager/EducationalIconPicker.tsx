import React, { useState, useMemo } from 'react';
import { Search, X, Upload, Check, Sparkles } from 'lucide-react';
import {
  EDUCATIONAL_ICONS,
  ICON_CATEGORIES,
  EducationalIconCategory,
  EducationalIconItem,
  resolveIconComponent,
} from './educationalIcons';
import { resolveColor } from './pathDisplayPresentation';

interface EducationalIconPickerProps {
  selectedIcon: string;
  selectedIconUrl?: string;
  color?: string;
  onSelectIcon: (icon: string) => void;
  onUploadIconUrl?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClearIconUrl?: () => void;
  defaultFallback?: string;
  label?: string;
}

export const EducationalIconPicker: React.FC<EducationalIconPickerProps> = ({
  selectedIcon,
  selectedIconUrl,
  color,
  onSelectIcon,
  onUploadIconUrl,
  onClearIconUrl,
  defaultFallback = '📚',
  label = 'أيقونة العنصر التعليمي',
}) => {
  const [activeCategory, setActiveCategory] = useState<EducationalIconCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  // Resolved theme colors for the live preview
  const resolvedColor = resolveColor(color);

  // Filter icons based on category and search query
  const filteredIcons = useMemo(() => {
    return EDUCATIONAL_ICONS.filter((item) => {
      // Category filter
      if (activeCategory !== 'all' && item.category !== activeCategory) {
        return false;
      }
      // Search query filter
      if (!searchQuery.trim()) {
        return true;
      }
      const q = searchQuery.trim().toLowerCase();
      const matchLabel = item.label.toLowerCase().includes(q);
      const matchKeywords = item.keywords.some((kw) => kw.toLowerCase().includes(q));
      const matchLucide = item.lucideName?.toLowerCase().includes(q);
      return matchLabel || matchKeywords || matchLucide;
    });
  }, [activeCategory, searchQuery]);

  // Current active icon item if it matches one in our list
  const activeIconItem = useMemo(() => {
    return EDUCATIONAL_ICONS.find((item) => item.id === selectedIcon);
  }, [selectedIcon]);

  return (
    <div className="space-y-3 rounded-2xl border border-gray-200 bg-gray-50/60 p-4 transition-all" dir="rtl">
      {/* Header & Live Preview */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-3">
        <div>
          <label className="block text-sm font-black text-gray-800">{label}</label>
          <span className="text-xs text-gray-500">اختر من الأيقونات المناسبة للمواد أو أدخل رمزاً مخصصاً</span>
        </div>

        {/* Live Badge Preview */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-gray-400">معاينة الزر:</span>
          <div
            className="flex h-11 min-w-[50px] items-center justify-center gap-1.5 rounded-xl px-3 shadow-xs border transition-all"
            style={{
              backgroundColor: resolvedColor.soft,
              borderColor: resolvedColor.border,
              color: resolvedColor.text,
            }}
            title="معاينة مظهر الأيقونة في الأزرار والبطاقات"
          >
            {selectedIconUrl ? (
              <img src={selectedIconUrl} alt="icon preview" className="h-6 w-6 object-contain" />
            ) : (
              resolveIconComponent(selectedIcon, 'w-6 h-6', defaultFallback)
            )}
            <span className="text-xs font-black">
              {selectedIconUrl ? 'صورة مرفوعة' : (activeIconItem?.label || 'المعاينة')}
            </span>
          </div>
        </div>
      </div>

      {/* Upload & Direct Input Controls */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {/* Direct Emoji / Symbol Input */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-gray-600 shrink-0">رمز مخصص:</span>
          <input
            type="text"
            value={selectedIcon}
            onChange={(e) => onSelectIcon(e.target.value)}
            placeholder={defaultFallback}
            maxLength={30}
            className="flex-1 rounded-xl border border-gray-300 bg-white px-3 py-2 text-center text-sm font-bold text-gray-800 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {/* Image Upload Control */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="file"
              accept="image/*"
              onChange={onUploadIconUrl}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              title="رفع صورة مخصصة"
            />
            <div className="flex h-9 w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-gray-300 bg-white px-3 text-xs font-bold text-indigo-600 transition-colors hover:bg-indigo-50/50">
              <Upload size={14} />
              <span>{selectedIconUrl ? 'تغيير الصورة المرفوعة' : 'رفع صورة مخصصة...'}</span>
            </div>
          </div>
          {selectedIconUrl && onClearIconUrl && (
            <button
              type="button"
              onClick={onClearIconUrl}
              className="rounded-xl p-2 text-red-500 transition-colors hover:bg-red-50"
              title="إزالة الصورة المرفوعة والعودة للأيقونة"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Toggle Expand / Collapse Quick Palette */}
      <div className="pt-1">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex w-full items-center justify-between rounded-xl bg-white px-3 py-2 text-xs font-bold text-indigo-700 shadow-2xs border border-indigo-100 hover:bg-indigo-50/70 transition-colors"
        >
          <span className="flex items-center gap-1.5">
            <Sparkles size={14} className="text-amber-500" />
            <span>مكتبة الأيقونات التعليمية للمواد والمسارات والمراحل</span>
            <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] text-indigo-800">
              {EDUCATIONAL_ICONS.length} أيقونة
            </span>
          </span>
          <span>{isExpanded ? '▲ إخفاء القائمة' : '▼ استعراض الأيقونات واختيارها'}</span>
        </button>
      </div>

      {/* Expanded Interactive Icon Picker */}
      {isExpanded && (
        <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-3 shadow-xs">
          {/* Search bar */}
          <div className="relative">
            <Search size={16} className="absolute right-3 top-2.5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث في الأيقونات (مثال: حاسبة، كتاب، ذرة، لغة، تفوق، هندسة)..."
              className="w-full rounded-xl border border-gray-200 bg-gray-50/80 py-2 pr-9 pl-8 text-xs font-medium text-gray-800 outline-none focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute left-2.5 top-2.5 text-gray-400 hover:text-gray-600"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Category Tabs */}
          <div className="flex flex-wrap gap-1 border-b border-gray-100 pb-2">
            {ICON_CATEGORIES.map((cat) => {
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>

          {/* Icons Grid */}
          <div className="max-h-56 overflow-y-auto pr-1">
            {filteredIcons.length === 0 ? (
              <div className="py-6 text-center text-xs text-gray-400">
                لا توجد أيقونة مطابقة لبحثك "{searchQuery}"
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-6 md:grid-cols-8">
                {filteredIcons.map((item) => {
                  const isSelected = selectedIcon === item.id && !selectedIconUrl;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        onSelectIcon(item.id);
                        if (onClearIconUrl && selectedIconUrl) {
                          onClearIconUrl();
                        }
                      }}
                      className={`group relative flex flex-col items-center justify-center rounded-xl p-2 transition-all text-center ${
                        isSelected
                          ? 'border-2 border-indigo-600 bg-indigo-50 text-indigo-700 shadow-xs scale-105'
                          : 'border border-gray-100 bg-gray-50/50 text-gray-700 hover:border-indigo-200 hover:bg-indigo-50/30 hover:scale-105'
                      }`}
                      title={`${item.label} (${item.type === 'lucide' ? 'رمز متجه' : 'إيموجي'})`}
                    >
                      <div className="flex h-7 w-7 items-center justify-center transition-transform group-hover:scale-110">
                        {resolveIconComponent(item.id, 'w-5 h-5', defaultFallback)}
                      </div>
                      <span className="mt-1 line-clamp-1 w-full text-[10px] font-bold leading-tight text-gray-600 group-hover:text-indigo-600">
                        {item.label}
                      </span>
                      {isSelected && (
                        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-white shadow-xs">
                          <Check size={10} />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
