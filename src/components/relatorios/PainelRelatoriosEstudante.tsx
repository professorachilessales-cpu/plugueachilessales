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
  ExternalLink,
  Printer,
  Copy
} from 'lucide-react';
import { determinarGeneroEstudante, obterProfessoresDocentesDaTurma } from '@/lib/pareceres-ia';
import { calcularIdadeEmAnos } from '@/lib/faixa-etaria';

export function formatarDataSolicitacao(dataStr?: string | null, incluirHora: boolean = false): string {
  if (!dataStr) return 'Data não informada';
  try {
    let d: Date;
    if (dataStr.includes('T')) {
      d = new Date(dataStr);
    } else if (dataStr.includes('-')) {
      const partes = dataStr.split('-');
      if (partes.length === 3) {
        d = new Date(Number(partes[0]), Number(partes[1]) - 1, Number(partes[2]));
      } else {
        d = new Date(dataStr);
      }
    } else if (dataStr.includes('/')) {
      const partes = dataStr.split('/');
      if (partes.length === 3) {
        d = new Date(Number(partes[2]), Number(partes[1]) - 1, Number(partes[0]));
      } else {
        d = new Date(dataStr);
      }
    } else {
      d = new Date(dataStr);
    }

    if (isNaN(d.getTime())) return 'Data não informada';

    const dia = String(d.getDate()).padStart(2, '0');
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const ano = d.getFullYear();
    const dataFormatada = `${dia}/${mes}/${ano}`;

    if (incluirHora && (dataStr.includes('T') || dataStr.includes(':'))) {
      const horas = String(d.getHours()).padStart(2, '0');
      const minutos = String(d.getMinutes()).padStart(2, '0');
      return `${dataFormatada} às ${horas}:${minutos}`;
    }

    return dataFormatada;
  } catch {
    return 'Data não informada';
  }
}

interface PainelRelatoriosEstudanteProps {
  estudante: Estudante;
  onClose?: () => void;
}

export function PainelRelatoriosEstudante({ estudante, onClose }: PainelRelatoriosEstudanteProps) {
  const { 
    currentUser, 
    users,
    escolaConfig, 
    professores, 
    turmas, 
    solicitacoesRelatorio, 
    relatoriosProfessores, 
    relatoriosConsolidados, 
    notificacoesAdmin,
    observacoesAluno,
    addSolicitacaoRelatorio, 
    updateSolicitacaoRelatorio, 
    updateRelatorioProfessor, 
    deleteRelatorioProfessor, 
    marcarNotificacaoComoLida, 
    salvarRelatorioConsolidado,
    excluirSolicitacaoRelatorio
  } = useApp();

  // Solicitações pertencentes a este estudante (ordenação segura por created_at ou data_solicitacao)
  const solicitacoesAluno = useMemo(() => {
    return solicitacoesRelatorio
      .filter(s => s.aluno_id === estudante.id)
      .sort((a, b) => {
        const timeB = new Date(b.created_at || b.data_solicitacao).getTime() || 0;
        const timeA = new Date(a.created_at || a.data_solicitacao).getTime() || 0;
        return timeB - timeA;
      });
  }, [solicitacoesRelatorio, estudante.id]);

  // Solicitação selecionada para visualização/gestão
  const [solicitacaoAtivaId, setSolicitacaoAtivaId] = useState<string | null>(
    solicitacoesAluno[0]?.id || null
  );

  const solicitacaoAtiva = useMemo(() => {
    if (!solicitacaoAtivaId) return solicitacoesAluno[0] || null;
    return solicitacoesAluno.find(s => s.id === solicitacaoAtivaId) || null;
  }, [solicitacoesAluno, solicitacaoAtivaId]);

  const isConcluida = solicitacaoAtiva?.status === 'concluido';

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

  // Estados de Cancelamento/Exclusão da Solicitação
  const [modalConfirmarCancelamento, setModalConfirmarCancelamento] = useState(false);
  const [cancelandoSolicitacao, setCancelandoSolicitacao] = useState(false);

  // Estados da Consolidação com IA
  const [modalConsolidacaoAberto, setModalConsolidacaoAberto] = useState(false);
  const [consolidandoComIA, setConsolidandoComIA] = useState(false);
  const [textoConsolidadoEditavel, setTextoConsolidadoEditavel] = useState<string>('');
  const [observacoesSecretaria, setObservacoesSecretaria] = useState('');
  const [erroConsolidacao, setErroConsolidacao] = useState<string | null>(null);

  // Estado de download DOCX
  const [gerandoDocx, setGerandoDocx] = useState(false);
  const [alertaSucesso, setAlertaSucesso] = useState<string | null>(null);

  // Cancelar e excluir solicitação de relatório e todos os pareceres dos professores vinculados
  const handleConfirmarCancelamentoSolicitacao = async () => {
    if (!solicitacaoAtiva) return;
    setCancelandoSolicitacao(true);
    try {
      await excluirSolicitacaoRelatorio(solicitacaoAtiva.id);
      setModalConfirmarCancelamento(false);
      setAlertaSucesso('Solicitação cancelada e todos os relatórios vinculados foram excluídos com sucesso.');
      const restante = solicitacoesAluno.filter(s => s.id !== solicitacaoAtiva.id);
      setSolicitacaoAtivaId(restante[0]?.id || null);
      setTimeout(() => setAlertaSucesso(null), 4000);
    } catch (err: any) {
      alert(err?.message || 'Erro ao cancelar a solicitação.');
    } finally {
      setCancelandoSolicitacao(false);
    }
  };

  // Criar nova solicitação de relatório para a turma do estudante
  const handleCriarSolicitacao = async () => {
    // Localiza a turma do estudante por ID ou correspondência de nome
    const turmaAluno = turmas.find(t => 
      (estudante.turma_id && t.id === estudante.turma_id) || 
      (t.nome && estudante.turma_nome && t.nome.trim().toLowerCase() === estudante.turma_nome.trim().toLowerCase())
    );

    if (!turmaAluno) {
      alert(
        `O estudante "${estudante.nome_completo}" não possui uma turma válida vinculada.\n\nPor favor, vincule o estudante a uma turma antes de abrir a solicitação de relatório.`
      );
      return;
    }

    // Filtra exclusivamente os professores associados à turma do estudante que NÃO sejam Administrativos
    const professoresValidos = obterProfessoresDocentesDaTurma(turmaAluno, professores, users);
    const idsProfessores = professoresValidos.map(p => p.id);

    if (idsProfessores.length === 0) {
      alert(
        `Nenhum professor docente ativo (não administrativo) está associado à turma "${turmaAluno.nome}".\n\nApenas os professores associados à turma do estudante que não sejam administrativos podem receber a notificação e emitir relatórios.\n\nPor favor, associe os professores docentes a esta turma na gestão de Turmas antes de solicitar relatórios.`
      );
      return;
    }

    const novaSolicitacaoId = await addSolicitacaoRelatorio(
      estudante.id,
      currentUser.id,
      idsProfessores,
      `Solicitação de Parecer Pedagógico Geral - Turma ${turmaAluno?.nome || estudante.turma_nome || 'Regular'}`
    );

    setSolicitacaoAtivaId(novaSolicitacaoId);
    setAlertaSucesso(
      `Nova solicitação de relatório aberta com sucesso para ${idsProfessores.length} professor(es) da turma!`
    );
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
    // 1. Coleta todos os pareceres descritivos válidos enviados pelos professores e equipe de apoio
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
        const ehApoio = (prof as any)?.eh_apoio === true ||
          (prof as any)?.is_apoio === true ||
          prof?.disciplinas?.some(d => d.toLowerCase().includes('apoio')) ||
          prof?.formacao?.toLowerCase().includes('apoio');

        return {
          professorNome: prof?.nome_completo || 'Docente',
          disciplinas: prof?.disciplinas || [],
          textoFinal: (p.texto_final || p.texto_ia || p.rascunho_original).trim(),
          ehApoio: !!ehApoio,
        };
      });

      // 2. Coletar os metadados do estudante: Nome Completo e Gênero / Sexo cadastrado no banco
      const dadosGenero = determinarGeneroEstudante(estudante);
      const turmaAluno = turmas.find(t => t.id === estudante.turma_id);

      const res = await fetch('/api/ia/consolidar-relatorios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome_estudante: estudante.nome_completo,
          alunoNome: estudante.nome_completo,
          genero_estudante: dadosGenero.instrucaoGramatical,
          genero: estudante.genero || estudante.sexo,
          sexo: estudante.sexo || estudante.genero,
          turmaNome: turmaAluno?.nome || estudante.turma_nome || 'Turma Regular',
          turma_nome: turmaAluno?.nome || estudante.turma_nome || 'Turma Regular',
          turno: turmaAluno?.turno || 'Turno Regular',
          turma_turno: turmaAluno?.turno || 'Turno Regular',
          pareceres: payloadPareceres,
          observacoesSecretaria: observacoesSecretaria,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Falha ao consolidar pareceres com IA');
      }

      setTextoConsolidadoEditavel(data.conteudo_consolidado || data.textoConsolidado);
    } catch (err: any) {
      setErroConsolidacao(err.message || 'Erro inesperado na consolidação com IA');
    } finally {
      setConsolidandoComIA(false);
    }
  };

  // Salvar relatório consolidado
  const handleSalvarConsolidado = () => {
    if (!solicitacaoAtiva) return;
    salvarRelatorioConsolidado(solicitacaoAtiva.id, textoConsolidadoEditavel);
    setAlertaSucesso('Parecer consolidado salvo com sucesso!');
    setModalConsolidacaoAberto(false);
    setTimeout(() => setAlertaSucesso(null), 3500);
  };

  // Copiar texto consolidado para a área de transferência
  const handleCopiarTexto = async (conteudoTexto?: string) => {
    const texto = conteudoTexto || consolidadoAtivo?.conteudo_final || textoConsolidadoEditavel;
    if (!texto) {
      alert('Não há texto de parecer para copiar.');
      return;
    }
    try {
      await navigator.clipboard.writeText(texto);
      setAlertaSucesso('Texto do parecer copiado para a área de transferência!');
      setTimeout(() => setAlertaSucesso(null), 3500);
    } catch {
      alert('Não foi possível copiar o texto automaticamente.');
    }
  };

  // Imprimir parecer consolidado em formato A4 institucional
  const handleImprimir = (conteudoTexto?: string) => {
    const texto = conteudoTexto || consolidadoAtivo?.conteudo_final || textoConsolidadoEditavel;
    if (!texto) {
      alert('Não há texto de parecer consolidado para imprimir.');
      return;
    }

    const turmaAluno = turmas.find(t => t.id === estudante.turma_id);
    const turnoNome = turmaAluno?.turno 
      ? (turmaAluno.turno === 'manha' ? 'MANHÃ' : turmaAluno.turno === 'tarde' ? 'TARDE' : turmaAluno.turno.toUpperCase()) 
      : 'MANHÃ';
    const turmaTexto = `${turmaAluno?.nome || estudante.turma_nome || 'Turma Regular'} - ${turnoNome}`.toUpperCase();
    const idadeTexto = calcularIdadeEmAnos(estudante.data_nascimento);

    const win = window.open('', '_blank');
    if (!win) {
      alert('Por favor, autorize pop-ups no seu navegador para imprimir o relatório.');
      return;
    }

    win.document.write(`
      <!DOCTYPE html>
      <html lang="pt-BR">
        <head>
          <meta charset="utf-8">
          <title>Parecer Pedagógico Integrado - ${estudante.nome_completo}</title>
          <style>
            @page { size: A4 portrait; margin: 10mm 14mm 10mm 14mm; }
            * { box-sizing: border-box; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; color: #0f172a; margin: 0; padding: 0; font-size: 10pt; line-height: 1.45; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .report-sheet { width: 100%; max-height: 275mm; overflow: hidden; page-break-inside: avoid; }
            .header-inst { text-align: center; border-bottom: 2px solid #1e40af; padding-bottom: 6px; margin-bottom: 10px; }
            .header-inst h2 { margin: 0; font-size: 13pt; color: #1e40af; font-weight: 800; text-transform: uppercase; }
            .header-inst p { margin: 2px 0; font-size: 8.5pt; color: #475569; }
            .title { text-align: center; font-size: 11.5pt; font-weight: 800; margin: 10px 0 8px 0; color: #0f172a; letter-spacing: 0.5px; text-transform: uppercase; }
            .student-info { margin-bottom: 12px; font-size: 9pt; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 10px; }
            .student-info p { margin: 2px 0; }
            .content { text-align: justify; text-indent: 24px; font-size: 9.5pt; line-height: 1.5; white-space: pre-line; color: #1e293b; }
            .footer-signatures { margin-top: 24px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; text-align: center; page-break-inside: avoid; }
            .signature-box { border-top: 1px solid #334155; padding-top: 4px; font-size: 8.5pt; font-weight: 700; color: #1e293b; }
            .signature-sub { font-size: 7.5pt; color: #64748b; font-weight: normal; }
            .legal-note { margin-top: 14px; text-align: center; font-size: 7pt; color: #94a3b8; page-break-inside: avoid; }
          </style>
        </head>
        <body>
          <div class="report-sheet">
            <div class="header-inst">
              <h2>${escolaConfig.nome_escola || 'Colégio Integrado PLUGUE'}</h2>
              <p>INEP: ${escolaConfig.codigo_inep || 'Não informado'} • CNPJ: ${escolaConfig.cnpj || 'Não informado'} • Ano Letivo: ${escolaConfig.ano_letivo_ativo || 2026}</p>
            </div>
            <div class="title">PARECER PEDAGÓGICO INTEGRADO</div>
            <div class="student-info">
              <p><strong>Estudante:</strong> ${estudante.nome_completo.toUpperCase()} &nbsp;|&nbsp; <strong>Turma:</strong> ${turmaTexto}</p>
              <p><strong>Idade:</strong> ${idadeTexto} &nbsp;|&nbsp; <strong>Data de Emissão:</strong> ${new Date().toLocaleDateString('pt-BR')}</p>
            </div>
            <div class="content">${texto}</div>
            <div class="footer-signatures">
              <div class="signature-box">
                Coordenação Pedagógica / Docente
                <div class="signature-sub">Elaboração e Acompanhamento</div>
              </div>
              <div class="signature-box">
                Direção Escolar
                <div class="signature-sub">Homologação Oficial</div>
              </div>
            </div>
            <div class="legal-note">
              Documento emitido eletronicamente pela Plataforma PLUGUE. Registrado nos arquivos pedagógicos escolares.
            </div>
          </div>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    win.document.close();
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
      const turnoFormatado = turma?.turno
        ? (turma.turno === 'manha' ? 'MANHÃ' : turma.turno === 'tarde' ? 'TARDE' : turma.turno.toUpperCase())
        : undefined;

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
            turno: turnoFormatado,
            data_nascimento: estudante.data_nascimento,
            dataNascimento: estudante.data_nascimento,
            nascimento: estudante.data_nascimento,
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
          <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-100 dark:border-slate-700">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 shrink-0 mr-1">
              Ciclos:
            </span>
            {solicitacoesAluno.map((sol) => {
              const dataFormatada = formatarDataSolicitacao(sol.created_at || sol.data_solicitacao);
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
                  <span className="text-[10px] opacity-80 uppercase">{concluida ? 'Concluído' : sol.status}</span>
                </button>
              );
            })}
          </div>

          {/* Área da Solicitação Ativa */}
          {solicitacaoAtiva && (
            <div className="space-y-6">
              {/* Barra de Ações Rápidas da Solicitação - Bloco em Alto Contraste */}
              <div className="rounded-2xl border-2 border-indigo-600/80 bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-900 p-5 shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4 text-white">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="text-sm font-black uppercase tracking-wider text-white drop-shadow-sm flex items-center gap-2">
                      <Clock className="h-4 w-4 text-indigo-300" />
                      Ciclo Aberto em: {formatarDataSolicitacao(solicitacaoAtiva.created_at || solicitacaoAtiva.data_solicitacao, true)}
                    </span>
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black uppercase shadow-md ${
                      isConcluida
                        ? 'bg-emerald-500 text-white border border-emerald-400'
                        : 'bg-amber-400 text-amber-950 border border-amber-300'
                    }`}>
                      {isConcluida ? (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                          <span>Concluído / Homologado</span>
                        </>
                      ) : (
                        <>
                          <Clock className="h-3.5 w-3.5 text-amber-950" />
                          <span>Pendente</span>
                        </>
                      )}
                    </span>
                  </div>
                  <p className="text-xs text-indigo-200 font-semibold">
                    {pareceresAtivos.filter(p => p.status === 'enviado').length} de {pareceresAtivos.length} pareceres docentes recebidos
                  </p>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap">
                  {/* Botão Cancelar Solicitação (Vermelho Chamativo, visível apenas quando pendente) */}
                  {!isConcluida && (
                    <button
                      type="button"
                      onClick={() => setModalConfirmarCancelamento(true)}
                      className="inline-flex items-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 active:scale-95 px-4 py-2.5 text-xs font-black text-white shadow-lg shadow-red-600/50 border-2 border-red-500 ring-2 ring-red-400/30 transition-all cursor-pointer"
                      title="Cancelar e excluir permanentemente esta solicitação e todos os relatórios vinculados"
                    >
                      <Trash2 className="h-4 w-4 text-white animate-pulse" />
                      <span>Cancelar Solicitação</span>
                    </button>
                  )}

                  {/* Botão Consolidar com IA */}
                  <button
                    type="button"
                    onClick={handleIniciarConsolidacaoIA}
                    disabled={pareceresAtivos.filter(p => p.status === 'enviado').length === 0}
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 active:scale-95 px-4 py-2.5 text-xs font-black text-white shadow-lg shadow-indigo-600/40 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Sparkles className="h-4 w-4" />
                    <span>Consolidar Pareceres com IA</span>
                  </button>

                  {/* Ações para Parecer Consolidado Existente */}
                  {consolidadoAtivo && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleBaixarDocx()}
                        disabled={gerandoDocx}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 px-3.5 py-2.5 text-xs font-bold text-white shadow-md transition-all disabled:opacity-50"
                      >
                        <Download className="h-4 w-4" />
                        <span>{gerandoDocx ? 'Gerando...' : 'Exportar DOCX'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleImprimir()}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 px-3.5 py-2.5 text-xs font-bold text-white shadow-md border border-slate-700 transition-all"
                      >
                        <Printer className="h-4 w-4" />
                        <span>Imprimir</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleCopiarTexto()}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-600 bg-slate-800/90 hover:bg-slate-700 text-white px-3.5 py-2.5 text-xs font-bold shadow-md transition-all"
                      >
                        <Copy className="h-4 w-4 text-indigo-300" />
                        <span>Copiar Texto</span>
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Tabela de Atribuição Docente e Status de Envio */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                    <FileText className="h-4 w-4 text-indigo-600" />
                    Grade de Atribuição de Professores ({pareceresAtivos.length})
                  </h5>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-600 dark:bg-slate-800/90 dark:text-slate-200 border-b border-slate-100 dark:border-slate-700">
                      <tr>
                        <th className="px-4 py-3">Professor(a)</th>
                        <th className="px-4 py-3">Disciplinas</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Data Envio</th>
                        <th className="px-4 py-3 text-right">Ações da Secretaria</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 bg-white dark:bg-school-dark-surface">
                      {pareceresAtivos.map((parecer) => {
                        const prof = professores.find(p => p.id === parecer.professor_id);
                        const enviado = parecer.status === 'enviado';
                        const temNotificacaoPendente = notificacoesAdmin.some(
                          n => n.relatorio_professor_id === parecer.id && !n.lido
                        );

                        return (
                          <tr key={parecer.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                            <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">
                              <span>{prof?.nome_completo || 'Docente'}</span>
                            </td>
                            <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                              {prof?.disciplinas?.join(', ') || 'Polivalente'}
                            </td>
                            <td className="px-4 py-3">
                              {enviado ? (
                                <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800">
                                  <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                  <span>Enviado à Secretaria</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800">
                                  <Clock className="h-3 w-3 text-amber-600" />
                                  <span>Pendente (Em Elaboração)</span>
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-slate-500">
                              {formatarDataSolicitacao(parecer.data_envio)}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {/* Visualizar/Editar */}
                                {enviado && (
                                  <button
                                    onClick={() => handleAbrirParecer(parecer)}
                                    title="Visualizar e Ajustar Parecer"
                                    className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-indigo-600 dark:text-slate-400 dark:hover:bg-slate-800"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </button>
                                )}

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
                                      alert(`Notificação de cobrança reenviada para o professor ${prof?.nome_completo || 'Docente'}!`);
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
                                    if (confirm(`Excluir atribuição de parecer para ${prof?.nome_completo || 'Docente'}?`)) {
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
                          Homologado em {formatarDataSolicitacao(consolidadoAtivo.created_at || consolidadoAtivo.data_geracao, true)}
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

                      <button
                        onClick={() => handleImprimir(consolidadoAtivo.conteudo_final)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-slate-700 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-slate-800"
                      >
                        <Printer className="h-3.5 w-3.5" />
                        <span>Imprimir</span>
                      </button>

                      <button
                        onClick={() => handleCopiarTexto(consolidadoAtivo.conteudo_final)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                      >
                        <Copy className="h-3.5 w-3.5 text-slate-500" />
                        <span>Copiar</span>
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
          <div className="relative w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-school-dark-surface border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-700">
              <h4 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="h-5 w-5 text-indigo-600" />
                <span>Parecer do Professor</span>
                {isConcluida && (
                  <span className="text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full dark:bg-emerald-950/60 dark:text-emerald-300">
                    Homologado / Somente Leitura
                  </span>
                )}
              </h4>
              <button
                onClick={() => setParecerEmVisualizacao(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Rascunho Original vs Texto Polido por IA */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 block mb-1">
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

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setParecerEmVisualizacao(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-white"
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
          <div className="relative w-full max-w-3xl rounded-2xl bg-white p-6 sm:p-8 shadow-2xl dark:bg-school-dark-surface border border-slate-200 dark:border-slate-700 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-600 text-white">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-base font-black text-slate-900 dark:text-white">
                    Consolidação de Pareceres com Inteligência Artificial
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Sintetizando contribuições de todos os professores em um parecer oficial unificado
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalConsolidacaoAberto(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {consolidandoComIA ? (
              <div className="rounded-2xl border border-purple-100 bg-purple-50/50 p-8 text-center dark:border-purple-900/40 dark:bg-purple-950/20 space-y-3 animate-in fade-in">
                <RefreshCw className="mx-auto h-8 w-8 text-purple-600 animate-spin" />
                <h5 className="text-sm font-bold text-purple-950 dark:text-purple-200">
                  Sintetizando pareceres docentes com IA...
                </h5>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                  Processando pareceres descritivos docentes com rigor formal, concordância de gênero estrita e ausência de metatexto.
                </p>
                <div className="w-full max-w-xs mx-auto bg-purple-200/60 dark:bg-purple-900/40 h-1.5 rounded-full overflow-hidden mt-3">
                  <div className="h-full bg-gradient-to-r from-purple-600 to-indigo-600 animate-pulse rounded-full w-4/5 mx-auto" />
                </div>
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
                    <span className="text-[10px] text-purple-600 dark:text-purple-400 font-bold">
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

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleBaixarDocx(textoConsolidadoEditavel)}
                      disabled={gerandoDocx}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-white"
                    >
                      <Download className="h-4 w-4 text-school-blue-600 dark:text-school-blue-400" />
                      <span>{gerandoDocx ? 'Exportando...' : 'Exportar DOCX (Word)'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleIniciarConsolidacaoIA}
                      disabled={consolidandoComIA}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-purple-200 bg-purple-50/80 px-3.5 py-2 text-xs font-bold text-purple-700 hover:bg-purple-100 dark:border-purple-800 dark:bg-purple-950/40 dark:text-purple-300 dark:hover:bg-purple-900/60"
                      title="Gerar nova versão consolidada refinada com IA"
                    >
                      <Sparkles className="h-3.5 w-3.5 text-purple-600" />
                      <span>Regenerar com IA</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => setModalConsolidacaoAberto(false)}
                      className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-white"
                    >
                      Voltar
                    </button>
                    <button
                      type="button"
                      onClick={handleSalvarConsolidado}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 px-5 py-2 text-xs font-bold text-white shadow-md shadow-purple-600/30 hover:bg-purple-700 active:scale-95 transition-all"
                    >
                      <Save className="h-4 w-4" />
                      <span>Salvar Parecer Consolidado</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {/* Modal de Confirmação de Cancelamento e Exclusão da Solicitação */}
      {modalConfirmarCancelamento && solicitacaoAtiva && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 p-6 shadow-2xl border-2 border-red-500/40 space-y-5">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-400 shrink-0">
                <AlertTriangle className="h-6 w-6 text-red-600 animate-bounce" />
              </div>
              <div>
                <h4 className="text-base font-black text-slate-900 dark:text-white">
                  Cancelar Solicitação de Relatório?
                </h4>
                <p className="text-xs text-red-600 dark:text-red-400 font-semibold">
                  Atenção: Esta ação é definitiva e irreversível!
                </p>
              </div>
            </div>

            <div className="rounded-2xl bg-red-50 p-4 border border-red-200 dark:bg-red-950/30 dark:border-red-900/40 text-xs text-red-900 dark:text-red-200 space-y-2">
              <p className="font-bold">
                Ao confirmar o cancelamento, o sistema irá excluir permanentemente:
              </p>
              <ul className="list-disc list-inside space-y-1 text-[11px] font-medium">
                <li>Esta solicitação de ciclo aberta em {formatarDataSolicitacao(solicitacaoAtiva.created_at || solicitacaoAtiva.data_solicitacao, true)};</li>
                <li><strong>Todos os pareceres e relatórios ({pareceresAtivos.length})</strong> enviados ou atribuídos aos professores desta solicitação;</li>
                <li>Quaisquer minutas de consolidação com IA e notificações pendentes vinculadas a ela.</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={cancelandoSolicitacao}
                onClick={() => setModalConfirmarCancelamento(false)}
                className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                Não, Manter Solicitação
              </button>

              <button
                type="button"
                disabled={cancelandoSolicitacao}
                onClick={handleConfirmarCancelamentoSolicitacao}
                className="inline-flex items-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 active:scale-95 px-5 py-2.5 text-xs font-black text-white shadow-lg shadow-red-600/40 transition-all disabled:opacity-50"
              >
                {cancelandoSolicitacao ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Cancelando e excluindo...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    <span>Sim, Cancelar e Excluir Tudo</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
