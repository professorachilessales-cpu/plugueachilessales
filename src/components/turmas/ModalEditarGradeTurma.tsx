'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Clock, 
  Plus, 
  Trash2, 
  Edit2, 
  Calendar, 
  GraduationCap, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle, 
  Minus, 
  BookOpen, 
  Sparkles,
  Info
} from 'lucide-react';
import { Turma, HorarioAula, Professor } from '@/lib/types';
import { isProfessorAdministrativo, isProfessorApoio } from '@/lib/pareceres-ia';

export interface ModalEditarGradeTurmaProps {
  turma: Turma | null;
  isOpen: boolean;
  onClose: () => void;
  professores: Professor[];
  onSalvarGrade: (turmaId: string, novaGrade: HorarioAula[]) => void;
  onAbrirEditarTurma?: (turma: Turma) => void;
}

const DIAS_SEMANA: ('Segunda' | 'Terça' | 'Quarta' | 'Quinta' | 'Sexta')[] = [
  'Segunda',
  'Terça',
  'Quarta',
  'Quinta',
  'Sexta'
];

export function ModalEditarGradeTurma({
  turma,
  isOpen,
  onClose,
  professores,
  onSalvarGrade,
  onAbrirEditarTurma,
}: ModalEditarGradeTurmaProps) {
  // Estado local da grade para permitir edição imediata
  const [gradeLocal, setGradeLocal] = useState<HorarioAula[]>([]);
  const [diaSelecionado, setDiaSelecionado] = useState<'Segunda' | 'Terça' | 'Quarta' | 'Quinta' | 'Sexta'>('Segunda');
  const [docenteSelecionado, setDocenteSelecionado] = useState<string>('');
  const [quantidadeAulas, setQuantidadeAulas] = useState<number>(3);
  const [feedback, setFeedback] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);

  // Modal para adicionar aulas no dia selecionado com no mínimo 3 aulas
  const [modalDiaAberto, setModalDiaAberto] = useState<('Segunda' | 'Terça' | 'Quarta' | 'Quinta' | 'Sexta') | null>(null);
  const [itensAulaDia, setItensAulaDia] = useState<Array<{ id: string; professor_nome: string; quantidade_aulas: number }>>([]);

  // Sincroniza estado quando a turma muda ou modal abre
  useEffect(() => {
    if (turma) {
      setGradeLocal(turma.grade_horaria || []);
      setDiaSelecionado('Segunda');
      setDocenteSelecionado('');
      setQuantidadeAulas(3);
      setFeedback(null);
      setModalDiaAberto(null);
      setItensAulaDia([]);
    }
  }, [turma, isOpen]);

  // Apenas docentes vinculados à turma (ativos, NÃO administrativos e NÃO apoio)
  const docentesTurma = useMemo(() => {
    if (!turma) return [];

    let rawProfsTurmaIds: string[] = [];
    if (Array.isArray(turma.professores_ids)) {
      rawProfsTurmaIds = [...turma.professores_ids];
    } else if (typeof (turma as any).professores_ids === 'string') {
      try {
        const parsed = JSON.parse((turma as any).professores_ids);
        if (Array.isArray(parsed)) rawProfsTurmaIds = [...parsed];
      } catch {}
    }

    if (turma.professor_regente_id && !rawProfsTurmaIds.includes(turma.professor_regente_id)) {
      rawProfsTurmaIds.push(turma.professor_regente_id);
    }

    const regenteNome = turma.professor_regente_nome?.trim().toLowerCase();

    // Filtra docentes gerais ativos e aptos (não administrativos e não equipe de apoio exclusiva)
    const todosAptos = professores.filter(
      (p) => p.ativo !== false && !isProfessorAdministrativo(p) && !isProfessorApoio(p)
    );

    const daTurma = todosAptos.filter((p) => {
      let turmasAtribuidas: string[] = [];
      if (Array.isArray(p.turmas_atribuidas_ids)) {
        turmasAtribuidas = p.turmas_atribuidas_ids;
      } else if (typeof (p as any).turmas_atribuidas_ids === 'string') {
        try {
          const parsed = JSON.parse((p as any).turmas_atribuidas_ids);
          if (Array.isArray(parsed)) turmasAtribuidas = parsed;
        } catch {}
      }

      const vinculado =
        rawProfsTurmaIds.includes(p.id) ||
        turmasAtribuidas.includes(turma.id) ||
        (regenteNome ? p.nome_completo?.trim().toLowerCase() === regenteNome : false);

      return Boolean(vinculado);
    });

    daTurma.sort((a, b) => a.nome_completo.localeCompare(b.nome_completo));
    return daTurma;
  }, [turma, professores]);

  // Docentes disponíveis com fallback caso a turma ainda não tenha docentes explicitamente vinculados
  const todosDocentesAptos = useMemo(() => {
    return professores
      .filter((p) => p.ativo !== false && !isProfessorAdministrativo(p) && !isProfessorApoio(p))
      .sort((a, b) => a.nome_completo.localeCompare(b.nome_completo));
  }, [professores]);

  const listaDocentesDisponiveis = useMemo(() => {
    if (docentesTurma.length > 0) return docentesTurma;
    return todosDocentesAptos;
  }, [docentesTurma, todosDocentesAptos]);

  if (!isOpen || !turma) return null;

  const totalAulasSemana = gradeLocal.reduce(
    (acc, h) => acc + (Number(h.quantidade_aulas) || 1),
    0
  );

  const diasComAulas = DIAS_SEMANA.filter((d) => 
    gradeLocal.some((h) => h.dia_semana === d)
  ).length;

  const docentesDistintosNaGrade = new Set(
    gradeLocal.map((h) => h.professor_nome.trim().toLowerCase())
  ).size;

  const mostrarFeedback = (tipo: 'sucesso' | 'erro', texto: string) => {
    setFeedback({ tipo, texto });
    setTimeout(() => setFeedback(null), 4000);
  };

  const persistirGrade = (novaGrade: HorarioAula[]) => {
    setGradeLocal(novaGrade);
    onSalvarGrade(turma.id, novaGrade);
  };

  // Abre modal rápido para o dia específico com padrão de 3 aulas
  const abrirModalDia = (dia: 'Segunda' | 'Terça' | 'Quarta' | 'Quinta' | 'Sexta') => {
    setDiaSelecionado(dia);
    const primeiroProf = listaDocentesDisponiveis[0]?.nome_completo || '';
    setItensAulaDia([
      {
        id: `dia-${Date.now()}-1`,
        professor_nome: primeiroProf,
        quantidade_aulas: 3, // Padrão de no mínimo 3 aulas
      },
    ]);
    setModalDiaAberto(dia);
  };

  const handleAdicionarLinhaProfessorDia = () => {
    const profsJaEscolhidos = itensAulaDia.map((it) => it.professor_nome.trim().toLowerCase());
    const proximoDisponivel = listaDocentesDisponiveis.find(
      (p) => !profsJaEscolhidos.includes(p.nome_completo.trim().toLowerCase())
    );
    setItensAulaDia((prev) => [
      ...prev,
      {
        id: `dia-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        professor_nome: proximoDisponivel?.nome_completo || '',
        quantidade_aulas: 1,
      },
    ]);
  };

  const handleRemoverLinhaProfessorDia = (id: string) => {
    if (itensAulaDia.length <= 1) return;
    setItensAulaDia((prev) => prev.filter((it) => it.id !== id));
  };

  const handleAtualizarLinhaProfessorDia = (
    id: string,
    campo: 'professor_nome' | 'quantidade_aulas',
    valor: any
  ) => {
    setItensAulaDia((prev) =>
      prev.map((it) => (it.id === id ? { ...it, [campo]: valor } : it))
    );
  };

  const totalAulasNoModalDia = itensAulaDia.reduce(
    (acc, it) => acc + Math.max(1, Math.floor(Number(it.quantidade_aulas) || 1)),
    0
  );

  const handleSalvarAulasModalDia = () => {
    if (!modalDiaAberto) return;

    const itensPreenchidos = itensAulaDia.filter((it) => it.professor_nome.trim() !== '');
    if (itensPreenchidos.length === 0) {
      mostrarFeedback('erro', 'Por favor, selecione ao menos um professor para a aula.');
      return;
    }

    if (totalAulasNoModalDia < 3) {
      mostrarFeedback(
        'erro',
        `É obrigatório adicionar no mínimo 3 aulas no dia (atualmente selecionado: ${totalAulasNoModalDia} aula(s)).`
      );
      return;
    }

    let novaGrade = [...gradeLocal];

    itensPreenchidos.forEach((item) => {
      const nomeLimpo = item.professor_nome.trim();
      const qtd = Math.max(1, Math.floor(Number(item.quantidade_aulas) || 1));

      const indexExistente = novaGrade.findIndex(
        (h) => h.dia_semana === modalDiaAberto && h.professor_nome.trim().toLowerCase() === nomeLimpo.toLowerCase()
      );

      if (indexExistente >= 0) {
        novaGrade[indexExistente] = {
          ...novaGrade[indexExistente],
          quantidade_aulas: qtd,
        };
      } else {
        novaGrade.push({
          id: `h-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          dia_semana: modalDiaAberto,
          professor_nome: nomeLimpo,
          quantidade_aulas: qtd,
        });
      }
    });

    persistirGrade(novaGrade);
    mostrarFeedback(
      'sucesso',
      `${totalAulasNoModalDia} aula(s) registrada(s) com sucesso na ${modalDiaAberto}!`
    );
    setModalDiaAberto(null);
  };

  const handleAdicionarAula = (e: React.FormEvent) => {
    e.preventDefault();
    if (!docenteSelecionado.trim()) {
      mostrarFeedback('erro', 'Por favor, selecione um docente para a aula.');
      return;
    }

    const docenteValido = listaDocentesDisponiveis.some(
      (p) => p.nome_completo.trim().toLowerCase() === docenteSelecionado.trim().toLowerCase()
    );
    if (!docenteValido) {
      mostrarFeedback('erro', 'O docente selecionado não é válido.');
      return;
    }

    const qtd = Math.max(1, Math.floor(Number(quantidadeAulas) || 1));
    const nomeLimpo = docenteSelecionado.trim();

    // Procura se o docente já tem lançamento neste dia
    const indexExistente = gradeLocal.findIndex(
      (h) => h.dia_semana === diaSelecionado && h.professor_nome.trim().toLowerCase() === nomeLimpo.toLowerCase()
    );

    let novaGrade: HorarioAula[];
    if (indexExistente >= 0) {
      novaGrade = [...gradeLocal];
      const qtdAnterior = Number(novaGrade[indexExistente].quantidade_aulas) || 1;
      const novaQtd = qtdAnterior + qtd;
      novaGrade[indexExistente] = {
        ...novaGrade[indexExistente],
        quantidade_aulas: novaQtd,
      };
      mostrarFeedback('sucesso', `Aulas de ${nomeLimpo} na ${diaSelecionado} aumentadas de ${qtdAnterior} para ${novaQtd}.`);
    } else {
      const novoHorario: HorarioAula = {
        id: `h-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        dia_semana: diaSelecionado,
        professor_nome: nomeLimpo,
        quantidade_aulas: qtd,
      };
      novaGrade = [...gradeLocal, novoHorario];
      mostrarFeedback('sucesso', `${qtd} aula(s) de ${nomeLimpo} adicionada(s) na ${diaSelecionado}.`);
    }

    persistirGrade(novaGrade);
    setQuantidadeAulas(3);
    // Mantém o dia e o professor selecionados para facilitar múltiplos lançamentos
  };

  const handleAlterarQuantidade = (idHorario: string, delta: number) => {
    const horario = gradeLocal.find((h) => h.id === idHorario);
    if (!horario) return;

    const qtdAtual = Number(horario.quantidade_aulas) || 1;
    const novaQtd = qtdAtual + delta;

    if (novaQtd <= 0) {
      handleRemoverAula(idHorario);
      return;
    }

    const novaGrade = gradeLocal.map((h) =>
      h.id === idHorario ? { ...h, quantidade_aulas: novaQtd } : h
    );
    persistirGrade(novaGrade);
    mostrarFeedback('sucesso', `Carga horária de ${horario.professor_nome} ajustada para ${novaQtd} aula(s).`);
  };

  const handleRemoverAula = (idHorario: string) => {
    const horario = gradeLocal.find((h) => h.id === idHorario);
    const novaGrade = gradeLocal.filter((h) => h.id !== idHorario);
    persistirGrade(novaGrade);
    if (horario) {
      mostrarFeedback('sucesso', `Aula de ${horario.professor_nome} removida da ${horario.dia_semana}.`);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 animate-in zoom-in-95 duration-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Topo do Modal */}
        <div className="flex items-start justify-between border-b border-slate-100 p-5 dark:border-slate-800 shrink-0">
          <div className="flex items-start gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-school-gold-400 shrink-0 shadow-xs">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  Editar Grade Horária: {turma.nome}
                </h3>
                <span className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-extrabold uppercase ${
                  turma.turno === 'manha'
                    ? 'bg-blue-100 text-school-blue-800 dark:bg-blue-950 dark:text-blue-300'
                    : turma.turno === 'tarde'
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                    : 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200'
                }`}>
                  {turma.turno}
                </span>
                {turma.sala && (
                  <span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60">
                    {turma.sala}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Configure os docentes e o total de aulas para cada dia da semana
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onAbrirEditarTurma && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onAbrirEditarTurma(turma);
                }}
                className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                title="Editar dados cadastrais, sala e professores da turma"
              >
                <Edit2 className="h-3.5 w-3.5 text-school-blue-600 dark:text-school-gold-400" />
                <span>Dados da Turma</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
              title="Fechar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Resumo de Carga Horária */}
        <div className="bg-slate-50/80 px-5 py-3 border-b border-slate-100 dark:bg-slate-800/40 dark:border-slate-800 shrink-0">
          <div className="flex items-center justify-between flex-wrap gap-3 text-xs">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 dark:text-slate-400">Total Semanal:</span>
                <span className="font-black text-school-blue-900 dark:text-school-gold-400 bg-school-blue-50 dark:bg-school-blue-950/60 px-2 py-0.5 rounded-md border border-school-blue-200/60 dark:border-school-blue-800/60">
                  {totalAulasSemana} {totalAulasSemana === 1 ? 'aula' : 'aulas'}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 dark:text-slate-400">Dias com Aula:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {diasComAulas} de 5 dias
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 dark:text-slate-400">Docentes na Grade:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {docentesDistintosNaGrade} docente(s)
                </span>
              </div>
            </div>

            {docentesTurma.length === 0 && (
              <div className="flex items-center justify-between gap-2 text-[11px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-3 py-1 rounded-md border border-amber-200/70 dark:border-amber-900/60">
                <div className="flex items-center gap-1.5">
                  <Info className="h-3.5 w-3.5 shrink-0" />
                  <span>Nenhum docente vinculado diretamente na regência desta turma.</span>
                </div>
                {onAbrirEditarTurma && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onAbrirEditarTurma(turma);
                    }}
                    className="font-bold underline hover:text-amber-900 dark:hover:text-amber-200 cursor-pointer shrink-0"
                  >
                    Vincular Docentes
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Feedback Temporário */}
        {feedback && (
          <div
            className={`px-5 py-2 text-xs font-semibold flex items-center justify-between border-b ${
              feedback.tipo === 'sucesso'
                ? 'bg-emerald-50 text-emerald-900 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-800'
                : 'bg-rose-50 text-rose-900 border-rose-200 dark:bg-rose-950/40 dark:text-rose-200 dark:border-rose-800'
            }`}
          >
            <div className="flex items-center gap-2">
              {feedback.tipo === 'sucesso' ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0" />
              )}
              <span>{feedback.texto}</span>
            </div>
            <button onClick={() => setFeedback(null)} className="p-0.5 hover:opacity-75">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Conteúdo com Scroll */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Formulário Rápido de Inserção de Aula */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/60 shadow-2xs">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Plus className="h-4 w-4 text-school-blue-600 dark:text-school-gold-400" />
                Lançar Aula na Grade Horária
              </h4>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Selecione o dia, o docente e a quantidade
              </span>
            </div>

            <form onSubmit={handleAdicionarAula} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
              {/* Dia da Semana */}
              <div className="sm:col-span-3">
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Dia da Semana *
                </label>
                <select
                  value={diaSelecionado}
                  onChange={(e) => setDiaSelecionado(e.target.value as any)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 focus:border-school-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="Segunda">Segunda-feira</option>
                  <option value="Terça">Terça-feira</option>
                  <option value="Quarta">Quarta-feira</option>
                  <option value="Quinta">Quinta-feira</option>
                  <option value="Sexta">Sexta-feira</option>
                </select>
              </div>

              {/* Docente */}
              <div className="sm:col-span-5">
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Docente da Turma *
                </label>
                <select
                  required
                  value={docenteSelecionado}
                  onChange={(e) => setDocenteSelecionado(e.target.value)}
                  disabled={listaDocentesDisponiveis.length === 0}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-school-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <option value="">
                    {listaDocentesDisponiveis.length === 0
                      ? 'Nenhum docente disponível'
                      : 'Selecione o docente da turma...'}
                  </option>
                  {listaDocentesDisponiveis.map((p) => (
                    <option key={p.id} value={p.nome_completo}>
                      {p.nome_completo} {p.disciplinas?.length ? `(${p.disciplinas.join(', ')})` : ''}
                    </option>
                  ))}
                </select>
                {docentesTurma.length === 0 && (
                  <div className="mt-1 flex items-center justify-between text-[11px] text-amber-600 dark:text-amber-400">
                    <span>Docentes gerais listados (sem regência vinculada).</span>
                    {onAbrirEditarTurma && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onAbrirEditarTurma(turma);
                        }}
                        className="font-bold underline hover:text-amber-800 dark:hover:text-amber-300 ml-1 cursor-pointer"
                      >
                        Vincular na Turma
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Quantidade de Aulas */}
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Aulas no Dia *
                </label>
                <div className="space-y-1.5">
                  <input
                    type="number"
                    required
                    min={1}
                    max={8}
                    step={1}
                    disabled={listaDocentesDisponiveis.length === 0}
                    value={quantidadeAulas}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      setQuantidadeAulas(isNaN(val) ? 3 : Math.max(1, Math.min(8, val)));
                    }}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-center font-bold text-slate-900 focus:border-school-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                  <div className="flex items-center justify-center gap-1">
                    {[3, 4, 5, 6].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setQuantidadeAulas(num)}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors ${
                          quantidadeAulas === num
                            ? 'bg-school-blue-800 text-white dark:bg-school-gold-500 dark:text-slate-900'
                            : 'bg-slate-200/70 text-slate-700 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Botão Adicionar */}
              <div className="sm:col-span-2">
                <button
                  type="submit"
                  disabled={!docenteSelecionado.trim() || listaDocentesDisponiveis.length === 0}
                  className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-school-blue-800 px-3 py-2 text-xs font-bold text-white shadow-md hover:bg-school-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all dark:bg-school-blue-600 h-9"
                >
                  <Plus className="h-4 w-4" />
                  <span>Adicionar</span>
                </button>
              </div>
            </form>
          </div>

          {/* Grade Semanal Interativa (5 Colunas) */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-school-blue-600 dark:text-school-gold-400" />
                Quadro Semanal de Horários
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Clique no <strong className="text-school-blue-700 dark:text-school-gold-400 font-extrabold">+</strong> de cada dia para adicionar no mínimo 3 aulas
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              {DIAS_SEMANA.map((dia) => {
                const aulasDoDia = gradeLocal.filter((h) => h.dia_semana === dia);
                const totalAulasDia = aulasDoDia.reduce(
                  (acc, h) => acc + (Number(h.quantidade_aulas) || 1),
                  0
                );
                const isSelectedDia = diaSelecionado === dia;

                return (
                  <div
                    key={dia}
                    className={`flex flex-col rounded-2xl border transition-all ${
                      isSelectedDia
                        ? 'border-school-blue-300 bg-school-blue-50/30 dark:border-school-blue-900/60 dark:bg-school-blue-950/20'
                        : 'border-slate-200/80 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-900/40'
                    } p-3`}
                  >
                    {/* Cabeçalho do Dia */}
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2 dark:border-slate-700/80">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-xs font-black uppercase tracking-wider text-school-blue-900 dark:text-school-gold-400 truncate">
                          {dia}
                        </span>
                        {totalAulasDia > 0 && (
                          <span className="rounded-full bg-school-blue-100 px-1.5 py-0.2 text-[10px] font-bold text-school-blue-800 dark:bg-school-blue-950 dark:text-school-blue-300 shrink-0">
                            {totalAulasDia} {totalAulasDia === 1 ? 'aula' : 'aulas'}
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => abrirModalDia(dia)}
                        className={`rounded-lg p-1 transition-colors ${
                          isSelectedDia
                            ? 'bg-school-blue-600 text-white dark:bg-school-gold-500 dark:text-slate-900'
                            : 'text-slate-400 hover:bg-white hover:text-school-blue-600 dark:hover:bg-slate-800 dark:hover:text-school-gold-400'
                        }`}
                        title={`Adicionar no mínimo 3 aulas na ${dia}`}
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Aulas do Dia */}
                    <div className="mt-2.5 flex-1 space-y-2 flex flex-col justify-between">
                      <div className="space-y-2">
                        {aulasDoDia.length === 0 ? (
                          <div 
                            onClick={() => abrirModalDia(dia)}
                            className="py-5 text-center cursor-pointer rounded-xl border border-dashed border-slate-200 dark:border-slate-800 hover:bg-white/60 dark:hover:bg-slate-800/40 transition-colors group"
                            title={`Clique para adicionar no mínimo 3 aulas na ${dia}`}
                          >
                            <p className="text-[11px] text-slate-400 italic">
                              Sem aulas
                            </p>
                            <span className="text-[10px] font-bold text-school-blue-600 dark:text-school-gold-400 group-hover:underline flex items-center justify-center gap-1 mt-1">
                              <Plus className="h-3 w-3" />
                              Adicionar (mín. 3)
                            </span>
                          </div>
                        ) : (
                          aulasDoDia.map((aula) => {
                            const qtd = Number(aula.quantidade_aulas) || 1;
                            return (
                              <div
                                key={aula.id}
                                className="group rounded-xl border border-slate-200 bg-white p-2.5 text-xs shadow-2xs hover:border-school-blue-300 hover:shadow-xs transition-all dark:border-slate-700/80 dark:bg-slate-800"
                              >
                                <div className="flex items-start justify-between gap-1.5">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <div className="h-6 w-6 rounded-full bg-school-blue-600/10 text-school-blue-700 dark:text-school-blue-300 flex items-center justify-center font-bold text-[11px] shrink-0">
                                      {aula.professor_nome.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                      <h5
                                        className="font-bold text-slate-900 dark:text-white truncate text-[11px]"
                                        title={aula.professor_nome}
                                      >
                                        {aula.professor_nome}
                                      </h5>
                                    </div>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => handleRemoverAula(aula.id)}
                                    className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 p-1 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors shrink-0"
                                    title={`Remover aula de ${aula.professor_nome}`}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>

                                {/* Contador de Aulas com Incremento/Decremento Rápido */}
                                <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
                                  <span className="inline-flex items-center rounded-md bg-school-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-school-blue-700 dark:bg-school-blue-950 dark:text-school-blue-300 border border-school-blue-200/60 dark:border-school-blue-800/60">
                                    {qtd} {qtd === 1 ? 'aula' : 'aulas'}
                                  </span>

                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => handleAlterarQuantidade(aula.id, -1)}
                                      className="h-5 w-5 rounded-md border border-slate-200 bg-slate-50 flex items-center justify-center text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
                                      title="Diminuir 1 aula"
                                    >
                                      <Minus className="h-2.5 w-2.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleAlterarQuantidade(aula.id, 1)}
                                      className="h-5 w-5 rounded-md border border-slate-200 bg-slate-50 flex items-center justify-center text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
                                      title="Aumentar 1 aula"
                                    >
                                      <Plus className="h-2.5 w-2.5" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>

                      {aulasDoDia.length > 0 && (
                        <button
                          type="button"
                          onClick={() => abrirModalDia(dia)}
                          className="w-full mt-2 py-1 px-2 rounded-xl border border-dashed border-slate-200 dark:border-slate-700/80 hover:border-school-blue-400 dark:hover:border-school-blue-500 bg-white/40 dark:bg-slate-800/40 text-slate-500 hover:text-school-blue-700 dark:text-slate-400 dark:hover:text-school-gold-400 text-[10px] font-bold flex items-center justify-center gap-1 transition-all"
                          title={`Adicionar mais aulas na ${dia}`}
                        >
                          <Plus className="h-3 w-3" />
                          <span>+ aula na {dia}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Rodapé do Modal Principal */}
        <div className="flex items-center justify-between border-t border-slate-100 p-4 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/80 shrink-0">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {gradeLocal.length > 0 ? (
              <span>As alterações na grade são salvas e sincronizadas automaticamente.</span>
            ) : (
              <span>Nenhuma aula cadastrada nesta grade semanal.</span>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-school-blue-800 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-school-blue-700 transition-all dark:bg-school-blue-600"
          >
            Concluir
          </button>
        </div>
      </div>

      {/* MODAL ESPECÍFICO DO DIA: MÍNIMO 3 AULAS ESCOLHENDO APENAS PROFESSOR E QUANTIDADE */}
      {modalDiaAberto && (
        <div 
          className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setModalDiaAberto(null)}
        >
          <div 
            className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 animate-in zoom-in-95 duration-200 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabeçalho */}
            <div className="flex items-center justify-between border-b border-slate-100 p-5 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-school-blue-100 text-school-blue-800 dark:bg-school-blue-950 dark:text-school-blue-300 shadow-2xs">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-base font-black text-slate-900 dark:text-white">
                      Adicionar Aulas: {modalDiaAberto}-feira
                    </h4>
                    <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-black uppercase text-amber-800 dark:bg-amber-950 dark:text-school-gold-400 border border-amber-200 dark:border-amber-900/60">
                      Mínimo 3 aulas
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Escolha apenas o professor e a quantidade de aulas dele por dia
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalDiaAberto(null)}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
                title="Fechar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Conteúdo dos Professores e Quantidades */}
            <div className="p-5 space-y-4 max-h-[65vh] overflow-y-auto">
              {itensAulaDia.map((item, index) => (
                <div 
                  key={item.id}
                  className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-800/40 space-y-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <GraduationCap className="h-4 w-4 text-school-blue-600 dark:text-school-gold-400" />
                      <span>{itensAulaDia.length > 1 ? `Professor ${index + 1}` : 'Professor'}</span>
                    </label>
                    {itensAulaDia.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoverLinhaProfessorDia(item.id)}
                        className="text-xs text-rose-500 hover:text-rose-700 dark:hover:text-rose-400 flex items-center gap-1 font-semibold"
                        title="Remover este professor"
                      >
                        <Trash2 className="h-3 w-3" />
                        <span>Remover</span>
                      </button>
                    )}
                  </div>

                  {/* Seleção do Professor */}
                  <div>
                    <select
                      value={item.professor_nome}
                      onChange={(e) => handleAtualizarLinhaProfessorDia(item.id, 'professor_nome', e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 focus:border-school-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    >
                      <option value="">Selecione o professor...</option>
                      {listaDocentesDisponiveis.map((p) => (
                        <option key={p.id} value={p.nome_completo}>
                          {p.nome_completo} {p.disciplinas?.length ? `(${p.disciplinas.join(', ')})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Quantidade de Aulas dele por dia */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                        Quantidade de aulas dele na {modalDiaAberto}:
                      </span>
                      <span className="text-xs font-black text-school-blue-900 dark:text-school-gold-400">
                        {item.quantidade_aulas} {item.quantidade_aulas === 1 ? 'aula' : 'aulas'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Stepper */}
                      <div className="flex items-center border border-slate-200 rounded-xl bg-white dark:border-slate-700 dark:bg-slate-800 overflow-hidden shadow-2xs">
                        <button
                          type="button"
                          onClick={() =>
                            handleAtualizarLinhaProfessorDia(
                              item.id,
                              'quantidade_aulas',
                              Math.max(1, item.quantidade_aulas - 1)
                            )
                          }
                          className="p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
                          title="Diminuir 1 aula"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-10 text-center text-xs font-black text-slate-900 dark:text-white">
                          {item.quantidade_aulas}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            handleAtualizarLinhaProfessorDia(
                              item.id,
                              'quantidade_aulas',
                              Math.min(8, item.quantidade_aulas + 1)
                            )
                          }
                          className="p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
                          title="Aumentar 1 aula"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {/* Botões de Seleção Rápida */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {[3, 4, 5, 6].map((num) => (
                          <button
                            key={num}
                            type="button"
                            onClick={() => handleAtualizarLinhaProfessorDia(item.id, 'quantidade_aulas', num)}
                            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                              item.quantidade_aulas === num
                                ? 'bg-school-blue-800 text-white shadow-xs dark:bg-school-gold-500 dark:text-slate-950 font-black'
                                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200'
                            }`}
                          >
                            {num} aulas
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Botão para Adicionar Outro Professor neste dia */}
              <button
                type="button"
                onClick={handleAdicionarLinhaProfessorDia}
                className="w-full py-2 px-3 rounded-xl border border-dashed border-slate-300 hover:border-school-blue-400 bg-white/50 hover:bg-school-blue-50/50 text-slate-700 hover:text-school-blue-900 dark:border-slate-700 dark:bg-slate-800/40 dark:hover:border-school-blue-600 dark:text-slate-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>+ Adicionar outro professor na {modalDiaAberto}</span>
              </button>

              {/* Indicador de Validação do Mínimo de 3 Aulas */}
              <div
                className={`p-3 rounded-2xl border text-xs flex items-center justify-between gap-3 ${
                  totalAulasNoModalDia >= 3
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-800/70 dark:text-emerald-200'
                    : 'bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-950/40 dark:border-amber-800/70 dark:text-amber-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  {totalAulasNoModalDia >= 3 ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  )}
                  <div>
                    <span className="font-black">
                      Total selecionado: {totalAulasNoModalDia} {totalAulasNoModalDia === 1 ? 'aula' : 'aulas'}
                    </span>
                    <span className="ml-1.5 opacity-90">
                      {totalAulasNoModalDia >= 3
                        ? '(Requisito de no mínimo 3 aulas atendido ✓)'
                        : `(Mínimo de 3 aulas por dia exigido — faltam ${3 - totalAulasNoModalDia})`}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Rodapé do Modal do Dia */}
            <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 p-4 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-900 shrink-0">
              <button
                type="button"
                onClick={() => setModalDiaAberto(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={totalAulasNoModalDia < 3 || itensAulaDia.some((it) => !it.professor_nome.trim())}
                onClick={handleSalvarAulasModalDia}
                className="inline-flex items-center gap-1.5 rounded-xl bg-school-blue-800 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-school-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all dark:bg-school-blue-600"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>Salvar {totalAulasNoModalDia} Aulas na {modalDiaAberto}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
