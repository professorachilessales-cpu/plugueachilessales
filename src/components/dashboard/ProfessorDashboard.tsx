'use client';

import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { 
  AlertTriangle, 
  Clock, 
  FileText, 
  Calendar, 
  Cake, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  Sparkles, 
  User, 
  BookOpen, 
  Plus, 
  ExternalLink, 
  Trash2, 
  ShieldAlert,
  GraduationCap,
  HeartHandshake
} from 'lucide-react';
import { ModalRedacaoParecerIA } from '@/components/relatorios/ModalRedacaoParecerIA';
import { ModalRegistrarReposicao } from '@/components/professores/ModalRegistrarReposicao';
import { ModalAnexarAtestado } from '@/components/professores/ModalAnexarAtestado';
import { RelatorioProfessor, SolicitacaoRelatorio, Estudante, Turma, ReposicaoAula, AtestadoProfessor } from '@/lib/types';
import { isProfessorAdministrativo } from '@/lib/pareceres-ia';

export function ProfessorDashboard() {
  const { 
    currentUser, 
    authenticatedUser,
    users,
    professores, 
    turmas, 
    estudantes, 
    eventos,
    categoriasEvento,
    solicitacoesRelatorio, 
    relatoriosProfessores, 
    reposicoesAulas, 
    atestadosProfessor,
    deleteAtestadoProfessor 
  } = useApp();

  const usuarioLogado = authenticatedUser || currentUser;

  // Localiza o perfil de professor conectado
  const professorAtual = useMemo(() => {
    const cpfLimpoUser = usuarioLogado?.cpf?.replace(/\D/g, '');
    const encontrado = professores.find(p => {
      if (!p) return false;
      const cpfLimpoProf = p.cpf?.replace(/\D/g, '');
      if (cpfLimpoUser && cpfLimpoProf && cpfLimpoUser === cpfLimpoProf) return true;
      if (usuarioLogado?.id && (p.id === usuarioLogado.id || (p as any).user_id === usuarioLogado.id || p.profile_id === usuarioLogado.id)) return true;
      if (usuarioLogado?.email && p.email?.toLowerCase() === usuarioLogado.email.toLowerCase()) return true;
      if (usuarioLogado?.name && p.nome_completo?.toLowerCase() === usuarioLogado.name.toLowerCase()) return true;
      return false;
    });

    if (encontrado) return encontrado;
    if (professores.length > 0) return professores[0];

    // Fallback gracioso com perfil temporário para evitar crashes durante carregamento inicial
    if (usuarioLogado) {
      return {
        id: usuarioLogado.id || 'prof-temp',
        nome_completo: usuarioLogado.name || 'Professor',
        matricula: 'DOC-2026',
        formacao: 'Docência',
        disciplinas: [],
        telefone: '',
        email: usuarioLogado.email || '',
        ativo: true,
        eh_apoio: false,
        eh_administrativo: false,
        turmas_atribuidas_ids: [],
        created_at: new Date().toISOString(),
      } as Professor;
    }

    return null;
  }, [professores, usuarioLogado]);

  // Identifica se o perfil conectado é de Funcionário Administrativo
  const ehAdministrativo = useMemo(() => {
    if (!professorAtual) return false;
    return isProfessorAdministrativo(professorAtual, users);
  }, [professorAtual, users]);

  // Turmas atribuídas ao professor conectado
  const turmasAtribuidas = useMemo(() => {
    if (!professorAtual?.id || ehAdministrativo) return [];
    const profId = professorAtual.id;
    const profName = professorAtual.nome_completo?.trim().toLowerCase();
    const turmasAtribuidasIds = professorAtual.turmas_atribuidas_ids || [];

    return turmas.filter(t => 
      t && (
        (t.professores_ids && t.professores_ids.includes(profId)) ||
        t.professor_regente_id === profId ||
        (t.professor_regente_nome && profName && t.professor_regente_nome.trim().toLowerCase() === profName) ||
        (t.id && turmasAtribuidasIds.includes(t.id)) ||
        (t.nome && turmasAtribuidasIds.includes(t.nome)) ||
        (t.equipe_apoio_ids && t.equipe_apoio_ids.includes(profId)) ||
        (t.grade_horaria && Array.isArray(t.grade_horaria) && t.grade_horaria.some(h => h.professor_nome && profName && h.professor_nome.trim().toLowerCase() === profName))
      )
    );
  }, [turmas, professorAtual, ehAdministrativo]);

  const turmasIds = useMemo(() => turmasAtribuidas.map(t => t.id), [turmasAtribuidas]);

  // 1. SOLICITAÇÕES ATIVAS PARA O PROFESSOR (Bloco de Alertas Críticos)
  // Professores administrativos não recebem notificações e não elaboram relatórios
  const relatoriosPendentesDoProfessor = useMemo(() => {
    if (!professorAtual?.id || ehAdministrativo) return [];

    const itens: Array<{
      relatorio: RelatorioProfessor;
      solicitacao: SolicitacaoRelatorio;
      aluno: Estudante;
      turma?: Turma;
    }> = [];

    relatoriosProfessores
      .filter(r => r && r.professor_id === professorAtual.id && r.status === 'pendente')
      .forEach(r => {
        const sol = solicitacoesRelatorio.find(s => s && s.id === r.solicitacao_id);
        const aluno = estudantes.find(e => e && e.id === sol?.aluno_id);
        const turma = turmas.find(t => t && t.id === aluno?.turma_id);
        if (sol && aluno && sol.status !== 'concluido' && r.status !== 'nao_entregue') {
          itens.push({
            relatorio: r,
            solicitacao: sol,
            aluno,
            turma,
          });
        }
      });

    return itens;
  }, [relatoriosProfessores, solicitacoesRelatorio, estudantes, turmas, professorAtual, ehAdministrativo]);

  // 2. REPOSIÇÕES E AULAS DEVIDAS (Regra dos 30 dias)
  const reposicoesDoProfessor = useMemo(() => {
    if (!professorAtual?.id) return [];
    const hoje = new Date();
    return reposicoesAulas
      .filter(r => r && r.professor_id === professorAtual.id)
      .map(r => {
        const limite = new Date(r.data_limite_reposicao + 'T23:59:59');
        const diffMs = limite.getTime() - hoje.getTime();
        const diasRestantes = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        
        let statusReal = r.status;
        if (statusReal === 'Pendente' && diasRestantes < 0) {
          statusReal = 'Vencida';
        }

        return {
          ...r,
          statusCalculado: statusReal,
          diasRestantes,
        };
      })
      .sort((a, b) => a.diasRestantes - b.diasRestantes);
  }, [reposicoesAulas, professorAtual]);

  // 3. ATESTADOS DO PROFESSOR
  const atestadosDoProfessor = useMemo(() => {
    if (!professorAtual?.id) return [];
    return atestadosProfessor.filter(a => a && a.professor_id === professorAtual.id);
  }, [atestadosProfessor, professorAtual]);

  // Helper para formatação segura de data sem problemas de fuso horário
  const formatarDataEvento = (dataStr: string): string => {
    if (!dataStr) return '—';
    try {
      const partes = dataStr.split('T')[0].split('-').map(Number);
      if (partes.length === 3) {
        const d = new Date(partes[0], partes[1] - 1, partes[2]);
        return new Intl.DateTimeFormat('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        }).format(d);
      }
      const d = new Date(dataStr);
      if (isNaN(d.getTime())) return '—';
      return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).format(d);
    } catch {
      return '—';
    }
  };

  // 4. PRÓXIMOS EVENTOS ESCOLARES (da data atual em diante, apenas categorias visíveis para docentes)
  const proximos10Eventos = useMemo(() => {
    const agora = new Date();
    const hojeStr = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}-${String(agora.getDate()).padStart(2, '0')}`;

    return [...eventos]
      .filter((ev) => {
        const cat = categoriasEvento.find(
          (c) => c.id === ev.categoria || c.nome.toLowerCase() === (ev.categoria || '').toLowerCase()
        );
        if (cat && cat.visivel_docentes === false) return false;

        const fim = ev.data_fim || ev.data_inicio;
        if (!fim) return false;
        const fimStr = fim.includes('T') ? fim.split('T')[0] : fim;
        return fimStr >= hojeStr;
      })
      .sort((a, b) => {
        const timeA = new Date(a.data_inicio?.includes('T') ? a.data_inicio : (a.data_inicio || '') + 'T00:00:00').getTime() || 0;
        const timeB = new Date(b.data_inicio?.includes('T') ? b.data_inicio : (b.data_inicio || '') + 'T00:00:00').getTime() || 0;
        return timeA - timeB;
      })
      .slice(0, 10);
  }, [eventos, categoriasEvento]);

  // 5. ANIVERSARIANTES DO MÊS (Estudantes das turmas do professor e escola)
  const mesAtual = new Date().getMonth() + 1;
  const aniversariantesDoMes = useMemo(() => {
    const list: Array<{
      id: string;
      nome: string;
      turmaNome: string;
      dia: number;
      mes: number;
      idade?: number;
      foto?: string;
    }> = [];

    const alunosAlvo = turmasIds.length > 0 
      ? estudantes.filter(e => e.turma_id && turmasIds.includes(e.turma_id))
      : estudantes;

    const baseAlunos = alunosAlvo.length > 0 ? alunosAlvo : estudantes;

    baseAlunos.forEach(est => {
      if (!est.data_nascimento) return;
      const parts = est.data_nascimento.split('-');
      if (parts.length === 3) {
        const mes = parseInt(parts[1], 10);
        const dia = parseInt(parts[2], 10);
        const ano = parseInt(parts[0], 10);
        if (mes === mesAtual) {
          const idade = new Date().getFullYear() - ano;
          list.push({
            id: est.id,
            nome: est.nome_completo,
            turmaNome: est.turma_nome || 'Estudante',
            dia,
            mes,
            idade,
            foto: est.foto_url
          });
        }
      }
    });

    return list.sort((a, b) => a.dia - b.dia);
  }, [estudantes, turmasIds, mesAtual]);

  // Estados dos Modais
  const [modalRelatorioAberto, setModalRelatorioAberto] = useState(false);
  const [itemRelatorioSelecionado, setItemRelatorioSelecionado] = useState<any>(null);

  const [modalReposicaoAberto, setModalReposicaoAberto] = useState(false);
  const [reposicaoSelecionada, setReposicaoSelecionada] = useState<ReposicaoAula | null>(null);

  if (!professorAtual) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] p-8 space-y-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-school-blue-600 border-t-transparent" />
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
          Carregando painel do professor...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in-0 duration-300">
      
      {/* BANNER DE BOAS-VINDAS DOCENTE */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-school-blue-900 via-school-blue-800 to-indigo-900 p-6 sm:p-8 text-white shadow-xl">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-school-gold-400/20 px-3 py-1 text-xs font-bold text-school-gold-300 border border-school-gold-400/30">
                Portal do Professor
              </span>
              <span className="text-xs text-blue-200">
                Matrícula: {professorAtual.matricula}
              </span>
            </div>
            <h1 className="mt-2 text-2xl sm:text-3xl font-black tracking-tight text-white">
              Olá, {professorAtual.nome_completo}!
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-blue-100 max-w-xl">
              Disciplinas: <strong className="text-school-gold-300">{professorAtual.disciplinas?.join(', ') || 'Docência Geral'}</strong> • {turmasAtribuidas.length} turma(s) sob sua regência pedagógica.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setModalAtestadoAberto(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 backdrop-blur-md px-4 py-2.5 text-xs font-bold text-white border border-white/20 hover:bg-white/20 transition-all shadow-sm"
            >
              <Plus className="h-4 w-4 text-school-gold-300" />
              <span>Anexar Atestado</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. BLOCO DE ALERTAS CRÍTICOS (BANNER CHAMATIVO EM TONS DE VERMELHO/ALERTA) */}
      {/* Exibido estritamente para professores docentes (usuários administrativos não recebem relatórios) */}
      {/* ========================================================================= */}
      {!ehAdministrativo && (
        <section className="rounded-3xl border-2 border-rose-300 bg-gradient-to-br from-rose-50 via-rose-100/60 to-amber-50/50 p-6 dark:border-rose-900/80 dark:bg-gradient-to-br dark:from-rose-950/60 dark:via-rose-950/40 dark:to-slate-900 shadow-xl shadow-rose-900/10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-rose-200/80 pb-4 dark:border-rose-900/60">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-600 text-white shadow-lg shadow-rose-600/30 animate-pulse">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-black tracking-tight text-rose-950 dark:text-rose-100 uppercase">
                    Alertas Críticos: Solicitações de Relatório Ativas
                  </h2>
                  <span className="rounded-full bg-rose-600 px-2.5 py-0.5 text-xs font-black text-white">
                    {relatoriosPendentesDoProfessor.length} Pendente(s)
                  </span>
                </div>
                <p className="text-xs text-rose-800 dark:text-rose-300 mt-0.5">
                  A coordenação aguarda seus pareceres pedagógicos para consolidação dos relatórios dos alunos.
                </p>
              </div>
            </div>
          </div>

          {relatoriosPendentesDoProfessor.length === 0 ? (
            <div className="py-8 text-center">
              <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600 dark:text-emerald-400" />
              <h3 className="mt-2 text-sm font-bold text-slate-800 dark:text-white">
                Todos os seus relatórios pedagógicos estão em dia!
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Não há solicitações pendentes de preenchimento para suas turmas atribuídas no momento.
              </p>
            </div>
          ) : (
            <div className="mt-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {relatoriosPendentesDoProfessor.map(({ relatorio, solicitacao, aluno, turma }) => (
                <div
                  key={relatorio.id}
                  className="group relative flex flex-col justify-between rounded-2xl border border-rose-200 bg-white p-5 shadow-md transition-all hover:shadow-xl hover:border-rose-400 dark:border-rose-900/80 dark:bg-slate-900"
                >
                  <div>
                    <div className="flex items-start gap-3">
                      <div className="relative h-12 w-12 rounded-xl overflow-hidden bg-rose-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0 border border-rose-200 dark:border-rose-900">
                        {aluno?.foto_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={aluno.foto_url}
                            alt={aluno?.nome_completo || 'Estudante'}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <User className="h-6 w-6 text-rose-700 dark:text-rose-400" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <span className="inline-block rounded-md bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800 dark:bg-rose-950 dark:text-rose-300 uppercase tracking-wide">
                          {turma?.nome || 'Turma não atribuída'}
                        </span>
                        <h3 className="mt-1 text-sm font-bold text-slate-900 dark:text-white truncate">
                          {aluno?.nome_completo}
                        </h3>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                          <Calendar className="h-3 w-3" />
                          <span>Solicitado em: {formatarDataEvento(solicitacao?.created_at || solicitacao?.data_solicitacao)}</span>
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 rounded-xl bg-amber-50 p-2.5 text-[11px] text-amber-900 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200/80 dark:border-amber-900/60 flex items-center gap-2">
                      <Sparkles className="h-3.5 w-3.5 text-school-gold-600 flex-shrink-0" />
                      <span>Seu rascunho será polido automaticamente por IA antes do envio.</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <button
                      onClick={() => {
                        setItemRelatorioSelecionado({ relatorio, solicitacao, estudante: aluno, turma });
                        setModalRelatorioAberto(true);
                      }}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-rose-600/20 hover:bg-rose-700 transition-all cursor-pointer"
                    >
                      <FileText className="h-4 w-4" />
                      <span>Elaborar Relatório</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ========================================================================= */}
      {/* 8.1 REGRA DOS 30 DIAS: DÉBITO E REPOSIÇÃO DE AULAS */}
      {/* ========================================================================= */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-school-blue-600 dark:text-school-gold-400" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Controle de Aulas a Repor (Tolerância de 30 Dias)
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Conforme as diretrizes pedagógicas, faltas justificadas ou de licença devem ser repostas no prazo máximo de 30 dias.
            </p>
          </div>
        </div>

        {reposicoesDoProfessor.length === 0 ? (
          <p className="py-6 text-center text-xs text-slate-400">
            Você não possui débitos de aulas pendentes de reposição.
          </p>
        ) : (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {reposicoesDoProfessor.map((rep) => {
              const ehVencido = rep.statusCalculado === 'Vencida';
              const ehProximo = !ehVencido && rep.diasRestantes <= 5 && rep.statusCalculado === 'Pendente';
              const ehNormal = !ehVencido && rep.diasRestantes > 5 && rep.statusCalculado === 'Pendente';
              const ehReposta = rep.statusCalculado === 'Reposta';

              return (
                <div
                  key={rep.id}
                  className={`rounded-2xl border p-4.5 flex flex-col justify-between transition-all ${
                    ehVencido
                      ? 'border-rose-300 bg-rose-50/60 dark:border-rose-900 dark:bg-rose-950/30'
                      : ehProximo
                      ? 'border-amber-300 bg-amber-50/60 dark:border-amber-900 dark:bg-amber-950/30'
                      : ehReposta
                      ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/20'
                      : 'border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-800/40'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        {rep.qtd_aulas_faltantes} aula(s) a repor
                      </span>

                      {/* Badge / Cronômetro */}
                      {ehVencido && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-600 px-2.5 py-0.5 text-[10px] font-bold text-white shadow-sm">
                          <AlertTriangle className="h-3 w-3" />
                          Vencido ({Math.abs(rep.diasRestantes)}d atraso)
                        </span>
                      )}
                      {ehProximo && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500 px-2.5 py-0.5 text-[10px] font-bold text-white shadow-sm">
                          <Clock className="h-3 w-3" />
                          Prazo Curto ({rep.diasRestantes}d restantes)
                        </span>
                      )}
                      {ehNormal && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-0.5 text-[10px] font-bold text-white shadow-sm">
                          <CheckCircle2 className="h-3 w-3" />
                          No Prazo ({rep.diasRestantes}d restantes)
                        </span>
                      )}
                      {ehReposta && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-school-blue-700 px-2.5 py-0.5 text-[10px] font-bold text-white shadow-sm">
                          <CheckCircle2 className="h-3 w-3" />
                          Reposta / Homologada
                        </span>
                      )}
                    </div>

                    <div className="mt-2 text-xs text-slate-600 dark:text-slate-300 space-y-1">
                      <p>
                        Falta ocorrida em: <strong>{new Date(rep.data_falta + 'T00:00:00').toLocaleDateString('pt-BR')}</strong>
                      </p>
                      <p>
                        Data limite (30 dias): <strong>{new Date(rep.data_limite_reposicao + 'T00:00:00').toLocaleDateString('pt-BR')}</strong>
                      </p>
                      {rep.data_execucao_reposicao && (
                        <p className="text-[11px] text-blue-600 dark:text-blue-400">
                          Ministrada em: {new Date(rep.data_execucao_reposicao + 'T00:00:00').toLocaleDateString('pt-BR')} ({rep.horario_reposicao})
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800">
                    {rep.statusCalculado !== 'Reposta' ? (
                      <button
                        onClick={() => {
                          setReposicaoSelecionada(rep);
                          setModalReposicaoAberto(true);
                        }}
                        className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-school-blue-800 px-3 py-2 text-xs font-bold text-white shadow-sm hover:bg-school-blue-700 transition-colors"
                      >
                        <Calendar className="h-3.5 w-3.5" />
                        <span>Registrar Reposição</span>
                      </button>
                    ) : (
                      <div className="text-center text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 flex items-center justify-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Aguardando/Validado pela Direção</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ========================================================================= */}
      {/* 8. REPOSITÓRIO DE ATESTADOS DO PROFESSOR (GOOGLE DRIVE) */}
      {/* ========================================================================= */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Meus Atestados Médicos (Repositório Google Drive)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Diretório Drive: <code className="rounded bg-slate-100 px-1 py-0.5 dark:bg-slate-800 font-mono text-[11px]">PLUGUE/{professorAtual.nome_completo.toLowerCase().replace(/[^a-z0-9]/g, '_')}/</code>
            </p>
          </div>

          <button
            onClick={() => setModalAtestadoAberto(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-school-blue-800 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-school-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Novo Atestado</span>
          </button>
        </div>

        {atestadosDoProfessor.length === 0 ? (
          <p className="py-6 text-center text-xs text-slate-400">
            Nenhum atestado médico cadastrado até o momento.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-600 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300">
                <tr>
                  <th className="py-2.5 px-3">Documento</th>
                  <th className="py-2.5 px-3">Período de Afastamento</th>
                  <th className="py-2.5 px-3">Dias</th>
                  <th className="py-2.5 px-3">Motivo / CID</th>
                  <th className="py-2.5 px-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {atestadosDoProfessor.map((atest) => (
                  <tr key={atest.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-school-blue-600 dark:text-school-gold-400 flex-shrink-0" />
                        <span className="font-semibold text-slate-900 dark:text-white truncate max-w-[200px]">
                          {atest.nome_arquivo || 'Atestado Médico'}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-slate-700 dark:text-slate-300">
                      {new Date(atest.data_inicio + 'T00:00:00').toLocaleDateString('pt-BR')} até {new Date(atest.data_fim + 'T00:00:00').toLocaleDateString('pt-BR')}
                    </td>
                    <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">
                      {atest.dias_afastamento} dia(s)
                    </td>
                    <td className="py-3 px-3 text-slate-600 dark:text-slate-400">
                      {atest.motivo_cid || 'Não especificado'}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <a
                          href={atest.drive_file_id ? `https://drive.google.com/file/d/${atest.drive_file_id}/view` : '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-school-blue-600 dark:text-slate-400 dark:hover:bg-slate-800"
                          title="Visualizar no Google Drive"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                        {atest.permite_exclusao && (
                          <button
                            onClick={() => {
                              if (confirm('Deseja realmente excluir este atestado?')) {
                                deleteAtestadoProfessor(atest.id);
                              }
                            }}
                            className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/40"
                            title="Excluir atestado"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ========================================================================= */}
      {/* WIDGETS: ANIVERSARIANTES DO MÊS & PRÓXIMOS 10 EVENTOS */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* WIDGET ANIVERSARIANTES DO MÊS */}
        <div className="rounded-3xl border border-amber-200/80 bg-white p-6 shadow-sm dark:border-amber-900/30 dark:bg-slate-900 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-amber-100 pb-4 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Cake className="h-5 w-5 text-amber-500" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Aniversariantes do Mês
                </h3>
              </div>
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300/40">
                {aniversariantesDoMes.length} celebrações
              </span>
            </div>

            <div className="mt-4 space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
              {aniversariantesDoMes.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  Nenhum aniversariante cadastrado neste mês para suas turmas.
                </div>
              ) : (
                aniversariantesDoMes.map((aniv) => {
                  const hojeDia = new Date().getDate();
                  const ehHoje = aniv.dia === hojeDia;
                  return (
                    <div
                      key={aniv.id}
                      className={`flex items-center justify-between rounded-2xl border p-3 transition-colors ${
                        ehHoje 
                          ? 'border-amber-300 bg-amber-50/80 dark:border-amber-700/60 dark:bg-amber-950/30' 
                          : 'border-slate-100 bg-slate-50/70 hover:bg-slate-100/70 dark:border-slate-800 dark:bg-slate-800/40'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {aniv.foto ? (
                          <img
                            src={aniv.foto}
                            alt=""
                            className="h-10 w-10 rounded-xl object-cover ring-1 ring-slate-200 dark:ring-slate-700"
                          />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-xs font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300 flex-shrink-0">
                            {aniv.nome.charAt(0)}
                          </div>
                        )}
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {aniv.nome}
                          </h4>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            {aniv.turmaNome}
                          </p>
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0 pl-2">
                        {ehHoje ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500 text-white px-2 py-0.5 text-[10px] font-extrabold shadow-sm">
                            <Sparkles className="h-2.5 w-2.5" />
                            Hoje!
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                            Dia {String(aniv.dia).padStart(2, '0')}
                          </span>
                        )}
                        <span className="block text-[10px] text-slate-400">
                          {aniv.idade ? `${aniv.idade} anos` : ''}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* WIDGET PRÓXIMOS EVENTOS ESCOLARES */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-school-blue-600 dark:text-school-gold-400" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Próximos Eventos Escolares
                </h3>
              </div>
              <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-school-blue-800 dark:bg-blue-950 dark:text-blue-300">
                Calendário Letivo
              </span>
            </div>

            <div className="mt-4 space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
              {proximos10Eventos.length === 0 ? (
                <p className="py-6 text-center text-xs text-slate-400">
                  Nenhum evento registrado no momento.
                </p>
              ) : (
                proximos10Eventos.map((ev) => (
                  <div
                    key={ev.id}
                    className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/70 p-3 hover:bg-slate-100/70 dark:border-slate-800 dark:bg-slate-800/40 dark:hover:bg-slate-800/70 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="h-3 w-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: ev.cor || '#2563EB' }}
                      />
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                          {ev.titulo}
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {formatarDataEvento(ev.data_inicio)}
                          {ev.data_fim && ev.data_fim !== ev.data_inicio ? ` a ${formatarDataEvento(ev.data_fim)}` : ''} • {categoriasEvento.find(c => c.id === ev.categoria || c.nome.toLowerCase() === (ev.categoria || '').toLowerCase())?.nome || ev.categoria}
                        </p>
                      </div>
                    </div>

                    <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                      {ev.publico_alvo || 'Todos'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>

      {/* MODAL REDAÇÃO & IA */}
      {modalRelatorioAberto && itemRelatorioSelecionado && (
        <ModalRedacaoParecerIA
          isOpen={modalRelatorioAberto}
          onClose={() => {
            setModalRelatorioAberto(false);
            setItemRelatorioSelecionado(null);
          }}
          relatorio={itemRelatorioSelecionado.relatorio}
          solicitacao={itemRelatorioSelecionado.solicitacao}
          estudante={itemRelatorioSelecionado.estudante}
          turma={itemRelatorioSelecionado.turma}
        />
      )}

      {/* MODAL REGISTRAR REPOSIÇÃO */}
      {modalReposicaoAberto && reposicaoSelecionada && (
        <ModalRegistrarReposicao
          isOpen={modalReposicaoAberto}
          onClose={() => {
            setModalReposicaoAberto(false);
            setReposicaoSelecionada(null);
          }}
          reposicao={reposicaoSelecionada}
        />
      )}

      {/* MODAL ANEXAR ATESTADO */}
      {modalAtestadoAberto && (
        <ModalAnexarAtestado
          isOpen={modalAtestadoAberto}
          onClose={() => setModalAtestadoAberto(false)}
          professor={professorAtual}
        />
      )}

    </div>
  );
}
