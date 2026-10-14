import fs from 'node:fs';
import path from 'node:path';

// Carregar variáveis do .env.local
const envContent = fs.readFileSync(path.resolve(process.cwd(), '.env.local'), 'utf-8');
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

console.log('Testing Turso endpoint:', httpUrl);

async function query(sql) {
  const payload = {
    requests: [
      {
        type: 'execute',
        stmt: { sql }
      },
      { type: 'close' }
    ]
  };

  const res = await fetch(httpUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`HTTP ${res.status}: ${txt}`);
  }

  const data = await res.json();
  const executeResult = data.results?.[0]?.response?.result;
  if (!executeResult) return [];
  const cols = executeResult.cols?.map((c) => c.name) || [];
  return (executeResult.rows || []).map((rowArray) => {
    const rowObj = {};
    cols.forEach((colName, idx) => {
      const cell = rowArray[idx];
      rowObj[colName] = cell && cell.value !== undefined ? cell.value : null;
    });
    return rowObj;
  });
}

async function main() {
  try {
    const countTurmas = await query('SELECT COUNT(*) as c FROM turmas');
    console.log('COUNT turmas:', countTurmas);
    const countProf = await query('SELECT COUNT(*) as c FROM professores');
    console.log('COUNT professores:', countProf);
    const countEst = await query('SELECT COUNT(*) as c FROM estudantes');
    console.log('COUNT estudantes:', countEst);

    const turmas = await query('SELECT * FROM turmas LIMIT 5');
    console.log('Sample turmas:', JSON.stringify(turmas, null, 2));
  } catch (err) {
    console.error('Query error:', err);
  }
}

main();
