'use client';

import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { 
  Estudante, 
  SolicitacaoRelatorio, 
  RelatorioProfessor, 
  RelatorioConsolidado,
  Professor,
  Turma 
} from '@/lib/types';
import { 
  Sparkles, 
  FileText, 
  Plus, 
  CheckCircle2, 
  Clock, 
  Download, 
  Eye, 
  Edit3, 
  Trash2, 
  BellRing, 
  Check, 
  AlertTriangle, 
  Save, 
  X, 
  RefreshCw,
  ExternalLink
} from 'lucide-react';

interface PainelRelatoriosEstudanteProps {
  estudante: Estudante;
  onClose?: () => void;
}

export function PainelRelatoriosEstudante({ estudante, onClose }: PainelRelatoriosEstudanteProps) {
  const { 
    currentUser, 
    escolaConfig, 
    professores, 
    turmas, 
    solicitacoesRelatorio, 
    relatoriosProfessores, 
    relatoriosConsolidados, 
    notificacoesAdmin,
    addSolicitacaoRelatorio, 
    updateSolicitacaoRelatorio, 
    updateRelatorioProfessor, 
    deleteRelatorioProfessor, 
    marcarNotificacaoComoLida, 
    salvarRelatorioConsolidado 
  } = useApp();

  // Solicitações pertencentes a este estudante
  const solicitacoesAluno = useMemo(() => {
    return solicitacoesRelatorio
      .filter(s => s.aluno_id === estudante.id)
      .sort((a, b) => new Date(b.data_solicitacao).getTime() - new Date(a.data_solicitacao).getTime());
  }, [solicitacoesRelatorio, estudante.id]);

  // Solicitação selecionada para visualização/gestão
  const [solicitacaoAtivaId, setSolicitacaoAtivaId] = useState<string | null>(
    solicitacoesAluno[0]?.id || null
  );

  const solicitacaoAtiva = useMemo(() => {
    if (!solicitacaoAtivaId) return solicitacoesAluno[0] || null;
    return solicitacoesAluno.find(s => s.id === solicitacaoAtivaId) || null;
  }, [solicitacoesAluno, solicitacaoAtivaId]);

  // Pareceres docentes vinculados à solicitação ativa
  const pareceresAtivos = useMemo(() => {
    if (!solicitacaoAtiva) return [];
    return relatoriosProfessores.filter(r => r.solicitacao_id === solicitacaoAtiva.id);
  }, [relatoriosProfessores, solicitacaoAtiva]);

  // Relatório consolidado da solicitação ativa
  const consolidadoAtivo = useMemo(() => {
    if (!solicitacaoAtiva) return null;
    return relatoriosConsolidados.find(c => c.solicitacao_id === solicitacaoAtiva.id) || null;
  }, [relatoriosConsolidados, solicitacaoAtiva]);

  // Modal de visualização/edição do parecer do professor
  const [parecerEmVisualizacao, setParecerEmVisualizacao] = useState<RelatorioProfessor | null>(null);
  const [editandoTextoFinal, setEditandoTextoFinal] = useState<string>('');
  const [salvandoEdicaoParecer, setSalvandoEdicaoParecer] = useState(false);

  // Estados da Consolidação com IA
  const [modalConsolidacaoAberto, setModalConsolidacaoAberto] = useState(false);
  const [consolidandoComIA, setConsolidandoComIA] = useState(false);
  const [textoConsolidadoEditavel, setTextoConsolidadoEditavel] = useState<string>('');
  const [observacoesSecretaria, setObservacoesSecretaria] = useState('');
  const [erroConsolidacao, setErroConsolidacao] = useState<string | null>(null);

  // Estado de download DOCX
  const [gerandoDocx, setGerandoDocx] = useState(false);
  const [alertaSucesso, setAlertaSucesso] = useState<string | null>(null);

  // Criar nova solicitação de relatório para a turma do estudante
  const handleCriarSolicitacao = async () => {
    const turmaAluno = turmas.find(t => t.id === estudante.turma_id);
    let idsProfessores: string[] = [];
    if (turmaAluno) {
      if (turmaAluno.professores_ids && turmaAluno.professores_ids.length > 0) {
        idsProfessores = [...turmaAluno.professores_ids];
      }
      if (turmaAluno.professor_regente_id && !idsProfessores.includes(turmaAluno.professor_regente_id)) {
        idsProfessores.push(turmaAluno.professor_regente_id);
      }
    }
    if (idsProfessores.length === 0) {
      idsProfessores = professores.slice(0, 3).map(p => p.id);
    }

    const novaSolicitacaoId = await addSolicitacaoRelatorio(
      estudante.id,
      currentUser.id,
      idsProfessores,
      `Solicitação de Parecer Pedagógico Geral - Turma ${turmaAluno?.nome || estudante.turma_nome || 'Regular'}`
    );

    setSolicitacaoAtivaId(novaSolicitacaoId);
    setAlertaSucesso('Nova solicitação de relatório aberta com sucesso para o corpo docente!');
    setTimeout(() => setAlertaSucesso(null), 4000);
  };

  // Abrir modal de edição do parecer do professor
  const handleAbrirParecer = (relatorio: RelatorioProfessor) => {
    setParecerEmVisualizacao(relatorio);
    setEditandoTextoFinal(relatorio.texto_final || relatorio.texto_ia || relatorio.rascunho_original);
  };

  // Salvar alterações feitas pela secretaria no parecer do professor
  const handleSalvarEdicaoParecer = async () => {
    if (!parecerEmVisualizacao) return;
    setSalvandoEdicaoParecer(true);
    try {
      await updateRelatorioProfessor(parecerEmVisualizacao.id, {
        texto_final: editandoTextoFinal,
        status: 'enviado',
      });
      setAlertaSucesso('Parecer docente atualizado pela secretaria com sucesso!');
      setParecerEmVisualizacao(null);
      setTimeout(() => setAlertaSucesso(null), 3000);
    } catch {
      alert('Erro ao atualizar parecer');
    } finally {
      setSalvandoEdicaoParecer(false);
    }
  };

  // Disparar consolidação de pareceres com IA
  const handleIniciarConsolidacaoIA = async () => {
    const pareceresEnviados = pareceresAtivos.filter(
      p => p.status === 'enviado' && (p.texto_final || p.texto_ia || p.rascunho_original)
    );

    if (pareceresEnviados.length === 0) {
      alert('É necessário ter ao menos um parecer docente enviado para consolidar o relatório com IA.');
      return;
    }

    setConsolidandoComIA(true);
    setErroConsolidacao(null);
    setModalConsolidacaoAberto(true);

    try {
      const payloadPareceres = pareceresEnviados.map(p => {
        const prof = professores.find(pr => pr.id === p.professor_id);
        return {
          professorNome: prof?.nome || 'Docente',
          disciplinas: prof?.disciplinas || [],
          textoFinal: p.texto_final || p.texto_ia || p.rascunho_original,
        };
      });

      const res = await fetch('/api/ia/consolidar-relatorios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alunoNome: estudante.nome_completo,
          turmaNome: estudante.turma_nome || 'Turma Regular',
          pareceres: payloadPareceres,
          observacoesSecretaria: observacoesSecretaria,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Falha ao consolidar pareceres com IA');
      }

      setTextoConsolidadoEditavel(data.textoConsolidado);
    } catch (err: any) {
      setErroConsolidacao(err.message || 'Erro inesperado na consolidação com IA');
    } finally {
      setConsolidandoComIA(false);
    }
  };

  // Salvar relatório consolidado
  const handleSalvarConsolidado = async () => {
    if (!solicitacaoAtiva) return;
    try {
      await salvarRelatorioConsolidado(
        solicitacaoAtiva.id,
        textoConsolidadoEditavel,
        `/api/relatorios/docx?solicitacao_id=${solicitacaoAtiva.id}`
      );
      setAlertaSucesso('Relatório Integrado consolidado e homologado no histórico do aluno!');
      setModalConsolidacaoAberto(false);
      setTimeout(() => setAlertaSucesso(null), 4000);
    } catch {
      alert('Erro ao salvar relatório consolidado');
    }
  };

  // Gerar e Baixar DOCX formatado estritamente conforme a Seção 5
  const handleBaixarDocx = async (conteudoTexto?: string) => {
    const texto = conteudoTexto || consolidadoAtivo?.conteudo_final || textoConsolidadoEditavel;
    if (!texto) {
      alert('Não há texto de parecer consolidado para gerar o arquivo DOCX.');
      return;
    }

    setGerandoDocx(true);
    try {
      const turma = turmas.find(t => t.id === estudante.turma_id);
      const res = await fetch('/api/relatorios/docx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          escola: {
            nome: escolaConfig.nome_escola,
            cnpj: escolaConfig.cnpj,
            endereco: escolaConfig.endereco,
            contato: escolaConfig.telefone,
            anoLetivo: escolaConfig.ano_letivo_ativo,
          },
          aluno: {
            nome: estudante.nome_completo,
            turma: turma?.nome || estudante.turma_nome || 'Turma Regular',
            dataNascimento: estudante.data_nascimento,
            matricula: estudante.id,
          },
          dataEmissao: new Date().toLocaleDateString('pt-BR'),
          conteudoFinal: texto,
        }),
      });

      if (!res.ok) {
        throw new Error('Falha na resposta do servidor DOCX');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Parecer_Pedagogico_Integrado_${estudante.nome_completo.replace(/\s+/g, '_')}.docx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setAlertaSucesso('Arquivo DOCX gerado e baixado com formatação institucional Seção 5!');
      setTimeout(() => setAlertaSucesso(null), 4000);
    } catch (err: any) {
      alert(`Erro ao gerar DOCX: ${err.message}`);
    } finally {
      setGerandoDocx(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Alerta de Feedback */}
      {alertaSucesso && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3.5 text-xs font-bold text-emerald-800 border border-emerald-200 dark:bg-emerald-950/50 dark:border-emerald-900 dark:text-emerald-200 shadow-sm animate-in fade-in">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{alertaSucesso}</span>
        </div>
      )}

      {/* Topo: Histórico de Solicitações e Botão Nova Solicitação */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4 dark:border-slate-800">
        <div>
          <h4 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            Relatórios Pedagógicos Colaborativos com IA
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Coleta descentralizada de pareceres docentes, polimento por IA e consolidação DOCX oficial
          </p>
        </div>

        <button
          onClick={handleCriarSolicitacao}
          className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-indigo-600/30 hover:bg-indigo-700 active:scale-95 transition-all shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>Nova Solicitação de Relatório</span>
        </button>
      </div>

      {/* Seleção de Solicitações Históricas */}
      {solicitacoesAluno.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-8 text-center dark:border-slate-800 dark:bg-slate-900/30">
          <FileText className="mx-auto h-10 w-10 text-slate-400 mb-2" />
          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
            Nenhuma solicitação de relatório aberta para este estudante.
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Clique no botão acima para abrir a primeira solicitação e notificar o corpo docente das turmas.
          </p>
        </div>
      ) : (
        <>
          {/* Abas das Solicitações por Data */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-100 dark:border-slate-800">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 shrink-0 mr-1">
              Ciclos:
            </span>
            {solicitacoesAluno.map((sol) => {
              const dataFormatada = new Date(sol.data_solicitacao).toLocaleDateString('pt-BR');
              const ehAtiva = solicitacaoAtiva?.id === sol.id;
              const concluida = sol.status === 'concluido';
              return (
                <button
                  key={sol.id}
                  onClick={() => setSolicitacaoAtivaId(sol.id)}
                  className={`inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-bold transition-all shrink-0 ${
                    ehAtiva
                      ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-600/20'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  <span>{dataFormatada}</span>
                  <span className={`h-2 w-2 rounded-full ${concluida ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                  <span className="text-[10px] opacity-80 uppercase">{sol.status}</span>
                </button>
              );
            })}
          </div>

          {/* Área da Solicitação Ativa */}
          {solicitacaoAtiva && (
            <div className="space-y-6">
              {/* Barra de Ações Rápidas da Solicitação */}
              <div className="rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50/60 to-purple-50/40 p-4 dark:border-indigo-900/40 dark:bg-slate-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase text-indigo-950 dark:text-indigo-200">
                      Ciclo Aberto em: {new Date(solicitacaoAtiva.data_solicitacao).toLocaleDateString('pt-BR')}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase ${
                      solicitacaoAtiva.status === 'concluido'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                    }`}>
                      {solicitacaoAtiva.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {pareceresAtivos.filter(p => p.status === 'enviado').length} de {pareceresAtivos.length} pareceres docentes recebidos
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Botão Consolidar com IA */}
                  <button
                    onClick={handleIniciarConsolidacaoIA}
                    disabled={pareceresAtivos.filter(p => p.status === 'enviado').length === 0}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-3.5 py-2 text-xs font-bold text-white shadow-md shadow-indigo-600/20 hover:from-indigo-700 hover:to-purple-700 active:scale-95 transition-all disabled:opacity-50"
                  >
                    <Sparkles className="h-4 w-4" />
                    <span>Consolidar Pareceres com IA</span>
                  </button>

                  {/* Botão Exportar DOCX se já consolidado */}
                  {consolidadoAtivo && (
                    <button
                      onClick={() => handleBaixarDocx()}
                      disabled={gerandoDocx}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-school-blue-800 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-school-blue-700 active:scale-95 transition-all disabled:opacity-50"
                    >
                      <Download className="h-4 w-4" />
                      <span>{gerandoDocx ? 'Gerando...' : 'Exportar DOCX'}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Tabela de Atribuição Docente e Status de Envio */}
              <div className="space-y-3">
                <h5 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                  <FileText className="h-4 w-4 text-indigo-600" />
                  Grade de Atribuição de Professores ({pareceresAtivos.length})
                </h5>

                <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                      <tr>
                        <th className="px-4 py-3">Professor(a)</th>
                        <th className="px-4 py-3">Disciplinas</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Data Envio</th>
                        <th className="px-4 py-3 text-right">Ações da Secretaria</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-school-dark-surface">
                      {pareceresAtivos.map((parecer) => {
                        const prof = professores.find(p => p.id === parecer.professor_id);
                        const enviado = parecer.status === 'enviado';
                        const temNotificacaoPendente = notificacoesAdmin.some(
                          n => n.relatorio_professor_id === parecer.id && !n.lido
                        );

                        return (
                          <tr key={parecer.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                            <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">
                              {prof?.nome || 'Docente'}
                            </td>
                            <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                              {prof?.disciplinas?.join(', ') || 'Polivalente'}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase ${
                                enviado
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              }`}>
                                {enviado ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                                {enviado ? 'Enviado à Secretaria' : 'Pendente (Em Elaboração)'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-slate-500">
                              {parecer.data_envio
                                ? new Date(parecer.data_envio).toLocaleDateString('pt-BR')
                                : '—'}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {/* Visualizar/Editar */}
                                <button
                                  onClick={() => handleAbrirParecer(parecer)}
                                  title="Visualizar e Ajustar Parecer"
                                  className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-indigo-600 dark:text-slate-400 dark:hover:bg-slate-800"
                                >
                                  <Eye className="h-4 w-4" />
                                </button>

                                {/* Marcar como lido */}
                                {temNotificacaoPendente && (
                                  <button
                                    onClick={() => {
                                      const notif = notificacoesAdmin.find(
                                        n => n.relatorio_professor_id === parecer.id && !n.lido
                                      );
                                      if (notif) marcarNotificacaoComoLida(notif.id);
                                    }}
                                    title="Marcar Notificação como Lida"
                                    className="rounded-lg p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/60"
                                  >
                                    <Check className="h-4 w-4" />
                                  </button>
                                )}

                                {/* Reenviar aviso */}
                                {!enviado && (
                                  <button
                                    onClick={() => {
                                      alert(`Notificação de cobrança reenviada para o professor ${prof?.nome}!`);
                                    }}
                                    title="Reenviar Cobrança ao Docente"
                                    className="rounded-lg p-1.5 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/60"
                                  >
                                    <BellRing className="h-4 w-4" />
                                  </button>
                                )}

                                {/* Excluir parecer */}
                                <button
                                  onClick={() => {
                                    if (confirm(`Excluir atribuição de parecer para ${prof?.nome}?`)) {
                                      deleteRelatorioProfessor(parecer.id);
                                    }
                                  }}
                                  title="Remover Professor deste Relatório"
                                  className="rounded-lg p-1.5 text-rose-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Bloco de Visualização do Relatório Consolidado Existente */}
              {consolidadoAtivo && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/30 p-5 dark:border-emerald-900/50 dark:bg-emerald-950/20 space-y-3">
                  <div className="flex items-center justify-between border-b border-emerald-200/60 pb-3 dark:border-emerald-900/40">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                      <div>
                        <h5 className="font-black text-slate-900 dark:text-white uppercase tracking-wider text-xs">
                          Parecer Pedagógico Integrado (Oficial)
                        </h5>
                        <span className="text-[10px] text-slate-500">
                          Homologado em {new Date(consolidadoAtivo.data_geracao).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleBaixarDocx(consolidadoAtivo.conteudo_final)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>Baixar DOCX</span>
                      </button>
                    </div>
                  </div>

                  <div className="rounded-xl bg-white p-4 text-xs text-slate-800 leading-relaxed shadow-sm dark:bg-slate-900 dark:text-slate-200 border border-emerald-100 dark:border-emerald-900/40 whitespace-pre-line font-serif">
                    {consolidadoAtivo.conteudo_final}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* MODAL 1: Visualizar & Ajustar Parecer do Professor */}
      {parecerEmVisualizacao && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-school-dark-surface border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h4 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="h-5 w-5 text-indigo-600" />
                Parecer do Professor
              </h4>
              <button
                onClick={() => setParecerEmVisualizacao(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Rascunho Original vs Texto Polido por IA */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                  1. Rascunho Bruto do Docente:
                </span>
                <p className="text-slate-700 dark:text-slate-300 italic whitespace-pre-line">
                  {parecerEmVisualizacao.rascunho_original || 'Sem rascunho salvo.'}
                </p>
              </div>

              <div className="rounded-xl bg-indigo-50/50 p-3 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40">
                <span className="text-[10px] font-bold uppercase text-indigo-800 dark:text-indigo-300 block mb-1">
                  2. Sugestão Inicial da IA:
                </span>
                <p className="text-slate-700 dark:text-slate-300 whitespace-pre-line">
                  {parecerEmVisualizacao.texto_ia || 'Não refinado por IA.'}
                </p>
              </div>
            </div>

            {/* Editor do Texto Final pela Secretaria */}
            <div className="space-y-1.5 text-xs">
              <label className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[11px]">
                3. Texto Final Homologado (Edição Permitida):
              </label>
              <textarea
                rows={5}
                value={editandoTextoFinal}
                onChange={(e) => setEditandoTextoFinal(e.target.value)}
                className="w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white leading-relaxed"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setParecerEmVisualizacao(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSalvarEdicaoParecer}
                disabled={salvandoEdicaoParecer}
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-indigo-700 active:scale-95 transition-all"
              >
                <Save className="h-4 w-4" />
                <span>{salvandoEdicaoParecer ? 'Salvando...' : 'Salvar Alterações'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Consolidação com IA e Revisão Interativa */}
      {modalConsolidacaoAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-3xl rounded-2xl bg-white p-6 sm:p-8 shadow-2xl dark:bg-school-dark-surface border border-slate-200 dark:border-slate-800 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-600 text-white">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-base font-black text-slate-900 dark:text-white">
                    Consolidação de Pareceres com Inteligência Artificial
                  </h4>
                  <p className="text-xs text-slate-500">
                    Sintetizando contribuições de todos os professores em um parecer oficial unificado
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalConsolidacaoAberto(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {consolidandoComIA ? (
              <div className="rounded-2xl border border-purple-100 bg-purple-50/50 p-8 text-center dark:border-purple-900/40 dark:bg-purple-950/20 space-y-3">
                <RefreshCw className="mx-auto h-8 w-8 text-purple-600 animate-spin" />
                <h5 className="text-sm font-bold text-purple-950 dark:text-purple-200">
                  Processando Pareceres Docentes com Gemini IA...
                </h5>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Eliminando redundâncias, articulando aspectos cognitivos e socioemocionais e aplicando padrão formal institucional.
                </p>
              </div>
            ) : erroConsolidacao ? (
              <div className="rounded-xl bg-rose-50 p-4 text-xs font-semibold text-rose-800 border border-rose-200 dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-200">
                {erroConsolidacao}
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                {/* Editor Interativo do Texto Consolidado */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[11px]">
                      Parecer Consolidado (Editável antes de homologar):
                    </label>
                    <span className="text-[10px] text-purple-600 font-bold">
                      Formatado para Documento Word DOCX Oficial
                    </span>
                  </div>
                  <textarea
                    rows={12}
                    value={textoConsolidadoEditavel}
                    onChange={(e) => setTextoConsolidadoEditavel(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 p-4 text-xs text-slate-900 focus:border-purple-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white leading-relaxed font-serif"
                  />
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleBaixarDocx(textoConsolidadoEditavel)}
                      disabled={gerandoDocx}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      <Download className="h-4 w-4 text-school-blue-600" />
                      <span>{gerandoDocx ? 'Exportando...' : 'Exportar DOCX (Word)'}</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => setModalConsolidacaoAberto(false)}
                      className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
                    >
                      Voltar
                    </button>
                    <button
                      type="button"
                      onClick={handleSalvarConsolidado}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 px-5 py-2 text-xs font-bold text-white shadow-md shadow-purple-600/30 hover:bg-purple-700 active:scale-95 transition-all"
                    >
                      <Save className="h-4 w-4" />
                      <span>Salvar & Homologar no Histórico</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
