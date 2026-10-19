'use client';

import React, { useState, useMemo } from 'react';
import {
  FileText,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
  Eye,
  EyeOff,
  Lock,
} from 'lucide-react';
import { EventoEscolar, CalendarioCategoria, EscolaConfig } from '@/lib/types';
import { gerarCalendarioMensalPdf, resolverCategoriaInfo } from '@/lib/calendario-pdf';

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
  const [modalPerguntaAberto, setModalPerguntaAberto] = useState(false);
  const [feedback, setFeedback] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);

  // Identifica categorias restritas à gestão (visivel_docentes === false)
  const categoriasRestritas = useMemo(() => {
    return categorias.filter((c) => c.visivel_docentes === false);
  }, [categorias]);

  // Ao clicar no botão, abre o modal de confirmação
  const handleAbrirModal = () => {
    if (gerando) return;
    setModalPerguntaAberto(true);
  };

  // Executa a exportação de acordo com a escolha do usuário
  const handleConfirmarExportacao = async (incluirRestritasGestao: boolean) => {
    setModalPerguntaAberto(false);
    if (gerando) return;

    try {
      setGerando(true);
      setFeedback(null);

      const ano = dataAtual.getFullYear();
      const mes = dataAtual.getMonth(); // 0..11

      // Filtragem de eventos e categorias segundo a opção selecionada
      let eventosParaExportar = eventos;
      let categoriasParaExportar = categorias;

      if (!incluirRestritasGestao) {
        eventosParaExportar = eventos.filter((ev) => {
          const cat = resolverCategoriaInfo(ev.categoria, categorias);
          return cat.visivel_docentes !== false;
        });
        categoriasParaExportar = categorias.filter((c) => c.visivel_docentes !== false);
      }

      const resultado = await gerarCalendarioMensalPdf({
        eventos: eventosParaExportar,
        categorias: categoriasParaExportar,
        ano,
        mes,
        escolaConfig,
        categoriaFiltroNome,
      });

      if (!resultado.success) {
        throw new Error(resultado.error || 'Erro desconhecido ao gerar o PDF.');
      }

      const detalhe = incluirRestritasGestao
        ? ' (com categorias da gestão)'
        : ' (apenas eventos públicos)';

      setFeedback({
        tipo: 'sucesso',
        texto: `PDF gerado com sucesso! (${resultado.totalEventos} evento(s)${detalhe})`,
      });

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
    <>
      <div className="relative inline-flex items-center">
        <button
          type="button"
          onClick={handleAbrirModal}
          disabled={gerando}
          className={`${estiloBase} ${className}`}
          title="Exportar calendário com todos os eventos do mês em PDF formatado para impressão A4"
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

      {/* Modal de Escolha: Exportar Categorias Restritas à Gestão */}
      {modalPerguntaAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 animate-in zoom-in-95">
            {/* Cabeçalho do Modal */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-3.5 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Exportar Calendário em PDF
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Controle de privacidade e categorias do documento
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalPerguntaAberto(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Conteúdo / Pergunta */}
            <div className="mt-4 space-y-3.5">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Deseja incluir as categorias restritas à gestão no PDF?
              </p>

              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Categorias restritas são de visualização exclusiva da direção e coordenação
                (como aniversários de funcionários ou compromissos administrativos). Selecione como deseja gerar o arquivo:
              </p>

              {categoriasRestritas.length > 0 && (
                <div className="rounded-xl border border-amber-200/80 bg-amber-50/70 p-3 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
                  <span className="font-bold flex items-center gap-1 mb-1.5 text-amber-800 dark:text-amber-300">
                    <EyeOff className="h-3.5 w-3.5" /> Categorias restritas à gestão identificadas:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {categoriasRestritas.map((cat) => (
                      <span
                        key={cat.id}
                        className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-700 shadow-2xs border border-amber-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
                      >
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: cat.cor_hex }}
                        />
                        {cat.nome}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Opções de Ação */}
              <div className="space-y-2.5 pt-1">
                {/* Opção 1: Sem categorias restritas */}
                <button
                  type="button"
                  onClick={() => handleConfirmarExportacao(false)}
                  className="w-full flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/80 p-3 text-left transition hover:bg-slate-100 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/60 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                      <Eye className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">
                        Não, exportar apenas eventos públicos
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Oculta categorias restritas (ideal para professores e alunos)
                      </p>
                    </div>
                  </div>
                </button>

                {/* Opção 2: Incluir categorias restritas */}
                <button
                  type="button"
                  onClick={() => handleConfirmarExportacao(true)}
                  className="w-full flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50/70 p-3 text-left transition hover:bg-rose-100/80 hover:border-rose-300 dark:border-rose-900/50 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300">
                      <Lock className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-rose-950 dark:text-rose-200">
                        Sim, incluir categorias da gestão
                      </p>
                      <p className="text-[11px] text-rose-700/80 dark:text-rose-400">
                        Inclui todos os eventos (uso exclusivo da direção/coordenação)
                      </p>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Rodapé do Modal */}
            <div className="mt-5 flex items-center justify-end border-t border-slate-100 pt-3 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setModalPerguntaAberto(false)}
                className="rounded-lg border border-slate-200 px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default BotaoExportarCalendarioPdf;
