'use client';

import React, { useState } from 'react';
import { 
  X, 
  AlertTriangle, 
  CheckCircle2, 
  Users, 
  Calendar, 
  Search, 
  ArrowUpRight, 
  ArrowDownRight, 
  HelpCircle,
  GraduationCap
} from 'lucide-react';
import { AnaliseTurmaFaixaEtaria, AnaliseEstudanteFaixaEtaria } from '@/lib/faixa-etaria';

interface ModalFaixaEtariaTurmaProps {
  analise: AnaliseTurmaFaixaEtaria | null;
  onClose: () => void;
}

export function ModalFaixaEtariaTurma({ analise, onClose }: ModalFaixaEtariaTurmaProps) {
  const [filtroTab, setFiltroTab] = useState<'fora' | 'todos' | 'adequados'>('fora');
  const [busca, setBusca] = useState('');

  if (!analise) return null;

  const estudantesFiltrados = analise.estudantes.filter((est) => {
    // Filtro por tab
    if (filtroTab === 'fora' && est.status === 'adequado') return false;
    if (filtroTab === 'adequados' && est.status !== 'adequado') return false;

    // Filtro por busca de texto
    if (busca.trim()) {
      const termo = busca.toLowerCase().trim();
      return (
        est.nomeCompleto.toLowerCase().includes(termo) ||
        est.dataNascimentoFormatada.includes(termo) ||
        String(est.idadeCorte).includes(termo) ||
        String(est.idadeAtual).includes(termo)
      );
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="w-full max-w-3xl max-h-[90vh] flex flex-col rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 animate-in zoom-in-95 duration-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Topo do Modal */}
        <div className="flex items-start justify-between border-b border-slate-100 p-5 dark:border-slate-800">
          <div className="flex items-start gap-3.5">
            <div className={`flex h-11 w-11 items-center justify-center rounded-2xl shrink-0 ${
              analise.temAlunosForaDaFaixa
                ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-school-gold-400'
                : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
            }`}>
              {analise.temAlunosForaDaFaixa ? (
                <AlertTriangle className="h-6 w-6" />
              ) : (
                <CheckCircle2 className="h-6 w-6" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  <GraduationCap className="h-3 w-3 text-school-blue-600 dark:text-school-gold-400" />
                  {analise.serieNome}
                </span>
                <span className="text-[11px] text-slate-400">•</span>
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  Data de Corte Oficial MEC: <strong className="text-slate-700 dark:text-slate-300">31/03/{analise.anoLetivo}</strong>
                </span>
              </div>
              <h3 className="mt-1 text-lg font-black tracking-tight text-slate-900 dark:text-white">
                Distorção Idade-Série: {analise.turmaNome}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Faixa etária regular esperada: <strong className="text-school-blue-700 dark:text-school-gold-400">{analise.faixaEsperada}</strong> ({analise.regra?.descricaoRegra || 'Parâmetro oficial'})
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
            title="Fechar detalhes"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Resumo Estatístico da Turma */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-4 bg-slate-50/70 border-b border-slate-100 dark:bg-slate-950/40 dark:border-slate-800">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total na Turma</span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-black text-slate-900 dark:text-white">{analise.totalEstudantes}</span>
              <span className="text-[10px] text-slate-400">alunos</span>
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/50 p-3 dark:border-emerald-950 dark:bg-emerald-950/20">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400">Faixa Adequada</span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-black text-emerald-700 dark:text-emerald-300">{analise.totalAdequados}</span>
              <span className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80">
                ({analise.totalEstudantes > 0 ? Math.round((analise.totalAdequados / analise.totalEstudantes) * 100) : 0}%)
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-amber-200/80 bg-amber-50/50 p-3 dark:border-amber-950 dark:bg-amber-950/20">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-400">Acima (Distorção)</span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-black text-amber-700 dark:text-amber-300">{analise.totalAcima}</span>
              <span className="text-[10px] text-amber-600/80 dark:text-amber-400/80">
                ({analise.totalEstudantes > 0 ? Math.round((analise.totalAcima / analise.totalEstudantes) * 100) : 0}%)
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-blue-200/80 bg-blue-50/50 p-3 dark:border-blue-950 dark:bg-blue-950/20">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-800 dark:text-blue-400">Abaixo do Corte</span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-black text-blue-700 dark:text-blue-300">{analise.totalAbaixo}</span>
              <span className="text-[10px] text-blue-600/80 dark:text-blue-400/80">
                ({analise.totalEstudantes > 0 ? Math.round((analise.totalAbaixo / analise.totalEstudantes) * 100) : 0}%)
              </span>
            </div>
          </div>
        </div>

        {/* Filtros e Busca */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setFiltroTab('fora')}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                filtroTab === 'fora'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
              }`}
            >
              Fora da Faixa ({analise.totalForaDaFaixa})
            </button>
            <button
              type="button"
              onClick={() => setFiltroTab('todos')}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                filtroTab === 'todos'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
              }`}
            >
              Todos ({analise.totalEstudantes})
            </button>
            <button
              type="button"
              onClick={() => setFiltroTab('adequados')}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                filtroTab === 'adequados'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
              }`}
            >
              Adequados ({analise.totalAdequados})
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar aluno por nome..."
              className="w-full rounded-xl border border-slate-200 bg-white pl-8 pr-3 py-1.5 text-xs text-slate-900 focus:border-school-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>
        </div>

        {/* Tabela de Estudantes */}
        <div className="flex-1 overflow-y-auto p-4 max-h-[50vh]">
          {estudantesFiltrados.length === 0 ? (
            <div className="py-12 text-center">
              <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500 mb-2" />
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Nenhum estudante encontrado com o filtro selecionado.
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {filtroTab === 'fora' && analise.totalForaDaFaixa === 0
                  ? 'Excelente! Todos os estudantes desta turma estão na faixa etária ideal.'
                  : 'Tente alterar os termos de busca ou a aba selecionada.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500 dark:bg-slate-950 dark:text-slate-400">
                  <tr>
                    <th className="px-3.5 py-3">Estudante</th>
                    <th className="px-3.5 py-3">Data Nasc.</th>
                    <th className="px-3.5 py-3 text-center">Idade em 31/03</th>
                    <th className="px-3.5 py-3 text-center">Idade Atual</th>
                    <th className="px-3.5 py-3">Situação Idade-Série</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-800 dark:bg-slate-900">
                  {estudantesFiltrados.map((est) => {
                    const isFora = est.status !== 'adequado' && est.status !== 'indeterminado';
                    const isAcima = est.status === 'acima';
                    const isAbaixo = est.status === 'abaixo';

                    return (
                      <tr 
                        key={est.estudanteId} 
                        className={`transition-colors ${
                          isFora 
                            ? 'bg-amber-50/30 hover:bg-amber-50/70 dark:bg-amber-950/10 dark:hover:bg-amber-950/20' 
                            : 'hover:bg-slate-50/70 dark:hover:bg-slate-800/40'
                        }`}
                      >
                        <td className="px-3.5 py-3 font-bold text-slate-900 dark:text-white">
                          <span className="line-clamp-1">{est.nomeCompleto}</span>
                        </td>
                        <td className="px-3.5 py-3 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                          {est.dataNascimentoFormatada}
                        </td>
                        <td className="px-3.5 py-3 text-center font-bold">
                          {est.dataNascimentoValida ? (
                            <span className={`inline-flex items-center justify-center min-w-7 h-6 px-1.5 rounded-md font-mono text-[11px] ${
                              isAcima
                                ? 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200'
                                : isAbaixo
                                ? 'bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-200'
                                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                            }`}>
                              {est.idadeCorte} anos
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[10px]">—</span>
                          )}
                        </td>
                        <td className="px-3.5 py-3 text-center font-mono text-[11px] text-slate-500">
                          {est.dataNascimentoValida ? `${est.idadeAtual} anos` : '—'}
                        </td>
                        <td className="px-3.5 py-3">
                          {isAcima && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-extrabold text-amber-900 dark:bg-amber-950 dark:text-amber-200 border border-amber-300 dark:border-amber-800">
                              <ArrowUpRight className="h-3 w-3" />
                              {est.descricaoStatus}
                            </span>
                          )}
                          {isAbaixo && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-[10px] font-extrabold text-blue-900 dark:bg-blue-950 dark:text-blue-200 border border-blue-300 dark:border-blue-800">
                              <ArrowDownRight className="h-3 w-3" />
                              {est.descricaoStatus}
                            </span>
                          )}
                          {est.status === 'adequado' && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                              <CheckCircle2 className="h-3 w-3" />
                              Idade Regular
                            </span>
                          )}
                          {est.status === 'indeterminado' && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                              <HelpCircle className="h-3 w-3" />
                              Data não informada
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Rodapé Informativo */}
        <div className="flex items-center justify-between border-t border-slate-100 p-4 bg-slate-50 dark:border-slate-800 dark:bg-slate-950 text-xs">
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            Critério: Resolução CNE/CEB nº 2/2018 (corte etário em 31 de março do ano letivo vigente).
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-900 px-4 py-2 font-bold text-white hover:bg-slate-800 active:scale-95 transition-all dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
