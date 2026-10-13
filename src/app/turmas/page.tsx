'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { 
  BookOpen, 
  Plus, 
  Clock, 
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
  HeartHandshake,
  Printer,
  FileText,
  FileSpreadsheet,
  Loader2,
  Trash2,
  RefreshCw
} from 'lucide-react';
import { Turno, HorarioAula, Turma, GrupoTurma, GRUPOS_TURMAS_LISTA, Professor } from '@/lib/types';
import { analisarFaixaEtariaTurma, AnaliseTurmaFaixaEtaria } from '@/lib/faixa-etaria';
import { ModalFaixaEtariaTurma } from '@/components/turmas/ModalFaixaEtariaTurma';
import { ModalEditarGradeTurma } from '@/components/turmas/ModalEditarGradeTurma';
import { isProfessorAdministrativo, isProfessorApoio, isDocenteAptoRegencia } from '@/lib/pareceres-ia';

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
  // Apenas docentes aptos para regência (ativos, NÃO administrativos e NÃO marcados como apoio)
  const professoresAtivos = professores.filter(
    (p) => isDocenteAptoRegencia(p)
  );

  // Equipe de Apoio & Inclusão: estritamente docentes/colaboradores pedagógicos com perfil de Apoio (não administrativos)
  const equipeApoioElegivel = professores.filter(
    (p) =>
      p.ativo !== false &&
      (p.tipo_profissional === 'docente' || !p.tipo_profissional) &&
      !isProfessorAdministrativo(p) &&
      isProfessorApoio(p)
  );

  // Vínculos históricos de professores inativos preservados (exclui administrativos e apoio)
  const profsHistoricoInativo = professoresSelecionados
    .map((id) => professores.find((p) => p.id === id))
    .filter((p): p is Professor => !!p && p.ativo === false && !isProfessorAdministrativo(p) && !isProfessorApoio(p));

  // Vínculos históricos de apoio inativos preservados (exclui administrativos)
  const apoioHistoricoInativo = apoioSelecionados
    .map((id) => professores.find((p) => p.id === id))
    .filter((p): p is Professor => !!p && p.ativo === false && !isProfessorAdministrativo(p));

  // Contagem estrita de selecionados válidos (não administrativos e não apoio)
  const profsValidosSelecionados = professoresSelecionados.filter((id) => {
    const p = professores.find((prof) => prof.id === id);
    return p && !isProfessorAdministrativo(p) && !isProfessorApoio(p);
  });

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
                Selecione nenhum, um ou múltiplos docentes ativos para a regência da turma (exclui administrativos e equipe de apoio).
              </p>
            </div>
          </div>
          <span className="rounded-full bg-school-blue-50 px-2.5 py-0.5 text-[10px] font-bold text-school-blue-700 dark:bg-school-blue-950 dark:text-school-blue-300 border border-school-blue-200 dark:border-school-blue-800">
            {profsValidosSelecionados.length} selecionado(s)
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

        {/* Lista de Checkboxes (Estritamente Colaboradores de Apoio Elegíveis) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
          {equipeApoioElegivel.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-2 col-span-2 text-center">
              Nenhum colaborador com perfil de apoio ativo disponível no sistema.
            </p>
          ) : (
            equipeApoioElegivel.map((prof) => {
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
    escolaConfig,
    addTurma, 
    updateTurma, 
    toggleStatusTurma, 
    migrarEstudantes, 
    refreshTurmas,
    role 
  } = useApp();

  const [turmaSelecionada, setTurmaSelecionada] = useState<Turma | null>(null);
  const [recarregandoBanco, setRecarregandoBanco] = useState(false);

  // Limpeza de qualquer cache de turmas no navegador ao acessar a página
  React.useEffect(() => {
    try {
      localStorage.removeItem('school_os_turmas');
      localStorage.removeItem('school_os_grade_horaria');
      localStorage.removeItem('plugue_turmas');
      localStorage.removeItem('turmas');
      sessionStorage.removeItem('school_os_turmas');
      sessionStorage.removeItem('plugue_turmas');
    } catch {}
  }, []);

  // Sincroniza a turma selecionada caso a lista de turmas seja carregada assincronamente do banco
  React.useEffect(() => {
    if (turmas.length > 0) {
      if (!turmaSelecionada) {
        setTurmaSelecionada(turmas[0]);
      } else {
        const atualizada = turmas.find((t) => t.id === turmaSelecionada.id);
        if (atualizada && atualizada !== turmaSelecionada) {
          setTurmaSelecionada(atualizada);
        } else if (!atualizada) {
          setTurmaSelecionada(turmas[0]);
        }
      }
    } else {
      setTurmaSelecionada(null);
    }
  }, [turmas, turmaSelecionada]);

  const [modalNovaTurmaAberto, setModalNovaTurmaAberto] = useState(false);
  const [modalEditarTurmaAberto, setModalEditarTurmaAberto] = useState(false);
  const [turmaEditando, setTurmaEditando] = useState<Turma | null>(null);
  const [modalEditarGradeAberto, setModalEditarGradeAberto] = useState(false);
  const [turmaEditandoGrade, setTurmaEditandoGrade] = useState<Turma | null>(null);
  const [modalNovoHorarioAberto, setModalNovoHorarioAberto] = useState(false);
  const [turmaFaixaEtariaModal, setTurmaFaixaEtariaModal] = useState<AnaliseTurmaFaixaEtaria | null>(null);
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
  const [gerandoDocx, setGerandoDocx] = useState<string | null>(null);

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

  // Form Nova Aula na Grade
  const [formHorario, setFormHorario] = useState<{
    dia_semana: 'Segunda' | 'Terça' | 'Quarta' | 'Quinta' | 'Sexta';
    professor_nome: string;
    quantidade_aulas: number | string;
  }>({
    dia_semana: 'Segunda',
    professor_nome: '',
    quantidade_aulas: 1,
  });

  const handleCadastrarTurma = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTurma.nome) return;

    const profsIdsLimpos = formTurma.professores_ids.filter((id) => {
      const p = professores.find((prof) => prof.id === id);
      return p && !isProfessorAdministrativo(p) && !isProfessorApoio(p);
    });

    const apoioIdsLimpos = formTurma.equipe_apoio_ids.filter((id) => {
      const p = professores.find((prof) => prof.id === id);
      return p && !isProfessorAdministrativo(p);
    });

    addTurma({
      nome: formTurma.nome,
      grupo: formTurma.grupo,
      turno: formTurma.turno,
      capacidade: Number(formTurma.capacidade) || 35,
      ano_letivo: Number(formTurma.ano_letivo) || 2026,
      sala: formTurma.sala || 'Sala Padrão',
      professores_ids: profsIdsLimpos,
      equipe_apoio_ids: apoioIdsLimpos,
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
    const rawProfs = t.professores_ids && t.professores_ids.length > 0
      ? t.professores_ids
      : (t.professor_regente_id ? [t.professor_regente_id] : []);

    // Filtra estritamente: nenhum professor administrativo ou apoio pode constar na regência
    const profsIniciais = rawProfs.filter((id) => {
      const p = professores.find((prof) => prof.id === id);
      return p && !isProfessorAdministrativo(p) && !isProfessorApoio(p);
    });

    const apoioInicial = (t.equipe_apoio_ids || []).filter((id) => {
      const p = professores.find((prof) => prof.id === id);
      return p && !isProfessorAdministrativo(p);
    });

    // Se havia algum vínculo indevido no banco (professor administrativo ou apoio em regência), sincroniza a remoção imediatamente
    if (rawProfs.length !== profsIniciais.length) {
      updateTurma(t.id, { professores_ids: profsIniciais });
    }

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

  const handleAbrirEditarGrade = (t: Turma) => {
    setTurmaEditandoGrade(t);
    setTurmaSelecionada(t);
    setModalEditarGradeAberto(true);
  };

  const handleSalvarGrade = (turmaId: string, novaGrade: HorarioAula[]) => {
    updateTurma(turmaId, { grade_horaria: novaGrade });
    if (turmaSelecionada?.id === turmaId) {
      setTurmaSelecionada({ ...turmaSelecionada, grade_horaria: novaGrade });
    }
    if (turmaEditandoGrade?.id === turmaId) {
      setTurmaEditandoGrade({ ...turmaEditandoGrade, grade_horaria: novaGrade });
    }
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

  const handleExportarDocx = async (turma: Turma, tipo: 'assinatura' | 'cadastro') => {
    const chave = `${turma.id}-${tipo}`;
    setGerandoDocx(chave);
    try {
      // Filtrar estudantes da turma (matriculados: exclui transferidos e evadidos)
      const alunosTurma = estudantes.filter(
        (e) => e.turma_id === turma.id && e.status_matricula !== 'Transferido' && e.status_matricula !== 'Evadido'
      );

      const res = await fetch('/api/turmas/docx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          turma,
          estudantes: alunosTurma,
          tipo,
          escolaConfig,
        }),
      });

      if (!res.ok) {
        const erroJson = await res.json().catch(() => ({}));
        throw new Error(erroJson.error || 'Erro ao gerar arquivo DOCX da turma.');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const safeNomeTurma = (turma.nome || 'Turma')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .replace(/_+/g, '_');
      const sufixo = tipo === 'assinatura' ? 'Lista_Assinatura' : 'Lista_Cadastral_AEE_CPF';
      a.download = `${safeNomeTurma}_${sufixo}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      const descTipo = tipo === 'assinatura' ? 'com espaço para assinatura ampliado e destaque AEE (*)' : 'cadastral com AEE e CPF';
      setFeedbackMsg({
        tipo: 'sucesso',
        texto: `Listagem DOCX (${descTipo}) da turma "${turma.nome}" gerada com sucesso! (${alunosTurma.length} estudantes).`,
      });
      setTimeout(() => setFeedbackMsg(null), 6000);
    } catch (err: any) {
      console.error('Erro na exportação DOCX:', err);
      setFeedbackMsg({
        tipo: 'erro',
        texto: err?.message || 'Falha ao gerar o arquivo DOCX. Tente novamente.',
      });
      setTimeout(() => setFeedbackMsg(null), 6000);
    } finally {
      setGerandoDocx(null);
    }
  };

  const handleSalvarEdicaoTurma = (e: React.FormEvent) => {
    e.preventDefault();
    if (!turmaEditando || !formEditarTurma.nome) return;

    const profsIdsLimpos = formEditarTurma.professores_ids.filter((id) => {
      const p = professores.find((prof) => prof.id === id);
      return p && !isProfessorAdministrativo(p) && !isProfessorApoio(p);
    });

    const apoioIdsLimpos = formEditarTurma.equipe_apoio_ids.filter((id) => {
      const p = professores.find((prof) => prof.id === id);
      return p && !isProfessorAdministrativo(p);
    });

    const updates = {
      nome: formEditarTurma.nome,
      grupo: formEditarTurma.grupo,
      turno: formEditarTurma.turno,
      capacidade: Number(formEditarTurma.capacidade) || 35,
      ano_letivo: Number(formEditarTurma.ano_letivo) || 2026,
      sala: formEditarTurma.sala || 'Sala Padrão',
      professores_ids: profsIdsLimpos,
      equipe_apoio_ids: apoioIdsLimpos,
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
    if (!turmaSelecionada || !formHorario.professor_nome) return;

    const qtd = Number(formHorario.quantidade_aulas);
    if (!qtd || isNaN(qtd) || qtd < 1) {
      alert('Por favor, informe uma quantidade válida de aulas (mínimo 1).');
      return;
    }

    const novoItem: HorarioAula = {
      id: `h-${Date.now()}`,
      dia_semana: formHorario.dia_semana,
      professor_nome: formHorario.professor_nome.trim(),
      quantidade_aulas: Math.floor(qtd),
    };

    const gradeAtual = turmaSelecionada.grade_horaria || [];
    // Se o professor já possui lançamento no mesmo dia, atualiza a quantidade de aulas
    const indexExistente = gradeAtual.findIndex(
      (h) =>
        h.dia_semana === formHorario.dia_semana &&
        h.professor_nome.trim().toLowerCase() === formHorario.professor_nome.trim().toLowerCase()
    );

    let novaGrade: HorarioAula[];
    if (indexExistente >= 0) {
      novaGrade = [...gradeAtual];
      const qtdAnterior = Number(novaGrade[indexExistente].quantidade_aulas) || 1;
      novaGrade[indexExistente] = {
        ...novaGrade[indexExistente],
        quantidade_aulas: qtdAnterior + Math.floor(qtd),
      };
    } else {
      novaGrade = [...gradeAtual, novoItem];
    }

    updateTurma(turmaSelecionada.id, { grade_horaria: novaGrade });
    
    // Atualiza turma selecionada local
    setTurmaSelecionada({ ...turmaSelecionada, grade_horaria: novaGrade });
    setModalNovoHorarioAberto(false);
    setFormHorario({
      dia_semana: 'Segunda',
      professor_nome: '',
      quantidade_aulas: 3,
    });
  };

  const handleRemoverHorario = (idHorario: string) => {
    if (!turmaSelecionada) return;
    const novaGrade = (turmaSelecionada.grade_horaria || []).filter((h) => h.id !== idHorario);
    updateTurma(turmaSelecionada.id, { grade_horaria: novaGrade });
    setTurmaSelecionada({ ...turmaSelecionada, grade_horaria: novaGrade });
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

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            disabled={recarregandoBanco}
            onClick={async () => {
              setRecarregandoBanco(true);
              try {
                localStorage.removeItem('school_os_turmas');
                localStorage.removeItem('school_os_grade_horaria');
                localStorage.removeItem('plugue_turmas');
                localStorage.removeItem('turmas');
                sessionStorage.removeItem('school_os_turmas');
                sessionStorage.removeItem('plugue_turmas');
                await refreshTurmas();
                setFeedbackMsg({
                  tipo: 'sucesso',
                  texto: 'Turmas e grade horária sincronizadas diretamente do banco de dados (sem cache)!',
                });
                setTimeout(() => setFeedbackMsg(null), 4000);
              } catch (e) {
                console.error(e);
                setFeedbackMsg({
                  tipo: 'erro',
                  texto: 'Erro ao conectar ao banco de dados para sincronizar turmas.',
                });
                setTimeout(() => setFeedbackMsg(null), 4000);
              } finally {
                setRecarregandoBanco(false);
              }
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition-all disabled:opacity-50"
            title="Limpar qualquer cache local e recarregar os dados diretamente do banco de dados"
          >
            <RefreshCw className={`h-4 w-4 text-school-blue-600 dark:text-school-gold-400 ${recarregandoBanco ? 'animate-spin' : ''}`} />
            <span>{recarregandoBanco ? 'Sincronizando...' : 'Atualizar do Banco'}</span>
          </button>

          {(role === 'admin' || role === 'direcao') && (
            <button
              onClick={() => setModalNovaTurmaAberto(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-school-blue-800 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-school-blue-800/25 hover:bg-school-blue-700 transition-all dark:bg-school-blue-600"
            >
              <Plus className="h-4 w-4" />
              <span>Cadastrar Nova Turma</span>
            </button>
          )}
        </div>
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

      {/* Alerta informativo quando acessado por docente */}
      {role === 'professor' && (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
          <Lock className="h-5 w-5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
          <div>
            <p className="font-bold uppercase tracking-wider text-[11px]">Módulo de Gestão Escolar</p>
            <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">
              Professores possuem visualização para consulta de turmas e horários. O gerenciamento e a edição cadastral são realizados pela coordenação e direção escolar.
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
      {turmas.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 rounded-3xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-xs text-center">
          <Loader2 className="h-8 w-8 animate-spin text-school-blue-600 dark:text-school-gold-400 mb-3" />
          <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
            Carregando turmas diretamente do banco de dados...
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md">
            Limpando caches locais e sincronizando registros oficiais em tempo real do banco de dados Turso.
          </p>
        </div>
      ) : turmas.filter((t) => filtroGrupo === 'todos' || t.grupo === filtroGrupo).length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 rounded-3xl border border-dashed border-slate-200 bg-white/50 dark:border-slate-800 dark:bg-slate-900/50 text-center">
          <BookOpen className="h-8 w-8 text-slate-400 mb-2" />
          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
            Nenhuma turma encontrada no grupo selecionado ({filtroGrupo}).
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Selecione outro filtro de grupo acima ou cadastre uma nova turma.
          </p>
        </div>
      ) : (
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
                <div className="text-right text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  {turma.sala}
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

              {/* Indicador de Faixa Etária e Distorção Idade-Série */}
              {(() => {
                const estudantesTurma = estudantes.filter((e) => e.turma_id === turma.id);
                const anoLetivoRef = Number(escolaConfig?.ano_letivo_ativo) || Number(turma.ano_letivo) || 2026;
                const analiseFaixa = analisarFaixaEtariaTurma(turma, estudantesTurma, anoLetivoRef);

                if (alunosMatriculados === 0) return null;

                if (analiseFaixa.temAlunosForaDaFaixa) {
                  return (
                    <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setTurmaFaixaEtariaModal(analiseFaixa);
                        }}
                        className="group w-full flex items-center justify-between gap-1.5 px-2.5 py-1.5 rounded-xl border border-amber-300/90 bg-amber-50/90 text-amber-900 hover:bg-amber-100 dark:border-amber-800/70 dark:bg-amber-950/40 dark:text-amber-200 dark:hover:bg-amber-950/70 transition-all text-left shadow-2xs"
                        title="Clique para ver a análise de faixa etária e distorção idade-série"
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                          <span className="font-bold text-[11px] truncate">
                            Fora da Faixa: {analiseFaixa.totalForaDaFaixa} {analiseFaixa.totalForaDaFaixa === 1 ? 'estudante' : 'estudantes'}
                          </span>
                        </div>
                        <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 group-hover:underline shrink-0">
                          Ver lista →
                        </span>
                      </button>
                    </div>
                  );
                }

                return (
                  <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setTurmaFaixaEtariaModal(analiseFaixa);
                      }}
                      className="group w-full flex items-center justify-between gap-1.5 px-2.5 py-1.5 rounded-xl border border-emerald-200/90 bg-emerald-50/80 text-emerald-800 hover:bg-emerald-100/80 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300 dark:hover:bg-emerald-950/50 transition-all text-left shadow-2xs"
                      title="Clique para ver detalhes da faixa etária da turma"
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span className="font-bold text-[11px] truncate">
                          Faixa Etária Adequada
                        </span>
                      </div>
                      <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 group-hover:underline shrink-0">
                        ({analiseFaixa.faixaEsperada})
                      </span>
                    </button>
                  </div>
                );
              })()}

              {/* Equipe Docente e Apoio Resumo no Card */}
              {(() => {
                const rawProfsCardIds = turma.professores_ids && turma.professores_ids.length > 0
                  ? turma.professores_ids
                  : (turma.professor_regente_id ? [turma.professor_regente_id] : []);
                const profsCardIds = rawProfsCardIds.filter((id) => {
                  const p = professores.find((prof) => prof.id === id);
                  return p && !isProfessorAdministrativo(p) && !isProfessorApoio(p);
                });
                const apoioCardIds = (turma.equipe_apoio_ids || []).filter((id) => {
                  const p = professores.find((prof) => prof.id === id);
                  return p && !isProfessorAdministrativo(p);
                });

                if (profsCardIds.length === 0 && apoioCardIds.length === 0) return null;

                return (
                  <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 text-[11px] space-y-1.5">
                    {profsCardIds.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-slate-500 dark:text-slate-400 text-[10px] uppercase tracking-wider">
                          Docentes ({profsCardIds.length}):
                        </span>
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

              {/* Botões de Ação da Turma (Editar Dados e Editar Grade Horária) */}
              <div className="mt-3.5 pt-2.5 border-t border-slate-100 dark:border-slate-800/80">
                <div className="flex items-center justify-between gap-1 mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <Edit2 className="h-3 w-3 text-school-blue-600 dark:text-school-gold-400" />
                    Gerenciar Turma:
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAbrirEditarTurma(turma);
                    }}
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50/90 hover:bg-blue-100 px-2.5 py-2 text-xs font-bold text-school-blue-900 hover:text-school-blue-950 dark:border-blue-800/70 dark:bg-blue-950/50 dark:text-blue-200 dark:hover:bg-blue-900/60 transition-all shadow-2xs group cursor-pointer"
                    title="Editar dados da turma (nome, turno, capacidade, sala, professores e status)"
                  >
                    <Edit2 className="h-3.5 w-3.5 text-school-blue-600 dark:text-school-gold-400 shrink-0 group-hover:scale-110 transition-transform" />
                    <span className="truncate">Editar Turma</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAbrirEditarGrade(turma);
                    }}
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50/90 hover:bg-amber-100 px-2.5 py-2 text-xs font-bold text-amber-900 hover:text-amber-950 dark:border-amber-800/70 dark:bg-amber-950/50 dark:text-amber-200 dark:hover:bg-amber-900/60 transition-all shadow-2xs group cursor-pointer"
                    title="Editar a grade horária semanal de aulas desta turma"
                  >
                    <Clock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0 group-hover:scale-110 transition-transform" />
                    <span className="truncate">Editar Grade</span>
                  </button>
                </div>
              </div>

              {/* Botões de Impressão DOCX da Turma */}
              <div className="mt-3.5 pt-2.5 border-t border-slate-100 dark:border-slate-800/80">
                <div className="flex items-center justify-between gap-1 mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <Printer className="h-3 w-3 text-school-blue-600 dark:text-school-gold-400" />
                    Imprimir (DOCX):
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400">
                    {alunosMatriculados} aluno(s)
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    disabled={gerandoDocx === `${turma.id}-assinatura`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleExportarDocx(turma, 'assinatura');
                    }}
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50/80 hover:bg-blue-100 px-2 py-1.5 text-[11px] font-bold text-school-blue-900 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-200 dark:hover:bg-blue-900/60 transition-all shadow-2xs group disabled:opacity-60"
                    title="Imprimir listagem com estudantes em ordem alfabética, destaque AEE (*) e espaço ampliado para assinatura (DOCX)"
                  >
                    {gerandoDocx === `${turma.id}-assinatura` ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-school-blue-600 dark:text-school-gold-400 shrink-0" />
                    ) : (
                      <FileText className="h-3.5 w-3.5 text-school-blue-600 dark:text-school-gold-400 shrink-0 group-hover:scale-110 transition-transform" />
                    )}
                    <span className="truncate">Lista Assinatura</span>
                  </button>

                  <button
                    type="button"
                    disabled={gerandoDocx === `${turma.id}-cadastro`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleExportarDocx(turma, 'cadastro');
                    }}
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-purple-200 bg-purple-50/80 hover:bg-purple-100 px-2 py-1.5 text-[11px] font-bold text-purple-900 dark:border-purple-900/60 dark:bg-purple-950/40 dark:text-purple-200 dark:hover:bg-purple-900/60 transition-all shadow-2xs group disabled:opacity-60"
                    title="Imprimir listagem com estudantes em ordem alfabética, data de nascimento, se AEE ou não e CPF (DOCX)"
                  >
                    {gerandoDocx === `${turma.id}-cadastro` ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-purple-600 dark:text-purple-400 shrink-0" />
                    ) : (
                      <FileSpreadsheet className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400 shrink-0 group-hover:scale-110 transition-transform" />
                    )}
                    <span className="truncate">Lista AEE &amp; CPF</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      )}

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

            <div className="flex items-center gap-2 flex-wrap">
              {(() => {
                const turmaAtual = turmas.find((t) => t.id === turmaSelecionada.id) || turmaSelecionada;
                const estudantesTurmaSel = estudantes.filter((e) => e.turma_id === turmaAtual.id);
                const anoLetivoRef = Number(escolaConfig?.ano_letivo_ativo) || Number(turmaAtual.ano_letivo) || 2026;
                const analiseFaixaSel = analisarFaixaEtariaTurma(turmaAtual, estudantesTurmaSel, anoLetivoRef);

                return (
                  <button
                    type="button"
                    onClick={() => setTurmaFaixaEtariaModal(analiseFaixaSel)}
                    className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition-all shadow-2xs ${
                      analiseFaixaSel.temAlunosForaDaFaixa
                        ? 'border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200'
                        : 'border-emerald-300 bg-emerald-50 text-emerald-900 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200'
                    }`}
                    title="Análise de faixa etária e distorção idade-série desta turma"
                  >
                    {analiseFaixaSel.temAlunosForaDaFaixa ? (
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    )}
                    <span>Faixa Etária ({analiseFaixaSel.faixaEsperada})</span>
                    {analiseFaixaSel.temAlunosForaDaFaixa && (
                      <span className="rounded-full bg-amber-200 px-1.5 py-0.2 text-[10px] font-black text-amber-900 dark:bg-amber-900 dark:text-amber-100">
                        {analiseFaixaSel.totalForaDaFaixa} fora
                      </span>
                    )}
                  </button>
                );
              })()}

              {/* Botões de Emissão DOCX para Turma Selecionada */}
              <button
                type="button"
                disabled={gerandoDocx === `${turmaSelecionada.id}-assinatura`}
                onClick={() => handleExportarDocx(turmaSelecionada, 'assinatura')}
                className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50/80 px-3 py-1.5 text-xs font-bold text-school-blue-900 hover:bg-blue-100 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-200 dark:hover:bg-blue-900/60 transition-all shadow-2xs disabled:opacity-60"
                title="Imprimir listagem com estudantes em ordem alfabética, destaque AEE (*) e espaço ampliado para assinatura (DOCX)"
              >
                {gerandoDocx === `${turmaSelecionada.id}-assinatura` ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-school-blue-600 dark:text-school-gold-400 shrink-0" />
                ) : (
                  <FileText className="h-3.5 w-3.5 text-school-blue-600 dark:text-school-gold-400 shrink-0" />
                )}
                <span>Lista Assinatura (DOCX)</span>
              </button>

              <button
                type="button"
                disabled={gerandoDocx === `${turmaSelecionada.id}-cadastro`}
                onClick={() => handleExportarDocx(turmaSelecionada, 'cadastro')}
                className="inline-flex items-center gap-1.5 rounded-xl border border-purple-200 bg-purple-50/80 px-3 py-1.5 text-xs font-bold text-purple-900 hover:bg-purple-100 dark:border-purple-900/60 dark:bg-purple-950/40 dark:text-purple-200 dark:hover:bg-purple-900/60 transition-all shadow-2xs disabled:opacity-60"
                title="Imprimir listagem com estudantes em ordem alfabética, data de nascimento, se AEE ou não e CPF (DOCX)"
              >
                {gerandoDocx === `${turmaSelecionada.id}-cadastro` ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-purple-600 dark:text-purple-400 shrink-0" />
                ) : (
                  <FileSpreadsheet className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
                )}
                <span>Lista AEE &amp; CPF (DOCX)</span>
              </button>

              {(role === 'admin' || role === 'direcao') && (
                <>
                  <button
                    onClick={() => handleAbrirEditarTurma(turmaSelecionada)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50/80 px-3 py-1.5 text-xs font-bold text-school-blue-900 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-200 transition-all shadow-2xs"
                    title="Editar informações cadastrais desta turma"
                  >
                    <Edit2 className="h-3.5 w-3.5 text-school-blue-600 dark:text-school-gold-400" />
                    <span>Editar Turma</span>
                  </button>

                  <button
                    onClick={() => handleAbrirEditarGrade(turmaSelecionada)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50/80 px-3 py-1.5 text-xs font-bold text-amber-900 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200 transition-all shadow-2xs"
                    title="Editar a grade horária semanal de aulas desta turma"
                  >
                    <Clock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                    <span>Editar Grade Horária</span>
                  </button>

                  <button
                    onClick={() => {
                      setFormHorario({
                        dia_semana: 'Segunda',
                        professor_nome: '',
                        quantidade_aulas: 1,
                      });
                      setModalNovoHorarioAberto(true);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    <Plus className="h-3.5 w-3.5 text-school-blue-600 dark:text-school-gold-400" />
                    <span>Adicionar Aula na Grade</span>
                  </button>
                </>
              )}
            </div>
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
              .filter((p): p is Professor => !!p && !isProfessorAdministrativo(p) && !isProfessorApoio(p));

            const apoioVinculado = apoioIds
              .map((id) => professores.find((p) => p.id === id))
              .filter((p): p is Professor => !!p && !isProfessorAdministrativo(p));

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
                            {prof.ativo === false && (
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
                            {prof.ativo === false && (
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
              const totalAulasDia = aulasDoDia.reduce(
                (acc, h) => acc + (Number(h.quantidade_aulas) || 1),
                0
              );

              return (
                <div
                  key={dia}
                  className="flex flex-col rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/50"
                >
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2 dark:border-slate-700">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-xs font-black uppercase tracking-wider text-school-blue-900 dark:text-school-gold-400">
                        {dia}
                      </span>
                      {totalAulasDia > 0 && (
                        <span className="rounded-full bg-school-blue-100/70 px-1.5 py-0.2 text-[10px] font-bold text-school-blue-800 dark:bg-school-blue-950 dark:text-school-blue-300">
                          {totalAulasDia} {totalAulasDia === 1 ? 'aula' : 'aulas'}
                        </span>
                      )}
                    </div>
                    {(role === 'admin' || role === 'direcao') && (
                      <button
                        type="button"
                        onClick={() => {
                          setFormHorario({
                            dia_semana: dia,
                            professor_nome: '',
                            quantidade_aulas: 3,
                          });
                          setModalNovoHorarioAberto(true);
                        }}
                        className="rounded-lg p-1 text-slate-400 hover:bg-white hover:text-school-blue-600 dark:hover:bg-slate-800 dark:hover:text-school-gold-400 transition-colors"
                        title={`Adicionar aula na ${dia} (mínimo 3)`}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="mt-3 flex-1 space-y-2.5">
                    {aulasDoDia.length === 0 ? (
                      <p className="py-6 text-center text-[11px] text-slate-400 italic">
                        Sem aulas cadastradas
                      </p>
                    ) : (
                      aulasDoDia.map((aula) => {
                        const qtd = aula.quantidade_aulas ?? 1;
                        return (
                          <div
                            key={aula.id}
                            className="group relative rounded-xl border border-slate-200 bg-white p-3 text-xs shadow-xs transition-all hover:border-school-blue-300 hover:shadow-sm dark:border-slate-700 dark:bg-slate-800"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="h-7 w-7 rounded-full bg-school-blue-600/10 text-school-blue-700 dark:text-school-blue-300 flex items-center justify-center font-bold text-xs shrink-0">
                                  {aula.professor_nome.charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <h5
                                    className="font-bold text-slate-900 dark:text-white truncate"
                                    title={aula.professor_nome}
                                  >
                                    {aula.professor_nome}
                                  </h5>
                                  <div className="mt-1 flex items-center gap-1.5">
                                    <span className="inline-flex items-center rounded-md bg-school-blue-50 px-2 py-0.5 text-[11px] font-bold text-school-blue-700 dark:bg-school-blue-950 dark:text-school-blue-300 border border-school-blue-200/60 dark:border-school-blue-800/60">
                                      {qtd} {qtd === 1 ? 'aula no dia' : 'aulas no dia'}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {(role === 'admin' || role === 'direcao') && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoverHorario(aula.id)}
                                  className="p-1 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                                  title={`Remover aula de ${aula.professor_nome}`}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })
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
                  const p = professores.find((prof) => prof.id === id);
                  if (!p || isProfessorAdministrativo(p) || isProfessorApoio(p)) return;
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
                            ? `Turma ativa: ${alunosVinculados.length} estudante(s) contados normalmente nas métricas.`
                            : `Turma desativada: todos os ${alunosVinculados.length} estudante(s) vinculados foram alterados para "Trancado".`}
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

              {/* 3. BOTÃO: GRADE HORÁRIA DA TURMA */}
              <div className="flex items-center justify-between rounded-2xl border border-amber-200 bg-amber-50/70 p-3.5 dark:border-amber-900/60 dark:bg-amber-950/30">
                <div>
                  <div className="flex items-center gap-1.5 font-bold text-amber-900 dark:text-amber-300">
                    <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    <span>Grade Horária Semanal</span>
                  </div>
                  <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">
                    Configure as aulas e docentes desta turma nos dias da semana.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setModalEditarTurmaAberto(false);
                    handleAbrirEditarGrade(turmaEditando);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-3.5 py-2 text-xs font-bold text-white shadow hover:bg-amber-700 transition-all dark:bg-amber-600 whitespace-nowrap"
                >
                  <Clock className="h-3.5 w-3.5" />
                  <span>Editar Grade</span>
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
                    const p = professores.find((prof) => prof.id === id);
                    if (!p || isProfessorAdministrativo(p) || isProfessorApoio(p)) return;
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
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Buscar aluno..."
                      value={buscaEstudanteMigracao}
                      onChange={(e) => setBuscaEstudanteMigracao(e.target.value)}
                      className="rounded-lg border border-slate-200 bg-slate-50 !pl-9 !pr-3 input-icon-left py-1.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white focus:outline-none focus:border-school-blue-500"
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
      {modalNovoHorarioAberto && (() => {
        const turmaAtual = (turmaSelecionada ? turmas.find((t: Turma) => t.id === turmaSelecionada.id) : null) || turmaSelecionada;
        const profsTurmaIds = turmaAtual
          ? (turmaAtual.professores_ids && turmaAtual.professores_ids.length > 0
              ? turmaAtual.professores_ids
              : turmaAtual.professor_regente_id ? [turmaAtual.professor_regente_id] : [])
          : [];
        const regenteNome = turmaAtual?.professor_regente_nome?.trim().toLowerCase();

        const docentesDaTurma = professores
          .filter(
            (p: Professor) =>
              p.ativo !== false &&
              !isProfessorAdministrativo(p) &&
              !isProfessorApoio(p) &&
              (profsTurmaIds.includes(p.id) ||
                (turmaAtual && Array.isArray(p.turmas_atribuidas_ids) && p.turmas_atribuidas_ids.includes(turmaAtual.id)) ||
                (regenteNome && p.nome_completo?.trim().toLowerCase() === regenteNome))
          )
        const docentesDisponiveis = docentesDaTurma.length > 0
          ? docentesDaTurma
          : professores
              .filter(
                (p: Professor) =>
                  p.ativo !== false &&
                  !isProfessorAdministrativo(p) &&
                  !isProfessorApoio(p)
              )
              .sort((a: Professor, b: Professor) => a.nome_completo.localeCompare(b.nome_completo));

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
            <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-school-dark-surface">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Clock className="h-5 w-5 text-school-blue-600 dark:text-school-gold-400" />
                    Adicionar Aula na Grade
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Escolha o professor e a quantidade (mínimo de 3 aulas por dia)
                  </p>
                </div>
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

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Docente *
                  </label>
                  <select
                    required
                    value={formHorario.professor_nome}
                    onChange={(e) => setFormHorario({ ...formHorario, professor_nome: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:border-school-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  >
                    <option value="">Selecione um docente</option>
                    {docentesDisponiveis.length === 0 ? (
                      <option value="" disabled>
                        Nenhum docente disponível no sistema
                      </option>
                    ) : (
                      docentesDisponiveis.map((p: Professor) => (
                        <option key={p.id} value={p.nome_completo}>
                          {p.nome_completo} {p.disciplinas?.length ? `(${p.disciplinas.join(', ')})` : ''}
                        </option>
                      ))
                    )}
                  </select>
                  {docentesDaTurma.length === 0 && (
                    <p className="mt-1.5 text-[11px] text-amber-600 dark:text-amber-400">
                      Nenhum docente diretamente vinculado à turma; exibindo docentes gerais aptos.
                    </p>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-semibold text-slate-700 dark:text-slate-300">
                      Quantidade de aulas dele por dia *
                    </label>
                    <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.2 rounded border border-amber-200/60 dark:border-amber-900/60">
                      Mínimo 3 aulas
                    </span>
                  </div>
                  <div className="space-y-2">
                    <input
                      type="number"
                      required
                      min={1}
                      max={8}
                      step={1}
                      placeholder="Ex: 3"
                      value={formHorario.quantidade_aulas}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormHorario({
                          ...formHorario,
                          quantidade_aulas: val === '' ? '' : Math.max(1, parseInt(val, 10) || 1),
                        });
                      }}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:border-school-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white font-bold"
                    />
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {[3, 4, 5, 6].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setFormHorario({ ...formHorario, quantidade_aulas: num })}
                          className={`px-2 py-1 rounded-lg text-xs font-bold transition-all ${
                            formHorario.quantidade_aulas === num
                              ? 'bg-school-blue-800 text-white dark:bg-school-gold-500 dark:text-slate-900 font-black'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                          }`}
                        >
                          {num} aulas
                        </button>
                      ))}
                    </div>
                  </div>
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
                    disabled={docentesDisponiveis.length === 0}
                    className="rounded-xl bg-school-blue-800 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-school-blue-700 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-school-blue-600"
                  >
                    Salvar Aula
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* Modal de Edição Interativa da Grade Horária da Turma */}
      <ModalEditarGradeTurma
        turma={turmaEditandoGrade}
        isOpen={modalEditarGradeAberto}
        onClose={() => setModalEditarGradeAberto(false)}
        professores={professores}
        onSalvarGrade={handleSalvarGrade}
        onAbrirEditarTurma={(t) => handleAbrirEditarTurma(t)}
      />

      {/* Modal de Detalhes da Faixa Etária e Distorção Idade-Série */}
      {turmaFaixaEtariaModal && (
        <ModalFaixaEtariaTurma
          analise={turmaFaixaEtariaModal}
          onClose={() => setTurmaFaixaEtariaModal(null)}
        />
      )}
    </div>
  );
}
