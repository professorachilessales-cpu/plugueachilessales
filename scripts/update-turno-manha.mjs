import { executeTursoQuery } from '../src/lib/turso.ts';

async function migrateTurno() {
  console.log('--- 1. Verificando estado atual das turmas no Turso ---');
  const antes = await executeTursoQuery('SELECT id, nome, turno FROM turmas ORDER BY nome;');
  console.log('Total turmas:', antes.rows.length);
  console.log('Distribuição atual de turnos:');
  const countAntes = {};
  for (const r of antes.rows) {
    countAntes[r.turno] = (countAntes[r.turno] || 0) + 1;
  }
  console.table(countAntes);

  console.log('\n--- 2. Criando turmas_new com suporte a "manhã" no CHECK constraint ---');
  await executeTursoQuery(`
    CREATE TABLE IF NOT EXISTS turmas_new (
      id TEXT PRIMARY KEY,
      nome TEXT NOT NULL,
      grupo TEXT DEFAULT '1º anos',
      turno TEXT NOT NULL CHECK (turno IN ('manha', 'manhã', 'tarde', 'noite')),
      capacidade INTEGER NOT NULL DEFAULT 35,
      ano_letivo INTEGER NOT NULL DEFAULT 2026,
      professor_regente_id TEXT REFERENCES professores(id) ON DELETE SET NULL,
      professor_regente_nome TEXT,
      sala TEXT,
      grade_horaria TEXT DEFAULT '[]',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      ativa INTEGER DEFAULT 1,
      professores_ids TEXT DEFAULT '[]',
      equipe_apoio_ids TEXT DEFAULT '[]',
      deleted_at TEXT DEFAULT NULL
    );
  `);

  console.log('\n--- 3. Copiando dados e convertendo "manha" para "manhã" ---');
  await executeTursoQuery(`
    INSERT OR REPLACE INTO turmas_new (
      id, nome, grupo, turno, capacidade, ano_letivo,
      professor_regente_id, professor_regente_nome, sala,
      grade_horaria, created_at, ativa, professores_ids,
      equipe_apoio_ids, deleted_at
    )
    SELECT 
      id, nome, grupo,
      CASE WHEN LOWER(turno) IN ('manha', 'manhã') THEN 'manhã' ELSE turno END,
      capacidade, ano_letivo,
      professor_regente_id, professor_regente_nome, sala,
      grade_horaria, created_at, ativa, professores_ids,
      equipe_apoio_ids, deleted_at
    FROM turmas;
  `);

  const rowsNew = await executeTursoQuery('SELECT COUNT(*) as c FROM turmas_new;');
  console.log(`Linhas migradas em turmas_new: ${rowsNew.rows[0].c}`);

  if (Number(rowsNew.rows[0].c) !== antes.rows.length) {
    throw new Error(`Contagem divergente! Esperado: ${antes.rows.length}, Obtido: ${rowsNew.rows[0].c}`);
  }

  console.log('\n--- 4. Substituindo tabela antiga pela tabela atualizada ---');
  await executeTursoQuery('DROP TABLE turmas;');
  await executeTursoQuery('ALTER TABLE turmas_new RENAME TO turmas;');

  console.log('\n--- 5. Verificando estado final das turmas no Turso ---');
  const depois = await executeTursoQuery('SELECT id, nome, turno FROM turmas ORDER BY nome;');
  console.log('Total turmas após migração:', depois.rows.length);
  console.log('Amostra de registros:');
  console.table(depois.rows);

  const countDepois = {};
  for (const r of depois.rows) {
    countDepois[r.turno] = (countDepois[r.turno] || 0) + 1;
  }
  console.log('Distribuição final de turnos:');
  console.table(countDepois);

  // Também verificar se o SELECT com turma_professores continua funcionando perfeitamente
  const diag = await executeTursoQuery(`
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
    ORDER BY t.nome, p.nome
    LIMIT 5;
  `);
  console.log('\nTeste de junção relacional:');
  console.table(diag.rows);
}

migrateTurno().catch(console.error);
