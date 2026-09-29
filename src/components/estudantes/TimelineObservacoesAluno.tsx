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
  Send,
  Edit3,
  Eye,
  X,
  Clock,
  ShieldCheck
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
  const { currentUser, observacoesAluno, addObservacaoAluno, updateObservacaoAluno, deleteObservacaoAluno } = useApp();

  const [filtroCategoria, setFiltroCategoria] = useState<string>('todos');
  const [novaCategoria, setNovaCategoria] = useState<TipoObservacaoAluno>('pedagogico');
  const [novoTexto, setNovoTexto] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Modais de Visualização e Edição
  const [observacaoLeitura, setObservacaoLeitura] = useState<ObservacaoAluno | null>(null);
  const [observacaoEditando, setObservacaoEditando] = useState<ObservacaoAluno | null>(null);
  const [textoEditado, setTextoEditado] = useState('');
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);

  // Observações deste estudante ordenadas SEMPRE da mais recente para a mais antiga (created_at DESC)
  const observacoes = useMemo(() => {
    return observacoesAluno
      .filter(o => (o.estudante_id === estudante.id || o.aluno_id === estudante.id))
      .filter(o => {
        const cat = o.categoria || o.tipo;
        return filtroCategoria === 'todos' || cat === filtroCategoria;
      })
      .sort((a, b) => {
        const timeB = new Date(b.created_at || b.data_registro || 0).getTime();
        const timeA = new Date(a.created_at || a.data_registro || 0).getTime();
        return timeB - timeA;
      });
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

  const handleSalvarEdicao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!observacaoEditando || !textoEditado.trim()) return;

    setSalvandoEdicao(true);
    try {
      await updateObservacaoAluno(observacaoEditando.id, textoEditado.trim());
      setObservacaoEditando(null);
      setTextoEditado('');
      if (observacaoLeitura?.id === observacaoEditando.id) {
        setObservacaoLeitura(prev => prev ? { ...prev, texto: textoEditado.trim(), texto_completo: textoEditado.trim() } : null);
      }
      setFeedback('Observação atualizada e auditada com sucesso!');
      setTimeout(() => setFeedback(null), 3500);
    } catch {
      alert('Erro ao atualizar observação');
    } finally {
      setSalvandoEdicao(false);
    }
  };

  const abrirEdicao = (obs: ObservacaoAluno, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    // Apenas o usuário autor da observação pode editá-la
    const isAutor = currentUser.id === (obs.usuario_id || obs.autor_id);
    if (!isAutor) return;

    setObservacaoEditando(obs);
    setTextoEditado(obs.texto_completo || obs.texto || '');
  };

  const handleExcluir = (obs: ObservacaoAluno, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (confirm('Deseja excluir esta observação? O registro completo será preservado no log de auditoria.')) {
      deleteObservacaoAluno(obs.id);
      if (observacaoLeitura?.id === obs.id) {
        setObservacaoLeitura(null);
      }
      setFeedback('Observação removida da timeline ativa e registrada na auditoria.');
      setTimeout(() => setFeedback(null), 3500);
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
            Feed cronológico decrescente com histórico completo, controle de edição e auditoria
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
            Todas ({observacoesAluno.filter(o => o.estudante_id === estudante.id || o.aluno_id === estudante.id).length})
          </button>
          {(Object.keys(CATEGORIAS_CONFIG) as TipoObservacaoAluno[]).map((cat) => {
            const conf = CATEGORIAS_CONFIG[cat];
            const qtd = observacoesAluno.filter(o => (o.estudante_id === estudante.id || o.aluno_id === estudante.id) && (o.categoria === cat || o.tipo === cat)).length;
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
            className="inline-flex items-center gap-1.5 rounded-xl bg-school-blue-700 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-school-blue-800 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
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
              const catKey = (obs.categoria || obs.tipo || 'geral') as TipoObservacaoAluno;
              const conf = CATEGORIAS_CONFIG[catKey] || CATEGORIAS_CONFIG.geral;
              const Icon = conf.icon;
              const dataIso = obs.created_at || obs.data_registro;
              const dataFormatada = dataIso ? new Date(dataIso).toLocaleString('pt-BR', {
                dateStyle: 'short',
                timeStyle: 'short',
              }) : 'Data recente';

              const autorId = obs.usuario_id || obs.autor_id;
              const isAutor = currentUser.id === autorId;
              const canDelete = isAutor || currentUser.role === 'admin' || currentUser.role === 'direcao';

              return (
                <div key={obs.id} className="relative group">
                  {/* Ponto na timeline */}
                  <div className={`absolute -left-6 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-white ring-4 ring-white dark:bg-slate-900 dark:ring-slate-900 border ${conf.border}`}>
                    <div className={`h-2 w-2 rounded-full ${conf.bg}`} />
                  </div>

                  {/* Card da Observação com clique para leitura completa */}
                  <div 
                    onClick={() => setObservacaoLeitura(obs)}
                    className="cursor-pointer rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:shadow-md hover:border-school-blue-300 dark:border-slate-800 dark:bg-school-dark-surface dark:hover:border-school-blue-700 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-black uppercase ${conf.bg} ${conf.cor} border ${conf.border}`}>
                          <Icon className="h-3 w-3" />
                          {conf.label}
                        </span>
                        <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
                          {obs.autor_nome || 'Usuário'}
                        </span>
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-slate-500 dark:bg-slate-800">
                          {obs.autor_cargo || 'Autor'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                        <Calendar className="h-3 w-3" />
                        <span>{dataFormatada}</span>

                        {/* Botão de Edição: Apenas o usuário autor da observação */}
                        {isAutor && (
                          <button
                            type="button"
                            onClick={(e) => abrirEdicao(obs, e)}
                            className="p-1 text-slate-400 hover:text-school-blue-600 transition-colors ml-1"
                            title="Editar Observação (Apenas o autor)"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                        )}

                        {/* Botão de Exclusão com Auditoria */}
                        {canDelete && (
                          <button
                            type="button"
                            onClick={(e) => handleExcluir(obs, e)}
                            className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                            title="Excluir (Gera log de auditoria)"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}

                        <span className="text-slate-300 dark:text-slate-600 text-xs ml-1">|</span>
                        <span className="text-[10px] font-semibold text-school-blue-600 dark:text-school-blue-400 flex items-center gap-0.5">
                          <Eye className="h-3 w-3" /> Ler
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line line-clamp-3">
                      {obs.texto_completo || obs.texto}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal 1: Leitura Integral da Observação */}
      {observacaoLeitura && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="relative w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2">
                {(() => {
                  const catKey = (observacaoLeitura.categoria || observacaoLeitura.tipo || 'geral') as TipoObservacaoAluno;
                  const conf = CATEGORIAS_CONFIG[catKey] || CATEGORIAS_CONFIG.geral;
                  const Icon = conf.icon;
                  return (
                    <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold uppercase ${conf.bg} ${conf.cor} border ${conf.border}`}>
                      <Icon className="h-3.5 w-3.5" />
                      {conf.label}
                    </span>
                  );
                })()}
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  Registro Integral no Histórico
                </h3>
              </div>
              <button
                onClick={() => setObservacaoLeitura(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl">
              <User className="h-4 w-4 text-slate-400 shrink-0" />
              <div>
                Registrado por <strong>{observacaoLeitura.autor_nome || 'Usuário'}</strong> ({observacaoLeitura.autor_cargo || 'Autor'})
                <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                  <Clock className="h-3 w-3" />
                  {observacaoLeitura.created_at || observacaoLeitura.data_registro 
                    ? new Date(observacaoLeitura.created_at || observacaoLeitura.data_registro).toLocaleString('pt-BR', { dateStyle: 'long', timeStyle: 'short' })
                    : 'Data recente'}
                </div>
              </div>
            </div>

            <div className="max-h-[50vh] overflow-y-auto rounded-xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-950/40">
              <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap font-normal">
                {observacaoLeitura.texto_completo || observacaoLeitura.texto}
              </p>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                {currentUser.id === (observacaoLeitura.usuario_id || observacaoLeitura.autor_id) && (
                  <button
                    type="button"
                    onClick={() => abrirEdicao(observacaoLeitura)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-school-blue-300 bg-school-blue-50 px-3 py-1.5 text-xs font-bold text-school-blue-700 hover:bg-school-blue-100 dark:border-school-blue-800 dark:bg-school-blue-950/50 dark:text-school-blue-300"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    <span>Editar Anotação</span>
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setObservacaoLeitura(null)}
                className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Edição da Observação (Apenas o autor) */}
      {observacaoEditando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="relative w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Edit3 className="h-5 w-5 text-school-blue-600 dark:text-school-gold-400" />
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  Editar Observação & Registrar Auditoria
                </h3>
              </div>
              <button
                onClick={() => setObservacaoEditando(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex items-center gap-2 rounded-xl bg-blue-50 p-3 text-xs text-school-blue-800 border border-blue-200 dark:bg-blue-950/40 dark:border-blue-900 dark:text-blue-300">
              <ShieldCheck className="h-4 w-4 shrink-0 text-school-blue-600" />
              <span>
                O texto anterior será preservado com carimbo de data/hora e identificação do seu usuário na tabela de auditoria pedagógica.
              </span>
            </div>

            <form onSubmit={handleSalvarEdicao} className="space-y-4">
              <textarea
                rows={6}
                value={textoEditado}
                onChange={(e) => setTextoEditado(e.target.value)}
                placeholder="Edite o texto da observação..."
                className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-900 focus:border-school-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white shadow-sm leading-relaxed"
                required
              />

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setObservacaoEditando(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvandoEdicao || !textoEditado.trim()}
                  className="rounded-xl bg-school-blue-700 px-5 py-2 text-xs font-bold text-white hover:bg-school-blue-800 disabled:opacity-50"
                >
                  {salvandoEdicao ? 'Gravando e Auditando...' : 'Salvar Alteração'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
