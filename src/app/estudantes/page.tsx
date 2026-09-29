'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { PrintHeader } from '@/components/layout/PrintHeader';
import { 
  Users, 
  Plus, 
  Search, 
  Filter, 
  FileText, 
  Upload, 
  ExternalLink, 
  Printer, 
  Trash2, 
  Edit3, 
  ShieldAlert, 
  Check, 
  AlertCircle,
  X,
  UploadCloud,
  FileCheck,
  Phone,
  Mail,
  MapPin,
  HeartHandshake,
  Award,
  CheckCircle2,
  Building,
  UserCheck,
  CreditCard,
  Calendar,
  Sparkles,
  Bookmark,
  Camera,
  Download,
  MessageSquare,
  Folder
} from 'lucide-react';
import { PainelRelatoriosEstudante } from '@/components/relatorios/PainelRelatoriosEstudante';
import { TimelineObservacoesAluno } from '@/components/estudantes/TimelineObservacoesAluno';
import { RepositorioDriveAluno } from '@/components/estudantes/RepositorioDriveAluno';
import { Estudante, TipoMovimentacao, StatusMatricula, PercentualCota, TipoHistoricoEscolar } from '@/lib/types';
import { formatarTelefone, formatarCPF, validarCPF, CPF_ESTUDANTE_SEM_DOCUMENTO, isCpfEstudanteSemDocumento } from '@/lib/validations';
import { FotoEstudanteField } from '@/components/estudantes/FotoEstudanteField';

const CIDADES_PADRAO = [
  'RECIFE - PE',
  'CARUARU - PE',
  'PETROLINA - PE',
  'GARANHUNS - PE',
  'OLINDA - PE',
  'JABOATÃO DOS GUARARAPES - PE',
  'PAULISTA - PE',
  'SÃO PAULO - SP',
  'CAMPINAS - SP',
  'GUARULHOS - SP',
  'RIO DE JANEIRO - RJ',
  'BELO HORIZONTE - MG',
  'SALVADOR - BA',
  'FORTALEZA - CE',
  'BRASÍLIA - DF',
  'CURITIBA - PR',
  'PORTO ALEGRE - RS',
];

export default function EstudantesPage() {
  const { 
    estudantes, 
    turmas, 
    professores,
    escolaConfig,
    addEstudante, 
    updateEstudante, 
    deleteEstudante, 
    addDocumentoToEstudante 
  } = useApp();

  // Professores marcados como Apoio Escolar / AEE
  const professoresApoio = useMemo(() => {
    return (professores || []).filter((p) => Boolean(p.eh_apoio));
  }, [professores]);
  
  // Filtros
  const [busca, setBusca] = useState('');
  const [filtroTurma, setFiltroTurma] = useState('');
  const [filtroAee, setFiltroAee] = useState<'todos' | 'com_aee' | 'sem_aee'>('todos');

  // Modais
  const [modalNovoAberto, setModalNovoAberto] = useState(false);
  const [editandoEstudanteId, setEditandoEstudanteId] = useState<string | null>(null);
  const [modalUploadAberto, setModalUploadAberto] = useState(false);
  const [modalFichaAberto, setModalFichaAberto] = useState(false);
  const [estudanteSelecionado, setEstudanteSelecionado] = useState<Estudante | null>(null);
  const [abaFicha, setAbaFicha] = useState<'cadastro' | 'relatorios' | 'observacoes' | 'drive'>('cadastro');
  const [fotoPreviewEstudante, setFotoPreviewEstudante] = useState<Estudante | null>(null);

  // Estados de Upload para Google Drive
  const [uploadTipoDoc, setUploadTipoDoc] = useState<'rg' | 'comprovante_residencia' | 'laudo_medico' | 'certidao_nascimento' | 'outro'>('rg');
  const [uploadArquivo, setUploadArquivo] = useState<File | null>(null);
  const [uploadEnviando, setUploadEnviando] = useState(false);
  const [uploadMensagem, setUploadMensagem] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cidades já digitadas (histórico memorizado em LocalStorage)
  const [cidadesDigitadas, setCidadesDigitadas] = useState<string[]>(CIDADES_PADRAO);

  useEffect(() => {
    try {
      const salvas = localStorage.getItem('plugue_cidades_nascimento');
      const daLista = estudantes
        .map(e => e.naturalidade_cidade)
        .filter((c): c is string => Boolean(c && c.trim() !== ''));
      
      let base = CIDADES_PADRAO;
      if (salvas) {
        base = Array.from(new Set([...base, ...JSON.parse(salvas)]));
      }
      setCidadesDigitadas(Array.from(new Set([...base, ...daLista])));
    } catch (e) {
      // Ignorar erros de parse do storage
    }
  }, [estudantes]);

  const salvarNovaCidade = (novaCidade: string) => {
    const limpa = novaCidade.trim();
    if (!limpa) return;
    setCidadesDigitadas(prev => {
      if (prev.includes(limpa)) return prev;
      const atualizadas = [limpa, ...prev];
      try {
        localStorage.setItem('plugue_cidades_nascimento', JSON.stringify(atualizadas));
      } catch (e) {}
      return atualizadas;
    });
  };

  // Formulário Inicial (Obrigatoriamente em Caixa Alta)
  const formInicial = {
    nome_completo: '',
    turma_id: turmas[0]?.id || '',
    data_nascimento: '',
    cpf: '',
    rg_numero: '',
    rg_data_expedicao: '',
    certidao_nascimento: '',
    naturalidade_cidade: 'RECIFE - PE',
    nacionalidade: 'BRASILEIRA', // Padrão brasileira em caixa alta
    numero_sus: '',
    numero_bolsa_familia: '',
    percentual_cota: '0%' as PercentualCota, // Cotista 0%, 50% ou 100%
    filiacao_materna: '',
    filiacao_paterna: '',
    nome_responsavel: '',
    cpf_responsavel: '',
    parentesco_responsavel: 'MÃE',
    telefone_responsavel: '',
    telefone_2: '',
    telefone_3: '',
    telefone_4: '',
    email: '',
    endereco: '',
    endereco_logradouro: '',
    endereco_numero: '',
    endereco_bairro: '',
    possui_laudo: false,
    laudo_descricao: '',
    aee: false,
    apoio_id: '',
    apoio_nome: '',
    foto_url: '',
    status_matricula: 'Ativo' as StatusMatricula,
    tipo_movimentacao: 'Entrada Externa' as TipoMovimentacao,
    tipo_historico_escolar: 'Não entregue' as TipoHistoricoEscolar,
    observacoes: '',
  };

  const [form, setForm] = useState(formInicial);

  // Helper para digitação obrigatoriamente em Caixa Alta
  const handleUpperChange = (campo: string, valor: string) => {
    setForm((prev) => ({
      ...prev,
      [campo]: valor.toUpperCase(),
    }));
  };

  const handleAbrirNovo = () => {
    setEditandoEstudanteId(null);
    setForm({
      ...formInicial,
      turma_id: turmas[0]?.id || '',
    });
    setModalNovoAberto(true);
  };

  const handleAbrirEditar = (est: Estudante) => {
    setEditandoEstudanteId(est.id);
    setForm({
      nome_completo: (est.nome_completo || '').toUpperCase(),
      turma_id: est.turma_id || turmas[0]?.id || '',
      data_nascimento: est.data_nascimento ? est.data_nascimento.split('T')[0] : '',
      cpf: (est.cpf || '').toUpperCase(),
      rg_numero: (est.rg_numero || '').toUpperCase(),
      rg_data_expedicao: est.rg_data_expedicao || '',
      certidao_nascimento: (est.certidao_nascimento || '').toUpperCase(),
      naturalidade_cidade: (est.naturalidade_cidade || 'RECIFE - PE').toUpperCase(),
      nacionalidade: (est.nacionalidade || 'BRASILEIRA').toUpperCase(),
      numero_sus: (est.numero_sus || '').toUpperCase(),
      numero_bolsa_familia: (est.numero_bolsa_familia || '').toUpperCase(),
      percentual_cota: est.percentual_cota || '0%',
      filiacao_materna: (est.filiacao_materna || '').toUpperCase(),
      filiacao_paterna: (est.filiacao_paterna || '').toUpperCase(),
      nome_responsavel: (est.nome_responsavel || '').toUpperCase(),
      cpf_responsavel: (est.cpf_responsavel || '').toUpperCase(),
      parentesco_responsavel: (est.parentesco_responsavel || 'MÃE').toUpperCase(),
      telefone_responsavel: est.telefone_responsavel || '',
      telefone_2: est.telefone_2 || '',
      telefone_3: est.telefone_3 || '',
      telefone_4: est.telefone_4 || '',
      email: (est.email || '').toUpperCase(),
      endereco: (est.endereco || '').toUpperCase(),
      endereco_logradouro: (est.endereco_logradouro || '').toUpperCase(),
      endereco_numero: (est.endereco_numero || '').toUpperCase(),
      endereco_bairro: (est.endereco_bairro || '').toUpperCase(),
      possui_laudo: est.possui_laudo || false,
      laudo_descricao: (est.laudo_descricao || '').toUpperCase(),
      aee: est.aee || false,
      apoio_id: est.apoio_id || '',
      apoio_nome: (est.apoio_nome || '').toUpperCase(),
      foto_url: est.foto_url || '',
      status_matricula: est.status_matricula || 'Ativo',
      tipo_movimentacao: est.tipo_movimentacao || 'Entrada Externa',
      tipo_historico_escolar: est.tipo_historico_escolar || 'Não entregue',
      observacoes: (est.observacoes || '').toUpperCase(),
    });
    setModalNovoAberto(true);
  };

  // Efeito para abrir edição de estudante ou filtros passados via URL Query (ex: /estudantes?editar=est-1)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const editarId = params.get('editar') || params.get('id');
    const aeeParam = params.get('filtroAee');
    const turmaParam = params.get('turma');

    if (aeeParam === 'com_aee' || aeeParam === 'sem_aee' || aeeParam === 'todos') {
      setFiltroAee(aeeParam);
    }
    if (turmaParam) {
      setFiltroTurma(turmaParam);
    }
    if (editarId && estudantes.length > 0) {
      const estParaEditar = estudantes.find(e => e.id === editarId);
      if (estParaEditar) {
        handleAbrirEditar(estParaEditar);
      }
    }
  }, [estudantes]);

  // Exportar estudantes para CSV no padrão oficial do Google Contacts
  const exportarParaGoogleContacts = () => {
    const listaParaExportar = estudantesFiltrados.length > 0 ? estudantesFiltrados : estudantes;
    if (listaParaExportar.length === 0) {
      alert('Nenhum estudante encontrado para exportar.');
      return;
    }

    // Headers oficiais do Google Contacts CSV
    const headers = [
      'Name',
      'Given Name',
      'Additional Name',
      'Family Name',
      'Yomi Name',
      'Given Name Yomi',
      'Additional Name Yomi',
      'Family Name Yomi',
      'Name Prefix',
      'Name Suffix',
      'Initials',
      'Nickname',
      'Short Name',
      'Maiden Name',
      'Birthday',
      'Gender',
      'Location',
      'Billing Information',
      'Directory Server',
      'Mileage',
      'Occupation',
      'Hobby',
      'Sensitivity',
      'Priority',
      'Subject',
      'Notes',
      'Language',
      'Photo',
      'Group Membership',
      'E-mail 1 - Type',
      'E-mail 1 - Value',
      'Phone 1 - Type',
      'Phone 1 - Value',
      'Phone 2 - Type',
      'Phone 2 - Value',
      'Phone 3 - Type',
      'Phone 3 - Value',
      'Phone 4 - Type',
      'Phone 4 - Value',
      'Address 1 - Type',
      'Address 1 - Formatted',
      'Address 1 - Street',
      'Address 1 - City',
      'Address 1 - PO Box',
      'Address 1 - Region',
      'Address 1 - Postal Code',
      'Address 1 - Country',
      'Address 1 - Extended Address',
      'Organization 1 - Type',
      'Organization 1 - Name',
      'Organization 1 - Title',
      'Organization 1 - Department'
    ];

    const escapeCSV = (val: string | number | undefined | null) => {
      if (val === undefined || val === null) return '';
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const rows = listaParaExportar.map(est => {
      const turmaObj = turmas.find(t => t.id === est.turma_id);
      const turmaNome = turmaObj ? turmaObj.nome : (est.turma_nome || '');
      
      const partesNome = est.nome_completo.trim().split(/\s+/);
      const givenName = partesNome[0] || '';
      const familyName = partesNome.slice(1).join(' ') || '';
      
      const notasLinhas = [
        `ESTUDANTE: ${est.nome_completo}`,
        turmaNome ? `TURMA: ${turmaNome}` : '',
        est.id ? `CÓDIGO: ${est.id}` : '',
        est.nome_responsavel ? `RESPONSÁVEL: ${est.nome_responsavel} (${est.parentesco_responsavel || 'MÃE'})` : '',
        est.telefone_responsavel ? `TEL 1: ${est.telefone_responsavel}` : '',
        est.telefone_2 ? `TEL 2: ${est.telefone_2}` : '',
        est.telefone_3 ? `TEL 3: ${est.telefone_3}` : '',
        est.telefone_4 ? `TEL 4: ${est.telefone_4}` : '',
        est.cpf ? `CPF ALUNO: ${est.cpf}` : '',
        est.numero_bolsa_familia ? `BOLSA FAMÍLIA: ${est.numero_bolsa_familia}` : '',
        est.possui_laudo || est.aee ? `INCLUSÃO/LAUDO: ${est.laudo_descricao || 'Sim'}` : '',
        est.endereco ? `ENDEREÇO: ${est.endereco}` : ''
      ].filter(Boolean).join('\n');

      const groupMembership = `* myContacts ::: Alunos${turmaNome ? ` - ${turmaNome}` : ''}`;
      const birthday = est.data_nascimento ? est.data_nascimento.split('T')[0] : '';

      const rowData: Record<string, string> = {
        'Name': `${est.nome_completo}${turmaNome ? ` (${turmaNome})` : ''}`,
        'Given Name': givenName,
        'Additional Name': '',
        'Family Name': familyName,
        'Yomi Name': '',
        'Given Name Yomi': '',
        'Additional Name Yomi': '',
        'Family Name Yomi': '',
        'Name Prefix': '',
        'Name Suffix': '',
        'Initials': '',
        'Nickname': '',
        'Short Name': '',
        'Maiden Name': '',
        'Birthday': birthday,
        'Gender': '',
        'Location': '',
        'Billing Information': '',
        'Directory Server': '',
        'Mileage': '',
        'Occupation': '',
        'Hobby': '',
        'Sensitivity': '',
        'Priority': '',
        'Subject': turmaNome ? `Turma ${turmaNome}` : 'Estudante',
        'Notes': notasLinhas,
        'Language': 'pt-BR',
        'Photo': '',
        'Group Membership': groupMembership,
        'E-mail 1 - Type': 'Home',
        'E-mail 1 - Value': est.email || '',
        'Phone 1 - Type': 'Mobile',
        'Phone 1 - Value': est.telefone_responsavel || '',
        'Phone 2 - Type': 'Mobile',
        'Phone 2 - Value': est.telefone_2 || '',
        'Phone 3 - Type': 'Mobile',
        'Phone 3 - Value': est.telefone_3 || '',
        'Phone 4 - Type': 'Mobile',
        'Phone 4 - Value': est.telefone_4 || '',
        'Address 1 - Type': 'Home',
        'Address 1 - Formatted': est.endereco || '',
        'Address 1 - Street': est.endereco_logradouro ? `${est.endereco_logradouro} ${est.endereco_numero || ''}`.trim() : '',
        'Address 1 - City': est.naturalidade_cidade || '',
        'Address 1 - PO Box': '',
        'Address 1 - Region': '',
        'Address 1 - Postal Code': '',
        'Address 1 - Country': 'Brasil',
        'Address 1 - Extended Address': est.endereco_bairro || '',
        'Organization 1 - Type': 'School',
        'Organization 1 - Name': escolaConfig?.nome_escola || 'PLUGUE School OS',
        'Organization 1 - Title': 'Estudante',
        'Organization 1 - Department': turmaNome || ''
      };

      return headers.map(h => escapeCSV(rowData[h] || '')).join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    const dataHoje = new Date().toISOString().split('T')[0];
    link.setAttribute('download', `contatos_google_estudantes_${dataHoje}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Filtragem dos estudantes com pesquisa de CPF sem máscara
  const estudantesFiltrados = useMemo(() => {
    const buscaClean = busca.toLowerCase().trim();
    const buscaDigitos = busca.replace(/\D/g, '');

    return estudantes.filter((est) => {
      const estCpfDigitos = (est.cpf || '').replace(/\D/g, '');
      const matchCpf = buscaDigitos.length > 0 && estCpfDigitos.includes(buscaDigitos);

      const matchBusca =
        est.nome_completo.toLowerCase().includes(buscaClean) ||
        est.cpf?.toLowerCase().includes(buscaClean) ||
        matchCpf ||
        est.rg_numero?.toLowerCase().includes(buscaClean) ||
        est.numero_bolsa_familia?.includes(buscaClean) ||
        est.certidao_nascimento?.toLowerCase().includes(buscaClean) ||
        est.apoio_nome?.toLowerCase().includes(buscaClean);
      
      const matchTurma = !filtroTurma || est.turma_id === filtroTurma;

      const matchAee =
        filtroAee === 'todos' ||
        (filtroAee === 'com_aee' && (est.aee || est.possui_laudo)) ||
        (filtroAee === 'sem_aee' && !est.aee && !est.possui_laudo);

      return matchBusca && matchTurma && matchAee;
    });
  }, [estudantes, busca, filtroTurma, filtroAee]);

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome_completo.trim() || !form.data_nascimento) {
      alert('Por favor preencha ao menos o Nome Completo e a Data de Nascimento.');
      return;
    }

    if (form.cpf && !validarCPF(form.cpf, { permitirEstudanteSemCpf: true })) {
      alert('CPF do estudante é inválido. Caso o estudante ainda não possua CPF, use 111.111.111-11.');
      return;
    }

    if (form.cpf_responsavel && !validarCPF(form.cpf_responsavel)) {
      alert('CPF do responsável é inválido. Por favor, confira os números digitados.');
      return;
    }

    // Compor endereço unificado em Caixa Alta
    let enderecoComposto = form.endereco.toUpperCase();
    if (form.endereco_logradouro) {
      const num = form.endereco_numero ? `Nº ${form.endereco_numero.trim().toUpperCase()}` : 'S/N';
      const bairro = form.endereco_bairro ? ` - ${form.endereco_bairro.trim().toUpperCase()}` : '';
      enderecoComposto = `${form.endereco_logradouro.trim().toUpperCase()}, ${num}${bairro}`;
    }

    if (form.naturalidade_cidade) {
      salvarNovaCidade(form.naturalidade_cidade.trim().toUpperCase());
    }

    const turmaNome = turmas.find(t => t.id === form.turma_id)?.nome || '';

    // Vincular nome do professor de apoio a partir de apoio_id
    const profApoio = professores.find(p => p.id === form.apoio_id);
    const apoioNomeFinal = profApoio 
      ? (profApoio.nome_completo || (profApoio as { nome?: string }).nome || '').toUpperCase() 
      : (form.apoio_nome || '').toUpperCase();

    // Sanitização completa em CAIXA ALTA
    const dadosAtualizados = {
      ...form,
      nome_completo: form.nome_completo.trim().toUpperCase(),
      nacionalidade: form.nacionalidade.trim().toUpperCase(),
      naturalidade_cidade: form.naturalidade_cidade.trim().toUpperCase(),
      cpf: (form.cpf && form.cpf.trim()) ? form.cpf.trim().toUpperCase() : CPF_ESTUDANTE_SEM_DOCUMENTO,
      rg_numero: form.rg_numero.trim().toUpperCase(),
      certidao_nascimento: form.certidao_nascimento.trim().toUpperCase(),
      numero_sus: form.numero_sus.trim().toUpperCase(),
      numero_bolsa_familia: form.numero_bolsa_familia.trim().toUpperCase(),
      filiacao_materna: form.filiacao_materna.trim().toUpperCase(),
      filiacao_paterna: form.filiacao_paterna.trim().toUpperCase(),
      nome_responsavel: form.nome_responsavel.trim().toUpperCase(),
      cpf_responsavel: form.cpf_responsavel.trim().toUpperCase(),
      parentesco_responsavel: form.parentesco_responsavel.trim().toUpperCase(),
      email: form.email.trim().toUpperCase(),
      endereco_logradouro: form.endereco_logradouro.trim().toUpperCase(),
      endereco_numero: form.endereco_numero.trim().toUpperCase(),
      endereco_bairro: form.endereco_bairro.trim().toUpperCase(),
      laudo_descricao: form.laudo_descricao.trim().toUpperCase(),
      observacoes: form.observacoes.trim().toUpperCase(),
      apoio_id: form.apoio_id || '',
      apoio_nome: apoioNomeFinal,
      turma_nome: turmaNome,
      tipo_historico_escolar: form.tipo_historico_escolar || ('Não entregue' as TipoHistoricoEscolar),
      endereco: (enderecoComposto || form.endereco || 'ENDEREÇO NÃO INFORMADO').toUpperCase(),
    };

    if (editandoEstudanteId) {
      updateEstudante(editandoEstudanteId, dadosAtualizados);
    } else {
      addEstudante(dadosAtualizados);
    }

    setModalNovoAberto(false);
    setEditandoEstudanteId(null);
    setForm(formInicial);
  };

  // Upload para rota /api/upload-documento
  const handleUploadDrive = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadArquivo || !estudanteSelecionado) return;

    setUploadEnviando(true);
    setUploadMensagem(null);

    try {
      const formData = new FormData();
      formData.append('file', uploadArquivo);
      formData.append('estudante_id', estudanteSelecionado.id);
      formData.append('estudante_nome', estudanteSelecionado.nome_completo);
      formData.append('tipo_documento', uploadTipoDoc);

      const res = await fetch('/api/upload-documento', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao enviar documento');
      }

      addDocumentoToEstudante(estudanteSelecionado.id, {
        tipo_documento: uploadTipoDoc,
        nome_arquivo: uploadArquivo.name,
        drive_file_id: data.drive_file_id || data.file_id || 'drive_mock_local',
        drive_view_link: data.drive_view_link || data.view_link || 'https://drive.google.com',
        tamanho_bytes: uploadArquivo.size,
        mime_type: uploadArquivo.type,
      });

      setUploadMensagem('Documento anexado e integrado ao Google Drive com sucesso!');
      setUploadArquivo(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      
      // Atualiza referência local do estudante selecionado
      const atualizado = estudantes.find(e => e.id === estudanteSelecionado.id);
      if (atualizado) setEstudanteSelecionado(atualizado);

      setTimeout(() => {
        setModalUploadAberto(false);
        setUploadMensagem(null);
      }, 1200);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Falha no upload';
      setUploadMensagem(`Erro: ${errorMsg}`);
    } finally {
      setUploadEnviando(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho Oficial de Impressão (Visível apenas em @media print) */}
      <PrintHeader
        documentTitle="FICHA CADASTRAL DO ESTUDANTE"
        documentSubtitle="Registros Oficiais da Secretaria Escolar • PLUGUE"
      />

      {/* Datalist com cidades já digitadas memorizadas */}
      <datalist id="lista-cidades-nascimento">
        {cidadesDigitadas.map((cidade) => (
          <option key={cidade} value={cidade} />
        ))}
      </datalist>

      {/* Top Bar (Oculta na impressão) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <Users className="h-7 w-7 text-school-blue-600 dark:text-school-gold-400" />
            Gestão de Estudantes
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Cadastros civis completos, RG, SUS, Bolsa Família, cotas, múltiplos contatos e AEE
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={exportarParaGoogleContacts}
            title="Exportar para o Google"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-600/30 bg-emerald-50 px-4 py-2.5 text-xs font-bold text-emerald-700 shadow-sm hover:bg-emerald-100 hover:border-emerald-600/50 transition-all dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
          >
            <Download className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span>Exportar para o Google</span>
          </button>

          <button
            onClick={handleAbrirNovo}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-school-blue-800 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-school-blue-800/25 hover:bg-school-blue-700 transition-all dark:bg-school-blue-600"
          >
            <Plus className="h-4 w-4" />
            <span>Cadastrar Novo Estudante</span>
          </button>
        </div>
      </div>

      {/* Barra de Filtros e Busca (Oculta na impressão) */}
      <div className="flex flex-col md:flex-row items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-school-dark-border dark:bg-school-dark-surface print:hidden">
        {/* Campo de Busca */}
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome, CPF, RG, Bolsa Família ou certidão..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-school-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-900/50 dark:text-white dark:focus:border-school-gold-400"
          />
        </div>

        {/* Filtro por Turma */}
        <div className="w-full md:w-56">
          <select
            value={filtroTurma}
            onChange={(e) => setFiltroTurma(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 focus:border-school-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-300"
          >
            <option value="">Todas as Turmas</option>
            {turmas.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nome} ({t.turno})
              </option>
            ))}
          </select>
        </div>

        {/* Filtro AEE */}
        <div className="w-full md:w-48">
          <select
            value={filtroAee}
            onChange={(e) => setFiltroAee(e.target.value as any)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 focus:border-school-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-300"
          >
            <option value="todos">Todos os Registros</option>
            <option value="com_aee">Apenas com AEE / Laudo</option>
            <option value="sem_aee">Sem Laudo Médico</option>
          </select>
        </div>
      </div>

      {/* Tabela de Estudantes */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden dark:border-school-dark-border dark:bg-school-dark-surface">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 dark:bg-slate-800 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3.5">Estudante</th>
                <th className="px-4 py-3.5">Turma</th>
                <th className="px-4 py-3.5">Responsável / Contatos</th>
                <th className="px-4 py-3.5">Inclusão / AEE</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5 text-right print:hidden">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {estudantesFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                    Nenhum estudante encontrado para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                estudantesFiltrados.map((est) => {
                  const qtdTels = [est.telefone_responsavel, est.telefone_2, est.telefone_3, est.telefone_4].filter(Boolean).length;
                  return (
                    <tr key={est.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      {/* Estudante Foto e Nome */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          {/* Miniatura com clique para Quick View e Badge de Sincronização */}
                          <div className="relative group shrink-0">
                            {est.foto_url ? (
                              <button
                                type="button"
                                onClick={() => setFotoPreviewEstudante(est)}
                                title="Visualizar foto 3x4 e dados no Google Drive"
                                className="relative block h-11 w-11 rounded-xl overflow-hidden border-2 border-school-blue-300 dark:border-school-blue-700 shadow-sm transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-school-blue-500"
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={est.foto_url}
                                  alt={est.nome_completo}
                                  className="h-full w-full object-cover"
                                />
                                <div className="absolute inset-0 bg-school-blue-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                                  <Camera className="h-4 w-4" />
                                </div>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleAbrirEditar(est)}
                                title="Adicionar foto 3x4 no Google Drive"
                                className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-400 font-bold dark:bg-slate-800 border border-dashed border-slate-300 dark:border-slate-700 hover:border-school-blue-500 hover:text-school-blue-600 transition-colors"
                              >
                                {(est.nome_completo || 'AL').substring(0, 2).toUpperCase()}
                              </button>
                            )}

                            {/* Indicador de Foto 3x4 no Google Drive */}
                            {est.foto_url && (
                              <span
                                className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 text-white text-[8px] font-black shadow-sm ring-1 ring-white dark:ring-slate-900"
                                title="Foto 3x4 oficial sincronizada no Google Drive"
                              >
                                ✓
                              </span>
                            )}
                          </div>

                          <div>
                            <button
                              type="button"
                              onClick={() => {
                                setEstudanteSelecionado(est);
                                setAbaFicha('cadastro');
                                setModalFichaAberto(true);
                              }}
                              className="text-left font-bold text-slate-900 hover:text-school-blue-600 dark:text-white dark:hover:text-school-gold-400 line-clamp-1 transition-colors"
                            >
                              {est.nome_completo}
                            </button>
                            <div className="text-[11px] text-slate-400">
                              Nasc: {new Date(est.data_nascimento).toLocaleDateString('pt-BR')} • CPF: {est.cpf || 'Não informado'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Turma */}
                      <td className="px-4 py-3.5 font-medium text-slate-800 dark:text-slate-200">
                        {est.turma_nome || 'Não atribuída'}
                      </td>

                      {/* Responsável e Contato */}
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-slate-800 dark:text-slate-200 line-clamp-1">
                          {est.nome_responsavel || est.filiacao_materna || 'Não preenchido'}
                        </div>
                        <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                          <span>{est.telefone_responsavel || <span className="text-amber-600 dark:text-amber-400 font-bold">! Sem telefone</span>}</span>
                          {qtdTels > 1 && (
                            <span className="rounded bg-slate-100 px-1 py-0.2 text-[9px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300" title={`${qtdTels} telefones cadastrados`}>
                              +{qtdTels - 1} tel
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Indicadores AEE & Apoio */}
                      <td className="px-4 py-3.5">
                        {est.aee || est.possui_laudo ? (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-black text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                              <ShieldAlert className="h-3 w-3" />
                              AEE / LAUDO
                            </span>
                            {est.apoio_nome ? (
                              <div className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 truncate max-w-[130px]" title={`Apoio: ${est.apoio_nome}`}>
                                Apoio: {est.apoio_nome}
                              </div>
                            ) : (
                              <div className="text-[10px] text-red-600 dark:text-red-400 font-bold">
                                Sem apoio
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400">Regular</span>
                        )}
                      </td>


                      {/* Status */}
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            est.status_matricula === 'Ativo'
                              ? 'bg-blue-100 text-school-blue-800 dark:bg-blue-950 dark:text-blue-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          }`}
                        >
                          {est.status_matricula}
                        </span>
                      </td>

                      {/* Ações */}
                      <td className="px-4 py-3.5 text-right print:hidden">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleAbrirEditar(est)}
                            title="Editar Cadastro Completo do Estudante"
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-emerald-50 hover:text-emerald-700 dark:text-slate-400 dark:hover:bg-emerald-950/50 dark:hover:text-emerald-300 transition-colors"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>

                          <button
                            onClick={() => {
                              setEstudanteSelecionado(est);
                              setAbaFicha('relatorios');
                              setModalFichaAberto(true);
                            }}
                            title="Relatórios Pedagógicos Colaborativos com IA"
                            className="rounded-lg p-1.5 text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/50 transition-colors"
                          >
                            <Sparkles className="h-4 w-4" />
                          </button>

                          <button
                            onClick={() => {
                              setEstudanteSelecionado(est);
                              setAbaFicha('observacoes');
                              setModalFichaAberto(true);
                            }}
                            title="Observações Contínuas (Timeline)"
                            className="rounded-lg p-1.5 text-school-blue-600 hover:bg-school-blue-50 dark:text-school-gold-400 dark:hover:bg-slate-800 transition-colors"
                          >
                            <MessageSquare className="h-4 w-4" />
                          </button>

                          <button
                            onClick={() => {
                              setEstudanteSelecionado(est);
                              setAbaFicha('drive');
                              setModalFichaAberto(true);
                            }}
                            title="Repositório Google Drive"
                            className="rounded-lg p-1.5 text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/50 transition-colors"
                          >
                            <Folder className="h-4 w-4" />
                          </button>

                          <button
                            onClick={() => {
                              setEstudanteSelecionado(est);
                              setAbaFicha('cadastro');
                              setModalFichaAberto(true);
                            }}
                            title="Visualizar e Imprimir Ficha do Estudante"
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-school-blue-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-school-gold-400"
                          >
                            <Printer className="h-4 w-4" />
                          </button>

                          <button
                            onClick={() => {
                              if (confirm(`Excluir o registro de ${est.nome_completo}?`)) {
                                deleteEstudante(est.id);
                              }
                            }}
                            title="Excluir Estudante"
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/50"
                          >
                            <Trash2 className="h-4 w-4" />
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

      {/* MODAL 1: Cadastro & Edição de Estudante */}
      {modalNovoAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm overflow-y-auto print:hidden">
          <div className="relative w-full max-w-4xl rounded-2xl bg-white p-6 sm:p-8 shadow-2xl dark:bg-school-dark-surface max-h-[92vh] overflow-y-auto border border-slate-200 dark:border-slate-800">
            {/* Cabeçalho do Modal */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-school-blue-100 text-school-blue-700 dark:bg-school-blue-950 dark:text-school-blue-300">
                  <Users className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    {editandoEstudanteId ? 'Editar Cadastro do Estudante' : 'Matrícula & Ficha Cadastral do Estudante'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Preenchimento oficial com documentos civis, política de cotas, 4 telefones e AEE
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalNovoAberto(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Aviso de Preenchimento Obrigatório em Caixa Alta */}
            <div className="mt-3 flex items-center gap-2 rounded-xl bg-amber-50 px-3.5 py-2 border border-amber-200 dark:bg-amber-950/40 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 text-xs font-semibold">
              <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
              <span>
                <strong>Atenção:</strong> Todo o formulário deve ser preenchido obrigatoriamente em <strong>LETRAS MAIÚSCULAS (CAIXA ALTA)</strong>.
              </span>
            </div>

            <form onSubmit={handleSubmitForm} className="mt-5 space-y-6 text-xs">
              
              {/* FOTO DO ESTUDANTE (PRIMEIRA INFORMAÇÃO COM RECORTE 3x4 E GOOGLE DRIVE) */}
              <FotoEstudanteField
                fotoUrl={form.foto_url}
                nomeEstudante={form.nome_completo}
                cpfEstudante={form.cpf}
                estudanteId={editandoEstudanteId || undefined}
                onChangeFotoUrl={(novaUrl) => setForm((prev) => ({ ...prev, foto_url: novaUrl }))}
                onFotoSalvaNoDrive={(dados) => {
                  if (editandoEstudanteId) {
                    updateEstudante(editandoEstudanteId, { foto_url: dados.foto_url });
                  }
                }}
              />

              {/* SEÇÃO 1: DADOS PESSOAIS & DOCUMENTAÇÃO CIVIL */}
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-900/50 space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-200/60 pb-2 dark:border-slate-800">
                  <CreditCard className="h-4 w-4 text-school-blue-600 dark:text-school-gold-400" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    1. Identificação Civil & Documentação Pessoal
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase">
                      Nome Completo do Estudante *
                    </label>
                    <input
                      type="text"
                      required
                      value={form.nome_completo}
                      onChange={(e) => handleUpperChange('nome_completo', e.target.value)}
                      placeholder="EX: LUCAS HENRIQUE DE OLIVEIRA SANTOS"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs uppercase text-slate-900 focus:border-school-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase">
                      Turma / Turno *
                    </label>
                    <select
                      value={form.turma_id}
                      onChange={(e) => setForm({ ...form, turma_id: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs uppercase font-semibold text-slate-900 focus:border-school-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    >
                      {turmas.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.nome.toUpperCase()} ({t.turno.toUpperCase()})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase">
                      Data de Nascimento *
                    </label>
                    <input
                      type="date"
                      required
                      value={form.data_nascimento}
                      onChange={(e) => setForm({ ...form, data_nascimento: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-school-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase">
                      Nacionalidade (Padrão Brasileira)
                    </label>
                    <input
                      type="text"
                      value={form.nacionalidade}
                      onChange={(e) => handleUpperChange('nacionalidade', e.target.value)}
                      placeholder="BRASILEIRA"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs uppercase text-slate-900 focus:border-school-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase">
                      Local de Nascimento / Naturalidade (Grava Cidades)
                    </label>
                    <input
                      type="text"
                      list="lista-cidades-nascimento"
                      value={form.naturalidade_cidade}
                      onChange={(e) => handleUpperChange('naturalidade_cidade', e.target.value)}
                      placeholder="EX: RECIFE - PE"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs uppercase text-slate-900 focus:border-school-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 uppercase">
                        CPF do Aluno
                      </label>
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, cpf: CPF_ESTUDANTE_SEM_DOCUMENTO })}
                        className="text-[10px] text-school-blue-600 dark:text-school-blue-400 font-bold hover:underline"
                        title="Preencher com código reservado para alunos sem CPF"
                      >
                        Sem CPF (111.111.111-11)
                      </button>
                    </div>
                    <input
                      type="text"
                      value={form.cpf}
                      onChange={(e) => setForm({ ...form, cpf: formatarCPF(e.target.value) })}
                      placeholder="000.000.000-00 ou 111.111.111-11"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs uppercase text-slate-900 focus:border-school-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white font-mono"
                    />
                    <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
                      Caso o estudante não possua CPF, o sistema atribuirá <strong>111.111.111-11</strong>.
                    </p>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase">
                      RG (Documento de Identidade)
                    </label>
                    <input
                      type="text"
                      value={form.rg_numero}
                      onChange={(e) => handleUpperChange('rg_numero', e.target.value)}
                      placeholder="EX: 12.345.678-X"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs uppercase text-slate-900 focus:border-school-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase">
                      Data de Expedição do RG
                    </label>
                    <input
                      type="date"
                      value={form.rg_data_expedicao}
                      onChange={(e) => setForm({ ...form, rg_data_expedicao: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-school-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase">
                      Número do Cartão SUS (CNS)
                    </label>
                    <input
                      type="text"
                      value={form.numero_sus}
                      onChange={(e) => handleUpperChange('numero_sus', e.target.value)}
                      placeholder="789012345678901"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs uppercase text-slate-900 focus:border-school-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase">
                      Certidão de Nascimento (Livro, Folha, Termo)
                    </label>
                    <input
                      type="text"
                      value={form.certidao_nascimento}
                      onChange={(e) => handleUpperChange('certidao_nascimento', e.target.value)}
                      placeholder="EX: LIVRO A-124, FOLHA 89, TERMO 54321"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs uppercase text-slate-900 focus:border-school-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* SEÇÃO 2: POLÍTICA DE COTAS & BENEFÍCIOS SOCIAIS */}
              <div className="rounded-2xl border border-indigo-200/80 bg-indigo-50/40 p-4 sm:p-5 dark:border-indigo-900/50 dark:bg-indigo-950/20 space-y-4">
                <div className="flex items-center gap-2 border-b border-indigo-200/50 pb-2 dark:border-indigo-900/40">
                  <Award className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-950 dark:text-indigo-200">
                    2. Política de Cotas & Benefício Social
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
                  <div>
                    <label className="block font-semibold text-slate-800 dark:text-slate-200 mb-1.5 uppercase">
                      Classificação de Cotista:
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['0%', '50%', '100%'] as PercentualCota[]).map((cota) => (
                        <button
                          key={cota}
                          type="button"
                          onClick={() => setForm({ ...form, percentual_cota: cota })}
                          className={`rounded-xl border py-2 text-center font-bold text-xs uppercase transition-all ${
                            form.percentual_cota === cota
                              ? 'border-indigo-600 bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-500/20'
                              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
                          }`}
                        >
                          {cota === '0%' ? ' ( 0% )' : cota === '50%' ? '50% (PARCIAL)' : '100% (INTEGRAL)'}
                        </button>
                      ))}
                    </div>
                    {/* Informação sobre ETE e IFPE */}
                    <div className="mt-2.5 rounded-xl bg-indigo-100/70 p-2.5 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-indigo-700 dark:text-indigo-400 shrink-0 mt-0.5" />
                      <p className="text-[11px] font-semibold text-indigo-950 dark:text-indigo-200 leading-tight">
                        Esta escolha será utilizada para a inscrição nas <strong>Escolas Técnicas Estaduais (ETE)</strong> e no <strong>Instituto Federal de Pernambuco (IFPE)</strong>.
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-800 dark:text-slate-200 mb-1.5 uppercase">
                      Número do Bolsa Família (NIS)
                    </label>
                    <input
                      type="text"
                      value={form.numero_bolsa_familia}
                      onChange={(e) => handleUpperChange('numero_bolsa_familia', e.target.value)}
                      placeholder="EX: 123.45678.90-1"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs uppercase text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                    <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                      Preencher caso a família participe do programa Bolsa Família.
                    </p>
                  </div>
                </div>
              </div>

              {/* SEÇÃO 3: FILIAÇÃO & RESPONSÁVEL LEGAL */}
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-900/50 space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-200/60 pb-2 dark:border-slate-800">
                  <UserCheck className="h-4 w-4 text-school-blue-600 dark:text-school-gold-400" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    3. Filiação & Responsável Legal
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase">
                      Filiação Materna (Nome da Mãe)
                    </label>
                    <input
                      type="text"
                      value={form.filiacao_materna}
                      onChange={(e) => handleUpperChange('filiacao_materna', e.target.value)}
                      placeholder="NOME COMPLETO DA MÃE"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs uppercase text-slate-900 focus:border-school-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase">
                      Filiação Paterna (Nome do Pai)
                    </label>
                    <input
                      type="text"
                      value={form.filiacao_paterna}
                      onChange={(e) => handleUpperChange('filiacao_paterna', e.target.value)}
                      placeholder="NOME COMPLETO DO PAI (SE HOUVER)"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs uppercase text-slate-900 focus:border-school-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase">
                      Nome do Responsável Legal / Pedagógico
                    </label>
                    <input
                      type="text"
                      value={form.nome_responsavel}
                      onChange={(e) => handleUpperChange('nome_responsavel', e.target.value)}
                      placeholder="NOME DE QUEM RESPONDE NA SECRETARIA"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs uppercase text-slate-900 focus:border-school-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase">
                        Parentesco
                      </label>
                      <select
                        value={form.parentesco_responsavel}
                        onChange={(e) => setForm({ ...form, parentesco_responsavel: e.target.value.toUpperCase() })}
                        className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs uppercase font-semibold text-slate-900 focus:border-school-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                      >
                        <option value="MÃE">MÃE</option>
                        <option value="PAI">PAI</option>
                        <option value="AVÓ/AVÔ">AVÓ/AVÔ</option>
                        <option value="TIO/TIA">TIO/TIA</option>
                        <option value="IRMÃO/IRMÃ">IRMÃO/IRMÃ</option>
                        <option value="TUTOR LEGAL">TUTOR LEGAL</option>
                        <option value="PRÓPRIO ESTUDANTE">PRÓPRIO ESTUDANTE</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase">
                        CPF do Responsável
                      </label>
                      <input
                        type="text"
                        value={form.cpf_responsavel}
                        onChange={(e) => setForm({ ...form, cpf_responsavel: formatarCPF(e.target.value) })}
                        placeholder="000.000.000-00"
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs uppercase text-slate-900 focus:border-school-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* SEÇÃO 4: TELEFONES (4 TELEFONES) & CONTATOS */}
              <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/30 p-4 sm:p-5 dark:border-emerald-900/50 dark:bg-emerald-950/20 space-y-4">
                <div className="flex items-center justify-between border-b border-emerald-200/50 pb-2 dark:border-emerald-900/40">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-950 dark:text-emerald-200">
                      4. Telefones de Contato (Principal + 3 Adicionais) & E-mail
                    </h4>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 rounded-full uppercase">
                    Até 4 números
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-800 dark:text-slate-200 mb-1 uppercase">
                      Telefone 1 (Principal/WhatsApp) *
                    </label>
                    <input
                      type="text"
                      value={form.telefone_responsavel}
                      onChange={(e) => setForm({ ...form, telefone_responsavel: formatarTelefone(e.target.value) })}
                      placeholder="(81) 98765-4321"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs uppercase text-slate-900 focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white font-mono"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">Contato prioritário</span>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-800 dark:text-slate-200 mb-1 uppercase">
                      Telefone 2 (Responsável)
                    </label>
                    <input
                      type="text"
                      value={form.telefone_2}
                      onChange={(e) => setForm({ ...form, telefone_2: formatarTelefone(e.target.value) })}
                      placeholder="(81) 98111-2222"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs uppercase text-slate-900 focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white font-mono"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">Contato responsável</span>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-800 dark:text-slate-200 mb-1 uppercase">
                      Telefone 3 (Responsável)
                    </label>
                    <input
                      type="text"
                      value={form.telefone_3}
                      onChange={(e) => setForm({ ...form, telefone_3: formatarTelefone(e.target.value) })}
                      placeholder="(81) 97333-4444"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs uppercase text-slate-900 focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white font-mono"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">Contato de emergência</span>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-800 dark:text-slate-200 mb-1 uppercase">
                      Telefone 4 (Recado)
                    </label>
                    <input
                      type="text"
                      value={form.telefone_4}
                      onChange={(e) => setForm({ ...form, telefone_4: formatarTelefone(e.target.value) })}
                      placeholder="(81) 98888-5566"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs uppercase text-slate-900 focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white font-mono"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">Telefone para recados</span>
                  </div>

                  <div className="sm:col-span-2 lg:col-span-4">
                    <label className="block font-semibold text-slate-800 dark:text-slate-200 mb-1 uppercase">
                      E-mail de Contato (Estudante ou Família)
                    </label>
                    <input
                      type="text"
                      value={form.email}
                      onChange={(e) => handleUpperChange('email', e.target.value)}
                      placeholder="EXEMPLO@EMAIL.COM"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs uppercase text-slate-900 focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* SEÇÃO 5: ENDEREÇO RESIDENCIAL */}
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-900/50 space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-200/60 pb-2 dark:border-slate-800">
                  <MapPin className="h-4 w-4 text-school-blue-600 dark:text-school-gold-400" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    5. Endereço Residencial
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase">
                      Endereço (Rua, Avenida, Alameda)
                    </label>
                    <input
                      type="text"
                      value={form.endereco_logradouro}
                      onChange={(e) => handleUpperChange('endereco_logradouro', e.target.value)}
                      placeholder="EX: RUA DAS CAMÉLIAS"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs uppercase text-slate-900 focus:border-school-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase">
                      Número da Casa / Compl.
                    </label>
                    <input
                      type="text"
                      value={form.endereco_numero}
                      onChange={(e) => handleUpperChange('endereco_numero', e.target.value)}
                      placeholder="EX: 240, APTO 42"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs uppercase text-slate-900 focus:border-school-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase">
                      Bairro
                    </label>
                    <input
                      type="text"
                      value={form.endereco_bairro}
                      onChange={(e) => handleUpperChange('endereco_bairro', e.target.value)}
                      placeholder="EX: BOA VISTA"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs uppercase text-slate-900 focus:border-school-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* SEÇÃO 6: INCLUSÃO ESCOLAR & ATENDIMENTO ESPECIALIZADO (AEE) */}
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 sm:p-5 dark:border-emerald-900 dark:bg-emerald-950/30 space-y-4">
                <div className="flex items-center gap-2 border-b border-emerald-200/50 pb-2 dark:border-emerald-900/40">
                  <HeartHandshake className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-950 dark:text-emerald-200">
                    6. Inclusão Escolar & Atendimento Especializado (AEE)
                  </h4>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-4 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.aee}
                      onChange={(e) => setForm({ ...form, aee: e.target.checked, possui_laudo: e.target.checked ? true : form.possui_laudo })}
                      className="h-4 w-4 rounded border-emerald-400 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="font-bold text-emerald-900 dark:text-emerald-200 uppercase">
                      Estudante Elegível para AEE (Atendimento Educacional Especializado)
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.possui_laudo}
                      onChange={(e) => setForm({ ...form, possui_laudo: e.target.checked })}
                      className="h-4 w-4 rounded border-emerald-400 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="font-semibold text-emerald-900 dark:text-emerald-200 uppercase">
                      Possui Laudo Médico Homologado
                    </span>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                  {/* Campo: Nome do Apoio */}
                  <div>
                    <label className="block font-semibold text-emerald-950 dark:text-emerald-200 mb-1 uppercase">
                      Nome do Apoio (Profissional de Apoio / AEE):
                    </label>
                    <select
                      value={form.apoio_id}
                      onChange={(e) => {
                        const profId = e.target.value;
                        const prof = professores.find((p) => p.id === profId);
                        const profNome = prof ? (prof.nome_completo || (prof as { nome?: string }).nome || '') : '';
                        setForm({
                          ...form,
                          apoio_id: profId,
                          apoio_nome: profNome.toUpperCase(),
                        });
                      }}
                      className="w-full rounded-xl border border-emerald-300 bg-white px-3 py-2 text-xs uppercase font-semibold text-slate-900 focus:border-emerald-500 focus:outline-none dark:border-emerald-700 dark:bg-slate-900 dark:text-white"
                    >
                      <option value="">NÃO DESIGNADO / SEM APOIO</option>
                      {professoresApoio.map((p) => {
                        const nomeDocente = p.nome_completo || (p as { nome?: string }).nome || 'PROFESSOR';
                        const areaDocente = p.formacao || (p.disciplinas && p.disciplinas[0]) || 'APOIO ESCOLAR';
                        return (
                          <option key={p.id} value={p.id}>
                            {nomeDocente.toUpperCase()} ({areaDocente.toUpperCase()})
                          </option>
                        );
                      })}
                    </select>
                    {professoresApoio.length === 0 ? (
                      <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-400">
                        Nenhum professor com o toggle &quot;APOIO&quot; ativado. Cadastre ou ative no módulo Professores.
                      </p>
                    ) : (
                      <p className="mt-1 text-[11px] text-emerald-700 dark:text-emerald-400">
                        Lista de profissionais habilitados como Apoio no cadastro de professores.
                      </p>
                    )}
                  </div>

                  {/* Descrição / CID do Laudo Médico */}
                  <div>
                    <label className="block font-medium text-emerald-950 dark:text-emerald-200 mb-1 uppercase">
                      Descrição / CID do Laudo Médico:
                    </label>
                    <input
                      type="text"
                      value={form.laudo_descricao}
                      onChange={(e) => handleUpperChange('laudo_descricao', e.target.value)}
                      placeholder="EX: TDAH TIPO COMBINADO, TEA NÍVEL 1..."
                      className="w-full rounded-xl border border-emerald-300 bg-white px-3 py-2 text-xs uppercase text-slate-900 focus:border-emerald-500 focus:outline-none dark:border-emerald-700 dark:bg-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* SEÇÃO 7: MATRÍCULA, HISTÓRICO ESCOLAR & OBSERVAÇÕES GERAIS */}
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-900/50 space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-200/60 pb-2 dark:border-slate-800">
                  <Bookmark className="h-4 w-4 text-school-blue-600 dark:text-school-gold-400" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    7. Matrícula, Histórico Escolar & Observações Gerais
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase">
                      Tipo de Histórico escolar
                    </label>
                    <select
                      value={form.tipo_historico_escolar}
                      onChange={(e) => setForm({ ...form, tipo_historico_escolar: e.target.value as TipoHistoricoEscolar })}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs uppercase font-semibold text-slate-900 focus:border-school-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    >
                      <option value="Definitivo">DEFINITIVO</option>
                      <option value="Temporário">TEMPORÁRIO</option>
                      <option value="Não entregue">NÃO ENTREGUE</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase">
                      Status da Matrícula
                    </label>
                    <select
                      value={form.status_matricula}
                      onChange={(e) => setForm({ ...form, status_matricula: e.target.value as StatusMatricula })}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs uppercase font-semibold text-slate-900 focus:border-school-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    >
                      <option value="Ativo">ATIVO</option>
                      <option value="Transferido">TRANSFERIDO</option>
                      <option value="Trancado">TRANCADO</option>
                      <option value="Evadido">EVADIDO</option>
                    </select>
                  </div>

                  {/* CAMPO DE OBSERVAÇÕES */}
                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase">
                      Observações Pedagógicas, Médicas ou Administrativas
                    </label>
                    <textarea
                      rows={4}
                      value={form.observacoes}
                      onChange={(e) => handleUpperChange('observacoes', e.target.value)}
                      placeholder="DESCREVA AQUI OBSERVAÇÕES RELEVANTES SOBRE O ESTUDANTE: RESTRIÇÕES ALIMENTARES, ROTINA, HISTÓRICO DE ESCOLAS ANTERIORES, RECOMENDAÇÕES PEDAGÓGICAS, TERMOS DE RESPONSABILIDADE..."
                      className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs uppercase text-slate-900 focus:border-school-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white resize-y"
                    />
                  </div>
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalNovoAberto(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 uppercase"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-school-blue-800 px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-school-blue-800/25 hover:bg-school-blue-700 dark:bg-school-blue-600 active:scale-95 transition-all uppercase"
                >
                  {editandoEstudanteId ? 'Salvar Alterações Cadastrais' : 'Concluir Matrícula'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Anexo de Documentos no Google Drive */}
      {modalUploadAberto && estudanteSelecionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm print:hidden">
          <div className="relative w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-school-dark-surface max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <UploadCloud className="h-5 w-5 text-school-blue-600 dark:text-school-gold-400" />
                  Documentos no Google Drive
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Estudante: <strong className="text-slate-800 dark:text-white">{estudanteSelecionado.nome_completo}</strong>
                </p>
              </div>
              <button
                onClick={() => setModalUploadAberto(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Formulário de Envio para Google Drive API */}
            <form onSubmit={handleUploadDrive} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tipo de Documento:
                </label>
                <select
                  value={uploadTipoDoc}
                  onChange={(e) => setUploadTipoDoc(e.target.value as any)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 focus:border-school-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                >
                  <option value="rg">RG / Documento de Identidade Civil</option>
                  <option value="comprovante_residencia">Comprovante de Residência</option>
                  <option value="laudo_medico">Laudo Médico / Parecer Neurológico / AEE</option>
                  <option value="certidao_nascimento">Certidão de Nascimento</option>
                  <option value="outro">Outro Documento Institucional</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Selecionar Arquivo (PDF ou Imagem):
                </label>
                <input
                  type="file"
                  ref={fileInputRef}
                  required
                  accept=".pdf,image/png,image/jpeg,image/webp"
                  onChange={(e) => setUploadArquivo(e.target.files?.[0] || null)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs text-slate-700 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                />
              </div>

              {uploadMensagem && (
                <div className={`rounded-xl p-3 text-xs flex items-center gap-2 ${
                  uploadMensagem.includes('Erro')
                    ? 'bg-rose-50 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                    : 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                }`}>
                  {uploadMensagem.includes('Erro') ? (
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  ) : (
                    <FileCheck className="h-4 w-4 flex-shrink-0" />
                  )}
                  <span>{uploadMensagem}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={uploadEnviando || !uploadArquivo}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-school-blue-800 py-2.5 text-xs font-bold text-white shadow-md hover:bg-school-blue-700 disabled:opacity-50 dark:bg-school-blue-600"
              >
                {uploadEnviando ? (
                  <>
                    <Upload className="h-4 w-4 animate-bounce" />
                    <span>Processando via Google Drive API...</span>
                  </>
                ) : (
                  <>
                    <UploadCloud className="h-4 w-4" />
                    <span>Fazer Upload e Vincular à Ficha</span>
                  </>
                )}
              </button>
            </form>

            {/* Lista de Documentos já Anexados */}
            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
                Documentos já Anexados no Google Drive ({estudanteSelecionado.documentos?.length || 0})
              </h4>

              {(!estudanteSelecionado.documentos || estudanteSelecionado.documentos.length === 0) ? (
                <p className="text-xs text-slate-400 italic">
                  Nenhum arquivo anexado ainda para este aluno.
                </p>
              ) : (
                <div className="space-y-2">
                  {estudanteSelecionado.documentos.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between rounded-xl bg-slate-50 p-2.5 text-xs border border-slate-100 dark:bg-slate-900/60 dark:border-slate-800"
                    >
                      <div className="flex items-center gap-2.5">
                        <FileText className="h-4 w-4 text-school-blue-600 dark:text-school-gold-400" />
                        <div>
                          <div className="font-semibold text-slate-900 dark:text-white">
                            {doc.nome_arquivo}
                          </div>
                          <div className="text-[10px] text-slate-400 uppercase font-mono">
                            Tipo: {doc.tipo_documento} • Drive ID: {doc.drive_file_id}
                          </div>
                        </div>
                      </div>

                      {doc.drive_view_link && (
                        <a
                          href={doc.drive_view_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-semibold text-school-blue-600 hover:underline dark:text-school-gold-400"
                        >
                          <span>Abrir no Drive</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Visualização Completa da Ficha e Impressão Timbrada */}
      {modalFichaAberto && estudanteSelecionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-4xl rounded-2xl bg-white p-6 sm:p-8 shadow-2xl dark:bg-school-dark-surface max-h-[92vh] overflow-y-auto card-print border border-slate-200 dark:border-slate-800">
            {/* Cabeçalho da Ficha Timbrada */}
            <PrintHeader
              documentTitle="FICHA INDIVIDUAL DO ESTUDANTE"
              documentSubtitle={`Registro Geral: ${estudanteSelecionado.id} • PLUGUE`}
            />

            {/* Barra Superior de Navegação da Ficha Escolar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3 dark:border-slate-800 print:hidden">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                <button
                  type="button"
                  onClick={() => setAbaFicha('cadastro')}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all shrink-0 ${
                    abaFicha === 'cadastro'
                      ? 'bg-school-blue-700 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  <FileText className="h-3.5 w-3.5" />
                  <span>Ficha Cadastral</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAbaFicha('relatorios')}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all shrink-0 ${
                    abaFicha === 'relatorios'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Relatórios Pedagógicos & IA</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAbaFicha('observacoes')}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all shrink-0 ${
                    abaFicha === 'observacoes'
                      ? 'bg-school-blue-700 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  <span>Observações (Timeline)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAbaFicha('drive')}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all shrink-0 ${
                    abaFicha === 'drive'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  <Folder className="h-3.5 w-3.5" />
                  <span>Google Drive</span>
                </button>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                {abaFicha === 'cadastro' && (
                  <>
                    <button
                      onClick={() => {
                        handleAbrirEditar(estudanteSelecionado);
                        setModalFichaAberto(false);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      <span>Editar</span>
                    </button>
                    <button
                      onClick={() => window.print()}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-school-blue-800 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-school-blue-700"
                    >
                      <Printer className="h-3.5 w-3.5" />
                      <span>Imprimir</span>
                    </button>
                  </>
                )}
                <button
                  onClick={() => setModalFichaAberto(false)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Conteúdo da Aba 1: Ficha Cadastral do Aluno */}
            {abaFicha === 'cadastro' && (
              <div className="mt-6 space-y-6 text-xs text-slate-700 dark:text-slate-300">
              {/* Seção 1: Identificação & Foto */}
              <div className="flex flex-col sm:flex-row items-start gap-5">
                {estudanteSelecionado.foto_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={estudanteSelecionado.foto_url}
                    alt={estudanteSelecionado.nome_completo}
                    className="h-32 w-28 rounded-2xl object-cover border-2 border-slate-300 dark:border-slate-700 shadow-sm"
                  />
                ) : (
                  <div className="flex h-32 w-28 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 font-bold text-xl border-2 border-dashed border-slate-300 dark:bg-slate-800 dark:border-slate-700">
                    SEM FOTO
                  </div>
                )}

                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h4 className="text-xl font-black text-slate-900 dark:text-white">
                      {estudanteSelecionado.nome_completo}
                    </h4>
                    <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] font-bold text-school-blue-800 dark:bg-blue-950 dark:text-blue-300">
                      Matrícula: {estudanteSelecionado.status_matricula}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-school-blue-700 dark:text-school-gold-400">
                    Turma: {estudanteSelecionado.turma_nome || 'Não atribuída'} • Histórico Escolar: {(estudanteSelecionado.tipo_historico_escolar || 'NÃO ENTREGUE').toUpperCase()}
                  </p>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] pt-1">
                    <div><strong>Data Nasc:</strong> {new Date(estudanteSelecionado.data_nascimento).toLocaleDateString('pt-BR')}</div>
                    <div><strong>Nacionalidade:</strong> {estudanteSelecionado.nacionalidade || 'Brasileira'}</div>
                    <div><strong>Naturalidade:</strong> {estudanteSelecionado.naturalidade_cidade || 'Não informada'}</div>
                    <div><strong>CPF:</strong> {estudanteSelecionado.cpf || 'Não informado'}</div>
                    <div><strong>RG:</strong> {estudanteSelecionado.rg_numero || 'Não informado'}</div>
                    <div><strong>Expedição RG:</strong> {estudanteSelecionado.rg_data_expedicao ? new Date(estudanteSelecionado.rg_data_expedicao).toLocaleDateString('pt-BR') : 'Não informada'}</div>
                    <div><strong>Cartão SUS:</strong> {estudanteSelecionado.numero_sus || 'Não informado'}</div>
                    <div className="sm:col-span-2"><strong>Certidão Nasc:</strong> {estudanteSelecionado.certidao_nascimento || 'Não informada'}</div>
                  </div>
                </div>
              </div>

              {/* Seção 2: Cotas & Benefício Social */}
              <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-4 space-y-2 dark:border-indigo-900/50 dark:bg-indigo-950/20">
                <h5 className="font-bold uppercase tracking-wider text-indigo-950 dark:text-indigo-200 text-[11px] flex items-center gap-1.5">
                  <Award className="h-3.5 w-3.5 text-indigo-600" />
                  Política de Cotas & Benefícios Sociais
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div>
                    <strong>Classificação de Cotista:</strong>{' '}
                    <span className="font-bold text-indigo-700 dark:text-indigo-300 uppercase">
                      {estudanteSelecionado.percentual_cota === '0%' || !estudanteSelecionado.percentual_cota ? ' ( 0% )' : estudanteSelecionado.percentual_cota === '50%' ? '50% (COTA PARCIAL)' : '100% (COTA INTEGRAL)'}
                    </span>
                  </div>
                  <div>
                    <strong>Número do Bolsa Família (NIS):</strong>{' '}
                    <span className="font-bold text-slate-800 dark:text-white uppercase">
                      {estudanteSelecionado.numero_bolsa_familia || 'NÃO PARTICIPANTE / NÃO INFORMADO'}
                    </span>
                  </div>
                </div>
                <div className="mt-1 rounded-lg bg-indigo-100/70 p-2 text-indigo-950 dark:bg-indigo-950/40 dark:text-indigo-200 text-[11px] font-semibold border border-indigo-200 dark:border-indigo-800">
                  Esta escolha será utilizada para a inscrição nas <strong>Escolas Técnicas Estaduais (ETE)</strong> e no <strong>Instituto Federal de Pernambuco (IFPE)</strong>.
                </div>
              </div>

              {/* Seção 3: Filiação e Responsável */}
              <div className="rounded-xl border border-slate-200 p-4 space-y-2 dark:border-slate-700">
                <h5 className="font-bold uppercase tracking-wider text-slate-900 dark:text-white text-[11px] flex items-center gap-1.5">
                  <UserCheck className="h-3.5 w-3.5 text-school-blue-600" />
                  Dados de Filiação & Responsável Legal
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs uppercase">
                  <div><strong>Mãe:</strong> {estudanteSelecionado.filiacao_materna || 'NÃO DECLARADA'}</div>
                  <div><strong>Pai:</strong> {estudanteSelecionado.filiacao_paterna || 'NÃO DECLARADO'}</div>
                  <div><strong>Responsável Ativo:</strong> {estudanteSelecionado.nome_responsavel} ({estudanteSelecionado.parentesco_responsavel})</div>
                  <div><strong>CPF do Responsável:</strong> {estudanteSelecionado.cpf_responsavel || 'NÃO CADASTRADO'}</div>
                </div>
              </div>

              {/* Seção 4: Telefones de Contato (4 números) & Endereço */}
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/30 p-4 space-y-3 dark:border-emerald-900/50 dark:bg-emerald-950/20">
                <h5 className="font-bold uppercase tracking-wider text-emerald-950 dark:text-emerald-200 text-[11px] flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-emerald-600" />
                  Telefones de Contato & Endereço Residencial
                </h5>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
                  <div className="rounded-lg bg-white p-2 border border-emerald-100 dark:bg-slate-900 dark:border-emerald-900/40">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Tel 1 (Principal/WhatsApp)</span>
                    <strong className="font-mono text-emerald-700 dark:text-emerald-400">
                      {estudanteSelecionado.telefone_responsavel || 'Não cadastrado'}
                    </strong>
                  </div>

                  <div className="rounded-lg bg-white p-2 border border-emerald-100 dark:bg-slate-900 dark:border-emerald-900/40">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Tel 2 (Responsável)</span>
                    <strong className="font-mono text-slate-800 dark:text-slate-200">
                      {estudanteSelecionado.telefone_2 || 'Não informado'}
                    </strong>
                  </div>

                  <div className="rounded-lg bg-white p-2 border border-emerald-100 dark:bg-slate-900 dark:border-emerald-900/40">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Tel 3 (Responsável)</span>
                    <strong className="font-mono text-slate-800 dark:text-slate-200">
                      {estudanteSelecionado.telefone_3 || 'Não informado'}
                    </strong>
                  </div>

                  <div className="rounded-lg bg-white p-2 border border-emerald-100 dark:bg-slate-900 dark:border-emerald-900/40">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Tel 4 (Recado)</span>
                    <strong className="font-mono text-slate-800 dark:text-slate-200">
                      {estudanteSelecionado.telefone_4 || 'Não informado'}
                    </strong>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1 uppercase">
                  <div><strong>E-mail:</strong> {estudanteSelecionado.email || 'NÃO CADASTRADO'}</div>
                  <div>
                    <strong>Endereço Completo:</strong>{' '}
                    {estudanteSelecionado.endereco_logradouro
                      ? `${estudanteSelecionado.endereco_logradouro}, Nº ${estudanteSelecionado.endereco_numero || 'S/N'} - Bairro: ${estudanteSelecionado.endereco_bairro || 'NÃO INFORMADO'}`
                      : estudanteSelecionado.endereco || 'NÃO INFORMADO'}
                  </div>
                </div>
              </div>

              {/* Seção 5: Inclusão e AEE */}
              <div className="rounded-xl border border-slate-200 p-4 space-y-2 dark:border-slate-700">
                <h5 className="font-bold uppercase tracking-wider text-slate-900 dark:text-white text-[11px] flex items-center gap-1.5">
                  <HeartHandshake className="h-3.5 w-3.5 text-emerald-600" />
                  Indicadores de Inclusão & Saúde Escolar (AEE)
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <div>
                    <strong>Possui Laudo Homologado:</strong> {estudanteSelecionado.possui_laudo ? 'SIM' : 'NÃO'}
                  </div>
                  <div>
                    <strong>Elegível AEE:</strong> {estudanteSelecionado.aee ? 'SIM' : 'NÃO'}
                  </div>
                  <div>
                    <strong>Nome do Apoio:</strong>{' '}
                    <span className="font-bold text-emerald-700 dark:text-emerald-400 uppercase">
                      {estudanteSelecionado.apoio_nome || 'NÃO DESIGNADO'}
                    </span>
                  </div>
                </div>
                {estudanteSelecionado.laudo_descricao && (
                  <div className="rounded-lg bg-emerald-50 p-2.5 text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-200 text-xs uppercase">
                    <strong>Parecer / CID:</strong> {estudanteSelecionado.laudo_descricao}
                  </div>
                )}
              </div>

              {/* Seção 6: Observações */}
              {estudanteSelecionado.observacoes && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-1.5 dark:border-slate-700 dark:bg-slate-900/40">
                  <h5 className="font-bold uppercase tracking-wider text-slate-900 dark:text-white text-[11px]">
                    Observações Pedagógicas, Médicas ou Administrativas
                  </h5>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap uppercase">
                    {estudanteSelecionado.observacoes}
                  </p>
                </div>
              )}

              {/* Assinatura da Ficha Cadastral */}
              <div className="pt-8 grid grid-cols-2 gap-8 text-center text-[10px]">
                <div className="border-t border-slate-400 pt-1 text-slate-600 dark:text-slate-400">
                  Secretaria Escolar
                </div>
                <div className="border-t border-slate-400 pt-1 text-slate-600 dark:text-slate-400">
                  Direção Pedagógica
                </div>
              </div>
            </div>
            )}

            {/* Conteúdo da Aba 2: Relatórios Pedagógicos & Pareceres com IA */}
            {abaFicha === 'relatorios' && (
              <div className="mt-6">
                <PainelRelatoriosEstudante estudante={estudanteSelecionado} />
              </div>
            )}

            {/* Conteúdo da Aba 3: Observações Contínuas (Timeline) */}
            {abaFicha === 'observacoes' && (
              <div className="mt-6">
                <TimelineObservacoesAluno estudante={estudanteSelecionado} />
              </div>
            )}

            {/* Conteúdo da Aba 4: Repositório Google Drive */}
            {abaFicha === 'drive' && (
              <div className="mt-6">
                <RepositorioDriveAluno estudante={estudanteSelecionado} />
              </div>
            )}
          </div>
        </div>
      )}
      {/* MODAL 4: Visualização Rápida da Foto 3x4 & Google Drive */}
      {fotoPreviewEstudante && (
        <div className="fixed inset-0 z-[65] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm animate-in fade-in-0 duration-200 print:hidden">
          <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-school-blue-100 text-school-blue-700 dark:bg-school-blue-950 dark:text-school-blue-300">
                  <Camera className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                    Foto Oficial 3x4 do Estudante
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Armazenada no Google Drive Institucional
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setFotoPreviewEstudante(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Conteúdo: Foto em destaque + Metadados */}
            <div className="mt-5 flex flex-col sm:flex-row items-center gap-5">
              <div className="relative shrink-0">
                <div className="h-52 w-40 sm:h-56 sm:w-44 rounded-2xl overflow-hidden border-2 border-school-blue-400 dark:border-school-blue-600 bg-slate-100 dark:bg-slate-800 shadow-lg flex items-center justify-center">
                  {fotoPreviewEstudante.foto_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={fotoPreviewEstudante.foto_url}
                      alt={fotoPreviewEstudante.nome_completo}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="text-center p-3 text-slate-400">
                      <Camera className="h-10 w-10 mx-auto mb-2 text-slate-300" />
                      <span className="text-xs font-bold uppercase">Sem Foto</span>
                    </div>
                  )}
                </div>
                <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-emerald-600 text-white px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider shadow">
                  Padrão 3x4 • JPG
                </span>
              </div>

              <div className="flex-1 space-y-2.5 text-xs text-center sm:text-left">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Estudante</span>
                  <h4 className="text-base font-black text-slate-900 dark:text-white uppercase leading-snug">
                    {fotoPreviewEstudante.nome_completo}
                  </h4>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 dark:text-slate-300">
                  <div className="rounded-lg bg-slate-50 dark:bg-slate-800/60 p-2">
                    <span className="block text-[9px] font-bold text-slate-400 uppercase">Turma</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {fotoPreviewEstudante.turma_nome || 'Regular'}
                    </span>
                  </div>
                  <div className="rounded-lg bg-slate-50 dark:bg-slate-800/60 p-2">
                    <span className="block text-[9px] font-bold text-slate-400 uppercase">CPF</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">
                      {fotoPreviewEstudante.cpf || 'Não informado'}
                    </span>
                  </div>
                </div>

                {/* Estrutura da Pasta no Google Drive */}
                <div className="rounded-xl bg-slate-950 p-2.5 text-[10px] font-mono text-left text-slate-300 border border-slate-800">
                  <div className="text-school-gold-400 font-bold flex items-center gap-1">
                    <Folder className="h-3 w-3" />
                    <span>FICHA DOS ESTUDANTES/</span>
                  </div>
                  <div className="pl-3 border-l border-slate-800 ml-1 space-y-0.5 mt-0.5">
                    <div className="text-amber-300">
                      └── [{(fotoPreviewEstudante.nome_completo || 'A').trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').charAt(0).toUpperCase()}]/
                    </div>
                    <div className="pl-3 border-l border-slate-800 ml-1 space-y-0.5">
                      <div className="text-blue-300 font-bold truncate max-w-[200px]">
                        └── [{fotoPreviewEstudante.nome_completo.toUpperCase()}]/
                      </div>
                      <div className="pl-3 text-emerald-400 font-semibold">
                        ├── foto_perfil_3x4.jpg
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Ações */}
            <div className="mt-6 flex flex-wrap items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
              {fotoPreviewEstudante.foto_url && (
                <a
                  href={fotoPreviewEstudante.foto_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 shadow-sm"
                >
                  <ExternalLink className="h-3.5 w-3.5 text-school-blue-600 dark:text-school-gold-400" />
                  <span>Abrir no Google Drive</span>
                </a>
              )}

              <button
                type="button"
                onClick={() => {
                  const est = fotoPreviewEstudante;
                  setFotoPreviewEstudante(null);
                  handleAbrirEditar(est);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-school-blue-600 text-white text-xs font-bold hover:bg-school-blue-700 shadow-sm transition-all"
              >
                <Edit3 className="h-3.5 w-3.5" />
                <span>Alterar / Recortar Foto</span>
              </button>

              <button
                type="button"
                onClick={() => setFotoPreviewEstudante(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
