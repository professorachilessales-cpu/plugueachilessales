'use client';

import React, { useState, useMemo, useRef } from 'react';
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
  ShieldCheck,
  ArrowUp,
  Search,
  Printer
} from 'lucide-react';
import { calcularIdadeEmAnos } from '@/lib/faixa-etaria';

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

function isObservacaoAtiva(o: any): boolean {
  if (!o) return false;
  // Se possui carimbo de exclusão válido
  if (o.deleted_at && o.deleted_at !== '' && o.deleted_at !== '0' && o.deleted_at !== 0 && o.deleted_at !== 'null') {
    return false;
  }
  // Se foi explicitamente marcado como deletado
  if (o.is_deleted === 1 || o.is_deleted === '1' || o.is_deleted === true) {
    return false;
  }
  // Se foi explicitamente inativado (ativo = 0)
  if (o.ativo === 0 || o.ativo === '0' || o.ativo === false) {
    return false;
  }
  return true;
}

export function TimelineObservacoesAluno({ estudante }: TimelineObservacoesAlunoProps) {
  const { 
    currentUser, 
    escolaConfig,
    turmas,
    observacoesAluno, 
    observacoesAuditoria, 
    addObservacaoAluno, 
    updateObservacaoAluno, 
    deleteObservacaoAluno 
  } = useApp();

  const [filtroCategoria, setFiltroCategoria] = useState<string>('todos');
  const [novaCategoria, setNovaCategoria] = useState<TipoObservacaoAluno>('pedagogico');
  const [novoTexto, setNovoTexto] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [erroSalvar, setErroSalvar] = useState<string | null>(null);

  // Estados e Refs para Navegação e Scroll Container
  const historicoSectionRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [mostrarBotaoTopo, setMostrarBotaoTopo] = useState(false);
  const [buscaHistorico, setBuscaHistorico] = useState('');
  const [ordemAsc, setOrdemAsc] = useState(false);

  // Modais de Visualização e Edição
  const [observacaoLeitura, setObservacaoLeitura] = useState<ObservacaoAluno | null>(null);
  const [observacaoEditando, setObservacaoEditando] = useState<ObservacaoAluno | null>(null);
  const [textoEditado, setTextoEditado] = useState('');
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);

  // Modal de Auditoria e Histórico de Alterações do Estudante
  const [modalAuditoriaAberto, setModalAuditoriaAberto] = useState(false);
  const [filtroAuditoriaEvento, setFiltroAuditoriaEvento] = useState<'todos' | 'DELETE' | 'UPDATE'>('todos');

  // Observações ativas (não excluídas) deste estudante
  const observacoesAtivasDesteEstudante = useMemo(() => {
    return observacoesAluno.filter(
      o => (o.estudante_id === estudante.id || o.aluno_id === estudante.id) && isObservacaoAtiva(o)
    );
  }, [observacoesAluno, estudante.id]);

  // Observações filtradas por categoria e termo de busca, com ordenação configurável (padrão DESC)
  const observacoes = useMemo(() => {
    return observacoesAtivasDesteEstudante
      .filter(o => {
        if (!filtroCategoria || filtroCategoria === 'todos') return true;
        const cat = (o.categoria || o.tipo || '').toLowerCase();
        return cat === filtroCategoria.toLowerCase();
      })
      .filter(o => {
        if (!buscaHistorico.trim()) return true;
        const termo = buscaHistorico.toLowerCase().trim();
        const texto = (o.texto_completo || o.texto || '').toLowerCase();
        const autor = (o.autor_nome || (o as any).usuario_nome || '').toLowerCase();
        const cargo = (o.autor_cargo || '').toLowerCase();
        return texto.includes(termo) || autor.includes(termo) || cargo.includes(termo);
      })
      .sort((a, b) => {
        const timeB = new Date(b.created_at || b.data_registro || 0).getTime();
        const timeA = new Date(a.created_at || a.data_registro || 0).getTime();
        return ordemAsc ? timeA - timeB : timeB - timeA;
      });
  }, [observacoesAtivasDesteEstudante, filtroCategoria, buscaHistorico, ordemAsc]);

  // Controle de Rolagem e Navegação Rápida
  const handleScrollHistorico = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop;
    if (scrollTop > 150) {
      if (!mostrarBotaoTopo) setMostrarBotaoTopo(true);
    } else {
      if (mostrarBotaoTopo) setMostrarBotaoTopo(false);
    }
  };

  const handleRolarParaTopo = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Trilha de auditoria das observações deste estudante (exclusões e alterações)
  const auditoriasDesteEstudante = useMemo(() => {
    return observacoesAuditoria
      .filter(a => a.estudante_id === estudante.id)
      .sort((a, b) => {
        const timeB = new Date(b.data_exclusao || b.created_at).getTime();
        const timeA = new Date(a.data_exclusao || a.created_at).getTime();
        return timeB - timeA;
      });
  }, [observacoesAuditoria, estudante.id]);

  const auditoriasFiltradas = useMemo(() => {
    return auditoriasDesteEstudante.filter(a => {
      if (filtroAuditoriaEvento === 'todos') return true;
      if (filtroAuditoriaEvento === 'DELETE') return a.evento === 'DELETE' || a.acao === 'EXCLUSAO';
      if (filtroAuditoriaEvento === 'UPDATE') return a.evento === 'UPDATE' || a.acao === 'ALTERACAO';
      return true;
    });
  }, [auditoriasDesteEstudante, filtroAuditoriaEvento]);

  // Função utilitária para sanitização e escape de strings no HTML de impressão
  const escapeHtml = (text?: string | null): string => {
    if (!text) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  // Formatação amigável de data e hora
  const formatarDataHora = (dataStr?: string | null): string => {
    if (!dataStr) return 'Data recente';
    try {
      const d = new Date(dataStr);
      if (isNaN(d.getTime())) return 'Data recente';
      return d.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Data recente';
    }
  };

  // 1. IMPRIMIR TODAS AS OBSERVAÇÕES (OU FILTRADAS) EM FORMATO DE RELATÓRIO INSTITUCIONAL
  const handleImprimirRelatorio = (apenasFiltradas: boolean = false) => {
    const lista = apenasFiltradas ? observacoes : observacoesAtivasDesteEstudante;
    if (lista.length === 0) {
      alert('Não há observações disponíveis para impressão neste momento.');
      return;
    }

    const turmaAluno = turmas.find(t => t.id === estudante.turma_id);
    const turnoNome = turmaAluno?.turno 
      ? (turmaAluno.turno === 'manha' ? 'MANHÃ' : turmaAluno.turno === 'tarde' ? 'TARDE' : turmaAluno.turno.toUpperCase()) 
      : 'MANHÃ';
    const turmaTexto = `${turmaAluno?.nome || estudante.turma_nome || 'Turma Regular'} - ${turnoNome}`.toUpperCase();
    const idadeTexto = calcularIdadeEmAnos(estudante.data_nascimento);
    const dataNascFormatada = estudante.data_nascimento 
      ? new Date(estudante.data_nascimento.includes('T') ? estudante.data_nascimento : `${estudante.data_nascimento}T12:00:00`).toLocaleDateString('pt-BR') 
      : 'Não informada';
    const dataEmissao = new Date().toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const contagem = {
      pedagogico: lista.filter(o => (o.categoria || o.tipo || '').toLowerCase() === 'pedagogico').length,
      comportamental: lista.filter(o => (o.categoria || o.tipo || '').toLowerCase() === 'comportamental').length,
      saude: lista.filter(o => (o.categoria || o.tipo || '').toLowerCase() === 'saude').length,
      geral: lista.filter(o => (o.categoria || o.tipo || '').toLowerCase() === 'geral').length,
    };

    const escopoDescricao = apenasFiltradas && (filtroCategoria !== 'todos' || buscaHistorico.trim())
      ? `Relatório Filtrado: ${filtroCategoria !== 'todos' ? (CATEGORIAS_CONFIG[filtroCategoria as TipoObservacaoAluno]?.label || filtroCategoria) : 'Todas as Categorias'}${buscaHistorico.trim() ? ` • Termo: "${buscaHistorico}"` : ''}`
      : 'Relatório Completo de Observações do Estudante';

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
          <title>Relatório de Observações - ${escapeHtml(estudante.nome_completo)}</title>
          <style>
            @page {
              size: A4;
              margin: 15mm 15mm 15mm 15mm;
            }
            @media print {
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .no-print { display: none !important; }
            }
            * { box-sizing: border-box; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              color: #0f172a;
              margin: 0;
              padding: 16px;
              font-size: 10pt;
              line-height: 1.45;
              background: #ffffff;
            }
            .no-print-bar {
              background: #f1f5f9;
              border: 1px solid #cbd5e1;
              border-radius: 8px;
              padding: 10px 16px;
              margin-bottom: 20px;
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 12px;
            }
            .btn-print {
              background: #1e3a8a;
              color: #ffffff;
              border: none;
              padding: 8px 18px;
              border-radius: 6px;
              font-weight: 700;
              font-size: 11pt;
              cursor: pointer;
            }
            .btn-close {
              background: #e2e8f0;
              color: #334155;
              border: none;
              padding: 8px 14px;
              border-radius: 6px;
              font-weight: 600;
              font-size: 10pt;
              cursor: pointer;
            }
            .header-inst {
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 16px;
              border-bottom: 2px solid #1e3a8a;
              padding-bottom: 12px;
              margin-bottom: 14px;
            }
            .header-left {
              display: flex;
              align-items: center;
              gap: 12px;
            }
            .header-logo {
              max-height: 65px;
              max-width: 120px;
              object-fit: contain;
            }
            .header-school-name {
              margin: 0;
              font-size: 14pt;
              font-weight: 900;
              color: #1e3a8a;
              text-transform: uppercase;
              letter-spacing: -0.3px;
            }
            .header-school-meta {
              margin: 2px 0 0 0;
              font-size: 8pt;
              color: #475569;
              line-height: 1.35;
            }
            .header-right {
              text-align: right;
              font-size: 8pt;
              color: #64748b;
            }
            .header-doc-title {
              font-size: 9pt;
              font-weight: 800;
              color: #0f172a;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .title-banner {
              text-align: center;
              background: #f8fafc;
              border: 1px solid #cbd5e1;
              border-radius: 8px;
              padding: 8px 12px;
              margin-bottom: 14px;
            }
            .title-banner h2 {
              margin: 0;
              font-size: 12pt;
              font-weight: 800;
              color: #0f172a;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .title-banner p {
              margin: 3px 0 0 0;
              font-size: 8.5pt;
              color: #64748b;
            }
            .student-box {
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              padding: 10px 14px;
              margin-bottom: 14px;
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 6px 16px;
              font-size: 9pt;
            }
            .student-box p {
              margin: 0;
            }
            .student-box strong {
              color: #334155;
              text-transform: uppercase;
              font-size: 8pt;
            }
            .metrics-box {
              display: flex;
              flex-wrap: wrap;
              gap: 8px;
              margin-bottom: 14px;
              font-size: 8.5pt;
            }
            .metric-badge {
              padding: 4px 8px;
              border-radius: 6px;
              border: 1px solid #cbd5e1;
              background: #f8fafc;
              font-weight: 600;
            }
            .metric-badge strong {
              color: #1e3a8a;
            }
            .obs-card {
              border: 1px solid #e2e8f0;
              border-left-width: 4px;
              border-radius: 6px;
              padding: 10px 12px;
              margin-bottom: 10px;
              page-break-inside: avoid;
              background: #ffffff;
            }
            .obs-card.comportamental { border-left-color: #d97706; }
            .obs-card.pedagogico { border-left-color: #4f46e5; }
            .obs-card.saude { border-left-color: #e11d48; }
            .obs-card.geral { border-left-color: #475569; }

            .obs-header {
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 8px;
              margin-bottom: 6px;
              padding-bottom: 4px;
              border-bottom: 1px solid #f1f5f9;
              font-size: 8.5pt;
            }
            .obs-tag {
              display: inline-block;
              padding: 2px 6px;
              border-radius: 4px;
              font-size: 7.5pt;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 0.3px;
              margin-right: 6px;
            }
            .obs-tag.comportamental { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
            .obs-tag.pedagogico { background: #e0e7ff; color: #3730a3; border: 1px solid #c7d2fe; }
            .obs-tag.saude { background: #ffe4e6; color: #9f1239; border: 1px solid #fecdd3; }
            .obs-tag.geral { background: #f1f5f9; color: #334155; border: 1px solid #e2e8f0; }

            .obs-author {
              font-weight: 700;
              color: #1e293b;
            }
            .obs-cargo {
              font-size: 8pt;
              color: #64748b;
            }
            .obs-date {
              color: #64748b;
              font-size: 8pt;
              font-weight: 600;
            }
            .obs-text {
              font-size: 9.5pt;
              line-height: 1.5;
              color: #1e293b;
              white-space: pre-wrap;
              text-align: justify;
              margin: 0;
            }
            .footer-signatures {
              margin-top: 36px;
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 40px;
              text-align: center;
              page-break-inside: avoid;
            }
            .signature-line {
              border-top: 1px solid #334155;
              padding-top: 6px;
              font-size: 8.5pt;
              color: #1e293b;
              font-weight: 700;
            }
            .signature-sub {
              font-size: 7.5pt;
              color: #64748b;
            }
            .doc-legal-footer {
              margin-top: 24px;
              padding-top: 8px;
              border-top: 1px solid #e2e8f0;
              font-size: 7.5pt;
              color: #94a3b8;
              display: flex;
              justify-content: space-between;
              page-break-inside: avoid;
            }
          </style>
        </head>
        <body>
          <div class="no-print-bar no-print">
            <span style="font-weight: 600; font-size: 9.5pt; color: #1e293b;">
              📄 Visualização de Impressão • Relatório de Observações
            </span>
            <div style="display: flex; gap: 8px;">
              <button class="btn-print" onclick="window.print()">Imprimir / Salvar PDF</button>
              <button class="btn-close" onclick="window.close()">Fechar</button>
            </div>
          </div>

          <div class="header-inst">
            <div class="header-left">
              ${escolaConfig?.logo_url ? `<img src="${escolaConfig.logo_url}" class="header-logo" alt="Logo" />` : ''}
              <div>
                <h1 class="header-school-name">${escapeHtml(escolaConfig?.nome_escola || 'Colégio Integrado PLUGUE')}</h1>
                <p class="header-school-meta">
                  INEP: ${escapeHtml(escolaConfig?.codigo_inep || 'Não informado')} • CNPJ: ${escapeHtml(escolaConfig?.cnpj || 'Não informado')}<br/>
                  ${escapeHtml(escolaConfig?.endereco || '')} • Tel: ${escapeHtml(escolaConfig?.telefone || '')}
                </p>
              </div>
            </div>
            <div class="header-right">
              <div class="header-doc-title">RELATÓRIO INSTITUCIONAL</div>
              <div>Ano Letivo: ${escapeHtml(String(escolaConfig?.ano_letivo_ativo || new Date().getFullYear()))}</div>
              <div style="margin-top: 3px; font-size: 7.5pt;">Emissão: ${dataEmissao}</div>
            </div>
          </div>

          <div class="title-banner">
            <h2>Relatório de Observações & Histórico do Estudante</h2>
            <p>${escapeHtml(escopoDescricao)}</p>
          </div>

          <div class="student-box">
            <p><strong>Estudante:</strong> ${escapeHtml(estudante.nome_completo.toUpperCase())}</p>
            <p><strong>Turma / Turno:</strong> ${escapeHtml(turmaTexto)}</p>
            <p><strong>Matrícula / ID:</strong> ${escapeHtml(estudante.id)}</p>
            <p><strong>Data de Nascimento:</strong> ${escapeHtml(dataNascFormatada)} (${escapeHtml(idadeTexto)})</p>
            <p><strong>Responsável:</strong> ${escapeHtml(estudante.nome_responsavel || 'Não informado')} ${estudante.telefone_responsavel ? `(${escapeHtml(estudante.telefone_responsavel)})` : ''}</p>
            <p><strong>AEE / Inclusão:</strong> ${estudante.possui_aee ? `Sim - ${escapeHtml(estudante.diagnostico_aee || 'Atendimento Especializado')}` : 'Não se aplica'}</p>
          </div>

          <div class="metrics-box">
            <div class="metric-badge">Total de Registros: <strong>${lista.length}</strong></div>
            <div class="metric-badge">Pedagógico: <strong>${contagem.pedagogico}</strong></div>
            <div class="metric-badge">Comportamental: <strong>${contagem.comportamental}</strong></div>
            <div class="metric-badge">Saúde / Clínico: <strong>${contagem.saude}</strong></div>
            <div class="metric-badge">Geral: <strong>${contagem.geral}</strong></div>
          </div>

          <div class="observations-list">
            ${lista.map((obs) => {
              const catKey = (obs.categoria || obs.tipo || 'geral').toLowerCase() as TipoObservacaoAluno;
              const conf = CATEGORIAS_CONFIG[catKey] || CATEGORIAS_CONFIG.geral;
              const dataObsFormatada = formatarDataHora(obs.created_at || obs.data_registro);

              return `
                <div class="obs-card ${catKey}">
                  <div class="obs-header">
                    <div>
                      <span class="obs-tag ${catKey}">${escapeHtml(conf.label)}</span>
                      <span class="obs-author">${escapeHtml(obs.autor_nome || (obs as any).usuario_nome || 'Equipe Escolar')}</span>
                      <span class="obs-cargo"> • ${escapeHtml(obs.autor_cargo || 'Autor')}</span>
                    </div>
                    <div class="obs-date">${escapeHtml(dataObsFormatada)}</div>
                  </div>
                  <p class="obs-text">${escapeHtml(obs.texto_completo || obs.texto)}</p>
                </div>
              `;
            }).join('')}
          </div>

          <div class="footer-signatures">
            <div>
              <div class="signature-line">Coordenação Pedagógica / Direção</div>
              <div class="signature-sub">${escapeHtml(escolaConfig?.nome_escola || 'Gestão Escolar')}</div>
            </div>
            <div>
              <div class="signature-line">${escapeHtml(currentUser?.name || 'Equipe Escolar')}</div>
              <div class="signature-sub">Responsável pela Emissão • ${escapeHtml(currentUser?.role === 'admin' ? 'Administração' : 'Docência')}</div>
            </div>
          </div>

          <div class="doc-legal-footer">
            <span>PLUGUE • Plataforma Unificada de Gestão Educacional</span>
            <span>Documento Oficial Escolar emitido em ${dataEmissao}</span>
          </div>

          <script>
            window.onload = function() {
              window.focus();
              window.print();
            }
          </script>
        </body>
      </html>
    `);
    win.document.close();
  };

  // 2. IMPRIMIR UMA OBSERVAÇÃO INDIVIDUAL EM FORMATO DE DESPACHO / REGISTRO OFICIAL
  const handleImprimirObservacaoIndividual = (obs: ObservacaoAluno) => {
    const turmaAluno = turmas.find(t => t.id === estudante.turma_id);
    const turnoNome = turmaAluno?.turno 
      ? (turmaAluno.turno === 'manha' ? 'MANHÃ' : turmaAluno.turno === 'tarde' ? 'TARDE' : turmaAluno.turno.toUpperCase()) 
      : 'MANHÃ';
    const turmaTexto = `${turmaAluno?.nome || estudante.turma_nome || 'Turma Regular'} - ${turnoNome}`.toUpperCase();
    const idadeTexto = calcularIdadeEmAnos(estudante.data_nascimento);
    const dataNascFormatada = estudante.data_nascimento 
      ? new Date(estudante.data_nascimento.includes('T') ? estudante.data_nascimento : `${estudante.data_nascimento}T12:00:00`).toLocaleDateString('pt-BR') 
      : 'Não informada';
    const dataEmissao = new Date().toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const catKey = (obs.categoria || obs.tipo || 'geral').toLowerCase() as TipoObservacaoAluno;
    const conf = CATEGORIAS_CONFIG[catKey] || CATEGORIAS_CONFIG.geral;
    const dataObsFormatada = formatarDataHora(obs.created_at || obs.data_registro);

    const win = window.open('', '_blank');
    if (!win) {
      alert('Por favor, autorize pop-ups no seu navegador para imprimir a anotação.');
      return;
    }

    win.document.write(`
      <!DOCTYPE html>
      <html lang="pt-BR">
        <head>
          <meta charset="utf-8">
          <title>Registro Individual de Observação - ${escapeHtml(estudante.nome_completo)}</title>
          <style>
            @page {
              size: A4;
              margin: 20mm 20mm 20mm 20mm;
            }
            @media print {
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .no-print { display: none !important; }
            }
            * { box-sizing: border-box; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              color: #0f172a;
              margin: 0;
              padding: 20px;
              font-size: 10.5pt;
              line-height: 1.5;
              background: #ffffff;
            }
            .no-print-bar {
              background: #f1f5f9;
              border: 1px solid #cbd5e1;
              border-radius: 8px;
              padding: 10px 16px;
              margin-bottom: 24px;
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 12px;
            }
            .btn-print {
              background: #1e3a8a;
              color: #ffffff;
              border: none;
              padding: 8px 18px;
              border-radius: 6px;
              font-weight: 700;
              font-size: 11pt;
              cursor: pointer;
            }
            .btn-close {
              background: #e2e8f0;
              color: #334155;
              border: none;
              padding: 8px 14px;
              border-radius: 6px;
              font-weight: 600;
              font-size: 10pt;
              cursor: pointer;
            }
            .header-inst {
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 16px;
              border-bottom: 2px solid #1e3a8a;
              padding-bottom: 14px;
              margin-bottom: 18px;
            }
            .header-left {
              display: flex;
              align-items: center;
              gap: 12px;
            }
            .header-logo {
              max-height: 70px;
              max-width: 130px;
              object-fit: contain;
            }
            .header-school-name {
              margin: 0;
              font-size: 15pt;
              font-weight: 900;
              color: #1e3a8a;
              text-transform: uppercase;
              letter-spacing: -0.3px;
            }
            .header-school-meta {
              margin: 3px 0 0 0;
              font-size: 8.5pt;
              color: #475569;
              line-height: 1.35;
            }
            .header-right {
              text-align: right;
              font-size: 8.5pt;
              color: #64748b;
            }
            .header-doc-title {
              font-size: 9.5pt;
              font-weight: 800;
              color: #0f172a;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .title-banner {
              text-align: center;
              background: #f8fafc;
              border: 1px solid #cbd5e1;
              border-radius: 8px;
              padding: 10px 14px;
              margin-bottom: 18px;
            }
            .title-banner h2 {
              margin: 0;
              font-size: 13pt;
              font-weight: 800;
              color: #0f172a;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .title-banner p {
              margin: 4px 0 0 0;
              font-size: 8.5pt;
              color: #64748b;
            }
            .student-box {
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              padding: 12px 16px;
              margin-bottom: 18px;
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 8px 16px;
              font-size: 9.5pt;
            }
            .student-box p {
              margin: 0;
            }
            .student-box strong {
              color: #334155;
              text-transform: uppercase;
              font-size: 8pt;
            }
            .meta-box {
              background: #ffffff;
              border: 1px solid #cbd5e1;
              border-radius: 8px;
              padding: 12px 16px;
              margin-bottom: 18px;
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 8px 14px;
              font-size: 9pt;
            }
            .meta-box p {
              margin: 0;
            }
            .meta-box strong {
              display: block;
              color: #64748b;
              font-size: 7.5pt;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin-bottom: 2px;
            }
            .obs-tag {
              display: inline-block;
              padding: 3px 8px;
              border-radius: 4px;
              font-size: 8pt;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 0.3px;
            }
            .obs-tag.comportamental { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
            .obs-tag.pedagogico { background: #e0e7ff; color: #3730a3; border: 1px solid #c7d2fe; }
            .obs-tag.saude { background: #ffe4e6; color: #9f1239; border: 1px solid #fecdd3; }
            .obs-tag.geral { background: #f1f5f9; color: #334155; border: 1px solid #e2e8f0; }

            .content-box {
              border: 2px solid #e2e8f0;
              border-radius: 10px;
              padding: 20px;
              margin-bottom: 28px;
              background: #ffffff;
            }
            .content-box-title {
              font-size: 8.5pt;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              color: #475569;
              margin-bottom: 12px;
              border-bottom: 1px solid #e2e8f0;
              padding-bottom: 6px;
            }
            .content-text {
              font-size: 11pt;
              line-height: 1.6;
              color: #0f172a;
              white-space: pre-wrap;
              text-align: justify;
              margin: 0;
            }
            .footer-signatures {
              margin-top: 50px;
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 48px;
              text-align: center;
              page-break-inside: avoid;
            }
            .signature-line {
              border-top: 1px solid #334155;
              padding-top: 6px;
              font-size: 9pt;
              color: #1e293b;
              font-weight: 700;
            }
            .signature-sub {
              font-size: 8pt;
              color: #64748b;
            }
            .doc-legal-footer {
              margin-top: 36px;
              padding-top: 10px;
              border-top: 1px solid #e2e8f0;
              font-size: 7.5pt;
              color: #94a3b8;
              display: flex;
              justify-content: space-between;
              page-break-inside: avoid;
            }
          </style>
        </head>
        <body>
          <div class="no-print-bar no-print">
            <span style="font-weight: 600; font-size: 9.5pt; color: #1e293b;">
              📄 Visualização de Impressão • Registro Individual de Observação
            </span>
            <div style="display: flex; gap: 8px;">
              <button class="btn-print" onclick="window.print()">Imprimir / Salvar PDF</button>
              <button class="btn-close" onclick="window.close()">Fechar</button>
            </div>
          </div>

          <div class="header-inst">
            <div class="header-left">
              ${escolaConfig?.logo_url ? `<img src="${escolaConfig.logo_url}" class="header-logo" alt="Logo" />` : ''}
              <div>
                <h1 class="header-school-name">${escapeHtml(escolaConfig?.nome_escola || 'Colégio Integrado PLUGUE')}</h1>
                <p class="header-school-meta">
                  INEP: ${escapeHtml(escolaConfig?.codigo_inep || 'Não informado')} • CNPJ: ${escapeHtml(escolaConfig?.cnpj || 'Não informado')}<br/>
                  ${escapeHtml(escolaConfig?.endereco || '')} • Tel: ${escapeHtml(escolaConfig?.telefone || '')}
                </p>
              </div>
            </div>
            <div class="header-right">
              <div class="header-doc-title">REGISTRO OFICIAL</div>
              <div>Ano Letivo: ${escapeHtml(String(escolaConfig?.ano_letivo_ativo || new Date().getFullYear()))}</div>
              <div style="margin-top: 3px; font-size: 7.5pt;">Emissão: ${dataEmissao}</div>
            </div>
          </div>

          <div class="title-banner">
            <h2>Registro Individual de Observação Escolar</h2>
            <p>Histórico Pedagógico & Comportamental do Estudante</p>
          </div>

          <div class="student-box">
            <p><strong>Estudante:</strong> ${escapeHtml(estudante.nome_completo.toUpperCase())}</p>
            <p><strong>Turma / Turno:</strong> ${escapeHtml(turmaTexto)}</p>
            <p><strong>Matrícula / ID:</strong> ${escapeHtml(estudante.id)}</p>
            <p><strong>Data de Nascimento:</strong> ${escapeHtml(dataNascFormatada)} (${escapeHtml(idadeTexto)})</p>
            <p><strong>Responsável:</strong> ${escapeHtml(estudante.nome_responsavel || 'Não informado')}</p>
            <p><strong>AEE / Inclusão:</strong> ${estudante.possui_aee ? `Sim - ${escapeHtml(estudante.diagnostico_aee || 'Atendimento Especializado')}` : 'Não se aplica'}</p>
          </div>

          <div class="meta-box">
            <div>
              <strong>Categoria do Registro</strong>
              <span class="obs-tag ${catKey}">${escapeHtml(conf.label)}</span>
            </div>
            <div>
              <strong>Data e Hora do Registro</strong>
              <span style="font-weight: 700; color: #1e293b;">${escapeHtml(dataObsFormatada)}</span>
            </div>
            <div>
              <strong>Registrado Por</strong>
              <span style="font-weight: 700; color: #1e293b;">${escapeHtml(obs.autor_nome || (obs as any).usuario_nome || 'Equipe Escolar')}</span>
              <span style="color: #64748b; font-size: 8pt; display: block;">${escapeHtml(obs.autor_cargo || 'Autor')}</span>
            </div>
          </div>

          <div class="content-box">
            <div class="content-box-title">Descrição Circunstanciada dos Fatos e Observações</div>
            <p class="content-text">${escapeHtml(obs.texto_completo || obs.texto)}</p>
          </div>

          <div class="footer-signatures">
            <div>
              <div class="signature-line">${escapeHtml(obs.autor_nome || (obs as any).usuario_nome || 'Profissional Emitente')}</div>
              <div class="signature-sub">Responsável pelo Registro • ${escapeHtml(obs.autor_cargo || 'Docente')}</div>
            </div>
            <div>
              <div class="signature-line">Coordenação Pedagógica / Direção</div>
              <div class="signature-sub">Visto e Ciência da Gestão Escolar</div>
            </div>
          </div>

          <div class="doc-legal-footer">
            <span>PLUGUE • Plataforma Unificada de Gestão Educacional</span>
            <span>Identificador Único: #${escapeHtml(obs.id.slice(0, 12))}</span>
          </div>

          <script>
            window.onload = function() {
              window.focus();
              window.print();
            }
          </script>
        </body>
      </html>
    `);
    win.document.close();
  };

  const handleAdicionarObservacao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoTexto.trim()) return;

    setSalvando(true);
    setErroSalvar(null);
    try {
      await addObservacaoAluno({
        estudante_id: estudante.id,
        aluno_id: estudante.id,
        categoria: novaCategoria,
        tipo: novaCategoria,
        texto: novoTexto.trim(),
        texto_completo: novoTexto.trim(),
        usuario_id: currentUser?.id,
        autor_id: currentUser?.id,
        usuario_nome: currentUser?.name || 'Equipe Escolar',
        autor_nome: currentUser?.name || 'Equipe Escolar',
        autor_cargo: currentUser?.role === 'admin' ? 'Administração Escolar' : 'Professor',
      });
      setNovoTexto('');
      setFeedback('Observação pedagógica registrada com sucesso no banco de dados!');
      setTimeout(() => setFeedback(null), 3500);
    } catch (err: any) {
      console.error('Erro ao adicionar observação:', err);
      setErroSalvar(err.message || 'Erro ao registrar observação pedagógica.');
      setTimeout(() => setErroSalvar(null), 6000);
    } finally {
      setSalvando(false);
    }
  };

  const handleSalvarEdicao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!observacaoEditando || !textoEditado.trim()) return;

    setSalvandoEdicao(true);
    setErroSalvar(null);
    try {
      await updateObservacaoAluno(observacaoEditando.id, textoEditado.trim());
      setObservacaoEditando(null);
      setTextoEditado('');
      if (observacaoLeitura?.id === observacaoEditando.id) {
        setObservacaoLeitura(prev => prev ? { ...prev, texto: textoEditado.trim(), texto_completo: textoEditado.trim() } : null);
      }
      setFeedback('Observação pedagógica atualizada e registrada na auditoria com sucesso!');
      setTimeout(() => setFeedback(null), 3500);
    } catch (err: any) {
      console.error('Erro ao atualizar observação pedagógica:', err);
      setErroSalvar(err.message || 'Erro ao atualizar observação.');
      setTimeout(() => setErroSalvar(null), 6000);
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

  const handleExcluir = async (obs: ObservacaoAluno, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!confirm('Deseja excluir esta observação? O registro completo será preservado no log de auditoria.')) {
      return;
    }
    try {
      await deleteObservacaoAluno(obs.id);
      if (observacaoLeitura?.id === obs.id) {
        setObservacaoLeitura(null);
      }
      setFeedback('Observação removida da timeline ativa e registrada na auditoria.');
      setTimeout(() => setFeedback(null), 3500);
    } catch (err: any) {
      console.error('Erro ao excluir observação:', err);
      setErroSalvar(err.message || 'Erro ao excluir observação pedagógica.');
      setTimeout(() => setErroSalvar(null), 6000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Topo: Título, Ações e Filtro de Tags */}
      <div className="space-y-3 border-b border-slate-200 pb-3.5 dark:border-slate-700">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h4 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-school-blue-600 dark:text-school-gold-400" />
            Observações & Históricos
          </h4>

          {/* Botão de Impressão do Relatório Completo */}
          <button
            type="button"
            onClick={() => handleImprimirRelatorio(false)}
            disabled={observacoesAtivasDesteEstudante.length === 0}
            className="inline-flex items-center gap-1.5 rounded-xl bg-school-blue-700 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-school-blue-800 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer self-start sm:self-auto shrink-0"
            title="Imprimir relatório completo com todas as observações do estudante"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Imprimir Relatório</span>
          </button>
        </div>

        {/* Filtro por Categorias: ocupando o espaço à esquerda e com fonte compacta para encaixar na tela */}
        <div className="flex items-center gap-1.5 flex-wrap w-full">
          <button
            onClick={() => setFiltroCategoria('todos')}
            className={`inline-flex items-center justify-center gap-1 rounded-lg px-2.5 py-1 text-[10.5px] font-bold transition-all shadow-2xs whitespace-nowrap cursor-pointer ${
              filtroCategoria === 'todos'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 ring-2 ring-slate-900 dark:ring-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 border border-slate-200/60 dark:border-slate-700/60'
            }`}
          >
            <Tag className="h-3 w-3" />
            <span>
              Todas ({observacoesAtivasDesteEstudante.length})
            </span>
          </button>
          {(Object.keys(CATEGORIAS_CONFIG) as TipoObservacaoAluno[]).map((cat) => {
            const conf = CATEGORIAS_CONFIG[cat];
            const Icon = conf.icon;
            const qtd = observacoesAtivasDesteEstudante.filter(
              o => (o.categoria || o.tipo || '').toLowerCase() === cat.toLowerCase()
            ).length;
            const ativo = filtroCategoria === cat;
            return (
              <button
                key={cat}
                onClick={() => setFiltroCategoria(cat)}
                className={`inline-flex items-center justify-center gap-1 rounded-lg px-2.5 py-1 text-[10.5px] font-bold transition-all shadow-2xs whitespace-nowrap cursor-pointer ${
                  ativo
                    ? `${conf.bg} ${conf.cor} ring-2 ring-current border ${conf.border}`
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 border border-slate-200/60 dark:border-slate-700/60'
                }`}
              >
                <Icon className="h-3 w-3" />
                <span>{conf.label} ({qtd})</span>
              </button>
            );
          })}

          {/* Botão de Auditoria e Histórico de Alterações */}
          <button
            type="button"
            onClick={() => setModalAuditoriaAberto(true)}
            className="inline-flex items-center justify-center gap-1 rounded-lg border border-rose-200 bg-rose-50/80 px-2.5 py-1 text-[10.5px] font-bold text-rose-700 hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-900/60 transition-all shadow-2xs whitespace-nowrap cursor-pointer"
            title="Abrir Trilha de Auditoria & Histórico de Alterações deste Estudante"
          >
            <ShieldCheck className="h-3 w-3 text-rose-600 dark:text-rose-400" />
            <span>Auditoria ({auditoriasDesteEstudante.length})</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-xs font-bold text-emerald-800 border border-emerald-200 dark:bg-emerald-950/50 dark:border-emerald-900 dark:text-emerald-200">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {erroSalvar && (
        <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-800 border border-rose-200 dark:bg-rose-950/50 dark:border-rose-900 dark:text-rose-200">
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
          <span>{erroSalvar}</span>
        </div>
      )}

      {/* Formulário de Registro Rápido */}
      <form onSubmit={handleAdicionarObservacao} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-700 dark:bg-slate-900/60 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Nova Anotação no Histórico do Estudante:
            </span>
          </div>

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
            Registrado por: <strong>{currentUser.name}</strong> ({currentUser.role.toUpperCase()})
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

      {/* Bloco de Listagem Final: Histórico de Registros com Scroll Container e Sticky Header */}
      <div 
        ref={historicoSectionRef}
        id="historico-registros" 
        className="relative rounded-2xl border border-slate-200 bg-slate-50/40 dark:border-slate-700 dark:bg-slate-900/60 shadow-xs overflow-hidden"
      >
        {/* Sticky Header com Título, Contador e Controles de Busca e Ordenação */}
        <div className="sticky top-0 z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/90 bg-white/95 px-4 py-3.5 backdrop-blur-md dark:border-slate-700 dark:bg-slate-900/95">
          <div className="flex items-center gap-2.5">
            <div className="rounded-xl bg-school-blue-50 p-2 text-school-blue-700 dark:bg-school-blue-950/60 dark:text-school-blue-300">
              <MessageSquare className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                  Histórico de Registros
                </h4>
                <span className="inline-flex items-center rounded-full bg-school-blue-100 px-2 py-0.5 text-[10px] font-bold text-school-blue-800 dark:bg-school-blue-950 dark:text-school-blue-300">
                  {observacoes.length} {observacoes.length === 1 ? 'registro' : 'registros'}
                  {buscaHistorico.trim() && ' (filtrado)'}
                </span>
              </div>
            </div>
          </div>

          {/* Filtros rápidos no Header Fixo: Busca e Ordenação */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={buscaHistorico}
                onChange={(e) => setBuscaHistorico(e.target.value)}
                placeholder="Buscar no histórico..."
                className="w-36 sm:w-48 rounded-xl border border-slate-200 bg-slate-50 pl-8 pr-7 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-school-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
              {buscaHistorico && (
                <button
                  type="button"
                  onClick={() => setBuscaHistorico('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  title="Limpar busca"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setOrdemAsc(!ordemAsc)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition-colors shadow-2xs cursor-pointer"
              title={ordemAsc ? "Exibindo da mais antiga para a mais recente. Clique para inverter." : "Exibindo da mais recente para a mais antiga. Clique para inverter."}
            >
              <Clock className="h-3 w-3 text-slate-500" />
              <span>{ordemAsc ? 'Mais Antigas' : 'Mais Recentes'}</span>
            </button>

            {/* Botão de Impressão Rápida no Cabeçalho do Histórico */}
            {observacoes.length > 0 && (
              <button
                type="button"
                onClick={() => handleImprimirRelatorio(filtroCategoria !== 'todos' || !!buscaHistorico.trim())}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition-colors shadow-2xs cursor-pointer"
                title={
                  (filtroCategoria !== 'todos' || buscaHistorico.trim())
                    ? `Imprimir relatório das ${observacoes.length} observações filtradas`
                    : `Imprimir relatório de todas as ${observacoes.length} observações`
                }
              >
                <Printer className="h-3 w-3 text-school-blue-600 dark:text-school-blue-400" />
                <span className="hidden sm:inline">
                  {(filtroCategoria !== 'todos' || buscaHistorico.trim()) ? 'Imprimir Filtradas' : 'Imprimir Lista'}
                </span>
                <span className="sm:hidden">Imprimir</span>
              </button>
            )}
          </div>
        </div>

        {/* Área de Rolagem Fixa (Scroll Container) */}
        <div 
          ref={scrollContainerRef}
          onScroll={handleScrollHistorico}
          className="relative max-h-[500px] lg:max-h-[60vh] overflow-y-auto scrollbar-thin scroll-smooth p-4 pr-3.5 space-y-4"
        >
          {observacoes.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center text-xs text-slate-400 dark:border-slate-700 bg-white/50 dark:bg-slate-900/30">
              {buscaHistorico.trim()
                ? 'Nenhuma observação encontrada para o termo pesquisado.'
                : 'Nenhuma observação registrada nesta categoria.'}
            </div>
          ) : (
            <div className="relative pl-6 space-y-4 before:absolute before:bottom-2 before:top-2 before:left-2.5 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-700">
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
                      className="cursor-pointer rounded-2xl border border-slate-200 bg-white p-4 shadow-xs transition-all hover:shadow-md hover:border-school-blue-300 dark:border-slate-700 dark:bg-school-dark-surface dark:hover:border-school-blue-700 space-y-2"
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
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-slate-500 dark:bg-slate-800 dark:text-slate-300">
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
                              className="p-1 text-slate-400 hover:text-school-blue-600 transition-colors ml-1 cursor-pointer"
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
                              className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                              title="Excluir (Gera log de auditoria)"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}

                          {/* Botão de Impressão Individual da Observação */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleImprimirObservacaoIndividual(obs);
                            }}
                            className="p-1 text-slate-400 hover:text-school-blue-600 dark:hover:text-school-blue-400 transition-colors cursor-pointer"
                            title="Imprimir esta observação individualmente"
                          >
                            <Printer className="h-3.5 w-3.5" />
                          </button>

                          <span className="text-slate-300 dark:text-slate-600 text-xs ml-1">|</span>
                          <span className="text-[10px] font-semibold text-school-blue-600 dark:text-school-blue-400 flex items-center gap-0.5">
                            <Eye className="h-3 w-3" /> Ler
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-line line-clamp-3">
                        {obs.texto_completo || obs.texto}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Botão "Voltar ao Início" (Dentro do Container) Flutuante Discreto */}
          {mostrarBotaoTopo && (
            <div className="sticky bottom-2 flex justify-end pointer-events-none z-20">
              <button
                type="button"
                onClick={handleRolarParaTopo}
                className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full bg-slate-900/90 text-white dark:bg-white/95 dark:text-slate-900 px-3.5 py-1.5 text-xs font-bold shadow-lg shadow-slate-900/25 hover:bg-slate-900 dark:hover:bg-white active:scale-95 transition-all animate-in fade-in slide-in-from-bottom-2 cursor-pointer border border-slate-700/30 dark:border-slate-300/30 backdrop-blur-xs"
                title="Voltar ao início do histórico de registros"
              >
                <ArrowUp className="h-3.5 w-3.5" />
                <span>Topo do Histórico</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modal 1: Leitura Integral da Observação */}
      {observacaoLeitura && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="relative w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-700">
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
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200/40 dark:border-slate-700/50">
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

            <div className="max-h-[50vh] overflow-y-auto rounded-xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-700 dark:bg-slate-950/40">
              <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap font-normal">
                {observacaoLeitura.texto_completo || observacaoLeitura.texto}
              </p>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleImprimirObservacaoIndividual(observacaoLeitura)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 shadow-2xs transition-all cursor-pointer"
                  title="Imprimir esta anotação em formato de despacho individual"
                >
                  <Printer className="h-3.5 w-3.5 text-school-blue-600 dark:text-school-blue-400" />
                  <span>Imprimir Esta Observação</span>
                </button>

                {currentUser.id === (observacaoLeitura.usuario_id || observacaoLeitura.autor_id) && (
                  <button
                    type="button"
                    onClick={() => abrirEdicao(observacaoLeitura)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-school-blue-300 bg-school-blue-50 px-3 py-1.5 text-xs font-bold text-school-blue-700 hover:bg-school-blue-100 dark:border-school-blue-800 dark:bg-school-blue-950/50 dark:text-school-blue-300 cursor-pointer"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    <span>Editar Anotação</span>
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setObservacaoLeitura(null)}
                className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-750 cursor-pointer"
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
          <div className="relative w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <Edit3 className="h-5 w-5 text-school-blue-600 dark:text-school-gold-400" />
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  Editar Observação & Registrar Auditoria
                </h3>
              </div>
              <button
                onClick={() => setObservacaoEditando(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-white"
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

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setObservacaoEditando(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
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

      {/* Modal 3: Trilha de Auditoria & Histórico de Alterações do Estudante */}
      {modalAuditoriaAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="relative w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex flex-col max-h-[90vh]">
            {/* Header do Modal */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-700">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-school-blue-50 text-school-blue-700 dark:bg-school-blue-950/60 dark:text-school-blue-300">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                    Trilha de Auditoria & Histórico de Alterações
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Estudante: <strong className="text-slate-800 dark:text-slate-200">{estudante.nome_completo}</strong> • Registro imutável de exclusões e edições
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalAuditoriaAberto(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Filtros rápidos do modal */}
            <div className="flex items-center justify-between gap-2 py-3 border-b border-slate-100 dark:border-slate-700 flex-wrap">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setFiltroAuditoriaEvento('todos')}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all ${
                    filtroAuditoriaEvento === 'todos'
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  Todos ({auditoriasDesteEstudante.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroAuditoriaEvento('DELETE')}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all ${
                    filtroAuditoriaEvento === 'DELETE'
                      ? 'bg-rose-600 text-white'
                      : 'bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/50 dark:text-rose-300'
                  }`}
                >
                  Exclusões ({auditoriasDesteEstudante.filter(a => a.evento === 'DELETE' || a.acao === 'EXCLUSAO').length})
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroAuditoriaEvento('UPDATE')}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all ${
                    filtroAuditoriaEvento === 'UPDATE'
                      ? 'bg-blue-600 text-white'
                      : 'bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/50 dark:text-blue-300'
                  }`}
                >
                  Edições ({auditoriasDesteEstudante.filter(a => a.evento === 'UPDATE' || a.acao === 'ALTERACAO').length})
                </button>
              </div>

              <span className="text-[10px] text-slate-400">
                Ordenado cronologicamente (mais recente primeiro)
              </span>
            </div>

            {/* Lista dos registros de auditoria */}
            <div className="flex-1 overflow-y-auto py-3 space-y-3 pr-1 text-xs">
              {auditoriasFiltradas.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-slate-400 dark:border-slate-700">
                  <ShieldCheck className="h-8 w-8 mx-auto mb-2 opacity-30 text-slate-400" />
                  <p className="font-bold">Nenhum evento registrado nesta categoria de auditoria.</p>
                  <p className="text-[11px] mt-0.5">As exclusões e modificações são registradas de forma atômica no banco de dados.</p>
                </div>
              ) : (
                auditoriasFiltradas.map((audit) => {
                  const isDelete = audit.evento === 'DELETE' || audit.acao === 'EXCLUSAO';
                  const isUpdate = audit.evento === 'UPDATE' || audit.acao === 'ALTERACAO';
                  const dataEventoIso = audit.data_exclusao || audit.created_at;
                  
                  // 📅 Data e Hora da Exclusão formatada em horário local (DD/MM/AAAA às HH:mm:ss)
                  const dataFormatada = dataEventoIso
                    ? new Date(dataEventoIso).toLocaleString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })
                    : 'Data não informada';

                  // 👤 Responsável pela Exclusão
                  const responsavelNome = audit.excluido_por_usuario_nome || audit.usuario_nome || 'Equipe Escolar';

                  // Categoria
                  const catKey = (audit.categoria || 'geral').toLowerCase() as TipoObservacaoAluno;
                  const conf = CATEGORIAS_CONFIG[catKey] || CATEGORIAS_CONFIG.geral;

                  // 📜 Conteúdo Original
                  const textoOriginal = audit.conteudo_observacao || audit.texto_anterior || '';

                  return (
                    <div
                      key={audit.id}
                      className={`rounded-xl border p-4 transition-all shadow-xs space-y-2.5 ${
                        isDelete
                          ? 'border-rose-200 bg-rose-50/40 dark:border-rose-900/50 dark:bg-rose-950/20'
                          : 'border-blue-200 bg-blue-50/40 dark:border-blue-900/50 dark:bg-blue-950/20'
                      }`}
                    >
                      {/* Topo do Card de Auditoria */}
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          {/* 🏷️ Tipo de Ação: Badge em destaque */}
                          {isDelete ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-rose-100 px-2 py-0.5 text-[10px] font-black uppercase text-rose-800 border border-rose-300 dark:bg-rose-900 dark:text-rose-200 dark:border-rose-800">
                              <Trash2 className="h-3 w-3" />
                              Excluído
                            </span>
                          ) : isUpdate ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-blue-100 px-2 py-0.5 text-[10px] font-black uppercase text-blue-800 border border-blue-300 dark:bg-blue-900 dark:text-blue-200 dark:border-blue-800">
                              <Edit3 className="h-3 w-3" />
                              Edição / Alterado
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-black uppercase text-emerald-800 border border-emerald-300 dark:bg-emerald-900 dark:text-emerald-200 dark:border-emerald-800">
                              <CheckCircle2 className="h-3 w-3" />
                              Criação / Registro
                            </span>
                          )}

                          <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${conf.bg} ${conf.cor} border ${conf.border}`}>
                            {conf.label}
                          </span>
                        </div>

                        {/* 📅 Data e Hora da Exclusão */}
                        <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                          <Clock className="h-3 w-3 text-slate-400" />
                          <span>{dataFormatada}</span>
                        </div>
                      </div>

                      {/* 👤 Responsável pela Exclusão */}
                      <div className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-300 bg-white/80 dark:bg-slate-900/60 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                        <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span>
                          {isDelete ? 'Excluído por: ' : 'Alterado por: '}
                          <strong className="text-slate-900 dark:text-white">{responsavelNome}</strong>
                          {audit.excluido_por_usuario_id && (
                            <span className="text-slate-400 text-[10px] ml-1">({audit.excluido_por_usuario_id})</span>
                          )}
                        </span>
                      </div>

                      {/* 📜 Conteúdo Original */}
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          {isDelete ? 'Conteúdo da Anotação Apagada:' : 'Texto Anterior à Edição:'}
                        </span>
                        <div className="rounded-lg bg-white p-3 border border-slate-200 dark:bg-slate-950 dark:border-slate-800">
                          <p className="text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                            {textoOriginal || <span className="italic text-slate-400">Texto não disponível</span>}
                          </p>
                        </div>
                      </div>

                      {/* Se for alteração, exibe também o novo texto */}
                      {isUpdate && audit.texto_novo && (
                        <div className="space-y-1 pt-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                            Novo Texto Atualizado:
                          </span>
                          <div className="rounded-lg bg-blue-50/60 p-3 border border-blue-200 dark:bg-blue-950/40 dark:border-blue-900">
                            <p className="text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                              {audit.texto_novo}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Rodapé do Modal */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
              <span className="text-[11px] text-slate-400">
                Total de {auditoriasFiltradas.length} evento(s) no histórico
              </span>
              <button
                type="button"
                onClick={() => setModalAuditoriaAberto(false)}
                className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
