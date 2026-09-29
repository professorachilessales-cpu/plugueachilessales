'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { 
  UserCheck, 
  Plus, 
  Calendar, 
  FileText, 
  ExternalLink, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  X,
  GraduationCap,
  Mail,
  Phone,
  ShieldCheck,
  Building,
  HeartHandshake,
  Edit2,
  Eye,
  Award,
  MapPin,
  Users,
  Save,
  AlertTriangle,
  Info,
  Briefcase,
  Search,
  Loader2,
  Trash2
} from 'lucide-react';
import { Professor, FaltaProfessor, TitulacaoDocente, FuncaoEscola, TipoProfissional } from '@/lib/types';
import { formatarTelefone, formatarCPF, formatarCEP, validarCPF } from '@/lib/validations';
import FuncaoEscolaSelector from '@/components/professores/FuncaoEscolaSelector';
import ModalNovoFuncionario from '@/components/professores/ModalNovoFuncionario';

const TITULACOES_DOCENTE: TitulacaoDocente[] = [
  'GRADUAÇÃO',
  'MESTRADO',
  'PÓS-GRADUAÇÃO',
  'DOUTOR',
  'PÓS-DOUTORADO',
];

function getEmojiFuncao(funcao?: string): string {
  switch (funcao) {
    case 'Porteiro': return '🚪';
    case 'Serviços Gerais': return '🧹';
    case 'Administrativo': return '📂';
    case 'Readaptado': return '🔄';
    case 'Merendeira': return '🍲';
    case 'Ajudantes': return '🤝';
    case 'Outros': return '🏷️';
    default: return '💼';
  }
}

const formProfInicial = {
  nome_completo: '',
  matricula: '',
  cpf: '',
  rg: '',
  rg_data_expedicao: '',
  formacao: '',
  disciplinasStr: '',
  titulacao: 'GRADUAÇÃO' as TitulacaoDocente,
  graduacao_instituicao: '',
  graduacao_inicio: '',
  graduacao_fim: '',
  pos_graduacao_instituicao: '',
  pos_graduacao_inicio: '',
  pos_graduacao_fim: '',
  endereco_completo: '',
  nome_mae: '',
  nome_pai: '',
  telefone: '',
  email: '',
  telefone_emergencia: '',
  telefone_emergencia2: '',
  contato_emergencia_nome: '',
  observacoes: '',
  eh_apoio: false,
  ativo: true, // Valor Padrão: Ativo (true)
};

const formEditProfInicial = {
  tipo_profissional: 'docente' as TipoProfissional,
  funcao_escola: '' as FuncaoEscola | '',
  nome_completo: '',
  matricula: '',
  cpf: '',
  rg: '',
  rg_data_expedicao: '',
  data_nascimento: '',
  genero: 'NÃO INFORMADO',
  vinculo_empregaticio: 'EFETIVO',
  formacao: '',
  disciplinasStr: '',
  titulacao: 'GRADUAÇÃO' as TitulacaoDocente,
  graduacao_instituicao: '',
  graduacao_inicio: '',
  graduacao_fim: '',
  pos_graduacao_instituicao: '',
  pos_graduacao_inicio: '',
  pos_graduacao_fim: '',
  filiacao_1: '',
  filiacao_2: '',
  nome_mae: '',
  nome_pai: '',
  cep: '',
  logradouro: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  uf: '',
  endereco_completo: '',
  telefone: '',
  celular_whatsapp: '',
  email: '',
  telefone_emergencia: '',
  telefone_emergencia2: '',
  contato_emergencia_nome: '',
  contato_emergencia_parentesco: '',
  observacoes: '',
  eh_apoio: false,
  ativo: true,
};

export default function ProfessoresPage() {
  const { 
    professores, 
    faltasProfessores, 
    addProfessor, 
    updateProfessor, 
    toggleProfessorApoio, 
    addFaltaProfessor, 
    toggleHomologarFalta, 
    turmas,
    reposicoesAulas,
    atestadosProfessor,
    homologarReposicaoAula,
    aprovarAtestadoProfessor,
    deleteReposicaoAula,
    deleteAtestadoProfessor
  } = useApp();

  const [abaAtiva, setAbaAtiva] = useState<'docentes' | 'faltas' | 'reposicoes' | 'atestados'>('docentes');
  // Controle de Categoria do Quadro Funcional: 'docentes' | 'funcionarios' | 'todos'
  const [categoriaFiltro, setCategoriaFiltro] = useState<'docentes' | 'funcionarios' | 'todos'>('docentes');
  // Controle de filtro de status: 'ativos' (padrão inicial), 'inativos', 'todos'
  const [filtroStatus, setFiltroStatus] = useState<'ativos' | 'inativos' | 'todos'>('ativos');
  // Busca textual rápida
  const [buscaTermo, setBuscaTermo] = useState('');

  const [modalNovoProfAberto, setModalNovoProfAberto] = useState(false);
  const [modalNovoFuncAberto, setModalNovoFuncAberto] = useState(false);
  const [modalEditProfAberto, setModalEditProfAberto] = useState(false);
  const [modalFichaProfAberto, setModalFichaProfAberto] = useState(false);
  const [modalNovaFaltaAberto, setModalNovaFaltaAberto] = useState(false);

  const [professorSelecionado, setProfessorSelecionado] = useState<Professor | null>(null);
  const [professorEditandoId, setProfessorEditandoId] = useState<string | null>(null);

  // Form Novo Docente
  const [formProf, setFormProf] = useState(formProfInicial);

  // Form Editar Colaborador (Docente ou Funcionário)
  const [formEditProf, setFormEditProf] = useState(formEditProfInicial);
  const [buscandoCepEdit, setBuscandoCepEdit] = useState(false);
  const [cepEditFeedback, setCepEditFeedback] = useState<string | null>(null);

  // Form Nova Falta
  const [formFalta, setFormFalta] = useState({
    professor_id: professores[0]?.id || '',
    data_falta: new Date().toISOString().split('T')[0],
    aulas_faltadas: 2,
    justificativa: '',
    atestado_drive_link: '',
  });

  // Helpers para forçar Caixa Alta (uppercase) em todos os dados
  const handleNovoUpperChange = (campo: string, valor: string) => {
    setFormProf((prev) => ({
      ...prev,
      [campo]: valor.toUpperCase(),
    }));
  };

  const handleEditUpperChange = (campo: string, valor: string) => {
    setFormEditProf((prev) => ({
      ...prev,
      [campo]: valor.toUpperCase(),
    }));
  };

  // Busca de CEP para o formulário de edição
  const handleConsultarCepEdit = async (cepInput: string) => {
    const limpo = cepInput.replace(/\D/g, '');
    if (limpo.length !== 8) return;
    setBuscandoCepEdit(true);
    setCepEditFeedback('Buscando CEP...');
    try {
      const res = await fetch(`https://viacep.com.br/ws/${limpo}/json/`);
      const data = await res.json();
      if (data.erro) {
        setCepEditFeedback('CEP não encontrado.');
      } else {
        setFormEditProf((prev) => ({
          ...prev,
          logradouro: (data.logradouro || '').toUpperCase(),
          bairro: (data.bairro || '').toUpperCase(),
          cidade: (data.localidade || '').toUpperCase(),
          uf: (data.uf || '').toUpperCase(),
        }));
        setCepEditFeedback('Endereço preenchido via CEP!');
      }
    } catch (err) {
      console.warn('Erro ao consultar CEP na edição:', err);
      setCepEditFeedback('Falha na busca.');
    } finally {
      setBuscandoCepEdit(false);
      setTimeout(() => setCepEditFeedback(null), 4000);
    }
  };

  // Abrir Modal de Edição
  const handleAbrirEditar = (prof: Professor) => {
    setProfessorEditandoId(prof.id);
    setFormEditProf({
      tipo_profissional: prof.tipo_profissional || 'docente',
      funcao_escola: (prof.funcao_escola as FuncaoEscola) || '',
      nome_completo: (prof.nome_completo || '').toUpperCase(),
      matricula: (prof.matricula || '').toUpperCase(),
      cpf: (prof.cpf || '').toUpperCase(),
      rg: (prof.rg || '').toUpperCase(),
      rg_data_expedicao: prof.rg_data_expedicao || '',
      data_nascimento: prof.data_nascimento || '',
      genero: prof.genero || 'NÃO INFORMADO',
      vinculo_empregaticio: prof.vinculo_empregaticio || 'EFETIVO',
      formacao: (prof.formacao || '').toUpperCase(),
      disciplinasStr: (prof.disciplinas?.join(', ') || '').toUpperCase(),
      titulacao: (prof.titulacao as TitulacaoDocente) || 'GRADUAÇÃO',
      graduacao_instituicao: (prof.graduacao_instituicao || '').toUpperCase(),
      graduacao_inicio: prof.graduacao_inicio || '',
      graduacao_fim: prof.graduacao_fim || '',
      pos_graduacao_instituicao: (prof.pos_graduacao_instituicao || '').toUpperCase(),
      pos_graduacao_inicio: prof.pos_graduacao_inicio || '',
      pos_graduacao_fim: prof.pos_graduacao_fim || '',
      filiacao_1: (prof.filiacao_1 || prof.nome_mae || '').toUpperCase(),
      filiacao_2: (prof.filiacao_2 || prof.nome_pai || '').toUpperCase(),
      nome_mae: (prof.nome_mae || prof.filiacao_1 || '').toUpperCase(),
      nome_pai: (prof.nome_pai || prof.filiacao_2 || '').toUpperCase(),
      cep: prof.cep || '',
      logradouro: (prof.logradouro || '').toUpperCase(),
      numero: (prof.numero || '').toUpperCase(),
      complemento: (prof.complemento || '').toUpperCase(),
      bairro: (prof.bairro || '').toUpperCase(),
      cidade: (prof.cidade || '').toUpperCase(),
      uf: (prof.uf || '').toUpperCase(),
      endereco_completo: (prof.endereco_completo || '').toUpperCase(),
      telefone: prof.telefone || '',
      celular_whatsapp: prof.celular_whatsapp || prof.telefone || '',
      email: (prof.email || '').toUpperCase(),
      telefone_emergencia: prof.telefone_emergencia || '',
      telefone_emergencia2: prof.telefone_emergencia2 || '',
      contato_emergencia_nome: (prof.contato_emergencia_nome || '').toUpperCase(),
      contato_emergencia_parentesco: (prof.contato_emergencia_parentesco || '').toUpperCase(),
      observacoes: (prof.observacoes || '').toUpperCase(),
      eh_apoio: Boolean(prof.eh_apoio),
      ativo: prof.ativo !== false,
    });
    setModalEditProfAberto(true);
  };

  // Abrir Ficha Completa
  const handleAbrirFicha = (prof: Professor) => {
    setProfessorSelecionado(prof);
    setModalFichaProfAberto(true);
  };

  // Cadastrar Novo Docente (em Caixa Alta)
  const handleCadastrarProfessor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formProf.nome_completo) return;

    if (formProf.cpf && !validarCPF(formProf.cpf)) {
      alert('CPF informado para o docente é inválido. Por favor, verifique os dígitos digitados.');
      return;
    }

    addProfessor({
      tipo_profissional: 'docente',
      nome_completo: formProf.nome_completo.trim().toUpperCase(),
      matricula: (formProf.matricula?.trim() || `DOC-${Date.now().toString().slice(-6)}`).toUpperCase(),
      cpf: formProf.cpf.trim().toUpperCase(),
      rg: formProf.rg.trim().toUpperCase(),
      rg_data_expedicao: formProf.rg_data_expedicao,
      formacao: formProf.formacao.trim().toUpperCase(),
      disciplinas: formProf.disciplinasStr.split(',').map((d) => d.trim().toUpperCase()).filter(Boolean),
      titulacao: formProf.titulacao,
      graduacao_instituicao: formProf.graduacao_instituicao.trim().toUpperCase(),
      graduacao_inicio: formProf.graduacao_inicio,
      graduacao_fim: formProf.graduacao_fim,
      pos_graduacao_instituicao: formProf.pos_graduacao_instituicao.trim().toUpperCase(),
      pos_graduacao_inicio: formProf.pos_graduacao_inicio,
      pos_graduacao_fim: formProf.pos_graduacao_fim,
      endereco_completo: formProf.endereco_completo.trim().toUpperCase(),
      nome_mae: formProf.nome_mae.trim().toUpperCase(),
      nome_pai: formProf.nome_pai.trim().toUpperCase(),
      telefone: formProf.telefone.trim(),
      email: formProf.email.trim().toUpperCase(),
      telefone_emergencia: formProf.telefone_emergencia.trim(),
      telefone_emergencia2: formProf.telefone_emergencia2.trim(),
      contato_emergencia_nome: formProf.contato_emergencia_nome.trim().toUpperCase(),
      observacoes: formProf.observacoes.trim().toUpperCase(),
      ativo: formProf.ativo !== false,
      eh_apoio: formProf.eh_apoio,
      turmas_atribuidas_ids: [],
    });

    setModalNovoProfAberto(false);
    setFormProf(formProfInicial);
    setCategoriaFiltro('docentes');
  };

  // Cadastrar Novo Funcionário
  const handleCadastrarFuncionario = (novoFunc: Omit<Professor, 'id' | 'created_at'>) => {
    addProfessor(novoFunc);
    setCategoriaFiltro('funcionarios');
  };

  // Salvar Alteração dos Dados do Colaborador (Docente ou Funcionário)
  const handleSalvarEdicaoProfessor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!professorEditandoId || !formEditProf.nome_completo) return;

    if (formEditProf.cpf && !validarCPF(formEditProf.cpf)) {
      alert('CPF informado é inválido. Por favor, verifique os dígitos digitados.');
      return;
    }

    if (formEditProf.tipo_profissional === 'funcionario' && !formEditProf.funcao_escola) {
      alert('Por favor, selecione a "Função na Escola" para o funcionário.');
      return;
    }

    const partesEndereco = [
      formEditProf.logradouro,
      formEditProf.numero ? `Nº ${formEditProf.numero}` : '',
      formEditProf.complemento,
      formEditProf.bairro,
      formEditProf.cidade && formEditProf.uf ? `${formEditProf.cidade} - ${formEditProf.uf}` : (formEditProf.cidade || formEditProf.uf),
      formEditProf.cep ? `CEP: ${formEditProf.cep}` : '',
    ].filter(Boolean);
    const enderecoGerado = partesEndereco.length > 0 
      ? partesEndereco.join(', ').toUpperCase() 
      : formEditProf.endereco_completo.trim().toUpperCase();

    const updates: Partial<Professor> = {
      tipo_profissional: formEditProf.tipo_profissional || 'docente',
      funcao_escola: formEditProf.tipo_profissional === 'funcionario' ? formEditProf.funcao_escola : undefined,
      nome_completo: formEditProf.nome_completo.trim().toUpperCase(),
      matricula: formEditProf.matricula.trim().toUpperCase(),
      cpf: formEditProf.cpf.trim().toUpperCase(),
      rg: formEditProf.rg.trim().toUpperCase(),
      rg_data_expedicao: formEditProf.rg_data_expedicao,
      data_nascimento: formEditProf.data_nascimento,
      genero: formEditProf.genero,
      vinculo_empregaticio: formEditProf.vinculo_empregaticio,
      formacao: formEditProf.formacao.trim().toUpperCase(),
      disciplinas: formEditProf.disciplinasStr.split(',').map((d) => d.trim().toUpperCase()).filter(Boolean),
      titulacao: formEditProf.titulacao,
      graduacao_instituicao: formEditProf.graduacao_instituicao.trim().toUpperCase(),
      graduacao_inicio: formEditProf.graduacao_inicio,
      graduacao_fim: formEditProf.graduacao_fim,
      pos_graduacao_instituicao: formEditProf.pos_graduacao_instituicao.trim().toUpperCase(),
      pos_graduacao_inicio: formEditProf.pos_graduacao_inicio,
      pos_graduacao_fim: formEditProf.pos_graduacao_fim,
      filiacao_1: formEditProf.filiacao_1.trim().toUpperCase(),
      filiacao_2: formEditProf.filiacao_2.trim().toUpperCase(),
      nome_mae: (formEditProf.nome_mae || formEditProf.filiacao_1).trim().toUpperCase(),
      nome_pai: (formEditProf.nome_pai || formEditProf.filiacao_2).trim().toUpperCase(),
      cep: formEditProf.cep.trim(),
      logradouro: formEditProf.logradouro.trim().toUpperCase(),
      numero: formEditProf.numero.trim().toUpperCase(),
      complemento: formEditProf.complemento.trim().toUpperCase(),
      bairro: formEditProf.bairro.trim().toUpperCase(),
      cidade: formEditProf.cidade.trim().toUpperCase(),
      uf: formEditProf.uf.trim().toUpperCase(),
      endereco_completo: enderecoGerado,
      telefone: formEditProf.telefone.trim(),
      celular_whatsapp: formEditProf.celular_whatsapp.trim() || formEditProf.telefone.trim(),
      email: formEditProf.email.trim().toUpperCase(),
      telefone_emergencia: formEditProf.telefone_emergencia.trim(),
      telefone_emergencia2: formEditProf.telefone_emergencia2.trim(),
      contato_emergencia_nome: formEditProf.contato_emergencia_nome.trim().toUpperCase(),
      contato_emergencia_parentesco: formEditProf.contato_emergencia_parentesco.trim().toUpperCase(),
      observacoes: formEditProf.observacoes.trim().toUpperCase(),
      eh_apoio: formEditProf.tipo_profissional === 'funcionario' ? false : formEditProf.eh_apoio,
      ativo: formEditProf.ativo !== false,
    };

    updateProfessor(professorEditandoId, updates);
    if (professorSelecionado?.id === professorEditandoId) {
      setProfessorSelecionado({ ...professorSelecionado, ...updates });
    }
    setModalEditProfAberto(false);
    setProfessorEditandoId(null);
  };

  const handleRegistrarFalta = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formFalta.professor_id || !formFalta.justificativa) return;

    const prof = professores.find((p) => p.id === formFalta.professor_id);

    addFaltaProfessor({
      professor_id: formFalta.professor_id,
      professor_nome: prof?.nome_completo || 'Docente',
      data_falta: formFalta.data_falta,
      aulas_faltadas: Number(formFalta.aulas_faltadas) || 1,
      justificativa: formFalta.justificativa.toUpperCase(),
      atestado_drive_link: formFalta.atestado_drive_link || undefined,
      atestado_drive_id: formFalta.atestado_drive_link ? `atestado_${Date.now()}` : undefined,
    });

    setModalNovaFaltaAberto(false);
    setFormFalta({
      professor_id: professores[0]?.id || '',
      data_falta: new Date().toISOString().split('T')[0],
      aulas_faltadas: 2,
      justificativa: '',
      atestado_drive_link: '',
    });
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <UserCheck className="h-7 w-7 text-school-blue-600 dark:text-school-gold-400" />
            Ficha Funcional dos Docentes & Controle de Ausências
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Cadastros funcionais completos em caixa alta e homologação de faltas
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setModalNovoProfAberto(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-800 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            <Plus className="h-4 w-4 text-school-blue-600 dark:text-school-gold-400" />
            <span>Novo Docente</span>
          </button>

          <button
            onClick={() => setModalNovoFuncAberto(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-2 text-xs font-bold text-amber-900 shadow-sm hover:bg-amber-100 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-200 dark:hover:bg-amber-900/50"
          >
            <Plus className="h-4 w-4 text-amber-700 dark:text-amber-400" />
            <span>Novo Funcionário</span>
          </button>

          <button
            onClick={() => setModalNovaFaltaAberto(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-school-blue-800 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-school-blue-700 dark:bg-school-blue-600"
          >
            <Plus className="h-4 w-4" />
            <span>Registrar Falta / Atestado</span>
          </button>
        </div>
      </div>

      {/* Alternador de Abas */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 overflow-x-auto pb-0.5">
        <button
          onClick={() => setAbaAtiva('docentes')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold transition-all shrink-0 ${
            abaAtiva === 'docentes'
              ? 'border-school-blue-600 text-school-blue-600 dark:border-school-gold-400 dark:text-school-gold-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <GraduationCap className="h-4 w-4" />
          <span>Quadro Funcional ({professores.length})</span>
        </button>

        <button
          onClick={() => setAbaAtiva('faltas')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold transition-all shrink-0 ${
            abaAtiva === 'faltas'
              ? 'border-school-blue-600 text-school-blue-600 dark:border-school-gold-400 dark:text-school-gold-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Calendar className="h-4 w-4" />
          <span>Registro de Faltas ({faltasProfessores.length})</span>
        </button>

        <button
          onClick={() => setAbaAtiva('reposicoes')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold transition-all shrink-0 ${
            abaAtiva === 'reposicoes'
              ? 'border-rose-600 text-rose-600 dark:border-rose-400 dark:text-rose-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Clock className="h-4 w-4" />
          <span>Reposições (Regra 30d) ({reposicoesAulas.length})</span>
        </button>

        <button
          onClick={() => setAbaAtiva('atestados')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold transition-all shrink-0 ${
            abaAtiva === 'atestados'
              ? 'border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <FileText className="h-4 w-4" />
          <span>Atestados Médicos ({atestadosProfessor.length})</span>
        </button>
      </div>

      {/* ABA 1: Quadro Funcional (Docentes & Funcionários) */}
      {abaAtiva === 'docentes' && (() => {
        const docentesList = professores.filter((p) => p.tipo_profissional === 'docente' || !p.tipo_profissional);
        const funcionariosList = professores.filter((p) => p.tipo_profissional === 'funcionario');

        const totalDocentes = docentesList.length;
        const totalFuncionarios = funcionariosList.length;
        const totalTodos = professores.length;

        // Base de acordo com a aba/categoria selecionada
        let listaBase = professores;
        if (categoriaFiltro === 'docentes') {
          listaBase = docentesList;
        } else if (categoriaFiltro === 'funcionarios') {
          listaBase = funcionariosList;
        }

        const totalAtivos = listaBase.filter((p) => p.ativo !== false).length;
        const totalInativos = listaBase.filter((p) => p.ativo === false).length;

        // Aplicar filtro de status
        let resultado = listaBase.filter((p) => {
          const isAtivo = p.ativo !== false;
          if (filtroStatus === 'ativos') return isAtivo;
          if (filtroStatus === 'inativos') return !isAtivo;
          return true;
        });

        // Aplicar busca textual se preenchida
        if (buscaTermo.trim()) {
          const t = buscaTermo.trim().toLowerCase();
          resultado = resultado.filter((p) => {
            const nome = (p.nome_completo || '').toLowerCase();
            const cpf = (p.cpf || '').toLowerCase();
            const mat = (p.matricula || '').toLowerCase();
            const func = (p.funcao_escola || '').toLowerCase();
            const disc = (p.disciplinas || []).join(' ').toLowerCase();
            return nome.includes(t) || cpf.includes(t) || mat.includes(t) || func.includes(t) || disc.includes(t);
          });
        }

        return (
          <div className="space-y-4">
            {/* Seletor Segmentado de Abas (Tabs) + Busca Rápida */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-school-dark-border dark:bg-school-dark-surface">
              {/* Tabs Segmentadas: Docentes | Funcionários | Todos */}
              <div className="inline-flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => setCategoriaFiltro('docentes')}
                  className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 font-bold transition-all ${
                    categoriaFiltro === 'docentes'
                      ? 'bg-white text-school-blue-700 shadow-sm dark:bg-slate-700 dark:text-school-gold-400'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  <GraduationCap className="h-4 w-4 text-school-blue-600 dark:text-school-gold-400" />
                  <span>Docentes ({totalDocentes})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCategoriaFiltro('funcionarios')}
                  className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 font-bold transition-all ${
                    categoriaFiltro === 'funcionarios'
                      ? 'bg-white text-amber-700 shadow-sm dark:bg-slate-700 dark:text-amber-400'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  <Briefcase className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <span>Funcionários ({totalFuncionarios})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCategoriaFiltro('todos')}
                  className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 font-bold transition-all ${
                    categoriaFiltro === 'todos'
                      ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  <Users className="h-4 w-4 text-slate-500" />
                  <span>Todos ({totalTodos})</span>
                </button>
              </div>

              {/* Campo de Busca Rápida */}
              <div className="relative min-w-[220px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={buscaTermo}
                  onChange={(e) => setBuscaTermo(e.target.value)}
                  placeholder="Buscar nome, CPF ou função..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-school-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
                {buscaTermo && (
                  <button
                    onClick={() => setBuscaTermo('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Filtro de Exibição de Status */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-school-dark-border dark:bg-school-dark-surface">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1">
                  Status:
                </span>
                <div className="inline-flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800 text-xs">
                  <button
                    type="button"
                    onClick={() => setFiltroStatus('ativos')}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-bold transition-all ${
                      filtroStatus === 'ativos'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                    }`}
                  >
                    <span className="h-2 w-2 rounded-full bg-emerald-300" />
                    <span>Apenas Ativos ({totalAtivos})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFiltroStatus('inativos')}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-bold transition-all ${
                      filtroStatus === 'inativos'
                        ? 'bg-rose-600 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                    }`}
                  >
                    <span className="h-2 w-2 rounded-full bg-rose-300" />
                    <span>Apenas Inativos ({totalInativos})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFiltroStatus('todos')}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-bold transition-all ${
                      filtroStatus === 'todos'
                        ? 'bg-school-blue-800 text-white shadow-sm dark:bg-school-blue-600'
                        : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                    }`}
                  >
                    <span>Todos ({listaBase.length})</span>
                  </button>
                </div>
              </div>

              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                Mostrando <strong>{resultado.length}</strong> de {listaBase.length}{' '}
                {categoriaFiltro === 'docentes'
                  ? 'docente(s)'
                  : categoriaFiltro === 'funcionarios'
                  ? 'funcionário(s)'
                  : 'colaborador(es)'}
              </div>
            </div>

            {/* Grid do Quadro Funcional */}
            {resultado.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 p-12 text-center dark:border-slate-800 dark:bg-slate-900/20">
                {categoriaFiltro === 'funcionarios' ? (
                  <Briefcase className="mx-auto h-12 w-12 text-slate-400" />
                ) : (
                  <GraduationCap className="mx-auto h-12 w-12 text-slate-400" />
                )}
                <h4 className="mt-3 text-sm font-bold text-slate-700 dark:text-slate-300">
                  Nenhum colaborador encontrado
                </h4>
                <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
                  {filtroStatus === 'inativos'
                    ? 'Não há colaboradores inativos atendendo aos critérios no momento.'
                    : 'Nenhum cadastro atende aos filtros e buscas selecionados.'}
                </p>
                {categoriaFiltro === 'funcionarios' && (
                  <div className="mt-4">
                    <button
                      onClick={() => setModalNovoFuncAberto(true)}
                      className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-amber-700"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Cadastrar Primeiro Funcionário</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {resultado.map((prof) => {
                  const isFuncionario = prof.tipo_profissional === 'funcionario';

                  return (
                    <div
                      key={prof.id}
                      className={`flex flex-col justify-between rounded-2xl border p-5 shadow-sm transition-all hover:shadow-md ${
                        prof.ativo !== false
                          ? isFuncionario
                            ? 'border-amber-200/80 bg-white dark:border-amber-900/40 dark:bg-school-dark-surface'
                            : 'border-slate-200 bg-white dark:border-school-dark-border dark:bg-school-dark-surface'
                          : 'border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-900/40 opacity-85 hover:opacity-100'
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <span className="text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500 block uppercase">
                              {prof.matricula || 'MATRÍCULA N/I'}
                            </span>
                            <h3 className="text-base font-black text-slate-900 dark:text-white uppercase truncate mt-0.5">
                              {prof.nome_completo}
                            </h3>
                          </div>

                          {/* Badges de Status e Categoria */}
                          <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap justify-end">
                            {isFuncionario ? (
                              <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-900 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-300/80">
                                <span>{getEmojiFuncao(prof.funcao_escola)}</span>
                                <span>{prof.funcao_escola || 'FUNCIONÁRIO'}</span>
                              </span>
                            ) : (
                              prof.eh_apoio && (
                                <span className="rounded-md bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-200/60">
                                  Apoio
                                </span>
                              )
                            )}

                            {prof.ativo !== false ? (
                              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/70">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                Ativo
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-md bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200/70">
                                <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                                Inativo
                              </span>
                            )}
                          </div>
                        </div>

                        {/* CPF e RG */}
                        <div className="mt-2.5 flex items-center gap-3 text-[11px] font-mono text-slate-500 dark:text-slate-400">
                          <span>CPF: <strong>{prof.cpf || 'NÃO INFORMADO'}</strong></span>
                          <span>RG: <strong>{prof.rg || 'NÃO INFORMADO'}</strong></span>
                        </div>

                        {/* Informações Específicas por Tipo */}
                        {isFuncionario ? (
                          <div className="mt-3 space-y-1.5 text-[11px] text-slate-600 dark:text-slate-300">
                            <div className="flex items-center justify-between rounded-lg bg-amber-50/60 dark:bg-amber-950/20 px-2.5 py-1 border border-amber-200/40">
                              <span className="text-[10px] uppercase font-bold text-amber-900 dark:text-amber-300">
                                Vínculo:
                              </span>
                              <span className="font-semibold uppercase text-slate-800 dark:text-slate-200">
                                {prof.vinculo_empregaticio || 'EFETIVO'}
                              </span>
                            </div>

                            {(prof.bairro || prof.logradouro || prof.cidade) && (
                              <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase truncate">
                                📍 {prof.bairro ? `${prof.bairro}, ` : ''}{prof.cidade || ''} {prof.uf ? `(${prof.uf})` : ''}
                              </p>
                            )}

                            {(prof.contato_emergencia_nome || prof.telefone_emergencia) && (
                              <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase truncate">
                                🚨 Emergência: {prof.contato_emergencia_nome || 'CONTATO'} {prof.contato_emergencia_parentesco ? `(${prof.contato_emergencia_parentesco})` : ''}
                              </p>
                            )}
                          </div>
                        ) : (
                          <>
                            {/* Graduação / Instituição Docente */}
                            {prof.graduacao_instituicao && (
                              <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400 uppercase line-clamp-1">
                                Graduação: <strong className="text-slate-700 dark:text-slate-300">{prof.graduacao_instituicao}</strong>
                              </p>
                            )}

                            {/* Disciplinas Habilitadas */}
                            <div className="mt-3">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                Disciplinas:
                              </span>
                              <div className="mt-1 flex flex-wrap gap-1">
                                {prof.disciplinas && prof.disciplinas.length > 0 ? (
                                  prof.disciplinas.map((disc) => (
                                    <span
                                      key={disc}
                                      className="rounded-lg bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300 uppercase"
                                    >
                                      {disc}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-[10px] text-slate-400 uppercase">
                                    Nenhuma disciplina cadastrada
                                  </span>
                                )}
                              </div>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Rodapé do Card: Contatos e Botões de Ação */}
                      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                          <span className="truncate pr-2">{prof.email || 'SEM EMAIL'}</span>
                          <span className="font-mono">{prof.telefone || prof.celular_whatsapp || 'SEM TEL'}</span>
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          <button
                            onClick={() => handleAbrirFicha(prof)}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 transition-all"
                          >
                            <Eye className="h-3.5 w-3.5 text-slate-500" />
                            <span>Ver Ficha</span>
                          </button>

                          <button
                            onClick={() => handleAbrirEditar(prof)}
                            className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold text-white shadow-sm transition-all ${
                              isFuncionario
                                ? 'bg-amber-600 hover:bg-amber-700 dark:bg-amber-700'
                                : 'bg-school-blue-800 hover:bg-school-blue-700 dark:bg-school-blue-600'
                            }`}
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                            <span>Editar Dados</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {/* ABA 2: Registro de Faltas */}
      {abaAtiva === 'faltas' && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden dark:border-school-dark-border dark:bg-school-dark-surface">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 dark:bg-slate-800 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3.5">Data Ausência</th>
                  <th className="px-4 py-3.5">Docente</th>
                  <th className="px-4 py-3.5">Aulas Faltadas</th>
                  <th className="px-4 py-3.5">Motivo / Justificativa</th>
                  <th className="px-4 py-3.5">Atestado Google Drive</th>
                  <th className="px-4 py-3.5">Status Homologação</th>
                  <th className="px-4 py-3.5 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {faltasProfessores.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                      Nenhuma ausência registrada até o momento.
                    </td>
                  </tr>
                ) : (
                  faltasProfessores.map((falta) => (
                    <tr key={falta.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3.5 font-mono font-bold text-slate-900 dark:text-white">
                        {new Date(falta.data_falta + 'T00:00:00').toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-slate-800 dark:text-slate-200 uppercase">
                        {falta.professor_nome}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center rounded-md bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-900 dark:bg-amber-950 dark:text-amber-300">
                          {falta.aulas_faltadas} aula(s)
                        </span>
                      </td>
                      <td className="px-4 py-3.5 max-w-sm uppercase">
                        {falta.justificativa}
                      </td>
                      <td className="px-4 py-3.5">
                        {falta.atestado_drive_link ? (
                          <a
                            href={falta.atestado_drive_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 font-bold text-school-blue-600 hover:underline dark:text-school-gold-400"
                          >
                            <FileText className="h-3.5 w-3.5" />
                            <span>Ver Atestado</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <span className="text-slate-400 italic">Sem anexo</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                            falta.homologado
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          }`}
                        >
                          {falta.homologado ? 'Homologado pela Direção' : 'Aguardando Homologação'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <button
                          onClick={() => toggleHomologarFalta(falta.id)}
                          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                        >
                          {falta.homologado ? 'Reabrir' : 'Homologar'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ABA 3: Gestão de Reposições de Aulas (Regra dos 30 Dias) */}
      {abaAtiva === 'reposicoes' && (() => {
        const totalAulasARepor = reposicoesAulas.filter(r => r.status === 'pendente' || r.status === 'Pendente').reduce((a, c) => a + (c.qtd_aulas_faltantes || c.aulas_total || 0), 0);
        const reposicoesPendentes = reposicoesAulas.filter(r => r.status === 'pendente' || r.status === 'Pendente');
        const reposicoesVencidas = reposicoesPendentes.filter(r => {
          const limiteStr = r.data_limite_reposicao || r.data_limite || '';
          const diff = Math.ceil((new Date(limiteStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
          return diff < 0;
        });
        const reposicoesAlerta = reposicoesPendentes.filter(r => {
          const limiteStr = r.data_limite_reposicao || r.data_limite || '';
          const diff = Math.ceil((new Date(limiteStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
          return diff >= 0 && diff <= 5;
        });
        const reposicoesRegulares = reposicoesPendentes.filter(r => {
          const limiteStr = r.data_limite_reposicao || r.data_limite || '';
          const diff = Math.ceil((new Date(limiteStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
          return diff > 5;
        });
        const reposicoesHomologadas = reposicoesAulas.filter(r => r.status === 'reposta' || r.status === 'Reposta' || r.homologado_por_admin);

        return (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-school-dark-surface">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Total de Aulas a Repor
                </span>
                <div className="mt-2 text-3xl font-black text-slate-900 dark:text-white">
                  {totalAulasARepor}
                </div>
                <span className="text-[10px] text-slate-400">em aberto</span>
              </div>

              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/20">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                  No Prazo (&gt; 5 dias)
                </span>
                <div className="mt-2 text-3xl font-black text-emerald-700 dark:text-emerald-300">
                  {reposicoesRegulares.length}
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 className="h-3 w-3" />
                  Situação Regular
                </span>
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                  Vencendo (≤ 5 dias)
                </span>
                <div className="mt-2 text-3xl font-black text-amber-700 dark:text-amber-300">
                  {reposicoesAlerta.length}
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 dark:text-amber-400">
                  <Clock className="h-3 w-3" />
                  Alerta Próximo
                </span>
              </div>

              <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-4 dark:border-rose-900/50 dark:bg-rose-950/20">
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-800 dark:text-rose-300">
                  Vencidas (&gt; 30 dias)
                </span>
                <div className="mt-2 text-3xl font-black text-rose-700 dark:text-rose-300">
                  {reposicoesVencidas.length}
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 dark:text-rose-400">
                  <AlertCircle className="h-3 w-3" />
                  Débito Crítico
                </span>
              </div>

              <div className="rounded-2xl border border-blue-200 bg-blue-50/40 p-4 dark:border-blue-900/50 dark:bg-blue-950/20">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-800 dark:text-blue-300">
                  Homologadas
                </span>
                <div className="mt-2 text-3xl font-black text-blue-700 dark:text-blue-300">
                  {reposicoesHomologadas.length}
                </div>
                <span className="text-[10px] text-blue-600 dark:text-blue-400">Aulas validadas</span>
              </div>
            </div>

            {/* Ranking de Débito de Reposições por Professor */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-school-dark-surface space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Clock className="h-4 w-4 text-rose-600" />
                Ranking de Débito de Reposições por Docente (Regra dos 30 Dias)
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {professores.map((prof) => {
                  const repsProf = reposicoesAulas.filter(r => r.professor_id === prof.id && (r.status === 'pendente' || r.status === 'Pendente'));
                  const totalAulas = repsProf.reduce((a, c) => a + (c.qtd_aulas_faltantes || c.aulas_total || 0), 0);
                  const vencidas = repsProf.filter(r => {
                    const limiteStr = r.data_limite_reposicao || r.data_limite || '';
                    const diff = Math.ceil((new Date(limiteStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                    return diff < 0;
                  }).length;

                  return (
                    <div key={prof.id} className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-900/50 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-slate-900 dark:text-white text-xs block">
                          {prof.nome_completo}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {prof.disciplinas?.join(', ') || 'Polivalente'}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className={`text-base font-black ${totalAulas > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                          {totalAulas} aula(s)
                        </span>
                        {vencidas > 0 && (
                          <span className="text-[9px] font-bold text-red-600 block">
                            {vencidas} vencida(s)!
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Tabela de Reposições */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-school-dark-surface">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Docente</th>
                    <th className="px-4 py-3">Data Falta</th>
                    <th className="px-4 py-3">Data Limite (30d)</th>
                    <th className="px-4 py-3">Tolerância</th>
                    <th className="px-4 py-3">Aulas</th>
                    <th className="px-4 py-3">Conteúdo Previsto</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Ação Direção</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {reposicoesAulas.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-xs text-slate-400">
                        Nenhuma reposição de aula registrada.
                      </td>
                    </tr>
                  ) : (
                    reposicoesAulas.map((rep) => {
                      const prof = professores.find(p => p.id === rep.professor_id);
                      const limiteStr = rep.data_limite_reposicao || rep.data_limite || '';
                      const diff = Math.ceil((new Date(limiteStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                      const vencida = diff < 0;
                      const alerta = diff >= 0 && diff <= 5;
                      const homologada = rep.status === 'reposta' || rep.status === 'Reposta' || rep.homologado_por_admin;

                      return (
                        <tr key={rep.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                          <td className="px-4 py-3.5 font-bold text-slate-900 dark:text-white">
                            {prof?.nome_completo || 'Docente'}
                          </td>
                          <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300">
                            {new Date(rep.data_falta + 'T00:00:00').toLocaleDateString('pt-BR')}
                          </td>
                          <td className="px-4 py-3.5 font-bold text-slate-900 dark:text-white">
                            {new Date((rep.data_limite_reposicao || rep.data_limite || rep.data_falta) + 'T00:00:00').toLocaleDateString('pt-BR')}
                          </td>
                          <td className="px-4 py-3.5">
                            {homologada ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-extrabold text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                                <CheckCircle2 className="h-3 w-3" />
                                Reposta
                              </span>
                            ) : vencida ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-[10px] font-extrabold text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                                <AlertTriangle className="h-3 w-3" />
                                Vencida ({Math.abs(diff)}d em atraso)
                              </span>
                            ) : alerta ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-extrabold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                                <Clock className="h-3 w-3" />
                                Vencendo ({diff}d restantes)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                <CheckCircle2 className="h-3 w-3" />
                                No prazo ({diff}d restantes)
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 font-bold">
                            {rep.qtd_aulas_faltantes || rep.aulas_total || 0} aula(s)
                          </td>
                          <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300 max-w-xs truncate">
                            {rep.conteudo_programatico || 'Reposição curricular'}
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="uppercase text-[10px] font-black tracking-wider text-slate-600 dark:text-slate-300">
                              {rep.status}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => homologarReposicaoAula(rep.id, !homologada)}
                                className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-colors ${
                                  homologada
                                    ? 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                    : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm'
                                }`}
                              >
                                {homologada ? 'Reabrir' : 'Homologar'}
                              </button>

                              <button
                                onClick={() => {
                                  if (confirm('Excluir este registro de reposição de aula?')) {
                                    deleteReposicaoAula(rep.id);
                                  }
                                }}
                                className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                                title="Excluir"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {/* ABA 4: Gestão de Atestados Médicos dos Professores */}
      {abaAtiva === 'atestados' && (() => {
        const totalAtestados = atestadosProfessor.length;
        const totalDiasAbonados = atestadosProfessor.reduce((a, c) => a + c.dias_afastamento, 0);
        const aprovados = atestadosProfessor.filter(a => a.status === 'aprovado').length;
        const pendentes = atestadosProfessor.filter(a => a.status === 'pendente').length;

        return (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-school-dark-surface">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Total de Atestados
                </span>
                <div className="mt-2 text-3xl font-black text-slate-900 dark:text-white">
                  {totalAtestados}
                </div>
                <span className="text-[10px] text-slate-400">registrados no Drive</span>
              </div>

              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/20">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                  Dias Abonados
                </span>
                <div className="mt-2 text-3xl font-black text-emerald-700 dark:text-emerald-300">
                  {totalDiasAbonados}
                </div>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400">afastamentos justificados</span>
              </div>

              <div className="rounded-2xl border border-blue-200 bg-blue-50/40 p-4 dark:border-blue-900/50 dark:bg-blue-950/20">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-800 dark:text-blue-300">
                  Homologados
                </span>
                <div className="mt-2 text-3xl font-black text-blue-700 dark:text-blue-300">
                  {aprovados}
                </div>
                <span className="text-[10px] text-blue-600 dark:text-blue-400">validados pela direção</span>
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                  Aguardando Validação
                </span>
                <div className="mt-2 text-3xl font-black text-amber-700 dark:text-amber-300">
                  {pendentes}
                </div>
                <span className="text-[10px] text-amber-600 dark:text-amber-400">análise pendente</span>
              </div>
            </div>

            {/* Tabela de Atestados */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-school-dark-surface">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Docente</th>
                    <th className="px-4 py-3">CID & Motivo</th>
                    <th className="px-4 py-3">Período</th>
                    <th className="px-4 py-3">Dias</th>
                    <th className="px-4 py-3">CRM / Médico</th>
                    <th className="px-4 py-3">Documento (Drive)</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Ação Direção</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {atestadosProfessor.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-xs text-slate-400">
                        Nenhum atestado médico registrado.
                      </td>
                    </tr>
                  ) : (
                    atestadosProfessor.map((atest) => {
                      const prof = professores.find(p => p.id === atest.professor_id);
                      return (
                        <tr key={atest.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                          <td className="px-4 py-3.5 font-bold text-slate-900 dark:text-white">
                            {prof?.nome_completo || 'Docente'}
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="font-bold text-slate-800 dark:text-slate-200">CID: {atest.cid || 'N/I'}</span>
                            <span className="text-[11px] text-slate-500 block truncate max-w-xs">{atest.motivo || 'Licença médica'}</span>
                          </td>
                          <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300">
                            {new Date(atest.data_inicio + 'T00:00:00').toLocaleDateString('pt-BR')} a {new Date(atest.data_fim + 'T00:00:00').toLocaleDateString('pt-BR')}
                          </td>
                          <td className="px-4 py-3.5 font-black text-slate-900 dark:text-white">
                            {atest.dias_afastamento} dia(s)
                          </td>
                          <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300">
                            {atest.crm_medico ? `CRM ${atest.crm_medico}` : 'Não informado'}
                          </td>
                          <td className="px-4 py-3.5">
                            {atest.drive_view_url ? (
                              <a
                                href={atest.drive_view_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 font-bold text-school-blue-600 hover:underline dark:text-school-gold-400"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                                <span>Ver Atestado</span>
                              </a>
                            ) : (
                              <span className="text-slate-400 italic">Sem link</span>
                            )}
                          </td>
                          <td className="px-4 py-3.5">
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase ${
                              atest.status === 'aprovado'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : atest.status === 'rejeitado'
                                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            }`}>
                              {atest.status}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {atest.status !== 'aprovado' ? (
                                <button
                                  onClick={() => aprovarAtestadoProfessor(atest.id, true)}
                                  className="rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-emerald-700 shadow-sm transition-colors"
                                >
                                  Aprovar
                                </button>
                              ) : (
                                <button
                                  onClick={() => aprovarAtestadoProfessor(atest.id, false)}
                                  className="rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-bold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
                                >
                                  Revogar
                                </button>
                              )}

                              <button
                                onClick={() => {
                                  if (confirm('Excluir este atestado médico?')) {
                                    deleteAtestadoProfessor(atest.id);
                                  }
                                }}
                                className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                                title="Excluir"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {/* MODAL 1: Cadastrar Novo Professor (Em Caixa Alta) */}
      {modalNovoProfAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-school-dark-surface max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-school-blue-600 dark:text-school-gold-400" />
                  Cadastrar Novo Docente
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Preenchimento obrigatório em CAIXA ALTA
                </p>
              </div>
              <button
                onClick={() => setModalNovoProfAberto(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCadastrarProfessor} className="mt-4 space-y-4 text-xs">
              {/* Seção 1: Identificação Civil e Funcional */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/40 space-y-3">
                <h4 className="font-bold text-slate-800 dark:text-slate-200 uppercase text-[11px] flex items-center gap-1.5">
                  <UserCheck className="h-4 w-4 text-school-blue-600" />
                  1. Identificação Civil e Funcional
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase">
                      Nome Completo *
                    </label>
                    <input
                      type="text"
                      required
                      value={formProf.nome_completo}
                      onChange={(e) => handleNovoUpperChange('nome_completo', e.target.value)}
                      placeholder="NOME COMPLETO DO DOCENTE"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs uppercase text-slate-900 focus:border-school-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                  </div>



                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase">
                      CPF
                    </label>
                    <input
                      type="text"
                      value={formProf.cpf}
                      onChange={(e) => setFormProf({ ...formProf, cpf: formatarCPF(e.target.value) })}
                      placeholder="000.000.000-00"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs uppercase text-slate-900 focus:border-school-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase">
                      RG
                    </label>
                    <input
                      type="text"
                      value={formProf.rg}
                      onChange={(e) => handleNovoUpperChange('rg', e.target.value)}
                      placeholder="0.000.000 SDS/PE"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs uppercase text-slate-900 focus:border-school-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase">
                      Data de Expedição do RG
                    </label>
                    <input
                      type="date"
                      value={formProf.rg_data_expedicao}
                      onChange={(e) => setFormProf({ ...formProf, rg_data_expedicao: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-school-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Seção 2: Formação Acadêmica & Titulação */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/40 space-y-3">
                <h4 className="font-bold text-slate-800 dark:text-slate-200 uppercase text-[11px] flex items-center gap-1.5">
                  <Award className="h-4 w-4 text-school-blue-600" />
                  2. Formação Acadêmica & Titulação
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase">
                      Titulação Acadêmica
                    </label>
                    <select
                      value={formProf.titulacao}
                      onChange={(e) => setFormProf({ ...formProf, titulacao: e.target.value as TitulacaoDocente })}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs uppercase font-bold text-slate-900 focus:border-school-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    >
                      {TITULACOES_DOCENTE.map((tit) => (
                        <option key={tit} value={tit}>
                          {tit}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase">
                      Faculdade / Universidade onde fez Graduação
                    </label>
                    <input
                      type="text"
                      value={formProf.graduacao_instituicao}
                      onChange={(e) => handleNovoUpperChange('graduacao_instituicao', e.target.value)}
                      placeholder="EX: UNIVERSIDADE FEDERAL DE PERNAMBUCO (UFPE)"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs uppercase text-slate-900 focus:border-school-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase">
                      Início da Graduação
                    </label>
                    <input
                      type="date"
                      value={formProf.graduacao_inicio}
                      onChange={(e) => setFormProf({ ...formProf, graduacao_inicio: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-school-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase">
                      Fim da Graduação
                    </label>
                    <input
                      type="date"
                      value={formProf.graduacao_fim}
                      onChange={(e) => setFormProf({ ...formProf, graduacao_fim: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-school-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase">
                      Área / Curso de Formação
                    </label>
                    <input
                      type="text"
                      value={formProf.formacao}
                      onChange={(e) => handleNovoUpperChange('formacao', e.target.value)}
                      placeholder="EX: LICENCIATURA EM MATEMÁTICA"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs uppercase text-slate-900 focus:border-school-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase">
                      Universidade da Pós-Graduação (Mestrado / Doutorado / Especialização)
                    </label>
                    <input
                      type="text"
                      value={formProf.pos_graduacao_instituicao}
                      onChange={(e) => handleNovoUpperChange('pos_graduacao_instituicao', e.target.value)}
                      placeholder="EX: PONTIFÍCIA UNIVERSIDADE CATÓLICA (PUC) / USP"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs uppercase text-slate-900 focus:border-school-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase">
                      Início da Pós-Graduação
                    </label>
                    <input
                      type="date"
                      value={formProf.pos_graduacao_inicio}
                      onChange={(e) => setFormProf({ ...formProf, pos_graduacao_inicio: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-school-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase">
                      Fim da Pós-Graduação
                    </label>
                    <input
                      type="date"
                      value={formProf.pos_graduacao_fim}
                      onChange={(e) => setFormProf({ ...formProf, pos_graduacao_fim: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-school-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase">
                      Disciplinas (separadas por vírgula)
                    </label>
                    <input
                      type="text"
                      value={formProf.disciplinasStr}
                      onChange={(e) => handleNovoUpperChange('disciplinasStr', e.target.value)}
                      placeholder="EX: MATEMÁTICA, FÍSICA"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs uppercase text-slate-900 focus:border-school-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Seção 3: Filiação e Endereço */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/40 space-y-3">
                <h4 className="font-bold text-slate-800 dark:text-slate-200 uppercase text-[11px] flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-school-blue-600" />
                  3. Filiação & Endereço Completo
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase">
                      Nome da Mãe
                    </label>
                    <input
                      type="text"
                      value={formProf.nome_mae}
                      onChange={(e) => handleNovoUpperChange('nome_mae', e.target.value)}
                      placeholder="NOME COMPLETO DA MÃE"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs uppercase text-slate-900 focus:border-school-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase">
                      Nome do Pai
                    </label>
                    <input
                      type="text"
                      value={formProf.nome_pai}
                      onChange={(e) => handleNovoUpperChange('nome_pai', e.target.value)}
                      placeholder="NOME COMPLETO DO PAI"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs uppercase text-slate-900 focus:border-school-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase">
                      Endereço Completo (Rua, Número, Bairro, Cidade, Estado, CEP)
                    </label>
                    <input
                      type="text"
                      value={formProf.endereco_completo}
                      onChange={(e) => handleNovoUpperChange('endereco_completo', e.target.value)}
                      placeholder="EX: RUA DAS FLORES, 120, BOA VISTA, RECIFE - PE, CEP 50000-000"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs uppercase text-slate-900 focus:border-school-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Seção 4: Contatos & Emergência */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/40 space-y-3">
                <h4 className="font-bold text-slate-800 dark:text-slate-200 uppercase text-[11px] flex items-center gap-1.5">
                  <Phone className="h-4 w-4 text-school-blue-600" />
                  4. Contatos & Telefones de Emergência
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase">
                      Telefone / WhatsApp Principal
                    </label>
                    <input
                      type="text"
                      value={formProf.telefone}
                      onChange={(e) => setFormProf({ ...formProf, telefone: formatarTelefone(e.target.value) })}
                      placeholder="(81) 98765-4321"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-school-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase">
                      E-mail Institucional
                    </label>
                    <input
                      type="email"
                      value={formProf.email}
                      onChange={(e) => handleNovoUpperChange('email', e.target.value)}
                      placeholder="DOCENTE@ESCOLA.EDU.BR"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs uppercase text-slate-900 focus:border-school-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase">
                      Nome do Contato de Emergência
                    </label>
                    <input
                      type="text"
                      value={formProf.contato_emergencia_nome}
                      onChange={(e) => handleNovoUpperChange('contato_emergencia_nome', e.target.value)}
                      placeholder="EX: MARIA (ESPOSA / IRMÃ)"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs uppercase text-slate-900 focus:border-school-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase">
                      Telefone de Emergência 1
                    </label>
                    <input
                      type="text"
                      value={formProf.telefone_emergencia}
                      onChange={(e) => setFormProf({ ...formProf, telefone_emergencia: formatarTelefone(e.target.value) })}
                      placeholder="(81) 99999-1111"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-school-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase">
                      Telefone de Emergência 2
                    </label>
                    <input
                      type="text"
                      value={formProf.telefone_emergencia2}
                      onChange={(e) => setFormProf({ ...formProf, telefone_emergencia2: formatarTelefone(e.target.value) })}
                      placeholder="(81) 98888-2222"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-school-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white font-mono"
                    />
                  </div>

                  {/* Toggle Apoio */}
                  <div className="flex items-center justify-between rounded-xl border border-purple-200/80 bg-purple-50/50 p-2.5 dark:border-purple-900/60 dark:bg-purple-950/30">
                    <span className="font-bold text-purple-900 dark:text-purple-200 text-xs">
                      Apoio Escolar / AEE
                    </span>
                    <button
                      type="button"
                      onClick={() => setFormProf((prev) => ({ ...prev, eh_apoio: !prev.eh_apoio }))}
                      className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        formProf.eh_apoio ? 'bg-purple-600' : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          formProf.eh_apoio ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Toggle Status Ativo/Inativo */}
                  <div className="flex items-center justify-between rounded-xl border border-emerald-200/80 bg-emerald-50/50 p-2.5 dark:border-emerald-900/60 dark:bg-emerald-950/30">
                    <div>
                      <span className="font-bold text-emerald-950 dark:text-emerald-200 text-xs block">
                        Status do Docente
                      </span>
                      <span className="text-[10px] text-emerald-700 dark:text-emerald-400">
                        {formProf.ativo ? 'Ativo no Quadro' : 'Inativo / Afastado'}
                      </span>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={formProf.ativo}
                      onClick={() => setFormProf((prev) => ({ ...prev, ativo: !prev.ativo }))}
                      className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        formProf.ativo ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          formProf.ativo ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              {/* Seção 5: Observações */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase">
                  Observações Gerais / Histórico
                </label>
                <textarea
                  rows={2}
                  value={formProf.observacoes}
                  onChange={(e) => handleNovoUpperChange('observacoes', e.target.value)}
                  placeholder="OBSERVAÇÕES ADICIONAIS SOBRE O DOCENTE..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs uppercase text-slate-900 focus:border-school-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalNovoProfAberto(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-school-blue-800 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-school-blue-700 dark:bg-school-blue-600"
                >
                  Cadastrar Docente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Alterar Dados do Colaborador (Docente ou Funcionário) */}
      {modalEditProfAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-school-dark-surface max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Edit2 className="h-5 w-5 text-school-blue-600 dark:text-school-gold-400" />
                  {formEditProf.tipo_profissional === 'funcionario'
                    ? 'Alterar Ficha do Funcionário'
                    : 'Alterar Dados do Docente'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Atualização cadastral e funcional em CAIXA ALTA
                </p>
              </div>
              <button
                onClick={() => setModalEditProfAberto(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSalvarEdicaoProfessor} className="mt-4 space-y-4 text-xs">
              {/* Seção 1: Identificação Civil e Funcional */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/40 space-y-3">
                <h4 className="font-bold text-slate-800 dark:text-slate-200 uppercase text-[11px] flex items-center gap-1.5">
                  <UserCheck className="h-4 w-4 text-school-blue-600" />
                  1. Identificação Civil e Funcional
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase">
                      Nome Completo *
                    </label>
                    <input
                      type="text"
                      required
                      value={formEditProf.nome_completo}
                      onChange={(e) => handleEditUpperChange('nome_completo', e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs uppercase text-slate-900 focus:border-school-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase">
                      CPF
                    </label>
                    <input
                      type="text"
                      value={formEditProf.cpf}
                      onChange={(e) => setFormEditProf({ ...formEditProf, cpf: formatarCPF(e.target.value) })}
                      placeholder="000.000.000-00"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs uppercase text-slate-900 focus:border-school-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase">
                      RG / Órgão Emissor
                    </label>
                    <input
                      type="text"
                      value={formEditProf.rg}
                      onChange={(e) => handleEditUpperChange('rg', e.target.value)}
                      placeholder="0.000.000 SDS/PE"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs uppercase text-slate-900 focus:border-school-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase">
                      Data de Expedição do RG
                    </label>
                    <input
                      type="date"
                      value={formEditProf.rg_data_expedicao}
                      onChange={(e) => setFormEditProf({ ...formEditProf, rg_data_expedicao: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-school-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase">
                      Data de Nascimento
                    </label>
                    <input
                      type="date"
                      value={formEditProf.data_nascimento}
                      onChange={(e) => setFormEditProf({ ...formEditProf, data_nascimento: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-school-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase">
                      Gênero
                    </label>
                    <select
                      value={formEditProf.genero || 'NÃO INFORMADO'}
                      onChange={(e) => setFormEditProf({ ...formEditProf, genero: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs uppercase text-slate-900 focus:border-school-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white font-bold"
                    >
                      <option value="MASCULINO">MASCULINO</option>
                      <option value="FEMININO">FEMININO</option>
                      <option value="OUTRO">OUTRO</option>
                      <option value="NÃO INFORMADO">NÃO INFORMADO</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase">
                      Matrícula Funcional
                    </label>
                    <input
                      type="text"
                      value={formEditProf.matricula}
                      onChange={(e) => handleEditUpperChange('matricula', e.target.value)}
                      placeholder="MATRÍCULA"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs uppercase text-slate-900 focus:border-school-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase">
                      Vínculo Empregatício / Contrato
                    </label>
                    <select
                      value={formEditProf.vinculo_empregaticio || 'EFETIVO'}
                      onChange={(e) => setFormEditProf({ ...formEditProf, vinculo_empregaticio: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs uppercase text-slate-900 focus:border-school-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white font-bold"
                    >
                      <option value="EFETIVO">EFETIVO</option>
                      <option value="CONTRATO TEMPORÁRIO">CONTRATO TEMPORÁRIO</option>
                      <option value="CLT">CLT</option>
                      <option value="COMISSIONADO">COMISSIONADO</option>
                      <option value="OUTRO">OUTRO</option>
                    </select>
                  </div>

                  {/* Toggle Status Ativo/Inativo */}
                  <div className="flex items-center justify-between rounded-xl border border-emerald-200/80 bg-emerald-50/50 p-2.5 dark:border-emerald-900/60 dark:bg-emerald-950/30 sm:col-span-3">
                    <div>
                      <span className="font-bold text-emerald-950 dark:text-emerald-200 text-xs block">
                        Status do Colaborador
                      </span>
                      <span className="text-[10px] text-emerald-700 dark:text-emerald-400">
                        {formEditProf.ativo ? 'Ativo no Quadro' : 'Inativo / Afastado'}
                      </span>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={formEditProf.ativo}
                      onClick={() => setFormEditProf((prev) => ({ ...prev, ativo: !prev.ativo }))}
                      className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        formEditProf.ativo ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          formEditProf.ativo ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              {/* Seção 2: Específica por Categoria */}
              {formEditProf.tipo_profissional === 'funcionario' ? (
                /* Função na Escola para Funcionários (SELEÇÃO ÚNICA SEM DROPDOWN) */
                <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4 dark:border-amber-900/40 dark:bg-amber-950/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-amber-900 dark:text-amber-200 uppercase text-[11px] flex items-center gap-1.5">
                      <Briefcase className="h-4 w-4 text-amber-600" />
                      2. Função na Escola * (Seleção Visual Exclusiva)
                    </h4>
                    <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300">
                      Obrigatório
                    </span>
                  </div>
                  <FuncaoEscolaSelector
                    value={formEditProf.funcao_escola as FuncaoEscola}
                    onChange={(novaFuncao) =>
                      setFormEditProf((prev) => ({ ...prev, funcao_escola: novaFuncao }))
                    }
                  />
                </div>
              ) : (
                /* Formação Acadêmica & Titulação para Docentes */
                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/40 space-y-3">
                  <h4 className="font-bold text-slate-800 dark:text-slate-200 uppercase text-[11px] flex items-center gap-1.5">
                    <Award className="h-4 w-4 text-school-blue-600" />
                    2. Formação Acadêmica & Titulação
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase">
                        Titulação Acadêmica
                      </label>
                      <select
                        value={formEditProf.titulacao}
                        onChange={(e) =>
                          setFormEditProf({ ...formEditProf, titulacao: e.target.value as TitulacaoDocente })
                        }
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs uppercase font-bold text-slate-900 focus:border-school-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                      >
                        {TITULACOES_DOCENTE.map((tit) => (
                          <option key={tit} value={tit}>
                            {tit}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase">
                        Faculdade / Universidade onde fez Graduação
                      </label>
                      <input
                        type="text"
                        value={formEditProf.graduacao_instituicao}
                        onChange={(e) => handleEditUpperChange('graduacao_instituicao', e.target.value)}
                        placeholder="EX: UFPE"
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs uppercase text-slate-900 focus:border-school-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase">
                        Início da Graduação
                      </label>
                      <input
                        type="date"
                        value={formEditProf.graduacao_inicio}
                        onChange={(e) => setFormEditProf({ ...formEditProf, graduacao_inicio: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-school-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase">
                        Fim da Graduação
                      </label>
                      <input
                        type="date"
                        value={formEditProf.graduacao_fim}
                        onChange={(e) => setFormEditProf({ ...formEditProf, graduacao_fim: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-school-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase">
                        Área / Curso de Formação
                      </label>
                      <input
                        type="text"
                        value={formEditProf.formacao}
                        onChange={(e) => handleEditUpperChange('formacao', e.target.value)}
                        placeholder="EX: LICENCIATURA EM LETRAS"
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs uppercase text-slate-900 focus:border-school-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                      />
                    </div>

                    <div className="sm:col-span-3">
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase">
                        Universidade da Pós-Graduação (Mestrado / Doutorado / Especialização)
                      </label>
                      <input
                        type="text"
                        value={formEditProf.pos_graduacao_instituicao}
                        onChange={(e) => handleEditUpperChange('pos_graduacao_instituicao', e.target.value)}
                        placeholder="EX: USP / UNICAMP"
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs uppercase text-slate-900 focus:border-school-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase">
                        Início da Pós-Graduação
                      </label>
                      <input
                        type="date"
                        value={formEditProf.pos_graduacao_inicio}
                        onChange={(e) => setFormEditProf({ ...formEditProf, pos_graduacao_inicio: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-school-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase">
                        Fim da Pós-Graduação
                      </label>
                      <input
                        type="date"
                        value={formEditProf.pos_graduacao_fim}
                        onChange={(e) => setFormEditProf({ ...formEditProf, pos_graduacao_fim: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-school-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase">
                        Disciplinas Habilitadas
                      </label>
                      <input
                        type="text"
                        value={formEditProf.disciplinasStr}
                        onChange={(e) => handleEditUpperChange('disciplinasStr', e.target.value)}
                        placeholder="EX: PORTUGUÊS, LITERATURA"
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs uppercase text-slate-900 focus:border-school-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Seção 3: Filiação & Endereço Completo */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/40 space-y-3">
                <h4 className="font-bold text-slate-800 dark:text-slate-200 uppercase text-[11px] flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-school-blue-600" />
                  3. Filiação & Endereço Completo
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase">
                      Filiação 1 (Mãe)
                    </label>
                    <input
                      type="text"
                      value={formEditProf.filiacao_1 || formEditProf.nome_mae}
                      onChange={(e) => {
                        const val = e.target.value.toUpperCase();
                        setFormEditProf((prev) => ({ ...prev, filiacao_1: val, nome_mae: val }));
                      }}
                      placeholder="NOME COMPLETO DA MÃE / FILIAÇÃO 1"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs uppercase text-slate-900 focus:border-school-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase">
                      Filiação 2 (Pai / Outro)
                    </label>
                    <input
                      type="text"
                      value={formEditProf.filiacao_2 || formEditProf.nome_pai}
                      onChange={(e) => {
                        const val = e.target.value.toUpperCase();
                        setFormEditProf((prev) => ({ ...prev, filiacao_2: val, nome_pai: val }));
                      }}
                      placeholder="NOME COMPLETO DO PAI / FILIAÇÃO 2"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs uppercase text-slate-900 focus:border-school-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                  </div>

                  {/* CEP com busca automática ViaCEP */}
                  <div className="sm:col-span-2">
                    <div className="flex items-end gap-2">
                      <div className="flex-1">
                        <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase">
                          CEP (Busca Automática)
                        </label>
                        <input
                          type="text"
                          value={formEditProf.cep}
                          onChange={(e) => {
                            const cepFormatado = formatarCEP(e.target.value);
                            setFormEditProf((prev) => ({ ...prev, cep: cepFormatado }));
                            if (cepFormatado.replace(/\D/g, '').length === 8) {
                              handleConsultarCepEdit(cepFormatado);
                            }
                          }}
                          placeholder="00000-000"
                          maxLength={9}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs uppercase text-slate-900 focus:border-school-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white font-mono"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleConsultarCepEdit(formEditProf.cep)}
                        disabled={buscandoCepEdit || formEditProf.cep.replace(/\D/g, '').length !== 8}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                      >
                        {buscandoCepEdit ? <Loader2 className="h-4 w-4 animate-spin text-school-blue-600" /> : <Search className="h-4 w-4" />}
                        <span>Buscar</span>
                      </button>
                    </div>
                    {cepEditFeedback && (
                      <span className="text-[11px] font-semibold text-school-blue-600 dark:text-school-gold-400 mt-1 block">
                        {cepEditFeedback}
                      </span>
                    )}
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase">
                      Logradouro (Rua, Av.)
                    </label>
                    <input
                      type="text"
                      value={formEditProf.logradouro}
                      onChange={(e) => handleEditUpperChange('logradouro', e.target.value)}
                      placeholder="RUA DAS FLORES"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs uppercase text-slate-900 focus:border-school-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase">
                        Número
                      </label>
                      <input
                        type="text"
                        value={formEditProf.numero}
                        onChange={(e) => handleEditUpperChange('numero', e.target.value)}
                        placeholder="123"
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs uppercase text-slate-900 focus:border-school-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase">
                        Complemento
                      </label>
                      <input
                        type="text"
                        value={formEditProf.complemento}
                        onChange={(e) => handleEditUpperChange('complemento', e.target.value)}
                        placeholder="APTO 101"
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs uppercase text-slate-900 focus:border-school-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase">
                      Bairro
                    </label>
                    <input
                      type="text"
                      value={formEditProf.bairro}
                      onChange={(e) => handleEditUpperChange('bairro', e.target.value)}
                      placeholder="CENTRO"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs uppercase text-slate-900 focus:border-school-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase">
                        Cidade
                      </label>
                      <input
                        type="text"
                        value={formEditProf.cidade}
                        onChange={(e) => handleEditUpperChange('cidade', e.target.value)}
                        placeholder="CIDADE"
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs uppercase text-slate-900 focus:border-school-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase">
                        UF
                      </label>
                      <input
                        type="text"
                        maxLength={2}
                        value={formEditProf.uf}
                        onChange={(e) => handleEditUpperChange('uf', e.target.value)}
                        placeholder="PE"
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs uppercase text-slate-900 focus:border-school-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Seção 4: Contatos & Telefones de Emergência */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/40 space-y-3">
                <h4 className="font-bold text-slate-800 dark:text-slate-200 uppercase text-[11px] flex items-center gap-1.5">
                  <Phone className="h-4 w-4 text-school-blue-600" />
                  4. Contatos & Telefones de Emergência
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase">
                      Telefone Principal
                    </label>
                    <input
                      type="text"
                      value={formEditProf.telefone}
                      onChange={(e) => setFormEditProf({ ...formEditProf, telefone: formatarTelefone(e.target.value) })}
                      placeholder="(81) 98765-4321"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-school-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase">
                      Celular / WhatsApp
                    </label>
                    <input
                      type="text"
                      value={formEditProf.celular_whatsapp}
                      onChange={(e) => setFormEditProf({ ...formEditProf, celular_whatsapp: formatarTelefone(e.target.value) })}
                      placeholder="(81) 98888-7777"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-school-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase">
                      E-mail Institucional
                    </label>
                    <input
                      type="email"
                      value={formEditProf.email}
                      onChange={(e) => handleEditUpperChange('email', e.target.value)}
                      placeholder="COLABORADOR@ESCOLA.EDU.BR"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs uppercase text-slate-900 focus:border-school-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase">
                      Nome do Contato de Emergência
                    </label>
                    <input
                      type="text"
                      value={formEditProf.contato_emergencia_nome}
                      onChange={(e) => handleEditUpperChange('contato_emergencia_nome', e.target.value)}
                      placeholder="EX: MARIA SILVA"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs uppercase text-slate-900 focus:border-school-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase">
                      Parentesco do Contato
                    </label>
                    <input
                      type="text"
                      value={formEditProf.contato_emergencia_parentesco}
                      onChange={(e) => handleEditUpperChange('contato_emergencia_parentesco', e.target.value)}
                      placeholder="EX: CÔNJUGE, MÃE, IRMÃO"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs uppercase text-slate-900 focus:border-school-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase">
                      Telefone de Emergência 1
                    </label>
                    <input
                      type="text"
                      value={formEditProf.telefone_emergencia}
                      onChange={(e) => setFormEditProf({ ...formEditProf, telefone_emergencia: formatarTelefone(e.target.value) })}
                      placeholder="(81) 99999-1111"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-school-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase">
                      Telefone de Emergência 2
                    </label>
                    <input
                      type="text"
                      value={formEditProf.telefone_emergencia2}
                      onChange={(e) => setFormEditProf({ ...formEditProf, telefone_emergencia2: formatarTelefone(e.target.value) })}
                      placeholder="(81) 98888-2222"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-school-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white font-mono"
                    />
                  </div>

                  {/* Toggle Apoio (somente para Docentes) */}
                  {formEditProf.tipo_profissional !== 'funcionario' && (
                    <div className="flex items-center justify-between rounded-xl border border-purple-200/80 bg-purple-50/50 p-2.5 dark:border-purple-900/60 dark:bg-purple-950/30 sm:col-span-2">
                      <span className="font-bold text-purple-900 dark:text-purple-200 text-xs">
                        Apoio Escolar / AEE
                      </span>
                      <button
                        type="button"
                        onClick={() => setFormEditProf((prev) => ({ ...prev, eh_apoio: !prev.eh_apoio }))}
                        className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          formEditProf.eh_apoio ? 'bg-purple-600' : 'bg-slate-300 dark:bg-slate-700'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            formEditProf.eh_apoio ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Seção 5: Observações */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase">
                  Observações Gerais / Histórico Funcional
                </label>
                <textarea
                  rows={2}
                  value={formEditProf.observacoes}
                  onChange={(e) => handleEditUpperChange('observacoes', e.target.value)}
                  placeholder="OBSERVAÇÕES ADICIONAIS SOBRE O COLABORADOR..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs uppercase text-slate-900 focus:border-school-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalEditProfAberto(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-xl bg-school-blue-800 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-school-blue-700 dark:bg-school-blue-600"
                >
                  <Save className="h-4 w-4" />
                  <span>Salvar Alterações</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Ficha Funcional Completa do Colaborador (Docente ou Funcionário) */}
      {modalFichaProfAberto && professorSelecionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl rounded-2xl bg-white p-6 sm:p-8 shadow-2xl dark:bg-school-dark-surface max-h-[92vh] overflow-y-auto border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4 dark:border-slate-800">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs font-bold text-school-blue-700 dark:text-school-gold-400 uppercase">
                    {professorSelecionado.matricula || 'MATRÍCULA N/I'}
                  </span>

                  {professorSelecionado.tipo_profissional === 'funcionario' ? (
                    <>
                      <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-900 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-300/80">
                        <span>{getEmojiFuncao(professorSelecionado.funcao_escola)}</span>
                        <span>{professorSelecionado.funcao_escola || 'FUNCIONÁRIO'}</span>
                      </span>
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {professorSelecionado.vinculo_empregaticio || 'EFETIVO'}
                      </span>
                    </>
                  ) : (
                    professorSelecionado.eh_apoio && (
                      <span className="rounded-md bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-200/60">
                        Apoio / AEE
                      </span>
                    )
                  )}

                  {professorSelecionado.ativo !== false ? (
                    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/70">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      Ativo
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-md bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200/70">
                      <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                      Inativo
                    </span>
                  )}
                </div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase mt-1">
                  {professorSelecionado.nome_completo}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    handleAbrirEditar(professorSelecionado);
                    setModalFichaProfAberto(false);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                  <span>Editar</span>
                </button>
                <button
                  onClick={() => setModalFichaProfAberto(false)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Conteúdo da Ficha: Condicional para Funcionário vs Docente */}
            {professorSelecionado.tipo_profissional === 'funcionario' ? (
              <div className="mt-5 space-y-4 text-xs uppercase text-slate-700 dark:text-slate-300">
                {/* 1. Identificação Civil e Funcional */}
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/50 space-y-2">
                  <h4 className="font-bold text-slate-900 dark:text-white text-[11px] flex items-center gap-1.5">
                    <UserCheck className="h-4 w-4 text-amber-600" />
                    1. Identificação Civil e Funcional
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    <div><strong>CPF:</strong> {professorSelecionado.cpf || 'NÃO INFORMADO'}</div>
                    <div><strong>RG:</strong> {professorSelecionado.rg || 'NÃO INFORMADO'}</div>
                    <div>
                      <strong>Data Nascimento:</strong>{' '}
                      {professorSelecionado.data_nascimento
                        ? new Date(professorSelecionado.data_nascimento + 'T00:00:00').toLocaleDateString('pt-BR')
                        : 'NÃO INFORMADA'}
                    </div>
                    <div><strong>Gênero:</strong> {professorSelecionado.genero || 'NÃO INFORMADO'}</div>
                    <div><strong>Matrícula:</strong> {professorSelecionado.matricula || 'NÃO INFORMADA'}</div>
                    <div><strong>Vínculo:</strong> {professorSelecionado.vinculo_empregaticio || 'EFETIVO'}</div>
                  </div>
                </div>

                {/* 2. Função na Escola */}
                <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-900/40 dark:bg-amber-950/20 space-y-2">
                  <h4 className="font-bold text-amber-900 dark:text-amber-200 text-[11px] flex items-center gap-1.5">
                    <Briefcase className="h-4 w-4 text-amber-600" />
                    2. Função na Escola
                  </h4>
                  <div className="inline-flex items-center gap-3 rounded-xl bg-white p-3 border border-amber-300 dark:bg-school-dark-surface dark:border-amber-700/60 shadow-sm w-full">
                    <span className="text-3xl">{getEmojiFuncao(professorSelecionado.funcao_escola)}</span>
                    <div>
                      <span className="text-sm font-black text-amber-950 dark:text-amber-200 block">
                        {professorSelecionado.funcao_escola || 'NÃO DEFINIDA'}
                      </span>
                      <span className="text-[10px] text-slate-500 normal-case block">
                        Profissional do quadro funcional e operacional da unidade escolar
                      </span>
                    </div>
                  </div>
                </div>

                {/* 3. Filiação & Endereço Completo */}
                <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800 space-y-2">
                  <h4 className="font-bold text-slate-900 dark:text-white text-[11px] flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 text-school-blue-600" />
                    3. Filiação & Endereço Completo
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div><strong>Filiação 1 (Mãe):</strong> {professorSelecionado.filiacao_1 || professorSelecionado.nome_mae || 'NÃO INFORMADA'}</div>
                    <div><strong>Filiação 2 (Pai):</strong> {professorSelecionado.filiacao_2 || professorSelecionado.nome_pai || 'NÃO INFORMADO'}</div>
                    <div><strong>CEP:</strong> {professorSelecionado.cep || 'NÃO INFORMADO'}</div>
                    <div><strong>Bairro:</strong> {professorSelecionado.bairro || 'NÃO INFORMADO'}</div>
                    <div className="sm:col-span-2">
                      <strong>Logradouro / Nº / Compl:</strong>{' '}
                      {[
                        professorSelecionado.logradouro,
                        professorSelecionado.numero ? `Nº ${professorSelecionado.numero}` : '',
                        professorSelecionado.complemento,
                      ].filter(Boolean).join(', ') || professorSelecionado.endereco_completo || 'NÃO INFORMADO'}
                    </div>
                    <div className="sm:col-span-2">
                      <strong>Cidade / UF:</strong>{' '}
                      {professorSelecionado.cidade
                        ? `${professorSelecionado.cidade} - ${professorSelecionado.uf || 'PE'}`
                        : 'NÃO INFORMADA'}
                    </div>
                  </div>
                </div>

                {/* 4. Contatos & Telefones de Emergência */}
                <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800 space-y-2">
                  <h4 className="font-bold text-slate-900 dark:text-white text-[11px] flex items-center gap-1.5">
                    <Phone className="h-4 w-4 text-school-blue-600" />
                    4. Contatos & Telefones de Emergência
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div><strong>E-mail:</strong> {professorSelecionado.email || 'NÃO INFORMADO'}</div>
                    <div><strong>Telefone Principal:</strong> {professorSelecionado.telefone || 'NÃO INFORMADO'}</div>
                    <div><strong>Celular / WhatsApp:</strong> {professorSelecionado.celular_whatsapp || professorSelecionado.telefone || 'NÃO INFORMADO'}</div>
                    <div>
                      <strong>Contato de Emergência:</strong>{' '}
                      {professorSelecionado.contato_emergencia_nome || 'NÃO INFORMADO'}{' '}
                      {professorSelecionado.contato_emergencia_parentesco
                        ? `(${professorSelecionado.contato_emergencia_parentesco})`
                        : ''}
                    </div>
                    <div className="sm:col-span-2">
                      <strong>Telefone de Emergência:</strong>{' '}
                      {professorSelecionado.telefone_emergencia || professorSelecionado.telefone_emergencia2 || 'NÃO INFORMADO'}
                    </div>
                  </div>
                </div>

                {/* 5. Observações */}
                {professorSelecionado.observacoes && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/50 space-y-1">
                    <h4 className="font-bold text-slate-900 dark:text-white text-[11px]">Observações / Histórico</h4>
                    <p className="text-slate-600 dark:text-slate-300 font-normal normal-case">
                      {professorSelecionado.observacoes}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-5 space-y-4 text-xs uppercase text-slate-700 dark:text-slate-300">
                {/* Documentação */}
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/50 space-y-1.5">
                  <h4 className="font-bold text-slate-900 dark:text-white text-[11px]">Documentos Pessoais</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <div><strong>CPF:</strong> {professorSelecionado.cpf || 'NÃO INFORMADO'}</div>
                    <div><strong>RG:</strong> {professorSelecionado.rg || 'NÃO INFORMADO'}</div>
                    <div>
                      <strong>Expedição RG:</strong>{' '}
                      {professorSelecionado.rg_data_expedicao
                        ? new Date(professorSelecionado.rg_data_expedicao + 'T00:00:00').toLocaleDateString('pt-BR')
                        : 'NÃO INFORMADA'}
                    </div>
                  </div>
                </div>

                {/* Formação e Titulação */}
                <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-4 dark:border-blue-900/40 dark:bg-blue-950/20 space-y-1.5">
                  <h4 className="font-bold text-school-blue-950 dark:text-blue-200 text-[11px]">Formação & Titulação</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div><strong>Titulação:</strong> <span className="font-bold text-school-blue-700 dark:text-school-gold-400">{professorSelecionado.titulacao || 'GRADUAÇÃO'}</span></div>
                    <div><strong>Curso / Área:</strong> {professorSelecionado.formacao || 'NÃO DECLARADA'}</div>
                    <div className="sm:col-span-2">
                      <strong>Graduação:</strong> {professorSelecionado.graduacao_instituicao || 'NÃO INFORMADA'} 
                      {professorSelecionado.graduacao_inicio && ` (${professorSelecionado.graduacao_inicio} a ${professorSelecionado.graduacao_fim || 'ATUAL'})`}
                    </div>
                    <div className="sm:col-span-2">
                      <strong>Pós-Graduação:</strong> {professorSelecionado.pos_graduacao_instituicao || 'NÃO INFORMADA'}
                      {professorSelecionado.pos_graduacao_inicio && ` (${professorSelecionado.pos_graduacao_inicio} a ${professorSelecionado.pos_graduacao_fim || 'ATUAL'})`}
                    </div>
                    <div className="sm:col-span-2">
                      <strong>Disciplinas:</strong> {professorSelecionado.disciplinas?.join(', ') || 'NENHUMA'}
                    </div>
                  </div>
                </div>

                {/* Filiação e Residência */}
                <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800 space-y-1.5">
                  <h4 className="font-bold text-slate-900 dark:text-white text-[11px]">Filiação & Residência</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div><strong>Mãe:</strong> {professorSelecionado.nome_mae || 'NÃO INFORMADA'}</div>
                    <div><strong>Pai:</strong> {professorSelecionado.nome_pai || 'NÃO INFORMADO'}</div>
                    <div className="sm:col-span-2"><strong>Endereço Completo:</strong> {professorSelecionado.endereco_completo || 'NÃO INFORMADO'}</div>
                  </div>
                </div>

                {/* Telefones e Emergência */}
                <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800 space-y-1.5">
                  <h4 className="font-bold text-slate-900 dark:text-white text-[11px]">Contatos & Emergência</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div><strong>Telefone:</strong> {professorSelecionado.telefone || 'NÃO INFORMADO'}</div>
                    <div><strong>E-mail:</strong> {professorSelecionado.email || 'NÃO INFORMADO'}</div>
                    <div><strong>Contato Emergência:</strong> {professorSelecionado.contato_emergencia_nome || 'NÃO INFORMADO'}</div>
                    <div><strong>Tel. Emergência 1:</strong> {professorSelecionado.telefone_emergencia || 'NÃO INFORMADO'}</div>
                    <div className="sm:col-span-2"><strong>Tel. Emergência 2:</strong> {professorSelecionado.telefone_emergencia2 || 'NÃO INFORMADO'}</div>
                  </div>
                </div>

                {/* Observações */}
                {professorSelecionado.observacoes && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/50 space-y-1">
                    <h4 className="font-bold text-slate-900 dark:text-white text-[11px]">Observações</h4>
                    <p className="text-slate-600 dark:text-slate-300 font-normal">
                      {professorSelecionado.observacoes}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 4: Registrar Falta / Atestado */}
      {modalNovaFaltaAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-school-dark-surface">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Calendar className="h-5 w-5 text-school-blue-600 dark:text-school-gold-400" />
                Registrar Ausência / Falta Docente
              </h3>
              <button
                onClick={() => setModalNovaFaltaAberto(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleRegistrarFalta} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase">
                  Selecione o Docente *
                </label>
                <select
                  required
                  value={formFalta.professor_id}
                  onChange={(e) => setFormFalta({ ...formFalta, professor_id: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs uppercase text-slate-900 focus:border-school-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                >
                  {professores.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome_completo} ({p.matricula})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase">
                    Data da Ausência *
                  </label>
                  <input
                    type="date"
                    required
                    value={formFalta.data_falta}
                    onChange={(e) => setFormFalta({ ...formFalta, data_falta: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:border-school-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase">
                    Quantidade de Aulas *
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={8}
                    required
                    value={formFalta.aulas_faltadas}
                    onChange={(e) => setFormFalta({ ...formFalta, aulas_faltadas: Number(e.target.value) })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:border-school-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase">
                  Justificativa / Motivo Declarado *
                </label>
                <textarea
                  rows={3}
                  required
                  value={formFalta.justificativa}
                  onChange={(e) => setFormFalta({ ...formFalta, justificativa: e.target.value.toUpperCase() })}
                  placeholder="EX: CONSULTA MÉDICA COMPROVADA COM DECLARAÇÃO..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs uppercase text-slate-900 focus:border-school-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase">
                  Link do Atestado Médico no Google Drive
                </label>
                <input
                  type="url"
                  value={formFalta.atestado_drive_link}
                  onChange={(e) => setFormFalta({ ...formFalta, atestado_drive_link: e.target.value })}
                  placeholder="https://drive.google.com/file/d/.../view"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:border-school-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalNovaFaltaAberto(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-school-blue-800 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-school-blue-700 dark:bg-school-blue-600"
                >
                  Salvar Registro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: Cadastrar Novo Funcionário */}
      <ModalNovoFuncionario
        isOpen={modalNovoFuncAberto}
        onClose={() => setModalNovoFuncAberto(false)}
        onCadastrar={handleCadastrarFuncionario}
      />
    </div>
  );
}
