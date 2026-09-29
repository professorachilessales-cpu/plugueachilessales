import React from 'react';
import { Loader2 } from 'lucide-react';

interface BaseButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children?: React.ReactNode;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  className?: string;
}

export function PrimaryButton({
  children,
  isLoading,
  leftIcon,
  rightIcon,
  fullWidth,
  disabled,
  className = '',
  ...props
}: BaseButtonProps) {
  return (
    <button
      disabled={disabled || isLoading}
      className={`btn-primary ${fullWidth ? 'w-full' : ''} ${
        disabled || isLoading ? 'opacity-60 cursor-not-allowed transform-none' : ''
      } ${className}`}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin shrink-0" />
      ) : (
        leftIcon && <span className="shrink-0">{leftIcon}</span>
      )}
      {children}
      {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
    </button>
  );
}

export function SecondaryButton({
  children,
  isLoading,
  leftIcon,
  rightIcon,
  fullWidth,
  disabled,
  className = '',
  ...props
}: BaseButtonProps) {
  return (
    <button
      disabled={disabled || isLoading}
      className={`btn-secondary ${fullWidth ? 'w-full' : ''} ${
        disabled || isLoading ? 'opacity-60 cursor-not-allowed transform-none' : ''
      } ${className}`}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin shrink-0" />
      ) : (
        leftIcon && <span className="shrink-0">{leftIcon}</span>
      )}
      {children}
      {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
    </button>
  );
}

export function GhostButton({
  children,
  isLoading,
  leftIcon,
  rightIcon,
  fullWidth,
  disabled,
  className = '',
  ...props
}: BaseButtonProps) {
  return (
    <button
      disabled={disabled || isLoading}
      className={`btn-ghost ${fullWidth ? 'w-full' : ''} ${
        disabled || isLoading ? 'opacity-60 cursor-not-allowed transform-none' : ''
      } ${className}`}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin shrink-0" />
      ) : (
        leftIcon && <span className="shrink-0">{leftIcon}</span>
      )}
      {children}
      {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
    </button>
  );
}

export function DangerButton({
  children,
  isLoading,
  leftIcon,
  rightIcon,
  fullWidth,
  disabled,
  className = '',
  ...props
}: BaseButtonProps) {
  return (
    <button
      disabled={disabled || isLoading}
      className={`btn-danger ${fullWidth ? 'w-full' : ''} ${
        disabled || isLoading ? 'opacity-60 cursor-not-allowed transform-none' : ''
      } ${className}`}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin shrink-0" />
      ) : (
        leftIcon && <span className="shrink-0">{leftIcon}</span>
      )}
      {children}
      {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
    </button>
  );
}

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  'aria-label': string;
  variant?: 'ghost' | 'outline' | 'primary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  className?: string;
}

export function IconButton({
  icon,
  'aria-label': ariaLabel,
  variant = 'ghost',
  size = 'md',
  isLoading,
  disabled,
  className = '',
  ...props
}: IconButtonProps) {
  const sizeStyles = {
    sm: 'h-9 w-9 min-w-[36px]',
    md: 'h-11 w-11 min-w-[44px]',
    lg: 'h-12 w-12 min-w-[48px]',
  }[size];

  const variantStyles = {
    ghost: 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
    outline: 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 shadow-sm',
    primary: 'bg-school-blue-800 text-white hover:bg-school-blue-700 shadow-sm shadow-school-blue-900/20',
    danger: 'bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-900/60 border border-rose-200/80 dark:border-rose-900/50',
  }[variant];

  return (
    <button
      aria-label={ariaLabel}
      disabled={disabled || isLoading}
      className={`inline-flex items-center justify-center rounded-xl transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-school-blue-500 active:scale-95 ${sizeStyles} ${variantStyles} ${
        disabled || isLoading ? 'opacity-60 cursor-not-allowed transform-none' : ''
      } ${className}`}
      {...props}
    >
      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
    </button>
  );
}
