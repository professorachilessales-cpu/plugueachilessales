import React from 'react';
import { AlertCircle, Search, X } from 'lucide-react';

interface FormFieldProps {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
}

export function FormField({
  label,
  error,
  hint,
  required,
  htmlFor,
  children,
  className = '',
}: FormFieldProps) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label
          htmlFor={htmlFor}
          className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1"
        >
          <span>{label}</span>
          {required && <span className="text-rose-500 font-bold">*</span>}
        </label>
      )}

      {children}

      {error ? (
        <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 mt-0.5 animate-in fade-in duration-150">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      ) : hint ? (
        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

interface SearchFieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onClear?: () => void;
  className?: string;
}

export function SearchField({
  value,
  onChange,
  placeholder = 'Buscar...',
  onClear,
  className = '',
  ...props
}: SearchFieldProps) {
  return (
    <div className={`relative flex items-center w-full ${className}`}>
      <Search className="absolute left-3.5 h-4 w-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-10 pr-9 min-h-[44px] sm:min-h-[44px] rounded-xl border border-slate-200 bg-white dark:border-school-dark-border dark:bg-school-dark-surface dark:text-white placeholder:text-slate-400 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-school-blue-500 shadow-sm"
        {...props}
      />
      {value && (
        <button
          type="button"
          onClick={() => {
            onChange('');
            if (onClear) onClear();
          }}
          aria-label="Limpar busca"
          className="absolute right-2.5 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
