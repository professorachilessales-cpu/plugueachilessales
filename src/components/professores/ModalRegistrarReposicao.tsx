'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { X, CheckCircle2, Calendar, Clock, BookOpen, AlertCircle, Send } from 'lucide-react';
import { ReposicaoAula } from '@/lib/types';

interface ModalRegistrarReposicaoProps {
  isOpen: boolean;
  onClose: () => void;
  reposicao: ReposicaoAula;
}

export function ModalRegistrarReposicao({
  isOpen,
  onClose,
  reposicao,
}: ModalRegistrarReposicaoProps) {
  const { turmas, registrarReposicaoAula } = useApp();

  const [dataExecucao, setDataExecucao] = useState(
    reposicao.data_execucao_reposicao || new Date().toISOString().split('T')[0]
  );
  const [horario, setHorario] = useState(reposicao.horario_reposicao || '14:00 - 15:40');
  const [turmaId, setTurmaId] = useState(reposicao.turma_id || turmas[0]?.id || '');
  const [conteudo, setConteudo] = useState(reposicao.conteudo_lecionado || '');
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dataExecucao || !horario || !conteudo.trim()) {
      setErro('Por favor, preencha a data, horário e o conteúdo ministrado na aula de reposição.');
      return;
    }

    registrarReposicaoAula(reposicao.id, {
      data_execucao: dataExecucao,
      horario,
      conteudo: conteudo.trim(),
    });

    setSucesso(true);
    setTimeout(() => {
      setSucesso(false);
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in-0 duration-200">
      <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="rounded-xl bg-amber-100 p-2 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Registrar Realização de Reposição
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Falta original em {new Date(reposicao.data_falta + 'T00:00:00').toLocaleDateString('pt-BR')} ({reposicao.qtd_aulas_faltantes} aulas)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {erro && (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{erro}</span>
          </div>
        )}

        {sucesso && (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
            <span>Reposição submetida para homologação da Direção Escolar!</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Data da Execução *
              </label>
              <input
                type="date"
                required
                value={dataExecucao}
                onChange={(e) => setDataExecucao(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:border-school-blue-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Horário da Aula *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: 14:00 - 15:40"
                value={horario}
                onChange={(e) => setHorario(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:border-school-blue-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Turma Beneficiada
            </label>
            <select
              value={turmaId}
              onChange={(e) => setTurmaId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:border-school-blue-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              {turmas.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome} ({t.turno})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Conteúdo Lecionado / Objetivos da Reposição *
            </label>
            <textarea
              rows={3}
              required
              placeholder="Descreva o conteúdo abordado, exercícios resolvidos e objetivos pedagógicos alcançados..."
              value={conteudo}
              onChange={(e) => setConteudo(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-900 focus:border-school-blue-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-xl bg-school-blue-800 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-school-blue-700 transition-colors"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Salvar e Enviar à Direção</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
