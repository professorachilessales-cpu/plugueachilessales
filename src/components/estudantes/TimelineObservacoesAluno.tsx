'use client';

import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { Estudante, ObservacaoAluno, TipoObservacaoAluno } from '@/lib/types';
import { 
  MessageSquare, 
  Plus, 
  Tag, 
  Trash2, 
  User, 
  Calendar, 
  CheckCircle2, 
  AlertCircle,
  Activity,
  Heart,
  BookOpen,
  Send
} from 'lucide-react';

interface TimelineObservacoesAlunoProps {
  estudante: Estudante;
}

const CATEGORIAS_CONFIG: Record<TipoObservacaoAluno, { label: string; cor: string; bg: string; border: string; icon: any }> = {
  comportamental: {
    label: 'Comportamental',
    cor: 'text-amber-700 dark:text-amber-300',
    bg: 'bg-amber-100 dark:bg-amber-950/60',
    border: 'border-amber-200 dark:border-amber-800',
    icon: Activity,
  },
  pedagogico: {
    label: 'Pedagógico',
    cor: 'text-indigo-700 dark:text-indigo-300',
    bg: 'bg-indigo-100 dark:bg-indigo-950/60',
    border: 'border-indigo-200 dark:border-indigo-800',
    icon: BookOpen,
  },
  saude: {
    label: 'Saúde / Clínico',
    cor: 'text-rose-700 dark:text-rose-300',
    bg: 'bg-rose-100 dark:bg-rose-950/60',
    border: 'border-rose-200 dark:border-rose-800',
    icon: Heart,
  },
  geral: {
    label: 'Geral / Secretaria',
    cor: 'text-slate-700 dark:text-slate-300',
    bg: 'bg-slate-100 dark:bg-slate-800',
    border: 'border-slate-200 dark:border-slate-700',
    icon: Tag,
  },
};

export function TimelineObservacoesAluno({ estudante }: TimelineObservacoesAlunoProps) {
  const { currentUser, observacoesAluno, addObservacaoAluno, deleteObservacaoAluno } = useApp();

  const [filtroCategoria, setFiltroCategoria] = useState<string>('todos');
  const [novaCategoria, setNovaCategoria] = useState<TipoObservacaoAluno>('pedagogico');
  const [novoTexto, setNovoTexto] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Observações deste estudante ordenadas cronologicamente (mais recente primeiro)
  const observacoes = useMemo(() => {
    return observacoesAluno
      .filter(o => o.aluno_id === estudante.id)
      .filter(o => filtroCategoria === 'todos' || o.tipo === filtroCategoria)
      .sort((a, b) => new Date(b.data_registro).getTime() - new Date(a.data_registro).getTime());
  }, [observacoesAluno, estudante.id, filtroCategoria]);

  const handleAdicionarObservacao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoTexto.trim()) return;

    setSalvando(true);
    try {
      await addObservacaoAluno(
        estudante.id,
        currentUser.id,
        currentUser.nome,
        currentUser.role,
        novoTexto.trim(),
        novaCategoria
      );
      setNovoTexto('');
      setFeedback('Observação registrada na timeline do estudante!');
      setTimeout(() => setFeedback(null), 3000);
    } catch {
      alert('Erro ao registrar observação');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Topo: Título e Filtro de Tags */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4 dark:border-slate-800">
        <div>
          <h4 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-school-blue-600 dark:text-school-gold-400" />
            Observações Contínuas & Histórico Pedagógico
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Feed cronológico de anotações comportamentais, de saúde e evolução pedagógica
          </p>
        </div>

        {/* Filtro por Categorias */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <button
            onClick={() => setFiltroCategoria('todos')}
            className={`rounded-xl px-2.5 py-1 text-[11px] font-bold transition-colors ${
              filtroCategoria === 'todos'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            Todas ({observacoesAluno.filter(o => o.aluno_id === estudante.id).length})
          </button>
          {(Object.keys(CATEGORIAS_CONFIG) as TipoObservacaoAluno[]).map((cat) => {
            const conf = CATEGORIAS_CONFIG[cat];
            const qtd = observacoesAluno.filter(o => o.aluno_id === estudante.id && o.tipo === cat).length;
            const ativo = filtroCategoria === cat;
            return (
              <button
                key={cat}
                onClick={() => setFiltroCategoria(cat)}
                className={`rounded-xl px-2.5 py-1 text-[11px] font-bold transition-colors ${
                  ativo
                    ? `${conf.bg} ${conf.cor} ring-2 ring-current`
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                {conf.label} ({qtd})
              </button>
            );
          })}
        </div>
      </div>

      {feedback && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-xs font-bold text-emerald-800 border border-emerald-200 dark:bg-emerald-950/50 dark:border-emerald-900 dark:text-emerald-200">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Formulário de Registro Rápido */}
      <form onSubmit={handleAdicionarObservacao} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-900/40 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Nova Anotação no Histórico do Estudante:
          </span>

          <div className="flex items-center gap-1.5 flex-wrap">
            {(Object.keys(CATEGORIAS_CONFIG) as TipoObservacaoAluno[]).map((cat) => {
              const conf = CATEGORIAS_CONFIG[cat];
              const Icon = conf.icon;
              const selecionada = novaCategoria === cat;
              return (
                <button
                  type="button"
                  key={cat}
                  onClick={() => setNovaCategoria(cat)}
                  className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold uppercase transition-all ${
                    selecionada
                      ? `${conf.bg} ${conf.cor} border ${conf.border} ring-1 ring-current shadow-sm`
                      : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-100 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400'
                  }`}
                >
                  <Icon className="h-3 w-3" />
                  <span>{conf.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <textarea
          rows={3}
          value={novoTexto}
          onChange={(e) => setNovoTexto(e.target.value)}
          placeholder={`Registre fatos observados, evolução de aprendizagem, condutas ou encaminhamentos para ${estudante.nome_completo}...`}
          className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-900 focus:border-school-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white shadow-sm leading-relaxed"
        />

        <div className="flex items-center justify-between pt-1">
          <span className="text-[11px] text-slate-400">
            Registrado por: <strong>{currentUser.nome}</strong> ({currentUser.role.toUpperCase()})
          </span>

          <button
            type="submit"
            disabled={salvando || !novoTexto.trim()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-school-blue-700 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-school-blue-800 active:scale-95 transition-all disabled:opacity-50"
          >
            <Send className="h-3.5 w-3.5" />
            <span>{salvando ? 'Salvando...' : 'Adicionar Anotação'}</span>
          </button>
        </div>
      </form>

      {/* Feed da Linha do Tempo */}
      <div className="space-y-4">
        {observacoes.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center text-xs text-slate-400 dark:border-slate-800">
            Nenhuma observação registrada nesta categoria.
          </div>
        ) : (
          <div className="relative pl-6 space-y-4 before:absolute before:bottom-2 before:top-2 before:left-2.5 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
            {observacoes.map((obs) => {
              const conf = CATEGORIAS_CONFIG[obs.tipo] || CATEGORIAS_CONFIG.geral;
              const Icon = conf.icon;
              const dataFormatada = new Date(obs.data_registro).toLocaleString('pt-BR', {
                dateStyle: 'short',
                timeStyle: 'short',
              });

              return (
                <div key={obs.id} className="relative group">
                  {/* Ponto na timeline */}
                  <div className={`absolute -left-6 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-white ring-4 ring-white dark:bg-slate-900 dark:ring-slate-900 border ${conf.border}`}>
                    <div className={`h-2 w-2 rounded-full ${conf.bg}`} />
                  </div>

                  {/* Card da Observação */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:shadow-md dark:border-slate-800 dark:bg-school-dark-surface space-y-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-black uppercase ${conf.bg} ${conf.cor} border ${conf.border}`}>
                          <Icon className="h-3 w-3" />
                          {conf.label}
                        </span>
                        <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
                          {obs.autor_nome}
                        </span>
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-slate-500 dark:bg-slate-800">
                          {obs.autor_cargo}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-slate-400">
                        <Calendar className="h-3 w-3" />
                        <span>{dataFormatada}</span>
                        {(currentUser.role === 'admin' || currentUser.role === 'direcao' || currentUser.id === obs.autor_id) && (
                          <button
                            onClick={() => {
                              if (confirm('Deseja excluir esta observação do histórico do estudante?')) {
                                deleteObservacaoAluno(obs.id);
                              }
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 transition-opacity"
                            title="Excluir Anotação"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                      {obs.texto}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
