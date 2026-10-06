import React from 'react';
import { ChevronLeft, ArrowRight } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  onClick?: () => void;
  active?: boolean;
}

export interface AdminBreadcrumbHeaderProps {
  breadcrumbs: BreadcrumbItem[];
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  onBack?: () => void;
  backLabel?: string;
  className?: string;
  testId?: string;
}

export const AdminBreadcrumbHeader: React.FC<AdminBreadcrumbHeaderProps> = ({
  breadcrumbs,
  title,
  subtitle,
  icon,
  badge,
  actions,
  onBack,
  backLabel,
  className = '',
  testId,
}) => {
  return (
    <header
      data-testid={testId}
      className={`rounded-2xl border border-gray-100 bg-white p-5 shadow-xs mb-6 transition-all ${className}`}
    >
      {/* ── شريط مسار التصفح (Breadcrumbs Trail) ── */}
      {breadcrumbs.length > 0 && (
        <nav
          aria-label="مسار التنقل"
          className="flex items-center gap-1.5 text-xs text-gray-500 font-bold flex-wrap mb-3"
        >
          {breadcrumbs.map((item, index) => {
            const isLast = index === breadcrumbs.length - 1 || item.active;
            return (
              <React.Fragment key={`${item.label}-${index}`}>
                {index > 0 && (
                  <ChevronLeft size={13} className="text-gray-300 shrink-0 select-none" />
                )}
                {item.onClick && !isLast ? (
                  <button
                    type="button"
                    onClick={item.onClick}
                    className="text-gray-500 hover:text-indigo-600 font-bold transition-colors cursor-pointer"
                  >
                    {item.label}
                  </button>
                ) : isLast ? (
                  <span className="text-indigo-600 font-black" aria-current="page">
                    {item.label}
                  </span>
                ) : (
                  <span className="text-gray-600">{item.label}</span>
                )}
              </React.Fragment>
            );
          })}
        </nav>
      )}

      {/* ── العنوان الرئيسي والوصف والإجراءات ── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pt-1">
        <div className="flex items-center gap-3.5 min-w-0 flex-1">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="p-2.5 rounded-xl border border-gray-200 bg-gray-50 hover:bg-indigo-50 hover:border-indigo-200 text-gray-600 hover:text-indigo-600 transition-all cursor-pointer shrink-0"
              title={backLabel || 'عودة للمستوى السابق'}
              aria-label={backLabel || 'عودة للمستوى السابق'}
            >
              <ArrowRight size={18} />
            </button>
          )}

          {icon && (
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 bg-indigo-50 text-indigo-600 border border-indigo-100/70 shadow-2xs">
              {icon}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl md:text-2xl font-black text-gray-900 tracking-tight leading-snug">
                {title}
              </h1>
              {badge && <div className="shrink-0">{badge}</div>}
            </div>
            {subtitle && (
              <p className="text-xs md:text-sm text-gray-500 font-medium mt-1 leading-relaxed">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {actions && (
          <div className="flex items-center gap-2.5 flex-wrap shrink-0">
            {actions}
          </div>
        )}
      </div>
    </header>
  );
};
