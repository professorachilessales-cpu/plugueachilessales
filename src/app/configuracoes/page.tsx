'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { PainelGoogleDriveConfig } from '@/components/configuracoes/PainelGoogleDriveConfig';
import {
  Settings,
  UserCog,
  School,
  Palette,
  ShieldAlert,
  Save,
  Download,
  RotateCcw,
  Cloud,
  Database,
  CheckCircle2,
  AlertTriangle,
  FileCode,
  Copy,
  ExternalLink,
  UploadCloud,
  Check,
  Building2,
  Calendar,
  Lock,
  MessageSquare,
  HeartHandshake,
  RefreshCw,
  Sparkles,
  Eye,
  EyeOff,
  Key,
} from 'lucide-react';
import { initialEscolaConfig, initialEstudantes, initialTurmas, initialProfessores, initialFaltasProfessores, initialEventos } from '@/lib/mock-data';

const MODELOS_WHATSAPP_PADRAO = {
  falta: 'Olá {Responsável}, informamos que o(a) estudante {Aluno} da turma {Turma} não compareceu à aula na data de hoje. Solicitamos a gentileza de justificar a ausência junto à secretaria escolar. Atenciosamente, Equipe Pedagógica.',
  reuniao: 'Prezado(a) {Responsável}, convidamos você para a Reunião Pedagógica de Pais & Mestres da turma {Turma}. Sua participação é fundamental para o acompanhamento do desenvolvimento de {Aluno}. Contamos com sua presença!',
  tarefa: 'Olá {Responsável}, comunicamos que o(a) aluno(a) {Aluno} possui atividades/tarefas escolares pendentes de entrega na turma {Turma}. Pedimos o apoio da família no incentivo e acompanhamento dos estudos em casa.',
  elogio: 'Olá {Responsável}! Temos a imensa alegria de parabenizar {Aluno} pelo admirável desempenho, postura participativa e dedicação nas aulas da turma {Turma}. O esforço da família reflete neste sucesso! Parabéns!',
  livre: 'Olá {Responsável}, aqui é a coordenação escolar referente ao estudante {Aluno} ({Turma}). ',
  inclusao_aee: 'Olá {Responsável}, tudo bem? Aqui é da coordenação de Inclusão Escolar (PLUGUE). Estamos entrando em contato para compartilhar o andamento do plano pedagógico e atendimento AEE de {Aluno} ({Turma}). Gostaríamos de alinhar os próximos passos com a família. Contamos com sua parceria!',
  inclusao_laudo: 'Prezado(a) {Responsável}, tudo bem? Solicitamos a gentileza de apresentar na secretaria ou nos encaminhar a atualização do laudo médico / relatório clínico de {Aluno} ({Turma}) para manutenção da ficha pedagógica. Atenciosamente, Equipe de Inclusão (PLUGUE).',
  inclusao_reuniao: 'Olá {Responsável}, gostaríamos de agendar uma reunião de acompanhamento multidisciplinar referente ao estudante {Aluno} ({Turma}), referente ao laudo ({Laudo}). Qual o melhor dia e horário para você nesta semana?',
  inclusao_livre: 'Olá {Responsável}, aqui é a coordenação de Inclusão da Plataforma Unificada de Gestão Educacional (PLUGUE) sobre o(a) estudante {Aluno} ({Turma}). ',
};

const PRESET_CORES_PRIMARIAS = [
  { nome: 'Azul Real Institucional', hex: '#1E40AF' },
  { nome: 'Azul Marinho Oxford', hex: '#0F172A' },
  { nome: 'Verde Floresta Pedagógico', hex: '#065F46' },
  { nome: 'Bordô / Vinho Universitário', hex: '#881337' },
  { nome: 'Roxo Acadêmico', hex: '#581C87' },
  { nome: 'Índigo Tecnológico', hex: '#3730A3' },
];

const PRESET_CORES_SECUNDARIAS = [
  { nome: 'Dourado Âmbar', hex: '#EAB308' },
  { nome: 'Azul Celeste', hex: '#38BDF8' },
  { nome: 'Esmeralda', hex: '#10B981' },
  { nome: 'Laranja Criativo', hex: '#F97316' },
  { nome: 'Rosa Magenta', hex: '#EC4899' },
];

export default function ConfiguracoesPage() {
  const {
    escolaConfig,
    updateEscolaConfig,
    role,
    estudantes,
    turmas,
    professores,
    faltasProfessores,
    eventos,
  } = useApp();

  const [formConfig, setFormConfig] = useState({
    nome_escola: escolaConfig.nome_escola || '',
    codigo_inep: escolaConfig.codigo_inep || '',
    cnpj: escolaConfig.cnpj || '',
    endereco: escolaConfig.endereco || '',
    telefone: escolaConfig.telefone || '',
    email: escolaConfig.email || '',
    logo_url: escolaConfig.logo_url || '',
    cor_primaria: escolaConfig.cor_primaria || '#1E40AF',
    cor_secundaria: escolaConfig.cor_secundaria || '#EAB308',
    ano_letivo_ativo: escolaConfig.ano_letivo_ativo || 2026,
    modelos_whatsapp: {
      falta: escolaConfig.modelos_whatsapp?.falta || MODELOS_WHATSAPP_PADRAO.falta,
      reuniao: escolaConfig.modelos_whatsapp?.reuniao || MODELOS_WHATSAPP_PADRAO.reuniao,
      tarefa: escolaConfig.modelos_whatsapp?.tarefa || MODELOS_WHATSAPP_PADRAO.tarefa,
      elogio: escolaConfig.modelos_whatsapp?.elogio || MODELOS_WHATSAPP_PADRAO.elogio,
      livre: escolaConfig.modelos_whatsapp?.livre || MODELOS_WHATSAPP_PADRAO.livre,
      inclusao_aee: escolaConfig.modelos_whatsapp?.inclusao_aee || MODELOS_WHATSAPP_PADRAO.inclusao_aee,
      inclusao_laudo: escolaConfig.modelos_whatsapp?.inclusao_laudo || MODELOS_WHATSAPP_PADRAO.inclusao_laudo,
      inclusao_reuniao: escolaConfig.modelos_whatsapp?.inclusao_reuniao || MODELOS_WHATSAPP_PADRAO.inclusao_reuniao,
      inclusao_livre: escolaConfig.modelos_whatsapp?.inclusao_livre || MODELOS_WHATSAPP_PADRAO.inclusao_livre,
    },
  });

  const [mensagemSucesso, setMensagemSucesso] = useState(false);
  const [copiadoSql, setCopiadoSql] = useState(false);
  const [modalSqlAberto, setModalSqlAberto] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState<'geral' | 'storage'>('geral');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      if (tabParam === 'storage' || params.get('status') === 'google_connected') {
        setAbaAtiva('storage');
      }
    }
  }, []);

  // Estados de Configuração da Turso (Database URL & Token)
  const [tursoDbUrl, setTursoDbUrl] = useState('');
  const [tursoAuthToken, setTursoAuthToken] = useState('');
  const [tursoPadraoUrl, setTursoPadraoUrl] = useState('libsql://plugueachiles-achilessales.aws-us-west-2.turso.io');
  const [mostrarTursoToken, setMostrarTursoToken] = useState(false);
  const [salvandoTursoConfig, setSalvandoTursoConfig] = useState(false);
  const [mensagemTursoSucesso, setMensagemTursoSucesso] = useState<string | null>(null);
  const [mensagemTursoErro, setMensagemTursoErro] = useState<string | null>(null);

  // Carrega configurações da Turso da API
  useEffect(() => {
    fetch('/api/turso/config')
      .then((res) => res.json())
      .then((data) => {
        if (data.dbUrl) setTursoDbUrl(data.dbUrl);
        if (data.maskedToken) setTursoAuthToken(data.maskedToken);
        else if (data.authToken) setTursoAuthToken(data.authToken);
        if (data.defaultDbUrl) setTursoPadraoUrl(data.defaultDbUrl);
      })
      .catch(() => {});
  }, []);

  // Salvar alterações de Database URL e Token da Turso
  const handleSalvarTursoConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    setSalvandoTursoConfig(true);
    setMensagemTursoSucesso(null);
    setMensagemTursoErro(null);

    try {
      const res = await fetch('/api/turso/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dbUrl: tursoDbUrl, authToken: tursoAuthToken }),
      });
      const data = await res.json();
      if (res.ok) {
        setMensagemTursoSucesso(data.message || 'Configurações do Turso salvas com sucesso!');
        setTimeout(() => setMensagemTursoSucesso(null), 5000);
        testarConexaoTurso();
      } else {
        setMensagemTursoErro(data.error || 'Erro ao salvar credenciais do Turso.');
      }
    } catch (err: any) {
      setMensagemTursoErro(err?.message || 'Falha ao comunicar com o servidor.');
    } finally {
      setSalvandoTursoConfig(false);
    }
  };

  // Estados de teste do Turso
  const [testandoTurso, setTestandoTurso] = useState(false);
  const [migrandoTurso, setMigrandoTurso] = useState(false);
  const [statusTurso, setStatusTurso] = useState<{
    executado: boolean;
    conectado?: boolean;
    mensagem?: string;
    tabelas?: string[];
  }>({ executado: false });

  const testarConexaoTurso = async () => {
    setTestandoTurso(true);
    setStatusTurso({ executado: false });
    try {
      const res = await fetch('/api/turso/status');
      const data = await res.json();
      if (data.connected) {
        setStatusTurso({
          executado: true,
          conectado: true,
          mensagem: `Conectado com sucesso! ${data.tables?.length || 0} tabela(s) encontrada(s).`,
          tabelas: data.tables,
        });
      } else {
        setStatusTurso({
          executado: true,
          conectado: false,
          mensagem: data.message || data.error || 'Aguardando TURSO_AUTH_TOKEN no .env.local',
        });
      }
    } catch (err: any) {
      setStatusTurso({
        executado: true,
        conectado: false,
        mensagem: err.message || 'Falha ao contatar API do Turso.',
      });
    } finally {
      setTestandoTurso(false);
    }
  };

  const migrarSchemaTurso = async () => {
    if (!window.confirm('Deseja criar/atualizar a estrutura de tabelas no banco de dados Turso agora?')) return;
    setMigrandoTurso(true);
    try {
      const res = await fetch('/api/turso/migrate', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || 'Tabelas criadas com sucesso no Turso!');
        testarConexaoTurso();
      } else {
        alert('Erro: ' + (data.error || 'Falha ao executar DDL.'));
      }
    } catch (err: any) {
      alert('Erro ao conectar ao servidor: ' + err.message);
    } finally {
      setMigrandoTurso(false);
    }
  };

  const isAdmin = role === 'admin';

  const handleSalvarConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;

    updateEscolaConfig(formConfig);
    setMensagemSucesso(true);
    setTimeout(() => setMensagemSucesso(false), 3500);
  };

  // Exportação de Backup Completo em JSON
  const handleExportarBackup = () => {
    const backupData = {
      versao: '1.0.0',
      data_exportacao: new Date().toISOString(),
      escolaConfig: formConfig,
      turmas,
      estudantes,
      professores,
      faltasProfessores,
      eventos,
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_school_os_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Restauração de Dados Padrão (Demo)
  const handleRestaurarPadroes = () => {
    if (!window.confirm('Tem certeza que deseja restaurar as configurações e dados padrão de demonstração? Isso redefinirá as alterações locais.')) {
      return;
    }
    localStorage.clear();
    window.location.reload();
  };

  const sqlSchemaExemplo = `-- Script DDL - PLUGUE no Turso Database (LibSQL / SQLite)
-- Endpoint: libsql://plugueachiles-achilessales.aws-us-west-2.turso.io

CREATE TABLE IF NOT EXISTS config_escola (
  id TEXT PRIMARY KEY,
  nome_escola TEXT NOT NULL,
  codigo_inep TEXT,
  cnpj TEXT,
  endereco TEXT,
  telefone TEXT,
  email TEXT,
  logo_url TEXT,
  cor_primaria TEXT DEFAULT '#1E40AF',
  cor_secundaria TEXT DEFAULT '#EAB308',
  ano_letivo_ativo INTEGER DEFAULT 2026,
  modelos_whatsapp TEXT DEFAULT '{}',
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS turmas (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  grupo TEXT DEFAULT '1º anos',
  turno TEXT NOT NULL,
  capacidade INTEGER DEFAULT 35,
  ano_letivo INTEGER DEFAULT 2026,
  sala TEXT,
  grade_horaria TEXT DEFAULT '[]',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS estudantes (
  id TEXT PRIMARY KEY,
  turma_id TEXT REFERENCES turmas(id),
  nome_completo TEXT NOT NULL,
  data_nascimento TEXT,
  cpf TEXT,
  telefone_responsavel TEXT,
  nome_responsavel TEXT,
  status_matricula TEXT DEFAULT 'Ativo',
  possui_laudo INTEGER DEFAULT 0,
  aee INTEGER DEFAULT 0,
  tipo_historico_escolar TEXT DEFAULT 'Definitivo',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS professores (
  id TEXT PRIMARY KEY,
  nome_completo TEXT NOT NULL,
  matricula TEXT NOT NULL UNIQUE,
  formacao TEXT,
  disciplinas TEXT DEFAULT '[]',
  telefone TEXT,
  email TEXT NOT NULL,
  eh_apoio INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS faltas_professores (
  id TEXT PRIMARY KEY,
  professor_id TEXT NOT NULL REFERENCES professores(id) ON DELETE CASCADE,
  data_falta TEXT NOT NULL,
  aulas_faltadas INTEGER DEFAULT 1,
  justificativa TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS eventos (
  id TEXT PRIMARY KEY,
  titulo TEXT NOT NULL,
  data_inicio TEXT NOT NULL,
  data_fim TEXT NOT NULL,
  categoria TEXT NOT NULL,
  cor TEXT DEFAULT '#2563EB',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);`;

  const copiarSqlParaClipboard = () => {
    navigator.clipboard.writeText(sqlSchemaExemplo);
    setCopiadoSql(true);
    setTimeout(() => setCopiadoSql(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
              Configurações White-Label & Sistema
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              <Settings className="h-3.5 w-3.5" />
              Institucional
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Personalize a identidade visual, dados oficiais da instituição e gerencie o backup de dados.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleExportarBackup}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-school-dark-border dark:bg-school-dark-surface dark:text-slate-200 dark:hover:bg-slate-700"
            title="Baixar cópia de segurança em formato JSON"
          >
            <Download className="h-4 w-4 text-slate-500" />
            Backup JSON
          </button>

          <button
            onClick={handleRestaurarPadroes}
            className="inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300 dark:hover:bg-rose-900/40"
            title="Resetar dados do LocalStorage para os padrões do mock"
          >
            <RotateCcw className="h-4 w-4" />
            Restaurar Padrão
          </button>
        </div>
      </div>

      {/* Abas de Navegação das Configurações */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button
          type="button"
          onClick={() => setAbaAtiva('geral')}
          className={`px-4 py-2.5 text-xs font-bold transition-colors ${
            abaAtiva === 'geral'
              ? 'border-b-2 border-school-blue-600 text-school-blue-700 dark:border-school-gold-400 dark:text-school-gold-400'
              : 'border-b-2 border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          Geral & Identidade Visual
        </button>
        <button
          type="button"
          onClick={() => setAbaAtiva('storage')}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold transition-colors ${
            abaAtiva === 'storage'
              ? 'border-b-2 border-school-blue-600 text-school-blue-700 dark:border-school-gold-400 dark:text-school-gold-400'
              : 'border-b-2 border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          <Cloud className="h-4 w-4" />
          <span>Armazenamento & Google Drive</span>
        </button>
      </div>

      {/* Alerta de Perfil Não-Admin */}
      {!isAdmin && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
          <Lock className="h-5 w-5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
          <div>
            <p className="font-semibold">Modo de Acesso do Docente (Somente Leitura)</p>
            <p className="text-xs text-amber-700 dark:text-amber-400">
              Você está conectado com o perfil de Professor. As alterações de identidade visual e dados cadastrais da mantenedora estão bloqueadas para edição.
            </p>
          </div>
        </div>
      )}

      {/* Toast de Sucesso */}
      {mensagemSucesso && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300">
          <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
          <div>
            <p className="font-semibold">Configurações salvas com sucesso!</p>
            <p className="text-xs text-emerald-700 dark:text-emerald-400">
              As alterações de cores, logotipo e dados institucionais foram aplicadas no sistema.
            </p>
          </div>
        </div>
      )}

      {/* Visualização da Aba de Armazenamento Dedicada */}
      {abaAtiva === 'storage' && (
        <div className="space-y-6">
          <PainelGoogleDriveConfig />
        </div>
      )}

      {/* Visualização da Aba Geral */}
      {abaAtiva === 'geral' && (
        <>
          <form onSubmit={handleSalvarConfig} className="space-y-6">
            {/* Card 1: Identidade Visual & White-Label */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-school-dark-border dark:bg-school-dark-surface">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                  <Palette className="h-5 w-5" />
                </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Identidade Visual & Cores Institucionais
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Ajuste as cores principais do sistema e adicione o logotipo personalizado da escola.
              </p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Seletor de Cores */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Cor Primária da Instituição (Topbar, Botões e Destaques)
                </label>
                <div className="mt-2 flex items-center gap-3">
                  <input
                    type="color"
                    disabled={!isAdmin}
                    value={formConfig.cor_primaria}
                    onChange={(e) => setFormConfig({ ...formConfig, cor_primaria: e.target.value })}
                    className="h-10 w-14 cursor-pointer rounded-lg border border-slate-200 bg-transparent p-1 disabled:opacity-50"
                  />
                  <input
                    type="text"
                    disabled={!isAdmin}
                    value={formConfig.cor_primaria}
                    onChange={(e) => setFormConfig({ ...formConfig, cor_primaria: e.target.value })}
                    className="w-32 rounded-lg border border-slate-200 px-3 py-2 text-sm uppercase text-slate-900 dark:border-school-dark-border dark:bg-slate-800 dark:text-white disabled:opacity-50 font-mono"
                  />
                </div>

                {/* Presets Primária */}
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {PRESET_CORES_PRIMARIAS.map((preset) => (
                    <button
                      key={preset.hex}
                      type="button"
                      disabled={!isAdmin}
                      onClick={() => setFormConfig({ ...formConfig, cor_primaria: preset.hex })}
                      className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: preset.hex }}
                      />
                      {preset.nome.split(' ')[0]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Cor Secundária / Acento (Badges, Destaques e Alertas Suaves)
                </label>
                <div className="mt-2 flex items-center gap-3">
                  <input
                    type="color"
                    disabled={!isAdmin}
                    value={formConfig.cor_secundaria}
                    onChange={(e) => setFormConfig({ ...formConfig, cor_secundaria: e.target.value })}
                    className="h-10 w-14 cursor-pointer rounded-lg border border-slate-200 bg-transparent p-1 disabled:opacity-50"
                  />
                  <input
                    type="text"
                    disabled={!isAdmin}
                    value={formConfig.cor_secundaria}
                    onChange={(e) => setFormConfig({ ...formConfig, cor_secundaria: e.target.value })}
                    className="w-32 rounded-lg border border-slate-200 px-3 py-2 text-sm uppercase text-slate-900 dark:border-school-dark-border dark:bg-slate-800 dark:text-white disabled:opacity-50 font-mono"
                  />
                </div>

                {/* Presets Secundária */}
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {PRESET_CORES_SECUNDARIAS.map((preset) => (
                    <button
                      key={preset.hex}
                      type="button"
                      disabled={!isAdmin}
                      onClick={() => setFormConfig({ ...formConfig, cor_secundaria: preset.hex })}
                      className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: preset.hex }}
                      />
                      {preset.nome}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  URL da Logomarca da Escola (PNG ou SVG Transparente)
                </label>
                <input
                  type="url"
                  disabled={!isAdmin}
                  placeholder="https://sua-escola.com.br/logo.png"
                  value={formConfig.logo_url}
                  onChange={(e) => setFormConfig({ ...formConfig, logo_url: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3.5 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none dark:border-school-dark-border dark:bg-slate-800 dark:text-white disabled:opacity-50"
                />
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  Se deixado em branco, o sistema utilizará o brasão vetorial oficial do Colégio.
                </p>
              </div>
            </div>

            {/* Pré-visualização do Brasão & Cabeçalho */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 dark:border-school-dark-border dark:bg-slate-800/40">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Pré-visualização da Identidade
              </span>

              <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-school-dark-surface">
                <div className="flex items-center gap-4">
                  {formConfig.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={formConfig.logo_url}
                      alt="Logo Prévia"
                      className="h-16 w-16 object-contain rounded-lg border border-slate-100 dark:border-slate-700"
                    />
                  ) : (
                    <div
                      className="flex h-16 w-16 items-center justify-center rounded-xl text-white shadow-md"
                      style={{ backgroundColor: formConfig.cor_primaria }}
                    >
                      <School className="h-8 w-8" />
                    </div>
                  )}

                  <div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white">
                      {formConfig.nome_escola || 'Nome da Instituição'}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      INEP: {formConfig.codigo_inep || '00000000'} | CNPJ: {formConfig.cnpj || '00.000.000/0001-00'}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <span
                        className="rounded-full px-2.5 py-0.5 text-[10px] font-bold text-white shadow-sm"
                        style={{ backgroundColor: formConfig.cor_primaria }}
                      >
                        Cor Primária
                      </span>
                      <span
                        className="rounded-full px-2.5 py-0.5 text-[10px] font-bold text-slate-900 shadow-sm"
                        style={{ backgroundColor: formConfig.cor_secundaria }}
                      >
                        Cor Secundária
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 text-xs text-slate-600 dark:text-slate-400">
                <p>
                  Esta identidade é replicada automaticamente nos documentos impressos, fotogramas de turma, relatórios executivos e cabeçalho do portal.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Dados Oficiais do Estabelecimento */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-school-dark-border dark:bg-school-dark-surface">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Dados Cadastrais da Mantenedora & Censo Escolar
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Informações exigidas para o cabeçalho timbrado oficial e documentos de transferência.
              </p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Razão Social / Nome Oficial da Escola *
              </label>
              <input
                type="text"
                required
                disabled={!isAdmin}
                value={formConfig.nome_escola}
                onChange={(e) => setFormConfig({ ...formConfig, nome_escola: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3.5 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none dark:border-school-dark-border dark:bg-slate-800 dark:text-white disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Ano Letivo Vigente *
              </label>
              <input
                type="number"
                required
                disabled={!isAdmin}
                value={formConfig.ano_letivo_ativo}
                onChange={(e) => setFormConfig({ ...formConfig, ano_letivo_ativo: Number(e.target.value) })}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3.5 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none dark:border-school-dark-border dark:bg-slate-800 dark:text-white disabled:opacity-50 font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Código INEP (MEC) *
              </label>
              <input
                type="text"
                required
                disabled={!isAdmin}
                value={formConfig.codigo_inep}
                onChange={(e) => setFormConfig({ ...formConfig, codigo_inep: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3.5 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none dark:border-school-dark-border dark:bg-slate-800 dark:text-white disabled:opacity-50 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                CNPJ da Entidade Mantenedora *
              </label>
              <input
                type="text"
                required
                disabled={!isAdmin}
                value={formConfig.cnpj}
                onChange={(e) => setFormConfig({ ...formConfig, cnpj: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3.5 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none dark:border-school-dark-border dark:bg-slate-800 dark:text-white disabled:opacity-50 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Telefone da Secretaria Geral *
              </label>
              <input
                type="text"
                required
                disabled={!isAdmin}
                value={formConfig.telefone}
                onChange={(e) => setFormConfig({ ...formConfig, telefone: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3.5 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none dark:border-school-dark-border dark:bg-slate-800 dark:text-white disabled:opacity-50"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Endereço Completo da Sede
              </label>
              <input
                type="text"
                disabled={!isAdmin}
                value={formConfig.endereco}
                onChange={(e) => setFormConfig({ ...formConfig, endereco: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3.5 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none dark:border-school-dark-border dark:bg-slate-800 dark:text-white disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                E-mail Institucional de Contato
              </label>
              <input
                type="email"
                disabled={!isAdmin}
                value={formConfig.email}
                onChange={(e) => setFormConfig({ ...formConfig, email: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3.5 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none dark:border-school-dark-border dark:bg-slate-800 dark:text-white disabled:opacity-50"
              />
            </div>
          </div>
        </div>

        {/* Card: Modelos de Comunicação do WhatsApp */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-school-dark-border dark:bg-school-dark-surface">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Modelos de Comunicação do WhatsApp
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Personalize os modelos de mensagens utilizados para envio aos responsáveis no Fotograma da Turma. As marcações <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">&#123;Aluno&#125;</span>, <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">&#123;Turma&#125;</span> e <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">&#123;Responsável&#125;</span> serão substituídas automaticamente pelos dados do estudante.
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Modelo 1: Notificação de Falta / Ausência
              </label>
              <textarea
                rows={2}
                disabled={!isAdmin}
                value={formConfig.modelos_whatsapp.falta}
                onChange={(e) => setFormConfig({
                  ...formConfig,
                  modelos_whatsapp: { ...formConfig.modelos_whatsapp, falta: e.target.value }
                })}
                className="mt-1 w-full rounded-lg border border-slate-200 p-3 text-sm text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none dark:border-school-dark-border dark:bg-slate-800 dark:text-white disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Modelo 2: Convocação para Reunião de Pais & Mestres
              </label>
              <textarea
                rows={2}
                disabled={!isAdmin}
                value={formConfig.modelos_whatsapp.reuniao}
                onChange={(e) => setFormConfig({
                  ...formConfig,
                  modelos_whatsapp: { ...formConfig.modelos_whatsapp, reuniao: e.target.value }
                })}
                className="mt-1 w-full rounded-lg border border-slate-200 p-3 text-sm text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none dark:border-school-dark-border dark:bg-slate-800 dark:text-white disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Modelo 3: Tarefas e Trabalhos Pedagógicos Pendentes
              </label>
              <textarea
                rows={2}
                disabled={!isAdmin}
                value={formConfig.modelos_whatsapp.tarefa}
                onChange={(e) => setFormConfig({
                  ...formConfig,
                  modelos_whatsapp: { ...formConfig.modelos_whatsapp, tarefa: e.target.value }
                })}
                className="mt-1 w-full rounded-lg border border-slate-200 p-3 text-sm text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none dark:border-school-dark-border dark:bg-slate-800 dark:text-white disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Modelo 4: Elogio Pedagógico e Comportamental
              </label>
              <textarea
                rows={2}
                disabled={!isAdmin}
                value={formConfig.modelos_whatsapp.elogio}
                onChange={(e) => setFormConfig({
                  ...formConfig,
                  modelos_whatsapp: { ...formConfig.modelos_whatsapp, elogio: e.target.value }
                })}
                className="mt-1 w-full rounded-lg border border-slate-200 p-3 text-sm text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none dark:border-school-dark-border dark:bg-slate-800 dark:text-white disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Modelo 5: Mensagem Livre / Comunicado Geral
              </label>
              <textarea
                rows={2}
                disabled={!isAdmin}
                value={formConfig.modelos_whatsapp.livre}
                onChange={(e) => setFormConfig({
                  ...formConfig,
                  modelos_whatsapp: { ...formConfig.modelos_whatsapp, livre: e.target.value }
                })}
                className="mt-1 w-full rounded-lg border border-slate-200 p-3 text-sm text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none dark:border-school-dark-border dark:bg-slate-800 dark:text-white disabled:opacity-50"
              />
            </div>
          </div>
        </div>

        {/* Card: Modelos de Comunicação do WhatsApp • Setor de Inclusão (Dashboard) */}
        <div className="rounded-2xl border border-emerald-200/80 bg-white p-6 shadow-sm dark:border-emerald-900/40 dark:bg-school-dark-surface">
          <div className="flex items-center gap-3 border-b border-emerald-100 pb-4 dark:border-emerald-900/30">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
              <HeartHandshake className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Modelos de WhatsApp • Setor de Inclusão
                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  Dashboard
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Personalize os modelos de mensagens utilizados no envio de WhatsApp do Setor de Inclusão no Dashboard. As marcações <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">&#123;Aluno&#125;</span>, <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">&#123;Turma&#125;</span>, <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">&#123;Responsável&#125;</span> e <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">&#123;Laudo&#125;</span> serão substituídas automaticamente pelos dados do estudante.
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Modelo 1: Atendimento AEE & Plano Pedagógico
              </label>
              <textarea
                rows={2}
                disabled={!isAdmin}
                value={formConfig.modelos_whatsapp.inclusao_aee}
                onChange={(e) => setFormConfig({
                  ...formConfig,
                  modelos_whatsapp: { ...formConfig.modelos_whatsapp, inclusao_aee: e.target.value }
                })}
                className="mt-1 w-full rounded-lg border border-slate-200 p-3 text-sm text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none dark:border-school-dark-border dark:bg-slate-800 dark:text-white disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Modelo 2: Solicitação / Renovação de Laudo Médico
              </label>
              <textarea
                rows={2}
                disabled={!isAdmin}
                value={formConfig.modelos_whatsapp.inclusao_laudo}
                onChange={(e) => setFormConfig({
                  ...formConfig,
                  modelos_whatsapp: { ...formConfig.modelos_whatsapp, inclusao_laudo: e.target.value }
                })}
                className="mt-1 w-full rounded-lg border border-slate-200 p-3 text-sm text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none dark:border-school-dark-border dark:bg-slate-800 dark:text-white disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Modelo 3: Reunião Multidisciplinar / Alinhamento com a Família
              </label>
              <textarea
                rows={2}
                disabled={!isAdmin}
                value={formConfig.modelos_whatsapp.inclusao_reuniao}
                onChange={(e) => setFormConfig({
                  ...formConfig,
                  modelos_whatsapp: { ...formConfig.modelos_whatsapp, inclusao_reuniao: e.target.value }
                })}
                className="mt-1 w-full rounded-lg border border-slate-200 p-3 text-sm text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none dark:border-school-dark-border dark:bg-slate-800 dark:text-white disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Modelo 4: Mensagem Livre do Setor de Inclusão
              </label>
              <textarea
                rows={2}
                disabled={!isAdmin}
                value={formConfig.modelos_whatsapp.inclusao_livre}
                onChange={(e) => setFormConfig({
                  ...formConfig,
                  modelos_whatsapp: { ...formConfig.modelos_whatsapp, inclusao_livre: e.target.value }
                })}
                className="mt-1 w-full rounded-lg border border-slate-200 p-3 text-sm text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none dark:border-school-dark-border dark:bg-slate-800 dark:text-white disabled:opacity-50"
              />
            </div>
          </div>
        </div>

        {/* Card 3: Status das Integrações Cloud (Google Drive & Supabase) */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Google Drive */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-school-dark-border dark:bg-school-dark-surface">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
                  <Cloud className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Google Drive Storage
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Armazenamento oficial de fotos 3x4 e repositório
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAbaAtiva('storage')}
                className="inline-flex items-center gap-1 rounded-full bg-school-blue-100 px-2.5 py-0.5 text-xs font-bold text-school-blue-700 hover:bg-school-blue-200 dark:bg-school-blue-950 dark:text-school-blue-300 transition"
              >
                Gerenciar Conexão
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Pasta Raiz:</span>
                <span className="font-mono font-bold text-school-blue-700 dark:text-school-blue-300">
                  FICHA DOS ESTUDANTES
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Hierarquia Automática:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  [Inicial] / [Nome Estudante]
                </span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-500">Status & Conta:</span>
                <span className="text-emerald-600 font-semibold">Integrado (Storage API)</span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setAbaAtiva('storage')}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-900 py-2 text-xs font-bold text-white hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 transition"
              >
                <Cloud className="h-4 w-4 text-amber-400" />
                <span>Configurar Conta & Ver Árvore de Diretórios</span>
              </button>
            </div>
          </div>

          {/* Turso Database */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-school-dark-border dark:bg-school-dark-surface">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300">
                  <Database className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Turso Database (LibSQL)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Banco de dados relacional distribuído de baixa latência
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-teal-100 px-2.5 py-0.5 text-xs font-semibold text-teal-800 dark:bg-teal-900/40 dark:text-teal-300">
                Cloud Integrado
              </span>
            </div>

            {/* Formulário Editável: Database URL & Token da Turso */}
            <form onSubmit={handleSalvarTursoConfig} className="mt-4 space-y-3.5 text-xs">
              {/* Campo Database URL */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
                    <Database className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
                    Database URL:
                  </label>
                  {tursoDbUrl !== tursoPadraoUrl && (
                    <button
                      type="button"
                      onClick={() => setTursoDbUrl(tursoPadraoUrl)}
                      className="text-[10px] text-teal-600 dark:text-teal-400 hover:underline font-semibold"
                      title="Restaurar endereço padrão da Turso"
                    >
                      Restaurar Padrão
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  disabled={!isAdmin}
                  value={tursoDbUrl}
                  onChange={(e) => setTursoDbUrl(e.target.value)}
                  placeholder="libsql://meu-banco.turso.io"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-mono text-slate-900 focus:border-teal-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white disabled:opacity-50"
                />
              </div>

              {/* Campo Token da Turso */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">
                  <span className="flex items-center gap-1.5">
                    <Key className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
                    Token da Turso (TURSO_AUTH_TOKEN):
                  </span>
                </label>
                <div className="relative flex items-center">
                  <input
                    type={mostrarTursoToken ? 'text' : 'password'}
                    disabled={!isAdmin}
                    value={tursoAuthToken}
                    onChange={(e) => setTursoAuthToken(e.target.value)}
                    placeholder="Cole seu token JWT (ey...)"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 pr-10 text-xs font-mono text-slate-900 focus:border-teal-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarTursoToken(!mostrarTursoToken)}
                    className="absolute right-2 p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white"
                    title={mostrarTursoToken ? 'Ocultar Token' : 'Mostrar Token'}
                  >
                    {mostrarTursoToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Feedback de Alteração */}
              {mensagemTursoSucesso && (
                <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-2.5 text-xs font-semibold text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  <span>{mensagemTursoSucesso}</span>
                </div>
              )}

              {mensagemTursoErro && (
                <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-2.5 text-xs font-semibold text-rose-800 border border-rose-200 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
                  <span>{mensagemTursoErro}</span>
                </div>
              )}

              {/* Metadados e Link do Schema */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">Modo de Operação:</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">LocalStorage + Turso LibSQL Cloud</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-500">Schema Turso SQL:</span>
                  <button
                    type="button"
                    onClick={() => setModalSqlAberto(true)}
                    className="inline-flex items-center gap-1 font-semibold text-teal-600 hover:underline dark:text-teal-400"
                  >
                    <FileCode className="h-3.5 w-3.5" />
                    Ver DDL Turso (SQLite)
                  </button>
                </div>
              </div>

              {/* Botão de Salvar Alterações do Turso */}
              {isAdmin && (
                <div className="pt-1">
                  <button
                    type="submit"
                    disabled={salvandoTursoConfig}
                    className="flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-teal-700 transition disabled:opacity-50"
                  >
                    <Save className="h-3.5 w-3.5" />
                    <span>{salvandoTursoConfig ? 'Salvando...' : 'Salvar Alterações da Turso'}</span>
                  </button>
                </div>
              )}
            </form>

            {/* Ações de Diagnóstico e Migração */}
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={testarConexaoTurso}
                  disabled={testandoTurso}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-700 hover:bg-teal-100 dark:bg-teal-950/60 dark:text-teal-300 dark:hover:bg-teal-900/60 transition disabled:opacity-50"
                >
                  <RefreshCw className={`h-3 w-3 ${testandoTurso ? 'animate-spin' : ''}`} />
                  {testandoTurso ? 'Testando...' : 'Testar Conexão'}
                </button>

                <button
                  type="button"
                  onClick={migrarSchemaTurso}
                  disabled={migrandoTurso}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 transition disabled:opacity-50"
                >
                  <Sparkles className="h-3 w-3 text-amber-400" />
                  {migrandoTurso ? 'Executando...' : 'Criar Tabelas no Turso'}
                </button>
              </div>

              {statusTurso.executado && (
                <div
                  className={`mt-2 rounded-lg p-2.5 text-xs flex items-start gap-2 ${
                    statusTurso.conectado
                      ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                      : 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                  }`}
                >
                  {statusTurso.conectado ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                  )}
                  <div>
                    <span className="font-semibold">
                      {statusTurso.conectado ? 'Turso Conectado' : 'Aviso do Banco'}:
                    </span>{' '}
                    {statusTurso.mensagem}
                  </div>
                </div>
              )}
            </div>

            <p className="mt-3 text-[11px] text-slate-500 dark:text-slate-400">
              Para autenticar requisições de escrita em produção, defina a chave <code>TURSO_AUTH_TOKEN</code> no arquivo <code>.env.local</code>.
            </p>
          </div>
        </div>

        {/* Botão de Salvar Alterações */}
        {isAdmin && (
          <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-5 dark:border-school-dark-border">
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-md transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-blue-600 dark:hover:bg-blue-700"
            >
              <Save className="h-4 w-4" />
              Salvar Configurações Institucionais
            </button>
          </div>
        )}
      </form>
      </>
      )}

      {/* Modal Visualizador do Schema SQL */}
      {modalSqlAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-school-dark-border dark:bg-school-dark-surface animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                  <Database className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Estrutura do Banco de Dados (Turso LibSQL / SQLite)
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={copiarSqlParaClipboard}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  {copiadoSql ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                      Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      Copiar SQL
                    </>
                  )}
                </button>
                <button
                  onClick={() => setModalSqlAberto(false)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="mt-4">
              <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">
                Execute estas instruções no Turso CLI (<code>turso db shell plugueachiles</code>) ou no painel da Turso para inicializar o esquema relacional:
              </p>
              <pre className="max-h-[350px] overflow-y-auto rounded-xl bg-slate-900 p-4 font-mono text-xs text-emerald-400">
                {sqlSchemaExemplo}
              </pre>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setModalSqlAberto(false)}
                className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600"
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
