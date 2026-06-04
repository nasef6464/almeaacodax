import React from 'react';
import { Link } from 'react-router-dom';

type StudentNextActionStripProps = {
  title: string;
  description: string;
  primaryLabel: string;
  primaryHref: string;
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
  icon,
  tone = 'indigo',
  secondaryLabel,
  secondaryHref,
}) => {
  const styles = toneStyles[tone];

  return (
    <section aria-labelledby="student-next-action-title" data-testid="student-next-action-strip">
      <div className={`rounded-2xl border p-4 shadow-sm ${styles.shell}`}>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 items-start gap-3 text-right">
            <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
              {icon || <span className={`h-3 w-3 rounded-full ${styles.dot}`} />}
            </div>
            <div className="min-w-0">
              <div className="mb-1 text-xs font-black text-gray-500">خطوتك التالية</div>
              <h3 id="student-next-action-title" className="text-lg font-black leading-7 text-gray-900">
                {title}
              </h3>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-600">{description}</p>
            </div>
          </div>

          <div className="flex w-full flex-col gap-2 sm:flex-row md:w-auto">
            {secondaryLabel && secondaryHref ? (
              <Link
                to={secondaryHref}
                data-testid="student-next-action-secondary"
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/80 bg-white px-4 text-sm font-black text-gray-700 transition hover:bg-gray-50"
              >
                {secondaryLabel}
              </Link>
            ) : null}
            <Link
              to={primaryHref}
              data-testid="student-next-action-primary"
              className={`inline-flex min-h-11 items-center justify-center rounded-xl px-5 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${styles.button}`}
            >
              {primaryLabel}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};
