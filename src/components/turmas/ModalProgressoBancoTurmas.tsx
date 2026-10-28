'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Database,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  RefreshCw,
  Loader2,
  X,
  Clock,
  Terminal,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Server,
  Layers,
  GraduationCap,
  Calendar,
  Users,
  Zap,
  ArrowRight
} from 'lucide-react';

export type StatusProgresso = 'idle' | 'loading' | 'success' | 'error';

export interface EtapaAcessoBanco {
  id: string;
  numero: number;
  titulo: string;
  descricao: string;
  status: 'pending' | 'in_progress' | 'completed' | 'error';
  duracaoMs?: number;
}

export interface LogAcessoBanco {
  id: string;
  timestamp: string;
  mensagem: string;
  tipo: 'info' | 'success' | 'warning' | 'error';
}

export interface ResumoAcessoBanco {
  totalTurmas: number;
  turmasAtivas: number;
  turmasInativas: number;
  totalAulasGrade: number;
  totalProfessoresVinculados: number;
  tempoRespostaMs: number;
  timestamp: string;
  fonteBanco: string;
}

export interface ModalProgressoBancoTurmasProps {
  isOpen: boolean;
  onClose: () => void;
  status: StatusProgresso;
  progresso: number;
  etapas: EtapaAcessoBanco[];
  logs: LogAcessoBanco[];
  resumo?: ResumoAcessoBanco | null;
  erro?: string | null;
  onRecarregar: () => void;
}

export function ModalProgressoBancoTurmas({
  isOpen,
  onClose,
  status,
  progresso,
  etapas,
  logs,
  resumo,
  erro,
  onRecarregar,
}: ModalProgressoBancoTurmasProps) {
  const [mostrarLogs, setMostrarLogs] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [autoFechar, setAutoFechar] = useState(true);
  const [tempoRestanteAutoFechar, setTempoRestanteAutoFechar] = useState(4);
  const [autoFecharPausado, setAutoFecharPausado] = useState(false);

  const logsEndRef = useRef<HTMLDivElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Auto-scroll do console de logs para a última mensagem
  useEffect(() => {
    if (mostrarLogs && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, mostrarLogs]);

  // Contagem regressiva para auto-fechamento após sucesso
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (isOpen && status === 'success' && autoFechar && !autoFecharPausado) {
      setTempoRestanteAutoFechar(4);
      timer = setInterval(() => {
        setTempoRestanteAutoFechar((prev) => {
          if (prev <= 1) {
            clearInterval(timer!);
            onCloseRef.current();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setTempoRestanteAutoFechar(4);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isOpen, status, autoFechar, autoFecharPausado]);

  if (!isOpen) return null;

  const handleCopiarLogs = () => {
    const textoLogs = logs
      .map((l) => `[${l.timestamp}] [${l.tipo.toUpperCase()}] ${l.mensagem}`)
      .join('\n');
    navigator.clipboard.writeText(textoLogs);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const getStatusEtapaBadge = (etapa: EtapaAcessoBanco) => {
    switch (etapa.status) {
      case 'completed':
        return (
          <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
            <span className="text-[11px] font-bold">
              {etapa.duracaoMs !== undefined ? `${etapa.duracaoMs}ms` : 'Concluído'}
            </span>
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/80">
              <Check className="h-3 w-3 stroke-[3]" />
            </div>
          </div>
        );
      case 'in_progress':
        return (
          <div className="flex items-center gap-1.5 text-school-blue-600 dark:text-school-blue-400">
            <span className="text-[11px] font-semibold animate-pulse">Processando...</span>
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        );
      case 'error':
        return (
          <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
            <span className="text-[11px] font-bold">Falhou</span>
            <AlertCircle className="h-4 w-4" />
          </div>
        );
      default:
        return (
          <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
            Pendente
          </span>
        );
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={() => setAutoFecharPausado(true)}
    >
      <div
        className="w-full max-w-2xl max-h-[92vh] flex flex-col rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 animate-in zoom-in-95 duration-200 overflow-hidden"
        onClick={(e) => {
          e.stopPropagation();
          setAutoFecharPausado(true);
        }}
      >
        {/* Cabeçalho do Modal */}
        <div className="flex items-start justify-between border-b border-slate-100 p-5 dark:border-slate-800 shrink-0">
          <div className="flex items-start gap-3.5">
            <div
              className={`relative flex h-12 w-12 items-center justify-center rounded-2xl shrink-0 transition-all ${
                status === 'loading'
                  ? 'bg-school-blue-100 text-school-blue-700 dark:bg-school-blue-950/80 dark:text-school-blue-400 shadow-md shadow-school-blue-500/10'
                  : status === 'success'
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-400 shadow-md shadow-emerald-500/10'
                  : status === 'error'
                  ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-400 shadow-md shadow-rose-500/10'
                  : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              <Database className="h-6 w-6" />
              {status === 'loading' && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-school-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-school-blue-600"></span>
                </span>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  <Server className="h-3 w-3 text-school-blue-600 dark:text-school-gold-400" />
                  Turso Cloud (SQLite)
                </span>
                <span className="text-[11px] text-slate-400">•</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/60">
                  <Zap className="h-2.5 w-2.5" />
                  Bypass de Cache Ativo
                </span>
              </div>
              <h3 className="mt-1 text-lg font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                Progresso de Acesso ao Banco de Dados
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Gestão de Turmas & Grade Horária • Sincronização em tempo real
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            type="button"
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
            title="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Corpo com Scroll */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Barra de Progresso Principal */}
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/50 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Status da Operação
                </span>
                <p className="text-sm font-black text-slate-900 dark:text-white mt-0.5">
                  {status === 'loading' && 'Acessando e recuperando registros do banco de dados...'}
                  {status === 'success' && 'Sincronização com o banco concluída com sucesso!'}
                  {status === 'error' && 'Falha na comunicação com o banco de dados.'}
                  {status === 'idle' && 'Aguardando inicialização da consulta...'}
                </p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black text-school-blue-700 dark:text-school-blue-400">
                  {progresso}%
                </span>
              </div>
            </div>

            {/* Trilho da barra de progresso */}
            <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800 p-0.5">
              <div
                className={`h-full rounded-full transition-all duration-300 ease-out ${
                  status === 'error'
                    ? 'bg-rose-500'
                    : status === 'success'
                    ? 'bg-emerald-500'
                    : 'bg-gradient-to-r from-school-blue-600 via-indigo-600 to-school-blue-500'
                }`}
                style={{ width: `${Math.max(5, Math.min(100, progresso))}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                {status === 'loading'
                  ? 'Consultando tabelas turmas e grade_horaria...'
                  : status === 'success'
                  ? 'Todos os registros foram atualizados e normalizados.'
                  : status === 'error'
                  ? 'A consulta não pôde ser finalizada.'
                  : 'Pronto para conectar'}
              </span>
              <span>
                {etapas.filter((e) => e.status === 'completed').length} de {etapas.length} etapas concluídas
              </span>
            </div>
          </div>

          {/* Lista de Etapas do Acesso */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-1">
              Etapas da Sincronização
            </h4>

            <div className="space-y-2">
              {etapas.map((etapa) => {
                const isCompleted = etapa.status === 'completed';
                const isInProgress = etapa.status === 'in_progress';
                const isError = etapa.status === 'error';

                return (
                  <div
                    key={etapa.id}
                    className={`flex items-center justify-between gap-3 p-3 rounded-2xl border transition-all ${
                      isCompleted
                        ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/40 dark:bg-emerald-950/20'
                        : isInProgress
                        ? 'border-school-blue-300 bg-school-blue-50/70 dark:border-school-blue-800/60 dark:bg-school-blue-950/30 shadow-xs'
                        : isError
                        ? 'border-rose-300 bg-rose-50/70 dark:border-rose-900/60 dark:bg-rose-950/30'
                        : 'border-slate-200/70 bg-white dark:border-slate-800 dark:bg-slate-900/40 opacity-70'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`flex h-7 w-7 items-center justify-center rounded-xl text-xs font-bold shrink-0 ${
                          isCompleted
                            ? 'bg-emerald-500 text-white'
                            : isInProgress
                            ? 'bg-school-blue-600 text-white animate-pulse'
                            : isError
                            ? 'bg-rose-500 text-white'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        }`}
                      >
                        {isCompleted ? (
                          <Check className="h-4 w-4 stroke-[3]" />
                        ) : isInProgress ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : isError ? (
                          <X className="h-4 w-4 stroke-[3]" />
                        ) : (
                          etapa.numero
                        )}
                      </div>

                      <div className="min-w-0">
                        <p className={`text-xs font-bold truncate ${
                          isCompleted
                            ? 'text-emerald-950 dark:text-emerald-200'
                            : isInProgress
                            ? 'text-school-blue-950 dark:text-school-blue-200 font-extrabold'
                            : isError
                            ? 'text-rose-950 dark:text-rose-200'
                            : 'text-slate-700 dark:text-slate-300'
                        }`}>
                          {etapa.titulo}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          {etapa.descricao}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0">{getStatusEtapaBadge(etapa)}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Resumo dos Dados Carregados (quando disponível ou concluído) */}
          {resumo && status === 'success' && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/30 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-emerald-200/70 pb-2.5 dark:border-emerald-900/50">
                <span className="text-xs font-bold text-emerald-950 dark:text-emerald-200 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  Métricas de Dados Sincronizados
                </span>
                <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                  {resumo.timestamp}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="rounded-xl bg-white/80 p-3 dark:bg-slate-900/80 border border-emerald-100 dark:border-emerald-900/40">
                  <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase">
                    <GraduationCap className="h-3 w-3 text-school-blue-600 dark:text-school-gold-400" />
                    Turmas
                  </div>
                  <p className="text-lg font-black text-slate-900 dark:text-white mt-1">
                    {resumo.totalTurmas}
                  </p>
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                    {resumo.turmasAtivas} ativas • {resumo.turmasInativas} inativas
                  </p>
                </div>

                <div className="rounded-xl bg-white/80 p-3 dark:bg-slate-900/80 border border-emerald-100 dark:border-emerald-900/40">
                  <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase">
                    <Calendar className="h-3 w-3 text-school-blue-600 dark:text-school-gold-400" />
                    Grade Horária
                  </div>
                  <p className="text-lg font-black text-slate-900 dark:text-white mt-1">
                    {resumo.totalAulasGrade}
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    Aulas mapeadas
                  </p>
                </div>

                <div className="rounded-xl bg-white/80 p-3 dark:bg-slate-900/80 border border-emerald-100 dark:border-emerald-900/40">
                  <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase">
                    <Users className="h-3 w-3 text-school-blue-600 dark:text-school-gold-400" />
                    Professores
                  </div>
                  <p className="text-lg font-black text-slate-900 dark:text-white mt-1">
                    {resumo.totalProfessoresVinculados}
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    Regência e apoio
                  </p>
                </div>

                <div className="rounded-xl bg-white/80 p-3 dark:bg-slate-900/80 border border-emerald-100 dark:border-emerald-900/40">
                  <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase">
                    <Zap className="h-3 w-3 text-amber-500" />
                    Latência
                  </div>
                  <p className="text-lg font-black text-slate-900 dark:text-white mt-1">
                    {resumo.tempoRespostaMs}ms
                  </p>
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                    Excelente
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Alerta de Erro (se houver) */}
          {erro && status === 'error' && (
            <div className="rounded-2xl border border-rose-300 bg-rose-50 p-4 text-xs text-rose-900 dark:border-rose-900/70 dark:bg-rose-950/40 dark:text-rose-200 shadow-xs space-y-3">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-rose-950 dark:text-rose-100">
                    Não foi possível concluir o acesso ao banco de dados
                  </p>
                  <p className="text-[11px] text-rose-800 dark:text-rose-300 mt-0.5">
                    {erro}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1 border-t border-rose-200 dark:border-rose-900/50">
                <button
                  type="button"
                  onClick={onRecarregar}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-700 transition-colors shadow-xs"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Tentar Novamente</span>
                </button>
              </div>
            </div>
          )}

          {/* Acordeão de Logs Técnicos do Banco */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/40 overflow-hidden">
            <button
              type="button"
              onClick={() => setMostrarLogs(!mostrarLogs)}
              className="w-full flex items-center justify-between p-3.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100/60 dark:hover:bg-slate-800/60 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Terminal className="h-4 w-4 text-slate-500" />
                <span>Logs Detalhados da Conexão ({logs.length} eventos)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-400 font-normal">
                  {mostrarLogs ? 'Ocultar' : 'Visualizar'}
                </span>
                {mostrarLogs ? (
                  <ChevronUp className="h-4 w-4 text-slate-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                )}
              </div>
            </button>

            {mostrarLogs && (
              <div className="border-t border-slate-200 dark:border-slate-800 bg-slate-950 p-3 space-y-2">
                <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">
                    Terminal de Acesso Turso Cloud
                  </span>
                  <button
                    type="button"
                    onClick={handleCopiarLogs}
                    className="inline-flex items-center gap-1 text-[10px] text-slate-400 hover:text-white transition-colors py-0.5 px-1.5 rounded bg-slate-800"
                  >
                    {copiado ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-400" />
                        <span className="text-emerald-400">Copiado</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        <span>Copiar Logs</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="font-mono text-[11px] text-slate-300 space-y-1 max-h-40 overflow-y-auto pr-1">
                  {logs.map((log) => {
                    const corTipo =
                      log.tipo === 'success'
                        ? 'text-emerald-400'
                        : log.tipo === 'error'
                        ? 'text-rose-400 font-bold'
                        : log.tipo === 'warning'
                        ? 'text-amber-400'
                        : 'text-cyan-400';

                    return (
                      <div key={log.id} className="leading-tight flex items-start gap-1.5">
                        <span className="text-slate-500 shrink-0">[{log.timestamp}]</span>
                        <span className={`shrink-0 ${corTipo}`}>
                          [{log.tipo.toUpperCase()}]
                        </span>
                        <span className="text-slate-200 break-words">{log.mensagem}</span>
                      </div>
                    );
                  })}
                  <div ref={logsEndRef} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Rodapé do Modal */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-100 p-4 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/60 shrink-0">
          <div className="flex items-center gap-2">
            {status === 'success' && autoFechar && (
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                {autoFecharPausado ? (
                  <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                    Auto-fechamento pausado.
                  </span>
                ) : (
                  <>
                    <span className="text-[11px]">
                      Fechando em <strong className="text-slate-800 dark:text-slate-200">{tempoRestanteAutoFechar}s</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => setAutoFecharPausado(true)}
                      className="text-[11px] font-bold text-school-blue-600 hover:underline dark:text-school-blue-400"
                    >
                      Pausar
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2">
            {status === 'loading' ? (
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
              >
                Minimizar em 2º Plano
              </button>
            ) : status === 'error' ? (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
                >
                  Fechar
                </button>
                <button
                  type="button"
                  onClick={onRecarregar}
                  className="inline-flex items-center gap-2 rounded-xl bg-school-blue-800 px-4 py-2 text-xs font-bold text-white hover:bg-school-blue-700 shadow-md transition-colors dark:bg-school-blue-600"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Tentar Novamente</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onRecarregar}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
                >
                  <RefreshCw className="h-3.5 w-3.5 text-school-blue-600 dark:text-school-gold-400" />
                  <span>Sincronizar Novamente</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-school-blue-800 px-4 py-2 text-xs font-bold text-white hover:bg-school-blue-700 shadow-md shadow-school-blue-800/20 transition-colors dark:bg-school-blue-600"
                >
                  <Check className="h-4 w-4" />
                  <span>Concluir e Fechar</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
