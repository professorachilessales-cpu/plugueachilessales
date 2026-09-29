import React from 'react';
import { Loader2, Inbox } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  title,
  description,
  icon: Icon = Inbox,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 ${className}`}>
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500 mb-3 shadow-inner">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
        {title}
      </h3>
      {description && (
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-sm leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

interface LoadingStateProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LoadingState({
  message = 'Carregando dados...',
  size = 'md',
  className = '',
}: LoadingStateProps) {
  const sizeClass = {
    sm: 'h-4 w-4',
    md: 'h-7 w-7',
    lg: 'h-10 w-10',
  }[size];

  return (
    <div className={`flex flex-col items-center justify-center p-8 gap-3 text-center ${className}`}>
      <Loader2 className={`${sizeClass} animate-spin text-school-blue-700 dark:text-school-gold-400`} />
      {message && (
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
          {message}
        </span>
      )}
    </div>
  );
}

interface SkeletonLoaderProps {
  className?: string;
  count?: number;
}

export function SkeletonLoader({ className = 'h-16 w-full rounded-xl', count = 1 }: SkeletonLoaderProps) {
  return (
    <div className="space-y-3 w-full">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`animate-pulse bg-slate-200/80 dark:bg-slate-800/80 rounded-xl ${className}`}
        />
      ))}
    </div>
  );
}

interface ProgressBarProps {
  value: number;
  max?: number;
  label?: string;
  showPercent?: boolean;
  colorScheme?: 'blue' | 'gold' | 'green' | 'red';
  className?: string;
}

export function ProgressBar({
  value,
  max = 100,
  label,
  showPercent = true,
  colorScheme = 'blue',
  className = '',
}: ProgressBarProps) {
  const percent = Math.min(Math.max(Math.round((value / max) * 100), 0), 100);

  const barColors = {
    blue: 'bg-gradient-to-r from-school-blue-700 to-school-blue-500',
    gold: 'bg-gradient-to-r from-school-gold-600 to-school-gold-400',
    green: 'bg-gradient-to-r from-emerald-600 to-emerald-400',
    red: 'bg-gradient-to-r from-rose-600 to-rose-400',
  }[colorScheme];

  return (
    <div className={`w-full space-y-1.5 ${className}`}>
      {(label || showPercent) && (
        <div className="flex items-center justify-between text-xs font-bold">
          {label && <span className="text-slate-700 dark:text-slate-300">{label}</span>}
          {showPercent && (
            <span className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">
              {percent}%
            </span>
          )}
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"
      >
        <div
          className={`h-full rounded-full transition-all duration-300 ${barColors}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
