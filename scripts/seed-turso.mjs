import { readFileSync } from 'fs';
import { resolve } from 'path';

// Carregar variáveis do .env.local
const envContent = readFileSync(resolve(process.cwd(), '.env.local'), 'utf-8');
const env = {};
for (const line of envContent.split('\n')) {
  const match = line.match(/^\s*([\w_]+)\s*=\s*["']?(.*?)["']?\s*$/);
  if (match) {
    env[match[1]] = match[2];
  }
}

const token = env.TURSO_AUTH_TOKEN;
const rawUrl = env.TURSO_DATABASE_URL || 'libsql://plugueachiles-achilessales.aws-us-west-2.turso.io';
const httpUrl = rawUrl.replace('libsql://', 'https://') + '/v2/pipeline';

// Mock data
// Vamos ler mock-data.ts para importar os dados iniciais
const mockDataContent = readFileSync(resolve(process.cwd(), 'src/lib/mock-data.ts'), 'utf-8');

async function executeQuery(sql, args = []) {
  const formattedArgs = args.map((arg) => {
    if (arg === null || arg === undefined) return { type: 'null' };
    if (typeof arg === 'number') {
      return Number.isInteger(arg)
        ? { type: 'integer', value: String(arg) }
        : { type: 'float', value: arg };
    }
    if (typeof arg === 'boolean') {
      return { type: 'integer', value: arg ? '1' : '0' };
    }
    return { type: 'text', value: String(arg) };
  });

  const res = await fetch(httpUrl, {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      requests: [
        { type: 'execute', stmt: { sql, args: formattedArgs } },
        { type: 'close' }
      ]
    })
  });
  const data = await res.json();
  if (data.results?.[0]?.type === 'error') {
    throw new Error(data.results[0].error.message);
  }
  return data.results?.[0]?.response?.result;
}

async function seed() {
  console.log('--- Iniciando Seed no Turso ---');

  // 1. Users
  const users = [
    {
      id: 'user-admin-1',
      name: 'Coordenação Pedagógica / Admin',
      email: 'admin@plugue.edu.br',
      cpf: '00000000000',
      password_hash: 'admin123',
      role: 'admin',
      must_change_password: 0,
      allowed_modules: JSON.stringify(['PROFILE', 'FOTOGRAMA', 'CALENDARIO']),
      is_active: 1,
      created_at: '2024-01-01T08:00:00Z',
    },
    {
      id: 'user-prof-1',
      name: 'Prof. Marcos Andrade',
      email: 'marcos.andrade@plugue.edu.br',
      cpf: '52948163045',
      password_hash: '52948163045',
      role: 'professor',
      must_change_password: 1,
      allowed_modules: JSON.stringify(['PROFILE', 'FOTOGRAMA', 'CALENDARIO']),
      is_active: 1,
      created_at: '2024-02-01T08:00:00Z',
    },
    {
      id: 'user-prof-2',
      name: 'Profa. Clara Siqueira',
      email: 'clara.siqueira@plugue.edu.br',
      cpf: '68492015372',
      password_hash: 'plugue2026',
      role: 'professor',
      must_change_password: 0,
      allowed_modules: JSON.stringify(['PROFILE', 'FOTOGRAMA', 'CALENDARIO']),
      is_active: 1,
      created_at: '2024-02-01T08:00:00Z',
    },
    {
      id: 'user-prof-3',
      name: 'Prof. Rodrigo Fontana',
      email: 'rodrigo.fontana@plugue.edu.br',
      cpf: '71938450218',
      password_hash: '71938450218',
      role: 'professor',
      must_change_password: 1,
      allowed_modules: JSON.stringify(['PROFILE', 'FOTOGRAMA', 'CALENDARIO']),
      is_active: 1,
      created_at: '2024-02-01T08:00:00Z',
    }
  ];

  for (const u of users) {
    await executeQuery(
      `INSERT OR REPLACE INTO users (id, name, email, cpf, password_hash, role, must_change_password, allowed_modules, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [u.id, u.name, u.email, u.cpf, u.password_hash, u.role, u.must_change_password, u.allowed_modules, u.is_active, u.created_at]
    );
  }
  console.log(`✓ ${users.length} usuários inseridos/atualizados.`);

  // 2. Professores
  const professores = [
    {
      id: 'prof-1',
      nome_completo: 'Prof. Marcos Andrade',
      matricula: 'PROF-2024-001',
      formacao: 'Mestrado em Educação Matemática (USP)',
      disciplinas: JSON.stringify(['Matemática', 'Raciocínio Lógico', 'Estatística Básica']),
      telefone: '(11) 98765-4321',
      email: 'marcos.andrade@plugue.edu.br',
      ativo: 1,
      eh_apoio: 0,
      turmas_atribuidas_ids: JSON.stringify(['turma-1', 'turma-3']),
      created_at: '2024-02-01T08:00:00Z',
    },
    {
      id: 'prof-2',
      nome_completo: 'Profa. Clara Siqueira',
      matricula: 'PROF-2024-002',
      formacao: 'Doutorado em Literatura e Redação (UNICAMP)',
      disciplinas: JSON.stringify(['Língua Portuguesa', 'Literatura', 'Redação ENEM']),
      telefone: '(11) 99123-4567',
      email: 'clara.siqueira@plugue.edu.br',
      ativo: 1,
      eh_apoio: 0,
      turmas_atribuidas_ids: JSON.stringify(['turma-2', 'turma-4']),
      created_at: '2024-02-01T08:00:00Z',
    },
    {
      id: 'prof-3',
      nome_completo: 'Prof. Rodrigo Fontana',
      matricula: 'PROF-2024-003',
      formacao: 'Licenciatura Plena em Física (UNESP)',
      disciplinas: JSON.stringify(['Física', 'Ciências da Natureza']),
      telefone: '(11) 97654-3210',
      email: 'rodrigo.fontana@plugue.edu.br',
      ativo: 1,
      eh_apoio: 0,
      turmas_atribuidas_ids: JSON.stringify(['turma-1', 'turma-2']),
      created_at: '2024-02-01T08:00:00Z',
    },
    {
      id: 'prof-4',
      nome_completo: 'Profa. Mariana Costa',
      matricula: 'PROF-2024-004',
      formacao: 'Especialização em Educação Especial e Inclusiva (PUC)',
      disciplinas: JSON.stringify(['Apoio Pedagógico Especializado', 'AEE']),
      telefone: '(11) 96543-2109',
      email: 'mariana.costa@plugue.edu.br',
      ativo: 1,
      eh_apoio: 1,
      turmas_atribuidas_ids: JSON.stringify(['turma-1', 'turma-2', 'turma-3', 'turma-4']),
      created_at: '2024-02-01T08:00:00Z',
    },
    {
      id: 'prof-5',
      nome_completo: 'Prof. Gabriel Menezes',
      matricula: 'PROF-2024-005',
      formacao: 'Licenciatura em História (USP)',
      disciplinas: JSON.stringify(['História Geral', 'História do Brasil', 'Filosofia']),
      telefone: '(11) 95432-1098',
      email: 'gabriel.menezes@plugue.edu.br',
      ativo: 1,
      eh_apoio: 0,
      turmas_atribuidas_ids: JSON.stringify(['turma-3', 'turma-4']),
      created_at: '2024-02-01T08:00:00Z',
    }
  ];

  for (const p of professores) {
    await executeQuery(
      `INSERT OR REPLACE INTO professores (id, nome_completo, matricula, formacao, disciplinas, telefone, email, ativo, eh_apoio, turmas_atribuidas_ids, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [p.id, p.nome_completo, p.matricula, p.formacao, p.disciplinas, p.telefone, p.email, p.ativo, p.eh_apoio, p.turmas_atribuidas_ids, p.created_at]
    );
  }
  console.log(`✓ ${professores.length} professores inseridos/atualizados.`);

  // 3. Turmas
  const turmas = [
    {
      id: 'turma-1',
      nome: '1º Ano A - Ensino Médio',
      grupo: '1º anos',
      turno: 'manha',
      capacidade: 35,
      ano_letivo: 2026,
      professor_regente_id: 'prof-1',
      professor_regente_nome: 'Prof. Marcos Andrade',
      professores_ids: JSON.stringify(['prof-1', 'prof-3']),
      equipe_apoio_ids: JSON.stringify(['prof-4']),
      sala: 'Sala 101 - Bloco A',
      ativa: 1,
      grade_horaria: JSON.stringify([]),
      created_at: '2024-01-15T08:00:00Z',
    },
    {
      id: 'turma-2',
      nome: '1º Ano B - Ensino Médio',
      grupo: '1º anos',
      turno: 'manha',
      capacidade: 35,
      ano_letivo: 2026,
      professor_regente_id: 'prof-2',
      professor_regente_nome: 'Profa. Clara Siqueira',
      professores_ids: JSON.stringify(['prof-2', 'prof-3']),
      equipe_apoio_ids: JSON.stringify(['prof-4']),
      sala: 'Sala 102 - Bloco A',
      ativa: 1,
      grade_horaria: JSON.stringify([]),
      created_at: '2024-01-15T08:00:00Z',
    },
    {
      id: 'turma-3',
      nome: '2º Ano A - Ensino Médio',
      grupo: '2º anos',
      turno: 'tarde',
      capacidade: 35,
      ano_letivo: 2026,
      professor_regente_id: 'prof-1',
      professor_regente_nome: 'Prof. Marcos Andrade',
      professores_ids: JSON.stringify(['prof-1', 'prof-5']),
      equipe_apoio_ids: JSON.stringify(['prof-4']),
      sala: 'Sala 201 - Bloco B',
      ativa: 1,
      grade_horaria: JSON.stringify([]),
      created_at: '2024-01-15T08:00:00Z',
    },
    {
      id: 'turma-4',
      nome: '3º Ano A - Ensino Médio',
      grupo: '3º anos',
      turno: 'tarde',
      capacidade: 30,
      ano_letivo: 2026,
      professor_regente_id: 'prof-5',
      professor_regente_nome: 'Prof. Gabriel Menezes',
      professores_ids: JSON.stringify(['prof-2', 'prof-5']),
      equipe_apoio_ids: JSON.stringify(['prof-4']),
      sala: 'Sala 301 - Bloco C',
      ativa: 1,
      grade_horaria: JSON.stringify([]),
      created_at: '2024-01-15T08:00:00Z',
    }
  ];

  for (const t of turmas) {
    await executeQuery(
      `INSERT OR REPLACE INTO turmas (id, nome, grupo, turno, capacidade, ano_letivo, professor_regente_id, professor_regente_nome, professores_ids, equipe_apoio_ids, sala, ativa, grade_horaria, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [t.id, t.nome, t.grupo, t.turno, t.capacidade, t.ano_letivo, t.professor_regente_id, t.professor_regente_nome, t.professores_ids, t.equipe_apoio_ids, t.sala, t.ativa, t.grade_horaria, t.created_at]
    );
  }
  console.log(`✓ ${turmas.length} turmas inseridas/atualizadas.`);

  // 4. Estudantes de exemplo
  const estudantes = [
    {
      id: 'est-1',
      turma_id: 'turma-1',
      turma_nome: '1º Ano A - Ensino Médio',
      nome_completo: 'Lucas Silva Pereira',
      data_nascimento: '2010-04-12',
      cpf: '456.789.123-00',
      certidao_nascimento: '123456 01 55 2010 1 00123 456 0012345-67',
      filiacao_materna: 'Mariana Silva Pereira',
      filiacao_paterna: 'Carlos Roberto Pereira',
      telefone_responsavel: '(11) 98111-2233',
      nome_responsavel: 'Mariana Silva Pereira',
      parentesco_responsavel: 'Mãe',
      endereco: 'Rua das Flores, 120, Apto 42 - Jardim Paulista',
      possui_laudo: 0,
      aee: 0,
      status_matricula: 'Ativo',
      tipo_movimentacao: 'Entrada Interna',
      tipo_historico_escolar: 'Definitivo',
      created_at: '2024-01-20T10:00:00Z',
    },
    {
      id: 'est-2',
      turma_id: 'turma-1',
      turma_nome: '1º Ano A - Ensino Médio',
      nome_completo: 'Beatriz Almeida Santos',
      data_nascimento: '2010-09-25',
      cpf: '321.654.987-11',
      certidao_nascimento: '987654 01 55 2010 1 00987 654 0098765-43',
      filiacao_materna: 'Juliana Almeida Santos',
      filiacao_paterna: 'Fernando Santos',
      telefone_responsavel: '(11) 97222-3344',
      nome_responsavel: 'Juliana Almeida Santos',
      parentesco_responsavel: 'Mãe',
      endereco: 'Av. Paulista, 1500 - Bela Vista',
      possui_laudo: 1,
      laudo_descricao: 'TDAH e Dislexia diagnosticados',
      aee: 1,
      status_matricula: 'Ativo',
      tipo_movimentacao: 'Entrada Interna',
      tipo_historico_escolar: 'Definitivo',
      created_at: '2024-01-20T10:00:00Z',
    },
    {
      id: 'est-3',
      turma_id: 'turma-2',
      turma_nome: '1º Ano B - Ensino Médio',
      nome_completo: 'Gabriel Oliveira Costa',
      data_nascimento: '2010-01-18',
      cpf: '789.123.456-22',
      certidao_nascimento: '456789 01 55 2010 1 00456 789 0045678-90',
      filiacao_materna: 'Fernanda Oliveira Costa',
      filiacao_paterna: 'Marcelo Costa',
      telefone_responsavel: '(11) 96333-4455',
      nome_responsavel: 'Fernanda Oliveira Costa',
      parentesco_responsavel: 'Mãe',
      endereco: 'Rua Augusta, 800 - Consolação',
      possui_laudo: 0,
      aee: 0,
      status_matricula: 'Ativo',
      tipo_movimentacao: 'Entrada Externa',
      tipo_historico_escolar: 'Definitivo',
      created_at: '2024-01-20T10:00:00Z',
    }
  ];

  for (const e of estudantes) {
    await executeQuery(
      `INSERT OR REPLACE INTO estudantes (id, turma_id, turma_nome, nome_completo, data_nascimento, cpf, certidao_nascimento, filiacao_materna, filiacao_paterna, telefone_responsavel, nome_responsavel, parentesco_responsavel, endereco, possui_laudo, laudo_descricao, aee, status_matricula, tipo_movimentacao, tipo_historico_escolar, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [e.id, e.turma_id, e.turma_nome, e.nome_completo, e.data_nascimento, e.cpf, e.certidao_nascimento, e.filiacao_materna, e.filiacao_paterna, e.telefone_responsavel, e.nome_responsavel, e.parentesco_responsavel, e.endereco, e.possui_laudo, e.laudo_descricao || null, e.aee, e.status_matricula, e.tipo_movimentacao, e.tipo_historico_escolar, e.created_at]
    );
  }
  console.log(`✓ ${estudantes.length} estudantes inseridos/atualizados.`);

  // 5. Eventos
  const eventos = [
    {
      id: 'evt-1',
      titulo: 'Início do Ano Letivo 2026',
      descricao: 'Acolhimento aos alunos e apresentação do corpo docente.',
      data_inicio: '2026-02-02T08:00:00',
      data_fim: '2026-02-02T12:00:00',
      categoria: 'cultural',
      cor: '#2563EB',
      publico_alvo: 'Todos',
      created_at: '2024-01-10T08:00:00Z',
    },
    {
      id: 'evt-2',
      titulo: 'Reunião de Pais e Mestres - 1º Bimestre',
      descricao: 'Alinhamento pedagógico e entrega de diagnósticos.',
      data_inicio: '2026-03-20T19:00:00',
      data_fim: '2026-03-20T21:30:00',
      categoria: 'reuniao',
      cor: '#D97706',
      publico_alvo: 'Pais e Responsáveis',
      created_at: '2024-01-10T08:00:00Z',
    },
    {
      id: 'evt-3',
      titulo: 'Avaliações Bimestrais - 1º Trimestre',
      descricao: 'Semana de provas multidisciplinares.',
      data_inicio: '2026-04-14T07:30:00',
      data_fim: '2026-04-18T12:30:00',
      categoria: 'prova',
      cor: '#DC2626',
      publico_alvo: 'Estudantes',
      created_at: '2024-01-10T08:00:00Z',
    }
  ];

  for (const ev of eventos) {
    await executeQuery(
      `INSERT OR REPLACE INTO eventos (id, titulo, descricao, data_inicio, data_fim, categoria, cor, publico_alvo, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [ev.id, ev.titulo, ev.descricao, ev.data_inicio, ev.data_fim, ev.categoria, ev.cor, ev.publico_alvo, ev.created_at]
    );
  }
  console.log(`✓ ${eventos.length} eventos inseridos/atualizados.`);

  console.log('--- Seed Turso Concluído com Sucesso! ---');
}

seed().catch(console.error);
