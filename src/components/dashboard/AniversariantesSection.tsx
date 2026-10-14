'use client';

import React from 'react';
import Link from 'next/link';
import { 
  Cake, 
  Sparkles, 
  PartyPopper, 
  Clock, 
  Calendar, 
  CheckCircle2, 
  GraduationCap, 
  Gift 
} from 'lucide-react';
import { Estudante } from '@/lib/types';

interface AniversarianteItem {
  estudante: Estudante;
  info: {
    dia: number;
    mes: number;
    idadeCalculada: number;
    dataFormatada: string;
    ehHoje: boolean;
    diasRestantes: number;
  };
}

interface AniversariantesSectionProps {
  dataHojeFormatada: string;
  hojeCurto: string;
  abaAniversario: 'hoje' | 'semana' | 'mes';
  setAbaAniversario: (aba: 'hoje' | 'semana' | 'mes') => void;
  homenagemEnviadaId?: string | null;
  setHomenagemEnviadaId?: (id: string | null) => void;
  handleEnviarHomenagem?: (estudanteId: string) => void;
  handleSimularHoje?: () => void;
  dadosAniversarios: {
    hoje: AniversarianteItem[];
    semana: AniversarianteItem[];
    mes: AniversarianteItem[];
  };
  obterInfoTurma: (turmaId?: string, turmaNome?: string) => { id: string; nome: string; turno: string };
}

export function AniversariantesSection({
  dataHojeFormatada = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }),
  hojeCurto = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
  abaAniversario = 'mes',
  setAbaAniversario = () => {},
  homenagemEnviadaId = null,
  setHomenagemEnviadaId = () => {},
  handleEnviarHomenagem = () => {},
  handleSimularHoje = () => {},
  dadosAniversarios = { hoje: [], semana: [], mes: [] },
  obterInfoTurma = () => ({ id: '', nome: 'Turma', turno: 'Manhã' }),
}: Partial<AniversariantesSectionProps> = {}) {
  // Safe-guards para garantir que arrays existam mesmo se dadosAniversarios for parcial
  const safeHoje = dadosAniversarios?.hoje || [];
  const safeSemana = dadosAniversarios?.semana || [];
  const safeMes = dadosAniversarios?.mes || [];
  return (
    <div className="isometric-featured-card overflow-hidden rounded-2xl border border-amber-200/90 bg-gradient-to-br from-amber-50/60 via-white to-rose-50/30 p-6 border-b-2 border-b-amber-300 dark:border-amber-900/40 dark:border-b-amber-800 dark:bg-gradient-to-br dark:from-amber-950/20 dark:via-school-dark-surface dark:to-rose-950/20 dark:bg-school-dark-surface">
      {/* Cabeçalho do Bloco */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-amber-200/50 pb-4 dark:border-amber-900/30">
        <div className="flex items-start gap-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-pink-500 text-white shadow-md shadow-amber-500/25 flex-shrink-0 animate-pulse">
            <Cake className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                Aniversariantes do Dia
              </h3>
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-bold text-amber-700 dark:bg-amber-400/10 dark:text-amber-300 border border-amber-500/20">
                <Sparkles className="h-3 w-3 text-amber-500" />
                Hoje, {dataHojeFormatada}
              </span>
            </div>
          </div>
        </div>

        {/* Abas de visualização rápida */}
        <div className="flex items-center gap-1.5 rounded-xl bg-slate-100/80 p-1 dark:bg-slate-800/80 self-start sm:self-auto border border-slate-200/60 dark:border-slate-700/60">
          <button
            onClick={() => setAbaAniversario('hoje')}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all flex items-center gap-1.5 ${
              abaAniversario === 'hoje'
                ? 'bg-white text-amber-700 shadow-sm dark:bg-slate-900 dark:text-amber-400'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <PartyPopper className="h-3.5 w-3.5 text-amber-500" />
            <span>Hoje</span>
            <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-extrabold ${
              safeHoje.length > 0
                ? 'bg-amber-500 text-white'
                : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
            }`}>
              {safeHoje.length}
            </span>
          </button>
          <button
            onClick={() => setAbaAniversario('semana')}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all flex items-center gap-1.5 ${
              abaAniversario === 'semana'
                ? 'bg-white text-school-blue-700 shadow-sm dark:bg-slate-900 dark:text-school-blue-400'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <Clock className="h-3.5 w-3.5 text-school-blue-500" />
            <span>Próximos 7 dias</span>
            <span className="rounded-full bg-slate-200 dark:bg-slate-700 px-1.5 py-0.2 text-[10px] font-extrabold text-slate-600 dark:text-slate-300">
              {safeSemana.length}
            </span>
          </button>
          <button
            onClick={() => setAbaAniversario('mes')}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all flex items-center gap-1.5 ${
              abaAniversario === 'mes'
                ? 'bg-white text-purple-700 shadow-sm dark:bg-slate-900 dark:text-purple-400'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <Calendar className="h-3.5 w-3.5 text-purple-500" />
            <span>No Mês</span>
            <span className="rounded-full bg-slate-200 dark:bg-slate-700 px-1.5 py-0.2 text-[10px] font-extrabold text-slate-600 dark:text-slate-300">
              {safeMes.length}
            </span>
          </button>
        </div>
      </div>

      {/* Notificação Temporária de Felicitação */}
      {homenagemEnviadaId && (
        <div className="mt-4 flex items-center justify-between rounded-xl bg-emerald-500 text-white p-3 text-xs font-semibold shadow-md animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
            <span>🎉 Parabéns registrado! Felicitações anotadas para a homenagem da turma.</span>
          </div>
          <button
            onClick={() => setHomenagemEnviadaId(null)}
            className="text-white/80 hover:text-white text-xs underline ml-2"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Conteúdo da Aba Ativa */}
      <div className="mt-5">
        {abaAniversario === 'hoje' && (
          <>
            {safeHoje.length === 0 ? (
              /* Estado Vazio Amigável para Hoje */
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-amber-200 bg-white/70 py-10 px-4 text-center dark:border-slate-800 dark:bg-slate-900/40">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100/70 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400 mb-3">
                  <Cake className="h-7 w-7 opacity-80" />
                </div>
                <h4 className="text-base font-bold text-slate-800 dark:text-slate-200">
                  Nenhum estudante faz aniversário hoje ({hojeCurto})
                </h4>
                <p className="mt-1 max-w-md text-xs text-slate-500 dark:text-slate-400">
                  Não há comemorações registradas para a data de hoje. Você pode acompanhar os aniversariantes previstos para os próximos dias.
                </p>
                {safeSemana.length > 0 && (
                  <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
                    <button
                      onClick={() => setAbaAniversario('semana')}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-amber-600 transition-colors"
                    >
                      <Clock className="h-3.5 w-3.5" />
                      Ver {safeSemana.length} aniversariante(s) desta semana
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* Grid de Aniversariantes de Hoje */
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {safeHoje.map(({ estudante, info }) => {
                  const turmaInfo = obterInfoTurma(estudante.turma_id, estudante.turma_nome);
                  return (
                    <div
                      key={estudante.id}
                      className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-amber-200/90 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-amber-900/50 dark:bg-slate-900/90"
                    >
                      {/* Efeito decorativo festivo de fundo */}
                      <div className="absolute -top-8 -right-8 h-24 w-24 rounded-full bg-gradient-to-br from-amber-400/20 via-rose-400/10 to-transparent blur-xl pointer-events-none" />

                      <div>
                        {/* Tag superior de comemoração */}
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500 to-rose-500 px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider text-white shadow-sm">
                            <PartyPopper className="h-3 w-3" />
                            Aniversariante do Dia! 🎂
                          </span>
                          <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 font-mono">
                            {info.dataFormatada}
                          </span>
                        </div>

                        {/* Foto e Informações Principais */}
                        <div className="flex items-center gap-3.5">
                          <div className="relative flex-shrink-0">
                            {estudante.foto_url ? (
                              <img
                                src={estudante.foto_url}
                                alt={estudante.nome_completo}
                                className="h-16 w-16 rounded-2xl object-cover ring-2 ring-amber-400 ring-offset-2 ring-offset-white dark:ring-offset-slate-900 shadow-sm"
                              />
                            ) : (
                              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-rose-500 text-lg font-black text-white ring-2 ring-amber-400 ring-offset-2 ring-offset-white dark:ring-offset-slate-900 shadow-sm">
                                {estudante.nome_completo.charAt(0)}
                              </div>
                            )}
                            <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-xs shadow-md border-2 border-white dark:border-slate-900">
                              🎈
                            </span>
                          </div>

                          <div className="min-w-0 flex-1">
                            <h4 className="text-base font-black text-slate-900 dark:text-white truncate group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors" title={estudante.nome_completo}>
                              {estudante.nome_completo}
                            </h4>
                            
                            {/* Bloco de Turma com Destaque */}
                            <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                              <span className="inline-flex items-center gap-1 rounded-lg bg-school-blue-50 px-2 py-0.5 text-xs font-bold text-school-blue-700 dark:bg-school-blue-950 dark:text-school-blue-300 border border-school-blue-200/60 dark:border-school-blue-800/60">
                                <GraduationCap className="h-3.5 w-3.5 text-school-blue-600 dark:text-school-blue-400" />
                                <span>{turmaInfo.nome}</span>
                              </span>
                              {turmaInfo.turno && (
                                <span className="text-[10px] font-semibold uppercase text-slate-400 dark:text-slate-500">
                                  • {turmaInfo.turno}
                                </span>
                              )}
                            </div>

                            <p className="mt-1.5 text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                              <Gift className="h-3.5 w-3.5" />
                              <span>Completando {info.idadeCalculada} anos hoje!</span>
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Ações Rápidas */}
                      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-1.5">
                        <Link
                          href={`/fotograma`}
                          className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                          title="Ver turma no Fotograma"
                        >
                          Fotograma
                        </Link>
                        <Link
                          href={`/estudantes`}
                          className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                          title="Ver ficha cadastral do estudante"
                        >
                          Ficha
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {abaAniversario === 'semana' && (
          /* Lista dos Próximos 7 Dias */
          <div className="space-y-3">
            {safeSemana.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                Nenhum aniversariante previsto para os próximos 7 dias.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {safeSemana.map(({ estudante, info }) => {
                  const turmaInfo = obterInfoTurma(estudante.turma_id, estudante.turma_nome);
                  return (
                    <div
                      key={estudante.id}
                      className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {estudante.foto_url ? (
                          <img
                            src={estudante.foto_url}
                            alt=""
                            className="h-10 w-10 rounded-xl object-cover ring-1 ring-slate-200 dark:ring-slate-700"
                          />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-school-blue-100 text-xs font-bold text-school-blue-700 dark:bg-school-blue-950 dark:text-school-blue-300">
                            {estudante.nome_completo.charAt(0)}
                          </div>
                        )}
                        <div className="min-w-0">
                          <h5 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {estudante.nome_completo}
                          </h5>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            {turmaInfo.nome}
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 pl-2">
                        <span className="block text-xs font-bold text-school-blue-600 dark:text-school-gold-400">
                          {info.ehHoje ? 'Hoje!' : `Em ${info.diasRestantes} dia(s)`}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {info.dataFormatada} • {info.idadeCalculada} anos
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {abaAniversario === 'mes' && (
          /* Lista de Todos do Mês */
          <div className="space-y-3">
            {safeMes.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                Nenhum aniversariante cadastrado neste mês.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {safeMes.map(({ estudante, info }) => {
                  const turmaInfo = obterInfoTurma(estudante.turma_id, estudante.turma_nome);
                  return (
                    <div
                      key={estudante.id}
                      className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {estudante.foto_url ? (
                          <img
                            src={estudante.foto_url}
                            alt=""
                            className="h-10 w-10 rounded-xl object-cover ring-1 ring-slate-200 dark:ring-slate-700"
                          />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-xs font-bold text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                            {estudante.nome_completo.charAt(0)}
                          </div>
                        )}
                        <div className="min-w-0">
                          <h5 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {estudante.nome_completo}
                          </h5>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            {turmaInfo.nome}
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 pl-2">
                        <span className="block text-xs font-bold text-purple-600 dark:text-purple-400">
                          Dia {info.dia}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {info.idadeCalculada} anos
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
