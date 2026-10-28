'use client';

import React, { useEffect, useState } from 'react';
import {
  Database,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Loader2,
  RefreshCw,
  ExternalLink,
  Calendar,
  User,
  Clock,
  FileText,
  Check,
  X,
  ShieldCheck,
  CloudUpload
} from 'lucide-react';

export type StatusGravacaoAusencia = 'idle' | 'gravando' | 'sucesso' | 'erro';

export interface ResumoAusenciaGravada {
  professorNome: string;
  tipoRegistro: 'DATA_UNICA' | 'PERIODO';
  periodoFormatado: string;
  aulasTotaisDevidas: number;
  motivo: string;
  temAtestado: boolean;
  linkDrive?: string;
}

export interface OverlayGravacaoAusenciaProps {
  status: StatusGravacaoAusencia;
  etapaAtual?: 'validando' | 'drive' | 'banco';
  mensagemProgresso: string;
  resumo?: ResumoAusenciaGravada | null;
  erro?: string | null;
  onConcluir: () => void;
  onTentarNovamente?: () => void;
  onFecharErro: () => void;
}

export function OverlayGravacaoAusencia({
  status,
  etapaAtual = 'banco',
  mensagemProgresso,
  resumo,
  erro,
  onConcluir,
  onTentarNovamente,
  onFecharErro,
}: OverlayGravacaoAusenciaProps) {
  const [tempoRestanteAutoFechar, setTempoRestanteAutoFechar] = useState(5);
  const [autoFecharPausado, setAutoFecharPausado] = useState(false);

  // Bloqueio do scroll global da página enquanto o overlay estiver ativo
  useEffect(() => {
    if (status !== 'idle') {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [status]);

  // Bloqueio de teclas de saída/atalhos durante a gravação
  useEffect(() => {
    if (status === 'idle') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (status === 'gravando') {
        // Bloqueia qualquer tentativa de fechar ou enviar formulário por atalho
        e.preventDefault();
        e.stopPropagation();
      } else if (e.key === 'Escape') {
        if (status === 'sucesso') {
          onConcluir();
        } else if (status === 'erro') {
          onFecharErro();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [status, onConcluir, onFecharErro]);

  // Contagem regressiva suave para auto-fechar em caso de sucesso
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    if (status === 'sucesso' && !autoFecharPausado) {
      setTempoRestanteAutoFechar(5);
      timer = setInterval(() => {
        setTempoRestanteAutoFechar((prev) => {
          if (prev <= 1) {
            if (timer) clearInterval(timer);
            onConcluir();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [status, autoFecharPausado, onConcluir]);

  if (status === 'idle') return null;

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 animate-in fade-in-0 duration-200 select-none"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-700/80 shadow-2xl p-6 sm:p-7 text-white overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Glow decorativo de fundo */}
        <div 
          className={`absolute -top-24 -left-24 w-60 h-60 rounded-full blur-3xl opacity-20 pointer-events-none ${
            status === 'gravando' ? 'bg-blue-500' :
            status === 'sucesso' ? 'bg-emerald-500' :
            'bg-rose-500'
          }`} 
        />
        <div 
          className={`absolute -bottom-24 -right-24 w-60 h-60 rounded-full blur-3xl opacity-20 pointer-events-none ${
            status === 'gravando' ? 'bg-indigo-500' :
            status === 'sucesso' ? 'bg-teal-500' :
            'bg-amber-500'
          }`} 
        />

        {/* ------------------------------------------------------------- */}
        {/* ESTADO 1: GRAVANDO / PROCESSANDO                             */}
        {/* ------------------------------------------------------------- */}
        {status === 'gravando' && (
          <div className="relative z-10 flex flex-col items-center text-center space-y-5">
            {/* Ícone Animado de Banco de Dados com Pulso */}
            <div className="relative flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-blue-500/20 animate-ping opacity-75" />
              <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-xl shadow-blue-500/30 border border-blue-400/40">
                <Database className="h-10 w-10 animate-pulse" />
                <div className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-amber-500 text-slate-950 border-2 border-slate-900 shadow-md">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              </div>
            </div>

            {/* Cabeçalho */}
            <div className="space-y-1.5">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-950/80 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-blue-300 border border-blue-800">
                <span className="h-2 w-2 rounded-full bg-blue-400 animate-ping" />
                <span>Processando Informações</span>
              </span>
              <h3 className="text-xl font-black text-white tracking-tight">
                Gravando Informações no Banco
              </h3>
              <p className="text-xs text-slate-300 max-w-sm font-medium leading-relaxed">
                Por favor, aguarde. A tela está bloqueada para garantir a gravação consistente de todos os dados.
              </p>
            </div>

            {/* Etapas Visuais do Processamento */}
            <div className="w-full rounded-2xl bg-slate-950/60 border border-slate-800 p-3.5 space-y-2.5 text-left text-xs">
              {/* Etapa 1: Validação */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 text-slate-200">
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shrink-0">
                    <Check className="h-3 w-3" />
                  </div>
                  <span className="font-semibold text-slate-300 text-[11px]">Validação dos dados e grade horária</span>
                </div>
                <span className="text-[10px] font-bold text-emerald-400 uppercase">Concluído</span>
              </div>

              {/* Etapa 2: Google Drive */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 text-slate-200">
                  <div className={`flex h-5 w-5 items-center justify-center rounded-full shrink-0 ${
                    etapaAtual === 'drive'
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                      : etapaAtual === 'banco'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : 'bg-slate-800 text-slate-500'
                  }`}>
                    {etapaAtual === 'drive' ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Check className="h-3 w-3" />
                    )}
                  </div>
                  <span className="font-semibold text-slate-300 text-[11px]">Sincronização com Google Drive</span>
                </div>
                <span className={`text-[10px] font-bold uppercase ${
                  etapaAtual === 'drive' ? 'text-amber-400 animate-pulse' : 'text-emerald-400'
                }`}>
                  {etapaAtual === 'drive' ? 'Enviando...' : 'Pronto'}
                </span>
              </div>

              {/* Etapa 3: Turso Database */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 text-slate-200">
                  <div className={`flex h-5 w-5 items-center justify-center rounded-full shrink-0 ${
                    etapaAtual === 'banco'
                      ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                      : 'bg-slate-800 text-slate-500'
                  }`}>
                    {etapaAtual === 'banco' ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Database className="h-3 w-3" />
                    )}
                  </div>
                  <span className="font-semibold text-slate-300 text-[11px]">Gravação na tabela de ausências (Turso)</span>
                </div>
                <span className={`text-[10px] font-bold uppercase ${
                  etapaAtual === 'banco' ? 'text-blue-400 animate-pulse' : 'text-slate-500'
                }`}>
                  {etapaAtual === 'banco' ? 'Gravando...' : 'Aguardando'}
                </span>
              </div>
            </div>

            {/* Mensagem dinâmica com barra pulsante */}
            <div className="w-full space-y-2">
              <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-indigo-500 to-amber-500 animate-pulse rounded-full" />
              </div>
              <p className="text-[11px] font-bold text-amber-300 animate-pulse">
                {mensagemProgresso || 'Gravando registro de ausência no sistema...'}
              </p>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* ESTADO 2: SUCESSO                                             */}
        {/* ------------------------------------------------------------- */}
        {status === 'sucesso' && (
          <div className="relative z-10 flex flex-col items-center text-center space-y-5 animate-in fade-in-50 duration-200">
            {/* Ícone de Sucesso */}
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-xl shadow-emerald-500/30 border-2 border-emerald-400/50">
              <CheckCircle2 className="h-10 w-10 animate-in zoom-in-50 duration-300" />
            </div>

            {/* Cabeçalho */}
            <div className="space-y-1.5">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-950/80 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-emerald-300 border border-emerald-700 shadow-xs">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Gravação Concluída com Sucesso</span>
              </span>
              <h3 className="text-xl font-black text-white tracking-tight">
                Ausência Gravada no Banco de Dados!
              </h3>
              <p className="text-xs text-slate-300 max-w-sm font-medium leading-relaxed">
                O registro foi gravado na base de dados e a grade horária ativa foi atualizada com sucesso.
              </p>
            </div>

            {/* Card com Detalhamento do que foi Gravado */}
            {resumo && (
              <div className="w-full rounded-2xl bg-slate-950/80 border border-emerald-900/50 p-4 space-y-2.5 text-left text-xs">
                <div className="flex items-start justify-between border-b border-slate-800 pb-2">
                  <div className="text-[11px] text-slate-400 font-semibold flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                    <span>Docente:</span>
                  </div>
                  <strong className="text-white uppercase font-bold text-[11px] text-right">
                    {resumo.professorNome}
                  </strong>
                </div>

                <div className="flex items-start justify-between border-b border-slate-800 pb-2">
                  <div className="text-[11px] text-slate-400 font-semibold flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                    <span>Período:</span>
                  </div>
                  <span className="font-mono font-bold text-slate-200 text-right text-[11px]">
                    {resumo.periodoFormatado}
                  </span>
                </div>

                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="text-[11px] text-slate-400 font-semibold flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                    <span>Aulas Computadas:</span>
                  </div>
                  <span className="font-mono font-black text-amber-300 bg-amber-950/60 border border-amber-800/80 px-2 py-0.5 rounded-lg text-xs">
                    {resumo.aulasTotaisDevidas} aula(s)
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-[11px] text-slate-400 font-semibold flex items-center gap-1.5">
                    <Database className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                    <span>Banco de Dados:</span>
                  </div>
                  <span className="font-bold text-emerald-400 flex items-center gap-1 text-[11px]">
                    <Check className="h-3.5 w-3.5" />
                    <span>Turso Cloud (Sincronizado)</span>
                  </span>
                </div>

                {resumo.temAtestado && resumo.linkDrive && (
                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 font-semibold flex items-center gap-1.5">
                      <CloudUpload className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                      <span>Google Drive:</span>
                    </span>
                    <a
                      href={resumo.linkDrive}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-400 hover:text-blue-300 underline"
                    >
                      <span>Ver Atestado</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
              </div>
            )}

            {/* Ações */}
            <div className="w-full space-y-2 pt-1">
              <button
                type="button"
                onClick={onConcluir}
                className="w-full py-3 px-4 rounded-xl font-black text-xs uppercase tracking-wider bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Check className="h-4 w-4" />
                <span>Concluir e Fechar</span>
              </button>

              <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400 font-medium">
                <span>Fechamento automático em {tempoRestanteAutoFechar}s</span>
                <button
                  type="button"
                  onClick={() => setAutoFecharPausado(true)}
                  className="text-xs text-slate-300 hover:text-white underline cursor-pointer"
                >
                  {autoFecharPausado ? '(Pausado)' : '(Pausar)'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* ESTADO 3: ERRO / FALHA                                        */}
        {/* ------------------------------------------------------------- */}
        {status === 'erro' && (
          <div className="relative z-10 flex flex-col items-center text-center space-y-5 animate-in fade-in-50 duration-200">
            {/* Ícone de Erro */}
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-rose-600 to-red-700 text-white shadow-xl shadow-rose-500/30 border-2 border-rose-400/50">
              <AlertTriangle className="h-10 w-10 animate-bounce" />
            </div>

            {/* Cabeçalho */}
            <div className="space-y-1.5">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-950/80 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-rose-300 border border-rose-700 shadow-xs">
                <AlertCircle className="h-3.5 w-3.5" />
                <span>Falha no Registro</span>
              </span>
              <h3 className="text-xl font-black text-white tracking-tight">
                Falha ao Gravar no Banco de Dados
              </h3>
              <p className="text-xs text-slate-300 max-w-sm font-medium leading-relaxed">
                Não foi possível concluir a gravação da ausência no banco de dados. Os dados preenchidos foram preservados.
              </p>
            </div>

            {/* Mensagem do Erro */}
            <div className="w-full rounded-2xl bg-rose-950/40 border border-rose-800/80 p-4 text-left text-xs space-y-1.5 text-rose-200">
              <div className="font-bold text-rose-300 uppercase text-[10px] tracking-wider flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                <span>Motivo da Falha:</span>
              </div>
              <div className="font-mono text-[11px] leading-relaxed break-words bg-rose-950/80 p-2.5 rounded-xl border border-rose-900 text-rose-100">
                {erro || 'Erro de comunicação ao persistir dados no Turso Database.'}
              </div>
            </div>

            {/* Ações */}
            <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={onFecharErro}
                className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <X className="h-4 w-4" />
                <span>Voltar ao Formulário</span>
              </button>

              {onTentarNovamente && (
                <button
                  type="button"
                  onClick={onTentarNovamente}
                  className="w-full py-2.5 px-4 rounded-xl font-black text-xs uppercase tracking-wider bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/30 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span>Tentar Novamente</span>
                </button>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
