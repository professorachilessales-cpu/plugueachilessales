// Schema DDL canônico do Turso Database (LibSQL / SQLite)
// Embutido em TypeScript para garantir execução 100% autônoma e serverless na Vercel (Zero Local Storage).

export const TURSO_CANONICAL_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS config_escola (
    id TEXT PRIMARY KEY,
    nome_escola TEXT NOT NULL DEFAULT 'Colégio Integrado PLUGUE',
    codigo_inep TEXT DEFAULT '35019827',
    cnpj TEXT DEFAULT '12.345.678/0001-90',
    endereco TEXT DEFAULT 'Av. Central do Saber, 1500 - Bairro Universitário',
    telefone TEXT DEFAULT '(11) 4002-8922',
    email TEXT DEFAULT 'contato@plugue.edu.br',
    logo_url TEXT DEFAULT '',
    logo_drive_id TEXT DEFAULT '',
    cor_primaria TEXT DEFAULT '#1E40AF',
    cor_secundaria TEXT DEFAULT '#EAB308',
    ano_letivo_ativo INTEGER DEFAULT 2026,
    modelos_whatsapp TEXT DEFAULT '{}',
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    cpf TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'professor',
    must_change_password INTEGER DEFAULT 1,
    allowed_modules TEXT DEFAULT '["PROFILE"]',
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS profiles (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL DEFAULT 'professor',
    avatar_url TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS professores (
    id TEXT PRIMARY KEY,
    profile_id TEXT,
    nome_completo TEXT NOT NULL,
    matricula TEXT,
    tipo_profissional TEXT NOT NULL DEFAULT 'docente',
    funcao_escola TEXT,
    funcao_tipo TEXT DEFAULT 'PROFESSOR',
    formacao TEXT,
    disciplinas TEXT DEFAULT '[]',
    telefone TEXT,
    email TEXT NOT NULL,
    eh_apoio INTEGER DEFAULT 0,
    eh_administrativo INTEGER DEFAULT 0,
    is_admin INTEGER DEFAULT 0,
    ativo INTEGER DEFAULT 1,
    turmas_atribuidas_ids TEXT DEFAULT '[]',
    cpf TEXT,
    rg TEXT,
    rg_data_expedicao TEXT,
    data_nascimento TEXT,
    genero TEXT,
    vinculo_empregaticio TEXT,
    graduacao_instituicao TEXT,
    titulacao TEXT,
    pos_graduacao_instituicao TEXT,
    graduacao_inicio TEXT,
    graduacao_fim TEXT,
    pos_graduacao_inicio TEXT,
    pos_graduacao_fim TEXT,
    filiacao_1 TEXT,
    filiacao_2 TEXT,
    nome_mae TEXT,
    nome_pai TEXT,
    cep TEXT,
    logradouro TEXT,
    numero TEXT,
    complemento TEXT,
    bairro TEXT,
    cidade TEXT,
    uf TEXT,
    observacoes TEXT,
    senha_hash TEXT,
    precisa_trocar_senha INTEGER DEFAULT 1,
    ultimo_login TEXT,
    deleted_at TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS turmas (
    id TEXT PRIMARY KEY,
    nome TEXT NOT NULL,
    grupo TEXT NOT NULL,
    turno TEXT NOT NULL,
    sala TEXT,
    capacidade INTEGER NOT NULL DEFAULT 35,
    ano_letivo INTEGER NOT NULL DEFAULT 2026,
    ativa INTEGER NOT NULL DEFAULT 1,
    professor_regente_id TEXT,
    professor_regente_nome TEXT,
    professores_ids TEXT DEFAULT '[]',
    equipe_apoio_ids TEXT DEFAULT '[]',
    grade_horaria TEXT DEFAULT '[]',
    faixa_etaria_permitida TEXT DEFAULT 'LIVRE',
    deleted_at TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS turma_professores (
    turma_id TEXT NOT NULL,
    professor_id TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (turma_id, professor_id)
);

CREATE TABLE IF NOT EXISTS estudantes (
    id TEXT PRIMARY KEY,
    nome_completo TEXT NOT NULL,
    turma_id TEXT,
    turma_nome TEXT,
    data_nascimento TEXT NOT NULL,
    genero TEXT NOT NULL,
    cor_raca TEXT,
    nacionalidade TEXT DEFAULT 'Brasileira',
    naturalidade TEXT,
    cpf TEXT,
    rg_numero TEXT,
    rg_orgao_emissor TEXT,
    rg_uf TEXT,
    rg_data_expedicao TEXT,
    certidao_nascimento TEXT,
    nis TEXT,
    numero_bolsa_familia TEXT,
    cartao_sus TEXT,
    foto_url TEXT,
    foto_drive_id TEXT,
    nome_responsavel TEXT,
    parentesco_responsavel TEXT,
    cpf_responsavel TEXT,
    rg_responsavel TEXT,
    telefone_responsavel TEXT,
    email_responsavel TEXT,
    cep TEXT,
    endereco TEXT,
    numero TEXT,
    complemento TEXT,
    bairro TEXT,
    cidade TEXT,
    uf TEXT,
    possui_laudo INTEGER DEFAULT 0,
    aee INTEGER DEFAULT 0,
    tipo_deficiencia TEXT,
    cid TEXT,
    medicacao_controlada TEXT,
    alergias TEXT,
    restricoes_alimentares TEXT,
    observacoes_medicas TEXT,
    observacoes_pedagogicas TEXT,
    observacoes_comportamentais TEXT,
    status TEXT DEFAULT 'Ativo',
    deleted_at TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS documentos_estudantes (
    id TEXT PRIMARY KEY,
    estudante_id TEXT NOT NULL,
    tipo_documento TEXT NOT NULL,
    nome_arquivo TEXT NOT NULL,
    tamanho_bytes INTEGER,
    drive_file_id TEXT,
    drive_view_link TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS faltas_professores (
    id TEXT PRIMARY KEY,
    professor_id TEXT NOT NULL,
    professor_nome TEXT,
    tipo_registro TEXT DEFAULT 'DATA_UNICA',
    data_inicio TEXT NOT NULL,
    data_fim TEXT,
    data_falta TEXT,
    aulas_calculadas_sistema INTEGER DEFAULT 0,
    aulas_totais_devidas INTEGER DEFAULT 1,
    aulas_faltadas INTEGER DEFAULT 1,
    aulas_pagas INTEGER DEFAULT 0,
    aulas_abonadas INTEGER DEFAULT 0,
    status_reposicao TEXT DEFAULT 'A pagar',
    motivo TEXT,
    justificativa TEXT,
    atestado_drive_url TEXT,
    atestado_drive_link TEXT,
    drive_file_id TEXT,
    atestado_drive_id TEXT,
    observacao TEXT,
    usuario_registro_id TEXT,
    deleted_at TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS historico_reposicoes_pagamentos (
    id TEXT PRIMARY KEY,
    ausencia_id TEXT NOT NULL,
    aulas_abatidas INTEGER NOT NULL DEFAULT 1,
    tipo_baixa TEXT NOT NULL,
    data_reposicao TEXT,
    observacao TEXT,
    usuario_id TEXT,
    usuario_nome TEXT,
    data_registro TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS atestados_professor (
    id TEXT PRIMARY KEY,
    professor_id TEXT NOT NULL,
    drive_file_id TEXT,
    atestado_drive_url TEXT,
    nome_arquivo TEXT,
    data_inicio TEXT NOT NULL,
    data_fim TEXT NOT NULL,
    dias_afastamento INTEGER NOT NULL DEFAULT 1,
    quantidade_dias INTEGER DEFAULT 1,
    motivo_cid TEXT,
    permite_exclusao INTEGER NOT NULL DEFAULT 1,
    data_upload TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS calendario_categorias (
    id TEXT PRIMARY KEY,
    nome TEXT NOT NULL,
    cor_hex TEXT NOT NULL DEFAULT '#2563EB',
    visivel_docentes INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS calendario_eventos (
    id TEXT PRIMARY KEY,
    titulo TEXT NOT NULL,
    descricao TEXT DEFAULT '',
    data_inicio TEXT NOT NULL,
    data_fim TEXT NOT NULL,
    categoria_id TEXT,
    categoria TEXT,
    cor_hex TEXT DEFAULT '#2563EB',
    cor TEXT DEFAULT '#2563EB',
    publico_alvo TEXT DEFAULT 'Todos',
    recorrencia_tipo TEXT DEFAULT 'NENHUMA',
    recorrencia_dia INTEGER,
    recorrencia_mes INTEGER,
    recorrencia_ativa INTEGER DEFAULT 0,
    recorrencia_data_limite TEXT,
    criado_por_usuario_id TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS eventos (
    id TEXT PRIMARY KEY,
    titulo TEXT NOT NULL,
    descricao TEXT DEFAULT '',
    data_inicio TEXT NOT NULL,
    data_fim TEXT NOT NULL,
    categoria_id TEXT,
    categoria TEXT,
    cor_hex TEXT DEFAULT '#2563EB',
    cor TEXT DEFAULT '#2563EB',
    publico_alvo TEXT DEFAULT 'Todos',
    recorrencia_tipo TEXT DEFAULT 'NENHUMA',
    recorrencia_dia INTEGER,
    recorrencia_mes INTEGER,
    recorrencia_ativa INTEGER DEFAULT 0,
    recorrencia_data_limite TEXT,
    criado_por_usuario_id TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS observacoes_pedagogicas (
    id TEXT PRIMARY KEY,
    estudante_id TEXT NOT NULL,
    usuario_id TEXT NOT NULL,
    autor_nome TEXT DEFAULT 'Equipe Escolar',
    categoria TEXT DEFAULT 'pedagogico',
    texto TEXT NOT NULL,
    ativo INTEGER DEFAULT 1,
    is_deleted INTEGER DEFAULT 0,
    deleted_at TEXT,
    excluido_por_usuario_id TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS observacoes_aluno (
    id TEXT PRIMARY KEY,
    aluno_id TEXT NOT NULL,
    estudante_id TEXT,
    autor_id TEXT,
    usuario_id TEXT,
    autor_nome TEXT DEFAULT 'Equipe Escolar',
    autor_cargo TEXT DEFAULT 'Equipe Escolar',
    tipo TEXT DEFAULT 'pedagogico',
    categoria TEXT DEFAULT 'pedagogico',
    texto TEXT NOT NULL,
    texto_completo TEXT NOT NULL,
    data_registro TEXT DEFAULT CURRENT_TIMESTAMP,
    ativo INTEGER DEFAULT 1,
    is_deleted INTEGER DEFAULT 0,
    deleted_at TEXT,
    excluido_por_usuario_id TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS observacoes_auditoria (
    id TEXT PRIMARY KEY,
    observacao_id TEXT NOT NULL,
    estudante_id TEXT NOT NULL,
    evento TEXT NOT NULL,
    acao TEXT,
    texto_anterior TEXT,
    texto_novo TEXT,
    categoria TEXT,
    conteudo_observacao TEXT,
    usuario_id TEXT NOT NULL,
    usuario_nome TEXT NOT NULL,
    excluido_por_usuario_id TEXT,
    excluido_por_usuario_nome TEXT,
    data_exclusao TEXT,
    motivo TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS activity_logs (
    id TEXT PRIMARY KEY,
    action_type TEXT NOT NULL,
    user_id TEXT NOT NULL,
    user_name TEXT NOT NULL,
    target_class_id TEXT,
    target_class_name TEXT,
    details TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS google_drive_config (
    id TEXT PRIMARY KEY DEFAULT 'default',
    connected_email TEXT,
    access_token TEXT,
    refresh_token TEXT,
    expiry_date INTEGER,
    root_folder_id TEXT,
    root_folder_name TEXT DEFAULT 'FICHA DOS ESTUDANTES',
    is_connected INTEGER DEFAULT 0,
    client_id TEXT,
    client_secret TEXT,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS app_cache (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_app_cache_expires_at ON app_cache (expires_at);
CREATE INDEX IF NOT EXISTS idx_estudantes_turma_id ON estudantes (turma_id);
CREATE INDEX IF NOT EXISTS idx_documentos_estudante_id ON documentos_estudantes (estudante_id);
CREATE INDEX IF NOT EXISTS idx_faltas_professores_prof_id ON faltas_professores (professor_id);
CREATE INDEX IF NOT EXISTS idx_calendario_eventos_datas ON calendario_eventos (data_inicio, data_fim);
CREATE INDEX IF NOT EXISTS idx_observacoes_pedagogicas_estudante ON observacoes_pedagogicas (estudante_id);
`;
