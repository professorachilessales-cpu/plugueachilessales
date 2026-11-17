'use client';

import React, { useEffect } from 'react';
import { Database, Loader2, Sparkles, Lock, GraduationCap, Users, Calendar, Award } from 'lucide-react';

interface ModalCarregandoBancoProps {
  mensagem?: string;
  subtitulo?: string;
}

export function ModalCarregandoBanco({
  mensagem = 'Carregando Banco de Dados',
  subtitulo = 'Aguarde enquanto os dados escolares, turmas, estudantes e frequências são carregados e sincronizados diretamente com o banco de dados.',
}: ModalCarregandoBancoProps) {
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

        {/* Barra de Progresso Animada Contínua */}
        <div className="mt-5 w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-200/60 dark:border-slate-700/60">
          <div className="h-full bg-gradient-to-r from-school-blue-500 via-indigo-500 to-school-gold-400 rounded-full w-full animate-pulse" />
        </div>

        {/* Indicadores de Entidades Sincronizadas */}
        <div className="mt-5 grid grid-cols-2 gap-2 text-left">
          <div className="flex items-center gap-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 p-2.5 border border-slate-100 dark:border-slate-700/50">
            <GraduationCap className="h-4 w-4 text-school-blue-600 dark:text-school-blue-400 shrink-0" />
            <div className="min-w-0">
              <span className="block text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate">Turmas</span>
              <span className="block text-[9px] text-slate-400 truncate">Matrículas & Séries</span>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 p-2.5 border border-slate-100 dark:border-slate-700/50">
            <Users className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <div className="min-w-0">
              <span className="block text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate">Estudantes</span>
              <span className="block text-[9px] text-slate-400 truncate">Fichas & Contatos</span>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 p-2.5 border border-slate-100 dark:border-slate-700/50">
            <Award className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <div className="min-w-0">
              <span className="block text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate">Professores</span>
              <span className="block text-[9px] text-slate-400 truncate">Quadro & Ausências</span>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 p-2.5 border border-slate-100 dark:border-slate-700/50">
            <Calendar className="h-4 w-4 text-purple-600 dark:text-purple-400 shrink-0" />
            <div className="min-w-0">
              <span className="block text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate">Calendário</span>
              <span className="block text-[9px] text-slate-400 truncate">Eventos Escolares</span>
            </div>
          </div>
        </div>

        {/* Rodapé: Indicador de Bloqueio Seguro */}
        <div className="mt-5 pt-3.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-center gap-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1.5 rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1 text-slate-600 dark:text-slate-300">
            <Lock className="h-3 w-3 text-school-blue-600 dark:text-school-gold-400" />
            <span>Painel do Dashboard temporariamente travado</span>
          </div>
        </div>

      </div>
    </div>
  );
}
