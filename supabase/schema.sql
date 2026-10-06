-- ==========================================================
-- ANTIGRAVITY SCHOOL OS - ESQUEMA DE BANCO DE DADOS SUPABASE (PostgreSQL)
-- ==========================================================

-- Habilitar extensão para geração de UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABELA DE CONFIGURAÇÕES DA ESCOLA (WHITE-LABEL)
CREATE TABLE IF NOT EXISTS public.config_escola (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome_escola VARCHAR(255) NOT NULL DEFAULT 'Colégio Integrado Antigravity School OS',
    codigo_inep VARCHAR(20) DEFAULT '35019827',
    cnpj VARCHAR(20) DEFAULT '12.345.678/0001-90',
    endereco TEXT DEFAULT 'Av. Central do Saber, 1500 - Bairro Universitário',
    telefone VARCHAR(30) DEFAULT '(11) 4002-8922',
    email VARCHAR(100) DEFAULT 'contato@antigravityschool.edu.br',
    logo_url TEXT DEFAULT '',
    logo_drive_id VARCHAR(255) DEFAULT '',
    cor_primaria VARCHAR(10) DEFAULT '#1E40AF',
    cor_secundaria VARCHAR(10) DEFAULT '#EAB308',
    ano_letivo_ativo INT DEFAULT 2026,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. TABELA DE PERFIS DE USUÁRIO (RBAC)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID, -- Opcional: vínculo com auth.users do Supabase
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    role VARCHAR(30) NOT NULL CHECK (role IN ('admin', 'professor')),
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. TABELA DE PROFESSORES (FICHA FUNCIONAL)
CREATE TABLE IF NOT EXISTS public.professores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    nome_completo VARCHAR(255) NOT NULL,
    matricula VARCHAR(50) NOT NULL UNIQUE,
    formacao VARCHAR(255),
    disciplinas TEXT[] DEFAULT '{}',
    telefone VARCHAR(30),
    email VARCHAR(255) NOT NULL,
    nome VARCHAR(255),
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. TABELA DE TURMAS E GRADE HORÁRIA
CREATE TABLE IF NOT EXISTS public.turmas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome VARCHAR(100) NOT NULL,
    turno VARCHAR(20) NOT NULL CHECK (turno IN ('manha', 'manhã', 'tarde', 'noite')),
    capacidade INT NOT NULL DEFAULT 35,
    ano_letivo INT NOT NULL DEFAULT 2026,
    professor_regente_id UUID REFERENCES public.professores(id) ON DELETE SET NULL,
    sala VARCHAR(50),
    grade_horaria JSONB DEFAULT '[]'::jsonb,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4.1 TABELA DE ASSOCIAÇÃO RELACIONAL ESTRITA (TURMA-PROFESSORES)
CREATE TABLE IF NOT EXISTS public.turma_professores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    turma_id UUID NOT NULL REFERENCES public.turmas(id) ON DELETE CASCADE,
    professor_id UUID NOT NULL REFERENCES public.professores(id) ON DELETE CASCADE,
    disciplina VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(turma_id, professor_id, disciplina)
);

CREATE INDEX IF NOT EXISTS idx_turma_prof_turma ON public.turma_professores(turma_id);
CREATE INDEX IF NOT EXISTS idx_turma_prof_prof ON public.turma_professores(professor_id);

-- 5. TABELA DE ESTUDANTES
CREATE TABLE IF NOT EXISTS public.estudantes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    turma_id UUID REFERENCES public.turmas(id) ON DELETE SET NULL,
    nome_completo VARCHAR(255) NOT NULL,
    data_nascimento DATE NOT NULL,
    cpf VARCHAR(20),
    certidao_nascimento VARCHAR(100),
    filiacao_materna VARCHAR(255),
    filiacao_paterna VARCHAR(255),
    telefone_responsavel VARCHAR(30),
    nome_responsavel VARCHAR(255),
    parentesco_responsavel VARCHAR(50) DEFAULT 'Mãe',
    endereco TEXT,
    possui_laudo BOOLEAN DEFAULT FALSE,
    laudo_descricao TEXT,
    aee BOOLEAN DEFAULT FALSE, -- Atendimento Educacional Especializado
    foto_url TEXT,
    status_matricula VARCHAR(30) DEFAULT 'Ativo' CHECK (status_matricula IN ('Ativo', 'Transferido', 'Trancado', 'Evadido')),
    tipo_movimentacao VARCHAR(30) DEFAULT 'Entrada Externa' CHECK (tipo_movimentacao IN ('Entrada Interna', 'Entrada Externa', 'Saída Interna', 'Saída Externa')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. TABELA DE DOCUMENTOS DOS ESTUDANTES (GOOGLE DRIVE INTEGRATION)
CREATE TABLE IF NOT EXISTS public.documentos_estudantes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    estudante_id UUID NOT NULL REFERENCES public.estudantes(id) ON DELETE CASCADE,
    tipo_documento VARCHAR(50) NOT NULL CHECK (tipo_documento IN ('rg', 'comprovante_residencia', 'laudo_medico', 'certidao_nascimento', 'outro')),
    nome_arquivo VARCHAR(255) NOT NULL,
    drive_file_id VARCHAR(255),
    drive_view_link TEXT,
    tamanho_bytes BIGINT,
    mime_type VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. TABELA DE FALTAS DE PROFESSORES / AUSÊNCIAS DOCENTES (COM ATESTADOS NO DRIVE)
CREATE TABLE IF NOT EXISTS public.faltas_professores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    professor_id UUID NOT NULL REFERENCES public.professores(id) ON DELETE CASCADE,
    tipo_registro VARCHAR(20) NOT NULL DEFAULT 'DATA_UNICA' CHECK (tipo_registro IN ('DATA_UNICA', 'PERIODO')),
    data_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
    data_fim DATE NOT NULL DEFAULT CURRENT_DATE,
    data_falta DATE NOT NULL DEFAULT CURRENT_DATE,
    aulas_calculadas_sistema INT DEFAULT 0,
    aulas_totais_devidas INT NOT NULL DEFAULT 1,
    aulas_faltadas INT NOT NULL DEFAULT 1,
    motivo TEXT,
    justificativa TEXT,
    atestado_drive_url TEXT,
    atestado_drive_link TEXT,
    drive_file_id VARCHAR(255),
    atestado_drive_id VARCHAR(255),
    observacao TEXT,
    usuario_registro_id VARCHAR(255),
    homologado BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela correspondente ausencias_docentes
CREATE TABLE IF NOT EXISTS public.ausencias_docentes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    professor_id UUID NOT NULL REFERENCES public.professores(id) ON DELETE CASCADE,
    tipo_registro VARCHAR(20) NOT NULL CHECK (tipo_registro IN ('DATA_UNICA', 'PERIODO')),
    data_inicio DATE NOT NULL,
    data_fim DATE NOT NULL,
    aulas_calculadas_sistema INT DEFAULT 0,
    aulas_totais_devidas INT NOT NULL,
    motivo TEXT,
    atestado_drive_url TEXT,
    drive_file_id VARCHAR(255),
    observacao TEXT,
    usuario_registro_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- 8. TABELA DE CALENDÁRIO E EVENTOS ESCOLARES
CREATE TABLE IF NOT EXISTS public.eventos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    titulo VARCHAR(255) NOT NULL,
    descricao TEXT,
    data_inicio TIMESTAMP WITH TIME ZONE NOT NULL,
    data_fim TIMESTAMP WITH TIME ZONE NOT NULL,
    categoria VARCHAR(30) NOT NULL CHECK (categoria IN ('prova', 'reuniao', 'feriado', 'cultural')),
    cor VARCHAR(20) DEFAULT '#2563EB',
    publico_alvo VARCHAR(50) DEFAULT 'Todos',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================================
-- ÍNDICES PARA PERFORMANCE
-- ==========================================================
CREATE INDEX IF NOT EXISTS idx_estudantes_turma ON public.estudantes(turma_id);
CREATE INDEX IF NOT EXISTS idx_estudantes_status ON public.estudantes(status_matricula);
CREATE INDEX IF NOT EXISTS idx_documentos_estudante ON public.documentos_estudantes(estudante_id);
CREATE INDEX IF NOT EXISTS idx_faltas_prof_data ON public.faltas_professores(data_falta);
CREATE INDEX IF NOT EXISTS idx_eventos_inicio ON public.eventos(data_inicio);

-- ==========================================================
-- DADOS INICIAIS DE DEMONSTRAÇÃO (SEED DATA)
-- ==========================================================

-- 1. Escola Padrão
INSERT INTO public.config_escola (id, nome_escola, codigo_inep, cnpj, endereco, telefone, email)
VALUES ('00000000-0000-0000-0000-000000000001', 'Colégio Antigravity School OS', '35019827', '12.345.678/0001-90', 'Av. Central do Saber, 1500 - Bairro Universitário', '(11) 4002-8922', 'secretaria@antigravityschool.edu.br')
ON CONFLICT (id) DO NOTHING;

-- 2. Perfis de Exemplo
INSERT INTO public.profiles (id, full_name, email, role, avatar_url) VALUES
('11111111-1111-1111-1111-111111111111', 'Helena Valença (Diretora Geral)', 'helena.diretoria@antigravity.edu.br', 'admin', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150'),
('22222222-2222-2222-2222-222222222222', 'Prof. Marcos Andrade (Matemática)', 'marcos.andrade@antigravity.edu.br', 'professor', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150')
ON CONFLICT (email) DO NOTHING;

-- 3. Professores
INSERT INTO public.professores (id, profile_id, nome_completo, matricula, formacao, disciplinas, telefone, email) VALUES
('33333333-3333-3333-3333-333333333331', '22222222-2222-2222-2222-222222222222', 'Marcos Andrade', 'PROF-2024-001', 'Mestrado em Educação Matemática (USP)', ARRAY['Matemática', 'Raciocínio Lógico'], '(11) 98765-4321', 'marcos.andrade@antigravity.edu.br'),
('33333333-3333-3333-3333-333333333332', NULL, 'Clara Siqueira', 'PROF-2024-002', 'Doutorado em Literatura Brasileira (UNICAMP)', ARRAY['Língua Portuguesa', 'Redação'], '(11) 99123-4567', 'clara.siqueira@antigravity.edu.br'),
('33333333-3333-3333-3333-333333333333', NULL, 'Rodrigo Fontana', 'PROF-2024-003', 'Licenciatura em Física (UNESP)', ARRAY['Física', 'Ciências'], '(11) 98234-5678', 'rodrigo.fontana@antigravity.edu.br')
ON CONFLICT (matricula) DO NOTHING;

-- 4. Turmas
INSERT INTO public.turmas (id, nome, turno, capacidade, ano_letivo, professor_regente_id, sala) VALUES
('44444444-4444-4444-4444-444444444441', '1º Ano A - Ensino Médio', 'manha', 35, 2026, '33333333-3333-3333-3333-333333333331', 'Sala 101'),
('44444444-4444-4444-4444-444444444442', '2º Ano B - Ensino Médio', 'tarde', 32, 2026, '33333333-3333-3333-3333-333333333332', 'Sala 104'),
('44444444-4444-4444-4444-444444444443', '3º Ano C - Ensino Médio', 'manha', 30, 2026, '33333333-3333-3333-3333-333333333333', 'Sala 202'),
('44444444-4444-4444-4444-444444444444', 'EJA Noturno - Módulo 2', 'noite', 40, 2026, '33333333-3333-3333-3333-333333333331', 'Sala 108')
ON CONFLICT (id) DO NOTHING;

-- 5. Faltas de Professores (para Tabela de Alertas Rápidos)
INSERT INTO public.faltas_professores (professor_id, data_falta, aulas_faltadas, justificativa, atestado_drive_link, homologado) VALUES
('33333333-3333-3333-3333-333333333332', CURRENT_DATE, 3, 'Consulta Médica Oftalmológica de Emergência', 'https://drive.google.com/file/d/demo_atestado_clara/view', TRUE),
('33333333-3333-3333-3333-333333333333', CURRENT_DATE, 2, 'Licença Gala / Acompanhamento Familiar', 'https://drive.google.com/file/d/demo_atestado_rodrigo/view', FALSE)
ON CONFLICT DO NOTHING;

-- 6. Eventos Escolares
INSERT INTO public.eventos (titulo, descricao, data_inicio, data_fim, categoria, cor) VALUES
('Simulado Geral ENEM 1º Semestre', 'Avaliação diagnóstica com todos os estudantes do Ensino Médio.', NOW() + INTERVAL '2 days', NOW() + INTERVAL '2 days' + INTERVAL '4 hours', 'prova', '#2563EB'),
('Reunião Pedagógica de Pais & Mestres', 'Alinhamento de rendimento escolar e entrega de boletins parciais.', NOW() + INTERVAL '5 days', NOW() + INTERVAL '5 days' + INTERVAL '3 hours', 'reuniao', '#EAB308'),
('Feriado Nacional - Tiradentes', 'Recesso escolar institucional sem atividades letivas.', NOW() + INTERVAL '12 days', NOW() + INTERVAL '12 days' + INTERVAL '24 hours', 'feriado', '#EF4444'),
('Feira de Ciências & Tecnologia OS', 'Apresentação de projetos inovadores e robótica pelos alunos.', NOW() + INTERVAL '18 days', NOW() + INTERVAL '18 days' + INTERVAL '8 hours', 'cultural', '#10B981')
ON CONFLICT DO NOTHING;
