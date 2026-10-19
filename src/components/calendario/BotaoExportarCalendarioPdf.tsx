'use client';

import React, { useState } from 'react';
import { FileText, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { EventoEscolar, CalendarioCategoria, EscolaConfig } from '@/lib/types';
import { gerarCalendarioMensalPdf } from '@/lib/calendario-pdf';

interface BotaoExportarCalendarioPdfProps {
  eventos: EventoEscolar[];
  categorias: CalendarioCategoria[];
  dataAtual: Date;
  escolaConfig: EscolaConfig;
  categoriaFiltroNome?: string;
  className?: string;
  variant?: 'toolbar' | 'header' | 'compact';
}

/**
 * Ícone vetorial refinado de arquivo PDF em formato compacto
 */
function PdfIconBadge({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <span className="relative inline-flex items-center justify-center shrink-0">
      <FileText className={`${className} text-rose-600 dark:text-rose-400`} />
      <span className="absolute -bottom-1 -right-1 flex h-2.5 items-center justify-center rounded-[3px] bg-rose-600 px-0.5 text-[7px] font-black leading-none text-white shadow-xs">
        PDF
      </span>
    </span>
  );
}

export function BotaoExportarCalendarioPdf({
  eventos,
  categorias,
  dataAtual,
  escolaConfig,
  categoriaFiltroNome,
  className = '',
  variant = 'toolbar',
}: BotaoExportarCalendarioPdfProps) {
  const [gerando, setGerando] = useState(false);
  const [feedback, setFeedback] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);

  const handleExportar = async () => {
    if (gerando) return;

    try {
      setGerando(true);
      setFeedback(null);

      const ano = dataAtual.getFullYear();
      const mes = dataAtual.getMonth(); // 0..11

      const resultado = await gerarCalendarioMensalPdf({
        eventos,
        categorias,
        ano,
        mes,
        escolaConfig,
        categoriaFiltroNome,
      });

      if (!resultado.success) {
        throw new Error(resultado.error || 'Erro desconhecido ao gerar o PDF.');
      }

      setFeedback({
        tipo: 'sucesso',
        texto: `PDF gerado com sucesso! (${resultado.totalEventos} evento(s) exportado(s))`,
      });

      // Limpa mensagem de feedback após 4 segundos
      setTimeout(() => {
        setFeedback(null);
      }, 4000);
    } catch (err: any) {
      console.error('Erro na exportação para PDF:', err);
      setFeedback({
        tipo: 'erro',
        texto: err?.message || 'Falha ao gerar documento PDF.',
      });
      setTimeout(() => {
        setFeedback(null);
      }, 5000);
    } finally {
      setGerando(false);
    }
  };

  // Variações de estilo
  let estiloBase =
    'inline-flex items-center gap-2 rounded-lg font-medium text-sm transition-all focus:outline-none focus:ring-2 focus:ring-rose-500/40 shadow-sm cursor-pointer disabled:cursor-not-allowed disabled:opacity-60';

  if (variant === 'toolbar') {
    estiloBase +=
      ' border border-rose-200 bg-rose-50/90 text-rose-800 hover:bg-rose-100/90 hover:border-rose-300 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200 dark:hover:bg-rose-900/60 px-3.5 py-1.5 text-xs sm:text-sm font-semibold';
  } else if (variant === 'header') {
    estiloBase +=
      ' border border-slate-200 bg-white text-slate-700 hover:bg-rose-50/60 hover:text-rose-700 hover:border-rose-200 dark:border-school-dark-border dark:bg-school-dark-surface dark:text-slate-200 dark:hover:bg-rose-950/30 dark:hover:text-rose-300 px-3.5 py-2';
  } else {
    estiloBase += ' px-2.5 py-1 text-xs border border-rose-300 bg-rose-50 text-rose-700';
  }

  return (
    <div className="relative inline-flex items-center">
      <button
        type="button"
        onClick={handleExportar}
        disabled={gerando}
        className={`${estiloBase} ${className}`}
        title="Exportar calendário com todos os eventos visíveis do mês atual em PDF formatado para impressão A4"
      >
        {gerando ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin text-rose-600 dark:text-rose-400" />
            <span>Gerando PDF...</span>
          </>
        ) : (
          <>
            <PdfIconBadge />
            <span>PDF: eventos do mês</span>
          </>
        )}
      </button>

      {/* Notificação flutuante de feedback transitório */}
      {feedback && (
        <div
          role="status"
          aria-live="polite"
          className={`absolute top-full left-0 mt-1.5 z-30 flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold shadow-md whitespace-nowrap animate-in fade-in slide-in-from-top-1 ${
            feedback.tipo === 'sucesso'
              ? 'bg-emerald-600 text-white'
              : 'bg-rose-600 text-white'
          }`}
        >
          {feedback.tipo === 'sucesso' ? (
            <CheckCircle2 className="h-3.5 w-3.5" />
          ) : (
            <AlertCircle className="h-3.5 w-3.5" />
          )}
          <span>{feedback.texto}</span>
        </div>
      )}
    </div>
  );
}

export default BotaoExportarCalendarioPdf;
