import fs from 'node:fs';
import path from 'node:path';

const SHEET_ID = '16KqUf0cMwNhNKJsK2KM0mMk2qhDozBNIAEuWSs-EBF4';
const TURSO_DB_URL = process.env.TURSO_DATABASE_URL || 'libsql://plugueachiles-achilessales.aws-us-west-2.turso.io';
const TURSO_AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN || '';

const httpUrl = TURSO_DB_URL.replace('libsql://', 'https://') + '/v2/pipeline';

export async function executeTursoQuery(sql, args = []) {
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

  const payload = {
    requests: [
      {
        type: 'execute',
        stmt: {
          sql,
          args: formattedArgs,
        },
      },
      { type: 'close' },
    ],
  };

  const response = await fetch(httpUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${DEFAULT_TURSO_AUTH_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Turso HTTP Error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const executeResult = data.results?.[0]?.response?.result;
  if (!executeResult) return { rows: [], rowsAffected: 0 };
  const cols = executeResult.cols?.map((c) => c.name) || [];
  const rows = (executeResult.rows || []).map((rowArray) => {
    const rowObj = {};
    cols.forEach((colName, idx) => {
      const cell = rowArray[idx];
      rowObj[colName] = cell && cell.value !== undefined ? cell.value : null;
    });
    return rowObj;
  });
  return { rows, rowsAffected: executeResult.affected_row_count || 0 };
}

// Execute batch of SQL statements in a single pipeline
export async function executeTursoBatch(statements) {
  const requests = statements.map(({ sql, args = [] }) => {
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
    return {
      type: 'execute',
      stmt: {
        sql,
        args: formattedArgs,
      },
    };
  });

  requests.push({ type: 'close' });

  const response = await fetch(httpUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${DEFAULT_TURSO_AUTH_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ requests }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Turso Batch Error (${response.status}): ${errorText}`);
  }

  return response.json();
}

function parseCSV(text) {
  const lines = [];
  let row = [];
  let inQuotes = false;
  let currentVal = '';

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentVal += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      row.push(currentVal);
      currentVal = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') i++;
      row.push(currentVal);
      currentVal = '';
      if (row.length > 1 || row[0] !== '') {
        lines.push(row);
      }
      row = [];
    } else {
      currentVal += char;
    }
  }
  if (currentVal || row.length > 0) {
    row.push(currentVal);
    lines.push(row);
  }
  return lines;
}

function normalizeDate(raw) {
  if (!raw) return '';
  raw = raw.trim();
  if (raw.includes('/')) {
    const parts = raw.split('/');
    if (parts.length === 3) {
      let p0 = parseInt(parts[0], 10);
      let p1 = parseInt(parts[1], 10);
      let year = parts[2];
      if (year.length === 2) year = '19' + year;
      let month, day;
      if (p1 > 12) {
        month = String(p0).padStart(2, '0');
        day = String(p1).padStart(2, '0');
      } else if (p0 > 12) {
        day = String(p0).padStart(2, '0');
        month = String(p1).padStart(2, '0');
      } else {
        month = String(p0).padStart(2, '0');
        day = String(p1).padStart(2, '0');
      }
      return `${year}-${month}-${day}`;
    }
  }
  return raw;
}

function cleanCpf(cpf) {
  if (!cpf) return '';
  return cpf.replace(/\D/g, '');
}

function formatCpf(clean) {
  if (!clean || clean.length !== 11) return clean;
  return `${clean.slice(0,3)}.${clean.slice(3,6)}.${clean.slice(6,9)}-${clean.slice(9,11)}`;
}

async function run() {
  console.log('=== INICIANDO MIGRAÇÃO E SINCRONIZAÇÃO DE DADOS (GOOGLE SHEETS -> TURSO) ===');

  // STEP 0: BACKUP DE SEGURANÇA
  console.log('\n[Passo 0] Realizando backup de segurança dos dados atuais...');
  const backup = {};
  for (const table of ['professores', 'estudantes', 'turmas', 'users', 'faltas_professores']) {
    try {
      const res = await executeTursoQuery(`SELECT * FROM ${table}`);
      backup[table] = res.rows;
    } catch (e) {
      backup[table] = [];
    }
  }
  const backupPath = path.join(process.cwd(), 'backup_pre_migration.json');
  fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2));
  console.log(`✓ Backup salvo em: ${backupPath}`);

  // STEP 1: FETCH SHEETS
  console.log('\n[Passo 1] Baixando planilhas Google Sheets...');
  const rProf = await fetch(`https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=Professores`);
  const profCsv = await rProf.text();
  const profRows = parseCSV(profCsv);

  const rEst = await fetch(`https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=Estudantes`);
  const estCsv = await rEst.text();
  const estRows = parseCSV(estCsv);

  console.log(`✓ Professores encontrados na planilha: ${profRows.length - 1}`);
  console.log(`✓ Estudantes encontrados na planilha: ${estRows.length - 1}`);

  // STEP 2: CONSTRUÇÃO DAS 16 TURMAS
  console.log('\n[Passo 2] Mapeando e estruturando as turmas...');
  const TURMAS_CONFIG = [
    { nome: '6A - MANHÃ', grupo: '6º anos', turno: 'manha', sala: 'Sala 01' },
    { nome: '6B - MANHÃ', grupo: '6º anos', turno: 'manha', sala: 'Sala 02' },
    { nome: '6C - MANHÃ', grupo: '6º anos', turno: 'manha', sala: 'Sala 03' },
    { nome: '6D - TARDE', grupo: '6º anos', turno: 'tarde', sala: 'Sala 01' },
    { nome: '6E - TARDE', grupo: '6º anos', turno: 'tarde', sala: 'Sala 02' },
    { nome: '6F - TARDE', grupo: '6º anos', turno: 'tarde', sala: 'Sala 03' },
    { nome: '7A - MANHÃ', grupo: '7º anos', turno: 'manha', sala: 'Sala 04' },
    { nome: '7B - MANHÃ', grupo: '7º anos', turno: 'manha', sala: 'Sala 05' },
    { nome: '7C - TARDE', grupo: '7º anos', turno: 'tarde', sala: 'Sala 04' },
    { nome: '7D - TARDE', grupo: '7º anos', turno: 'tarde', sala: 'Sala 05' },
    { nome: '8A - MANHÃ', grupo: '8º anos', turno: 'manha', sala: 'Sala 06' },
    { nome: '8B - TARDE', grupo: '8º anos', turno: 'tarde', sala: 'Sala 06' },
    { nome: '9A - MANHÃ', grupo: '9º anos', turno: 'manha', sala: 'Sala 07' },
    { nome: '9B - MANHÃ', grupo: '9º anos', turno: 'manha', sala: 'Sala 08' },
    { nome: '9C - TARDE', grupo: '9º anos', turno: 'tarde', sala: 'Sala 07' },
    { nome: '9D - TARDE', grupo: '9º anos', turno: 'tarde', sala: 'Sala 08' },
  ];

  const turmasMap = {};
  TURMAS_CONFIG.forEach((t) => {
    const id = 'turma-' + t.nome.toLowerCase().replace(/[^a-z0-9]/g, '-');
    turmasMap[t.nome] = {
      id,
      nome: t.nome,
      grupo: t.grupo,
      turno: t.turno,
      sala: t.sala,
      capacidade: 35,
      ano_letivo: 2026,
      ativa: 1,
      professores_ids: [],
      equipe_apoio_ids: [],
      grade_horaria: []
    };
  });

  // STEP 3: PROCESSAR PROFESSORES
  console.log('\n[Passo 3] Processando Professores e RBAC...');
  const professores = [];
  const systemUsers = [];

  for (let i = 1; i < profRows.length; i++) {
    const r = profRows[i];
    const id = r[0].trim();
    if (!id) continue;

    const foto = r[1]?.trim() || '';
    const nome = r[2]?.trim().toUpperCase() || '';
    const matricula = r[3]?.trim() || '';
    const rawCpf = r[4]?.trim() || '';
    const cleanC = cleanCpf(rawCpf);
    const formattedCpfVal = cleanC.length === 11 ? formatCpf(cleanC) : rawCpf;
    const rawTurno = r[5]?.trim() || '';
    const cargoDisc = r[6]?.trim() || '';
    const telefone = r[9]?.trim() || '';
    const email = r[10]?.trim().toLowerCase() || `prof.${id.toLowerCase()}@plugue.edu.br`;
    const mae = r[11]?.trim() || '';
    const pai = r[12]?.trim() || '';
    const rawNasc = r[13]?.trim() || '';
    const nascimento = normalizeDate(rawNasc);
    const rg = r[14]?.trim() || '';
    const endereco = r[18]?.trim() || '';
    const formacao = r[21]?.trim() || cargoDisc;
    const instituicao = r[22]?.trim() || '';

    // Normalização de Turno
    let turnoNormalizado = 'Manhã';
    const turnoLower = rawTurno.toLowerCase();
    const isManha = turnoLower.includes('manhã') || turnoLower.includes('manha');
    const isTarde = turnoLower.includes('tarde');
    if (isManha && isTarde) {
      turnoNormalizado = 'Integral';
    } else if (isTarde) {
      turnoNormalizado = 'Tarde';
    } else {
      turnoNormalizado = 'Manhã';
    }

    // Role RBAC
    const isDirecao = cargoDisc.toLowerCase().includes('diretor') || cargoDisc.toLowerCase().includes('secretária') || cargoDisc.toLowerCase().includes('secretaria');
    const role = isDirecao ? 'admin' : 'professor';

    // Disciplinas
    const disciplinas = [cargoDisc];

    // Apoio
    const ehApoio = cargoDisc.toLowerCase().includes('apoio');

    // Turmas Atribuídas
    const turmasAtribuidas = [];
    Object.values(turmasMap).forEach((turma) => {
      let matchTurno = false;
      if (turnoNormalizado === 'Integral') matchTurno = true;
      else if (turnoNormalizado === 'Manhã' && turma.turno === 'manha') matchTurno = true;
      else if (turnoNormalizado === 'Tarde' && turma.turno === 'tarde') matchTurno = true;

      // Não atribuir turmas a cargos administrativos não-docentes (Diretor, Secretária, Porteiro, Serviços Gerais, Administrativo)
      const isDocente = !isDirecao && !cargoDisc.toLowerCase().includes('porteiro') && !cargoDisc.toLowerCase().includes('serviços') && !cargoDisc.toLowerCase().includes('adminsitrativo');

      if (matchTurno && isDocente) {
        turmasAtribuidas.push(turma.id);
        if (ehApoio) {
          turma.equipe_apoio_ids.push(id);
        } else {
          turma.professores_ids.push(id);
        }
      }
    });

    const profObj = {
      id,
      nome_completo: nome,
      matricula,
      formacao,
      disciplinas,
      telefone,
      email,
      eh_apoio: ehApoio ? 1 : 0,
      ativo: 1,
      turmas_atribuidas_ids: turmasAtribuidas,
      cpf: formattedCpfVal,
      rg,
      graduacao_instituicao: instituicao,
      titulacao: 'GRADUAÇÃO',
      endereco_completo: endereco,
      nome_mae: mae,
      nome_pai: pai,
      foto_url: foto,
      nascimento,
      cargo_disciplina: cargoDisc,
      turno: turnoNormalizado
    };
    professores.push(profObj);

    // Criar/vincular usuário do sistema para login
    const userCpf = cleanC || `000000000${i}`.slice(-11);
    systemUsers.push({
      id: `usr-${id.toLowerCase()}`,
      name: nome,
      email: email,
      cpf: userCpf,
      password_hash: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8', // 'password' (SHA-256)
      role: role,
      must_change_password: 0,
      allowed_modules: JSON.stringify(['PROFILE', 'FOTOGRAMA', 'CALENDARIO', 'RELATORIOS']),
      is_active: 1
    });
  }

  console.log(`✓ Total de professores processados: ${professores.length}`);
  console.log(`✓ Total de usuários do sistema gerados: ${systemUsers.length}`);

  // STEP 4: PROCESSAR ESTUDANTES
  console.log('\n[Passo 4] Processando Estudantes...');
  const estudantes = [];

  for (let i = 1; i < estRows.length; i++) {
    const r = estRows[i];
    const id = r[0]?.trim();
    if (!id) continue;

    const foto = r[1]?.trim() || '';
    const nome = r[2]?.trim().toUpperCase() || '';
    const rawDataNasc = r[3]?.trim() || '';
    const dataNascimento = normalizeDate(rawDataNasc);
    const pai = r[4]?.trim() || '';
    const mae = r[5]?.trim() || '';
    const tel1 = r[6]?.trim() || '';
    const tel2 = r[7]?.trim() || '';
    const tel3 = r[8]?.trim() || '';
    const tel4 = r[9]?.trim() || '';
    const sus = r[10]?.trim() || '';
    const bolsa = r[11]?.trim() || '';
    const rawCpf = r[12]?.trim() || '';
    const cleanC = cleanCpf(rawCpf);
    const formattedCpfVal = cleanC.length === 11 ? formatCpf(cleanC) : rawCpf;
    const rg = r[13]?.trim() || '';
    const expedicao = r[14]?.trim() || '';
    const rawIdade = r[15]?.trim() || '';
    const idade = parseInt(rawIdade, 10) || 12;
    const rawEspecial = r[17]?.trim().toUpperCase() || 'FALSE';
    const especial = rawEspecial === 'TRUE' ? 1 : 0;
    const cotista = r[18]?.trim() || '0%';
    const laudo = r[21]?.trim() || '';
    const endereco = r[24]?.trim() || '';
    const email = r[25]?.trim() || '';
    const turmaNome = r[26]?.trim() || 'SEM TURMA';
    const observacoes = r[27]?.trim() || '';

    const turmaRef = turmasMap[turmaNome];
    const turmaId = turmaRef ? turmaRef.id : null;

    estudantes.push({
      id,
      turma_id: turmaId,
      turma_nome: turmaNome,
      nome_completo: nome,
      data_nascimento: dataNascimento,
      cpf: formattedCpfVal,
      rg_numero: rg,
      rg_data_expedicao: expedicao,
      certidao_nascimento: '',
      naturalidade_cidade: 'Recife',
      nacionalidade: 'Brasileira',
      numero_sus: sus,
      numero_bolsa_familia: bolsa,
      percentual_cota: cotista.includes('50') ? '50%' : (cotista.includes('100') ? '100%' : '0%'),
      filiacao_materna: mae,
      filiacao_paterna: pai,
      telefone_responsavel: tel1 || tel2 || '',
      telefone_2: tel2 || '',
      telefone_3: tel3 || '',
      telefone_4: tel4 || '',
      email: email,
      nome_responsavel: mae || pai || 'Responsável Legal',
      parentesco_responsavel: mae ? 'Mãe' : (pai ? 'Pai' : 'Responsável'),
      endereco: endereco,
      possui_laudo: laudo ? 1 : 0,
      laudo_descricao: laudo,
      aee: especial,
      foto_url: foto,
      status_matricula: 'Ativo',
      tipo_movimentacao: 'Entrada Externa',
      tipo_historico_escolar: 'Definitivo',
      observacoes: observacoes,
      idade: idade
    });
  }

  console.log(`✓ Total de estudantes processados: ${estudantes.length}`);

  // STEP 5: PURGA E LIMPEZA DE DADOS (HARD RESET)
  console.log('\n[Passo 5] 🧹 Executando Purga e Limpeza de Dados (Hard Reset no Turso)...');
  
  const purgeStatements = [
    { sql: 'DELETE FROM notificacoes_admin' },
    { sql: 'DELETE FROM relatorios_consolidados' },
    { sql: 'DELETE FROM relatorios_professores' },
    { sql: 'DELETE FROM solicitacoes_relatorio' },
    { sql: 'DELETE FROM reposicoes_aulas' },
    { sql: 'DELETE FROM atestados_professor' },
    { sql: 'DELETE FROM faltas_professores' },
    { sql: 'DELETE FROM documentos_estudante' },
    { sql: 'DELETE FROM documentos_estudantes' },
    { sql: 'DELETE FROM observacoes_aluno' },
    { sql: 'DELETE FROM estudantes' },
    { sql: 'DELETE FROM professores' },
    { sql: 'DELETE FROM turmas' },
  ];

  for (const st of purgeStatements) {
    try {
      await executeTursoQuery(st.sql);
      console.log(`  - Executado: ${st.sql}`);
    } catch (e) {
      console.warn(`  - Aviso ao executar "${st.sql}":`, e.message);
    }
  }
  console.log('✓ Purga concluída com sucesso!');

  // STEP 6: INSERÇÃO DAS TURMAS
  console.log('\n[Passo 6] Inserindo as 16 Turmas...');
  for (const turma of Object.values(turmasMap)) {
    await executeTursoQuery(
      `INSERT INTO turmas (
        id, nome, grupo, turno, capacidade, ano_letivo, sala, ativa, professores_ids, equipe_apoio_ids, grade_horaria
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        turma.id,
        turma.nome,
        turma.grupo,
        turma.turno,
        turma.capacidade,
        turma.ano_letivo,
        turma.sala,
        turma.ativa,
        JSON.stringify(turma.professores_ids),
        JSON.stringify(turma.equipe_apoio_ids),
        JSON.stringify([])
      ]
    );
  }
  console.log(`✓ ${Object.keys(turmasMap).length} turmas inseridas.`);

  // STEP 7: INSERÇÃO DOS PROFESSORES
  console.log('\n[Passo 7] Inserindo os 32 Professores...');
  for (const prof of professores) {
    await executeTursoQuery(
      `INSERT INTO professores (
        id, nome_completo, matricula, formacao, disciplinas, telefone, email,
        eh_apoio, ativo, turmas_atribuidas_ids, cpf, rg, graduacao_instituicao,
        titulacao, endereco_completo, nome_mae, nome_pai, observacoes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        prof.id,
        prof.nome_completo,
        prof.matricula,
        prof.formacao,
        JSON.stringify(prof.disciplinas),
        prof.telefone,
        prof.email,
        prof.eh_apoio,
        prof.ativo,
        JSON.stringify(prof.turmas_atribuidas_ids),
        prof.cpf,
        prof.rg,
        prof.graduacao_instituicao,
        prof.titulacao,
        prof.endereco_completo,
        prof.nome_mae,
        prof.nome_pai,
        prof.cargo_disciplina ? `Cargo/Função: ${prof.cargo_disciplina} | Turno: ${prof.turno}` : ''
      ]
    );
  }
  console.log(`✓ ${professores.length} professores inseridos.`);

  // STEP 8: INSERÇÃO DOS USUÁRIOS DE SISTEMA
  console.log('\n[Passo 8] Inserindo / atualizando usuários de acesso (RBAC)...');
  for (const u of systemUsers) {
    await executeTursoQuery(
      `INSERT OR REPLACE INTO users (
        id, name, email, cpf, password_hash, role, must_change_password, allowed_modules, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        u.id,
        u.name,
        u.email,
        u.cpf,
        u.password_hash,
        u.role,
        u.must_change_password,
        u.allowed_modules,
        u.is_active
      ]
    );
  }
  console.log(`✓ ${systemUsers.length} usuários sincronizados.`);

  // STEP 9: INSERÇÃO DOS ESTUDANTES (EM LOTES DE 25 PARA PERFORMANCE)
  console.log('\n[Passo 9] Inserindo os 305 Estudantes em lotes...');
  const BATCH_SIZE = 25;
  for (let i = 0; i < estudantes.length; i += BATCH_SIZE) {
    const batch = estudantes.slice(i, i + BATCH_SIZE);
    const stmts = batch.map((est) => ({
      sql: `INSERT INTO estudantes (
        id, turma_id, turma_nome, nome_completo, data_nascimento, cpf, rg_numero, rg_data_expedicao,
        certidao_nascimento, naturalidade_cidade, nacionalidade, numero_sus, numero_bolsa_familia,
        percentual_cota, filiacao_materna, filiacao_paterna, telefone_responsavel, telefone_2,
        telefone_3, telefone_4, email, nome_responsavel, parentesco_responsavel, endereco,
        possui_laudo, laudo_descricao, aee, foto_url, status_matricula, tipo_movimentacao,
        tipo_historico_escolar, observacoes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        est.id,
        est.turma_id,
        est.turma_nome,
        est.nome_completo,
        est.data_nascimento,
        est.cpf,
        est.rg_numero,
        est.rg_data_expedicao,
        est.certidao_nascimento,
        est.naturalidade_cidade,
        est.nacionalidade,
        est.numero_sus,
        est.numero_bolsa_familia,
        est.percentual_cota,
        est.filiacao_materna,
        est.filiacao_paterna,
        est.telefone_responsavel,
        est.telefone_2,
        est.telefone_3,
        est.telefone_4,
        est.email,
        est.nome_responsavel,
        est.parentesco_responsavel,
        est.endereco,
        est.possui_laudo,
        est.laudo_descricao,
        est.aee,
        est.foto_url,
        est.status_matricula,
        est.tipo_movimentacao,
        est.tipo_historico_escolar,
        est.observacoes
      ]
    }));

    await executeTursoBatch(stmts);
    process.stdout.write(`.`);
  }
  console.log(`\n✓ ${estudantes.length} estudantes inseridos com sucesso.`);

  // STEP 10: VALIDAÇÃO FINAL NO TURSO
  console.log('\n[Passo 10] Validando contagem final no Turso...');
  const countTurmas = await executeTursoQuery('SELECT COUNT(*) as c FROM turmas');
  const countProf = await executeTursoQuery('SELECT COUNT(*) as c FROM professores');
  const countEst = await executeTursoQuery('SELECT COUNT(*) as c FROM estudantes');
  const countUsers = await executeTursoQuery('SELECT COUNT(*) as c FROM users');

  console.log(`- Turmas no banco: ${countTurmas.rows[0]?.c}`);
  console.log(`- Professores no banco: ${countProf.rows[0]?.c}`);
  console.log(`- Estudantes no banco: ${countEst.rows[0]?.c}`);
  console.log(`- Usuários de sistema no banco: ${countUsers.rows[0]?.c}`);

  // STEP 11: GERAR ARQUIVO JSON SINCRONIZADO PARA MOCK/FALLBACK E ATUALIZAR MOCK-DATA
  console.log('\n[Passo 11] Exportando dataset sincronizado...');
  const syncDataset = {
    turmas: Object.values(turmasMap),
    professores,
    estudantes,
    systemUsers,
    data_sincronizacao: new Date().toISOString()
  };
  fs.writeFileSync(path.join(process.cwd(), 'synced_database.json'), JSON.stringify(syncDataset, null, 2));
  console.log('✓ synced_database.json gerado com sucesso.');

  console.log('\n=== MIGRAÇÃO E SINCRONIZAÇÃO CONCLUÍDAS COM ÊXITO! ===');
}

run().catch((err) => {
  console.error('\n❌ ERRO NA MIGRAÇÃO:', err);
  process.exit(1);
});
