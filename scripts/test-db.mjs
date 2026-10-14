import fs from 'fs';
import path from 'path';

const envContent = fs.readFileSync('.env.local', 'utf-8');
const env = {};
for (const line of envContent.split('\n')) {
  const match = line.match(/^\s*([\w_]+)\s*=\s*['"]?(.*?)['"]?\s*$/);
  if (match) env[match[1]] = match[2];
}

const token = env.TURSO_AUTH_TOKEN;
const rawUrl = env.TURSO_DATABASE_URL || 'libsql://plugueachiles-achilessales.aws-us-west-2.turso.io';
const httpUrl = rawUrl.replace('libsql://', 'https://') + '/v2/pipeline';

console.log('Testing Turso URL:', httpUrl);

async function run() {
  const res = await fetch(httpUrl, {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      requests: [
        { type: 'execute', stmt: { sql: 'SELECT count(*) as c FROM turmas' } },
        { type: 'execute', stmt: { sql: 'SELECT count(*) as c FROM estudantes' } },
        { type: 'execute', stmt: { sql: 'SELECT id, nome, turno FROM turmas LIMIT 5' } },
        { type: 'execute', stmt: { sql: 'SELECT id, name, role, funcao_tipo FROM users' } },
        { type: 'close' }
      ]
    })
  });
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}

run().catch(console.error);
