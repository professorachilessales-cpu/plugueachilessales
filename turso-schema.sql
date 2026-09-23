-- ==========================================================
-- PLUGUE - PLATAFORMA UNIFICADA DE GESTÃO EDUCACIONAL
-- ESQUEMA COMPATÍVEL COM BANCO DE DADOS TURSO (SQLite / LibSQL)
-- Database: libsql://plugueachiles-achilessales.aws-us-west-2.turso.io
-- ==========================================================

-- 1. TABELA DE CONFIGURAÇÕES DA ESCOLA (WHITE-LABEL)
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

-- 2. TABELA DE USUÁRIOS E CREDENCIAIS (RBAC & PRIMEIRO ACESSO)
-- Postgres equivalente:
-- CREATE TYPE user_role AS ENUM ('ADMIN', 'PROFESSOR');
-- CREATE TABLE users (
--     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--     name VARCHAR(255) NOT NULL,
--     email VARCHAR(255) UNIQUE,
--     cpf VARCHAR(11) UNIQUE NOT NULL,
--     password_hash VARCHAR(255) NOT NULL,
--     role user_role NOT NULL DEFAULT 'PROFESSOR',
--     must_change_password BOOLEAN DEFAULT TRUE,
--     allowed_modules JSONB DEFAULT '["PROFILE"]'::jsonb,
--     is_active BOOLEAN DEFAULT TRUE,
--     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
-- );

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    cpf TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'professor' CHECK (role IN ('admin', 'professor')),
    must_change_password INTEGER DEFAULT 1,
    allowed_modules TEXT DEFAULT '["PROFILE"]', -- JSON Array string
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 2.1 TABELA DE PERFIS DE USUÁRIO (LEGADO / COMPATIBILIDADE)
CREATE TABLE IF NOT EXISTS profiles (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'professor')),
    avatar_url TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 3. TABELA DE PROFESSORES (FICHA FUNCIONAL)
CREATE TABLE IF NOT EXISTS professores (
    id TEXT PRIMARY KEY,
    profile_id TEXT REFERENCES profiles(id) ON DELETE SET NULL,
    nome_completo TEXT NOT NULL,
    matricula TEXT NOT NULL UNIQUE,
    formacao TEXT,
    disciplinas TEXT DEFAULT '[]', -- JSON Array string
    telefone TEXT,
    email TEXT NOT NULL,
    eh_apoio INTEGER DEFAULT 0, -- 0 = falso, 1 = verdadeiro
    ativo INTEGER DEFAULT 1,
    turmas_atribuidas_ids TEXT DEFAULT '[]', -- JSON Array string
    cpf TEXT,
    rg TEXT,
    rg_data_expedicao TEXT,
    graduacao_instituicao TEXT,
    titulacao TEXT,
    pos_graduacao_instituicao TEXT,
    graduacao_inicio TEXT,
    graduacao_fim TEXT,
    pos_graduacao_inicio TEXT,
    pos_graduacao_fim TEXT,
    endereco_completo TEXT,
    nome_mae TEXT,
    nome_pai TEXT,
    telefone_emergencia TEXT,
    telefone_emergencia2 TEXT,
    contato_emergencia_nome TEXT,
    observacoes TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 4. TABELA DE TURMAS E GRADE HORÁRIA
CREATE TABLE IF NOT EXISTS turmas (
    id TEXT PRIMARY KEY,
    nome TEXT NOT NULL,
    grupo TEXT DEFAULT '1º anos',
    turno TEXT NOT NULL CHECK (turno IN ('manha', 'tarde', 'noite')),
    capacidade INTEGER NOT NULL DEFAULT 35,
    ano_letivo INTEGER NOT NULL DEFAULT 2026,
    professor_regente_id TEXT REFERENCES professores(id) ON DELETE SET NULL,
    professor_regente_nome TEXT,
    professores_ids TEXT DEFAULT '[]', -- JSON Array string
    equipe_apoio_ids TEXT DEFAULT '[]', -- JSON Array string
    sala TEXT,
    ativa INTEGER DEFAULT 1, -- 1 = Ativa, 0 = Inativa (Trancada)
    grade_horaria TEXT DEFAULT '[]', -- JSON Array string
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 5. TABELA DE ESTUDANTES
CREATE TABLE IF NOT EXISTS estudantes (
    id TEXT PRIMARY KEY,
    turma_id TEXT REFERENCES turmas(id) ON DELETE SET NULL,
    turma_nome TEXT,
    nome_completo TEXT NOT NULL,
    data_nascimento TEXT NOT NULL,
    cpf TEXT,
    rg_numero TEXT,
    rg_data_expedicao TEXT,
    certidao_nascimento TEXT,
    naturalidade_cidade TEXT,
    nacionalidade TEXT DEFAULT 'Brasileira',
    numero_sus TEXT,
    numero_bolsa_familia TEXT,
    percentual_cota TEXT DEFAULT '0%',
    filiacao_materna TEXT,
    filiacao_paterna TEXT,
    telefone_responsavel TEXT,
    telefone_2 TEXT,
    telefone_3 TEXT,
    telefone_4 TEXT,
    email TEXT,
    nome_responsavel TEXT,
    cpf_responsavel TEXT,
    parentesco_responsavel TEXT DEFAULT 'Mãe',
    endereco TEXT,
    endereco_logradouro TEXT,
    endereco_numero TEXT,
    endereco_bairro TEXT,
    possui_laudo INTEGER DEFAULT 0,
    laudo_descricao TEXT,
    aee INTEGER DEFAULT 0,
    apoio_id TEXT,
    apoio_nome TEXT,
    foto_url TEXT,
    status_matricula TEXT DEFAULT 'Ativo' CHECK (status_matricula IN ('Ativo', 'Transferido', 'Trancado', 'Evadido')),
    tipo_movimentacao TEXT DEFAULT 'Entrada Externa' CHECK (tipo_movimentacao IN ('Entrada Interna', 'Entrada Externa', 'Saída Interna', 'Saída Externa')),
    tipo_historico_escolar TEXT DEFAULT 'Definitivo',
    observacoes TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 6. TABELA DE DOCUMENTOS DOS ESTUDANTES (GOOGLE DRIVE INTEGRATION)
CREATE TABLE IF NOT EXISTS documentos_estudantes (
    id TEXT PRIMARY KEY,
    estudante_id TEXT NOT NULL REFERENCES estudantes(id) ON DELETE CASCADE,
    tipo_documento TEXT NOT NULL CHECK (tipo_documento IN ('rg', 'comprovante_residencia', 'laudo_medico', 'certidao_nascimento', 'outro')),
    nome_arquivo TEXT NOT NULL,
    drive_file_id TEXT,
    drive_view_link TEXT,
    tamanho_bytes INTEGER,
    mime_type TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 7. TABELA DE FALTAS DE PROFESSORES
CREATE TABLE IF NOT EXISTS faltas_professores (
    id TEXT PRIMARY KEY,
    professor_id TEXT NOT NULL REFERENCES professores(id) ON DELETE CASCADE,
    professor_nome TEXT,
    data_falta TEXT NOT NULL,
    aulas_faltadas INTEGER NOT NULL DEFAULT 1,
    justificativa TEXT,
    atestado_drive_id TEXT,
    atestado_drive_link TEXT,
    homologado INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 8. TABELA DE CALENDÁRIO E EVENTOS ESCOLARES
CREATE TABLE IF NOT EXISTS eventos (
    id TEXT PRIMARY KEY,
    titulo TEXT NOT NULL,
    descricao TEXT,
    data_inicio TEXT NOT NULL,
    data_fim TEXT NOT NULL,
    categoria TEXT NOT NULL CHECK (categoria IN ('prova', 'reuniao', 'feriado', 'cultural')),
    cor TEXT DEFAULT '#2563EB',
    publico_alvo TEXT DEFAULT 'Todos',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 9. TABELA DE AUDITORIA IMUTÁVEL (APPEND-ONLY ACTIVITY LOGS)
CREATE TABLE IF NOT EXISTS activity_logs (
    id TEXT PRIMARY KEY,
    action_type TEXT NOT NULL CHECK (action_type IN ('CLASS_STATUS_CHANGE', 'STUDENT_MIGRATION')),
    user_id TEXT NOT NULL,
    user_name TEXT NOT NULL,
    target_class_id TEXT,
    target_class_name TEXT,
    details TEXT NOT NULL, -- JSON com antes/depois, resumo e lista detalhada de estudantes afetados
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================================
-- RESTRIÇÃO DE IMUTABILIDADE: IMPEDIR UPDATE E DELETE NA AUDITORIA
-- ==========================================================
CREATE TRIGGER IF NOT EXISTS trg_activity_logs_prevent_update
BEFORE UPDATE ON activity_logs
BEGIN
    SELECT RAISE(ABORT, 'Operação proibida: a tabela de auditoria (activity_logs) é imutável e somente permite inserções (Append-Only).');
END;

CREATE TRIGGER IF NOT EXISTS trg_activity_logs_prevent_delete
BEFORE DELETE ON activity_logs
BEGIN
    SELECT RAISE(ABORT, 'Operação proibida: a tabela de auditoria (activity_logs) é imutável e não permite exclusão de registros.');
END;

-- ==========================================================
-- ÍNDICES PARA PERFORMANCE NO TURSO / SQLITE
-- ==========================================================
CREATE INDEX IF NOT EXISTS idx_estudantes_turma ON estudantes(turma_id);
CREATE INDEX IF NOT EXISTS idx_estudantes_status ON estudantes(status_matricula);
CREATE INDEX IF NOT EXISTS idx_documentos_estudante ON documentos_estudantes(estudante_id);
CREATE INDEX IF NOT EXISTS idx_faltas_prof_data ON faltas_professores(data_falta);
CREATE INDEX IF NOT EXISTS idx_eventos_inicio ON eventos(data_inicio);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_class ON activity_logs(target_class_id);

-- ==========================================================
-- DADOS INICIAIS DE DEMONSTRAÇÃO (SEED)
-- ==========================================================
INSERT OR IGNORE INTO config_escola (id, nome_escola, codigo_inep, cnpj, endereco, telefone, email)
VALUES ('cfg-001', 'Colégio Integrado PLUGUE', '35019827', '12.345.678/0001-90', 'Av. Central do Saber, 1500 - Bairro Universitário', '(11) 4002-8922', 'secretaria@plugue.edu.br');

