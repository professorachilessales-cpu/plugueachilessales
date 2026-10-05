import { executeTursoQuery } from '../src/lib/turso.ts';

async function run() {
  console.log('--- 1. Atualizando DDL para professores, turmas e turma_professores ---');

  // Adicionar deleted_at e nome em professores
  try {
    await executeTursoQuery('ALTER TABLE professores ADD COLUMN deleted_at TEXT DEFAULT NULL;');
    console.log('Coluna deleted_at adicionada em professores.');
  } catch (e) {
    console.log('deleted_at já existe em professores ou não pôde ser adicionada.');
  }

  try {
    await executeTursoQuery('ALTER TABLE professores ADD COLUMN nome TEXT DEFAULT NULL;');
    console.log('Coluna nome adicionada em professores.');
  } catch (e) {
    console.log('nome já existe em professores.');
  }

  await executeTursoQuery("UPDATE professores SET nome = nome_completo WHERE nome IS NULL OR nome = '';");
  console.log('professores.nome sincronizado com nome_completo.');

  // Adicionar deleted_at em turmas
  try {
    await executeTursoQuery('ALTER TABLE turmas ADD COLUMN deleted_at TEXT DEFAULT NULL;');
    console.log('Coluna deleted_at adicionada em turmas.');
  } catch (e) {
    console.log('deleted_at já existe em turmas.');
  }

  // Criar tabela relacional turma_professores
  await executeTursoQuery(`
    CREATE TABLE IF NOT EXISTS turma_professores (
      id TEXT PRIMARY KEY,
      turma_id TEXT NOT NULL REFERENCES turmas(id) ON DELETE CASCADE,
      professor_id TEXT NOT NULL REFERENCES professores(id) ON DELETE CASCADE,
      disciplina TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(turma_id, professor_id, disciplina)
    );
  `);
  console.log('Tabela turma_professores criada ou já existente.');

  await executeTursoQuery('CREATE INDEX IF NOT EXISTS idx_turma_prof_turma ON turma_professores(turma_id);');
  await executeTursoQuery('CREATE INDEX IF NOT EXISTS idx_turma_prof_prof ON turma_professores(professor_id);');

  console.log('\n--- 2. Padronização dos Nomes das Turmas e Alunos ---');
  const mapaPadronizacao = {
    '7B - MANHÃ': '7º ano B',
    '7C - TARDE': '7º ano C',
    '7D - TARDE': '7º ano D',
    '8A - MANHÃ': '8º ano A',
    '8B - TARDE': '8º ano B',
    '9A - MANHÃ': '9º ano A',
    '9C - TARDE': '9º ano C',
    '9D - TARDE': '9º ano D',
  };

  for (const [nomeAntigo, nomeNovo] of Object.entries(mapaPadronizacao)) {
    const resTurma = await executeTursoQuery('UPDATE turmas SET nome = ? WHERE nome = ?;', [nomeNovo, nomeAntigo]);
    if (resTurma.rowsAffected > 0) {
      console.log(`Turma '${nomeAntigo}' padronizada para '${nomeNovo}'.`);
    }
    const resEst = await executeTursoQuery('UPDATE estudantes SET turma_nome = ? WHERE turma_nome = ?;', [nomeNovo, nomeAntigo]);
    if (resEst.rowsAffected > 0) {
      console.log(`Estudantes da turma '${nomeAntigo}' atualizados com nome '${nomeNovo}' (${resEst.rowsAffected} afetados).`);
    }
  }

  console.log('\n--- 3. Migração Relacional Estrita para turma_professores ---');
  const profs = await executeTursoQuery('SELECT id, nome_completo, disciplinas, turmas_atribuidas_ids FROM professores;');
  const turmas = await executeTursoQuery('SELECT id, nome, professores_ids FROM turmas;');

  const turmasMap = new Map(turmas.rows.map(t => [t.id, t.nome]));

  let inseridos = 0;
  for (const prof of profs.rows) {
    let tids = [];
    try {
      tids = JSON.parse(prof.turmas_atribuidas_ids || '[]');
    } catch {}

    let disclist = [];
    try {
      disclist = JSON.parse(prof.disciplinas || '[]');
    } catch {
      if (prof.disciplinas) disclist = [prof.disciplinas];
    }
    const discPrincipal = disclist.length > 0 ? disclist.join(' / ') : 'Geral';

    for (const turmaId of tids) {
      if (turmasMap.has(turmaId)) {
        const idRel = `tp-${turmaId}-${prof.id}`;
        try {
          await executeTursoQuery(`
            INSERT INTO turma_professores (id, turma_id, professor_id, disciplina)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(turma_id, professor_id, disciplina) DO UPDATE SET
              disciplina = excluded.disciplina;
          `, [idRel, turmaId, prof.id, discPrincipal]);
          inseridos++;
        } catch (e) {
          console.error(`Erro ao inserir associação ${prof.id} <-> ${turmaId}:`, e);
        }
      }
    }
  }

  // Verificar professores que estão em turmas.professores_ids mas não em turmas_atribuidas_ids
  for (const turma of turmas.rows) {
    let pids = [];
    try {
      pids = JSON.parse(turma.professores_ids || '[]');
    } catch {}

    for (const pid of pids) {
      const prof = profs.rows.find(p => p.id === pid);
      if (prof) {
        let disclist = [];
        try { disclist = JSON.parse(prof.disciplinas || '[]'); } catch {}
        const discPrincipal = disclist.length > 0 ? disclist.join(' / ') : 'Geral';
        const idRel = `tp-${turma.id}-${pid}`;
        try {
          await executeTursoQuery(`
            INSERT INTO turma_professores (id, turma_id, professor_id, disciplina)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(turma_id, professor_id, disciplina) DO UPDATE SET
              disciplina = excluded.disciplina;
          `, [idRel, turma.id, pid, discPrincipal]);
          inseridos++;
        } catch (e) {}
      }
    }
  }

  console.log(`Total de associações processadas em turma_professores: ${inseridos}`);

  console.log('\n--- 4. Executando Diagnóstico Relacional (SQL Requisitado) ---');
  const diagQuery = `
    SELECT 
      t.id AS turma_id,
      t.nome AS turma_nome,
      t.turno,
      p.id AS professor_id,
      p.nome AS professor_nome,
      tp.disciplina
    FROM turmas t
    INNER JOIN turma_professores tp ON tp.turma_id = t.id
    INNER JOIN professores p ON p.id = tp.professor_id
    WHERE p.deleted_at IS NULL AND t.deleted_at IS NULL
    ORDER BY t.nome, p.nome;
  `;

  const diagResult = await executeTursoQuery(diagQuery);
  console.log(`Total de associações ativas retornadas: ${diagResult.rows.length}`);
  console.log('Primeiras 15 associações:');
  console.table(diagResult.rows.slice(0, 15));
}

run().catch(console.error);
