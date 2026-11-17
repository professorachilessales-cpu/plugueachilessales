'use client';

import React, { useEffect, useState } from 'react';
import { Database, Loader2, Sparkles, Lock, GraduationCap, Users, Calendar, Award, Check } from 'lucide-react';

export interface ModalCarregandoBancoProps {
  mensagem?: string;
  subtitulo?: string;
  status?: string;
  progresso?: number;
}

const ETAPAS_CARREGAMENTO = [
  { id: 'conexao', status: 'Conectando ao banco de dados Turso Cloud...', progresso: 18 },
  { id: 'turmas', status: 'Sincronizando turmas e séries...', progresso: 40 },
  { id: 'estudantes', status: 'Carregando estudantes, fichas e laudos...', progresso: 65 },
  { id: 'professores', status: 'Sincronizando professores e frequências...', progresso: 85 },
  { id: 'calendario', status: 'Carregando calendário e eventos escolares...', progresso: 95 },
  { id: 'finalizacao', status: 'Finalizando sincronização com o banco...', progresso: 98 },
];

export function ModalCarregandoBanco({
  mensagem = 'Carregando Banco de Dados',
  subtitulo = 'Aguarde enquanto os dados escolares, turmas, estudantes e frequências são carregados e sincronizados diretamente com o banco de dados.',
  status: statusProp,
  progresso: progressoProp,
}: ModalCarregandoBancoProps) {
  const [progressoInterno, setProgressoInterno] = useState<number>(10);
  const [etapaIndex, setEtapaIndex] = useState<number>(0);

  // 1. Bloqueia o scroll global da página enquanto o modal estiver aberto
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  // 2. Bloqueia eventos de teclado e atalhos na tela travada
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, []);

  // 3. Simulação suave de progressão e etapas caso props não sejam fornecidas diretamente
  useEffect(() => {
    if (progressoProp !== undefined) return;

    const intervalo = setInterval(() => {
      setProgressoInterno((prev) => {
        if (prev >= 98) return 98;
        const incremento = prev < 50 ? 4 : prev < 85 ? 3 : 1;
        const proximo = Math.min(98, prev + incremento);

        const novoIndex = ETAPAS_CARREGAMENTO.findIndex((e) => proximo <= e.progresso);
        if (novoIndex !== -1) {
          setEtapaIndex(novoIndex);
        } else {
          setEtapaIndex(ETAPAS_CARREGAMENTO.length - 1);
        }

        return proximo;
      });
    }, 180);

    return () => {
      clearInterval(intervalo);
    };
  }, [progressoProp]);

  const progressoFinal = progressoProp !== undefined ? progressoProp : progressoInterno;
  const statusFinal = statusProp || ETAPAS_CARREGAMENTO[etapaIndex]?.status || 'Sincronizando dados com o banco...';

  // Helpers de estado para os cards de entidades
  const getCardStatus = (tipo: 'turmas' | 'estudantes' | 'professores' | 'calendario') => {
    switch (tipo) {
      case 'turmas':
        if (progressoFinal >= 40) return 'completed';
        if (progressoFinal >= 15) return 'loading';
        return 'pending';
      case 'estudantes':
        if (progressoFinal >= 65) return 'completed';
        if (progressoFinal >= 40) return 'loading';
        return 'pending';
      case 'professores':
        if (progressoFinal >= 85) return 'completed';
        if (progressoFinal >= 65) return 'loading';
        return 'pending';
      case 'calendario':
        if (progressoFinal >= 95) return 'completed';
        if (progressoFinal >= 85) return 'loading';
        return 'pending';
    }
  };

  const turmasStatus = getCardStatus('turmas');
  const estudantesStatus = getCardStatus('estudantes');
  const professoresStatus = getCardStatus('professores');
  const calendarioStatus = getCardStatus('calendario');

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/80 dark:bg-slate-950/90 backdrop-blur-md p-4 select-none animate-in fade-in duration-200"
      aria-modal="true"
      role="dialog"
      aria-labelledby="titulo-carregando-banco"
    >
      {/* Container Central do Modal */}
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white dark:bg-slate-900 border border-school-blue-200/80 dark:border-school-blue-900/60 shadow-2xl p-6 sm:p-8 text-center animate-in zoom-in-95 duration-300">
        
        {/* Efeitos Decorativos de Fundo */}
        <div className="absolute -top-24 -left-24 h-48 w-48 rounded-full bg-school-blue-500/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 h-48 w-48 rounded-full bg-indigo-500/15 blur-3xl pointer-events-none" />

        {/* Ícone Central em Destaque 3D */}
        <div className="relative mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-school-blue-600 via-indigo-600 to-indigo-800 text-white shadow-xl shadow-school-blue-600/30">
          <Database className="h-9 w-9 text-white animate-pulse" />
          
          {/* Anel giratório externo */}
          <div className="absolute inset-0 rounded-2xl border-2 border-dashed border-white/40 animate-spin" style={{ animationDuration: '6s' }} />
          
          {/* Badge de Sincronização Ativa */}
          <div className="absolute -top-1.5 -right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white shadow-md">
            <Sparkles className="h-3.5 w-3.5" />
          </div>
        </div>

        {/* Título Principal */}
        <h3 id="titulo-carregando-banco" className="text-xl font-black tracking-tight text-slate-900 dark:text-white flex items-center justify-center gap-2">
          <span>{mensagem}</span>
        </h3>

        {/* Descrição / Subtítulo */}
        <p className="mt-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-sm mx-auto">
          {subtitulo}
        </p>

        {/* Indicadores de Entidades Sincronizadas */}
        <div className="mt-5 grid grid-cols-2 gap-2 text-left">
          {/* Card Turmas */}
          <div className={`flex items-center justify-between gap-2 rounded-xl p-2.5 border transition-all ${
            turmasStatus === 'completed'
              ? 'bg-emerald-50/70 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900/50'
              : turmasStatus === 'loading'
              ? 'bg-school-blue-50/80 border-school-blue-300 dark:bg-school-blue-950/40 dark:border-school-blue-800 ring-1 ring-school-blue-400/30'
              : 'bg-slate-50 dark:bg-slate-800/60 border-slate-100 dark:border-slate-700/50 opacity-70'
          }`}>
            <div className="flex items-center gap-2 min-w-0">
              <GraduationCap className={`h-4 w-4 shrink-0 ${
                turmasStatus === 'completed' ? 'text-emerald-600 dark:text-emerald-400' : 'text-school-blue-600 dark:text-school-blue-400'
              }`} />
              <div className="min-w-0">
                <span className="block text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate">Turmas</span>
                <span className="block text-[9px] text-slate-400 truncate">Matrículas & Séries</span>
              </div>
            </div>
            <div className="shrink-0">
              {turmasStatus === 'completed' ? (
                <div className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-white">
                  <Check className="h-2.5 w-2.5 stroke-[3]" />
                </div>
              ) : turmasStatus === 'loading' ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-school-blue-600 dark:text-school-blue-400" />
              ) : null}
            </div>
          </div>

          {/* Card Estudantes */}
          <div className={`flex items-center justify-between gap-2 rounded-xl p-2.5 border transition-all ${
            estudantesStatus === 'completed'
              ? 'bg-emerald-50/70 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900/50'
              : estudantesStatus === 'loading'
              ? 'bg-indigo-50/80 border-indigo-300 dark:bg-indigo-950/40 dark:border-indigo-800 ring-1 ring-indigo-400/30'
              : 'bg-slate-50 dark:bg-slate-800/60 border-slate-100 dark:border-slate-700/50 opacity-70'
          }`}>
            <div className="flex items-center gap-2 min-w-0">
              <Users className={`h-4 w-4 shrink-0 ${
                estudantesStatus === 'completed' ? 'text-emerald-600 dark:text-emerald-400' : 'text-indigo-600 dark:text-indigo-400'
              }`} />
              <div className="min-w-0">
                <span className="block text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate">Estudantes</span>
                <span className="block text-[9px] text-slate-400 truncate">Fichas & Contatos</span>
              </div>
            </div>
            <div className="shrink-0">
              {estudantesStatus === 'completed' ? (
                <div className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-white">
                  <Check className="h-2.5 w-2.5 stroke-[3]" />
                </div>
              ) : estudantesStatus === 'loading' ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-600 dark:text-indigo-400" />
              ) : null}
            </div>
          </div>

          {/* Card Professores */}
          <div className={`flex items-center justify-between gap-2 rounded-xl p-2.5 border transition-all ${
            professoresStatus === 'completed'
              ? 'bg-emerald-50/70 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900/50'
              : professoresStatus === 'loading'
              ? 'bg-amber-50/80 border-amber-300 dark:bg-amber-950/40 dark:border-amber-800 ring-1 ring-amber-400/30'
              : 'bg-slate-50 dark:bg-slate-800/60 border-slate-100 dark:border-slate-700/50 opacity-70'
          }`}>
            <div className="flex items-center gap-2 min-w-0">
              <Award className={`h-4 w-4 shrink-0 ${
                professoresStatus === 'completed' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
              }`} />
              <div className="min-w-0">
                <span className="block text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate">Professores</span>
                <span className="block text-[9px] text-slate-400 truncate">Quadro & Ausências</span>
              </div>
            </div>
            <div className="shrink-0">
              {professoresStatus === 'completed' ? (
                <div className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-white">
                  <Check className="h-2.5 w-2.5 stroke-[3]" />
                </div>
              ) : professoresStatus === 'loading' ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-600 dark:text-amber-400" />
              ) : null}
            </div>
          </div>

          {/* Card Calendário */}
          <div className={`flex items-center justify-between gap-2 rounded-xl p-2.5 border transition-all ${
            calendarioStatus === 'completed'
              ? 'bg-emerald-50/70 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900/50'
              : calendarioStatus === 'loading'
              ? 'bg-purple-50/80 border-purple-300 dark:bg-purple-950/40 dark:border-purple-800 ring-1 ring-purple-400/30'
              : 'bg-slate-50 dark:bg-slate-800/60 border-slate-100 dark:border-slate-700/50 opacity-70'
          }`}>
            <div className="flex items-center gap-2 min-w-0">
              <Calendar className={`h-4 w-4 shrink-0 ${
                calendarioStatus === 'completed' ? 'text-emerald-600 dark:text-emerald-400' : 'text-purple-600 dark:text-purple-400'
              }`} />
              <div className="min-w-0">
                <span className="block text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate">Calendário</span>
                <span className="block text-[9px] text-slate-400 truncate">Eventos Escolares</span>
              </div>
            </div>
            <div className="shrink-0">
              {calendarioStatus === 'completed' ? (
                <div className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-white">
                  <Check className="h-2.5 w-2.5 stroke-[3]" />
                </div>
              ) : calendarioStatus === 'loading' ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-purple-600 dark:text-purple-400" />
              ) : null}
            </div>
          </div>
        </div>

        {/* Rodapé: Exibição do Status e Barra de Progressão no Final do Modal */}
        <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
          {/* Status Atual e Percentual */}
          <div className="flex items-center justify-between gap-3 text-left">
            <div className="flex items-center gap-2 min-w-0">
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-school-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-school-blue-600 dark:bg-school-blue-400"></span>
              </span>
              <div className="min-w-0">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Status
                </span>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate" title={statusFinal}>
                  {statusFinal}
                </p>
              </div>
            </div>

            <div className="text-right shrink-0">
              <span className="inline-flex items-center justify-center rounded-lg bg-school-blue-50 dark:bg-school-blue-950/60 px-2.5 py-0.5 text-xs font-black text-school-blue-700 dark:text-school-gold-400 border border-school-blue-100 dark:border-school-blue-900/50 tabular-nums shadow-xs">
                {Math.round(progressoFinal)}%
              </span>
            </div>
          </div>

          {/* Barra de Progressão */}
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden border border-slate-200/70 dark:border-slate-700/60 p-0.5 shadow-inner">
            <div 
              className="h-full bg-gradient-to-r from-school-blue-600 via-indigo-600 to-school-gold-400 rounded-full transition-all duration-300 ease-out shadow-xs"
              style={{ width: `${Math.min(100, Math.max(5, progressoFinal))}%` }}
            />
          </div>

          {/* Indicador de Bloqueio Seguro */}
          <div className="flex items-center justify-center gap-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400 pt-0.5">
            <Lock className="h-3 w-3 text-school-blue-600 dark:text-school-gold-400" />
            <span>Painel do Dashboard temporariamente travado</span>
          </div>
        </div>

      </div>
    </div>
  );
}
