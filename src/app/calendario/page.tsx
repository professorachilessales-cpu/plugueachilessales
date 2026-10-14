'use client';

import React, { useState, useMemo, useEffect } from 'react';
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
  Info,
  Tag,
  Palette,
  Eye,
  EyeOff,
  Lock,
  Check,
  AlertCircle,
  Pencil,
  Repeat,
  RotateCcw
} from 'lucide-react';
import { EventoEscolar, CalendarioCategoria, RecorrenciaTipo } from '@/lib/types';
import { PrintHeader } from '@/components/layout/PrintHeader';
import { BotaoExportarCalendarioPdf } from '@/components/calendario/BotaoExportarCalendarioPdf';

// Paleta de cores rápidas para seleção
const SWATCHES_PRESET = [
  { cor: '#4169E1', nome: 'Azul Royal' },
  { cor: '#EF4444', nome: 'Vermelho' },
  { cor: '#EAB308', nome: 'Âmbar Dourado' },
  { cor: '#10B981', nome: 'Verde Esmeralda' },
  { cor: '#8B5CF6', nome: 'Roxo Violeta' },
  { cor: '#0EA5E9', nome: 'Azul Celeste' },
  { cor: '#EC4899', nome: 'Rosa Choque' },
  { cor: '#64748B', nome: 'Cinza Ardósia' },
];

// Helper para calcular alto contraste de texto sobre a cor de fundo
function getContrastColor(hexColor: string): string {
  if (!hexColor || !hexColor.startsWith('#')) return '#FFFFFF';
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16) || 0;
  const g = parseInt(hex.substring(2, 4), 16) || 0;
  const b = parseInt(hex.substring(4, 6), 16) || 0;
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 155 ? '#0F172A' : '#FFFFFF';
}

// Formatação amigável do intervalo contínuo de datas
function formatarIntervalo(inicio: string, fim?: string): string {
  const iniStr = inicio?.includes('T') ? inicio.split('T')[0] : inicio;
  const fimStr = (fim || inicio)?.includes('T') ? (fim || inicio).split('T')[0] : (fim || inicio);
  if (!iniStr) return '';

  const [anoI, mesI, diaI] = iniStr.split('-');
  const dataIniFormatada = `${diaI}/${mesI}/${anoI}`;

  if (!fimStr || iniStr === fimStr) {
    return `${dataIniFormatada} (Dia Inteiro)`;
  }

  const [anoF, mesF, diaF] = fimStr.split('-');
  const dataFimFormatada = `${diaF}/${mesF}/${anoF}`;

  const dt1 = new Date(Number(anoI), Number(mesI) - 1, Number(diaI));
  const dt2 = new Date(Number(anoF), Number(mesF) - 1, Number(diaF));
  const diffTime = dt2.getTime() - dt1.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;

  return `${dataIniFormatada} a ${dataFimFormatada} (${diffDays} dias)`;
}

// Determina se um evento ocorre em uma data específica considerando span de datas e recorrência persistida
function eventoOcorreNoDia(
  ev: EventoEscolar,
  dataString: string,
  diaNum: number,
  mesNum: number, // 1..12
  anoNum: number
): boolean {
  // 1. Se houver data limite de expiração da recorrência e o dia a ultrapassar, não ocorre
  if (ev.recorrencia_data_limite) {
    const limiteStr = ev.recorrencia_data_limite.includes('T')
      ? ev.recorrencia_data_limite.split('T')[0]
      : ev.recorrencia_data_limite;
    if (dataString > limiteStr) {
      return false;
    }
  }

  const inicioStr = ev.data_inicio?.includes('T') ? ev.data_inicio.split('T')[0] : ev.data_inicio;
  const fimStr = (ev.data_fim || ev.data_inicio)?.includes('T')
    ? (ev.data_fim || ev.data_inicio).split('T')[0]
    : (ev.data_fim || ev.data_inicio);

  // 2. Verificação direta do período base cadastrado
  if (dataString >= inicioStr && dataString <= fimStr) {
    return true;
  }

  // 3. Se a recorrência não estiver ativa ou for 'NENHUMA', encerra
  if (!ev.recorrencia_ativa || !ev.recorrencia_tipo || ev.recorrencia_tipo === 'NENHUMA') {
    return false;
  }

  // 4. Se a data atual do grid for anterior ao início original do evento, não ocorre
  if (dataString < inicioStr) {
    return false;
  }

  // Cálculo de duração do evento base em dias
  const [iniAno, iniMes, iniDia] = inicioStr.split('-').map(Number);
  const [fimAno, fimMes, fimDia] = fimStr.split('-').map(Number);
  const dtIni = new Date(iniAno, iniMes - 1, iniDia);
  const dtFim = new Date(fimAno, fimMes - 1, fimDia);
  const diffDias = Math.max(0, Math.round((dtFim.getTime() - dtIni.getTime()) / (1000 * 60 * 60 * 24)));

  const baseDia = ev.recorrencia_dia != null ? Number(ev.recorrencia_dia) : iniDia;

  // 5. Recorrência MENSAL
  if (ev.recorrencia_tipo === 'MENSAL') {
    return diaNum >= baseDia && diaNum <= baseDia + diffDias;
  }

  // 6. Recorrência ANUAL
  if (ev.recorrencia_tipo === 'ANUAL') {
    const baseMes = ev.recorrencia_mes != null ? Number(ev.recorrencia_mes) : iniMes;
    if (mesNum === baseMes) {
      return diaNum >= baseDia && diaNum <= baseDia + diffDias;
    }
  }

  return false;
}

export default function CalendarioPage() {
  const {
    eventos,
    addEvento,
    updateEvento,
    deleteEvento,
    refreshEventos,
    role,
    currentUser,
    categoriasEvento,
    addCategoriaEvento,
    updateCategoriaEvento,
    deleteCategoriaEvento,
    escolaConfig
  } = useApp();

  const podeGerenciarCalendario = role === 'admin' || role === 'direcao' || currentUser?.funcao_tipo === 'ADMINISTRATIVO';

  // Consulta direta ao banco de dados na inicialização do componente
  useEffect(() => {
    refreshEventos();
  }, []);

  const [visualizacao, setVisualizacao] = useState<'grade' | 'lista'>('grade');
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>('todas');

  // Abre no mês atual
  const [dataAtual, setDataAtual] = useState(() => {
    const agora = new Date();
    return new Date(agora.getFullYear(), agora.getMonth(), 1);
  });

  const [eventoSelecionado, setEventoSelecionado] = useState<EventoEscolar | null>(null);
  const [modalNovoEventoAberto, setModalNovoEventoAberto] = useState(false);
  const [editandoEventoId, setEditandoEventoId] = useState<string | null>(null);
  const [modalCategoriasAberto, setModalCategoriasAberto] = useState(false);
  const [eventoParaExcluir, setEventoParaExcluir] = useState<EventoEscolar | null>(null);
  const [anoContextoExclusao, setAnoContextoExclusao] = useState<number>(new Date().getFullYear());

  // Estados do formulário de criação/edição de categoria
  const [editandoCatId, setEditandoCatId] = useState<string | null>(null);
  const [novaCatNome, setNovaCatNome] = useState('');
  const [novaCatCor, setNovaCatCor] = useState('#4169E1');
  const [novaCatVisivel, setNovaCatVisivel] = useState(true);
  const [erroCat, setErroCat] = useState<string | null>(null);
  const [sucessoCat, setSucessoCat] = useState<string | null>(null);

  // Helper para resolver informações completas da categoria (com retrocompatibilidade legada e canônica)
  const getCategoriaInfo = (catIdOrName: string): CalendarioCategoria => {
    if (!catIdOrName) {
      return {
        id: 'cat-geral',
        nome: 'Geral',
        cor_hex: '#2563EB',
        visivel_docentes: true,
        sistema_protegida: false,
      };
    }

    const termo = catIdOrName.trim().toLowerCase();

    // 1. Busca direta por ID ou Nome na lista atual de categorias
    const found = categoriasEvento.find(
      (c) => c.id.toLowerCase() === termo || c.nome.toLowerCase() === termo
    );
    if (found) return found;

    // 2. Mapeamento de termos legados para IDs canônicos
    const legacyToId: Record<string, string> = {
      prova: 'cat-provas',
      provas: 'cat-provas',
      avaliacao: 'cat-provas',
      avaliação: 'cat-provas',
      avaliacoes: 'cat-provas',
      avaliações: 'cat-provas',
      reuniao: 'cat-reunioes',
      reunião: 'cat-reunioes',
      reunioes: 'cat-reunioes',
      reuniões: 'cat-reunioes',
      feriado: 'cat-feriados',
      feriados: 'cat-feriados',
      recesso: 'cat-feriados',
      recessos: 'cat-feriados',
      cultural: 'cat-culturais',
      culturais: 'cat-culturais',
      aniversario: 'cat-aniversarios',
      aniversário: 'cat-aniversarios',
      aniversarios: 'cat-aniversarios',
      aniversários: 'cat-aniversarios',
      gestao: 'cat-gestao',
      gestão: 'cat-gestao',
    };

    if (legacyToId[termo]) {
      const canonical = categoriasEvento.find((c) => c.id === legacyToId[termo]);
      if (canonical) return canonical;
    }

    // 3. Fallbacks estáticos se ainda não encontrada
    return {
      id: catIdOrName,
      nome: catIdOrName,
      cor_hex: '#2563EB',
      visivel_docentes: true,
      sistema_protegida: false,
    };
  };

  // Verifica com precisão se um evento pertence ao filtro de categoria
  const eventoCorrespondeCategoria = (ev: EventoEscolar, filtro: string): boolean => {
    if (!filtro || filtro === 'todas') return true;

    const catInfo = getCategoriaInfo(ev.categoria);
    const filtroNorm = filtro.trim().toLowerCase();

    // Compara por ID do evento ou ID canônico
    if (ev.categoria?.toLowerCase() === filtroNorm) return true;
    if (catInfo.id.toLowerCase() === filtroNorm) return true;

    // Compara por Nome
    if (catInfo.nome.toLowerCase() === filtroNorm) return true;

    // Se o filtro selecionado for um ID ou Nome conhecido de categoria
    const catFiltroObj = categoriasEvento.find(
      (c) => c.id.toLowerCase() === filtroNorm || c.nome.toLowerCase() === filtroNorm
    );
    if (catFiltroObj) {
      if (catInfo.id === catFiltroObj.id) return true;
      if (catInfo.nome.toLowerCase() === catFiltroObj.nome.toLowerCase()) return true;
    }

    return false;
  };

  // Categorias disponíveis respeitando a visibilidade docente
  const categoriasDisponiveis = useMemo(() => {
    if (podeGerenciarCalendario) {
      return categoriasEvento;
    }
    return categoriasEvento.filter((c) => c.visivel_docentes !== false);
  }, [categoriasEvento, podeGerenciarCalendario]);

  // Categoria padrão inicial para o formulário (Avaliação / Provas em vermelho #EF4444)
  const categoriaPadrao = useMemo(() => {
    const catProvas = categoriasEvento.find(
      (c) => c.nome.toLowerCase().includes('prova') || c.nome.toLowerCase().includes('avaliação')
    );
    return catProvas || categoriasEvento[1] || categoriasEvento[0] || {
      id: 'cat-provas',
      nome: 'Avaliação / Provas',
      cor_hex: '#EF4444',
      visivel_docentes: true,
      sistema_protegida: false
    };
  }, [categoriasEvento]);

  // Helper para estado inicial do formulário simplificado (apenas datas, sem horários)
  const getInitialFormEvento = () => {
    const agora = new Date();
    const anoStr = agora.getFullYear();
    const mesStr = String(agora.getMonth() + 1).padStart(2, '0');
    const diaStr = String(agora.getDate()).padStart(2, '0');
    const hojeStr = `${anoStr}-${mesStr}-${diaStr}`;

    return {
      titulo: '',
      descricao: '',
      data_inicio: hojeStr,
      data_fim: hojeStr,
      categoria: categoriaPadrao.id,
      cor: categoriaPadrao.cor_hex || '#EF4444',
      repetir_anualmente: false,
    };
  };

  const [formEvento, setFormEvento] = useState(getInitialFormEvento);

  // 1. Todos os eventos permitidos para o perfil logado (professores não veem visivel_docentes === false)
  const todosEventosPermitidos = useMemo(() => {
    return eventos.filter((ev) => {
      const catInfo = getCategoriaInfo(ev.categoria);
      if (!podeGerenciarCalendario && catInfo.visivel_docentes === false) {
        return false;
      }
      return true;
    });
  }, [eventos, podeGerenciarCalendario, categoriasEvento]);

  // 2. Eventos filtrados pela categoria selecionada pelo usuário
  const eventosVisiveis = useMemo(() => {
    return todosEventosPermitidos.filter((ev) => eventoCorrespondeCategoria(ev, categoriaFiltro));
  }, [todosEventosPermitidos, categoriaFiltro, categoriasEvento]);

  // Cálculos do Calendário Mensal
  const ano = dataAtual.getFullYear();
  const mes = dataAtual.getMonth();

  const primeiroDiaSemana = new Date(ano, mes, 1).getDay(); // 0 = Domingo
  const diasNoMes = new Date(ano, mes + 1, 0).getDate();

  const nomeMes = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(dataAtual);

  const mudarMes = (delta: number) => {
    setDataAtual(new Date(ano, mes + delta, 1));
  };

  // Iniciar modo de edição de um evento existente
  const iniciarEdicaoEvento = (ev: EventoEscolar) => {
    setEditandoEventoId(ev.id);
    setFormEvento({
      titulo: ev.titulo,
      descricao: ev.descricao || '',
      data_inicio: ev.data_inicio,
      data_fim: ev.data_fim,
      categoria: ev.categoria,
      cor: ev.cor || getCategoriaInfo(ev.categoria).cor_hex,
      repetir_anualmente: ev.recorrencia_tipo === 'ANUAL' && Boolean(ev.recorrencia_ativa),
    });
    setEventoSelecionado(null);
    setModalNovoEventoAberto(true);
  };

  // Cadastro ou edição de evento (persistência direta sem retenção em cache)
  const handleCadastrarEvento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formEvento.titulo.trim() || !formEvento.data_inicio || !formEvento.data_fim) return;

    // Garante que data_fim >= data_inicio
    let dtInicio = formEvento.data_inicio;
    let dtFim = formEvento.data_fim;
    if (dtFim < dtInicio) {
      dtFim = dtInicio;
    }

    const [iniAno, iniMes, iniDia] = dtInicio.split('-').map(Number);
    const recTipo = formEvento.repetir_anualmente ? 'ANUAL' : 'NENHUMA';
    const recAtiva = Boolean(formEvento.repetir_anualmente);
    const recDia = formEvento.repetir_anualmente ? iniDia : null;
    const recMes = formEvento.repetir_anualmente ? iniMes : null;

    const payload = {
      titulo: formEvento.titulo.trim(),
      descricao: formEvento.descricao.trim(),
      data_inicio: dtInicio,
      data_fim: dtFim,
      categoria: formEvento.categoria,
      cor: formEvento.cor || getCategoriaInfo(formEvento.categoria).cor_hex,
      all_day: true,
      recorrencia_tipo: recTipo as RecorrenciaTipo,
      recorrencia_ativa: recAtiva,
      recorrencia_dia: recDia,
      recorrencia_mes: recMes,
      recorrencia_data_limite: null,
    };

    if (editandoEventoId) {
      await updateEvento(editandoEventoId, payload);
    } else {
      await addEvento(payload);
    }

    setModalNovoEventoAberto(false);
    setEditandoEventoId(null);
    setFormEvento(getInitialFormEvento());
  };

  // Iniciar modo de edição de uma categoria
  const iniciarEdicaoCategoria = (cat: CalendarioCategoria) => {
    setEditandoCatId(cat.id);
    setNovaCatNome(cat.nome);
    setNovaCatCor(cat.cor_hex);
    setNovaCatVisivel(cat.visivel_docentes);
    setErroCat(null);
    setSucessoCat(null);
  };

  // Cancelar modo de edição
  const cancelarEdicaoCategoria = () => {
    setEditandoCatId(null);
    setNovaCatNome('');
    setNovaCatCor('#4169E1');
    setNovaCatVisivel(true);
    setErroCat(null);
  };

  // Salvar categoria (criação ou edição)
  const handleSalvarCategoria = async (e: React.FormEvent) => {
    e.preventDefault();
    setErroCat(null);
    setSucessoCat(null);

    if (!novaCatNome.trim()) {
      setErroCat('Informe o nome da categoria.');
      return;
    }

    if (editandoCatId) {
      // MODO EDIÇÃO
      const catOriginal = categoriasEvento.find((c) => c.id === editandoCatId);
      if (!catOriginal) {
        setErroCat('Categoria não encontrada.');
        return;
      }

      // Proteção de nome da categoria Aniversários
      if (
        (catOriginal.sistema_protegida || catOriginal.id === 'cat-aniversarios') &&
        novaCatNome.trim().toLowerCase() !== catOriginal.nome.toLowerCase()
      ) {
        setErroCat('O nome da categoria Aniversários é fixo do sistema e não pode ser alterado.');
        return;
      }

      const res = await updateCategoriaEvento(editandoCatId, {
        nome: novaCatNome.trim(),
        cor_hex: novaCatCor,
        visivel_docentes: novaCatVisivel,
      });

      if (!res.success) {
        setErroCat(res.error || 'Erro ao atualizar categoria.');
      } else {
        setSucessoCat(`Categoria "${novaCatNome.trim()}" atualizada com sucesso!`);
        cancelarEdicaoCategoria();
        setTimeout(() => setSucessoCat(null), 3000);
      }
    } else {
      // MODO CRIAÇÃO
      const res = await addCategoriaEvento({
        nome: novaCatNome.trim(),
        cor_hex: novaCatCor,
        visivel_docentes: novaCatVisivel,
        sistema_protegida: false,
      });

      if (!res.success) {
        setErroCat(res.error || 'Erro ao criar categoria.');
      } else {
        setSucessoCat(`Categoria "${novaCatNome.trim()}" criada com sucesso!`);
        setNovaCatNome('');
        setNovaCatCor('#10B981');
        setNovaCatVisivel(true);
        setTimeout(() => setSucessoCat(null), 3000);
      }
    }
  };

  // Exclusão de categoria com trava para protegidas
  const handleExcluirCategoria = async (id: string) => {
    const cat = categoriasEvento.find((c) => c.id === id);
    if (!cat) return;

    if (cat.sistema_protegida || cat.id === 'cat-aniversarios' || cat.nome.toLowerCase() === 'aniversários') {
      alert('A categoria Aniversários é fixa e protegida do sistema. Não pode ser excluída.');
      return;
    }

    if (confirm(`Deseja realmente excluir a categoria "${cat.nome}"?`)) {
      const res = await deleteCategoriaEvento(id);
      if (!res.success) {
        alert(res.error || 'Erro ao excluir categoria.');
      }
    }
  };

  // Estatísticas Rápidas
  const totalEventosVisiveis = eventosVisiveis.length;

  return (
    <div className="space-y-6">
      {/* Cabeçalho de Impressão Timbrado */}
      <PrintHeader
        documentTitle="CALENDÁRIO OFICIAL DE ATIVIDADES E EVENTOS"
        documentSubtitle={`Cronograma Geral do Ano Letivo ${escolaConfig.ano_letivo_ativo || ano} - Gestão Pedagógica`}
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
              Ano Letivo {escolaConfig.ano_letivo_ativo || 2026}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Cronograma pedagógico unificado, períodos avaliativos contínuos, eventos culturais e recessos escolares.
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

          {/* Gestão Dinâmica de Categorias (Exclusivo Administrador) */}
          {podeGerenciarCalendario && (
            <button
              onClick={() => {
                cancelarEdicaoCategoria();
                setModalCategoriasAberto(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-purple-200 bg-purple-50/80 px-3.5 py-2 text-sm font-semibold text-purple-700 shadow-sm transition hover:bg-purple-100 dark:border-purple-900/50 dark:bg-purple-950/40 dark:text-purple-300 dark:hover:bg-purple-900/60"
            >
              <Palette className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              Gerenciar Categorias
            </button>
          )}

          {/* Opção exclusiva para Administrador */}
          {podeGerenciarCalendario && (
            <button
              onClick={() => {
                setEditandoEventoId(null);
                setFormEvento(getInitialFormEvento());
                setModalNovoEventoAberto(true);
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-blue-600 dark:hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Novo Evento
            </button>
          )}
        </div>
      </div>

      {/* Métricas e Resumos Rápidos das Categorias (Alto Contraste) */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:gap-4 print:grid-cols-4">
        {/* Total de Eventos */}
        <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-xs transition hover:shadow-sm dark:border-school-dark-border dark:bg-school-dark-surface relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-blue-600" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Total de Eventos</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
              <CalendarIcon className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
            {categoriaFiltro === 'todas' ? todosEventosPermitidos.length : `${eventosVisiveis.length} de ${todosEventosPermitidos.length}`}
          </p>
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            {categoriaFiltro === 'todas'
              ? (role === 'professor' ? 'No seu perfil docente' : 'No cronograma escolar geral')
              : 'Filtrado no momento'}
          </span>
        </div>

        {/* 3 Primeiras categorias com cards dinâmicos em Alto Contraste */}
        {categoriasDisponiveis.slice(0, 3).map((cat) => {
          const count = todosEventosPermitidos.filter((e) => eventoCorrespondeCategoria(e, cat.id)).length;

          return (
            <div
              key={cat.id}
              className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-xs transition hover:shadow-sm dark:border-school-dark-border dark:bg-school-dark-surface relative overflow-hidden"
            >
              {/* Barra de destaque superior na cor da categoria */}
              <div
                className="absolute top-0 left-0 right-0 h-1"
                style={{ backgroundColor: cat.cor_hex }}
              />

              <div className="flex items-center justify-between gap-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span
                    className="h-2.5 w-2.5 rounded-full shrink-0 shadow-xs ring-1 ring-black/10"
                    style={{ backgroundColor: cat.cor_hex }}
                  />
                  <span
                    className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate"
                    title={cat.nome}
                  >
                    {cat.nome}
                  </span>
                </div>
                <div
                  className="flex h-7 w-7 items-center justify-center rounded-lg shrink-0"
                  style={{
                    backgroundColor: `${cat.cor_hex}18`,
                    color: cat.cor_hex,
                  }}
                >
                  <Tag className="h-3.5 w-3.5" />
                </div>
              </div>

              {/* Número com alto contraste absoluto */}
              <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
                {count}
              </p>

              <div className="mt-1 flex items-center gap-1 text-[11px] font-semibold">
                {cat.visivel_docentes ? (
                  <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                    <Eye className="h-3 w-3" />
                    Visível aos professores
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400">
                    <EyeOff className="h-3 w-3" />
                    Exclusivo da gestão
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Barra de Filtros e Alternância de Visualização */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-school-dark-border dark:bg-school-dark-surface sm:flex-row sm:items-center sm:justify-between print:hidden">
        {/* Filtro Dinâmico por Categorias */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setCategoriaFiltro('todas')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              categoriaFiltro === 'todas'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
            }`}
          >
            Todos ({todosEventosPermitidos.length})
          </button>

          {categoriasDisponiveis.map((cat) => {
            const count = todosEventosPermitidos.filter((e) => eventoCorrespondeCategoria(e, cat.id)).length;
            const isSelected = categoriaFiltro === cat.id || categoriaFiltro === cat.nome;

            return (
              <button
                key={cat.id}
                onClick={() => setCategoriaFiltro(isSelected ? 'todas' : cat.id)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition shadow-xs ${
                  isSelected
                    ? 'ring-2 ring-blue-500 shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 border border-slate-200/70 dark:border-slate-700/70'
                }`}
                style={
                  isSelected
                    ? {
                        backgroundColor: cat.cor_hex,
                        color: getContrastColor(cat.cor_hex),
                        borderColor: cat.cor_hex,
                      }
                    : undefined
                }
              >
                <span
                  className="h-2.5 w-2.5 rounded-full shrink-0 ring-1 ring-black/15"
                  style={{
                    backgroundColor: isSelected ? getContrastColor(cat.cor_hex) : cat.cor_hex,
                  }}
                />
                <span>{cat.nome}</span>
                <span className="opacity-80 text-[10px]">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Alternador Grade x Lista */}
        <div className="flex items-center justify-between gap-3 sm:justify-end">
          <div className="flex items-center rounded-lg border border-slate-200 p-1 dark:border-school-dark-border bg-slate-50 dark:bg-slate-800/60">
            <button
              onClick={() => setVisualizacao('grade')}
              className={`rounded px-2.5 py-1 text-xs font-medium transition ${
                visualizacao === 'grade'
                  ? 'bg-white text-blue-600 shadow-sm dark:bg-school-dark-surface dark:text-blue-400 font-bold'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              Grade Mensal
            </button>
            <button
              onClick={() => setVisualizacao('lista')}
              className={`rounded px-2.5 py-1 text-xs font-medium transition ${
                visualizacao === 'lista'
                  ? 'bg-white text-blue-600 shadow-sm dark:bg-school-dark-surface dark:text-blue-400 font-bold'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              Lista Cronológica
            </button>
          </div>
        </div>
      </div>

      {/* Banner Informativo de Filtro Ativo */}
      {categoriaFiltro !== 'todas' && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50/90 p-3.5 text-xs text-blue-900 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-200 shadow-xs print:hidden animate-in fade-in">
          <div className="flex items-center gap-2">
            <span
              className="h-3 w-3 rounded-full shrink-0 shadow-xs ring-1 ring-black/10"
              style={{ backgroundColor: getCategoriaInfo(categoriaFiltro).cor_hex }}
            />
            <span>
              Filtrando categoria: <strong>{getCategoriaInfo(categoriaFiltro).nome}</strong> (
              {eventosVisiveis.length} evento(s) no total).
            </span>
          </div>

          <button
            onClick={() => setCategoriaFiltro('todas')}
            className="inline-flex items-center gap-1 rounded-md bg-white px-2.5 py-1 font-bold text-blue-700 shadow-xs hover:bg-blue-100 dark:bg-blue-900/60 dark:text-blue-200 dark:hover:bg-blue-900 transition"
          >
            <X className="h-3.5 w-3.5" />
            Limpar Filtro
          </button>
        </div>
      )}

      {/* Visualização: GRADE MENSAL (Multi-day Span Perfeito) */}
      {visualizacao === 'grade' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm dark:border-school-dark-border dark:bg-school-dark-surface">
          {/* Navegador de Mês */}
          <div className="mb-6 flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold capitalize text-slate-900 dark:text-white">
                {nomeMes}
              </h2>
              <span className="hidden sm:inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                {eventosVisiveis.length} evento(s) no cronograma
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => mudarMes(-1)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition"
                title="Mês Anterior"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={() => {
                  const agora = new Date();
                  setDataAtual(new Date(agora.getFullYear(), agora.getMonth(), 1));
                }}
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition"
              >
                Hoje / Mês Atual
              </button>
              <button
                onClick={() => mudarMes(1)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition"
                title="Próximo Mês"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Cabeçalho dos Dias da Semana */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2 text-center text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <div className="text-rose-500">Dom</div>
            <div>Seg</div>
            <div>Ter</div>
            <div>Qua</div>
            <div>Qui</div>
            <div>Sex</div>
            <div className="text-slate-400">Sáb</div>
          </div>

          {/* Células de Dias do Mês */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {/* Espaços vazios antes do dia 1 */}
            {Array.from({ length: primeiroDiaSemana }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="min-h-[90px] sm:min-h-[115px] rounded-lg border border-dashed border-slate-100 bg-slate-50/40 p-1.5 opacity-40 dark:border-slate-800 dark:bg-slate-900/30"
              />
            ))}

            {/* Dias reais do mês */}
            {Array.from({ length: diasNoMes }).map((_, i) => {
              const diaNum = i + 1;
              const dataString = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(diaNum).padStart(2, '0')}`;

              // Eventos que cobrem este dia: data_inicio <= dia_calendario <= data_fim
              const eventosDoDia = eventosVisiveis.filter((ev) => {
                const inicioStr = ev.data_inicio?.includes('T') ? ev.data_inicio.split('T')[0] : ev.data_inicio;
                const fimStr = (ev.data_fim || ev.data_inicio)?.includes('T')
                  ? (ev.data_fim || ev.data_inicio).split('T')[0]
                  : (ev.data_fim || ev.data_inicio);

                return dataString >= inicioStr && dataString <= fimStr;
              });

              const diaSemana = (primeiroDiaSemana + i) % 7; // 0 = Domingo, 6 = Sábado
              const isFimDeSemana = diaSemana === 0 || diaSemana === 6;

              const hoje = new Date();
              const isHoje =
                hoje.getFullYear() === ano &&
                hoje.getMonth() === mes &&
                hoje.getDate() === diaNum;

              return (
                <div
                  key={`day-${diaNum}`}
                  className={`min-h-[90px] sm:min-h-[115px] rounded-xl border p-1.5 transition-all flex flex-col justify-between overflow-x-clip ${
                    isHoje
                      ? 'border-blue-500 bg-blue-50/30 ring-2 ring-blue-500/20 dark:border-blue-500 dark:bg-blue-950/20'
                      : eventosDoDia.length > 0
                      ? 'border-slate-200 bg-white hover:border-slate-300 dark:border-school-dark-border dark:bg-school-dark-surface'
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
                          : diaSemana === 0
                          ? 'text-rose-600 font-bold'
                          : 'text-slate-700 dark:text-slate-300'
                      }`}
                      title={isHoje ? 'Hoje' : undefined}
                    >
                      {diaNum}
                    </span>

                    {eventosDoDia.length > 0 && (
                      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                        {eventosDoDia.length} ev
                      </span>
                    )}
                  </div>

                  {/* Lista de Barras Contínuas dos Eventos no Dia */}
                  <div className="flex-1 space-y-1 overflow-y-auto max-h-[75px] py-0.5">
                    {eventosDoDia.map((ev) => {
                      const inicioStr = ev.data_inicio?.includes('T') ? ev.data_inicio.split('T')[0] : ev.data_inicio;
                      const fimStr = (ev.data_fim || ev.data_inicio)?.includes('T')
                        ? (ev.data_fim || ev.data_inicio).split('T')[0]
                        : (ev.data_fim || ev.data_inicio);

                      const isMultiDay = inicioStr !== fimStr;
                      const isFirstDay = dataString === inicioStr;
                      const isLastDay = dataString === fimStr;
                      const isStartOfRow = diaSemana === 0;
                      const isEndOfRow = diaSemana === 6;

                      const catInfo = getCategoriaInfo(ev.categoria);
                      const corFinal = ev.cor || catInfo.cor_hex || '#2563EB';
                      const textColor = getContrastColor(corFinal);

                      // Lógica de conectividade contínua do bloco cruzando células e semanas
                      let roundedClasses = 'rounded-md';
                      let marginClasses = 'mx-0.5';

                      if (isMultiDay) {
                        if ((isFirstDay || isStartOfRow) && (isLastDay || isEndOfRow)) {
                          roundedClasses = 'rounded-md';
                          marginClasses = 'mx-0.5';
                        } else if (isFirstDay || isStartOfRow) {
                          roundedClasses = 'rounded-l-md rounded-r-none';
                          marginClasses = 'ml-0.5 -mr-2.5';
                        } else if (isLastDay || isEndOfRow) {
                          roundedClasses = 'rounded-r-md rounded-l-none';
                          marginClasses = '-ml-2.5 mr-0.5';
                        } else {
                          roundedClasses = 'rounded-none';
                          marginClasses = '-mx-2.5';
                        }
                      }

                      const ehRecorrente = ev.recorrencia_tipo === 'ANUAL' && ev.recorrencia_ativa;

                      return (
                        <button
                          key={`${ev.id}-${dataString}`}
                          onClick={() => setEventoSelecionado(ev)}
                          className={`h-5 text-left px-1.5 text-[10px] font-bold transition hover:brightness-110 flex items-center shadow-xs z-10 block w-full relative ${roundedClasses} ${marginClasses}`}
                          style={{
                            backgroundColor: corFinal,
                            color: textColor,
                          }}
                          title={`${ev.titulo} (${formatarIntervalo(ev.data_inicio, ev.data_fim)})${ehRecorrente ? ' - Repete anualmente' : ''}`}
                        >
                          {isFirstDay || isStartOfRow || !isMultiDay ? (
                            <span className="truncate flex items-center gap-1">
                              {isMultiDay && <Layers className="h-2.5 w-2.5 shrink-0 opacity-80" />}
                              {ehRecorrente && <Repeat className="h-2.5 w-2.5 shrink-0 opacity-90" />}
                              <span className="truncate">{ev.titulo}</span>
                            </span>
                          ) : (
                            <span className="truncate opacity-90 text-[9px] font-medium flex items-center gap-1">
                              <span className="h-1 w-1 rounded-full bg-white/70 shrink-0" />
                              {ehRecorrente && <Repeat className="h-2 w-2 shrink-0 opacity-80" />}
                              <span className="truncate">{ev.titulo}</span>
                            </span>
                          )}
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
          {eventosVisiveis.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-12 text-center dark:border-school-dark-border dark:bg-school-dark-surface">
              <CalendarIcon className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600" />
              <h3 className="mt-3 text-base font-semibold text-slate-800 dark:text-slate-200">
                Nenhum evento encontrado nesta categoria
              </h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {podeGerenciarCalendario
                  ? 'Ajuste os filtros acima ou cadastre um novo evento escolar.'
                  : 'Ajuste os filtros acima para visualizar os eventos escolares.'}
              </p>
            </div>
          ) : (
            eventosVisiveis.map((ev) => {
              const catInfo = getCategoriaInfo(ev.categoria);
              const corFinal = ev.cor || catInfo.cor_hex || '#2563EB';

              return (
                <div
                  key={ev.id}
                  className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-school-dark-border dark:bg-school-dark-surface sm:flex-row sm:items-start sm:justify-between card-print"
                >
                  <div className="flex items-start gap-4">
                    <div
                      className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl shadow-inner font-bold"
                      style={{ backgroundColor: `${corFinal}20`, color: corFinal }}
                    >
                      <CalendarIcon className="h-6 w-6" />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className="rounded-full px-2.5 py-0.5 text-xs font-bold"
                          style={{
                            backgroundColor: `${corFinal}18`,
                            color: corFinal,
                            border: `1px solid ${corFinal}40`,
                          }}
                        >
                          {catInfo.nome}
                        </span>

                        {catInfo.visivel_docentes === false && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                            <EyeOff className="h-3 w-3" />
                            Exclusivo Gestão
                          </span>
                        )}

                        {ev.publico_alvo && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                            <Users className="h-3 w-3" />
                            {ev.publico_alvo}
                          </span>
                        )}

                        {ev.recorrencia_tipo === 'ANUAL' && ev.recorrencia_ativa && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 border border-blue-200 dark:bg-blue-950/50 dark:border-blue-900/60 dark:text-blue-300">
                            <Repeat className="h-3 w-3" />
                            Repete anualmente
                          </span>
                        )}
                      </div>

                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        {ev.titulo}
                      </h3>

                      {ev.descricao && (
                        <p className="text-sm text-slate-600 dark:text-slate-300">
                          {ev.descricao}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
                          <Clock className="h-3.5 w-3.5 text-blue-500" />
                          {formatarIntervalo(ev.data_inicio, ev.data_fim)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {podeGerenciarCalendario && (
                    <div className="flex items-center gap-1 self-end sm:self-auto print:hidden">
                      <button
                        onClick={() => iniciarEdicaoEvento(ev)}
                        className="inline-flex items-center rounded-lg p-2 text-slate-400 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950/40 dark:hover:text-blue-400"
                        title="Editar Evento"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => {
                          setAnoContextoExclusao(ano);
                          setEventoParaExcluir(ev);
                        }}
                        className="inline-flex items-center rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
                        title="Excluir Evento"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Modal de Detalhes do Evento */}
      {eventoSelecionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-school-dark-border dark:bg-school-dark-surface animate-in zoom-in-95">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-xl"
                  style={{
                    backgroundColor: `${eventoSelecionado.cor || getCategoriaInfo(eventoSelecionado.categoria).cor_hex}20`,
                    color: eventoSelecionado.cor || getCategoriaInfo(eventoSelecionado.categoria).cor_hex,
                  }}
                >
                  <CalendarIcon className="h-6 w-6" />
                </div>
                <div>
                  <span
                    className="text-xs font-bold uppercase tracking-wider"
                    style={{ color: eventoSelecionado.cor || getCategoriaInfo(eventoSelecionado.categoria).cor_hex }}
                  >
                    {getCategoriaInfo(eventoSelecionado.categoria).nome}
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
              <div className="rounded-xl bg-slate-50 p-3.5 dark:bg-slate-800/60">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Período Vigente
                </p>
                <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                  {formatarIntervalo(eventoSelecionado.data_inicio, eventoSelecionado.data_fim)}
                </p>
              </div>

              {eventoSelecionado.recorrencia_tipo === 'ANUAL' && eventoSelecionado.recorrencia_ativa && (
                <div className="flex items-center gap-2.5 rounded-xl bg-blue-50 p-3 text-xs text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:border-blue-900 dark:text-blue-300">
                  <Repeat className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
                  <span>
                    <strong>Evento Recorrente:</strong> Este evento se repete no mesmo dia todos os anos no calendário escolar.
                  </span>
                </div>
              )}

              {eventoSelecionado.descricao ? (
                <div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Descrição & Observações
                  </p>
                  <p className="mt-1 text-sm text-slate-700 dark:text-slate-300 whitespace-pre-line">
                    {eventoSelecionado.descricao}
                  </p>
                </div>
              ) : (
                <p className="text-xs italic text-slate-400">Nenhuma observação informada.</p>
              )}
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800">
              {podeGerenciarCalendario ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const ev = eventoSelecionado;
                      setAnoContextoExclusao(ano);
                      setEventoParaExcluir(ev);
                      setEventoSelecionado(null);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                  >
                    <Trash2 className="h-4 w-4" />
                    Excluir
                  </button>
                  <button
                    onClick={() => iniciarEdicaoEvento(eventoSelecionado)}
                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition"
                  >
                    <Pencil className="h-4 w-4" />
                    Editar
                  </button>
                </div>
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

      {/* Modal de Confirmação e Exclusão Condicional (Ano em diante vs Todos os anos) */}
      {eventoParaExcluir && podeGerenciarCalendario && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-school-dark-border dark:bg-school-dark-surface animate-in zoom-in-95">
            <div className="flex items-start gap-3.5 border-b border-slate-100 pb-4 dark:border-slate-800">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400">
                <Trash2 className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {eventoParaExcluir.recorrencia_tipo === 'ANUAL' && eventoParaExcluir.recorrencia_ativa
                    ? 'Excluir Evento Recorrente'
                    : 'Confirmar Exclusão de Evento'}
                </h3>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
                  {eventoParaExcluir.titulo}
                </p>
              </div>
              <button
                onClick={() => setEventoParaExcluir(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {eventoParaExcluir.recorrencia_tipo === 'ANUAL' && eventoParaExcluir.recorrencia_ativa ? (
              <div className="mt-4 space-y-4">
                <div className="rounded-xl bg-amber-50 p-3.5 text-xs text-amber-800 border border-amber-200 dark:bg-amber-950/30 dark:border-amber-900/60 dark:text-amber-300">
                  <div className="flex items-center gap-1.5 font-bold mb-1">
                    <Repeat className="h-4 w-4" />
                    Evento com repetição anual cadastrado
                  </div>
                  Este evento ocorre no mesmo dia todos os anos. Como você deseja excluí-lo?
                </div>

                <div className="space-y-2.5">
                  <button
                    type="button"
                    onClick={async () => {
                      const id = eventoParaExcluir.id;
                      const anoExcl = anoContextoExclusao;
                      setEventoParaExcluir(null);
                      await deleteEvento(id, anoExcl);
                    }}
                    className="w-full text-left rounded-xl border border-slate-200 p-3.5 transition hover:border-blue-400 hover:bg-blue-50/50 dark:border-slate-700 dark:hover:border-blue-500 dark:hover:bg-blue-950/20 group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">
                        Excluir daquele ano ({anoContextoExclusao}) em diante
                      </span>
                      <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300">
                        Recomendado
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      Exclui a ocorrência no ano de {anoContextoExclusao} e em todos os anos futuros, mantendo o histórico registrado nos anos anteriores.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      const id = eventoParaExcluir.id;
                      setEventoParaExcluir(null);
                      await deleteEvento(id);
                    }}
                    className="w-full text-left rounded-xl border border-rose-200 p-3.5 transition hover:border-rose-400 hover:bg-rose-50/50 dark:border-rose-900/50 dark:hover:border-rose-700 dark:hover:bg-rose-950/20 group"
                  >
                    <span className="text-xs font-bold text-rose-700 dark:text-rose-400">
                      Excluir todas as ocorrências (todos os anos)
                    </span>
                    <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      Remove o evento permanentemente do sistema em todos os anos, apagando tanto o histórico passado quanto os anos futuros.
                    </p>
                  </button>
                </div>

                <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setEventoParaExcluir(null)}
                    className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Tem certeza de que deseja excluir permanentemente o evento <strong>"{eventoParaExcluir.titulo}"</strong>? Esta ação não pode ser desfeita.
                </p>

                <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setEventoParaExcluir(null)}
                    className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      const id = eventoParaExcluir.id;
                      setEventoParaExcluir(null);
                      await deleteEvento(id);
                    }}
                    className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-rose-700"
                  >
                    Excluir Evento
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de Criação/Edição de Evento (Apenas Datas, Sem Horários - Exclusivo Administrador) */}
      {modalNovoEventoAberto && podeGerenciarCalendario && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-school-dark-border dark:bg-school-dark-surface animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                  {editandoEventoId ? <Pencil className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {editandoEventoId ? 'Editar Evento Escolar' : 'Cadastrar Evento Escolar'}
                </h3>
              </div>
              <button
                onClick={() => {
                  setModalNovoEventoAberto(false);
                  setEditandoEventoId(null);
                }}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCadastrarEvento} className="mt-4 space-y-4">
              {/* Título */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Título / Nome do Evento *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Simulado Geral ENEM - 1º Dia"
                  value={formEvento.titulo}
                  onChange={(e) => setFormEvento({ ...formEvento, titulo: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-school-dark-border dark:bg-slate-800 dark:text-white"
                />
              </div>

              {/* Datas: Início e Término (YYYY-MM-DD sem horas) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Data de Início *
                  </label>
                  <input
                    type="date"
                    required
                    value={formEvento.data_inicio}
                    onChange={(e) => {
                      const newIni = e.target.value;
                      setFormEvento((prev) => ({
                        ...prev,
                        data_inicio: newIni,
                        // Se o término ficou menor, atualiza automaticamente
                        data_fim: prev.data_fim < newIni ? newIni : prev.data_fim,
                      }));
                    }}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-school-dark-border dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Data de Término *
                  </label>
                  <input
                    type="date"
                    required
                    min={formEvento.data_inicio}
                    value={formEvento.data_fim}
                    onChange={(e) => setFormEvento({ ...formEvento, data_fim: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-school-dark-border dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              {/* Categoria */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Categoria *
                </label>
                <select
                  value={formEvento.categoria}
                  onChange={(e) => {
                    const catId = e.target.value;
                    const catObj = getCategoriaInfo(catId);
                    setFormEvento({
                      ...formEvento,
                      categoria: catId,
                      cor: catObj.cor_hex || formEvento.cor, // herda cor da categoria
                    });
                  }}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-school-dark-border dark:bg-slate-800 dark:text-white"
                >
                  {categoriasEvento.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome} {c.visivel_docentes === false ? '(Exclusivo Gestão)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Seletor de Cor do Evento (Herdada com Personalização) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Cor do Evento (Personalizável)
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const catObj = getCategoriaInfo(formEvento.categoria);
                      setFormEvento({ ...formEvento, cor: catObj.cor_hex });
                    }}
                    className="text-[11px] text-blue-600 hover:underline dark:text-blue-400 font-medium"
                  >
                    Restaurar cor da categoria
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={formEvento.cor}
                    onChange={(e) => setFormEvento({ ...formEvento, cor: e.target.value })}
                    className="h-9 w-12 cursor-pointer rounded-lg border border-slate-200 bg-white p-0.5 shadow-sm dark:border-slate-700"
                    title="Seletor de Cor Personalizada"
                  />
                  <span className="font-mono text-xs font-bold uppercase text-slate-600 dark:text-slate-300 w-16">
                    {formEvento.cor}
                  </span>

                  {/* Swatches rápidos */}
                  <div className="flex items-center gap-1.5 flex-wrap ml-auto">
                    {SWATCHES_PRESET.map((s) => (
                      <button
                        key={s.cor}
                        type="button"
                        onClick={() => setFormEvento({ ...formEvento, cor: s.cor })}
                        style={{ backgroundColor: s.cor }}
                        title={s.nome}
                        className={`h-6 w-6 rounded-full border-2 transition-transform ${
                          formEvento.cor.toLowerCase() === s.cor.toLowerCase()
                            ? 'scale-115 border-slate-900 dark:border-white shadow-sm ring-1 ring-blue-500'
                            : 'border-transparent hover:scale-110'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Repetição Anual do Evento */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 dark:border-school-dark-border dark:bg-slate-800/40">
                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formEvento.repetir_anualmente}
                    onChange={(e) => setFormEvento({ ...formEvento, repetir_anualmente: e.target.checked })}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-700"
                  />
                  <div>
                    <span className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                      <Repeat className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                      Repetir no mesmo dia todos os anos
                    </span>
                    <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      Quando marcada, o evento fica registrado e é exibido automaticamente nesta mesma data em todos os anos no calendário escolar.
                    </p>
                  </div>
                </label>
              </div>

              {/* Descrição / Observação (Opcional) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Descrição / Observações (Opcional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Orientações aos professores, salas, material pedagógico..."
                  value={formEvento.descricao}
                  onChange={(e) => setFormEvento({ ...formEvento, descricao: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-school-dark-border dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setModalNovoEventoAberto(false);
                    setEditandoEventoId(null);
                  }}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-school-dark-border dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700"
                >
                  {editandoEventoId ? 'Salvar Alterações' : 'Salvar no Cronograma'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Gestão Dinâmica de Categorias & Cores (Exclusivo Administrador) */}
      {modalCategoriasAberto && podeGerenciarCalendario && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-school-dark-border dark:bg-school-dark-surface animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300">
                  <Palette className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    Gestão Dinâmica de Categorias & Cores
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Defina paletas personalizadas e controle o acesso e visibilidade no perfil dos docentes.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  cancelarEdicaoCategoria();
                  setModalCategoriasAberto(false);
                }}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Alertas */}
            {erroCat && (
              <div className="mt-4 flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-300">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{erroCat}</span>
              </div>
            )}
            {sucessoCat && (
              <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-900 dark:text-emerald-300">
                <Check className="h-4 w-4 shrink-0" />
                <span>{sucessoCat}</span>
              </div>
            )}

            {/* 1. Categorias Cadastradas */}
            <div className="mt-5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
                Categorias Atuais ({categoriasEvento.length})
              </h4>

              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {categoriasEvento.map((c) => (
                  <div
                    key={c.id}
                    className={`flex items-center justify-between rounded-xl border p-3 transition ${
                      editandoCatId === c.id
                        ? 'border-purple-500 bg-purple-50/70 dark:border-purple-500 dark:bg-purple-950/40 ring-2 ring-purple-400/40'
                        : 'border-slate-200 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="h-4 w-4 rounded-full border border-white shadow-xs shrink-0"
                        style={{ backgroundColor: c.cor_hex }}
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-900 dark:text-white">
                            {c.nome}
                          </span>
                          {c.sistema_protegida && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800 dark:bg-blue-900/60 dark:text-blue-300">
                              <Lock className="h-3 w-3" />
                              Fixa & Protegida
                            </span>
                          )}
                          {editandoCatId === c.id && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-800 dark:bg-purple-900/80 dark:text-purple-200 animate-pulse">
                              <Pencil className="h-2.5 w-2.5" />
                              Em edição
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="font-mono text-[10px] text-slate-500 uppercase">
                            {c.cor_hex}
                          </span>
                          <span className="text-slate-300">•</span>
                          {c.visivel_docentes ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                              <Eye className="h-3 w-3" />
                              Visível para Docentes
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                              <EyeOff className="h-3 w-3" />
                              Exclusivo Gestão / Coordenação
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {/* Botão Editar Categoria */}
                      <button
                        type="button"
                        onClick={() => iniciarEdicaoCategoria(c)}
                        className={`rounded-lg p-2 transition ${
                          editandoCatId === c.id
                            ? 'bg-purple-600 text-white shadow-xs'
                            : 'text-slate-500 hover:bg-purple-50 hover:text-purple-600 dark:text-slate-400 dark:hover:bg-purple-950/40 dark:hover:text-purple-300'
                        }`}
                        title="Editar Categoria"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>

                      {/* Botão Excluir Categoria (Bloqueado para Aniversários / Protegidas) */}
                      {c.sistema_protegida || c.id === 'cat-aniversarios' || c.nome.toLowerCase() === 'aniversários' ? (
                        <span
                          title="A categoria Aniversários é protegida do sistema e não pode ser excluída"
                          className="inline-flex items-center p-2 text-slate-300 dark:text-slate-600 cursor-not-allowed"
                        >
                          <Lock className="h-4 w-4" />
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleExcluirCategoria(c.id)}
                          className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 transition"
                          title="Excluir Categoria"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. Formulário de Criação ou Edição de Categoria */}
            <form onSubmit={handleSalvarCategoria} className="mt-6 border-t border-slate-100 pt-5 dark:border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`flex h-6 w-6 items-center justify-center rounded-md ${editandoCatId ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300' : 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300'}`}>
                    {editandoCatId ? <Pencil className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                  </div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    {editandoCatId ? 'Editar Categoria' : 'Criar Nova Categoria'}
                  </h4>
                </div>
                {editandoCatId && (
                  <button
                    type="button"
                    onClick={cancelarEdicaoCategoria}
                    className="text-xs text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300 underline font-medium"
                  >
                    Cancelar edição e criar nova
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Nome da Categoria *
                  </label>
                  <input
                    type="text"
                    required
                    disabled={Boolean(editandoCatId && categoriasEvento.find(c => c.id === editandoCatId)?.sistema_protegida)}
                    placeholder="Ex: Projetos Integradores, Palestras..."
                    value={novaCatNome}
                    onChange={(e) => setNovaCatNome(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 disabled:bg-slate-100 disabled:cursor-not-allowed dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:disabled:bg-slate-900"
                  />
                  {editandoCatId && categoriasEvento.find(c => c.id === editandoCatId)?.sistema_protegida && (
                    <p className="mt-1 text-[11px] text-blue-600 dark:text-blue-400 font-medium">
                      O nome desta categoria é protegido pelo sistema e não pode ser alterado.
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Cor Padrão *
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={novaCatCor}
                      onChange={(e) => setNovaCatCor(e.target.value)}
                      className="h-9 w-12 cursor-pointer rounded-lg border border-slate-200 bg-white p-0.5 shadow-sm dark:border-slate-700"
                    />
                    <span className="font-mono text-xs font-bold uppercase text-slate-600 dark:text-slate-300 w-16">
                      {novaCatCor}
                    </span>
                    <div className="flex items-center gap-1 flex-wrap">
                      {SWATCHES_PRESET.slice(0, 5).map((s) => (
                        <button
                          key={s.cor}
                          type="button"
                          onClick={() => setNovaCatCor(s.cor)}
                          style={{ backgroundColor: s.cor }}
                          className={`h-5 w-5 rounded-full border ${
                            novaCatCor.toLowerCase() === s.cor.toLowerCase()
                              ? 'scale-110 border-slate-900 dark:border-white shadow-xs'
                              : 'border-transparent'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Switch de Visibilidade no Perfil de Docentes */}
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 dark:border-slate-700 dark:bg-slate-800/30">
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">
                    Visível no perfil dos docentes
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {editandoCatId && (categoriasEvento.find(c => c.id === editandoCatId)?.sistema_protegida || editandoCatId === 'cat-aniversarios')
                      ? 'A categoria Aniversários é de uso exclusivo da gestão e não é visível para o perfil docente.'
                      : 'Se desmarcado, esta categoria e os eventos a ela vinculados serão de uso restrito da gestão e coordenação.'}
                  </p>
                </div>
                <label className={`relative inline-flex items-center ${editandoCatId && (categoriasEvento.find(c => c.id === editandoCatId)?.sistema_protegida || editandoCatId === 'cat-aniversarios') ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
                  <input
                    type="checkbox"
                    disabled={Boolean(editandoCatId && (categoriasEvento.find(c => c.id === editandoCatId)?.sistema_protegida || editandoCatId === 'cat-aniversarios'))}
                    checked={editandoCatId && (categoriasEvento.find(c => c.id === editandoCatId)?.sistema_protegida || editandoCatId === 'cat-aniversarios') ? false : novaCatVisivel}
                    onChange={(e) => setNovaCatVisivel(e.target.checked)}
                    className="peer sr-only"
                  />
                  <div className="peer h-6 w-11 rounded-full bg-slate-300 peer-checked:bg-purple-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-slate-300 after:bg-white after:transition-all after:content-[''] dark:bg-slate-700"></div>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                {editandoCatId && (
                  <button
                    type="button"
                    onClick={cancelarEdicaoCategoria}
                    className="rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition"
                  >
                    Cancelar
                  </button>
                )}
                <button
                  type="submit"
                  className="rounded-lg bg-purple-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-purple-700 transition inline-flex items-center gap-1.5"
                >
                  <Check className="h-3.5 w-3.5" />
                  {editandoCatId ? 'Salvar Alterações' : 'Adicionar Categoria'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
