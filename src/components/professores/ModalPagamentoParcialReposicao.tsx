'use client';

import React, { useState } from 'react';
import { X, CheckCircle2, Calendar, Clock, AlertCircle, Save } from 'lucide-react';
import { FaltaProfessor } from '@/lib/types';

interface ModalPagamentoParcialReposicaoProps {
  isOpen: boolean;
  onClose: () => void;
  falta: FaltaProfessor;
  saldoRestante: number;
  onConfirm: (dados: {
    aulasPagasQtd: number;
    dataReposicao: string;
    observacao?: string;
  }) => Promise<void>;
}

export function ModalPagamentoParcialReposicao({
  isOpen,
  onClose,
  falta,
  saldoRestante,
  onConfirm,
}: ModalPagamentoParcialReposicaoProps) {
  const hojeIso = new Date().toISOString().split('T')[0];
  const [aulasQtd, setAulasQtd] = useState<number>(Math.min(1, saldoRestante));
  const [dataReposicao, setDataReposicao] = useState<string>(hojeIso);
  const [observacao, setObservacao] = useState<string>('');
  const [salvando, setSalvando] = useState<boolean>(false);
  const [erro, setErro] = useState<string | null>(null);

  if (!isOpen) return null;

  const totalDevido = Number(falta.aulas_totais_devidas ?? falta.aulas_faltadas ?? 1);
  const pagasAtuais = Number(falta.aulas_pagas ?? 0);
  const abonadasAtuais = Number(falta.aulas_abonadas ?? 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);

    const qtdNum = Number(aulasQtd);
    if (isNaN(qtdNum) || qtdNum < 1) {
      setErro('A quantidade de aulas deve ser de no mínimo 1 aula.');
      return;
    }
    if (qtdNum > saldoRestante) {
      setErro(`A quantidade não pode exceder o saldo devedor restante de ${saldoRestante} aula(s).`);
      return;
    }
    if (!dataReposicao) {
      setErro('Informe a data em que a reposição foi realizada.');
      return;
    }

    try {
      setSalvando(true);
      await onConfirm({
        aulasPagasQtd: qtdNum,
        dataReposicao,
        observacao: observacao.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      console.error(err);
      setErro(err?.message || 'Falha ao registrar pagamento parcial de reposição.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in-0 duration-200">
      <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="rounded-xl bg-amber-100 p-2 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Pagamento Parcial de Reposição
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {falta.professor_nome}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={salvando}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Resumo da Ausência */}
        <div className="mt-4 rounded-2xl bg-slate-50 p-3.5 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-500 dark:text-slate-400 font-medium">Ausência / Falta:</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">
              {new Date((falta.data_inicio || falta.data_falta) + 'T12:00:00').toLocaleDateString('pt-BR')}
              {falta.tipo_registro === 'PERIODO' && falta.data_fim && falta.data_fim !== falta.data_inicio && (
                <> a {new Date(falta.data_fim + 'T12:00:00').toLocaleDateString('pt-BR')}</>
              )}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-200/60 dark:border-slate-700/60 text-center">
            <div className="p-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-semibold">Total Devido</span>
              <span className="text-xs font-black text-slate-800 dark:text-slate-100">{totalDevido} aula(s)</span>
            </div>
            <div className="p-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700">
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block font-semibold">Já Pagas</span>
              <span className="text-xs font-black text-emerald-700 dark:text-emerald-300">{pagasAtuais} aula(s)</span>
            </div>
            <div className="p-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/60">
              <span className="text-[10px] text-amber-700 dark:text-amber-400 block font-bold">Saldo Restante</span>
              <span className="text-xs font-black text-amber-800 dark:text-amber-200">{saldoRestante} aula(s)</span>
            </div>
          </div>
        </div>

        {erro && (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-900 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{erro}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1">
              Quantidade de aulas pagas nesta reposição *
            </label>
            <div className="relative">
              <input
                type="number"
                min={1}
                max={saldoRestante}
                required
                value={aulasQtd}
                onChange={(e) => setAulasQtd(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-900 focus:border-amber-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
              <span className="absolute right-3 top-2 text-[10px] text-slate-400 dark:text-slate-300 font-medium">
                Máx: {saldoRestante} aula(s)
              </span>
            </div>
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              Novo saldo restante previsto:{' '}
              <strong className="text-slate-800 dark:text-slate-200">
                {Math.max(0, saldoRestante - (Number(aulasQtd) || 0))} aula(s)
              </strong>
            </p>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1">
              Data da Reposição *
            </label>
            <input
              type="date"
              required
              value={dataReposicao}
              onChange={(e) => setDataReposicao(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:border-amber-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1">
              Observação / Turma onde ocorreu a reposição <span className="text-slate-400 font-normal">(Opcional)</span>
            </label>
            <input
              type="text"
              placeholder="Ex: Reposição realizada no 7º Ano B, turno vespertino"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:border-amber-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={salvando}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={salvando}
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-amber-700 active:scale-95 transition-all disabled:opacity-50"
            >
              <Save className="h-3.5 w-3.5" />
              <span>{salvando ? 'Salvando...' : 'Confirmar Pagamento'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
