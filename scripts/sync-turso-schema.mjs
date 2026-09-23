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

console.log('Connecting to Turso HTTP:', httpUrl);

const statements = [
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    cpf TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'professor' CHECK (role IN ('admin', 'professor')),
    must_change_password INTEGER DEFAULT 1,
    allowed_modules TEXT DEFAULT '["PROFILE"]',
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`,
  "ALTER TABLE turmas ADD COLUMN professores_ids TEXT DEFAULT '[]'",
  "ALTER TABLE turmas ADD COLUMN equipe_apoio_ids TEXT DEFAULT '[]'",
  "ALTER TABLE professores ADD COLUMN turmas_atribuidas_ids TEXT DEFAULT '[]'",
  "ALTER TABLE professores ADD COLUMN cpf TEXT",
  "ALTER TABLE professores ADD COLUMN rg TEXT",
  "ALTER TABLE professores ADD COLUMN rg_data_expedicao TEXT",
  "ALTER TABLE professores ADD COLUMN graduacao_instituicao TEXT",
  "ALTER TABLE professores ADD COLUMN titulacao TEXT",
  "ALTER TABLE professores ADD COLUMN pos_graduacao_instituicao TEXT",
  "ALTER TABLE professores ADD COLUMN graduacao_inicio TEXT",
  "ALTER TABLE professores ADD COLUMN graduacao_fim TEXT",
  "ALTER TABLE professores ADD COLUMN pos_graduacao_inicio TEXT",
  "ALTER TABLE professores ADD COLUMN pos_graduacao_fim TEXT",
  "ALTER TABLE professores ADD COLUMN endereco_completo TEXT",
  "ALTER TABLE professores ADD COLUMN nome_mae TEXT",
  "ALTER TABLE professores ADD COLUMN nome_pai TEXT",
  "ALTER TABLE professores ADD COLUMN telefone_emergencia TEXT",
  "ALTER TABLE professores ADD COLUMN telefone_emergencia2 TEXT",
  "ALTER TABLE professores ADD COLUMN contato_emergencia_nome TEXT",
  "ALTER TABLE professores ADD COLUMN observacoes TEXT",
  "ALTER TABLE estudantes ADD COLUMN rg_numero TEXT",
  "ALTER TABLE estudantes ADD COLUMN rg_data_expedicao TEXT",
  "ALTER TABLE estudantes ADD COLUMN naturalidade_cidade TEXT",
  "ALTER TABLE estudantes ADD COLUMN nacionalidade TEXT",
  "ALTER TABLE estudantes ADD COLUMN numero_sus TEXT",
  "ALTER TABLE estudantes ADD COLUMN numero_bolsa_familia TEXT",
  "ALTER TABLE estudantes ADD COLUMN percentual_cota TEXT",
  "ALTER TABLE estudantes ADD COLUMN cpf_responsavel TEXT",
  "ALTER TABLE estudantes ADD COLUMN telefone_2 TEXT",
  "ALTER TABLE estudantes ADD COLUMN telefone_3 TEXT",
  "ALTER TABLE estudantes ADD COLUMN telefone_4 TEXT",
  "ALTER TABLE estudantes ADD COLUMN email TEXT",
  "ALTER TABLE estudantes ADD COLUMN endereco_logradouro TEXT",
  "ALTER TABLE estudantes ADD COLUMN endereco_numero TEXT",
  "ALTER TABLE estudantes ADD COLUMN endereco_bairro TEXT",
  "ALTER TABLE estudantes ADD COLUMN apoio_id TEXT",
  "ALTER TABLE estudantes ADD COLUMN apoio_nome TEXT",
  "ALTER TABLE estudantes ADD COLUMN observacoes TEXT"
];

async function run() {
  for (const sql of statements) {
    try {
      const res = await fetch(httpUrl, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          requests: [
            { type: 'execute', stmt: { sql } },
            { type: 'close' }
          ]
        })
      });
      const data = await res.json();
      const r = data.results?.[0];
      if (r?.type === 'error') {
        console.log('Notice:', r.error?.message);
      } else {
        console.log('Success:', sql.substring(0, 50));
      }
    } catch (e) {
      console.error('Error executing:', sql, e);
    }
  }
}

run();
