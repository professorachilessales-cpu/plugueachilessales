'use client';

import React, { useMemo, useState } from 'react';
import { useApp } from '@/context/AppContext';
import {
  Users,
  BookOpen,
  Calendar,
  ArrowLeftRight,
  AlertTriangle,
  CheckCircle2,
  FileText,
  ExternalLink,
  ShieldAlert,
  GraduationCap,
  Sparkles,
  HeartHandshake,
  Cake,
  PartyPopper,
  Gift,
  Clock,
  CameraOff,
  PhoneOff,
  Phone,
  MessageSquare,
  MessageCircle,
  Send,
  X,
  BarChart3,
  Edit3,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Minimize2
} from 'lucide-react';
import Link from 'next/link';
import { AniversariantesSection } from '@/components/dashboard/AniversariantesSection';
import { ProfessorDashboard } from '@/components/dashboard/ProfessorDashboard';
import { formatarTelefone } from '@/lib/validations';

const MODELOS_WHATSAPP_INCLUSAO_PADRAO = {
  inclusao_aee: 'Olá {Responsável}, tudo bem? Aqui é da coordenação de Inclusão Escolar (PLUGUE). Estamos entrando em contato para compartilhar o andamento do plano pedagógico e atendimento AEE de {Aluno} ({Turma}). Gostaríamos de alinhar os próximos passos com a família. Contamos com sua parceria!',
  inclusao_laudo: 'Prezado(a) {Responsável}, tudo bem? Solicitamos a gentileza de apresentar na secretaria ou nos encaminhar a atualização do laudo médico / relatório clínico de {Aluno} ({Turma}) para manutenção da ficha pedagógica. Atenciosamente, Equipe de Inclusão (PLUGUE).',
  inclusao_reuniao: 'Olá {Responsável}, gostaríamos de agendar uma reunião de acompanhamento multidisciplinar referente ao estudante {Aluno} ({Turma}), referente ao laudo ({Laudo}). Qual o melhor dia e horário para você nesta semana?',
  inclusao_livre: 'Olá {Responsável}, aqui é a coordenação de Inclusão da Plataforma Unificada de Gestão Educacional (PLUGUE) sobre o(a) estudante {Aluno} ({Turma}). ',
};

export default function DashboardPage() {
  const { 
    estudantes, 
    turmas, 
    faltasProfessores, 
    eventos, 
    role, 
    updateEstudante, 
    escolaConfig,
    professores,
    reposicoesAulas,
    atestadosProfessor,
    solicitacoesRelatorio,
    relatoriosProfessores,
    homologarReposicaoAula
  } = useApp();

  // Estados do Bloco de Aniversariantes
  const [abaAniversario, setAbaAniversario] = useState<'hoje' | 'semana' | 'mes'>('hoje');
  const [homenagemEnviadaId, setHomenagemEnviadaId] = useState<string | null>(null);

  // Estados de Expansão e Recolhimento do Bloco de Inclusão
  const [inclusaoRecolhido, setInclusaoRecolhido] = useState(false);
  const [inclusaoExpandido, setInclusaoExpandido] = useState(false);

  // Extrair e calcular dados de aniversário de forma segura (sem desvio de fuso horário UTC)
  const extrairDadosAniversario = (dataNascimento: string) => {
    if (!dataNascimento) return null;
    const partes = dataNascimento.split('T')[0].split('-');
    if (partes.length < 3) return null;
    const ano = parseInt(partes[0], 10);
    const mes = parseInt(partes[1], 10);
    const dia = parseInt(partes[2], 10);
    if (isNaN(ano) || isNaN(mes) || isNaN(dia)) return null;

    const hoje = new Date();
    const anoAtual = hoje.getFullYear();
    const mesAtual = hoje.getMonth() + 1;
    const diaAtual = hoje.getDate();

    const ehHoje = mes === mesAtual && dia === diaAtual;

    // Próximo aniversário
    let proximoNiver = new Date(anoAtual, mes - 1, dia);
    const hojeZero = new Date(anoAtual, mesAtual - 1, diaAtual);
    if (proximoNiver < hojeZero) {
      proximoNiver = new Date(anoAtual + 1, mes - 1, dia);
    }
    const diffMs = proximoNiver.getTime() - hojeZero.getTime();
    const diasRestantes = Math.round(diffMs / (1000 * 60 * 60 * 24));
    const idadeCalculada = ehHoje ? (anoAtual - ano) : (proximoNiver.getFullYear() - ano);

    return {
      ano,
      mes,
      dia,
      ehHoje,
      diasRestantes,
      idadeCalculada,
      dataFormatada: `${String(dia).padStart(2, '0')}/${String(mes).padStart(2, '0')}`,
    };
  };

  // Helper para nome e turno da turma
  const obterInfoTurma = (turmaId?: string, turmaNomeFallback?: string) => {
    const t = turmas.find(item => item.id === turmaId);
    if (t) {
      const turnoLabel = t.turno === 'manha' ? 'Manhã' : t.turno === 'tarde' ? 'Tarde' : 'Noite';
      return {
        id: t.id,
        nome: t.nome,
        turno: turnoLabel,
        completo: `${t.nome} • Turno ${turnoLabel}`,
      };
    }
    return {
      id: turmaId || '',
      nome: turmaNomeFallback || 'Turma não informada',
      turno: '',
      completo: turmaNomeFallback || 'Turma não informada',
    };
  };

  // Aniversariantes categorizados (Hoje, Próximos 7 dias, Mês)
  const dadosAniversarios = useMemo(() => {
    type ItemAniversario = {
      estudante: typeof estudantes[0];
      info: NonNullable<ReturnType<typeof extrairDadosAniversario>>;
    };

    const hoje: ItemAniversario[] = [];
    const semana: ItemAniversario[] = [];
    const mes: ItemAniversario[] = [];

    const mesAtual = new Date().getMonth() + 1;

    estudantes.forEach(est => {
      const info = extrairDadosAniversario(est.data_nascimento);
      if (!info) return;

      if (info.ehHoje) {
        hoje.push({ estudante: est, info });
      }
      if (info.diasRestantes >= 0 && info.diasRestantes <= 7) {
        semana.push({ estudante: est, info });
      }
      if (info.mes === mesAtual) {
        mes.push({ estudante: est, info });
      }
    });

    // Ordenar semana e mês por dias restantes
    semana.sort((a, b) => a.info.diasRestantes - b.info.diasRestantes);
    mes.sort((a, b) => a.info.diasRestantes - b.info.diasRestantes);

    return { hoje, semana, mes };
  }, [estudantes]);

  // Data de hoje formatada por extenso
  const dataHojeFormatada = useMemo(() => {
    return new Date().toLocaleDateString('pt-BR', {
      day: 'numeric',
      month: 'long',
    });
  }, []);

  const hojeCurto = useMemo(() => {
    const d = new Date();
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  // Simular aniversariante hoje caso não haja nenhum no storage
  const handleSimularHoje = () => {
    if (estudantes.length > 0) {
      const agora = new Date();
      const mm = String(agora.getMonth() + 1).padStart(2, '0');
      const dd = String(agora.getDate()).padStart(2, '0');
      updateEstudante(estudantes[0].id, {
        data_nascimento: `2010-${mm}-${dd}`,
      });
      setAbaAniversario('hoje');
    }
  };

  // Ação de parabenizar com feedback interativo
  const handleEnviarHomenagem = (estudanteId: string) => {
    setHomenagemEnviadaId(estudanteId);
    setTimeout(() => {
      setHomenagemEnviadaId(null);
    }, 4000);
  };

  // 1. Cálculos de Topo
  const totalEstudantes = estudantes.length;
  const estudantesAtivos = estudantes.filter(e => e.status_matricula === 'Ativo').length;
  const totalTurmas = turmas.length;

  // Eventos nos próximos 30 dias
  const eventosProximos = useMemo(() => {
    const agora = new Date();
    const trintaDias = new Date();
    trintaDias.setDate(agora.getDate() + 30);
    return eventos.filter(ev => {
      const dataEv = new Date(ev.data_inicio);
      return dataEv >= agora && dataEv <= trintaDias;
    });
  }, [eventos]);

  // Movimentações no Mês
  const movimentacoes = useMemo(() => {
    return {
      entradaInterna: estudantes.filter(e => e.tipo_movimentacao === 'Entrada Interna').length,
      entradaExterna: estudantes.filter(e => e.tipo_movimentacao === 'Entrada Externa').length,
      saidaInterna: estudantes.filter(e => e.tipo_movimentacao === 'Saída Interna').length,
      saidaExterna: estudantes.filter(e => e.tipo_movimentacao === 'Saída Externa').length,
    };
  }, [estudantes]);

  const totalTransferencias =
    movimentacoes.entradaInterna +
    movimentacoes.entradaExterna +
    movimentacoes.saidaInterna +
    movimentacoes.saidaExterna;

  // Estatísticas do Tipo de Histórico Escolar
  const statsHistorico = useMemo(() => {
    const total = estudantes.length;
    const definitivo = estudantes.filter(e => e.tipo_historico_escolar === 'Definitivo').length;
    const temporario = estudantes.filter(e => e.tipo_historico_escolar === 'Temporário').length;
    const naoEntregue = estudantes.filter(e => !e.tipo_historico_escolar || e.tipo_historico_escolar === 'Não entregue').length;

    const pctDefinitivo = total > 0 ? Math.round((definitivo / total) * 100) : 0;
    const pctTemporario = total > 0 ? Math.round((temporario / total) * 100) : 0;
    const pctNaoEntregue = total > 0 ? Math.max(0, 100 - pctDefinitivo - pctTemporario) : 0;

    return {
      total,
      definitivo,
      temporario,
      naoEntregue,
      pctDefinitivo,
      pctTemporario,
      pctNaoEntregue,
    };
  }, [estudantes]);

  // 2. Gráfico 1: Estudantes por Turma e por Turno agrupados por Grupo da Turma (com totais por Grupo)
  const dadosPorGrupoETurma = useMemo(() => {
    const contagem = { manha: 0, tarde: 0, noite: 0 };
    const porTurma = turmas.map(t => {
      const alunosDaTurma = estudantes.filter(e => e.turma_id === t.id);
      const qtdAlunos = alunosDaTurma.length;
      const vagasRestantes = Math.max(0, t.capacidade - qtdAlunos);
      const qtdComLaudo = alunosDaTurma.filter(e => Boolean(e.possui_laudo)).length;
      contagem[t.turno] = (contagem[t.turno] || 0) + qtdAlunos;
      return {
        id: t.id,
        nome: t.nome,
        grupo: t.grupo || 'Outros',
        turno: t.turno,
        capacidade: t.capacidade,
        alunos: qtdAlunos,
        vagasRestantes,
        comLaudo: qtdComLaudo,
        ocupacao: Math.min(100, Math.round((qtdAlunos / t.capacidade) * 100)),
      };
    });

    const ordemGrupos: string[] = [
      '1º anos',
      '2º anos',
      '3º anos',
      '4º anos',
      '5º anos',
      '6º anos',
      '7º anos',
      '8º anos',
      '9º anos',
      'Pré-escolar',
      'Creche',
      'Outros',
    ];

    const gruposUnicos = Array.from(new Set(porTurma.map(t => t.grupo)));
    gruposUnicos.sort((a, b) => {
      const idxA = ordemGrupos.indexOf(a);
      const idxB = ordemGrupos.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });

    const grupos = gruposUnicos.map(nomeGrupo => {
      const turmasDoGrupo = porTurma.filter(t => t.grupo === nomeGrupo);
      const totalAlunos = turmasDoGrupo.reduce((acc, cur) => acc + cur.alunos, 0);
      const totalCapacidade = turmasDoGrupo.reduce((acc, cur) => acc + cur.capacidade, 0);
      const totalVagasRestantes = turmasDoGrupo.reduce((acc, cur) => acc + cur.vagasRestantes, 0);
      const totalComLaudo = turmasDoGrupo.reduce((acc, cur) => acc + cur.comLaudo, 0);
      const ocupacao = totalCapacidade > 0 ? Math.min(100, Math.round((totalAlunos / totalCapacidade) * 100)) : 0;

      return {
        nomeGrupo,
        totalAlunos,
        totalCapacidade,
        totalVagasRestantes,
        totalComLaudo,
        ocupacao,
        turmas: turmasDoGrupo,
      };
    });

    return { contagem, porTurma, grupos };
  }, [turmas, estudantes]);

  const dadosPorTurno = dadosPorGrupoETurma;

  // Listas de pendências cadastrais
  const estudantesSemFoto = useMemo(() => {
    return estudantes.filter(e => !e.foto_url || e.foto_url.trim() === '');
  }, [estudantes]);

  const estudantesSemTelefone = useMemo(() => {
    return estudantes.filter(e => !e.telefone_responsavel || e.telefone_responsavel.trim() === '');
  }, [estudantes]);

  // Estudantes sem CPF cadastrado
  const estudantesSemCpf = useMemo(() => {
    return estudantes.filter(e => !e.cpf || e.cpf.trim() === '' || e.cpf === '000.000.000-00');
  }, [estudantes]);

  // Disparo WhatsApp de cobrança de CPF para programas sociais
  const handleEnviarWhatsAppCpf = (est: typeof estudantes[0]) => {
    const rawTelefone = est.telefone_responsavel || est.telefone_2 || '';
    const numLimpo = rawTelefone.replace(/\D/g, '');
    const resp = est.nome_responsavel || 'Senhor(a) Responsável';
    const msg = `Olá ${resp}, informamos que é de extrema necessidade termos o número do CPF do(a) estudante ${est.nome_completo} na escola, inclusive para emissão de histórico escolar, controles oficiais de matrícula e acompanhamento de programas sociais (como Bolsa Família/CadÚnico). Solicitamos o comparecimento ou envio do documento à secretaria escolar com urgência. Atenciosamente, Equipe Gestora.`;

    if (numLimpo.length >= 10) {
      window.open(`https://wa.me/55${numLimpo}?text=${encodeURIComponent(msg)}`, '_blank');
    } else {
      alert(`O estudante ${est.nome_completo} não possui telefone válido cadastrado no sistema.`);
    }
  };

  // Estudantes com Laudo Médico / AEE para o Bloco de Inclusão e Totais
  const estudantesComLaudo = useMemo(() => {
    return estudantes.filter(
      e => e.possui_laudo || e.aee || (e.laudo_descricao && e.laudo_descricao.trim() !== '')
    );
  }, [estudantes]);

  // Contagem estrita do alunado que tem laudo médico marcado (possui_laudo === true)
  const totalLaudoMarcado = useMemo(() => {
    return estudantes.filter(e => Boolean(e.possui_laudo)).length;
  }, [estudantes]);

  const pctAlunadoComLaudoMarcado = useMemo(() => {
    if (totalEstudantes === 0) return 0;
    return Math.round((totalLaudoMarcado / totalEstudantes) * 100);
  }, [totalLaudoMarcado, totalEstudantes]);

  const totalLaudados = useMemo(() => {
    return estudantes.filter(e => e.possui_laudo || (e.laudo_descricao && e.laudo_descricao.trim() !== '')).length;
  }, [estudantes]);

  const totalElegiveisAee = useMemo(() => {
    return estudantes.filter(e => e.aee).length;
  }, [estudantes]);

  const totalLaudadosEElegiveis = useMemo(() => {
    return estudantes.filter(e => e.possui_laudo || e.aee || (e.laudo_descricao && e.laudo_descricao.trim() !== '')).length;
  }, [estudantes]);

  // 10 Próximos Eventos Cadastrados
  const dezProximosEventos = useMemo(() => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const ordenados = [...eventos].sort(
      (a, b) => new Date(a.data_inicio).getTime() - new Date(b.data_inicio).getTime()
    );
    const futuros = ordenados.filter(ev => new Date(ev.data_inicio).getTime() >= hoje.getTime());
    if (futuros.length >= 10) {
      return futuros.slice(0, 10);
    }
    return ordenados.slice(0, 10);
  }, [eventos]);

  // Estado do Modal de Envio de WhatsApp para Inclusão
  const [modalWhatsAppInclusaoAberto, setModalWhatsAppInclusaoAberto] = useState(false);
  const [estudanteWhatsApp, setEstudanteWhatsApp] = useState<typeof estudantes[0] | null>(null);
  const [textoWhatsApp, setTextoWhatsApp] = useState('');
  const [templateAtivoInclusao, setTemplateAtivoInclusao] = useState<'aee' | 'laudo' | 'reuniao' | 'livre'>('aee');

  // Estado do Modal de Edição de Telefones de Contato (Alertas: Sem Telefone)
  const [modalEditarTelefonesAberto, setModalEditarTelefonesAberto] = useState(false);
  const [estudanteEditarTelefones, setEstudanteEditarTelefones] = useState<typeof estudantes[0] | null>(null);
  const [formTelefones, setFormTelefones] = useState({
    telefone_responsavel: '',
    telefone_2: '',
    telefone_3: '',
    telefone_4: '',
    nome_responsavel: '',
    parentesco_responsavel: '',
  });
  const [sucessoSalvarTelefones, setSucessoSalvarTelefones] = useState(false);

  const handleAbrirEditarTelefones = (est: typeof estudantes[0]) => {
    setEstudanteEditarTelefones(est);
    setFormTelefones({
      telefone_responsavel: est.telefone_responsavel || '',
      telefone_2: est.telefone_2 || '',
      telefone_3: est.telefone_3 || '',
      telefone_4: est.telefone_4 || '',
      nome_responsavel: est.nome_responsavel || '',
      parentesco_responsavel: est.parentesco_responsavel || 'Mãe',
    });
    setSucessoSalvarTelefones(false);
    setModalEditarTelefonesAberto(true);
  };

  const handleSalvarTelefones = (e: React.FormEvent) => {
    e.preventDefault();
    if (!estudanteEditarTelefones) return;

    updateEstudante(estudanteEditarTelefones.id, {
      telefone_responsavel: formTelefones.telefone_responsavel,
      telefone_2: formTelefones.telefone_2,
      telefone_3: formTelefones.telefone_3,
      telefone_4: formTelefones.telefone_4,
      nome_responsavel: formTelefones.nome_responsavel,
      parentesco_responsavel: formTelefones.parentesco_responsavel,
    });

    setSucessoSalvarTelefones(true);
    setTimeout(() => {
      setModalEditarTelefonesAberto(false);
      setSucessoSalvarTelefones(false);
      setEstudanteEditarTelefones(null);
    }, 1200);
  };

  const formatarMensagemInclusao = (
    tipo: 'aee' | 'laudo' | 'reuniao' | 'livre',
    aluno: typeof estudantes[0]
  ) => {
    const nomeResp = aluno.nome_responsavel || aluno.filiacao_materna || 'Responsável';
    const tInfo = obterInfoTurma(aluno.turma_id, aluno.turma_nome);
    const laudoTexto = aluno.laudo_descricao || 'acompanhamento educacional individualizado';
    const cfg = escolaConfig?.modelos_whatsapp;

    let template = '';
    switch (tipo) {
      case 'aee':
        template = cfg?.inclusao_aee || MODELOS_WHATSAPP_INCLUSAO_PADRAO.inclusao_aee;
        break;
      case 'laudo':
        template = cfg?.inclusao_laudo || MODELOS_WHATSAPP_INCLUSAO_PADRAO.inclusao_laudo;
        break;
      case 'reuniao':
        template = cfg?.inclusao_reuniao || MODELOS_WHATSAPP_INCLUSAO_PADRAO.inclusao_reuniao;
        break;
      case 'livre':
        template = cfg?.inclusao_livre || MODELOS_WHATSAPP_INCLUSAO_PADRAO.inclusao_livre;
        break;
    }

    return template
      .replace(/{Responsável}|{Responsavel}/g, nomeResp)
      .replace(/{Aluno}/g, aluno.nome_completo)
      .replace(/{Turma}/g, tInfo.nome)
      .replace(/{Laudo}/g, laudoTexto);
  };

  const handleAbrirWhatsAppInclusao = (aluno: typeof estudantes[0]) => {
    setEstudanteWhatsApp(aluno);
    setTemplateAtivoInclusao('aee');
    const msg = formatarMensagemInclusao('aee', aluno);
    setTextoWhatsApp(msg);
    setModalWhatsAppInclusaoAberto(true);
  };

  const handleMudarTemplateInclusao = (tipo: 'aee' | 'laudo' | 'reuniao' | 'livre') => {
    setTemplateAtivoInclusao(tipo);
    if (estudanteWhatsApp) {
      setTextoWhatsApp(formatarMensagemInclusao(tipo, estudanteWhatsApp));
    }
  };

  const handleEnviarWhatsAppDireto = () => {
    if (!estudanteWhatsApp) return;
    const rawTel = estudanteWhatsApp.telefone_responsavel || '';
    const cleanTel = rawTel.replace(/\D/g, '');
    if (!cleanTel) {
      alert('Este estudante não possui telefone de contato cadastrado!');
      return;
    }
    const ddiTel = cleanTel.startsWith('55') ? cleanTel : `55${cleanTel}`;
    const url = `https://wa.me/${ddiTel}?text=${encodeURIComponent(textoWhatsApp)}`;
    window.open(url, '_blank');
    setModalWhatsAppInclusaoAberto(false);
  };

  // 3. Gráfico 2: Auditoria Cadastral & Conformidade (Donut)
  const auditoria = useMemo(() => {
    if (totalEstudantes === 0) {
      return {
        comLaudo: { qtd: 0, pct: 0 },
        semFiliacao: { qtd: 0, pct: 0 },
        regulares: { qtd: 0, pct: 0 },
      };
    }

    const comLaudo = estudantes.filter(e => e.possui_laudo || e.aee).length;
    const semFiliacao = estudantes.filter(e => (!e.filiacao_materna || e.filiacao_materna.trim() === '') || (!e.filiacao_paterna || e.filiacao_paterna.trim() === '')).length;
    const regulares = Math.max(0, totalEstudantes - semFiliacao);

    return {
      comLaudo: {
        qtd: comLaudo,
        pct: Math.round((comLaudo / totalEstudantes) * 100),
      },
      semFiliacao: {
        qtd: semFiliacao,
        pct: Math.round((semFiliacao / totalEstudantes) * 100),
      },
      regulares: {
        qtd: regulares,
        pct: Math.round((regulares / totalEstudantes) * 100),
      },
    };
  }, [estudantes, totalEstudantes]);

  // 4. Faltas Registradas no Dia
  const hojeStr = new Date().toISOString().split('T')[0];
  const faltasHoje = useMemo(() => {
    return faltasProfessores.filter(f => f.data_falta === hojeStr || f.data_falta.startsWith(hojeStr));
  }, [faltasProfessores, hojeStr]);

  // Se o usuário ativo for Professor, exibe o painel docente exclusivo com Banner de Alertas Críticos
  if (role === 'professor') {
    return <ProfessorDashboard />;
  }

  return (
    <div className="space-y-6">

      {/* Cartões Rápidos de Métricas (KPIs) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Estudantes (Ativos) */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md dark:border-school-dark-border dark:bg-school-dark-surface">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total de Estudantes
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-school-blue-50 text-school-blue-700 dark:bg-school-blue-950 dark:text-school-blue-400">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 dark:text-white">
              {estudantesAtivos}
            </span>
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              estudantes ativos
            </span>
          </div>
          <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
            {totalEstudantes} registros no total • {totalEstudantes - estudantesAtivos} transferidos/inativos
          </p>
        </div>

        {/* Turmas Ativas */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md dark:border-school-dark-border dark:bg-school-dark-surface">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Turmas Ativas
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-school-gold-600 dark:bg-amber-950/60 dark:text-school-gold-400">
              <BookOpen className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 dark:text-white">
              {totalTurmas}
            </span>
            <span className="text-xs font-semibold text-slate-500">
              Turnos M/T/N
            </span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
            <span>Manhã ({dadosPorTurno.contagem.manha})</span> •
            <span>Tarde ({dadosPorTurno.contagem.tarde})</span> •
            <span>Noite ({dadosPorTurno.contagem.noite})</span>
          </div>
        </div>

        {/* Eventos Próximos */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md dark:border-school-dark-border dark:bg-school-dark-surface">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Eventos Próximos
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-400">
              <Calendar className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 dark:text-white">
              {eventosProximos.length}
            </span>
            <span className="text-xs font-semibold text-purple-600 dark:text-purple-400">
              próximos 30 dias
            </span>
          </div>
          <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
            {eventosProximos[0]?.titulo || 'Sem eventos iminentes'}
          </p>
        </div>

        {/* Quantitativo de Estudantes Laudados e Elegíveis */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md dark:border-school-dark-border dark:bg-school-dark-surface">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Laudados & Elegíveis
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400 border border-red-200/60 dark:border-red-800/60">
              <HeartHandshake className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 dark:text-white">
              {totalLaudadosEElegiveis}
            </span>
            <span className="text-xs font-bold text-red-600 dark:text-red-400">
              estudantes
            </span>
          </div>
          <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
            <strong className="text-red-600 dark:text-red-400">{totalLaudados} com laudo</strong> • {totalElegiveisAee} elegíveis ao AEE
          </p>
        </div>
      </div>

      {/* Módulo de Gestão: Relatórios Pedagógicos Colaborativos com IA & Reposições Docentes */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Card 1: Relatórios Pedagógicos Colaborativos com IA */}
        <div className="rounded-2xl border border-indigo-200/80 bg-gradient-to-br from-indigo-50/50 via-white to-purple-50/30 p-6 shadow-sm dark:border-indigo-900/50 dark:bg-school-dark-surface dark:from-slate-900/50">
          <div className="flex items-center justify-between border-b border-indigo-100 pb-4 dark:border-indigo-950">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-600/30">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Relatórios Pedagógicos Colaborativos (IA)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Pareceres docentes com polimento e consolidação automatizada
                </p>
              </div>
            </div>
            <Link
              href="/estudantes"
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/80 dark:text-indigo-300 dark:hover:bg-indigo-900 transition-colors"
            >
              <span>Gerenciar</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-indigo-100 bg-white/80 p-3.5 dark:border-indigo-900/40 dark:bg-slate-800/60">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
                Solicitações
              </span>
              <div className="mt-1 text-2xl font-black text-slate-900 dark:text-white">
                {solicitacoesRelatorio?.length || 0}
              </div>
              <span className="text-[10px] text-slate-500">Processos ativos</span>
            </div>

            <div className="rounded-xl border border-emerald-100 bg-white/80 p-3.5 dark:border-emerald-900/40 dark:bg-slate-800/60">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                Entregues
              </span>
              <div className="mt-1 text-2xl font-black text-emerald-600 dark:text-emerald-400">
                {relatoriosProfessores?.filter(r => r.status === 'enviado').length || 0}
              </div>
              <span className="text-[10px] text-slate-500">Pareceres recebidos</span>
            </div>

            <div className="rounded-xl border border-amber-100 bg-white/80 p-3.5 dark:border-amber-900/40 dark:bg-slate-800/60">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                Pendentes
              </span>
              <div className="mt-1 text-2xl font-black text-amber-600 dark:text-amber-400">
                {relatoriosProfessores?.filter(r => r.status === 'pendente').length || 0}
              </div>
              <span className="text-[10px] text-slate-500">Aguardando docente</span>
            </div>
          </div>

          <div className="mt-4 rounded-xl bg-indigo-50/70 p-3 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40 flex items-center justify-between text-xs">
            <span className="text-indigo-900 dark:text-indigo-200">
              ⚡ Consolidação de pareceres com Gemini API e exportação direta em padrão DOCX institucional.
            </span>
            <Link 
              href="/estudantes"
              className="text-xs font-bold text-indigo-700 dark:text-indigo-300 hover:underline flex-shrink-0 ml-2"
            >
              Acessar Módulo &rarr;
            </Link>
          </div>
        </div>

        {/* Card 2: Frequência Docente & Reposições (Regra 30 Dias) */}
        <div className="rounded-2xl border border-rose-200/80 bg-gradient-to-br from-rose-50/40 via-white to-amber-50/30 p-6 shadow-sm dark:border-rose-900/50 dark:bg-school-dark-surface dark:from-slate-900/50">
          <div className="flex items-center justify-between border-b border-rose-100 pb-4 dark:border-rose-950">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-600 text-white shadow-md shadow-rose-600/30">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Frequência Docente & Reposições (Regra 30d)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Tolerância de 30 dias para aulas de reposição e atestados
                </p>
              </div>
            </div>
            <Link
              href="/professores"
              className="inline-flex items-center gap-1.5 rounded-xl bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 dark:bg-rose-950/80 dark:text-rose-300 dark:hover:bg-rose-900 transition-colors"
            >
              <span>Ver Docentes</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-rose-100 bg-white/80 p-3.5 dark:border-rose-900/40 dark:bg-slate-800/60">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300">
                A Repor
              </span>
              <div className="mt-1 text-2xl font-black text-rose-600 dark:text-rose-400">
                {reposicoesAulas?.filter(r => r.status === 'pendente').reduce((acc, curr) => acc + curr.aulas_total, 0) || 0}
              </div>
              <span className="text-[10px] text-slate-500">Aulas pendentes</span>
            </div>

            <div className="rounded-xl border border-amber-100 bg-white/80 p-3.5 dark:border-amber-900/40 dark:bg-slate-800/60">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                Vencendo
              </span>
              <div className="mt-1 text-2xl font-black text-amber-600 dark:text-amber-400">
                {reposicoesAulas?.filter(r => {
                  if (r.status !== 'pendente') return false;
                  const diff = Math.ceil((new Date(r.data_limite).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                  return diff >= 0 && diff <= 5;
                }).length || 0}
              </div>
              <span className="text-[10px] text-slate-500">≤ 5 dias restantes</span>
            </div>

            <div className="rounded-xl border border-red-200 bg-red-50/60 p-3.5 dark:border-red-900/50 dark:bg-red-950/40">
              <span className="text-[10px] font-bold uppercase tracking-wider text-red-700 dark:text-red-400">
                Vencidas
              </span>
              <div className="mt-1 text-2xl font-black text-red-600 dark:text-red-400">
                {reposicoesAulas?.filter(r => {
                  if (r.status !== 'pendente') return false;
                  const diff = Math.ceil((new Date(r.data_limite).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                  return diff < 0;
                }).length || 0}
              </div>
              <span className="text-[10px] text-red-600 dark:text-red-400 font-bold">Prazo expirado</span>
            </div>
          </div>

          {/* Reposições aguardando homologação */}
          <div className="mt-4 space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Reposições Pendentes de Homologação:
            </span>
            {reposicoesAulas?.filter(r => r.status === 'pendente').slice(0, 2).map((rep) => {
              const prof = professores.find(p => p.id === rep.professor_id);
              const diffDias = Math.ceil((new Date(rep.data_limite).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
              const vencida = diffDias < 0;
              return (
                <div key={rep.id} className="flex items-center justify-between rounded-xl bg-white/90 p-2.5 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 text-xs">
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{prof?.nome || 'Professor'}</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                      {rep.aulas_total} aula(s) • Limite: {new Date(rep.data_limite + 'T00:00:00').toLocaleDateString('pt-BR')} 
                      {' '}({vencida ? <strong className="text-red-600">Vencido</strong> : `${diffDias}d restantes`})
                    </span>
                  </div>
                  <button
                    onClick={() => homologarReposicaoAula(rep.id, true)}
                    className="rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-emerald-700 transition-colors"
                  >
                    Homologar
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Seção Gráfica: Gráfico 1 (Barras) e Gráfico 2 (Donut / Rosca) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Gráfico 1 (Barras): Distribuição por Turma e por Turno Agrupada por Grupo (Oculto se Inclusão estiver em Área Expandida) */}
        <div className={`rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-school-dark-border dark:bg-school-dark-surface transition-all duration-300 ${inclusaoExpandido ? 'hidden' : 'lg:col-span-7'}`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4 dark:border-slate-800">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-school-blue-600 dark:text-school-gold-400" />
                Distribuição de Estudantes por Turma & Capacidade
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Agrupado por <strong>Grupo da Turma</strong> com totais consolidados de ocupação, vagas e laudos
              </p>
            </div>
            {/* Legenda de Turnos */}
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                <span className="h-2.5 w-2.5 rounded-full bg-school-blue-600" /> Manhã
              </span>
              <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                <span className="h-2.5 w-2.5 rounded-full bg-school-gold-500" /> Tarde
              </span>
              <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                <span className="h-2.5 w-2.5 rounded-full bg-slate-700 dark:bg-slate-400" /> Noite
              </span>
            </div>
          </div>

          {/* Grupos de Turmas com seus Totais */}
          <div className="mt-6 space-y-6">
            {dadosPorGrupoETurma.grupos.map((grupo) => {
              return (
                <div
                  key={grupo.nomeGrupo}
                  className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/40 space-y-3.5 shadow-sm"
                >
                  {/* Cabeçalho do Grupo com Totais em Destaque */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200/70 dark:border-slate-800">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-school-blue-100 text-school-blue-800 dark:bg-school-blue-950 dark:text-school-blue-300 font-black text-xs border border-school-blue-200/70 dark:border-school-blue-800/60 shadow-sm">
                        <Users className="h-4 w-4" />
                      </span>
                      <div>
                        <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wide">
                          Grupo: {grupo.nomeGrupo}
                        </h4>
                        <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                          {grupo.turmas.length} {grupo.turmas.length === 1 ? 'turma vinculada' : 'turmas vinculadas'}
                        </span>
                      </div>
                    </div>

                    {/* Indicadores / Totais do Grupo */}
                    <div className="flex items-center gap-1.5 flex-wrap text-xs">
                      <span className="inline-flex items-center rounded-lg bg-white px-2.5 py-1 text-[11px] font-bold text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 shadow-sm">
                        Total: <strong className="ml-1 text-slate-900 dark:text-white font-mono">{grupo.totalAlunos}</strong>/{grupo.totalCapacidade} ({grupo.ocupacao}%)
                      </span>
                      <span className="inline-flex items-center rounded-lg bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60">
                        {grupo.totalVagasRestantes} {grupo.totalVagasRestantes === 1 ? 'vaga restante' : 'vagas restantes'}
                      </span>
                      <span className="inline-flex items-center rounded-lg bg-red-50 px-2 py-1 text-[11px] font-bold text-red-700 dark:bg-red-950/60 dark:text-red-300 border border-red-200/60 dark:border-red-800/60">
                        {grupo.totalComLaudo} com laudo
                      </span>
                    </div>
                  </div>

                  {/* Barra Consolidada de Ocupação do Grupo */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                      <span>Ocupação Total do Grupo</span>
                      <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{grupo.ocupacao}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-800">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-school-blue-600 to-indigo-600 transition-all duration-500"
                        style={{ width: `${Math.max(3, grupo.ocupacao)}%` }}
                      />
                    </div>
                  </div>

                  {/* Lista das Turmas do Grupo */}
                  <div className="space-y-2.5 pt-1">
                    {grupo.turmas.map((turma) => {
                      const corBarra =
                        turma.turno === 'manha'
                          ? 'bg-school-blue-600'
                          : turma.turno === 'tarde'
                            ? 'bg-school-gold-500'
                            : 'bg-slate-700 dark:bg-slate-400';

                      return (
                        <div
                          key={turma.id}
                          className="rounded-xl bg-white p-3 dark:bg-slate-800/70 border border-slate-100 dark:border-slate-800 shadow-sm space-y-1.5"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              {turma.nome}
                              <span className="ml-2 text-[10px] font-normal uppercase text-slate-400">
                                ({turma.turno})
                              </span>
                            </span>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-mono font-medium text-slate-600 dark:text-slate-400 text-[11px]">
                                <strong className="text-slate-900 dark:text-white">{turma.alunos}</strong> / {turma.capacidade} alunos ({turma.ocupacao}%)
                              </span>
                              <span className="inline-flex items-center rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60">
                                {turma.vagasRestantes} {turma.vagasRestantes === 1 ? 'vaga' : 'vagas'}
                              </span>
                              <span className="inline-flex items-center rounded-md bg-red-50 px-1.5 py-0.5 text-[10px] font-bold text-red-700 dark:bg-red-950/60 dark:text-red-300 border border-red-200/60 dark:border-red-800/60">
                                {turma.comLaudo} laudo
                              </span>
                            </div>
                          </div>
                          {/* Barra de Progresso com Preenchimento Dinâmico */}
                          <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700/60 p-0.5 border border-slate-200/50 dark:border-slate-600/50">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${corBarra}`}
                              style={{ width: `${Math.max(5, turma.ocupacao)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-xl bg-blue-50/60 p-2.5 dark:bg-blue-950/40">
              <span className="block text-[11px] font-medium text-school-blue-700 dark:text-school-blue-400">Turno Manhã</span>
              <strong className="text-lg font-black text-slate-900 dark:text-white">{dadosPorTurno.contagem.manha}</strong> alunos
            </div>
            <div className="rounded-xl bg-amber-50/60 p-2.5 dark:bg-amber-950/40">
              <span className="block text-[11px] font-medium text-school-gold-700 dark:text-school-gold-400">Turno Tarde</span>
              <strong className="text-lg font-black text-slate-900 dark:text-white">{dadosPorTurno.contagem.tarde}</strong> alunos
            </div>
            <div className="rounded-xl bg-slate-100/60 p-2.5 dark:bg-slate-800/40">
              <span className="block text-[11px] font-medium text-slate-600 dark:text-slate-400">Turno Noite</span>
              <strong className="text-lg font-black text-slate-900 dark:text-white">{dadosPorTurno.contagem.noite}</strong> alunos
            </div>
          </div>
        </div>

        {/* Bloco: Inclusão (Estudantes com Laudo Médico & Disparo WhatsApp) - Suporte a Expansão e Recolhimento */}
        <div className={`rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-school-dark-border dark:bg-school-dark-surface transition-all duration-300 flex flex-col justify-between ${
          inclusaoExpandido ? 'lg:col-span-12 ring-2 ring-emerald-500/25 shadow-md' : 'lg:col-span-5'
        }`}>
          <div>
            <div className="border-b border-slate-100 pb-4 dark:border-slate-800 flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60 shrink-0">
                  <HeartHandshake className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    Inclusão
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Estudantes com laudo médico, AEE e contato direto
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-extrabold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60">
                  {totalLaudoMarcado} laudo(s) ({pctAlunadoComLaudoMarcado}%)
                </span>

                {/* Controles: Área Estendida (Maximize/Minimize) & Recolher/Expandir (Accordion) */}
                <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-700 dark:bg-slate-800/60">
                  <button
                    type="button"
                    onClick={() => {
                      setInclusaoExpandido((prev) => !prev);
                      if (inclusaoRecolhido) setInclusaoRecolhido(false);
                    }}
                    className={`rounded-lg p-1.5 transition-all ${
                      inclusaoExpandido
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-500 hover:bg-slate-200/70 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-white'
                    }`}
                    title={inclusaoExpandido ? 'Restaurar layout padrão (5 colunas)' : 'Expandir bloco de Inclusão (Área Estendida 12 colunas)'}
                    aria-label={inclusaoExpandido ? 'Restaurar layout padrão' : 'Expandir bloco'}
                  >
                    {inclusaoExpandido ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setInclusaoRecolhido((prev) => !prev)}
                    className={`rounded-lg p-1.5 transition-all ${
                      inclusaoRecolhido
                        ? 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200'
                        : 'text-slate-500 hover:bg-slate-200/70 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-white'
                    }`}
                    title={inclusaoRecolhido ? 'Expandir conteúdo do bloco' : 'Recolher conteúdo do bloco (Accordion)'}
                    aria-label={inclusaoRecolhido ? 'Expandir conteúdo' : 'Recolher conteúdo'}
                  >
                    {inclusaoRecolhido ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Conteúdo Expansível / Recolhível */}
            {!inclusaoRecolhido && (
              <div className="transition-all duration-300">
                {/* Banner Informativo Rápido */}
                <div className="mt-4 flex items-center justify-between rounded-xl bg-emerald-50/70 p-3 text-xs dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/50">
                  <div className="flex items-center gap-2">
                    <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="font-semibold text-emerald-900 dark:text-emerald-200">
                      Laudo Médico Homologado
                    </span>
                  </div>
                  <span className="font-bold text-emerald-700 dark:text-emerald-300">
                    {pctAlunadoComLaudoMarcado}% do alunado ({totalLaudoMarcado} estudantes)
                  </span>
                </div>

                {/* Lista dos Estudantes com Laudo Médico */}
                <div className="mt-4">
                  {estudantesComLaudo.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                      <CheckCircle2 className="h-10 w-10 text-emerald-500 mb-2" />
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                        Nenhum estudante com laudo cadastrado
                      </p>
                      <p className="text-xs text-slate-500">
                        Todos os cadastros estão regulares no setor pedagógico.
                      </p>
                    </div>
                  ) : (
                    <div className={
                      inclusaoExpandido
                        ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5 max-h-[620px] overflow-y-auto pr-1"
                        : "space-y-3 max-h-[380px] overflow-y-auto pr-1"
                    }>
                      {estudantesComLaudo.map((est) => {
                        const turmaInfo = obterInfoTurma(est.turma_id, est.turma_nome);
                        const temTelefone = Boolean(est.telefone_responsavel && est.telefone_responsavel.trim() !== '');

                        return (
                          <div
                            key={est.id}
                            onClick={() => handleAbrirWhatsAppInclusao(est)}
                            className="group relative cursor-pointer rounded-2xl border border-emerald-200/80 bg-white p-4 transition-all hover:border-emerald-500 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/80 dark:hover:border-emerald-600 flex flex-col justify-between"
                            title="Clique para abrir a tela de envio do WhatsApp"
                          >
                            <div>
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                  {/* Nome Completo e Turma */}
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h4 className="text-sm font-black text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                                      {est.nome_completo}
                                    </h4>
                                    <span className="inline-flex items-center gap-1 rounded-md bg-school-blue-50 px-2 py-0.5 text-[10px] font-bold text-school-blue-700 dark:bg-school-blue-950 dark:text-school-blue-300 border border-school-blue-200/60 dark:border-school-blue-800/60">
                                      <GraduationCap className="h-3 w-3" />
                                      {turmaInfo.nome}
                                    </span>
                                    {est.aee && (
                                      <span className="rounded-md bg-purple-100 px-1.5 py-0.5 text-[10px] font-extrabold text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                                        AEE
                                      </span>
                                    )}
                                  </div>

                                  {/* Informações Rápidas: Laudo Médico */}
                                  <div className="mt-2 rounded-xl bg-slate-50 p-2.5 text-xs text-slate-700 dark:bg-slate-800/70 dark:text-slate-300 border border-slate-100 dark:border-slate-700/50">
                                    <span className="font-bold text-emerald-700 dark:text-emerald-400">
                                      Laudo:{' '}
                                    </span>
                                    <span>{est.laudo_descricao || 'Laudo médico registrado na ficha do estudante'}</span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Telefone de Contato e Ação WhatsApp */}
                            <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs flex-wrap gap-2">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                  Contato:
                                </span>
                                {temTelefone ? (
                                  <span className="inline-flex items-center gap-1 font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded-lg border border-emerald-200/60 dark:border-emerald-800/60 font-mono text-[11px]">
                                    <Phone className="h-3 w-3 text-emerald-600" />
                                    {est.telefone_responsavel}
                                  </span>
                                ) : (
                                  <span className="text-rose-500 font-semibold italic text-[11px]">
                                    Sem telefone cadastrado
                                  </span>
                                )}
                                {est.nome_responsavel && (
                                  <span className="text-[11px] text-slate-400 truncate max-w-[130px]">
                                    ({est.nome_responsavel})
                                  </span>
                                )}
                              </div>

                              {/* Botão Enviar WhatsApp */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAbrirWhatsAppInclusao(est);
                                }}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 active:scale-95 transition-all"
                              >
                                <MessageSquare className="h-3.5 w-3.5" />
                                <span>Enviar WhatsApp</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {!inclusaoRecolhido && (
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <span>Clique no card ou no botão para abrir o WhatsApp</span>
              <Link href="/estudantes?filtroAee=com_aee" className="font-semibold text-emerald-700 hover:underline dark:text-emerald-400">
                Ver Todos da Inclusão →
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Seção de Pendências & Alertas Cadastrais: Sem CPF, Sem Foto & Sem Telefone de Contato */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Bloco: Estudantes sem CPF Cadastrado */}
        <div className="rounded-2xl border border-amber-200/80 bg-amber-50/25 p-6 shadow-sm dark:border-amber-900/40 dark:bg-amber-950/15 flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-200/50 pb-4 dark:border-amber-900/30">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 flex-shrink-0 border border-amber-200/60 dark:border-amber-900/60">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    Estudantes sem CPF
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Controles oficiais e programas sociais (Bolsa Família)
                  </p>
                </div>
              </div>

              <span className={`self-start sm:self-auto inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${estudantesSemCpf.length > 0
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                  : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                }`}>
                {estudantesSemCpf.length} sem CPF
              </span>
            </div>

            {/* Alerta de Extrema Necessidade */}
            <div className="mt-3 rounded-xl bg-amber-100/60 p-2.5 text-[11px] text-amber-900 dark:bg-amber-950/60 dark:text-amber-200 border border-amber-200/60 dark:border-amber-900/50 leading-relaxed">
              ⚠️ <strong>Atenção:</strong> É de extrema necessidade termos o número do CPF do estudante na escola para controles oficiais e acompanhamento de programas sociais.
            </div>

            {/* Lista dos Estudantes sem CPF */}
            <div className="mt-4">
              {estudantesSemCpf.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <CheckCircle2 className="h-10 w-10 text-emerald-500 mb-2" />
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    Todos os CPFs cadastrados!
                  </p>
                  <p className="text-xs text-slate-500">
                    Todos os estudantes matriculados possuem número de CPF no sistema.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
                  {estudantesSemCpf.map((est) => {
                    const turmaInfo = obterInfoTurma(est.turma_id, est.turma_nome);
                    const temTelefone = !!(est.telefone_responsavel && est.telefone_responsavel.trim() !== '');

                    return (
                      <div
                        key={est.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border border-amber-200/60 bg-white p-3 text-xs dark:border-amber-900/40 dark:bg-slate-900/80 hover:bg-amber-50/40 dark:hover:bg-slate-800/60 transition-colors shadow-sm"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100/80 text-amber-700 dark:bg-amber-950 dark:text-amber-300 font-bold flex-shrink-0">
                            <FileText className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-bold text-slate-900 dark:text-white truncate" title={est.nome_completo}>
                              {est.nome_completo}
                            </h4>
                            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                              <span className="inline-flex items-center gap-1 rounded-md bg-school-blue-50 px-2 py-0.5 text-[11px] font-bold text-school-blue-700 dark:bg-school-blue-950 dark:text-school-blue-300 border border-school-blue-200/60 dark:border-school-blue-800/60">
                                <GraduationCap className="h-3 w-3" />
                                {turmaInfo.nome}
                              </span>
                              {turmaInfo.turno && (
                                <span className="text-[10px] font-medium text-slate-400">
                                  • {turmaInfo.turno}
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                              Resp: <strong className="text-slate-700 dark:text-slate-300">{est.nome_responsavel || 'Não informado'}</strong>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 flex-shrink-0 self-end sm:self-center">
                          <button
                            type="button"
                            onClick={() => handleEnviarWhatsAppCpf(est)}
                            disabled={!temTelefone}
                            title={temTelefone ? 'Notificar responsável via WhatsApp sobre necessidade do CPF' : 'Responsável sem telefone cadastrado'}
                            className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-bold shadow-sm transition-all ${temTelefone
                                ? 'bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95'
                                : 'bg-slate-200 text-slate-400 cursor-not-allowed dark:bg-slate-800 dark:text-slate-600'
                              }`}
                          >
                            <MessageSquare className="h-3.5 w-3.5" />
                            <span>WhatsApp</span>
                          </button>
                          <Link
                            href={`/estudantes?editar=${est.id}`}
                            className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-[11px] font-bold text-amber-900 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-200 dark:hover:bg-amber-900/80 transition-all shadow-sm active:scale-95"
                            title={`Editar dados do estudante ${est.nome_completo}`}
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                            <span>Editar</span>
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-amber-200/50 dark:border-amber-900/30 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span>Cobrança direta com texto pré-definido</span>
            <Link href="/estudantes" className="font-semibold text-amber-700 hover:underline dark:text-amber-400">
              Ir para Estudantes →
            </Link>
          </div>
        </div>

        {/* Bloco 2: Estudantes sem Foto Cadastrada */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-school-dark-border dark:bg-school-dark-surface flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400 flex-shrink-0 border border-amber-200/60 dark:border-amber-900/60">
                  <CameraOff className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    Estudantes sem Foto Cadastrada
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Necessário para o Fotograma da Turma, carteirinha e crachá
                  </p>
                </div>
              </div>

              <span className={`self-start sm:self-auto inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${estudantesSemFoto.length > 0
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                  : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                }`}>
                {estudantesSemFoto.length} pendente(s)
              </span>
            </div>

            {/* Lista dos Estudantes sem Foto */}
            <div className="mt-4">
              {estudantesSemFoto.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <CheckCircle2 className="h-10 w-10 text-emerald-500 mb-2" />
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    Todas as fotos cadastradas!
                  </p>
                  <p className="text-xs text-slate-500">
                    Todos os estudantes matriculados possuem fotografia atualizada no sistema.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
                  {estudantesSemFoto.map((est) => {
                    const turmaInfo = obterInfoTurma(est.turma_id, est.turma_nome);
                    return (
                      <div
                        key={est.id}
                        className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-slate-50/70 p-3 text-xs dark:border-slate-800 dark:bg-slate-900/60 hover:bg-slate-100/70 dark:hover:bg-slate-800/60 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100/80 text-amber-700 dark:bg-amber-950 dark:text-amber-300 font-bold flex-shrink-0">
                            <CameraOff className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-bold text-slate-900 dark:text-white truncate" title={est.nome_completo}>
                              {est.nome_completo}
                            </h4>
                            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                              <span className="inline-flex items-center gap-1 rounded-md bg-school-blue-50 px-2 py-0.5 text-[11px] font-bold text-school-blue-700 dark:bg-school-blue-950 dark:text-school-blue-300 border border-school-blue-200/60 dark:border-school-blue-800/60">
                                <GraduationCap className="h-3 w-3" />
                                {turmaInfo.nome}
                              </span>
                              {turmaInfo.turno && (
                                <span className="text-[10px] font-medium text-slate-400">
                                  • {turmaInfo.turno}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                          <Link
                            href="/estudantes"
                            className="inline-flex items-center gap-1 rounded-lg bg-school-blue-600 px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-school-blue-700 shadow-sm transition-colors"
                          >
                            Anexar Foto
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span>Para atualizar fotos em lote, use o Fotograma da Turma</span>
            <Link href="/fotograma" className="font-semibold text-school-blue-600 hover:underline dark:text-school-gold-400">
              Ir para Fotograma →
            </Link>
          </div>
        </div>

        {/* Bloco 2: Alertas: Estudantes sem Telefone de Contato */}
        <div className="rounded-2xl border border-rose-200/80 bg-rose-50/20 p-6 shadow-sm dark:border-rose-900/40 dark:bg-rose-950/15 flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-rose-200/50 pb-4 dark:border-rose-900/30">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400 flex-shrink-0 border border-rose-200/60 dark:border-rose-900/60">
                  <PhoneOff className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    Alertas: Sem Telefone de Contato
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Contatos de emergência e canal com a família não informados
                  </p>
                </div>
              </div>

              <span className={`self-start sm:self-auto inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${estudantesSemTelefone.length > 0
                  ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/70 dark:text-rose-200 border border-rose-200 dark:border-rose-800 animate-pulse'
                  : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                }`}>
                <AlertTriangle className="h-3 w-3" />
                {estudantesSemTelefone.length} sem telefone
              </span>
            </div>

            {/* Lista dos Estudantes sem Telefone */}
            <div className="mt-4">
              {estudantesSemTelefone.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <CheckCircle2 className="h-10 w-10 text-emerald-500 mb-2" />
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    Nenhum alerta de contato!
                  </p>
                  <p className="text-xs text-slate-500">
                    Todos os estudantes possuem telefone do responsável registrado para emergências.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
                  {estudantesSemTelefone.map((est) => {
                    const turmaInfo = obterInfoTurma(est.turma_id, est.turma_nome);
                    return (
                      <div
                        key={est.id}
                        className="flex items-center justify-between rounded-xl border border-rose-200/60 bg-white p-3 text-xs dark:border-rose-900/40 dark:bg-slate-900/80 hover:bg-rose-50/40 dark:hover:bg-slate-800/60 transition-colors shadow-sm"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100/80 text-rose-700 dark:bg-rose-950 dark:text-rose-300 font-bold flex-shrink-0">
                            <PhoneOff className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-bold text-slate-900 dark:text-white truncate" title={est.nome_completo}>
                              {est.nome_completo}
                            </h4>
                            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                              <span className="inline-flex items-center gap-1 rounded-md bg-school-blue-50 px-2 py-0.5 text-[11px] font-bold text-school-blue-700 dark:bg-school-blue-950 dark:text-school-blue-300 border border-school-blue-200/60 dark:border-school-blue-800/60">
                                <GraduationCap className="h-3 w-3" />
                                {turmaInfo.nome}
                              </span>
                              {turmaInfo.turno && (
                                <span className="text-[10px] font-medium text-slate-400">
                                  • {turmaInfo.turno}
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                              Responsável: <strong className="text-slate-700 dark:text-slate-300">{est.nome_responsavel || 'Não cadastrado'}</strong>
                              {est.parentesco_responsavel ? ` (${est.parentesco_responsavel})` : ''}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                          <button
                            type="button"
                            onClick={() => handleAbrirEditarTelefones(est)}
                            className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-rose-700 shadow-sm transition-all active:scale-95"
                            title="Informar telefones de contato deste estudante"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                            <span>Editar</span>
                          </button>
                          <Link
                            href={`/estudantes?editar=${est.id}`}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 transition-colors shadow-sm"
                            title="Abrir ficha na tela de estudantes"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-rose-200/50 dark:border-rose-900/30 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span>Alerta crítico de segurança e conformidade escolar</span>
            <Link href="/estudantes" className="font-semibold text-rose-600 hover:underline dark:text-rose-400">
              Ir para Estudantes →
            </Link>
          </div>
        </div>
      </div>

      {/* Tabela de Alertas Rápidos: Faltas de Professores no Dia com Atestado */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-school-dark-border dark:bg-school-dark-surface">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Alertas Rápidos: Ausências Docentes Registradas no Dia
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Substituições e atestados de saúde anexados no Google Drive
            </p>
          </div>
          <Link
            href="/professores"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-school-blue-600 hover:text-school-blue-800 dark:text-school-gold-400 dark:hover:underline"
          >
            Ver Ficha Funcional Completa →
          </Link>
        </div>

        {faltasHoje.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <CheckCircle2 className="h-10 w-10 text-emerald-500 mb-2" />
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              Nenhuma ausência docente registrada hoje!
            </p>
            <p className="text-xs text-slate-500">
              Todo o corpo docente está em sala de aula ou em atividades pedagógicas.
            </p>
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                <tr>
                  <th className="rounded-l-xl px-4 py-3">Docente</th>
                  <th className="px-4 py-3">Aulas Ausentes</th>
                  <th className="px-4 py-3">Motivo / Justificativa</th>
                  <th className="px-4 py-3">Atestado no Drive</th>
                  <th className="rounded-r-xl px-4 py-3">Homologação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {faltasHoje.map((falta) => (
                  <tr key={falta.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                      {falta.professor_nome}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-md bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-900 dark:bg-amber-950 dark:text-amber-300">
                        {falta.aulas_faltadas} aula(s)
                      </span>
                    </td>
                    <td className="px-4 py-3 max-w-md">
                      {falta.justificativa}
                    </td>
                    <td className="px-4 py-3">
                      {falta.atestado_drive_link ? (
                        <a
                          href={falta.atestado_drive_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-medium text-school-blue-600 hover:underline dark:text-school-gold-400"
                        >
                          <FileText className="h-3.5 w-3.5" />
                          <span>Ver Atestado</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-slate-400 italic">Pendente</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${falta.homologado
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          }`}
                      >
                        {falta.homologado ? 'Homologado' : 'Em Análise'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Bloco: Estatísticas do Tipo de Histórico Escolar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-school-dark-border dark:bg-school-dark-surface space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-school-blue-600 dark:text-school-gold-400" />
              Estatísticas do Tipo de Histórico Escolar
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Auditoria de conformidade documental: Definitivo, Temporário e Não entregue
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              {statsHistorico.pctDefinitivo}% Regularizados
            </span>
            <Link
              href="/estudantes"
              className="inline-flex items-center gap-1 text-xs font-semibold text-school-blue-600 hover:text-school-blue-800 dark:text-school-gold-400 hover:underline"
            >
              <span>Gerenciar na Secretaria</span>
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* Gráfico de Distribuição Proporcional Composta (Horizontal Stacked Bar) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-slate-700 dark:text-slate-300">Gráfico de Distribuição Documental</span>
            <span className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">Total: {statsHistorico.total} estudantes</span>
          </div>

          {/* Barra Multissegmentada do Gráfico */}
          <div className="flex h-5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800 p-0.5 border border-slate-200/60 dark:border-slate-700/60">
            {statsHistorico.pctDefinitivo > 0 && (
              <div
                style={{ width: `${statsHistorico.pctDefinitivo}%` }}
                className="h-full bg-emerald-500 first:rounded-l-full last:rounded-r-full transition-all duration-500 relative group cursor-pointer"
                title={`Definitivo: ${statsHistorico.definitivo} alunos (${statsHistorico.pctDefinitivo}%)`}
              />
            )}
            {statsHistorico.pctTemporario > 0 && (
              <div
                style={{ width: `${statsHistorico.pctTemporario}%` }}
                className="h-full bg-amber-500 first:rounded-l-full last:rounded-r-full transition-all duration-500 relative group cursor-pointer"
                title={`Temporário: ${statsHistorico.temporario} alunos (${statsHistorico.pctTemporario}%)`}
              />
            )}
            {statsHistorico.pctNaoEntregue > 0 && (
              <div
                style={{ width: `${statsHistorico.pctNaoEntregue}%` }}
                className="h-full bg-rose-500 first:rounded-l-full last:rounded-r-full transition-all duration-500 relative group cursor-pointer"
                title={`Não entregue: ${statsHistorico.naoEntregue} alunos (${statsHistorico.pctNaoEntregue}%)`}
              />
            )}
          </div>

          {/* Legenda Explicativa do Gráfico */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-[11px]">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              <span className="font-semibold text-slate-700 dark:text-slate-300">Definitivo:</span>
              <strong className="text-emerald-700 dark:text-emerald-400">{statsHistorico.definitivo} ({statsHistorico.pctDefinitivo}%)</strong>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
              <span className="font-semibold text-slate-700 dark:text-slate-300">Temporário:</span>
              <strong className="text-amber-700 dark:text-amber-400">{statsHistorico.temporario} ({statsHistorico.pctTemporario}%)</strong>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
              <span className="font-semibold text-slate-700 dark:text-slate-300">Não entregue:</span>
              <strong className="text-rose-700 dark:text-rose-400">{statsHistorico.naoEntregue} ({statsHistorico.pctNaoEntregue}%)</strong>
            </div>
          </div>
        </div>

        {/* Cards de Métricas e Barras de Progresso por Categoria */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Definitivo */}
          <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/40 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/20 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 rounded-md">
                  Histórico Definitivo
                </span>
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>

              <div className="mt-2.5 flex items-baseline gap-2">
                <span className="text-3xl font-black text-emerald-950 dark:text-emerald-200 font-mono">
                  {statsHistorico.definitivo}
                </span>
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                  estudantes ({statsHistorico.pctDefinitivo}%)
                </span>
              </div>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-emerald-200/50 dark:border-emerald-900/40">
              <div className="flex items-center justify-between text-[10px] text-emerald-900 dark:text-emerald-300 font-medium">
                <span>Taxa de Regularidade</span>
                <span>{statsHistorico.pctDefinitivo}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-emerald-200/60 dark:bg-emerald-900/60">
                <div
                  className="h-full rounded-full bg-emerald-600 transition-all duration-500"
                  style={{ width: `${statsHistorico.pctDefinitivo}%` }}
                />
              </div>
              <p className="text-[10px] text-emerald-700 dark:text-emerald-400 pt-0.5">
                Histórico escolar completo arquivado na pasta do aluno.
              </p>
            </div>
          </div>

          {/* Card 2: Temporário */}
          <div className="rounded-2xl border border-amber-200/80 bg-amber-50/40 p-4 dark:border-amber-900/60 dark:bg-amber-950/20 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950 px-2 py-0.5 rounded-md">
                  Histórico Temporário
                </span>
                <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>

              <div className="mt-2.5 flex items-baseline gap-2">
                <span className="text-3xl font-black text-amber-950 dark:text-amber-200 font-mono">
                  {statsHistorico.temporario}
                </span>
                <span className="text-xs font-bold text-amber-700 dark:text-amber-400">
                  estudantes ({statsHistorico.pctTemporario}%)
                </span>
              </div>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-amber-200/50 dark:border-amber-900/40">
              <div className="flex items-center justify-between text-[10px] text-amber-900 dark:text-amber-300 font-medium">
                <span>Declaração Provisória</span>
                <span>{statsHistorico.pctTemporario}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-amber-200/60 dark:bg-amber-900/60">
                <div
                  className="h-full rounded-full bg-amber-500 transition-all duration-500"
                  style={{ width: `${statsHistorico.pctTemporario}%` }}
                />
              </div>
              <p className="text-[10px] text-amber-700 dark:text-amber-400 pt-0.5">
                Declaração provisória de matrícula aguardando envio da via definitiva.
              </p>
            </div>
          </div>

          {/* Card 3: Não entregue */}
          <div className="rounded-2xl border border-rose-200/80 bg-rose-50/40 p-4 dark:border-rose-900/60 dark:bg-rose-950/20 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-800 dark:text-rose-300 bg-rose-100 dark:bg-rose-950 px-2 py-0.5 rounded-md">
                  Não Entregue (Pendente)
                </span>
                <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
              </div>

              <div className="mt-2.5 flex items-baseline gap-2">
                <span className="text-3xl font-black text-rose-950 dark:text-rose-200 font-mono">
                  {statsHistorico.naoEntregue}
                </span>
                <span className="text-xs font-bold text-rose-700 dark:text-rose-400">
                  estudantes ({statsHistorico.pctNaoEntregue}%)
                </span>
              </div>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-rose-200/50 dark:border-rose-900/40">
              <div className="flex items-center justify-between text-[10px] text-rose-900 dark:text-rose-300 font-medium">
                <span>Índice de Pendência</span>
                <span>{statsHistorico.pctNaoEntregue}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-rose-200/60 dark:bg-rose-900/60">
                <div
                  className="h-full rounded-full bg-rose-500 transition-all duration-500"
                  style={{ width: `${statsHistorico.pctNaoEntregue}%` }}
                />
              </div>
              <p className="text-[10px] text-rose-700 dark:text-rose-400 pt-0.5">
                Exige notificação imediata aos responsáveis para saneamento da pasta.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bloco de Aniversariantes do Dia & Celebrações da Comunidade Escolar (ÚLTIMO BLOCO DO DASHBOARD) */}
      <AniversariantesSection
        dataHojeFormatada={dataHojeFormatada}
        hojeCurto={hojeCurto}
        abaAniversario={abaAniversario}
        setAbaAniversario={setAbaAniversario}
        homenagemEnviadaId={homenagemEnviadaId}
        setHomenagemEnviadaId={setHomenagemEnviadaId}
        handleEnviarHomenagem={handleEnviarHomenagem}
        handleSimularHoje={handleSimularHoje}
        dadosAniversarios={dadosAniversarios}
        obterInfoTurma={obterInfoTurma}
      />

      {/* Último Bloco do Dashboard: 10 Próximos Eventos Cadastrados */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-school-dark-border dark:bg-school-dark-surface">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-400 border border-purple-200/60 dark:border-purple-900/60">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                10 Próximos Eventos Cadastrados
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Acompanhamento da agenda pedagógica, reuniões, avaliações e atividades da instituição
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-3 py-1 text-xs font-bold text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/60">
            {dezProximosEventos.length} evento(s) na agenda
          </span>
        </div>

        {dezProximosEventos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Calendar className="h-10 w-10 text-slate-300 dark:text-slate-600 mb-2" />
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              Nenhum evento registrado
            </p>
            <p className="text-xs text-slate-500">
              Os eventos escolares futuros cadastrados aparecerão aqui em ordem cronológica.
            </p>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {dezProximosEventos.map((ev) => {
              const dataEv = new Date(ev.data_inicio);
              const dataFormatada = dataEv.toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              });
              const horaFormatada = dataEv.toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit',
              });

              const badgeCategoria = {
                prova: { label: 'Prova / Avaliação', bg: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60' },
                reuniao: { label: 'Reunião', bg: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60' },
                feriado: { label: 'Feriado / Recesso', bg: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 border border-red-200/60 dark:border-red-800/60' },
                cultural: { label: 'Cultural / Mostra', bg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60' },
              }[ev.categoria] || { label: ev.categoria, bg: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border border-slate-200/60' };

              return (
                <div
                  key={ev.id}
                  className="flex flex-col justify-between rounded-xl border border-slate-200/80 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-900/40 hover:border-purple-300 dark:hover:border-purple-800 transition-all shadow-sm"
                >
                  <div>
                    <div className="flex items-center justify-between gap-1.5 mb-2.5">
                      <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold ${badgeCategoria.bg}`}>
                        {badgeCategoria.label}
                      </span>
                      {horaFormatada !== '00:00' && (
                        <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                          {horaFormatada}
                        </span>
                      )}
                    </div>

                    <h4 className="font-bold text-xs text-slate-900 dark:text-white line-clamp-2" title={ev.titulo}>
                      {ev.titulo}
                    </h4>

                    <p className="mt-1.5 text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2" title={ev.descricao}>
                      {ev.descricao}
                    </p>
                  </div>

                  <div className="mt-4 pt-2.5 border-t border-slate-200/60 dark:border-slate-800/80 flex items-center justify-between text-[11px]">
                    <span className="flex items-center gap-1 font-semibold text-purple-700 dark:text-purple-400">
                      <Clock className="h-3 w-3" />
                      {dataFormatada}
                    </span>
                    {ev.publico_alvo && (
                      <span className="text-[10px] text-slate-400 truncate max-w-[85px]" title={ev.publico_alvo}>
                        {ev.publico_alvo}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL: Enviar WhatsApp - Inclusão & AEE */}
      {modalWhatsAppInclusaoAberto && estudanteWhatsApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-school-dark-surface border border-slate-200 dark:border-slate-800 max-h-[92vh] overflow-y-auto">
            {/* Cabeçalho do Modal */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    Enviar WhatsApp • Setor de Inclusão
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Comunicação rápida com o responsável do estudante
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalWhatsAppInclusaoAberto(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Card com Resumo do Estudante */}
            <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50/50 p-3.5 dark:border-emerald-900/40 dark:bg-emerald-950/20">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      {estudanteWhatsApp.nome_completo}
                    </span>
                    <span className="rounded bg-school-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-school-blue-700 dark:bg-school-blue-950 dark:text-school-blue-300">
                      {obterInfoTurma(estudanteWhatsApp.turma_id, estudanteWhatsApp.turma_nome).nome}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                    <strong className="text-emerald-700 dark:text-emerald-400">Laudo / Condição:</strong>{' '}
                    {estudanteWhatsApp.laudo_descricao || 'Acompanhamento de Inclusão / AEE'}
                  </p>
                </div>

                <div className="text-right flex-shrink-0">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Contato
                  </span>
                  <span className="font-mono text-xs font-black text-emerald-700 dark:text-emerald-400">
                    {estudanteWhatsApp.telefone_responsavel || 'Sem telefone'}
                  </span>
                  {estudanteWhatsApp.nome_responsavel && (
                    <span className="block text-[10px] text-slate-500">
                      ({estudanteWhatsApp.nome_responsavel})
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Seleção de Modelos Rápidos de Mensagem */}
            <div className="mt-4">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                Escolha o Modelo de Mensagem:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => handleMudarTemplateInclusao('aee')}
                  className={`p-2.5 rounded-xl border text-left text-xs font-semibold transition-all ${templateAtivoInclusao === 'aee'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200 ring-2 ring-emerald-500/20'
                      : 'border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                >
                  <span className="block font-bold">Plano AEE</span>
                  <span className="text-[10px] opacity-75">Progresso escolar</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleMudarTemplateInclusao('laudo')}
                  className={`p-2.5 rounded-xl border text-left text-xs font-semibold transition-all ${templateAtivoInclusao === 'laudo'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200 ring-2 ring-emerald-500/20'
                      : 'border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                >
                  <span className="block font-bold">Renovar Laudo</span>
                  <span className="text-[10px] opacity-75">Atualização clínica</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleMudarTemplateInclusao('reuniao')}
                  className={`p-2.5 rounded-xl border text-left text-xs font-semibold transition-all ${templateAtivoInclusao === 'reuniao'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200 ring-2 ring-emerald-500/20'
                      : 'border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                >
                  <span className="block font-bold">Reunião</span>
                  <span className="text-[10px] opacity-75">Agendamento</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleMudarTemplateInclusao('livre')}
                  className={`p-2.5 rounded-xl border text-left text-xs font-semibold transition-all ${templateAtivoInclusao === 'livre'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200 ring-2 ring-emerald-500/20'
                      : 'border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                >
                  <span className="block font-bold">Personalizado</span>
                  <span className="text-[10px] opacity-75">Texto livre</span>
                </button>
              </div>
            </div>

            {/* Prévia no Balão do WhatsApp */}
            <div className="mt-4">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                Prévia da Mensagem (Você pode editar antes de enviar):
              </label>
              <div className="rounded-2xl bg-[#E5DDD5] dark:bg-slate-900 p-4 border border-slate-300 dark:border-slate-800">
                <div className="relative rounded-2xl rounded-tl-none bg-[#DCF8C6] dark:bg-emerald-950/80 p-3.5 text-xs text-slate-900 dark:text-emerald-100 shadow-sm border border-emerald-300/60 dark:border-emerald-800">
                  <textarea
                    rows={5}
                    value={textoWhatsApp}
                    onChange={(e) => setTextoWhatsApp(e.target.value)}
                    className="w-full bg-transparent resize-none focus:outline-none text-xs text-slate-900 dark:text-slate-100 leading-relaxed font-sans"
                    placeholder="Digite a mensagem para o responsável..."
                  />
                  <div className="text-right text-[10px] text-slate-500 dark:text-emerald-300 font-mono mt-1">
                    Agora • ✓✓
                  </div>
                </div>
              </div>
              <p className="mt-1.5 text-[11px] text-slate-400 italic">
                Ao clicar em &quot;Abrir no WhatsApp&quot;, uma nova aba será aberta no WhatsApp Web ou no aplicativo com a mensagem pronta para envio.
              </p>
            </div>

            {/* Botões de Ação */}
            <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setModalWhatsAppInclusaoAberto(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleEnviarWhatsAppDireto}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-600/30 hover:bg-emerald-500 active:scale-95 transition-all"
              >
                <Send className="h-4 w-4" />
                <span>Abrir no WhatsApp</span>
                <ExternalLink className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Informar / Editar Telefones de Contato do Estudante (Alertas: Sem Telefone) */}
      {modalEditarTelefonesAberto && estudanteEditarTelefones && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-school-dark-surface border border-slate-200 dark:border-school-dark-border animate-in fade-in zoom-in-95 duration-200">
            {/* Botão Fechar */}
            <button
              type="button"
              onClick={() => {
                setModalEditarTelefonesAberto(false);
                setEstudanteEditarTelefones(null);
              }}
              className="absolute right-4 top-4 rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Cabeçalho do Modal */}
            <div className="flex items-start gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400 flex-shrink-0 border border-rose-200/60 dark:border-rose-900/60">
                <Phone className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Informar Telefones de Contato
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Cadastre os números de WhatsApp e emergência para regularizar o cadastro
                </p>
              </div>
            </div>

            {/* Aluno em Foco */}
            <div className="mt-4 rounded-xl bg-slate-50 p-3.5 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60">
              <div className="flex items-center justify-between">
                <div>
                  <span className="block text-xs font-bold text-slate-900 dark:text-white">
                    {estudanteEditarTelefones.nome_completo}
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    {obterInfoTurma(estudanteEditarTelefones.turma_id, estudanteEditarTelefones.turma_nome).completo}
                  </span>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-[10px] font-bold text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                  <PhoneOff className="h-3 w-3" />
                  Alerta Ativo
                </span>
              </div>
            </div>

            {/* Feedback de Sucesso */}
            {sucessoSalvarTelefones && (
              <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-xs font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>Telefones salvos com sucesso! O cadastro do estudante foi regularizado.</span>
              </div>
            )}

            {/* Formulário de Telefones */}
            <form onSubmit={handleSalvarTelefones} className="mt-4 space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Telefone Principal (WhatsApp do Responsável) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="(81) 98765-4321"
                    value={formTelefones.telefone_responsavel}
                    onChange={(e) => setFormTelefones({ ...formTelefones, telefone_responsavel: formatarTelefone(e.target.value) })}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-900 focus:border-rose-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white font-mono font-medium shadow-sm"
                  />
                  <p className="mt-1 text-[10px] text-slate-400">
                    Utilizado para os comunicados oficiais e acionamento no painel.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Telefone Alternativo 2
                  </label>
                  <input
                    type="text"
                    placeholder="(81) 98111-2222"
                    value={formTelefones.telefone_2}
                    onChange={(e) => setFormTelefones({ ...formTelefones, telefone_2: formatarTelefone(e.target.value) })}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-rose-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white font-mono shadow-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Telefone Alternativo 3 (Emergência)
                  </label>
                  <input
                    type="text"
                    placeholder="(81) 97333-4444"
                    value={formTelefones.telefone_3}
                    onChange={(e) => setFormTelefones({ ...formTelefones, telefone_3: formatarTelefone(e.target.value) })}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-rose-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white font-mono shadow-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Telefone Alternativo 4 (Outro)
                  </label>
                  <input
                    type="text"
                    placeholder="(81) 98888-5566"
                    value={formTelefones.telefone_4}
                    onChange={(e) => setFormTelefones({ ...formTelefones, telefone_4: formatarTelefone(e.target.value) })}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-rose-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white font-mono shadow-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Parentesco do Responsável
                  </label>
                  <input
                    type="text"
                    placeholder="Mãe, Pai, Avó, etc."
                    value={formTelefones.parentesco_responsavel}
                    onChange={(e) => setFormTelefones({ ...formTelefones, parentesco_responsavel: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-rose-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white shadow-sm"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Nome do Responsável
                  </label>
                  <input
                    type="text"
                    placeholder="Nome completo do responsável legal"
                    value={formTelefones.nome_responsavel}
                    onChange={(e) => setFormTelefones({ ...formTelefones, nome_responsavel: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-900 focus:border-rose-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white shadow-sm"
                  />
                </div>
              </div>

              {/* Botões do Formulário */}
              <div className="mt-5 flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setModalEditarTelefonesAberto(false);
                    setEstudanteEditarTelefones(null);
                  }}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={sucessoSalvarTelefones}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-rose-700 active:scale-95 transition-all disabled:opacity-50"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Salvar Telefones</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
