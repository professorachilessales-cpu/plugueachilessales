'use client';

import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import {
  Calendar as CalendarIcon,
  Plus,
  Printer,
  ChevronLeft,
  ChevronRight,
  Clock,
  Users,
  X,
  Trash2,
  Filter,
  Layers,
  Sparkles,
  BookOpen,
  Coffee,
  GraduationCap,
  Users2,
  CalendarDays,
  Info
} from 'lucide-react';
import { CategoriaEvento, EventoEscolar } from '@/lib/types';
import { PrintHeader } from '@/components/layout/PrintHeader';

const CATEGORIAS_CONFIG: Record<
  CategoriaEvento,
  { label: string; bgLight: string; bgDark: string; border: string; text: string; icon: React.ElementType; defaultColor: string }
> = {
  prova: {
    label: 'Avaliações & Provas',
    bgLight: 'bg-blue-50 text-blue-700',
    bgDark: 'dark:bg-blue-950/50 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-800/60',
    text: 'text-blue-600 dark:text-blue-400',
    icon: GraduationCap,
    defaultColor: '#2563EB',
  },
  reuniao: {
    label: 'Reuniões Pedagógicas / Pais',
    bgLight: 'bg-amber-50 text-amber-800',
    bgDark: 'dark:bg-amber-950/50 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-800/60',
    text: 'text-amber-600 dark:text-amber-400',
    icon: Users2,
    defaultColor: '#EAB308',
  },
  feriado: {
    label: 'Feriados & Recessos',
    bgLight: 'bg-rose-50 text-rose-700',
    bgDark: 'dark:bg-rose-950/50 dark:text-rose-300',
    border: 'border-rose-200 dark:border-rose-800/60',
    text: 'text-rose-600 dark:text-rose-400',
    icon: Coffee,
    defaultColor: '#EF4444',
  },
  cultural: {
    label: 'Culturais & Feiras',
    bgLight: 'bg-emerald-50 text-emerald-700',
    bgDark: 'dark:bg-emerald-950/50 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-800/60',
    text: 'text-emerald-600 dark:text-emerald-400',
    icon: Sparkles,
    defaultColor: '#10B981',
  },
};

export default function CalendarioPage() {
  const { eventos, addEvento, deleteEvento, role } = useApp();

  const [visualizacao, setVisualizacao] = useState<'grade' | 'lista'>('grade');
  const [categoriaFiltro, setCategoriaFiltro] = useState<CategoriaEvento | 'todas'>('todas');
  // Exibe o mês atual ao abrir a tela
  const [dataAtual, setDataAtual] = useState(() => {
    const agora = new Date();
    return new Date(agora.getFullYear(), agora.getMonth(), 1);
  });
  const [eventoSelecionado, setEventoSelecionado] = useState<EventoEscolar | null>(null);
  const [modalNovoEventoAberto, setModalNovoEventoAberto] = useState(false);

  // Helper para estado inicial do formulário de novo evento
  const getInitialFormEvento = () => {
    const agora = new Date();
    const anoStr = agora.getFullYear();
    const mesStr = String(agora.getMonth() + 1).padStart(2, '0');
    const diaStr = String(agora.getDate()).padStart(2, '0');
    const dataBase = `${anoStr}-${mesStr}-${diaStr}`;
    return {
      titulo: '',
      descricao: '',
      data_inicio: `${dataBase}T08:00`,
      data_fim: `${dataBase}T11:30`,
      categoria: 'prova' as CategoriaEvento,
      cor: CATEGORIAS_CONFIG.prova.defaultColor,
      publico_alvo: 'Toda a Escola',
    };
  };

  // Form de criação de novo evento
  const [formEvento, setFormEvento] = useState(getInitialFormEvento);

  // Filtragem de eventos
  const eventosFiltrados = useMemo(() => {
    return eventos.filter((ev) => {
      if (categoriaFiltro === 'todas') return true;
      return ev.categoria === categoriaFiltro;
    });
  }, [eventos, categoriaFiltro]);

  // Cálculos do Calendário Mensal
  const ano = dataAtual.getFullYear();
  const mes = dataAtual.getMonth();

  const primeiroDiaSemana = new Date(ano, mes, 1).getDay(); // 0 = Domingo
  const diasNoMes = new Date(ano, mes + 1, 0).getDate();

  const nomeMes = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(dataAtual);

  const mudarMes = (delta: number) => {
    setDataAtual(new Date(ano, mes + delta, 1));
  };

  const handleCadastrarEvento = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formEvento.titulo) return;

    addEvento({
      titulo: formEvento.titulo,
      descricao: formEvento.descricao,
      data_inicio: new Date(formEvento.data_inicio).toISOString(),
      data_fim: new Date(formEvento.data_fim).toISOString(),
      categoria: formEvento.categoria,
      cor: formEvento.cor || CATEGORIAS_CONFIG[formEvento.categoria].defaultColor,
      publico_alvo: formEvento.publico_alvo,
    });

    setModalNovoEventoAberto(false);
    setFormEvento(getInitialFormEvento());
  };

  // Estatísticas Rápidas
  const totalEventos = eventos.length;
  const totalProvas = eventos.filter((e) => e.categoria === 'prova').length;
  const totalReunioes = eventos.filter((e) => e.categoria === 'reuniao').length;
  const totalFeriados = eventos.filter((e) => e.categoria === 'feriado').length;

  return (
    <div className="space-y-6">
      {/* Cabeçalho de Impressão Timbrado */}
      <PrintHeader
        documentTitle="CALENDÁRIO OFICIAL DE ATIVIDADES E EVENTOS"
        documentSubtitle="Cronograma Geral do Ano Letivo 2026 - Gestão Pedagógica"
      />

      {/* Header Principal da Página */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
              Calendário & Eventos Escolares
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800 dark:bg-blue-900/60 dark:text-blue-300">
              <CalendarDays className="h-3.5 w-3.5" />
              Ano Letivo 2026
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Planejamento pedagógico unificado, avaliações, conselhos de classe, reuniões e recessos letivos.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-school-dark-border dark:bg-school-dark-surface dark:text-slate-200 dark:hover:bg-slate-700"
          >
            <Printer className="h-4 w-4 text-slate-500" />
            Imprimir
          </button>

          {/* Opção exclusiva para Administrador */}
          {role === 'admin' && (
            <button
              onClick={() => setModalNovoEventoAberto(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-blue-600 dark:hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Novo Evento
            </button>
          )}
        </div>
      </div>

      {/* Métricas e Resumos Rápidos */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:gap-4 print:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-school-dark-border dark:bg-school-dark-surface">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total de Eventos</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200">
              <CalendarIcon className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{totalEventos}</p>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">No cronograma oficial</span>
        </div>

        <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4 shadow-sm dark:border-blue-900/50 dark:bg-blue-950/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-blue-700 dark:text-blue-300">Avaliações & Provas</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
              <GraduationCap className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold text-blue-900 dark:text-blue-200">{totalProvas}</p>
          <span className="text-[11px] text-blue-700 dark:text-blue-300">Simulados e Bimestrais</span>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 shadow-sm dark:border-amber-900/50 dark:bg-amber-950/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-amber-800 dark:text-amber-300">Reuniões & Pais</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300">
              <Users2 className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold text-amber-900 dark:text-amber-200">{totalReunioes}</p>
          <span className="text-[11px] text-amber-700 dark:text-amber-300">Conselho e Comunidade</span>
        </div>

        <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-4 shadow-sm dark:border-rose-900/50 dark:bg-rose-950/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-rose-700 dark:text-rose-300">Recessos & Feriados</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300">
              <Coffee className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold text-rose-900 dark:text-rose-200">{totalFeriados}</p>
          <span className="text-[11px] text-rose-700 dark:text-rose-300">Dias não letivos</span>
        </div>
      </div>

      {/* Barra de Filtros e Alternância de Visualização */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-school-dark-border dark:bg-school-dark-surface sm:flex-row sm:items-center sm:justify-between print:hidden">
        {/* Filtro por Categorias */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setCategoriaFiltro('todas')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              categoriaFiltro === 'todas'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
            }`}
          >
            Todos ({eventos.length})
          </button>

          {(Object.keys(CATEGORIAS_CONFIG) as CategoriaEvento[]).map((catKey) => {
            const config = CATEGORIAS_CONFIG[catKey];
            const Icon = config.icon;
            const count = eventos.filter((e) => e.categoria === catKey).length;
            const isSelected = categoriaFiltro === catKey;

            return (
              <button
                key={catKey}
                onClick={() => setCategoriaFiltro(catKey)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  isSelected
                    ? `${config.bgLight} ${config.bgDark} ring-2 ring-blue-500 font-semibold`
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {config.label.split(' ')[0]} ({count})
              </button>
            );
          })}
        </div>

        {/* Alternador Grade x Lista & Navegação de Mês */}
        <div className="flex items-center justify-between gap-3 sm:justify-end">
          <div className="flex items-center rounded-lg border border-slate-200 p-1 dark:border-school-dark-border bg-slate-50 dark:bg-slate-800/60">
            <button
              onClick={() => setVisualizacao('grade')}
              className={`rounded px-2.5 py-1 text-xs font-medium transition ${
                visualizacao === 'grade'
                  ? 'bg-white text-blue-600 shadow-sm dark:bg-school-dark-surface dark:text-blue-400'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              Grade Mensal
            </button>
            <button
              onClick={() => setVisualizacao('lista')}
              className={`rounded px-2.5 py-1 text-xs font-medium transition ${
                visualizacao === 'lista'
                  ? 'bg-white text-blue-600 shadow-sm dark:bg-school-dark-surface dark:text-blue-400'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              Lista Cronológica
            </button>
          </div>
        </div>
      </div>

      {/* Visualização: GRADE MENSAL */}
      {visualizacao === 'grade' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm dark:border-school-dark-border dark:bg-school-dark-surface">
          {/* Navegador de Mês */}
          <div className="mb-6 flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold capitalize text-slate-900 dark:text-white">
                {nomeMes}
              </h2>
              <span className="hidden sm:inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                {eventosFiltrados.length} evento(s) listados
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => mudarMes(-1)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                title="Mês Anterior"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={() => {
                  const agora = new Date();
                  setDataAtual(new Date(agora.getFullYear(), agora.getMonth(), 1));
                }}
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Hoje / Mês Atual
              </button>
              <button
                onClick={() => mudarMes(1)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                title="Próximo Mês"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Cabeçalho dos Dias da Semana */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2 text-center text-xs font-semibold text-slate-500 dark:text-slate-400">
            <div>Dom</div>
            <div>Seg</div>
            <div>Ter</div>
            <div>Qua</div>
            <div>Qui</div>
            <div>Sex</div>
            <div>Sáb</div>
          </div>

          {/* Células de Dias do Mês */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {/* Espaços vazios antes do dia 1 */}
            {Array.from({ length: primeiroDiaSemana }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="min-h-[85px] sm:min-h-[110px] rounded-lg border border-dashed border-slate-100 bg-slate-50/40 p-1.5 opacity-40 dark:border-slate-800 dark:bg-slate-900/30"
              />
            ))}

            {/* Dias reais do mês */}
            {Array.from({ length: diasNoMes }).map((_, i) => {
              const diaNum = i + 1;
              const dataString = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(diaNum).padStart(2, '0')}`;

              // Eventos que ocorrem neste dia
              const eventosDoDia = eventosFiltrados.filter((ev) => {
                const dataInicioEv = ev.data_inicio.split('T')[0];
                return dataInicioEv === dataString;
              });

              const isFimDeSemana = (primeiroDiaSemana + i) % 7 === 0 || (primeiroDiaSemana + i) % 7 === 6;
              const hoje = new Date();
              const isHoje = hoje.getFullYear() === ano && hoje.getMonth() === mes && hoje.getDate() === diaNum;

              return (
                <div
                  key={`day-${diaNum}`}
                  className={`min-h-[85px] sm:min-h-[110px] rounded-xl border p-1.5 transition-all flex flex-col justify-between ${
                    isHoje
                      ? 'border-blue-500 bg-blue-50/40 ring-2 ring-blue-500/30 dark:border-blue-500 dark:bg-blue-950/20'
                      : eventosDoDia.length > 0
                      ? 'border-blue-200 bg-blue-50/20 dark:border-blue-900/40 dark:bg-blue-950/10'
                      : isFimDeSemana
                      ? 'border-slate-100 bg-slate-50/60 dark:border-slate-800/60 dark:bg-slate-900/20'
                      : 'border-slate-200 bg-white hover:border-slate-300 dark:border-school-dark-border dark:bg-school-dark-surface'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                        isHoje
                          ? 'bg-blue-600 text-white font-bold ring-2 ring-blue-300 dark:ring-blue-700'
                          : eventosDoDia.length > 0
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-700 dark:text-slate-300'
                      }`}
                      title={isHoje ? 'Hoje' : undefined}
                    >
                      {diaNum}
                    </span>

                    {eventosDoDia.length > 0 && (
                      <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">
                        {eventosDoDia.length} ev
                      </span>
                    )}
                  </div>

                  {/* Lista de Pílulas de Eventos no Dia */}
                  <div className="flex-1 space-y-1 overflow-y-auto max-h-[65px] pr-0.5">
                    {eventosDoDia.map((ev) => {
                      const catConfig = CATEGORIAS_CONFIG[ev.categoria];
                      return (
                        <button
                          key={ev.id}
                          onClick={() => setEventoSelecionado(ev)}
                          className="w-full text-left truncate rounded px-1.5 py-0.5 text-[11px] font-medium transition hover:opacity-90 block"
                          style={{
                            backgroundColor: `${ev.cor}18`,
                            color: ev.cor,
                            borderLeft: `3px solid ${ev.cor}`,
                          }}
                          title={`${ev.titulo} (${new Date(ev.data_inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })})`}
                        >
                          {ev.titulo}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Visualização: LISTA CRONOLÓGICA */}
      {visualizacao === 'lista' && (
        <div className="space-y-3">
          {eventosFiltrados.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-12 text-center dark:border-school-dark-border dark:bg-school-dark-surface">
              <CalendarIcon className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600" />
              <h3 className="mt-3 text-base font-semibold text-slate-800 dark:text-slate-200">
                Nenhum evento encontrado nesta categoria
              </h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {role === 'admin'
                  ? 'Ajuste os filtros acima ou cadastre um novo evento escolar.'
                  : 'Ajuste os filtros acima para visualizar os eventos escolares.'}
              </p>
            </div>
          ) : (
            eventosFiltrados.map((ev) => {
              const catConfig = CATEGORIAS_CONFIG[ev.categoria];
              const Icon = catConfig.icon;

              const dataInicioFormat = new Date(ev.data_inicio).toLocaleDateString('pt-BR', {
                weekday: 'long',
                day: '2-digit',
                month: 'long',
                year: 'numeric',
              });

              const horaInicio = new Date(ev.data_inicio).toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit',
              });
              const horaFim = new Date(ev.data_fim).toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={ev.id}
                  className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-school-dark-border dark:bg-school-dark-surface sm:flex-row sm:items-start sm:justify-between card-print"
                >
                  <div className="flex items-start gap-4">
                    <div
                      className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl shadow-inner"
                      style={{ backgroundColor: `${ev.cor}20`, color: ev.cor }}
                    >
                      <Icon className="h-6 w-6" />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                          style={{
                            backgroundColor: `${ev.cor}18`,
                            color: ev.cor,
                          }}
                        >
                          {catConfig.label}
                        </span>

                        {ev.publico_alvo && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                            <Users className="h-3 w-3" />
                            {ev.publico_alvo}
                          </span>
                        )}
                      </div>

                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        {ev.titulo}
                      </h3>

                      <p className="text-sm text-slate-600 dark:text-slate-300">
                        {ev.descricao}
                      </p>

                      <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1 capitalize font-medium text-slate-700 dark:text-slate-200">
                          <CalendarIcon className="h-3.5 w-3.5 text-slate-400" />
                          {dataInicioFormat}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 text-slate-400" />
                          {horaInicio} às {horaFim}
                        </span>
                      </div>
                    </div>
                  </div>

                  {role === 'admin' && (
                    <button
                      onClick={() => deleteEvento(ev.id)}
                      className="inline-flex items-center gap-1 self-end rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 sm:self-auto print:hidden"
                      title="Excluir Evento"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Modal de Detalhes do Evento */}
      {eventoSelecionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-school-dark-border dark:bg-school-dark-surface animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-xl"
                  style={{
                    backgroundColor: `${eventoSelecionado.cor}20`,
                    color: eventoSelecionado.cor,
                  }}
                >
                  <CalendarIcon className="h-5 w-5" />
                </div>
                <div>
                  <span
                    className="text-xs font-bold uppercase tracking-wider"
                    style={{ color: eventoSelecionado.cor }}
                  >
                    {CATEGORIAS_CONFIG[eventoSelecionado.categoria].label}
                  </span>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    {eventoSelecionado.titulo}
                  </h3>
                </div>
              </div>

              <button
                onClick={() => setEventoSelecionado(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Descrição</span>
                <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">
                  {eventoSelecionado.descricao || 'Sem descrição cadastrada.'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 rounded-xl bg-slate-50 p-3.5 text-xs dark:bg-slate-800/60">
                <div>
                  <span className="font-semibold text-slate-500 dark:text-slate-400">Data e Horário</span>
                  <p className="mt-1 font-medium text-slate-800 dark:text-slate-200">
                    {new Date(eventoSelecionado.data_inicio).toLocaleDateString('pt-BR')}
                  </p>
                  <p className="text-slate-500 dark:text-slate-400">
                    {new Date(eventoSelecionado.data_inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} às {new Date(eventoSelecionado.data_fim).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>

                <div>
                  <span className="font-semibold text-slate-500 dark:text-slate-400">Público-Alvo</span>
                  <p className="mt-1 font-medium text-slate-800 dark:text-slate-200">
                    {eventoSelecionado.publico_alvo || 'Toda a Instituição'}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800">
              {role === 'admin' ? (
                <button
                  onClick={() => {
                    deleteEvento(eventoSelecionado.id);
                    setEventoSelecionado(null);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                >
                  <Trash2 className="h-4 w-4" />
                  Excluir Evento
                </button>
              ) : (
                <div />
              )}

              <button
                onClick={() => setEventoSelecionado(null)}
                className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Criação de Novo Evento (Exclusivo Administrador) */}
      {modalNovoEventoAberto && role === 'admin' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-school-dark-border dark:bg-school-dark-surface animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                  <Plus className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Cadastrar Evento Escolar
                </h3>
              </div>
              <button
                onClick={() => setModalNovoEventoAberto(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCadastrarEvento} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Título do Evento *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Simulado Geral ENEM - 2º Dia"
                  value={formEvento.titulo}
                  onChange={(e) => setFormEvento({ ...formEvento, titulo: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-school-dark-border dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Categoria *
                  </label>
                  <select
                    value={formEvento.categoria}
                    onChange={(e) => {
                      const cat = e.target.value as CategoriaEvento;
                      setFormEvento({
                        ...formEvento,
                        categoria: cat,
                        cor: CATEGORIAS_CONFIG[cat].defaultColor,
                      });
                    }}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-school-dark-border dark:bg-slate-800 dark:text-white"
                  >
                    <option value="prova">Avaliação / Prova</option>
                    <option value="reuniao">Reunião Pedagógica / Pais</option>
                    <option value="feriado">Feriado / Recesso</option>
                    <option value="cultural">Evento Cultural / Feira</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Público-Alvo
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 3º Ano Médio, Pais"
                    value={formEvento.publico_alvo}
                    onChange={(e) => setFormEvento({ ...formEvento, publico_alvo: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-school-dark-border dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Início *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={formEvento.data_inicio}
                    onChange={(e) => setFormEvento({ ...formEvento, data_inicio: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-school-dark-border dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Término *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={formEvento.data_fim}
                    onChange={(e) => setFormEvento({ ...formEvento, data_fim: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-school-dark-border dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Descrição & Orientações Pedagógicas
                </label>
                <textarea
                  rows={3}
                  placeholder="Detalhes sobre salas, material necessário, cronograma da atividade..."
                  value={formEvento.descricao}
                  onChange={(e) => setFormEvento({ ...formEvento, descricao: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-school-dark-border dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalNovoEventoAberto(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-school-dark-border dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700"
                >
                  Salvar no Cronograma
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
