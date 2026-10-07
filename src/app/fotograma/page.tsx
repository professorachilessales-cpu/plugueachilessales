'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { PrintHeader } from '@/components/layout/PrintHeader';
import { isProfessorAdministrativo } from '@/lib/pareceres-ia';
import { 
  Image as ImageIcon, 
  MessageSquare, 
  ShieldAlert, 
  PhoneOff, 
  UserX, 
  Search, 
  Send, 
  Check, 
  Sparkles, 
  AlertCircle,
  X,
  Heart,
  Calendar,
  AlertTriangle,
  FileQuestion,
  ExternalLink,
  Printer,
  Edit3,
  Phone,
  User,
  Save
} from 'lucide-react';
import { Estudante, Turma } from '@/lib/types';

type TemplateKey = 'falta' | 'reuniao' | 'tarefa' | 'elogio' | 'livre';

interface ModeloWhatsApp {
  key: TemplateKey;
  titulo: string;
  icone: any;
  cor: string;
  template: string;
}

const MODELOS_WHATSAPP_PADRAO: ModeloWhatsApp[] = [
  {
    key: 'falta',
    titulo: 'Falta no Dia',
    icone: AlertTriangle,
    cor: 'text-rose-600 bg-rose-50 dark:bg-rose-950/60 dark:text-rose-400',
    template: 'Olá {Responsável}, informamos que o(a) estudante {Aluno} da turma {Turma} não compareceu à aula na data de hoje. Solicitamos a gentileza de justificar a ausência junto à secretaria escolar. Atenciosamente, Equipe Pedagógica.',
  },
  {
    key: 'reuniao',
    titulo: 'Reunião de Pais',
    icone: Calendar,
    cor: 'text-amber-600 bg-amber-50 dark:bg-amber-950/60 dark:text-amber-400',
    template: 'Prezado(a) {Responsável}, convidamos você para a Reunião Pedagógica de Pais & Mestres da turma {Turma}. Sua participação é fundamental para o acompanhamento do desenvolvimento de {Aluno}. Contamos com sua presença!',
  },
  {
    key: 'tarefa',
    titulo: 'Atividade Pendente',
    icone: FileQuestion,
    cor: 'text-blue-600 bg-blue-50 dark:bg-blue-950/60 dark:text-blue-400',
    template: 'Olá {Responsável}, comunicamos que o(a) aluno(a) {Aluno} possui atividades/tarefas escolares pendentes de entrega na turma {Turma}. Pedimos o apoio da família no incentivo e acompanhamento dos estudos em casa.',
  },
  {
    key: 'elogio',
    titulo: 'Elogio ao Desempenho',
    icone: Heart,
    cor: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-400',
    template: 'Olá {Responsável}! Temos a imensa alegria de parabenizar {Aluno} pelo admirável desempenho, postura participativa e dedicação nas aulas da turma {Turma}. O esforço da família reflete neste sucesso! Parabéns!',
  },
  {
    key: 'livre',
    titulo: 'Mensagem Livre',
    icone: MessageSquare,
    cor: 'text-purple-600 bg-purple-50 dark:bg-purple-950/60 dark:text-purple-400',
    template: 'Olá {Responsável}, aqui é a coordenação escolar referente ao estudante {Aluno} ({Turma}). ',
  },
];

export default function FotogramaPage() {
  const router = useRouter();
  const { estudantes, turmas, role, currentUser, authenticatedUser, professores, users, escolaConfig, updateEstudante } = useApp();

  // Usuário efetivamente logado no sistema (prioriza o usuário autenticado da sessão)
  const usuarioLogado = authenticatedUser || currentUser;
  const isPerfilProfessor = role === 'professor' || usuarioLogado?.role === 'professor';

  // Vincula o registro oficial do professor do banco de dados
  const professorVinculado = useMemo(() => {
    if (!isPerfilProfessor) return null;
    const cpfLimpoUser = usuarioLogado?.cpf?.replace(/\D/g, '');

    const match = professores.find((p) => {
      const cpfLimpoProf = p.cpf?.replace(/\D/g, '');
      if (cpfLimpoUser && cpfLimpoProf && cpfLimpoUser === cpfLimpoProf) return true;
      if (usuarioLogado?.id && (p.id === usuarioLogado.id || (p as any).user_id === usuarioLogado.id || p.profile_id === usuarioLogado.id)) return true;
      if (usuarioLogado?.email && p.email && usuarioLogado.email.toLowerCase() === p.email.toLowerCase()) return true;
      if (usuarioLogado?.name && p.nome_completo && usuarioLogado.name.trim().toLowerCase() === p.nome_completo.trim().toLowerCase()) return true;
      return false;
    });

    if (match) return match;

    // Se quem está logado for administrador testando/simulando o perfil de professor sem conta vinculada
    if (usuarioLogado?.role === 'admin' && role === 'professor') {
      return professores.find(p => (p.turmas_atribuidas_ids && p.turmas_atribuidas_ids.length > 0) || !p.eh_administrativo) || professores[0] || null;
    }

    return null;
  }, [isPerfilProfessor, usuarioLogado, role, professores]);

  // Turmas acessíveis (No perfil de professor: estritamente turmas onde ele é docente)
  const turmasDisponiveis = useMemo(() => {
    if (!isPerfilProfessor) {
      return turmas;
    }

    // Se for funcionário puramente administrativo, não exibe turmas
    if (professorVinculado && isProfessorAdministrativo(professorVinculado, users)) {
      return [];
    }

    if (!professorVinculado && usuarioLogado?.role === 'professor') {
      return [];
    }

    const teacherIds = new Set<string>();
    if (professorVinculado?.id) teacherIds.add(professorVinculado.id);
    if ((professorVinculado as any)?.user_id) teacherIds.add((professorVinculado as any).user_id);
    if (professorVinculado?.profile_id) teacherIds.add(professorVinculado.profile_id);
    if (usuarioLogado?.id) teacherIds.add(usuarioLogado.id);

    const teacherNames = new Set<string>();
    if (professorVinculado?.nome_completo) teacherNames.add(professorVinculado.nome_completo.trim().toLowerCase());
    if (usuarioLogado?.name) teacherNames.add(usuarioLogado.name.trim().toLowerCase());

    const turmasAtribuidas = professorVinculado?.turmas_atribuidas_ids || [];

    return turmas.filter((t) => {
      // 1. O ID do professor está em professores_ids da turma
      if (t.professores_ids && Array.isArray(t.professores_ids)) {
        if (t.professores_ids.some((id) => teacherIds.has(id))) return true;
      }

      // 2. O professor é o regente titular da turma (por ID)
      if (t.professor_regente_id && teacherIds.has(t.professor_regente_id)) {
        return true;
      }

      // 3. O professor é o regente titular da turma (por Nome)
      if (t.professor_regente_nome && teacherNames.has(t.professor_regente_nome.trim().toLowerCase())) {
        return true;
      }

      // 4. A turma consta nas turmas atribuídas do cadastro do professor (por ID ou Nome)
      if (
        (t.id && turmasAtribuidas.includes(t.id)) ||
        (t.nome && turmasAtribuidas.includes(t.nome))
      ) {
        return true;
      }

      // 5. O professor está na equipe de apoio pedagógico / AEE da turma
      if (t.equipe_apoio_ids && Array.isArray(t.equipe_apoio_ids)) {
        if (t.equipe_apoio_ids.some((id) => teacherIds.has(id))) return true;
      }

      // 6. O professor ministra aulas na grade horária da turma
      if (t.grade_horaria && Array.isArray(t.grade_horaria)) {
        if (
          t.grade_horaria.some(
            (h) => h.professor_nome && teacherNames.has(h.professor_nome.trim().toLowerCase())
          )
        ) {
          return true;
        }
      }

      return false;
    });
  }, [turmas, isPerfilProfessor, professorVinculado, usuarioLogado, users]);

  // Turma Selecionada
  const [turmaSelecionadaId, setTurmaSelecionadaId] = useState<string>('');
  const [busca, setBusca] = useState('');

  // Sincroniza a turma selecionada caso a atual não pertença às turmas do professor
  useEffect(() => {
    if (turmasDisponiveis.length > 0) {
      if (!turmaSelecionadaId || !turmasDisponiveis.some((t) => t.id === turmaSelecionadaId)) {
        setTurmaSelecionadaId(turmasDisponiveis[0].id);
      }
    } else {
      if (turmaSelecionadaId !== '') {
        setTurmaSelecionadaId('');
      }
    }
  }, [turmasDisponiveis, turmaSelecionadaId]);

  const turmaAtual = useMemo(() => {
    if (turmasDisponiveis.length === 0) return null;
    return turmasDisponiveis.find((t) => t.id === turmaSelecionadaId) || turmasDisponiveis[0];
  }, [turmasDisponiveis, turmaSelecionadaId]);

  // Modal WhatsApp
  const [modalWhatsAppAberto, setModalWhatsAppAberto] = useState(false);
  const [alunoSelecionado, setAlunoSelecionado] = useState<Estudante | null>(null);
  const [modeloAtivo, setModeloAtivo] = useState<TemplateKey>('falta');
  const [textoPersonalizado, setTextoPersonalizado] = useState('');
  const [telefoneDestino, setTelefoneDestino] = useState<string>('');

  // Modal Edição de Estudante (apenas Admin)
  const [modalEditEstudanteAberto, setModalEditEstudanteAberto] = useState(false);
  const [estudanteEditando, setEstudanteEditando] = useState<Estudante | null>(null);
  const [formEdit, setFormEdit] = useState({
    nome_completo: '',
    cpf: '',
    rg_numero: '',
    data_nascimento: '',
    nome_responsavel: '',
    telefone_responsavel: '',
    telefone_2: '',
    telefone_3: '',
    telefone_4: '',
    endereco: '',
    possui_laudo: false,
    aee: false,
    laudo_descricao: '',
    observacoes: '',
  });

  // Modelos com suporte a customizações de Configurações
  const modelosWhatsApp = useMemo(() => {
    return MODELOS_WHATSAPP_PADRAO.map((m) => {
      const customizado = escolaConfig.modelos_whatsapp?.[m.key];
      return {
        ...m,
        template: customizado && customizado.trim() !== '' ? customizado : m.template,
      };
    });
  }, [escolaConfig.modelos_whatsapp]);

  // Alunos da Turma Selecionada
  const alunosDaTurma = useMemo(() => {
    if (!turmaAtual) return [];
    return estudantes
      .filter((e) => e.turma_id === turmaAtual.id)
      .filter((e) => e.nome_completo.toLowerCase().includes(busca.toLowerCase()));
  }, [estudantes, turmaAtual, busca]);

  // Telefones preenchidos do aluno selecionado
  const telefonesDisponiveis = useMemo(() => {
    if (!alunoSelecionado) return [];
    const lista = [
      { id: 'tel1', label: 'Telefone 1 (Principal)', numero: alunoSelecionado.telefone_responsavel },
      { id: 'tel2', label: 'Telefone 2', numero: alunoSelecionado.telefone_2 },
      { id: 'tel3', label: 'Telefone 3', numero: alunoSelecionado.telefone_3 },
      { id: 'tel4', label: 'Telefone 4', numero: alunoSelecionado.telefone_4 },
    ];
    return lista.filter(t => Boolean(t.numero && t.numero.trim() !== ''));
  }, [alunoSelecionado]);

  // Interpolação de variáveis {Aluno}, {Turma}, {Responsável}
  const formatarMensagem = (template: string, aluno: Estudante, turma?: Turma) => {
    const nomeResp = aluno.nome_responsavel || aluno.filiacao_materna || 'Responsável';
    const nomeTurma = turma?.nome || aluno.turma_nome || 'Turma Escolar';
    return template
      .replace(/{Aluno}/g, aluno.nome_completo)
      .replace(/{Turma}/g, nomeTurma)
      .replace(/{Responsável}/g, nomeResp);
  };

  // Abrir Modal de WhatsApp
  const handleAbrirWhatsApp = (aluno: Estudante) => {
    setAlunoSelecionado(aluno);
    setModeloAtivo('falta');
    const modelo = modelosWhatsApp.find(m => m.key === 'falta');
    const interp = formatarMensagem(modelo?.template || '', aluno, turmaAtual);
    setTextoPersonalizado(interp);

    // De preferência o telefone 1 se preenchido, senão o primeiro preenchido
    const tel1 = aluno.telefone_responsavel && aluno.telefone_responsavel.trim() !== '' ? aluno.telefone_responsavel : '';
    const fallback = [aluno.telefone_2, aluno.telefone_3, aluno.telefone_4].find(t => t && t.trim() !== '') || '';
    setTelefoneDestino(tel1 || fallback);

    setModalWhatsAppAberto(true);
  };

  // Troca de Modelo
  const handleSelecionarModelo = (key: TemplateKey) => {
    setModeloAtivo(key);
    if (!alunoSelecionado || !turmaAtual) return;
    const modelo = modelosWhatsApp.find(m => m.key === key);
    const formatado = formatarMensagem(modelo?.template || '', alunoSelecionado, turmaAtual);
    setTextoPersonalizado(formatado);
  };

  // Disparo para https://wa.me/55...
  const handleEnviarWhatsApp = () => {
    if (!alunoSelecionado) return;
    const rawTel = telefoneDestino || alunoSelecionado.telefone_responsavel || '';
    const cleanTel = rawTel.replace(/\D/g, '');

    if (!cleanTel) {
      alert('Nenhum número de telefone válido selecionado!');
      return;
    }

    const ddiTel = cleanTel.startsWith('55') ? cleanTel : `55${cleanTel}`;
    const url = `https://wa.me/${ddiTel}?text=${encodeURIComponent(textoPersonalizado)}`;
    window.open(url, '_blank');
    setModalWhatsAppAberto(false);
  };

  // Abrir Ficha de Edição de Estudante (leva à página de estudantes com formulário completo aberto)
  const handleAbrirEdicaoEstudante = (aluno: Estudante) => {
    router.push(`/estudantes?editar=${aluno.id}`);
  };

  const handleSalvarEdicao = (e: React.FormEvent) => {
    e.preventDefault();
    if (!estudanteEditando) return;

    updateEstudante(estudanteEditando.id, {
      nome_completo: formEdit.nome_completo.toUpperCase(),
      cpf: formEdit.cpf.toUpperCase(),
      rg_numero: formEdit.rg_numero.toUpperCase(),
      data_nascimento: formEdit.data_nascimento,
      nome_responsavel: formEdit.nome_responsavel.toUpperCase(),
      telefone_responsavel: formEdit.telefone_responsavel,
      telefone_2: formEdit.telefone_2,
      telefone_3: formEdit.telefone_3,
      telefone_4: formEdit.telefone_4,
      endereco: formEdit.endereco.toUpperCase(),
      possui_laudo: formEdit.possui_laudo,
      aee: formEdit.aee,
      laudo_descricao: formEdit.laudo_descricao.toUpperCase(),
      observacoes: formEdit.observacoes.toUpperCase(),
    });

    setModalEditEstudanteAberto(false);
    setEstudanteEditando(null);
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho de Impressão Oficial para PDF */}
      <PrintHeader
        documentTitle="FOTOGRAMA DA TURMA"
        documentSubtitle={
          turmaAtual
            ? `Turma: ${turmaAtual.nome} (${(turmaAtual.turno || 'Manhã').toUpperCase()}) • Ano Letivo: ${escolaConfig.ano_letivo_ativo || 2026}`
            : `Ano Letivo: ${escolaConfig.ano_letivo_ativo || 2026}`
        }
      />

      {/* Topo do Fotograma (Oculto na impressão) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <ImageIcon className="h-7 w-7 text-school-blue-600 dark:text-school-gold-400" />
            Fotograma da Turma
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Anuário fotográfico, indicadores de atenção e comunicação direta
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Botão de Geração de PDF / Impressão */}
          <button
            onClick={() => window.print()}
            disabled={!turmaAtual}
            className="inline-flex items-center gap-2 rounded-xl bg-school-blue-800 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-school-blue-700 transition-all dark:bg-school-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Gerar PDF ou Imprimir Fotograma da Turma"
          >
            <Printer className="h-4 w-4" />
            <span>Gerar PDF / Imprimir</span>
          </button>

          {/* Seletor de Turma */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Turma:
            </label>
            <select
              value={turmaAtual?.id || ''}
              onChange={(e) => setTurmaSelecionadaId(e.target.value)}
              disabled={turmasDisponiveis.length === 0}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-900 shadow-sm focus:border-school-blue-500 focus:outline-none dark:border-slate-700 dark:bg-school-dark-surface dark:text-white disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {turmasDisponiveis.length === 0 ? (
                <option value="">Nenhuma turma associada</option>
              ) : (
                turmasDisponiveis.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nome} ({t.turno.toUpperCase()})
                  </option>
                ))
              )}
            </select>
          </div>
        </div>
      </div>

      {/* Barra de Busca e Legenda de Badges (Oculta na impressão) */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-school-dark-border dark:bg-school-dark-surface print:hidden">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Filtrar aluno no fotograma..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 !pl-11 !pr-4 input-icon-left py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-school-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-900/50 dark:text-white"
          />
        </div>

        {/* Legenda de Badges */}
        <div className="flex flex-wrap items-center gap-3 text-[11px] font-semibold">
          <span className="flex items-center gap-1.5 text-red-600 dark:text-red-400 font-bold">
            <span className="h-2.5 w-2.5 rounded-full bg-red-600" /> AEE (Laudo)
          </span>
          {role !== 'professor' && (
            <span className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> !Tel (Sem contato)
            </span>
          )}
          <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
            <span className="h-2.5 w-2.5 rounded-full bg-slate-400" /> Sem Foto
          </span>
          <span className="text-slate-400">|</span>
          <span className="text-slate-600 dark:text-slate-300 font-mono">
            {alunosDaTurma.length} estudantes na turma
          </span>
        </div>
      </div>

      {/* Grid de Cards de Fotos (Mural Fotográfico / PDF) */}
      {turmasDisponiveis.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-800 dark:bg-school-dark-surface print:hidden">
          <ImageIcon className="h-12 w-12 text-slate-300 dark:text-slate-600 mb-3" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
            Nenhuma turma associada encontrada
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mt-1">
            Seu perfil docente não possui turmas atribuídas no momento. Solicite à coordenação pedagógica ou direção a atribuição de suas turmas.
          </p>
        </div>
      ) : alunosDaTurma.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-800 dark:bg-school-dark-surface print:hidden">
          <ImageIcon className="h-12 w-12 text-slate-300 dark:text-slate-600 mb-3" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
            Nenhum aluno encontrado nesta turma
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mt-1">
            Verifique os filtros de busca ou adicione estudantes vinculados à turma {turmaAtual?.nome}.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 print:grid-cols-4 print:gap-4">
          {alunosDaTurma.map((aluno) => {
            const semFoto = !aluno.foto_url || aluno.foto_url.trim() === '';
            const semTelefone = !aluno.telefone_responsavel || aluno.telefone_responsavel.trim() === '';
            const comAee = aluno.aee || aluno.possui_laudo;

            return (
              <div
                key={aluno.id}
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:border-school-dark-border dark:bg-school-dark-surface print:shadow-none print:border-slate-300 print:break-inside-avoid"
              >
                {/* Imagem / Foto do Aluno */}
                <div className="relative aspect-square w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                  {semFoto ? (
                    <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-slate-400 dark:from-slate-800 dark:to-slate-900">
                      <UserX className="h-12 w-12 stroke-[1.5]" />
                      <span className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Foto Pendente
                      </span>
                    </div>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={aluno.foto_url}
                      alt={aluno.nome_completo}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  )}

                  {/* Badges de Status Sobrepostos */}
                  <div className="absolute top-2.5 left-2.5 right-2.5 flex flex-wrap gap-1.5 pointer-events-none print:hidden">
                    {comAee && (
                      <span className="inline-flex items-center gap-1 rounded-lg bg-red-600/95 px-2 py-0.5 text-[9px] font-black uppercase text-white shadow-md backdrop-blur-md">
                        <ShieldAlert className="h-3 w-3" />
                        AEE (Laudo)
                      </span>
                    )}

                    {role !== 'professor' && semTelefone && (
                      <span className="inline-flex items-center gap-1 rounded-lg bg-amber-500/90 px-2 py-0.5 text-[9px] font-black uppercase text-white shadow-md backdrop-blur-md">
                        <PhoneOff className="h-3 w-3" />
                        !Tel
                      </span>
                    )}

                    {semFoto && (
                      <span className="inline-flex items-center gap-1 rounded-lg bg-slate-700/90 px-2 py-0.5 text-[9px] font-black uppercase text-white shadow-md backdrop-blur-md">
                        Sem Foto
                      </span>
                    )}
                  </div>
                </div>

                {/* Conteúdo do Card */}
                <div className="flex flex-1 flex-col justify-between p-4 print:p-2.5">
                  <div>
                    <h4 className="text-sm font-black text-slate-900 dark:text-white line-clamp-1 group-hover:text-school-blue-600 dark:group-hover:text-school-gold-400 transition-colors print:text-xs">
                      {aluno.nome_completo}
                    </h4>

                    {/* Turma e Ano impressos no card para PDF */}
                    <div className="hidden print:block text-[10px] text-slate-600 font-semibold mt-0.5">
                      {turmaAtual?.nome} • {escolaConfig.ano_letivo_ativo || 2026}
                    </div>

                    <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 print:hidden">
                      Resp: {aluno.nome_responsavel || aluno.filiacao_materna || 'Não declarado'}
                    </p>

                    {/* Telefone do responsável: omitido para o perfil de professor */}
                    {role !== 'professor' && (
                      <p className="text-[10px] font-mono text-slate-400 mt-0.5 print:hidden">
                        {aluno.telefone_responsavel || 'Sem contato telefônico'}
                      </p>
                    )}
                  </div>

                  {/* Ações (WhatsApp + Alterar Dados no Perfil Admin) */}
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2 print:hidden">
                    {/* Botão de Alterar Dados (Perfil Administração) */}
                    {role === 'admin' && (
                      <button
                        onClick={() => handleAbrirEdicaoEstudante(aluno)}
                        className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 transition-all"
                        title="Alterar dados cadastrais deste estudante"
                      >
                        <Edit3 className="h-3.5 w-3.5 text-school-blue-600 dark:text-school-gold-400" />
                        <span>Alterar Dados</span>
                      </button>
                    )}

                    {/* Disparador Inteligente de WhatsApp (Apenas Administração / Não exibido para Professor) */}
                    {role !== 'professor' && (
                      <button
                        onClick={() => handleAbrirWhatsApp(aluno)}
                        disabled={semTelefone && !aluno.telefone_2 && !aluno.telefone_3 && !aluno.telefone_4}
                        title={semTelefone ? 'Cadastre um telefone antes de disparar' : 'Disparar WhatsApp Inteligente'}
                        className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                        <span>WhatsApp Rápido</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL 1: Disparador Inteligente de WhatsApp com Seletor de Telefone */}
      {modalWhatsAppAberto && alunoSelecionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-school-dark-surface max-h-[95vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-emerald-600" />
                  Disparador de WhatsApp Inteligente
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Estudante: <strong className="text-slate-800 dark:text-white">{alunoSelecionado.nome_completo}</strong>
                </p>
              </div>
              <button
                onClick={() => setModalWhatsAppAberto(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Seletor do Número de WhatsApp de Destino */}
            <div className="mt-4">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                Escolha o Telefone de Destino:
              </label>
              {telefonesDisponiveis.length === 0 ? (
                <div className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
                  Nenhum telefone cadastrado para este estudante.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {telefonesDisponiveis.map((item) => {
                    const isSelected = (telefoneDestino || '') === (item.numero || '');
                    return (
                      <label
                        key={item.id}
                        className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                          isSelected
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-950 dark:bg-emerald-950/60 dark:text-emerald-200 font-bold ring-2 ring-emerald-500/20'
                            : 'border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="tel_destino"
                          checked={isSelected}
                          onChange={() => setTelefoneDestino(item.numero || '')}
                          className="h-4 w-4 text-emerald-600 focus:ring-emerald-500"
                        />
                        <div className="flex-1 truncate">
                          <div className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">
                            {item.label}
                          </div>
                          <div className="font-mono text-xs">{item.numero}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modelos Rápidos Predefinidos */}
            <div className="mt-4">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                Selecione o Modelo de Comunicação:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {modelosWhatsApp.map((m) => {
                  const Icon = m.icone;
                  const isSelected = modeloAtivo === m.key;
                  return (
                    <button
                      key={m.key}
                      type="button"
                      onClick={() => handleSelecionarModelo(m.key)}
                      className={`flex flex-col items-start p-2.5 rounded-xl border text-left text-xs font-semibold transition-all ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-950 dark:bg-emerald-950/50 dark:text-emerald-200 ring-2 ring-emerald-500/20'
                          : 'border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className={`p-1.5 rounded-lg mb-1.5 ${m.cor}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <span>{m.titulo}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Prévia Estilo Balão do WhatsApp */}
            <div className="mt-5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                Mensagem Gerada (Variáveis Interpoladas):
              </label>
              <div className="rounded-2xl bg-[#E5DDD5] dark:bg-slate-900 p-4 border border-slate-300 dark:border-slate-800">
                <div className="relative rounded-2xl rounded-tl-none bg-[#DCF8C6] dark:bg-emerald-950/80 p-3.5 text-xs text-slate-900 dark:text-emerald-100 shadow-sm border border-emerald-300/60 dark:border-emerald-800">
                  <textarea
                    rows={5}
                    value={textoPersonalizado}
                    onChange={(e) => setTextoPersonalizado(e.target.value)}
                    className="w-full bg-transparent resize-none focus:outline-none text-xs text-slate-900 dark:text-slate-100 leading-relaxed font-sans"
                  />
                  <div className="text-right text-[10px] text-slate-500 dark:text-emerald-300 font-mono mt-1">
                    Agora • ✓✓
                  </div>
                </div>
              </div>
              <p className="mt-1 text-[11px] text-slate-400 italic">
                Você pode editar livremente o texto acima antes de abrir o WhatsApp.
              </p>
            </div>

            {/* Ações do Modal */}
            <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setModalWhatsAppAberto(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleEnviarWhatsApp}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-emerald-600/30 hover:bg-emerald-500 transition-all"
              >
                <Send className="h-4 w-4" />
                <span>Abrir no WhatsApp</span>
                <ExternalLink className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Alterar Dados do Estudante (Perfil Administração) */}
      {modalEditEstudanteAberto && estudanteEditando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-school-dark-surface max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Edit3 className="h-5 w-5 text-school-blue-600 dark:text-school-gold-400" />
                  Alterar Dados do Estudante
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Edição rápida das informações cadastrais e contatos
                </p>
              </div>
              <button
                onClick={() => setModalEditEstudanteAberto(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSalvarEdicao} className="mt-4 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    required
                    value={formEdit.nome_completo}
                    onChange={(e) => setFormEdit({ ...formEdit, nome_completo: e.target.value.toUpperCase() })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs uppercase text-slate-900 focus:border-school-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase">
                    CPF
                  </label>
                  <input
                    type="text"
                    value={formEdit.cpf}
                    onChange={(e) => setFormEdit({ ...formEdit, cpf: e.target.value.toUpperCase() })}
                    placeholder="000.000.000-00"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs uppercase text-slate-900 focus:border-school-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase">
                    Data de Nascimento
                  </label>
                  <input
                    type="date"
                    value={formEdit.data_nascimento}
                    onChange={(e) => setFormEdit({ ...formEdit, data_nascimento: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:border-school-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase">
                    Nome do Responsável Legal
                  </label>
                  <input
                    type="text"
                    value={formEdit.nome_responsavel}
                    onChange={(e) => setFormEdit({ ...formEdit, nome_responsavel: e.target.value.toUpperCase() })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs uppercase text-slate-900 focus:border-school-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase">
                    Telefone 1 (Principal)
                  </label>
                  <input
                    type="text"
                    value={formEdit.telefone_responsavel}
                    onChange={(e) => setFormEdit({ ...formEdit, telefone_responsavel: e.target.value })}
                    placeholder="(81) 98765-4321"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:border-school-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase">
                    Telefone 2
                  </label>
                  <input
                    type="text"
                    value={formEdit.telefone_2}
                    onChange={(e) => setFormEdit({ ...formEdit, telefone_2: e.target.value })}
                    placeholder="(81) 98888-2222"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:border-school-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase">
                    Telefone 3
                  </label>
                  <input
                    type="text"
                    value={formEdit.telefone_3}
                    onChange={(e) => setFormEdit({ ...formEdit, telefone_3: e.target.value })}
                    placeholder="(81) 97777-3333"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:border-school-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase">
                    Telefone 4 (Recado)
                  </label>
                  <input
                    type="text"
                    value={formEdit.telefone_4}
                    onChange={(e) => setFormEdit({ ...formEdit, telefone_4: e.target.value })}
                    placeholder="(81) 3333-4444"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:border-school-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase">
                    Endereço Completo
                  </label>
                  <input
                    type="text"
                    value={formEdit.endereco}
                    onChange={(e) => setFormEdit({ ...formEdit, endereco: e.target.value.toUpperCase() })}
                    placeholder="RUA, NÚMERO, BAIRRO, CIDADE"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs uppercase text-slate-900 focus:border-school-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                </div>

                {/* Inclusão / AEE */}
                <div className="sm:col-span-2 flex items-center gap-4 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-red-600 dark:text-red-400">
                    <input
                      type="checkbox"
                      checked={formEdit.aee}
                      onChange={(e) => setFormEdit({ ...formEdit, aee: e.target.checked, possui_laudo: e.target.checked ? true : formEdit.possui_laudo })}
                      className="h-4 w-4 rounded border-red-400 text-red-600 focus:ring-red-500"
                    />
                    <span>Elegível para AEE / Inclusão</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={formEdit.possui_laudo}
                      onChange={(e) => setFormEdit({ ...formEdit, possui_laudo: e.target.checked })}
                      className="h-4 w-4 rounded border-slate-300 text-school-blue-600 focus:ring-school-blue-500"
                    />
                    <span>Possui Laudo Médico Homologado</span>
                  </label>
                </div>

                {(formEdit.aee || formEdit.possui_laudo) && (
                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-red-600 dark:text-red-400 mb-1 uppercase">
                      Descrição / CID do Laudo Médico
                    </label>
                    <input
                      type="text"
                      value={formEdit.laudo_descricao}
                      onChange={(e) => setFormEdit({ ...formEdit, laudo_descricao: e.target.value.toUpperCase() })}
                      placeholder="EX: TEA NÍVEL 1, TDAH, BAIXA VISÃO..."
                      className="w-full rounded-xl border border-red-300 bg-white px-3 py-2 text-xs uppercase text-slate-900 focus:border-red-500 focus:outline-none dark:border-red-800 dark:bg-slate-900 dark:text-white"
                    />
                  </div>
                )}

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase">
                    Observações Pedagógicas / Gerais
                  </label>
                  <textarea
                    rows={3}
                    value={formEdit.observacoes}
                    onChange={(e) => setFormEdit({ ...formEdit, observacoes: e.target.value.toUpperCase() })}
                    placeholder="OBSERVAÇÕES INTERNAS SOBRE O ESTUDANTE..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs uppercase text-slate-900 focus:border-school-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalEditEstudanteAberto(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-xl bg-school-blue-800 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-school-blue-700 transition-all dark:bg-school-blue-600"
                >
                  <Save className="h-4 w-4" />
                  <span>Salvar Alterações</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
