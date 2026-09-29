// Tipos centrais do Antigravity School OS

export type UserRole = 'admin' | 'direcao' | 'professor';
export type AppUserRole = 'ADMIN' | 'DIRECAO' | 'PROFESSOR';

export type AllowedModule = 
  | 'PROFILE'      // Perfil & Dados Pessoais (Obrigatório / Sempre ativo)
  | 'FOTOGRAMA'    // Fotograma da Turma
  | 'CALENDARIO'   // Calendário & Eventos
  | 'RELATORIOS';  // Relatórios Pedagógicos Colaborativos

export interface SystemUser {
  id: string;
  name: string;
  email?: string;
  cpf: string; // 11 dígitos limpos
  password_hash: string;
  role: UserRole; // 'admin' ou 'professor'
  must_change_password: boolean;
  allowed_modules: AllowedModule[];
  is_active: boolean;
  created_at: string;
}

export interface Profile {
  id: string;
  user_id?: string;
  full_name: string;
  email: string;
  role: UserRole;
  avatar_url?: string;
  created_at: string;
}

export interface EscolaConfig {
  id: string;
  nome_escola: string;
  codigo_inep: string;
  cnpj: string;
  endereco: string;
  telefone: string;
  email: string;
  logo_url: string;
  logo_drive_id?: string;
  cor_primaria: string;
  cor_secundaria: string;
  ano_letivo_ativo: number;
  modelos_whatsapp?: {
    falta?: string;
    reuniao?: string;
    tarefa?: string;
    elogio?: string;
    livre?: string;
    inclusao_aee?: string;
    inclusao_laudo?: string;
    inclusao_reuniao?: string;
    inclusao_livre?: string;
  };
  updated_at: string;
}

export type Turno = 'manha' | 'tarde' | 'noite';

export interface HorarioAula {
  id: string;
  dia_semana: 'Segunda' | 'Terça' | 'Quarta' | 'Quinta' | 'Sexta';
  horario_inicio: string;
  horario_fim: string;
  disciplina: string;
  professor_nome: string;
  link_sala_virtual?: string;
}

export type GrupoTurma = 
  | '1º anos'
  | '2º anos'
  | '3º anos'
  | '4º anos'
  | '5º anos'
  | '6º anos'
  | '7º anos'
  | '8º anos'
  | '9º anos'
  | 'Pré-escolar'
  | 'Creche';

export const GRUPOS_TURMAS_LISTA: GrupoTurma[] = [
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
];

export interface Turma {
  id: string;
  nome: string;
  grupo?: GrupoTurma;
  turno: Turno;
  capacidade: number;
  ano_letivo: number;
  professor_regente_id?: string;
  professor_regente_nome?: string;
  professores_ids?: string[]; // IDs dos Professores Principais (relação many-to-many)
  equipe_apoio_ids?: string[]; // IDs da Equipe de Apoio / AEE (relação many-to-many)
  sala: string;
  ativa?: boolean; // Controle de status: true = Ativa (padrão), false = Desativada
  grade_horaria: HorarioAula[];
  created_at: string;
}

export type StatusMatricula = 'Ativo' | 'Transferido' | 'Trancado' | 'Evadido';
export type TipoMovimentacao = 'Entrada Interna' | 'Entrada Externa' | 'Saída Interna' | 'Saída Externa';
export type TipoHistoricoEscolar = 'Definitivo' | 'Temporário' | 'Não entregue';

export interface DocumentoEstudante {
  id: string;
  estudante_id: string;
  tipo_documento: 'rg' | 'comprovante_residencia' | 'laudo_medico' | 'certidao_nascimento' | 'outro';
  nome_arquivo: string;
  drive_file_id?: string;
  drive_view_link?: string;
  tamanho_bytes?: number;
  mime_type?: string;
  created_at: string;
}

export type PercentualCota = '0%' | '50%' | '100%';

export interface Estudante {
  id: string;
  turma_id: string;
  turma_nome?: string;
  nome_completo: string;
  data_nascimento: string;
  cpf: string;
  rg_numero?: string;
  rg_data_expedicao?: string;
  certidao_nascimento: string;
  naturalidade_cidade?: string; // Local de nascimento (com histórico de cidades digitadas)
  nacionalidade?: string; // Padrão: Brasileira
  numero_sus?: string; // Cartão SUS
  numero_bolsa_familia?: string; // Número do Bolsa Família (NIS)
  percentual_cota?: PercentualCota; // Cotista: 0%, 50% ou 100%
  
  // Filiação e Responsável
  filiacao_materna: string;
  filiacao_paterna: string;
  nome_responsavel: string;
  cpf_responsavel?: string;
  parentesco_responsavel: string;
  
  // Telefones (Principal + 3 adicionais)
  telefone_responsavel: string;
  telefone_2?: string;
  telefone_3?: string;
  telefone_4?: string;
  email?: string;
  
  // Endereço Residencial
  endereco: string;
  endereco_logradouro?: string;
  endereco_numero?: string;
  endereco_bairro?: string;
  
  // Inclusão & AEE
  possui_laudo: boolean;
  laudo_descricao?: string;
  aee: boolean; // Atendimento Educacional Especializado
  apoio_id?: string; // ID do profissional de apoio
  apoio_nome?: string; // Nome do profissional de apoio
  
  // Imagem e Matrícula
  foto_url?: string;
  status_matricula: StatusMatricula;
  tipo_movimentacao?: TipoMovimentacao;
  tipo_historico_escolar?: TipoHistoricoEscolar; // Definitivo, Temporário ou Não entregue
  
  // Observações (texto longo)
  observacoes?: string;
  
  documentos: DocumentoEstudante[];
  created_at: string;
}

export type TipoProfissional = 'docente' | 'funcionario';

export type FuncaoEscola = 
  | 'Porteiro'
  | 'Serviços Gerais'
  | 'Administrativo'
  | 'Readaptado'
  | 'Merendeira'
  | 'Ajudantes'
  | 'Outros';

export const FUNCOES_ESCOLA_LISTA: FuncaoEscola[] = [
  'Porteiro',
  'Serviços Gerais',
  'Administrativo',
  'Readaptado',
  'Merendeira',
  'Ajudantes',
  'Outros',
];

export interface Professor {
  id: string;
  profile_id?: string;
  nome_completo: string;
  matricula: string;
  tipo_profissional?: TipoProfissional; // 'docente' | 'funcionario' (padrão: 'docente')
  funcao_escola?: FuncaoEscola | string; // Obrigatório para funcionários: Porteiro, Serviços Gerais, Administrativo, etc.
  formacao?: string;
  disciplinas?: string[];
  telefone: string;
  email: string;
  ativo: boolean;
  eh_apoio?: boolean; // Opção de Profissional de Apoio Escolar / AEE (estilo toggle)
  turmas_atribuidas_ids?: string[];

  // Identificação Civil e Funcional
  cpf?: string;
  rg?: string;
  rg_data_expedicao?: string;
  data_nascimento?: string;
  genero?: string; // 'MASCULINO' | 'FEMININO' | 'OUTRO' | 'NÃO INFORMADO'
  vinculo_empregaticio?: string; // 'EFETIVO' | 'CONTRATADO' | 'CLT' | 'ESTAGIÁRIO' | 'TERCEIRIZADO' | 'OUTRO'

  // Formação acadêmica (Docentes)
  graduacao_instituicao?: string;
  titulacao?: TitulacaoDocente | string;
  pos_graduacao_instituicao?: string;
  graduacao_inicio?: string;
  graduacao_fim?: string;
  pos_graduacao_inicio?: string;
  pos_graduacao_fim?: string;

  // Filiação & Endereço Completo
  filiacao_1?: string; // Filiação 1 (ex: Mãe)
  filiacao_2?: string; // Filiação 2 (ex: Pai)
  nome_mae?: string;
  nome_pai?: string;
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  endereco_completo?: string;

  // Contatos & Emergência
  celular_whatsapp?: string;
  telefone_emergencia?: string;
  telefone_emergencia2?: string;
  contato_emergencia_nome?: string;
  contato_emergencia_parentesco?: string;
  observacoes?: string;

  created_at: string;
}

export type Funcionario = Professor;
export type Colaborador = Professor;


export interface FaltaProfessor {
  id: string;
  professor_id: string;
  professor_nome: string;
  data_falta: string;
  aulas_faltadas: number;
  justificativa: string;
  atestado_drive_id?: string;
  atestado_drive_link?: string;
  homologado: boolean;
  created_at: string;
}

export type CategoriaEvento = 'prova' | 'reuniao' | 'feriado' | 'cultural';

export interface EventoEscolar {
  id: string;
  titulo: string;
  descricao: string;
  data_inicio: string;
  data_fim: string;
  categoria: CategoriaEvento;
  cor: string;
  publico_alvo?: string;
  created_at: string;
}

// -------------------------------------------------------------
// SISTEMA DE AUDITORIA IMUTÁVEL (ACTIVITY LOGS)
// -------------------------------------------------------------
export type ActivityLogActionType = 'CLASS_STATUS_CHANGE' | 'STUDENT_MIGRATION';

export interface EstudanteAfetadoLog {
  id: string;
  nome: string;
  status_anterior?: string;
  status_novo?: string;
}

export interface ActivityLogDetails {
  resumo: string;
  status_anterior?: boolean;
  status_novo?: boolean;
  turma_origem_id?: string;
  turma_origem_nome?: string;
  turma_destino_id?: string;
  turma_destino_nome?: string;
  total_afetados: number;
  estudantes_afetados: EstudanteAfetadoLog[];
}

export interface ActivityLog {
  id: string;
  action_type: ActivityLogActionType;
  user_id: string;
  user_name: string;
  target_class_id?: string;
  target_class_name?: string;
  details: ActivityLogDetails;
  created_at: string;
}

// -------------------------------------------------------------
// 1. MÓDULO: RELATÓRIOS PEDAGÓGICOS COLABORATIVOS COM IA
// -------------------------------------------------------------
export type StatusSolicitacaoRelatorio = 'pendente' | 'concluido';
export type StatusRelatorioProfessor = 'pendente' | 'enviado';

export interface SolicitacaoRelatorio {
  id: string;
  aluno_id: string;
  status: StatusSolicitacaoRelatorio;
  data_solicitacao: string;
  admin_solicitante_id?: string;
  created_at?: string;
}

export interface RelatorioProfessor {
  id: string;
  solicitacao_id: string;
  professor_id: string;
  rascunho_original: string;
  texto_ia?: string;
  texto_final: string;
  status: StatusRelatorioProfessor;
  data_envio?: string;
  created_at?: string;
}

export interface RelatorioConsolidado {
  id: string;
  solicitacao_id: string;
  conteudo_final: string;
  data_geracao: string;
  arquivo_docx_url?: string;
  created_at?: string;
}

export interface NotificacaoAdmin {
  id: string;
  relatorio_professor_id?: string;
  solicitacao_id?: string;
  professor_id?: string;
  professor_nome?: string;
  aluno_nome?: string;
  lido: boolean;
  data_criacao: string;
}

// -------------------------------------------------------------
// 6. OBSERVAÇÕES CONTÍNUAS DO ESTUDANTE (FICHA DO ALUNO)
// -------------------------------------------------------------
export type TipoObservacaoAluno = 'comportamental' | 'pedagogico' | 'saude' | 'geral';

export interface ObservacaoAluno {
  id: string;
  estudante_id: string;
  aluno_id: string; // Compatibilidade legada
  usuario_id: string;
  autor_id: string; // Compatibilidade legada
  autor_nome: string;
  autor_cargo: string;
  categoria: TipoObservacaoAluno;
  tipo: TipoObservacaoAluno; // Compatibilidade legada
  texto_completo: string;
  texto: string; // Compatibilidade legada
  created_at: string;
  data_registro: string; // Compatibilidade legada
}

export interface ObservacaoAuditoria {
  id: string;
  observacao_id: string;
  estudante_id: string;
  evento: 'CREATE' | 'UPDATE' | 'DELETE';
  texto_anterior?: string;
  texto_novo?: string;
  categoria?: string;
  registro_anterior?: any;
  usuario_id: string;
  usuario_nome: string;
  created_at: string;
}

// -------------------------------------------------------------
// 7. REPOSITÓRIO DE DOCUMENTOS NO GOOGLE DRIVE (FICHA DO ESTUDANTE)
// -------------------------------------------------------------
export type TipoDocumentoDrive = 'Historico' | 'Ficha Cadastral' | 'Documentos Pessoais' | 'Atestado' | 'Outros';

export interface DocumentoEstudanteDrive {
  id: string;
  aluno_id: string;
  drive_file_id?: string;
  nome_arquivo: string;
  url_visualizacao?: string;
  tipo_documento: TipoDocumentoDrive;
  uploader_id?: string;
  data_upload: string;
}

// -------------------------------------------------------------
// 8. GESTÃO DE ATESTADOS DOS PROFESSORES (GOOGLE DRIVE)
// -------------------------------------------------------------
export interface AtestadoProfessor {
  id: string;
  professor_id: string;
  drive_file_id?: string;
  nome_arquivo?: string;
  data_inicio: string;
  data_fim: string;
  dias_afastamento: number;
  motivo_cid?: string;
  data_upload: string;
  permite_exclusao: boolean;
}

// -------------------------------------------------------------
// 8.1 LÓGICA DE DÉBITO & REPOSIÇÃO DE AULAS (REGRA DOS 30 DIAS)
// -------------------------------------------------------------
export type StatusReposicaoAula = 'Pendente' | 'Reposta' | 'Vencida';

export interface ReposicaoAula {
  id: string;
  professor_id: string;
  data_falta: string;
  qtd_aulas_faltantes: number;
  data_limite_reposicao: string; // calculada: data_falta + 30 dias
  data_execucao_reposicao?: string;
  horario_reposicao?: string;
  conteudo_lecionado?: string;
  turma_id?: string;
  status: StatusReposicaoAula;
  created_at?: string;
}


