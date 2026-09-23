'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { 
  BookOpen, 
  Plus, 
  Clock, 
  Video, 
  ExternalLink, 
  Users, 
  Calendar, 
  CheckCircle2, 
  X,
  Edit2,
  Lock,
  ArrowRightLeft,
  ShieldCheck,
  AlertCircle,
  Check,
  Search,
  CheckSquare,
  Square,
  UserCheck,
  UserX,
  AlertTriangle,
  Power,
  GraduationCap,
  HeartHandshake
} from 'lucide-react';
import { Turno, HorarioAula, Turma, GrupoTurma, GRUPOS_TURMAS_LISTA, Professor } from '@/lib/types';

interface SecaoEquipeTurmaFormProps {
  professores: Professor[];
  professoresSelecionados: string[];
  apoioSelecionados: string[];
  onToggleProfessor: (id: string) => void;
  onToggleApoio: (id: string) => void;
  onRemoverProfessorHistorico?: (id: string) => void;
  onRemoverApoioHistorico?: (id: string) => void;
}

function SecaoEquipeTurmaForm({
  professores,
  professoresSelecionados,
  apoioSelecionados,
  onToggleProfessor,
  onToggleApoio,
  onRemoverProfessorHistorico,
  onRemoverApoioHistorico,
}: SecaoEquipeTurmaFormProps) {
  // Apenas professores com status ativo podem ser disponibilizados para seleção
  const professoresAtivos = professores.filter((p) => p.ativo !== false);

  // Vínculos históricos de professores inativos preservados
  const profsHistoricoInativo = professoresSelecionados
    .map((id) => professores.find((p) => p.id === id))
    .filter((p): p is Professor => !!p && p.ativo === false);

  // Vínculos históricos de apoio inativos preservados
  const apoioHistoricoInativo = apoioSelecionados
    .map((id) => professores.find((p) => p.id === id))
    .filter((p): p is Professor => !!p && p.ativo === false);

  return (
    <div className="space-y-4 pt-2">
      {/* 1. SEÇÃO: PROFESSORES PRINCIPAIS */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-900/50">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-school-blue-100 p-1.5 text-school-blue-700 dark:bg-school-blue-950 dark:text-school-blue-300">
              <GraduationCap className="h-4 w-4" />
            </div>
            <div>
              <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                Professores Principais (Regência)
              </span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Selecione nenhum, um ou múltiplos docentes ativos para a regência da turma.
              </p>
            </div>
          </div>
          <span className="rounded-full bg-school-blue-50 px-2.5 py-0.5 text-[10px] font-bold text-school-blue-700 dark:bg-school-blue-950 dark:text-school-blue-300 border border-school-blue-200 dark:border-school-blue-800">
            {professoresSelecionados.length} selecionado(s)
          </span>
        </div>

        {/* Alerta de Vínculo Histórico Inativo (se houver) */}
        {profsHistoricoInativo.length > 0 && (
          <div className="mb-2 space-y-1.5">
            {profsHistoricoInativo.map((prof) => (
              <div
                key={prof.id}
                className="flex items-center justify-between gap-2 rounded-xl border border-amber-300/80 bg-amber-50 p-2 text-xs text-amber-900 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-200"
              >
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                  <span className="font-semibold">{prof.nome_completo}</span>
                  <span className="rounded px-1.5 py-0.2 bg-amber-200 text-amber-900 dark:bg-amber-900 dark:text-amber-100 text-[10px] font-bold">
                    Inativo (Histórico Preservado)
                  </span>
                </div>
                {onRemoverProfessorHistorico && (
                  <button
                    type="button"
                    onClick={() => onRemoverProfessorHistorico(prof.id)}
                    className="text-[11px] font-bold text-rose-600 hover:text-rose-700 dark:text-rose-400 hover:underline shrink-0"
                  >
                    Remover da Turma
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Lista de Checkboxes (Apenas Professores Ativos Disponíveis) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
          {professoresAtivos.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-2 col-span-2 text-center">
              Nenhum professor ativo disponível no sistema.
            </p>
          ) : (
            professoresAtivos.map((prof) => {
              const isSelected = professoresSelecionados.includes(prof.id);
              return (
                <div
                  key={prof.id}
                  onClick={() => onToggleProfessor(prof.id)}
                  className={`flex items-center justify-between gap-2 p-2.5 rounded-xl border cursor-pointer select-none transition-all ${
                    isSelected
                      ? 'border-school-blue-500 bg-school-blue-50/70 shadow-xs dark:border-school-blue-500 dark:bg-school-blue-950/30'
                      : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {isSelected ? (
                      <CheckSquare className="h-4 w-4 text-school-blue-600 dark:text-school-gold-400 shrink-0" />
                    ) : (
                      <Square className="h-4 w-4 text-slate-300 dark:text-slate-600 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className={`text-xs font-bold truncate ${isSelected ? 'text-school-blue-900 dark:text-blue-200' : 'text-slate-800 dark:text-slate-200'}`}>
                        {prof.nome_completo}
                      </p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                        {prof.disciplinas?.join(', ') || 'Geral'}
                      </p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 shrink-0 border border-emerald-200 dark:border-emerald-800">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Ativo
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 2. SEÇÃO VISUALMENTE SEPARADA: EQUIPE DE APOIO */}
      <div className="rounded-2xl border border-purple-200/80 bg-purple-50/40 p-3.5 dark:border-purple-900/50 dark:bg-purple-950/20">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-purple-100 p-1.5 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
              <HeartHandshake className="h-4 w-4" />
            </div>
            <div>
              <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                Equipe de Apoio & Inclusão
              </span>
              <p className="text-[11px] text-purple-700 dark:text-purple-300">
                Associe educadores de apoio pedagógico, tutores ou mediadores (somente ativos elegíveis).
              </p>
            </div>
          </div>
          <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-[10px] font-bold text-purple-800 dark:bg-purple-900 dark:text-purple-200 border border-purple-200 dark:border-purple-800">
            {apoioSelecionados.length} selecionado(s)
          </span>
        </div>

        {/* Alerta de Apoio Histórico Inativo (se houver) */}
        {apoioHistoricoInativo.length > 0 && (
          <div className="mb-2 space-y-1.5">
            {apoioHistoricoInativo.map((prof) => (
              <div
                key={prof.id}
                className="flex items-center justify-between gap-2 rounded-xl border border-amber-300/80 bg-amber-50 p-2 text-xs text-amber-900 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-200"
              >
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                  <span className="font-semibold">{prof.nome_completo}</span>
                  <span className="rounded px-1.5 py-0.2 bg-amber-200 text-amber-900 dark:bg-amber-900 dark:text-amber-100 text-[10px] font-bold">
                    Inativo (Histórico Preservado)
                  </span>
                </div>
                {onRemoverApoioHistorico && (
                  <button
                    type="button"
                    onClick={() => onRemoverApoioHistorico(prof.id)}
                    className="text-[11px] font-bold text-rose-600 hover:text-rose-700 dark:text-rose-400 hover:underline shrink-0"
                  >
                    Remover da Turma
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Lista de Checkboxes (Apenas Colaboradores/Professores Ativos) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
          {professoresAtivos.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-2 col-span-2 text-center">
              Nenhum colaborador/professor ativo disponível para apoio.
            </p>
          ) : (
            professoresAtivos.map((prof) => {
              const isSelected = apoioSelecionados.includes(prof.id);
              return (
                <div
                  key={prof.id}
                  onClick={() => onToggleApoio(prof.id)}
                  className={`flex items-center justify-between gap-2 p-2.5 rounded-xl border cursor-pointer select-none transition-all ${
                    isSelected
                      ? 'border-purple-500 bg-purple-50/80 shadow-xs dark:border-purple-500 dark:bg-purple-950/40'
                      : 'border-slate-200 bg-white hover:border-purple-200 dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-purple-900/60'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {isSelected ? (
                      <CheckSquare className="h-4 w-4 text-purple-600 dark:text-purple-400 shrink-0" />
                    ) : (
                      <Square className="h-4 w-4 text-slate-300 dark:text-slate-600 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className={`text-xs font-bold truncate ${isSelected ? 'text-purple-900 dark:text-purple-200' : 'text-slate-800 dark:text-slate-200'}`}>
                        {prof.nome_completo}
                      </p>
                      <p className="text-[10px] text-purple-600 dark:text-purple-400 truncate">
                        {prof.disciplinas?.join(', ') || 'Apoio Pedagógico'}
                      </p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 shrink-0 border border-emerald-200 dark:border-emerald-800">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Ativo
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

export default function TurmasPage() {
  const { 
    turmas, 
    estudantes, 
    professores, 
    addTurma, 
    updateTurma, 
    toggleStatusTurma, 
    migrarEstudantes, 
    role 
  } = useApp();

  const [turmaSelecionada, setTurmaSelecionada] = useState<Turma>(turmas[0] || null);
  const [modalNovaTurmaAberto, setModalNovaTurmaAberto] = useState(false);
  const [modalEditarTurmaAberto, setModalEditarTurmaAberto] = useState(false);
  const [turmaEditando, setTurmaEditando] = useState<Turma | null>(null);
  const [modalNovoHorarioAberto, setModalNovoHorarioAberto] = useState(false);
  const [filtroGrupo, setFiltroGrupo] = useState<string>('todos');

  // Estados de Controle de Status e Migração
  const [statusTurmaEditando, setStatusTurmaEditando] = useState<boolean>(true);
  const [statusAlterandoLoading, setStatusAlterandoLoading] = useState(false);
  const [modalMigracaoAberto, setModalMigracaoAberto] = useState(false);
  const [turmaOrigemMigracao, setTurmaOrigemMigracao] = useState<Turma | null>(null);
  const [turmaDestinoId, setTurmaDestinoId] = useState<string>('');
  const [estudantesSelecionadosMigracao, setEstudantesSelecionadosMigracao] = useState<string[]>([]);
  const [buscaEstudanteMigracao, setBuscaEstudanteMigracao] = useState('');
  const [migracaoLoading, setMigracaoLoading] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ tipo: 'sucesso' | 'erro' | 'aviso'; texto: string } | null>(null);

  // Form Nova Turma (com Professores Principais e Equipe de Apoio)
  const [formTurma, setFormTurma] = useState({
    nome: '',
    grupo: '6º anos' as GrupoTurma,
    turno: 'manha' as Turno,
    capacidade: 35,
    ano_letivo: 2026,
    sala: '',
    professores_ids: [] as string[],
    equipe_apoio_ids: [] as string[],
  });

  // Form Editar Turma (com Professores Principais e Equipe de Apoio)
  const [formEditarTurma, setFormEditarTurma] = useState({
    nome: '',
    grupo: '6º anos' as GrupoTurma,
    turno: 'manha' as Turno,
    capacidade: 35,
    ano_letivo: 2026,
    sala: '',
    professores_ids: [] as string[],
    equipe_apoio_ids: [] as string[],
  });

  // Form Novo Horário
  const [formHorario, setFormHorario] = useState({
    dia_semana: 'Segunda' as 'Segunda' | 'Terça' | 'Quarta' | 'Quinta' | 'Sexta',
    horario_inicio: '07:15',
    horario_fim: '08:05',
    disciplina: '',
    professor_nome: '',
    link_sala_virtual: '',
  });

  const handleCadastrarTurma = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTurma.nome) return;

    addTurma({
      nome: formTurma.nome,
      grupo: formTurma.grupo,
      turno: formTurma.turno,
      capacidade: Number(formTurma.capacidade) || 35,
      ano_letivo: Number(formTurma.ano_letivo) || 2026,
      sala: formTurma.sala || 'Sala Padrão',
      professores_ids: formTurma.professores_ids,
      equipe_apoio_ids: formTurma.equipe_apoio_ids,
    });

    setModalNovaTurmaAberto(false);
    setFormTurma({
      nome: '',
      grupo: '6º anos',
      turno: 'manha',
      capacidade: 35,
      ano_letivo: 2026,
      sala: '',
      professores_ids: [],
      equipe_apoio_ids: [],
    });
  };

  const handleAbrirEditarTurma = (t: Turma) => {
    setTurmaEditando(t);
    setStatusTurmaEditando(t.ativa !== false);
    const profsIniciais = t.professores_ids && t.professores_ids.length > 0
      ? t.professores_ids
      : (t.professor_regente_id ? [t.professor_regente_id] : []);
    const apoioInicial = t.equipe_apoio_ids || [];

    setFormEditarTurma({
      nome: t.nome || '',
      grupo: t.grupo || '6º anos',
      turno: t.turno || 'manha',
      capacidade: t.capacidade || 35,
      ano_letivo: t.ano_letivo || 2026,
      sala: t.sala || '',
      professores_ids: profsIniciais,
      equipe_apoio_ids: apoioInicial,
    });
    setModalEditarTurmaAberto(true);
  };

  const handleToggleStatusTurma = async () => {
    if (!turmaEditando) return;
    const novoStatus = !statusTurmaEditando;
    setStatusAlterandoLoading(true);
    try {
      await toggleStatusTurma(turmaEditando.id, novoStatus);
      setStatusTurmaEditando(novoStatus);
      setTurmaEditando({ ...turmaEditando, ativa: novoStatus });
      if (turmaSelecionada?.id === turmaEditando.id) {
        setTurmaSelecionada({ ...turmaSelecionada, ativa: novoStatus });
      }
      setFeedbackMsg({
        tipo: 'sucesso',
        texto: novoStatus
          ? `Turma "${turmaEditando.nome}" reativada com sucesso! Estudantes vinculados retornaram para o status Ativo.`
          : `Turma "${turmaEditando.nome}" desativada! Todos os estudantes vinculados foram trancados automaticamente. Registro imutável gravado na auditoria.`,
      });
      setTimeout(() => setFeedbackMsg(null), 6000);
    } catch (err) {
      console.error(err);
      setFeedbackMsg({
        tipo: 'erro',
        texto: 'Erro ao alterar status da turma. Tente novamente.',
      });
    } finally {
      setStatusAlterandoLoading(false);
    }
  };

  const handleAbrirMigracao = (t: Turma) => {
    setTurmaOrigemMigracao(t);
    const possiveisDestinos = turmas.filter((item) => item.id !== t.id && item.ativa !== false);
    setTurmaDestinoId(possiveisDestinos[0]?.id || '');
    setEstudantesSelecionadosMigracao([]);
    setBuscaEstudanteMigracao('');
    setModalMigracaoAberto(true);
  };

  const handleToggleSelectEstudante = (id: string) => {
    setEstudantesSelecionadosMigracao((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllEstudantes = (todosIds: string[]) => {
    if (estudantesSelecionadosMigracao.length === todosIds.length) {
      setEstudantesSelecionadosMigracao([]);
    } else {
      setEstudantesSelecionadosMigracao(todosIds);
    }
  };

  const handleConfirmarMigracao = async () => {
    if (!turmaOrigemMigracao || !turmaDestinoId || estudantesSelecionadosMigracao.length === 0) return;
    const turmaDestino = turmas.find((t) => t.id === turmaDestinoId);
    if (!turmaDestino) return;

    setMigracaoLoading(true);
    try {
      await migrarEstudantes(estudantesSelecionadosMigracao, turmaOrigemMigracao.id, turmaDestinoId);
      setFeedbackMsg({
        tipo: 'sucesso',
        texto: `${estudantesSelecionadosMigracao.length} estudante(s) migrado(s) com sucesso de "${turmaOrigemMigracao.nome}" para "${turmaDestino.nome}"! Registro de auditoria imutável criado.`,
      });
      setTimeout(() => setFeedbackMsg(null), 6000);
      setModalMigracaoAberto(false);
      setModalEditarTurmaAberto(false);
      setTurmaOrigemMigracao(null);
    } catch (err) {
      console.error(err);
      setFeedbackMsg({
        tipo: 'erro',
        texto: 'Erro ao migrar estudantes. Tente novamente.',
      });
    } finally {
      setMigracaoLoading(false);
    }
  };

  const handleSalvarEdicaoTurma = (e: React.FormEvent) => {
    e.preventDefault();
    if (!turmaEditando || !formEditarTurma.nome) return;

    const updates = {
      nome: formEditarTurma.nome,
      grupo: formEditarTurma.grupo,
      turno: formEditarTurma.turno,
      capacidade: Number(formEditarTurma.capacidade) || 35,
      ano_letivo: Number(formEditarTurma.ano_letivo) || 2026,
      sala: formEditarTurma.sala || 'Sala Padrão',
      professores_ids: formEditarTurma.professores_ids,
      equipe_apoio_ids: formEditarTurma.equipe_apoio_ids,
    };

    updateTurma(turmaEditando.id, updates);
    if (turmaSelecionada?.id === turmaEditando.id) {
      setTurmaSelecionada({ ...turmaSelecionada, ...updates });
    }
    setModalEditarTurmaAberto(false);
    setTurmaEditando(null);
  };

  const handleAdicionarHorario = (e: React.FormEvent) => {
    e.preventDefault();
    if (!turmaSelecionada || !formHorario.disciplina) return;

    const novoItem: HorarioAula = {
      id: `h-${Date.now()}`,
      dia_semana: formHorario.dia_semana,
      horario_inicio: formHorario.horario_inicio,
      horario_fim: formHorario.horario_fim,
      disciplina: formHorario.disciplina,
      professor_nome: formHorario.professor_nome || 'A definir',
      link_sala_virtual: formHorario.link_sala_virtual || undefined,
    };

    const novaGrade = [...(turmaSelecionada.grade_horaria || []), novoItem];
    updateTurma(turmaSelecionada.id, { grade_horaria: novaGrade });
    
    // Atualiza turma selecionada local
    setTurmaSelecionada({ ...turmaSelecionada, grade_horaria: novaGrade });
    setModalNovoHorarioAberto(false);
    setFormHorario({
      dia_semana: 'Segunda',
      horario_inicio: '07:15',
      horario_fim: '08:05',
      disciplina: '',
      professor_nome: '',
      link_sala_virtual: '',
    });
  };

  const diasSemana: ('Segunda' | 'Terça' | 'Quarta' | 'Quinta' | 'Sexta')[] = [
    'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <BookOpen className="h-7 w-7 text-school-blue-600 dark:text-school-gold-400" />
            Gestão de Turmas & Grade Horária
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Controle de capacidade física, status de turmas, migração e salas de aula
          </p>
        </div>

        {role === 'admin' && (
          <button
            onClick={() => setModalNovaTurmaAberto(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-school-blue-800 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-school-blue-800/25 hover:bg-school-blue-700 transition-all dark:bg-school-blue-600"
          >
            <Plus className="h-4 w-4" />
            <span>Cadastrar Nova Turma</span>
          </button>
        )}
      </div>

      {/* Banner de Feedback de Ações (Auditoria / Migração / Status) */}
      {feedbackMsg && (
        <div
          className={`flex items-center justify-between rounded-xl p-3.5 text-xs font-semibold shadow-sm transition-all animate-in fade-in ${
            feedbackMsg.tipo === 'sucesso'
              ? 'bg-emerald-50 text-emerald-900 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-800'
              : feedbackMsg.tipo === 'aviso'
              ? 'bg-amber-50 text-amber-900 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-800'
              : 'bg-rose-50 text-rose-900 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-200 dark:border-rose-800'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedbackMsg.tipo === 'sucesso' ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400 flex-shrink-0" />
            )}
            <span>{feedbackMsg.texto}</span>
          </div>
          <button
            onClick={() => setFeedbackMsg(null)}
            className="rounded-lg p-1 hover:bg-black/5 dark:hover:bg-white/10"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Alerta de Perfil Não-Admin se acessado por docente */}
      {role !== 'admin' && (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
          <Lock className="h-5 w-5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
          <div>
            <p className="font-bold uppercase tracking-wider text-[11px]">Módulo Restrito à Gestão e Secretaria Escolar</p>
            <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">
              O gerenciamento e a edição de turmas, salas e horários são exclusivos para a administração. Professores devem utilizar o <strong>Fotograma da Turma</strong> para consultar os estudantes e dados de contato.
            </p>
          </div>
        </div>
      )}

      {/* Barra de Filtro por Grupos de Turmas */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        <span className="text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 whitespace-nowrap mr-1">
          Grupos:
        </span>
        <button
          onClick={() => setFiltroGrupo('todos')}
          className={`rounded-xl px-3 py-1.5 font-bold transition-all whitespace-nowrap ${
            filtroGrupo === 'todos'
              ? 'bg-school-blue-800 text-white shadow-sm dark:bg-school-blue-600'
              : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
          }`}
        >
          Todos ({turmas.length})
        </button>
        {GRUPOS_TURMAS_LISTA.map((g) => {
          const qtd = turmas.filter((t) => t.grupo === g).length;
          return (
            <button
              key={g}
              onClick={() => setFiltroGrupo(g)}
              className={`rounded-xl px-3 py-1.5 font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                filtroGrupo === g
                  ? 'bg-school-blue-800 text-white shadow-sm dark:bg-school-blue-600'
                  : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              <span>{g}</span>
              {qtd > 0 && (
                <span className={`rounded-full px-1.5 py-0.2 text-[10px] ${filtroGrupo === g ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}>
                  {qtd}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Grid de Turmas Ativas com Controle de Lotação & Status */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {turmas
          .filter((t) => filtroGrupo === 'todos' || t.grupo === filtroGrupo)
          .map((turma) => {
          const alunosMatriculados = estudantes.filter((e) => e.turma_id === turma.id).length;
          const pctOcupacao = Math.min(100, Math.round((alunosMatriculados / turma.capacidade) * 100));
          const isSelected = turmaSelecionada?.id === turma.id;
          const isAtiva = turma.ativa !== false;

          return (
            <div
              key={turma.id}
              onClick={() => setTurmaSelecionada(turma)}
              className={`cursor-pointer rounded-2xl border p-5 transition-all duration-200 ${
                isSelected
                  ? 'border-school-blue-600 bg-blue-50/50 shadow-md ring-2 ring-school-blue-600/30 dark:border-school-gold-400 dark:bg-slate-800/90'
                  : isAtiva
                  ? 'border-slate-200 bg-white hover:border-slate-300 dark:border-school-dark-border dark:bg-school-dark-surface'
                  : 'border-dashed border-rose-300 bg-rose-50/20 opacity-80 hover:opacity-100 dark:border-rose-900/40 dark:bg-rose-950/10'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span
                      className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-extrabold uppercase ${
                        turma.turno === 'manha'
                          ? 'bg-blue-100 text-school-blue-800 dark:bg-blue-950 dark:text-blue-300'
                          : turma.turno === 'tarde'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          : 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200'
                      }`}
                    >
                      {turma.turno}
                    </span>
                    {turma.grupo && (
                      <span className="inline-block rounded-md bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/60">
                        {turma.grupo}
                      </span>
                    )}
                    {/* Badge Status da Turma */}
                    {isAtiva ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-900/60">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        Ativa
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-md bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200/70 dark:border-rose-900/60">
                        <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
                        Inativa
                      </span>
                    )}
                  </div>
                  <h4 className="mt-2 text-sm font-black text-slate-900 dark:text-white line-clamp-1">
                    {turma.nome}
                  </h4>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    {turma.sala}
                  </div>
                  {role === 'admin' && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAbrirEditarTurma(turma);
                      }}
                      className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-school-blue-600 dark:hover:bg-slate-800"
                      title="Alterar dados da turma"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Lotação / Capacidade */}
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Lotação:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {alunosMatriculados} / {turma.capacidade} vagas ({pctOcupacao}%)
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      pctOcupacao >= 90
                        ? 'bg-rose-500'
                        : pctOcupacao >= 70
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.max(5, pctOcupacao)}%` }}
                  />
                </div>
              </div>

              {/* Equipe Docente e Apoio Resumo no Card */}
              {(() => {
                const profsCardIds = turma.professores_ids && turma.professores_ids.length > 0
                  ? turma.professores_ids
                  : (turma.professor_regente_id ? [turma.professor_regente_id] : []);
                const apoioCardIds = turma.equipe_apoio_ids || [];

                if (profsCardIds.length === 0 && apoioCardIds.length === 0) return null;

                return (
                  <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 text-[11px] space-y-1.5">
                    {profsCardIds.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-slate-500 dark:text-slate-400 text-[10px] uppercase tracking-wider">Docentes:</span>
                        {profsCardIds.map((id) => {
                          const p = professores.find((prof) => prof.id === id);
                          if (!p) return null;
                          return (
                            <span key={id} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 text-[10px] font-medium border border-slate-200/60 dark:border-slate-700/60">
                              {p.nome_completo.split(' ')[0]} {p.nome_completo.split(' ')[1] || ''}
                              {p.ativo === false && (
                                <span className="px-1 rounded bg-amber-200 text-amber-900 dark:bg-amber-950 dark:text-amber-200 text-[9px] font-bold">
                                  Inativo
                                </span>
                              )}
                            </span>
                          );
                        })}
                      </div>
                    )}
                    {apoioCardIds.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-purple-700 dark:text-purple-400 text-[10px] uppercase tracking-wider">Apoio:</span>
                        {apoioCardIds.map((id) => {
                          const p = professores.find((prof) => prof.id === id);
                          if (!p) return null;
                          return (
                            <span key={id} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 text-[10px] font-medium border border-purple-200/60 dark:border-purple-800/60">
                              {p.nome_completo.split(' ')[0]} {p.nome_completo.split(' ')[1] || ''}
                              {p.ativo === false && (
                                <span className="px-1 rounded bg-amber-200 text-amber-900 dark:bg-amber-950 dark:text-amber-200 text-[9px] font-bold">
                                  Inativo
                                </span>
                              )}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          );
        })}
      </div>

      {/* Módulo de Grade Horária e Links Virtuais da Turma Selecionada */}
      {turmaSelecionada && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-school-dark-border dark:bg-school-dark-surface">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Clock className="h-5 w-5 text-school-blue-600 dark:text-school-gold-400" />
                Grade Horária Semanal: {turmaSelecionada.nome}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Horários de aula, docentes e links diretos para reuniões virtuais / Google Meet
              </p>
            </div>

            {role === 'admin' && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleAbrirEditarTurma(turmaSelecionada)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  title="Alterar informações desta turma"
                >
                  <Edit2 className="h-3.5 w-3.5 text-school-blue-600 dark:text-school-gold-400" />
                  <span>Editar Turma</span>
                </button>

                <button
                  onClick={() => setModalNovoHorarioAberto(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  <Plus className="h-3.5 w-3.5 text-school-blue-600 dark:text-school-gold-400" />
                  <span>Adicionar Aula na Grade</span>
                </button>
              </div>
            )}
          </div>

          {/* Equipe da Turma (Professores Principais & Equipe de Apoio) */}
          {(() => {
            const turmaAtual = turmas.find((t) => t.id === turmaSelecionada.id) || turmaSelecionada;
            const profsIds = turmaAtual.professores_ids && turmaAtual.professores_ids.length > 0
              ? turmaAtual.professores_ids
              : (turAtual => turAtual.professor_regente_id ? [turAtual.professor_regente_id] : [])(turmaAtual);
            const apoioIds = turmaAtual.equipe_apoio_ids || [];

            const docentesVinculados = profsIds
              .map((id) => professores.find((p) => p.id === id))
              .filter((p): p is Professor => !!p);

            const apoioVinculado = apoioIds
              .map((id) => professores.find((p) => p.id === id))
              .filter((p): p is Professor => !!p);

            return (
              <div className="mt-5 rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-900/40">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Bloco 1: Professores Principais */}
                  <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs dark:border-slate-800 dark:bg-slate-800/90">
                    <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-slate-100 dark:border-slate-700">
                      <div className="flex items-center gap-2">
                        <div className="rounded-lg bg-school-blue-100 p-1.5 text-school-blue-700 dark:bg-school-blue-950 dark:text-school-blue-300">
                          <GraduationCap className="h-4 w-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                            Professores Principais
                          </h4>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400">
                            Regência da turma
                          </p>
                        </div>
                      </div>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                        {docentesVinculados.length}
                      </span>
                    </div>

                    {docentesVinculados.length === 0 ? (
                      <p className="text-xs text-slate-400 italic py-2">
                        Nenhum professor principal vinculado a esta turma.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {docentesVinculados.map((prof) => (
                          <div
                            key={prof.id}
                            className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-700/60"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="h-7 w-7 rounded-full bg-school-blue-600/10 text-school-blue-700 dark:text-school-blue-300 flex items-center justify-center font-bold text-[11px] shrink-0">
                                {prof.nome_completo.charAt(0)}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                                  {prof.nome_completo}
                                </p>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                                  {prof.disciplinas?.join(', ') || 'Geral'}
                                </p>
                              </div>
                            </div>
                            {prof.ativo !== false ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 shrink-0 border border-emerald-200 dark:border-emerald-800">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                Ativo
                              </span>
                            ) : (
                              <span
                                className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-200 shrink-0 border border-amber-300 dark:border-amber-900"
                                title="Docente inativo no quadro funcional - histórico preservado"
                              >
                                <AlertTriangle className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                                Inativo (Histórico)
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Bloco 2: Equipe de Apoio */}
                  <div className="rounded-xl border border-purple-200 bg-purple-50/40 p-3.5 shadow-xs dark:border-purple-900/50 dark:bg-purple-950/20">
                    <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-purple-100 dark:border-purple-900/60">
                      <div className="flex items-center gap-2">
                        <div className="rounded-lg bg-purple-100 p-1.5 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                          <HeartHandshake className="h-4 w-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                            Equipe de Apoio & Inclusão
                          </h4>
                          <p className="text-[10px] text-purple-700 dark:text-purple-300">
                            Tutoria, mediação e suporte
                          </p>
                        </div>
                      </div>
                      <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-black text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                        {apoioVinculado.length}
                      </span>
                    </div>

                    {apoioVinculado.length === 0 ? (
                      <p className="text-xs text-slate-400 italic py-2">
                        Nenhum profissional de apoio associado a esta turma.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {apoioVinculado.map((prof) => (
                          <div
                            key={prof.id}
                            className="flex items-center justify-between gap-2 p-2 rounded-lg bg-white dark:bg-slate-900/60 border border-purple-100 dark:border-purple-900/60"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="h-7 w-7 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300 flex items-center justify-center font-bold text-[11px] shrink-0">
                                {prof.nome_completo.charAt(0)}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                                  {prof.nome_completo}
                                </p>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                                  {prof.disciplinas?.join(', ') || 'Apoio Pedagógico'}
                                </p>
                              </div>
                            </div>
                            {prof.ativo !== false ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 shrink-0 border border-emerald-200 dark:border-emerald-800">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                Ativo
                              </span>
                            ) : (
                              <span
                                className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-200 shrink-0 border border-amber-300 dark:border-amber-900"
                                title="Colaborador inativo no quadro funcional - histórico preservado"
                              >
                                <AlertTriangle className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                                Inativo (Histórico)
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Tabela Interativa de Dias da Semana */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-5 gap-4">
            {diasSemana.map((dia) => {
              const aulasDoDia = (turmaSelecionada.grade_horaria || []).filter(
                (h) => h.dia_semana === dia
              );

              return (
                <div
                  key={dia}
                  className="flex flex-col rounded-2xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/50"
                >
                  <div className="border-b border-slate-200 pb-2 text-center dark:border-slate-700">
                    <span className="text-xs font-black uppercase tracking-wider text-school-blue-900 dark:text-school-gold-400">
                      {dia}
                    </span>
                  </div>

                  <div className="mt-3 flex-1 space-y-3">
                    {aulasDoDia.length === 0 ? (
                      <p className="py-6 text-center text-[11px] text-slate-400 italic">
                        Sem aulas cadastradas
                      </p>
                    ) : (
                      aulasDoDia.map((aula) => (
                        <div
                          key={aula.id}
                          className="rounded-xl border border-slate-200 bg-white p-3 text-xs shadow-sm transition-all hover:shadow-md dark:border-slate-700 dark:bg-slate-800"
                        >
                          <div className="font-mono text-[10px] font-bold text-school-blue-600 dark:text-school-gold-400">
                            {aula.horario_inicio} - {aula.horario_fim}
                          </div>
                          <div className="mt-1 font-black text-slate-900 dark:text-white">
                            {aula.disciplina}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            {aula.professor_nome}
                          </div>

                          {aula.link_sala_virtual && (
                            <a
                              href={aula.link_sala_virtual}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-2.5 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-blue-50 py-1 text-[11px] font-bold text-school-blue-700 hover:bg-blue-100 dark:bg-blue-950 dark:text-school-blue-300 dark:hover:bg-blue-900/60 transition-colors"
                            >
                              <Video className="h-3.5 w-3.5" />
                              <span>Sala Virtual</span>
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODAL 1: Nova Turma */}
      {modalNovaTurmaAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl bg-white p-6 shadow-2xl dark:bg-school-dark-surface">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800 shrink-0">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-school-blue-600 dark:text-school-gold-400" />
                Cadastrar Nova Turma
              </h3>
              <button
                onClick={() => setModalNovaTurmaAberto(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCadastrarTurma} className="flex-1 overflow-y-auto mt-4 space-y-4 text-xs pr-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Nome da Turma *
                  </label>
                  <input
                    type="text"
                    required
                    value={formTurma.nome}
                    onChange={(e) => setFormTurma({ ...formTurma, nome: e.target.value })}
                    placeholder="Ex: 6º Ano A - Fundamental"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:border-school-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Grupo da Turma *
                  </label>
                  <select
                    value={formTurma.grupo}
                    onChange={(e) => setFormTurma({ ...formTurma, grupo: e.target.value as GrupoTurma })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:border-school-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white font-semibold"
                  >
                    {GRUPOS_TURMAS_LISTA.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Turno *
                  </label>
                  <select
                    value={formTurma.turno}
                    onChange={(e) => setFormTurma({ ...formTurma, turno: e.target.value as Turno })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:border-school-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  >
                    <option value="manha">Manhã</option>
                    <option value="tarde">Tarde</option>
                    <option value="noite">Noite</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Capacidade Máxima *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={60}
                    value={formTurma.capacidade}
                    onChange={(e) => setFormTurma({ ...formTurma, capacidade: Number(e.target.value) })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:border-school-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Sala de Aula Física
                  </label>
                  <input
                    type="text"
                    value={formTurma.sala}
                    onChange={(e) => setFormTurma({ ...formTurma, sala: e.target.value })}
                    placeholder="Ex: Sala 204 - Bloco C"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:border-school-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Ano Letivo
                  </label>
                  <input
                    type="number"
                    value={formTurma.ano_letivo}
                    onChange={(e) => setFormTurma({ ...formTurma, ano_letivo: Number(e.target.value) })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:border-school-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Associação de Equipe: Professores Principais & Equipe de Apoio */}
              <SecaoEquipeTurmaForm
                professores={professores}
                professoresSelecionados={formTurma.professores_ids}
                apoioSelecionados={formTurma.equipe_apoio_ids}
                onToggleProfessor={(id) => {
                  setFormTurma((prev) => ({
                    ...prev,
                    professores_ids: prev.professores_ids.includes(id)
                      ? prev.professores_ids.filter((x) => x !== id)
                      : [...prev.professores_ids, id],
                  }));
                }}
                onToggleApoio={(id) => {
                  setFormTurma((prev) => ({
                    ...prev,
                    equipe_apoio_ids: prev.equipe_apoio_ids.includes(id)
                      ? prev.equipe_apoio_ids.filter((x) => x !== id)
                      : [...prev.equipe_apoio_ids, id],
                  }));
                }}
              />

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800 shrink-0">
                <button
                  type="button"
                  onClick={() => setModalNovaTurmaAberto(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-school-blue-800 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-school-blue-700 dark:bg-school-blue-600"
                >
                  Salvar Turma
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Editar Turma */}
      {modalEditarTurmaAberto && turmaEditando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl bg-white p-6 shadow-2xl dark:bg-school-dark-surface">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800 shrink-0">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Edit2 className="h-5 w-5 text-school-blue-600 dark:text-school-gold-400" />
                Editar Dados da Turma
              </h3>
              <button
                onClick={() => setModalEditarTurmaAberto(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto mt-4 space-y-3.5 text-xs pr-1">
              {/* 1. CONTROLE DE STATUS DA TURMA (TOGGLE) */}
              {(() => {
                const alunosVinculados = estudantes.filter((e) => e.turma_id === turmaEditando.id);
                return (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3.5 dark:border-slate-800 dark:bg-slate-900/50">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            Status da Turma:
                          </span>
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider ${
                            statusTurmaEditando 
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300/60'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300/60'
                          }`}>
                            <span className={`h-2 w-2 rounded-full ${statusTurmaEditando ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                            {statusTurmaEditando ? 'Ativada' : 'Desativada'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                          {statusTurmaEditando
                            ? `🟢 Turma ativa. ${alunosVinculados.length} estudante(s) contados normalmente nas métricas.`
                            : `🔴 Turma desativada. Todos os ${alunosVinculados.length} estudante(s) vinculados foram alterados para "Trancado".`}
                        </p>
                      </div>

                      {/* Botão tipo Toggle (Chave Liga/Desliga) */}
                      <button
                        type="button"
                        role="switch"
                        aria-checked={statusTurmaEditando}
                        disabled={statusAlterandoLoading}
                        onClick={handleToggleStatusTurma}
                        className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-school-blue-500 focus:ring-offset-2 ${
                          statusAlterandoLoading ? 'opacity-50 cursor-not-allowed' : ''
                        } ${
                          statusTurmaEditando ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                        }`}
                        title={statusTurmaEditando ? 'Desativar turma e trancar alunos' : 'Reativar turma e alunos'}
                      >
                        <span
                          aria-hidden="true"
                          className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            statusTurmaEditando ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* 2. BOTÃO: MIGRAR ESTUDANTES */}
              <div className="flex items-center justify-between rounded-2xl border border-blue-200 bg-blue-50/70 p-3.5 dark:border-blue-900/60 dark:bg-blue-950/30">
                <div>
                  <div className="flex items-center gap-1.5 font-bold text-school-blue-900 dark:text-blue-300">
                    <ArrowRightLeft className="h-4 w-4 text-school-blue-600 dark:text-school-gold-400" />
                    <span>Migração de Estudantes</span>
                  </div>
                  <p className="text-[11px] text-school-blue-700 dark:text-blue-400 mt-0.5">
                    Transfira alunos desta turma para outra turma de destino.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleAbrirMigracao(turmaEditando)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-school-blue-800 px-3.5 py-2 text-xs font-bold text-white shadow hover:bg-school-blue-700 transition-all dark:bg-school-blue-600 whitespace-nowrap"
                >
                  <ArrowRightLeft className="h-3.5 w-3.5" />
                  <span>Migrar Estudantes</span>
                </button>
              </div>

              {/* Formulário de Edição */}
              <form onSubmit={handleSalvarEdicaoTurma} className="space-y-4 pt-1">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Nome da Turma *
                    </label>
                    <input
                      type="text"
                      required
                      value={formEditarTurma.nome}
                      onChange={(e) => setFormEditarTurma({ ...formEditarTurma, nome: e.target.value })}
                      placeholder="Ex: 6º Ano A - Fundamental"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:border-school-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Grupo da Turma *
                    </label>
                    <select
                      value={formEditarTurma.grupo}
                      onChange={(e) => setFormEditarTurma({ ...formEditarTurma, grupo: e.target.value as GrupoTurma })}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:border-school-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white font-semibold"
                    >
                      {GRUPOS_TURMAS_LISTA.map((g) => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Turno *
                    </label>
                    <select
                      value={formEditarTurma.turno}
                      onChange={(e) => setFormEditarTurma({ ...formEditarTurma, turno: e.target.value as Turno })}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:border-school-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    >
                      <option value="manha">Manhã</option>
                      <option value="tarde">Tarde</option>
                      <option value="noite">Noite</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Capacidade Máxima *
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={60}
                      value={formEditarTurma.capacidade}
                      onChange={(e) => setFormEditarTurma({ ...formEditarTurma, capacidade: Number(e.target.value) })}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:border-school-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Sala de Aula Física
                    </label>
                    <input
                      type="text"
                      value={formEditarTurma.sala}
                      onChange={(e) => setFormEditarTurma({ ...formEditarTurma, sala: e.target.value })}
                      placeholder="Ex: Sala 204 - Bloco C"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:border-school-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Ano Letivo
                    </label>
                    <input
                      type="number"
                      value={formEditarTurma.ano_letivo}
                      onChange={(e) => setFormEditarTurma({ ...formEditarTurma, ano_letivo: Number(e.target.value) })}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:border-school-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                {/* Associação de Equipe: Professores Principais & Equipe de Apoio */}
                <SecaoEquipeTurmaForm
                  professores={professores}
                  professoresSelecionados={formEditarTurma.professores_ids}
                  apoioSelecionados={formEditarTurma.equipe_apoio_ids}
                  onToggleProfessor={(id) => {
                    setFormEditarTurma((prev) => ({
                      ...prev,
                      professores_ids: prev.professores_ids.includes(id)
                        ? prev.professores_ids.filter((x) => x !== id)
                        : [...prev.professores_ids, id],
                    }));
                  }}
                  onToggleApoio={(id) => {
                    setFormEditarTurma((prev) => ({
                      ...prev,
                      equipe_apoio_ids: prev.equipe_apoio_ids.includes(id)
                        ? prev.equipe_apoio_ids.filter((x) => x !== id)
                        : [...prev.equipe_apoio_ids, id],
                    }));
                  }}
                  onRemoverProfessorHistorico={(id) => {
                    setFormEditarTurma((prev) => ({
                      ...prev,
                      professores_ids: prev.professores_ids.filter((x) => x !== id),
                    }));
                  }}
                  onRemoverApoioHistorico={(id) => {
                    setFormEditarTurma((prev) => ({
                      ...prev,
                      equipe_apoio_ids: prev.equipe_apoio_ids.filter((x) => x !== id),
                    }));
                  }}
                />

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800 shrink-0">
                  <button
                    type="button"
                    onClick={() => setModalEditarTurmaAberto(false)}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-school-blue-800 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-school-blue-700 dark:bg-school-blue-600"
                  >
                    Salvar Alterações
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Migração de Estudantes */}
      {modalMigracaoAberto && turmaOrigemMigracao && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-school-dark-surface max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <ArrowRightLeft className="h-5 w-5 text-school-blue-600 dark:text-school-gold-400" />
                  Migração de Estudantes
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Turma de Origem: <strong className="text-slate-900 dark:text-white">{turmaOrigemMigracao.nome}</strong> ({turmaOrigemMigracao.turno.toUpperCase()})
                </p>
              </div>
              <button
                onClick={() => setModalMigracaoAberto(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body Scrollable */}
            <div className="flex-1 overflow-y-auto py-4 space-y-4 text-xs pr-1">
              {/* Escolha da Turma de Destino */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-900/40">
                <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  1. Selecione a Turma de Destino *
                </label>
                <select
                  value={turmaDestinoId}
                  onChange={(e) => setTurmaDestinoId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-900 focus:border-school-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white font-medium"
                >
                  <option value="">-- Escolha a turma de destino --</option>
                  {turmas
                    .filter((t) => t.id !== turmaOrigemMigracao.id && t.ativa !== false)
                    .map((t) => {
                      const matriculadosDestino = estudantes.filter((e) => e.turma_id === t.id).length;
                      const vagasDisponiveis = Math.max(0, t.capacidade - matriculadosDestino);
                      return (
                        <option key={t.id} value={t.id}>
                          {t.nome} ({t.turno.toUpperCase()}) — {matriculadosDestino}/{t.capacidade} vagas ({vagasDisponiveis} vagas restantes)
                        </option>
                      );
                    })}
                </select>
              </div>

              {/* Seleção de Estudantes */}
              <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      2. Selecione os Estudantes para Migrar
                    </span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {estudantesSelecionadosMigracao.length} selecionado(s)
                    </p>
                  </div>

                  {/* Campo de Busca */}
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Buscar aluno..."
                      value={buscaEstudanteMigracao}
                      onChange={(e) => setBuscaEstudanteMigracao(e.target.value)}
                      className="rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white focus:outline-none focus:border-school-blue-500"
                    />
                  </div>
                </div>

                {/* Lista de Alunos */}
                {(() => {
                  const alunosOrigem = estudantes.filter((e) => e.turma_id === turmaOrigemMigracao.id);
                  const alunosFiltrados = alunosOrigem.filter((e) =>
                    e.nome_completo.toLowerCase().includes(buscaEstudanteMigracao.toLowerCase()) ||
                    (e.cpf && e.cpf.toLowerCase().includes(buscaEstudanteMigracao.toLowerCase())) ||
                    e.id.toLowerCase().includes(buscaEstudanteMigracao.toLowerCase())
                  );

                  if (alunosOrigem.length === 0) {
                    return (
                      <div className="py-8 text-center text-slate-500 dark:text-slate-400">
                        Nenhum estudante matriculado nesta turma para migrar.
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-1.5">
                      {/* Checkbox Selecionar Todos */}
                      <div
                        onClick={() => handleSelectAllEstudantes(alunosFiltrados.map((a) => a.id))}
                        className="flex items-center gap-2.5 p-2 rounded-lg bg-slate-100 hover:bg-slate-200/80 cursor-pointer dark:bg-slate-800 dark:hover:bg-slate-700/80 transition-colors font-bold text-slate-800 dark:text-slate-200 select-none"
                      >
                        <input
                          type="checkbox"
                          checked={alunosFiltrados.length > 0 && estudantesSelecionadosMigracao.length === alunosFiltrados.length}
                          onChange={() => {}}
                          className="h-4 w-4 rounded text-school-blue-600 focus:ring-school-blue-500"
                        />
                        <span>
                          {estudantesSelecionadosMigracao.length === alunosFiltrados.length
                            ? 'Desmarcar Todos'
                            : `Selecionar Todos (${alunosFiltrados.length})`}
                        </span>
                      </div>

                      <div className="max-h-60 overflow-y-auto space-y-1 pr-1">
                        {alunosFiltrados.map((est) => {
                          const isChecked = estudantesSelecionadosMigracao.includes(est.id);
                          return (
                            <div
                              key={est.id}
                              onClick={() => handleToggleSelectEstudante(est.id)}
                              className={`flex items-center justify-between p-2 rounded-lg border cursor-pointer transition-colors select-none ${
                                isChecked
                                  ? 'border-school-blue-400 bg-blue-50/70 dark:border-blue-700 dark:bg-blue-950/40'
                                  : 'border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900/50'
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {}}
                                  className="h-4 w-4 rounded text-school-blue-600 focus:ring-school-blue-500"
                                />
                                <div>
                                  <p className="font-bold text-slate-900 dark:text-white">
                                    {est.nome_completo}
                                  </p>
                                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                                    ID: {est.id} {est.cpf ? `• CPF: ${est.cpf}` : ''}
                                  </p>
                                </div>
                              </div>

                              <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                est.status_matricula === 'Ativo'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                  : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                              }`}>
                                {est.status_matricula}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Resumo da Ação */}
              {turmaDestinoId && estudantesSelecionadosMigracao.length > 0 && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 text-[11px] text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300 flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Resumo da Migração:</p>
                    <p>
                      <strong>{estudantesSelecionadosMigracao.length} estudante(s)</strong> serão transferidos de{' '}
                      <strong>{turmaOrigemMigracao.nome}</strong> para{' '}
                      <strong>{turmas.find((t) => t.id === turmaDestinoId)?.nome}</strong>.
                    </p>
                    <p className="text-[10px] text-emerald-700 dark:text-emerald-400 mt-0.5">
                      Um registro imutável será gravado no sistema de auditoria para cada estudante transferido.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setModalMigracaoAberto(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!turmaDestinoId || estudantesSelecionadosMigracao.length === 0 || migracaoLoading}
                onClick={handleConfirmarMigracao}
                className={`rounded-xl bg-school-blue-800 px-5 py-2 text-xs font-bold text-white shadow-md transition-all dark:bg-school-blue-600 flex items-center gap-2 ${
                  !turmaDestinoId || estudantesSelecionadosMigracao.length === 0 || migracaoLoading
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:bg-school-blue-700'
                }`}
              >
                {migracaoLoading ? (
                  <>
                    <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Migrando...</span>
                  </>
                ) : (
                  <>
                    <ArrowRightLeft className="h-4 w-4" />
                    <span>Confirmar Migração ({estudantesSelecionadosMigracao.length})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Adicionar Horário na Grade */}
      {modalNovoHorarioAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-school-dark-surface">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Clock className="h-5 w-5 text-school-blue-600 dark:text-school-gold-400" />
                Adicionar Aula na Grade
              </h3>
              <button
                onClick={() => setModalNovoHorarioAberto(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAdicionarHorario} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Dia da Semana *
                </label>
                <select
                  value={formHorario.dia_semana}
                  onChange={(e) => setFormHorario({ ...formHorario, dia_semana: e.target.value as any })}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:border-school-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                >
                  <option value="Segunda">Segunda-feira</option>
                  <option value="Terça">Terça-feira</option>
                  <option value="Quarta">Quarta-feira</option>
                  <option value="Quinta">Quinta-feira</option>
                  <option value="Sexta">Sexta-feira</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Horário Início *
                  </label>
                  <input
                    type="time"
                    required
                    value={formHorario.horario_inicio}
                    onChange={(e) => setFormHorario({ ...formHorario, horario_inicio: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:border-school-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Horário Fim *
                  </label>
                  <input
                    type="time"
                    required
                    value={formHorario.horario_fim}
                    onChange={(e) => setFormHorario({ ...formHorario, horario_fim: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:border-school-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Disciplina / Matéria *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Física Quântica, Matemática, Redação"
                  value={formHorario.disciplina}
                  onChange={(e) => setFormHorario({ ...formHorario, disciplina: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:border-school-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Professor Responsável
                </label>
                <select
                  value={formHorario.professor_nome}
                  onChange={(e) => setFormHorario({ ...formHorario, professor_nome: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:border-school-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                >
                  <option value="">Selecione um docente</option>
                  {professores
                    .filter((p) => p.ativo !== false)
                    .map((p) => (
                      <option key={p.id} value={p.nome_completo}>
                        {p.nome_completo} ({p.disciplinas?.join(', ') || 'Docente'})
                      </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Link de Sala Virtual / Videochamada
                </label>
                <input
                  type="url"
                  placeholder="https://meet.google.com/abc-xyz"
                  value={formHorario.link_sala_virtual}
                  onChange={(e) => setFormHorario({ ...formHorario, link_sala_virtual: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:border-school-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalNovoHorarioAberto(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-school-blue-800 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-school-blue-700 dark:bg-school-blue-600"
                >
                  Salvar Aula
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
