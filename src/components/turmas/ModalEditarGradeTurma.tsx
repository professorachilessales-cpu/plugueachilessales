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
  const [quantidadeAulas, setQuantidadeAulas] = useState<number>(1);
  const [feedback, setFeedback] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);

  // Sincroniza estado quando a turma muda ou modal abre
  useEffect(() => {
    if (turma) {
      setGradeLocal(turma.grade_horaria || []);
      setDiaSelecionado('Segunda');
      setDocenteSelecionado('');
      setQuantidadeAulas(1);
      setFeedback(null);
    }
  }, [turma, isOpen]);

  // Professores aptos para regência (ativos, NÃO administrativos e NÃO apoio)
  const { docentesTurma, outrosDocentes } = useMemo(() => {
    if (!turma) return { docentesTurma: [], outrosDocentes: [] };

    const rawProfsTurmaIds = turma.professores_ids && turma.professores_ids.length > 0
      ? turma.professores_ids
      : (turma.professor_regente_id ? [turma.professor_regente_id] : []);

    const regenteNome = turma.professor_regente_nome?.trim().toLowerCase();

    // Filtra docentes gerais ativos e aptos
    const todosAptos = professores.filter(
      (p) => p.ativo !== false && !isProfessorAdministrativo(p) && !isProfessorApoio(p)
    );

    const daTurma: Professor[] = [];
    const outros: Professor[] = [];

    todosAptos.forEach((p) => {
      const vinculado = rawProfsTurmaIds.includes(p.id) || (regenteNome && p.nome_completo?.trim().toLowerCase() === regenteNome);
      if (vinculado) {
        daTurma.push(p);
      } else {
        outros.push(p);
      }
    });

    daTurma.sort((a, b) => a.nome_completo.localeCompare(b.nome_completo));
    outros.sort((a, b) => a.nome_completo.localeCompare(b.nome_completo));

    return { docentesTurma: daTurma, outrosDocentes: outros };
  }, [turma, professores]);

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

  const handleAdicionarAula = (e: React.FormEvent) => {
    e.preventDefault();
    if (!docenteSelecionado.trim()) {
      mostrarFeedback('erro', 'Por favor, selecione um docente para a aula.');
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
    setQuantidadeAulas(1);
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
              <div className="flex items-center gap-1 text-[11px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md border border-amber-200/70 dark:border-amber-900/60">
                <Info className="h-3 w-3 shrink-0" />
                <span>Nenhum docente vinculado diretamente na regência desta turma.</span>
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
                  Docente *
                </label>
                <select
                  required
                  value={docenteSelecionado}
                  onChange={(e) => setDocenteSelecionado(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-school-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="">Selecione o docente...</option>
                  {docentesTurma.length > 0 && (
                    <optgroup label="Docentes da Turma (Regência)">
                      {docentesTurma.map((p) => (
                        <option key={p.id} value={p.nome_completo}>
                          ★ {p.nome_completo} {p.disciplinas?.length ? `(${p.disciplinas.join(', ')})` : ''}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {outrosDocentes.length > 0 && (
                    <optgroup label="Outros Docentes Aptos">
                      {outrosDocentes.map((p) => (
                        <option key={p.id} value={p.nome_completo}>
                          {p.nome_completo} {p.disciplinas?.length ? `(${p.disciplinas.join(', ')})` : ''}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>

              {/* Quantidade de Aulas */}
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Aulas no Dia *
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  max={8}
                  step={1}
                  value={quantidadeAulas}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    setQuantidadeAulas(isNaN(val) ? 1 : Math.max(1, Math.min(8, val)));
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-center font-bold text-slate-900 focus:border-school-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              {/* Botão Adicionar */}
              <div className="sm:col-span-2">
                <button
                  type="submit"
                  disabled={!docenteSelecionado.trim()}
                  className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-school-blue-800 px-3 py-2 text-xs font-bold text-white shadow-md hover:bg-school-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all dark:bg-school-blue-600"
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
                Use os botões <strong className="text-slate-700 dark:text-slate-300">+</strong> e <strong className="text-slate-700 dark:text-slate-300">-</strong> para ajuste rápido
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
                        onClick={() => {
                          setDiaSelecionado(dia);
                        }}
                        className={`rounded-lg p-1 transition-colors ${
                          isSelectedDia
                            ? 'bg-school-blue-600 text-white dark:bg-school-gold-500 dark:text-slate-900'
                            : 'text-slate-400 hover:bg-white hover:text-school-blue-600 dark:hover:bg-slate-800 dark:hover:text-school-gold-400'
                        }`}
                        title={`Lançar aula na ${dia}`}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Aulas do Dia */}
                    <div className="mt-2.5 flex-1 space-y-2">
                      {aulasDoDia.length === 0 ? (
                        <div 
                          onClick={() => setDiaSelecionado(dia)}
                          className="py-5 text-center cursor-pointer rounded-xl border border-dashed border-slate-200 dark:border-slate-800 hover:bg-white/60 dark:hover:bg-slate-800/40 transition-colors"
                          title={`Clique para selecionar ${dia}`}
                        >
                          <p className="text-[11px] text-slate-400 italic">
                            Sem aulas
                          </p>
                          <span className="text-[10px] font-bold text-school-blue-600 dark:text-school-gold-400 hover:underline">
                            + adicionar
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
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Rodapé do Modal */}
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
    </div>
  );
}
