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
  FileText
} from 'lucide-react';
import { ActivityLog, ActivityLogActionType } from '@/lib/types';

export default function AuditoriaPage() {
  const { activityLogs, refreshActivityLogs, role } = useApp();

  // Estados de Filtros
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [usuarioFiltro, setUsuarioFiltro] = useState('todos');
  const [tipoAcaoFiltro, setTipoAcaoFiltro] = useState<string>('todos');
  const [buscaTexto, setBuscaTexto] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Estado do Modal de Detalhes
  const [logSelecionado, setLogSelecionado] = useState<ActivityLog | null>(null);
  const [buscaEstudanteModal, setBuscaEstudanteModal] = useState('');

  // Lista única de usuários para o dropdown de filtro
  const usuariosUnicos = useMemo(() => {
    const map = new Map<string, string>();
    activityLogs.forEach((l) => {
      if (l.user_name) {
        map.set(l.user_name, l.user_name);
      }
    });
    return Array.from(map.values());
  }, [activityLogs]);

  // Recarregar logs do Turso
  const handleRecarregar = async () => {
    setIsRefreshing(true);
    try {
      await refreshActivityLogs();
    } finally {
      setIsRefreshing(false);
    }
  };

  // Filtragem dos logs
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
      if (tipoAcaoFiltro !== 'todos' && log.action_type !== tipoAcaoFiltro) {
        return false;
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
        if (!noResumo && !noUsuario && !naEntidade && !nosAlunos) {
          return false;
        }
      }

      return true;
    });
  }, [activityLogs, dataInicio, dataFim, usuarioFiltro, tipoAcaoFiltro, buscaTexto]);

  // Métricas gerais de auditoria
  const metricas = useMemo(() => {
    const total = activityLogs.length;
    const statusChanges = activityLogs.filter((l) => l.action_type === 'CLASS_STATUS_CHANGE').length;
    const migrations = activityLogs.filter((l) => l.action_type === 'STUDENT_MIGRATION').length;
    const totalAfetados = activityLogs.reduce((acc, l) => acc + (l.details?.total_afetados || 0), 0);
    return { total, statusChanges, migrations, totalAfetados };
  }, [activityLogs]);

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
    if (logsFiltrados.length === 0) return;
    const headers = ['Data e Hora', 'Usuário', 'Tipo de Ação', 'Entidade Afetada', 'Resumo', 'Total Afetados'];
    const rows = logsFiltrados.map((l) => [
      new Date(l.created_at).toLocaleString('pt-BR'),
      l.user_name,
      l.action_type === 'CLASS_STATUS_CHANGE' ? 'Mudança de Status da Turma' : 'Migração de Estudante',
      l.target_class_name || 'N/A',
      l.details?.resumo || '',
      l.details?.total_afetados || 0,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(';'), ...rows.map((r) => r.map((cell) => `"${cell}"`).join(';'))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `registro_atividades_auditoria_${new Date().toISOString().slice(0, 10)}.csv`);
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
            Registro de Atividades & Auditoria
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Trilha de auditoria imutável (Append-Only) para rastrear alterações de status de turmas e migrações
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRecarregar}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition-all"
            title="Sincronizar com banco de dados Turso"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin text-school-blue-600' : ''}`} />
            <span>{isRefreshing ? 'Atualizando...' : 'Atualizar'}</span>
          </button>

          <button
            onClick={handleExportarCSV}
            className="inline-flex items-center gap-1.5 rounded-xl bg-school-blue-800 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-school-blue-700 dark:bg-school-blue-600 transition-all"
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
              O registro de atividades é restrito à direção e administração do sistema. Os logs são imutáveis e protegidos contra edição ou exclusão.
            </p>
          </div>
        </div>
      )}

      {/* Cards de Métricas Rápidas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-school-dark-border dark:bg-school-dark-surface">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total de Registros</span>
            <div className="rounded-xl bg-blue-50 p-2 text-school-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{metricas.total}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Eventos auditados e imutáveis</p>
        </div>

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

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-school-dark-border dark:bg-school-dark-surface">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Alunos Impactados</span>
            <div className="rounded-xl bg-amber-50 p-2 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{metricas.totalAfetados}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Total de matrículas afetadas</p>
        </div>
      </div>

      {/* 🔍 1. ÁREA DE FILTROS (TOPO DA TELA) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-school-dark-border dark:bg-school-dark-surface">
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-2">
            <Filter className="h-4 w-4 text-school-blue-600 dark:text-school-gold-400" />
            Filtros de Pesquisa
          </h3>

          {(dataInicio || dataFim || usuarioFiltro !== 'todos' || tipoAcaoFiltro !== 'todos' || buscaTexto) && (
            <button
              onClick={handleLimparFiltros}
              className="text-xs font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400 flex items-center gap-1"
            >
              <X className="h-3 w-3" />
              Limpar Filtros
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 text-xs">
          {/* 📅 Período Inicial */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Data Inicial
            </label>
            <div className="relative">
              <Calendar className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-8 pr-3 py-2 text-xs text-slate-900 focus:border-school-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* 📅 Período Final */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Data Final
            </label>
            <div className="relative">
              <Calendar className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-8 pr-3 py-2 text-xs text-slate-900 focus:border-school-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* 👤 Filtro por Usuário */}
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

          {/* 🏷️ Filtro por Tipo de Ação */}
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
              <option value="CLASS_STATUS_CHANGE">Mudança de Status de Turma</option>
              <option value="STUDENT_MIGRATION">Migração de Estudante</option>
            </select>
          </div>

          {/* 🔍 Busca Textual */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Busca Livre
            </label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Turma, aluno ou resumo..."
                value={buscaTexto}
                onChange={(e) => setBuscaTexto(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-8 pr-3 py-2 text-xs text-slate-900 focus:border-school-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 📊 2. TABELA PRINCIPAL DE LOGS */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden dark:border-school-dark-border dark:bg-school-dark-surface">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between dark:border-slate-800">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="h-4 w-4 text-school-blue-600 dark:text-school-gold-400" />
            Histórico Consolidado de Atividades ({logsFiltrados.length})
          </h3>
          <span className="text-[11px] font-semibold text-slate-400">
            Tabela Append-Only • Turso Cloud
          </span>
        </div>

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
                    <p className="font-semibold">Nenhum registro de auditoria encontrado para os filtros selecionados.</p>
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
                          <School className="h-3.5 w-3.5 text-school-blue-600 dark:text-school-gold-400 flex-shrink-0" />
                          <span>{log.target_class_name || 'Turma não informada'}</span>
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
                          className="inline-flex items-center gap-1.5 rounded-xl border border-school-blue-200 bg-blue-50/70 px-3 py-1.5 font-bold text-school-blue-700 hover:bg-school-blue-600 hover:text-white dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-600 dark:hover:text-white transition-all shadow-sm"
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

      {/* 📄 3. MODAL DE DETALHES (O PULINHO DO GATO 🐈) */}
      {logSelecionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-school-dark-surface max-h-[90vh] flex flex-col">
            {/* Header do Modal */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${
                  logSelecionado.action_type === 'CLASS_STATUS_CHANGE'
                    ? logSelecionado.details?.status_novo
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                    : 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
                }`}>
                  {logSelecionado.action_type === 'CLASS_STATUS_CHANGE' ? (
                    logSelecionado.details?.status_novo ? <ToggleRight className="h-6 w-6" /> : <ToggleLeft className="h-6 w-6" />
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
              {/* Box de Resumo e Metadados */}
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

                {/* Seção Comparativa Antes / Depois */}
                {logSelecionado.action_type === 'CLASS_STATUS_CHANGE' ? (
                  <div className="flex items-center gap-3 pt-2">
                    <div className="rounded-xl border border-slate-200 bg-white p-2.5 text-center flex-1 dark:border-slate-700 dark:bg-slate-800">
                      <span className="text-[10px] text-slate-400 uppercase font-bold">Status Anterior</span>
                      <p className="font-black text-xs text-slate-700 dark:text-slate-300">
                        {logSelecionado.details?.status_anterior ? '🟢 Ativada' : '🔴 Desativada'}
                      </p>
                    </div>
                    <ArrowRightLeft className="h-4 w-4 text-slate-400 flex-shrink-0" />
                    <div className="rounded-xl border border-slate-200 bg-white p-2.5 text-center flex-1 dark:border-slate-700 dark:bg-slate-800">
                      <span className="text-[10px] text-slate-400 uppercase font-bold">Novo Status</span>
                      <p className="font-black text-xs text-slate-900 dark:text-white">
                        {logSelecionado.details?.status_novo ? '🟢 Ativada (Estudantes Ativos)' : '🔴 Desativada (Estudantes Trancados)'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 pt-2">
                    <div className="rounded-xl border border-slate-200 bg-white p-2.5 text-center flex-1 dark:border-slate-700 dark:bg-slate-800">
                      <span className="text-[10px] text-slate-400 uppercase font-bold">Turma de Origem</span>
                      <p className="font-black text-xs text-slate-700 dark:text-slate-300">
                        {logSelecionado.details?.turma_origem_nome || 'Origem'}
                      </p>
                    </div>
                    <ArrowRightLeft className="h-4 w-4 text-purple-600 flex-shrink-0" />
                    <div className="rounded-xl border border-slate-200 bg-white p-2.5 text-center flex-1 dark:border-slate-700 dark:bg-slate-800">
                      <span className="text-[10px] text-slate-400 uppercase font-bold">Turma de Destino</span>
                      <p className="font-black text-xs text-purple-700 dark:text-purple-300">
                        {logSelecionado.details?.turma_destino_nome || 'Destino'}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Lista dos Estudantes Afetados */}
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Users className="h-4 w-4 text-school-blue-600 dark:text-school-gold-400" />
                    Estudantes Afetados ({logSelecionado.details?.estudantes_afetados?.length || 0})
                  </h4>

                  {/* Campo de Busca de Estudante no Modal */}
                  {(logSelecionado.details?.estudantes_afetados?.length || 0) > 4 && (
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-3 w-3 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Filtrar por nome..."
                        value={buscaEstudanteModal}
                        onChange={(e) => setBuscaEstudanteModal(e.target.value)}
                        className="rounded-lg border border-slate-200 bg-slate-50 pl-7 pr-2.5 py-1 text-[11px] text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white focus:outline-none focus:border-school-blue-500"
                      />
                    </div>
                  )}
                </div>

                {/* Grid / Lista de Alunos */}
                {(() => {
                  const alunos = logSelecionado.details?.estudantes_afetados || [];
                  const alunosFiltrados = alunos.filter((a) =>
                    a.nome.toLowerCase().includes(buscaEstudanteModal.toLowerCase()) ||
                    a.id.toLowerCase().includes(buscaEstudanteModal.toLowerCase())
                  );

                  if (alunos.length === 0) {
                    return (
                      <p className="text-slate-400 italic p-3 text-center">
                        Nenhum estudante foi afetado nesta ação (turma sem alunos matriculados).
                      </p>
                    );
                  }

                  return (
                    <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
                      {alunosFiltrados.map((est) => (
                        <div
                          key={est.id}
                          className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/30"
                        >
                          <div className="flex items-center gap-2.5">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                            <div>
                              <p className="font-bold text-slate-900 dark:text-white leading-tight">
                                {est.nome}
                              </p>
                              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                                ID: <code className="font-mono">{est.id}</code>
                              </p>
                            </div>
                          </div>

                          {/* Status / Tag */}
                          {logSelecionado.action_type === 'CLASS_STATUS_CHANGE' ? (
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                              est.status_novo === 'Ativo'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                            }`}>
                              Status: {est.status_novo || (logSelecionado.details?.status_novo ? 'Ativo' : 'Trancado')}
                            </span>
                          ) : (
                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                              Migrado ➡️ {est.status_novo || logSelecionado.details?.turma_destino_nome}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>

              {/* Tag de Auditoria Imutável */}
              <div className="rounded-xl border border-slate-200 bg-slate-100/70 p-3 text-[11px] text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-school-blue-600 dark:text-school-gold-400 flex-shrink-0" />
                <span>
                  <strong>Registro Imutável:</strong> Armazenado em banco Turso LibSQL com gatilho restritivo contra DELETE e UPDATE.
                </span>
              </div>
            </div>

            {/* Footer do Modal */}
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setLogSelecionado(null)}
                className="rounded-xl bg-school-blue-800 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-school-blue-700 dark:bg-school-blue-600"
              >
                Fechar Detalhes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
