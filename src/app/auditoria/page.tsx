'use client';

import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import {
  History,
  ShieldCheck,
  Search,
  Calendar,
  Filter,
  Users,
  ArrowRightLeft,
  ToggleLeft,
  ToggleRight,
  Eye,
  X,
  Lock,
  RefreshCw,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Clock,
  User,
  School,
  FileText,
  AlertCircle,
  Trash2,
  Edit3,
  MessageSquare,
  BookOpen
} from 'lucide-react';
import { ActivityLog, ObservacaoAuditoria } from '@/lib/types';

export default function AuditoriaPage() {
  const { 
    activityLogs, 
    refreshActivityLogs, 
    observacoesAuditoria, 
    estudantes, 
    role 
  } = useApp();

  // Estados de Abas & Filtros
  const [abaAtiva, setAbaAtiva] = useState<'todos' | 'observacoes' | 'turmas_migracoes'>('todos');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [usuarioFiltro, setUsuarioFiltro] = useState('todos');
  const [tipoAcaoFiltro, setTipoAcaoFiltro] = useState<string>('todos');
  const [buscaTexto, setBuscaTexto] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Estados dos Modais de Detalhes
  const [logSelecionado, setLogSelecionado] = useState<ActivityLog | null>(null);
  const [obsAuditoriaSelecionada, setObsAuditoriaSelecionada] = useState<ObservacaoAuditoria | null>(null);
  const [buscaEstudanteModal, setBuscaEstudanteModal] = useState('');

  // Lista única de usuários para o dropdown de filtro
  const usuariosUnicos = useMemo(() => {
    const map = new Map<string, string>();
    activityLogs.forEach((l) => {
      if (l.user_name) map.set(l.user_name, l.user_name);
    });
    observacoesAuditoria.forEach((o) => {
      const nome = o.excluido_por_usuario_nome || o.usuario_nome;
      if (nome) map.set(nome, nome);
    });
    return Array.from(map.values());
  }, [activityLogs, observacoesAuditoria]);

  // Recarregar logs do Turso
  const handleRecarregar = async () => {
    setIsRefreshing(true);
    try {
      await refreshActivityLogs();
    } finally {
      setIsRefreshing(false);
    }
  };

  // Filtragem dos logs de atividade do sistema
  const logsFiltrados = useMemo(() => {
    return activityLogs.filter((log) => {
      // Filtro por Período
      if (dataInicio) {
        const dInicio = new Date(dataInicio).getTime();
        const dLog = new Date(log.created_at).getTime();
        if (dLog < dInicio) return false;
      }

      if (dataFim) {
        const dFim = new Date(`${dataFim}T23:59:59.999Z`).getTime();
        const dLog = new Date(log.created_at).getTime();
        if (dLog > dFim) return false;
      }

      // Filtro por Usuário
      if (usuarioFiltro !== 'todos' && log.user_name !== usuarioFiltro) {
        return false;
      }

      // Filtro por Tipo de Ação
      if (tipoAcaoFiltro !== 'todos') {
        if (tipoAcaoFiltro === 'OBSERVACOES_TODAS' && log.action_type !== 'OBSERVACAO_DELETE') {
          return false;
        } else if (tipoAcaoFiltro !== 'OBSERVACOES_TODAS' && log.action_type !== tipoAcaoFiltro) {
          return false;
        }
      }

      // Filtro textual livre
      if (buscaTexto.trim()) {
        const q = buscaTexto.toLowerCase();
        const noResumo = log.details?.resumo?.toLowerCase().includes(q);
        const noUsuario = log.user_name?.toLowerCase().includes(q);
        const naEntidade = log.target_class_name?.toLowerCase().includes(q);
        const nosAlunos = log.details?.estudantes_afetados?.some((e) =>
          e.nome.toLowerCase().includes(q) || e.id.toLowerCase().includes(q)
        );
        const noConteudoObs = log.details?.conteudo_observacao?.toLowerCase().includes(q);
        if (!noResumo && !noUsuario && !naEntidade && !nosAlunos && !noConteudoObs) {
          return false;
        }
      }

      return true;
    });
  }, [activityLogs, dataInicio, dataFim, usuarioFiltro, tipoAcaoFiltro, buscaTexto]);

  // Filtragem das auditorias de observações (exclusões e alterações)
  const observacoesAuditoriaFiltradas = useMemo(() => {
    return observacoesAuditoria.filter((obs) => {
      const dataCriacao = obs.data_exclusao || obs.created_at;

      // Filtro por Período
      if (dataInicio) {
        const dInicio = new Date(dataInicio).getTime();
        const dLog = new Date(dataCriacao).getTime();
        if (dLog < dInicio) return false;
      }

      if (dataFim) {
        const dFim = new Date(`${dataFim}T23:59:59.999Z`).getTime();
        const dLog = new Date(dataCriacao).getTime();
        if (dLog > dFim) return false;
      }

      // Filtro por Usuário
      const nomeUsuario = obs.excluido_por_usuario_nome || obs.usuario_nome;
      if (usuarioFiltro !== 'todos' && nomeUsuario !== usuarioFiltro) {
        return false;
      }

      // Filtro por Tipo de Ação
      if (tipoAcaoFiltro === 'CLASS_STATUS_CHANGE' || tipoAcaoFiltro === 'STUDENT_MIGRATION') {
        return false;
      }
      if (tipoAcaoFiltro === 'OBSERVACAO_DELETE' && obs.evento !== 'DELETE' && obs.acao !== 'EXCLUSAO') {
        return false;
      }

      // Filtro textual livre
      if (buscaTexto.trim()) {
        const q = buscaTexto.toLowerCase();
        const noTexto = (obs.conteudo_observacao || obs.texto_anterior || '').toLowerCase().includes(q);
        const naCategoria = (obs.categoria || '').toLowerCase().includes(q);
        const noUser = (nomeUsuario || '').toLowerCase().includes(q);
        const aluno = estudantes.find(e => e.id === obs.estudante_id);
        const noAluno = aluno?.nome_completo?.toLowerCase().includes(q);
        if (!noTexto && !naCategoria && !noUser && !noAluno) return false;
      }

      return true;
    });
  }, [observacoesAuditoria, dataInicio, dataFim, usuarioFiltro, tipoAcaoFiltro, buscaTexto, estudantes]);

  // Métricas gerais de auditoria
  const metricas = useMemo(() => {
    const totalActivity = activityLogs.length;
    const totalObs = observacoesAuditoria.length;
    const total = totalActivity + totalObs;
    const statusChanges = activityLogs.filter((l) => l.action_type === 'CLASS_STATUS_CHANGE').length;
    const migrations = activityLogs.filter((l) => l.action_type === 'STUDENT_MIGRATION').length;
    const totalExclusoes = observacoesAuditoria.filter(a => a.evento === 'DELETE' || a.acao === 'EXCLUSAO').length;
    return { total, statusChanges, migrations, totalExclusoes };
  }, [activityLogs, observacoesAuditoria]);

  // Limpar todos os filtros
  const handleLimparFiltros = () => {
    setDataInicio('');
    setDataFim('');
    setUsuarioFiltro('todos');
    setTipoAcaoFiltro('todos');
    setBuscaTexto('');
  };

  // Exportar logs filtrados em CSV legível
  const handleExportarCSV = () => {
    const rows: string[][] = [];
    const headers = ['Data e Hora', 'Usuário', 'Tipo de Ação', 'Entidade / Aluno', 'Detalhes / Conteúdo'];

    // Adiciona logs de atividade
    if (abaAtiva === 'todos' || abaAtiva === 'turmas_migracoes') {
      logsFiltrados.forEach((l) => {
        let tipo = 'Atividade';
        if (l.action_type === 'CLASS_STATUS_CHANGE') tipo = 'Mudança de Status de Turma';
        else if (l.action_type === 'STUDENT_MIGRATION') tipo = 'Migração de Estudante';
        else if (l.action_type === 'OBSERVACAO_DELETE') tipo = 'Exclusão de Observação';

        rows.push([
          new Date(l.created_at).toLocaleString('pt-BR'),
          l.user_name,
          tipo,
          l.target_class_name || l.details?.estudante_id || 'N/A',
          l.details?.resumo || l.details?.conteudo_observacao || '',
        ]);
      });
    }

    // Adiciona logs de auditoria de observações
    if (abaAtiva === 'todos' || abaAtiva === 'observacoes') {
      observacoesAuditoriaFiltradas.forEach((obs) => {
        const aluno = estudantes.find(e => e.id === obs.estudante_id);
        const dataStr = new Date(obs.data_exclusao || obs.created_at).toLocaleString('pt-BR');
        const isDelete = obs.evento === 'DELETE' || obs.acao === 'EXCLUSAO';
        rows.push([
          dataStr,
          obs.excluido_por_usuario_nome || obs.usuario_nome || 'Equipe Escolar',
          isDelete ? 'Exclusão de Observação' : 'Alteração de Observação',
          aluno?.nome_completo || obs.estudante_id,
          obs.conteudo_observacao || obs.texto_anterior || '',
        ]);
      });
    }

    if (rows.length === 0) return;

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(';'), ...rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(';'))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `auditoria_plugue_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <History className="h-7 w-7 text-school-blue-600 dark:text-school-gold-400" />
            Auditoria & Trilha de Segurança
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Trilha de auditoria imutável (Append-Only): exclusões de observações, mudanças de turmas e movimentações
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRecarregar}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition-all cursor-pointer"
            title="Sincronizar com banco de dados Turso"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin text-school-blue-600' : ''}`} />
            <span>{isRefreshing ? 'Atualizando...' : 'Atualizar'}</span>
          </button>

          <button
            onClick={handleExportarCSV}
            className="inline-flex items-center gap-1.5 rounded-xl bg-school-blue-800 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-school-blue-700 dark:bg-school-blue-600 transition-all cursor-pointer"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            <span>Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* Alerta de Restrição para Não-Admins */}
      {role !== 'admin' && (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
          <Lock className="h-5 w-5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
          <div>
            <p className="font-bold uppercase tracking-wider text-[11px]">Acesso de Auditoria Protegido</p>
            <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">
              O módulo de auditoria é restrito à administração do sistema. Os logs são imutáveis e protegidos contra edição ou exclusão.
            </p>
          </div>
        </div>
      )}

      {/* Cards de Métricas Rápidas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total de Registros */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-school-dark-border dark:bg-school-dark-surface">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Auditado</span>
            <div className="rounded-xl bg-blue-50 p-2 text-school-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{metricas.total}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Eventos auditados e imutáveis</p>
        </div>

        {/* Exclusões de Observações */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-school-dark-border dark:bg-school-dark-surface">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Exclusões de Observações</span>
            <div className="rounded-xl bg-rose-50 p-2 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400">
              <Trash2 className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{metricas.totalExclusoes}</p>
          <p className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold mt-0.5">Anotações apagadas preservadas</p>
        </div>

        {/* Status de Turmas */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-school-dark-border dark:bg-school-dark-surface">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Status de Turmas</span>
            <div className="rounded-xl bg-emerald-50 p-2 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
              <ToggleRight className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{metricas.statusChanges}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Ativações e desativações</p>
        </div>

        {/* Migrações de Alunos */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-school-dark-border dark:bg-school-dark-surface">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Migrações de Alunos</span>
            <div className="rounded-xl bg-purple-50 p-2 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400">
              <ArrowRightLeft className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{metricas.migrations}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Transferências entre turmas</p>
        </div>
      </div>

      {/* 🔍 1. ÁREA DE FILTROS */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-school-dark-border dark:bg-school-dark-surface space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-school-blue-600 dark:text-school-gold-400" />
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Filtros Avançados de Auditoria
            </h3>
          </div>

          <button
            onClick={handleLimparFiltros}
            className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors"
          >
            Limpar Filtros
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Período De / Até */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Data Início
            </label>
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:border-school-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Data Fim
            </label>
            <input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:border-school-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </div>

          {/* Usuário Responsável */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Usuário Responsável
            </label>
            <div className="relative">
              <User className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <select
                value={usuarioFiltro}
                onChange={(e) => setUsuarioFiltro(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-8 pr-3 py-2 text-xs text-slate-900 focus:border-school-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white font-medium"
              >
                <option value="todos">Todos os Usuários</option>
                {usuariosUnicos.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Tipo de Ação */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Tipo de Ação
            </label>
            <select
              value={tipoAcaoFiltro}
              onChange={(e) => setTipoAcaoFiltro(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:border-school-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white font-medium"
            >
              <option value="todos">Todas as Ações</option>
              <option value="OBSERVACAO_DELETE">Exclusão de Observação</option>
              <option value="CLASS_STATUS_CHANGE">Mudança de Status de Turma</option>
              <option value="STUDENT_MIGRATION">Migração de Estudante</option>
            </select>
          </div>
        </div>

        {/* Busca Textual Livre */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Pesquisar por aluno, turma, usuário, justificativa ou conteúdo da observação..."
            value={buscaTexto}
            onChange={(e) => setBuscaTexto(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-xs text-slate-900 focus:border-school-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
        </div>
      </div>

      {/* 📊 2. TABELA PRINCIPAL DE AUDITORIA COM ABAS */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden dark:border-school-dark-border dark:bg-school-dark-surface space-y-0">
        {/* Barra de Abas */}
        <div className="px-6 py-3.5 border-b border-slate-100 flex items-center justify-between dark:border-slate-800 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setAbaAtiva('todos')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                abaAtiva === 'todos'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              Todas as Atividades ({logsFiltrados.length + observacoesAuditoriaFiltradas.length})
            </button>

            <button
              type="button"
              onClick={() => setAbaAtiva('observacoes')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                abaAtiva === 'observacoes'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-rose-700 bg-rose-50 hover:bg-rose-100 dark:text-rose-300 dark:bg-rose-950/40'
              }`}
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Exclusões & Observações ({observacoesAuditoriaFiltradas.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setAbaAtiva('turmas_migracoes')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                abaAtiva === 'turmas_migracoes'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              Turmas & Migrações ({logsFiltrados.length})
            </button>
          </div>

          <span className="text-[11px] font-semibold text-slate-400">
            Trilha Imutável • Turso Cloud
          </span>
        </div>

        {/* ======================================================== */}
        {/* SEÇÃO 1: AUDITORIA DE EXCLUSÕES DE OBSERVAÇÕES           */}
        {/* ======================================================== */}
        {(abaAtiva === 'todos' || abaAtiva === 'observacoes') && observacoesAuditoriaFiltradas.length > 0 && (
          <div className="border-b border-slate-100 dark:border-slate-800">
            <div className="bg-rose-50/50 px-6 py-2.5 border-b border-rose-100 dark:bg-rose-950/20 dark:border-rose-900/40 flex items-center justify-between">
              <span className="text-xs font-bold text-rose-800 dark:text-rose-300 flex items-center gap-1.5">
                <Trash2 className="h-4 w-4" />
                Trilha de Exclusões & Alterações de Observações ({observacoesAuditoriaFiltradas.length})
              </span>
              <span className="text-[10px] text-rose-700/80 dark:text-rose-400">
                Registrado com snapshot antes da exclusão
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 font-bold text-slate-600 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-300">
                    <th className="py-3 px-4 whitespace-nowrap">Data e Hora ⏱️</th>
                    <th className="py-3 px-4 whitespace-nowrap">Responsável pela Ação 👤</th>
                    <th className="py-3 px-4 whitespace-nowrap">Tipo de Ação 🏷️</th>
                    <th className="py-3 px-4 whitespace-nowrap">Estudante Afetado 🎓</th>
                    <th className="py-3 px-4">Conteúdo Original da Observação 📜</th>
                    <th className="py-3 px-4 text-center whitespace-nowrap">Detalhes 🔎</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                  {observacoesAuditoriaFiltradas.map((obs) => {
                    const isDelete = obs.evento === 'DELETE' || obs.acao === 'EXCLUSAO';
                    const isUpdate = obs.evento === 'UPDATE' || obs.acao === 'ALTERACAO';
                    const dataIso = obs.data_exclusao || obs.created_at;

                    // 📅 Data e Hora da Exclusão formatada em horário local (DD/MM/AAAA às HH:mm:ss)
                    const dataFormatada = dataIso
                      ? new Date(dataIso).toLocaleString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })
                      : 'Data recente';

                    // 👤 Responsável pela Exclusão
                    const usuarioResponsavel = obs.excluido_por_usuario_nome || obs.usuario_nome || 'Equipe Escolar';

                    // Estudante
                    const aluno = estudantes.find((e) => e.id === obs.estudante_id);
                    const nomeEstudante = aluno?.nome_completo || obs.estudante_id;

                    // 📜 Conteúdo Original
                    const conteudoTexto = obs.conteudo_observacao || obs.texto_anterior || '';

                    return (
                      <tr key={obs.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                        {/* 📅 Data e Hora */}
                        <td className="py-3 px-4 whitespace-nowrap font-medium text-slate-600 dark:text-slate-400">
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-slate-400" />
                            <span>{dataFormatada}</span>
                          </div>
                        </td>

                        {/* 👤 Responsável */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="h-6 w-6 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200 flex items-center justify-center font-bold text-[10px]">
                              {usuarioResponsavel.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 dark:text-white leading-tight">
                                {usuarioResponsavel}
                              </p>
                              {obs.excluido_por_usuario_id && (
                                <p className="text-[10px] text-slate-400">
                                  {obs.excluido_por_usuario_id}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* 🏷️ Tipo de Ação: Badge em destaque */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          {isDelete ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-rose-100 text-rose-800 border border-rose-300 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800">
                              <Trash2 className="h-3.5 w-3.5" />
                              <span>Exclusão / Removido</span>
                            </span>
                          ) : isUpdate ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-300 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800">
                              <Edit3 className="h-3.5 w-3.5" />
                              <span>Edição / Alterado</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span>Criação / Inserido</span>
                            </span>
                          )}
                        </td>

                        {/* 🎓 Estudante */}
                        <td className="py-3 px-4 whitespace-nowrap font-bold text-slate-900 dark:text-white">
                          <p>{nomeEstudante}</p>
                          {aluno?.turma_nome && (
                            <p className="text-[10px] font-normal text-slate-400">{aluno.turma_nome}</p>
                          )}
                        </td>

                        {/* 📜 Conteúdo Original */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                              {obs.categoria || 'Geral'}
                            </span>
                          </div>
                          <p className="text-slate-700 dark:text-slate-300 line-clamp-2 leading-relaxed">
                            {conteudoTexto}
                          </p>
                        </td>

                        {/* Ação */}
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <button
                            onClick={() => setObsAuditoriaSelecionada(obs)}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50/70 px-3 py-1.5 font-bold text-rose-700 hover:bg-rose-600 hover:text-white dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-600 dark:hover:text-white transition-all shadow-xs cursor-pointer"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span>Ver Registro</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* SEÇÃO 2: AUDITORIA DE STATUS DE TURMAS E MIGRAÇÕES       */}
        {/* ======================================================== */}
        {(abaAtiva === 'todos' || abaAtiva === 'turmas_migracoes') && (
          <div>
            {abaAtiva === 'todos' && observacoesAuditoriaFiltradas.length > 0 && (
              <div className="bg-slate-50 px-6 py-2.5 border-b border-slate-100 dark:bg-slate-900/50 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <School className="h-4 w-4 text-school-blue-600" />
                  Atividades de Turmas & Migrações ({logsFiltrados.length})
                </span>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 font-bold text-slate-600 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-300">
                    <th className="py-3.5 px-4 whitespace-nowrap">Data e Hora ⏱️</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Usuário Responsável 👤</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Tipo de Ação ⚡</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Entidade Afetada 🏫</th>
                    <th className="py-3.5 px-4">Resumo da Ação 📝</th>
                    <th className="py-3.5 px-4 text-center whitespace-nowrap">Ação 🔎</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                  {logsFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400 dark:text-slate-500">
                        <History className="h-8 w-8 mx-auto mb-2 opacity-40" />
                        <p className="font-semibold">Nenhum registro de atividade encontrado para os filtros selecionados.</p>
                      </td>
                    </tr>
                  ) : (
                    logsFiltrados.map((log) => {
                      const dataFormatada = new Date(log.created_at).toLocaleString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      });

                      const isStatusChange = log.action_type === 'CLASS_STATUS_CHANGE';
                      const isObsDelete = log.action_type === 'OBSERVACAO_DELETE';
                      const totalAfetados = log.details?.total_afetados || log.details?.estudantes_afetados?.length || 0;

                      return (
                        <tr
                          key={log.id}
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          {/* Data e Hora */}
                          <td className="py-3.5 px-4 whitespace-nowrap font-medium text-slate-600 dark:text-slate-400">
                            {dataFormatada}
                          </td>

                          {/* Usuário Responsável */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <div className="h-6 w-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-[10px] text-slate-700 dark:text-slate-300">
                                {log.user_name?.charAt(0).toUpperCase() || 'U'}
                              </div>
                              <div>
                                <p className="font-bold text-slate-900 dark:text-white leading-tight">
                                  {log.user_name}
                                </p>
                                <p className="text-[10px] text-slate-400">
                                  {log.user_id}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Tipo de Ação */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {isStatusChange ? (
                              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                                log.details?.status_novo
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200'
                                  : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-200'
                              }`}>
                                {log.details?.status_novo ? (
                                  <>
                                    <ToggleRight className="h-3.5 w-3.5" />
                                    <span>Ativação de Turma</span>
                                  </>
                                ) : (
                                  <>
                                    <ToggleLeft className="h-3.5 w-3.5" />
                                    <span>Desativação de Turma</span>
                                  </>
                                )}
                              </span>
                            ) : isObsDelete ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-rose-100 text-rose-800 border border-rose-200 dark:bg-rose-950 dark:text-rose-300">
                                <Trash2 className="h-3.5 w-3.5" />
                                <span>Exclusão de Observação</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-200">
                                <ArrowRightLeft className="h-3.5 w-3.5" />
                                <span>Migração de Estudante</span>
                              </span>
                            )}
                          </td>

                          {/* Entidade Afetada */}
                          <td className="py-3.5 px-4 whitespace-nowrap font-bold text-slate-900 dark:text-white">
                            <div className="flex items-center gap-1.5">
                              {isObsDelete ? (
                                <User className="h-3.5 w-3.5 text-rose-600 flex-shrink-0" />
                              ) : (
                                <School className="h-3.5 w-3.5 text-school-blue-600 dark:text-school-gold-400 flex-shrink-0" />
                              )}
                              <span>
                                {isObsDelete
                                  ? (log.details?.estudante_nome || log.details?.estudante_id || 'Estudante')
                                  : (log.target_class_name || 'Turma não informada')}
                              </span>
                            </div>
                          </td>

                          {/* Resumo da Ação */}
                          <td className="py-3.5 px-4">
                            <p className="text-slate-800 dark:text-slate-200 font-medium">
                              {log.details?.resumo || 'Sem resumo detalhado'}
                            </p>
                            {totalAfetados > 0 && (
                              <span className="inline-block mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                                {totalAfetados} aluno(s) impactado(s)
                              </span>
                            )}
                          </td>

                          {/* Ação: Ver Detalhes */}
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            <button
                              onClick={() => {
                                setLogSelecionado(log);
                                setBuscaEstudanteModal('');
                              }}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-school-blue-200 bg-blue-50/70 px-3 py-1.5 font-bold text-school-blue-700 hover:bg-school-blue-600 hover:text-white dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-600 dark:hover:text-white transition-all shadow-xs cursor-pointer"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              <span>Ver Detalhes</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* 📄 3. MODAL DE DETALHES DE LOG DE ATIVIDADE              */}
      {/* ======================================================== */}
      {logSelecionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-school-dark-surface max-h-[90vh] flex flex-col">
            {/* Header do Modal */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${
                  logSelecionado.action_type === 'CLASS_STATUS_CHANGE'
                    ? logSelecionado.details?.status_novo
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                    : logSelecionado.action_type === 'OBSERVACAO_DELETE'
                    ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                    : 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
                }`}>
                  {logSelecionado.action_type === 'CLASS_STATUS_CHANGE' ? (
                    logSelecionado.details?.status_novo ? <ToggleRight className="h-6 w-6" /> : <ToggleLeft className="h-6 w-6" />
                  ) : logSelecionado.action_type === 'OBSERVACAO_DELETE' ? (
                    <Trash2 className="h-6 w-6" />
                  ) : (
                    <ArrowRightLeft className="h-6 w-6" />
                  )}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {logSelecionado.action_type === 'CLASS_STATUS_CHANGE'
                      ? logSelecionado.details?.status_novo
                        ? 'Detalhes da Ativação de Turma'
                        : 'Detalhes da Desativação de Turma'
                      : logSelecionado.action_type === 'OBSERVACAO_DELETE'
                      ? 'Detalhes da Exclusão de Observação'
                      : 'Detalhes da Migração de Estudantes'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    ID do Registro: <code className="font-mono text-[10px] text-slate-600 dark:text-slate-300">{logSelecionado.id}</code>
                  </p>
                </div>
              </div>

              <button
                onClick={() => setLogSelecionado(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Conteúdo do Modal Scrollable */}
            <div className="flex-1 overflow-y-auto py-4 space-y-4 text-xs pr-1">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/50 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 pb-2.5 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                    <span className="text-slate-600 dark:text-slate-400">Responsável:</span>
                    <strong className="text-slate-900 dark:text-white">{logSelecionado.user_name}</strong>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                    <span className="text-slate-600 dark:text-slate-400">Executado em:</span>
                    <strong className="text-slate-900 dark:text-white">
                      {new Date(logSelecionado.created_at).toLocaleString('pt-BR')}
                    </strong>
                  </div>
                </div>

                <div>
                  <p className="text-slate-500 dark:text-slate-400">Resumo da alteração:</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                    {logSelecionado.details?.resumo}
                  </p>
                </div>

                {logSelecionado.details?.conteudo_observacao && (
                  <div className="space-y-1 pt-2 border-t border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                      Conteúdo Original da Observação Apagada:
                    </span>
                    <div className="rounded-xl bg-white p-3 border border-slate-200 dark:bg-slate-950 dark:border-slate-800">
                      <p className="text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                        {logSelecionado.details.conteudo_observacao}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setLogSelecionado(null)}
                className="rounded-xl bg-slate-900 px-5 py-2 font-bold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 text-xs"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 📄 4. MODAL DE DETALHES DE EXCLUSÃO DE OBSERVAÇÃO       */}
      {/* ======================================================== */}
      {obsAuditoriaSelecionada && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                  <Trash2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                    Registro de Auditoria: Exclusão de Observação
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    ID do Registro: <code className="font-mono text-[10px]">{obsAuditoriaSelecionada.id}</code>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setObsAuditoriaSelecionada(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-3.5 text-xs pr-1">
              {/* Box de Metadados da Exclusão */}
              <div className="rounded-xl border border-rose-200 bg-rose-50/40 p-3.5 dark:border-rose-900/50 dark:bg-rose-950/20 space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-rose-200/60 pb-2 dark:border-rose-900/40">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-rose-600 shrink-0" />
                    <span>
                      Excluído por: <strong className="text-slate-900 dark:text-white">
                        {obsAuditoriaSelecionada.excluido_por_usuario_nome || obsAuditoriaSelecionada.usuario_nome || 'Equipe Escolar'}
                      </strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 font-semibold text-rose-700 dark:text-rose-300">
                    <Clock className="h-3.5 w-3.5 shrink-0" />
                    <span>
                      {new Date(obsAuditoriaSelecionada.data_exclusao || obsAuditoriaSelecionada.created_at).toLocaleString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-300">
                  <span>
                    Estudante: <strong>{estudantes.find(e => e.id === obsAuditoriaSelecionada.estudante_id)?.nome_completo || obsAuditoriaSelecionada.estudante_id}</strong>
                  </span>
                  <span className="rounded bg-rose-100 px-2 py-0.5 font-bold uppercase text-rose-800 dark:bg-rose-900 dark:text-rose-200 text-[10px]">
                    Categoria: {obsAuditoriaSelecionada.categoria || 'Geral'}
                  </span>
                </div>
              </div>

              {/* 📜 Conteúdo Original */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Conteúdo Original da Observação Apagada:
                </span>
                <div className="rounded-xl bg-slate-50 p-4 border border-slate-200 dark:bg-slate-950 dark:border-slate-800">
                  <p className="text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed font-mono">
                    {obsAuditoriaSelecionada.conteudo_observacao || obsAuditoriaSelecionada.texto_anterior || 'Texto não disponível'}
                  </p>
                </div>
              </div>

              {/* Snapshot Técnico em JSON */}
              {obsAuditoriaSelecionada.registro_anterior && (
                <div className="space-y-1 pt-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Snapshot Original em JSON (Conformidade Legal / Trilha de Auditoria):
                  </span>
                  <pre className="rounded-xl bg-slate-950 p-3 text-[10px] text-slate-300 overflow-x-auto border border-slate-800 font-mono">
                    {typeof obsAuditoriaSelecionada.registro_anterior === 'string'
                      ? obsAuditoriaSelecionada.registro_anterior
                      : JSON.stringify(obsAuditoriaSelecionada.registro_anterior, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
              <span className="text-[11px] text-slate-400">
                Registro imutável protegido contra alteração
              </span>
              <button
                type="button"
                onClick={() => setObsAuditoriaSelecionada(null)}
                className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 cursor-pointer"
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
