import React from 'react';
import { 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle, 
  Clock, 
  Info, 
  XCircle,
  ShieldCheck,
  GraduationCap
} from 'lucide-react';

export type StatusVariant = 
  | 'success'     // Verde: disponível, ativo, concluído, presença
  | 'warning'     // Laranja: pendências, atenção, prazo próximo
  | 'danger'      // Vermelho: erro, alerta crítico, débito, vencida
  | 'info'        // Azul: navegação, seleção, informações
  | 'accent'      // Dourado: destaque escolar, ação principal
  | 'neutral';    // Cinza: inativo, desabilitado, neutro

interface StatusChipProps {
  label: string;
  variant?: StatusVariant;
  size?: 'sm' | 'md';
  icon?: 'auto' | 'check' | 'warning' | 'alert' | 'clock' | 'info' | 'shield' | 'grad' | 'none';
  className?: string;
}

export function StatusChip({
  label,
  variant = 'info',
  size = 'md',
  icon = 'auto',
  className = '',
}: StatusChipProps) {
  const variantStyles: Record<StatusVariant, string> = {
    success: 'bg-emerald-100 text-emerald-800 border-emerald-200/80 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800/60',
    warning: 'bg-amber-100 text-amber-900 border-amber-200/80 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-800/60',
    danger: 'bg-rose-100 text-rose-800 border-rose-200/80 dark:bg-rose-950/70 dark:text-rose-300 dark:border-rose-800/60',
    info: 'bg-blue-100 text-blue-800 border-blue-200/80 dark:bg-blue-950/70 dark:text-blue-300 dark:border-blue-800/60',
    accent: 'bg-school-gold-100 text-amber-950 border-school-gold-300 dark:bg-school-gold-950/80 dark:text-school-gold-300 dark:border-school-gold-700/60',
    neutral: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
  };

  const sizeStyles = {
    sm: 'text-[10px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
  }[size];

  const renderIcon = () => {
    if (icon === 'none') return null;
    const iconClass = size === 'sm' ? 'h-3 w-3 shrink-0' : 'h-3.5 w-3.5 shrink-0';

    if (icon === 'check') return <CheckCircle2 className={iconClass} />;
    if (icon === 'warning') return <AlertTriangle className={iconClass} />;
    if (icon === 'alert') return <AlertCircle className={iconClass} />;
    if (icon === 'clock') return <Clock className={iconClass} />;
    if (icon === 'info') return <Info className={iconClass} />;
    if (icon === 'shield') return <ShieldCheck className={iconClass} />;
    if (icon === 'grad') return <GraduationCap className={iconClass} />;

    // Auto selection based on variant
    switch (variant) {
      case 'success': return <CheckCircle2 className={iconClass} />;
      case 'warning': return <Clock className={iconClass} />;
      case 'danger': return <AlertCircle className={iconClass} />;
      case 'info': return <Info className={iconClass} />;
      case 'accent': return <ShieldCheck className={iconClass} />;
      default: return null;
    }
  };

  return (
    <span
      className={`inline-flex items-center font-bold rounded-full border shadow-sm tracking-wide ${variantStyles[variant]} ${sizeStyles} ${className}`}
    >
      {renderIcon()}
      <span className="truncate">{label}</span>
    </span>
  );
}

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'accent' | 'danger' | 'neutral';
  size?: 'sm' | 'md';
  className?: string;
}

export function Badge({
  children,
  variant = 'primary',
  size = 'sm',
  className = '',
}: BadgeProps) {
  const variantStyles = {
    primary: 'bg-school-blue-800 text-white dark:bg-school-blue-700',
    secondary: 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200',
    accent: 'bg-school-gold-500 text-slate-950 font-black',
    danger: 'bg-rose-600 text-white font-black',
    neutral: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  }[variant];

  const sizeStyles = {
    sm: 'text-[10px] px-1.5 py-0.5 rounded-md',
    md: 'text-xs px-2 py-0.5 rounded-lg',
  }[size];

  return (
    <span className={`inline-flex items-center justify-center font-bold ${variantStyles} ${sizeStyles} ${className}`}>
      {children}
    </span>
  );
}
