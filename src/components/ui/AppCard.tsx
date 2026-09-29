import React from 'react';

interface AppCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: 'default' | 'featured' | 'interactive' | 'subtle';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  className?: string;
}

export function AppCard({
  children,
  variant = 'default',
  padding = 'md',
  className = '',
  ...props
}: AppCardProps) {
  const variantStyles = {
    default: 'app-card',
    featured: 'app-card-featured border-school-gold-400/30 dark:border-school-gold-400/20',
    interactive: 'app-card app-card-interactive cursor-pointer',
    subtle: 'rounded-2xl border border-slate-200/80 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-900/50',
  }[variant];

  const paddingStyles = {
    none: 'p-0',
    sm: 'p-3 sm:p-4',
    md: 'p-4 sm:p-5 lg:p-6',
    lg: 'p-6 sm:p-8',
  }[padding];

  return (
    <div
      className={`${variantStyles} ${paddingStyles} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  colorScheme?: 'blue' | 'gold' | 'green' | 'red' | 'orange' | 'purple';
  trend?: {
    value: string;
    isPositive?: boolean;
  };
  onClick?: () => void;
  className?: string;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  colorScheme = 'blue',
  trend,
  onClick,
  className = '',
}: StatCardProps) {
  const schemeStyles = {
    blue: {
      iconBg: 'bg-blue-50 text-school-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-100 dark:border-blue-900/50',
      badge: 'text-school-blue-700 dark:text-blue-300',
    },
    gold: {
      iconBg: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-school-gold-300 border-amber-100 dark:border-amber-900/50',
      badge: 'text-amber-700 dark:text-school-gold-300',
    },
    green: {
      iconBg: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-100 dark:border-emerald-900/50',
      badge: 'text-emerald-700 dark:text-emerald-300',
    },
    red: {
      iconBg: 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-100 dark:border-rose-900/50',
      badge: 'text-rose-700 dark:text-rose-300',
    },
    orange: {
      iconBg: 'bg-orange-50 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300 border-orange-100 dark:border-orange-900/50',
      badge: 'text-orange-700 dark:text-orange-300',
    },
    purple: {
      iconBg: 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-100 dark:border-purple-900/50',
      badge: 'text-purple-700 dark:text-purple-300',
    },
  }[colorScheme];

  return (
    <div
      onClick={onClick}
      className={`app-card p-4 sm:p-5 flex flex-col justify-between transition-all duration-200 ${
        onClick ? 'cursor-pointer app-card-interactive' : ''
      } ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block truncate">
            {title}
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              {value}
            </span>
            {trend && (
              <span
                className={`text-xs font-bold ${
                  trend.isPositive
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {trend.value}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
              {subtitle}
            </p>
          )}
        </div>

        <div
          className={`flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl border ${schemeStyles.iconBg} shadow-sm`}
        >
          <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
        </div>
      </div>
    </div>
  );
}
