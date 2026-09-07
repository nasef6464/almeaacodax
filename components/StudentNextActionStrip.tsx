import React from 'react';
import { Link } from 'react-router-dom';

type StudentNextActionStripProps = {
  title: string;
  description: string;
  primaryLabel: string;
  primaryHref: string;
  kicker?: string;
  icon?: React.ReactNode;
  tone?: 'amber' | 'indigo' | 'rose' | 'emerald';
  secondaryLabel?: string;
  secondaryHref?: string;
};

const toneStyles = {
  amber: {
    shell: 'border-amber-100 bg-amber-50',
    button: 'bg-amber-600 hover:bg-amber-700',
    dot: 'bg-amber-500',
  },
  indigo: {
    shell: 'border-indigo-100 bg-indigo-50',
    button: 'bg-indigo-600 hover:bg-indigo-700',
    dot: 'bg-indigo-500',
  },
  rose: {
    shell: 'border-rose-100 bg-rose-50',
    button: 'bg-rose-600 hover:bg-rose-700',
    dot: 'bg-rose-500',
  },
  emerald: {
    shell: 'border-emerald-100 bg-emerald-50',
    button: 'bg-emerald-600 hover:bg-emerald-700',
    dot: 'bg-emerald-500',
  },
};

export const StudentNextActionStrip: React.FC<StudentNextActionStripProps> = ({
  title,
  description,
  primaryLabel,
  primaryHref,
  kicker = 'خطوتك التالية',
  icon,
  tone = 'indigo',
  secondaryLabel,
  secondaryHref,
}) => {
  const styles = toneStyles[tone] || toneStyles.indigo;

  return (
    <section aria-labelledby="student-next-action-title" data-testid="student-next-action-strip" aria-live="polite">
      <div className={`rounded-2xl border p-2.5 shadow-xs sm:p-4 sm:py-3 ${styles.shell}`}>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 items-center gap-3 text-right">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white shadow-2xs">
              {icon || <span className={`h-2.5 w-2.5 rounded-full ${styles.dot}`} />}
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-black text-gray-500" data-testid="student-next-action-kicker">
                {kicker}
              </div>
              <h3 id="student-next-action-title" data-testid="student-next-action-title" className="text-sm font-black leading-snug text-gray-900 sm:text-base">
                {title}
              </h3>
              <p className="mt-0.5 max-w-2xl text-xs leading-relaxed text-gray-600" data-testid="student-next-action-description">
                {description}
              </p>
            </div>
          </div>

          <div className="flex w-full shrink-0 flex-col gap-2 sm:flex-row md:w-auto">
            {secondaryLabel && secondaryHref ? (
              <Link
                to={secondaryHref}
                data-testid="student-next-action-secondary"
                className="inline-flex min-h-9 items-center justify-center rounded-xl border border-white/80 bg-white px-3.5 py-1.5 text-xs font-black text-gray-700 transition hover:bg-gray-50"
              >
                {secondaryLabel}
              </Link>
            ) : null}
            <Link
              to={primaryHref}
              data-testid="student-next-action-primary"
              className={`inline-flex min-h-9 items-center justify-center rounded-xl px-4 py-1.5 text-xs font-black text-white shadow-xs transition hover:-translate-y-0.5 hover:shadow-md ${styles.button}`}
            >
              {primaryLabel}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};
