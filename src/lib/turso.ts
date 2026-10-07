// Cliente de conexão ao Turso Database (LibSQL HTTP API nativa)
// Suporta execução direta de queries SQL tanto via Edge/Node.js quanto no browser sem dependências C/C++ binárias.

import fs from 'fs';
import path from 'path';

export const DEFAULT_TURSO_DB_URL = 'libsql://plugueachiles-achilessales.aws-us-west-2.turso.io';
export const DEFAULT_TURSO_AUTH_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJnaWQiOiJiZWJmOGFkYi00NjNkLTQ2NDctYWE3Yi1hY2RiNjA3ZDA2ZjkiLCJpYXQiOjE3OTAxOTI5MjAsImtpZCI6InZXd1FEZ29POHVQc3FFY0lMOVloZzlxSm5SMjlqVWlaSWdQcW41U3AxQk0iLCJyaWQiOiIyOWE0Y2YzNS05M2FhLTRkMmUtOTA2My04NDQ1NmQ1MDNjNGMifQ.4ESQbOOPJw45FGHv9RbhRLtfMT2m72ptAhfVBG6k0utCdDqmCIZN3PpP3tgmrmZ7LtcfgjuexLPpoDcrMTfLAQ';

// Overrides dinâmicos em memória
let overrideTursoDbUrl: string | null = null;
let overrideTursoAuthToken: string | null = null;

function carregarCredenciaisDoDisco(): { dbUrl?: string; authToken?: string } | null {
  try {
    const filePath = path.join(process.cwd(), 'turso-credentials.json');
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(content);
    }
  } catch (e) {
    // Ignora erros de leitura de arquivo em ambiente restrito
  }
  return null;
}

export function getTursoDbUrl(): string {
  if (overrideTursoDbUrl && overrideTursoDbUrl.trim() !== '') {
    return overrideTursoDbUrl.trim();
  }
  const doDisco = carregarCredenciaisDoDisco();
  if (doDisco?.dbUrl && doDisco.dbUrl.trim() !== '') {
    return doDisco.dbUrl.trim();
  }
  return process.env.TURSO_DATABASE_URL || DEFAULT_TURSO_DB_URL;
}

export function getTursoAuthToken(): string {
  if (overrideTursoAuthToken && overrideTursoAuthToken.trim() !== '') {
    return overrideTursoAuthToken.trim();
  }
  const doDisco = carregarCredenciaisDoDisco();
  if (doDisco?.authToken && doDisco.authToken.trim() !== '') {
    return doDisco.authToken.trim();
  }
  return process.env.TURSO_AUTH_TOKEN || DEFAULT_TURSO_AUTH_TOKEN;
}

/**
 * Atualiza e persiste as credenciais da Turso (em memória, em turso-credentials.json e em .env.local)
 */
export function setTursoCredentials(novaUrl: string, novoToken: string): void {
  const urlLimpa = novaUrl ? novaUrl.trim() : DEFAULT_TURSO_DB_URL;
  const tokenLimpo = novoToken ? novoToken.trim() : '';

  overrideTursoDbUrl = urlLimpa;
  overrideTursoAuthToken = tokenLimpo;

  process.env.TURSO_DATABASE_URL = urlLimpa;
  process.env.TURSO_AUTH_TOKEN = tokenLimpo;

  // 1. Grava no turso-credentials.json
  try {
    const credPath = path.join(process.cwd(), 'turso-credentials.json');
    fs.writeFileSync(
      credPath,
      JSON.stringify(
        {
          dbUrl: urlLimpa,
          authToken: tokenLimpo,
          updated_at: new Date().toISOString(),
        },
        null,
        2
      ),
      'utf8'
    );
  } catch (err) {
    console.warn('Aviso: Falha ao gravar turso-credentials.json:', err);
  }

  // 2. Grava ou atualiza no .env.local
  try {
    const envPath = path.join(process.cwd(), '.env.local');
    let envContent = '';
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }

    // Atualiza TURSO_DATABASE_URL
    if (envContent.includes('TURSO_DATABASE_URL=')) {
      envContent = envContent.replace(
        /TURSO_DATABASE_URL=.*/g,
        `TURSO_DATABASE_URL="${urlLimpa}"`
      );
    } else {
      envContent += `\nTURSO_DATABASE_URL="${urlLimpa}"`;
    }

    // Atualiza TURSO_AUTH_TOKEN
    if (envContent.includes('TURSO_AUTH_TOKEN=')) {
      envContent = envContent.replace(
        /TURSO_AUTH_TOKEN=.*/g,
        `TURSO_AUTH_TOKEN="${tokenLimpo}"`
      );
    } else {
      envContent += `\nTURSO_AUTH_TOKEN="${tokenLimpo}"`;
    }

    fs.writeFileSync(envPath, envContent.trim() + '\n', 'utf8');
  } catch (err) {
    console.warn('Aviso: Falha ao atualizar .env.local:', err);
  }
}

/**
 * Normaliza a URL do Turso para HTTPS para chamadas de API
 */
export function getTursoHttpUrl(dbUrl: string = getTursoDbUrl()): string {
  if (dbUrl.startsWith('libsql://')) {
    return dbUrl.replace('libsql://', 'https://');
  }
  return dbUrl;
}

export function checkIsTursoConfigured(): boolean {
  const token = getTursoAuthToken();
  const url = getTursoDbUrl();
  return Boolean(url && token && token.trim() !== '');
}

export const isTursoConfigured = checkIsTursoConfigured();

export interface TursoQueryResult<T = any> {
  rows: T[];
  rowsAffected: number;
  lastInsertRowid?: number | string | null;
}

function formatTursoArgs(args: (string | number | boolean | null)[] = []) {
  return args.map((arg) => {
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
}

/**
 * Executa uma ou mais queries SQL no banco de dados Turso via protocolo HTTP v2
 */
export async function executeTursoQuery<T = any>(
  sql: string,
  args: (string | number | boolean | null)[] = []
): Promise<TursoQueryResult<T>> {
  const httpUrl = `${getTursoHttpUrl()}/v2/pipeline`;
  const formattedArgs = formatTursoArgs(args);

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

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const authToken = getTursoAuthToken();
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken.trim()}`;
  }

  const response = await fetch(httpUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
    cache: 'no-store',
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erro Turso HTTP [${response.status}]: ${errorText || response.statusText}`);
  }

  const data = await response.json();
  const executeResult = data.results?.[0];

  if (executeResult?.type === 'error') {
    throw new Error(`Erro de execução SQL no Turso: ${executeResult.error?.message || 'Falha desconhecida'}`);
  }

  const result = executeResult?.response?.result;

  if (!result) {
    return { rows: [], rowsAffected: 0 };
  }

  const cols: string[] = result.cols?.map((c: any) => c.name) || [];
  const rows: T[] = (result.rows || []).map((rowValues: any[]) => {
    const obj: any = {};
    cols.forEach((colName, index) => {
      const cell = rowValues[index];
      obj[colName] = cell?.value !== undefined ? cell.value : null;
    });
    return obj as T;
  });

  return {
    rows,
    rowsAffected: result.affected_row_count || 0,
    lastInsertRowid: result.last_insert_rowid,
  };
}

export interface TursoStatement {
  sql: string;
  args?: (string | number | boolean | null)[];
}

/**
 * Executa uma transação atômica completa (BEGIN TRANSACTION ... COMMIT) no Turso.
 * Se qualquer comando falhar, a transação inteira sofre rollback e lança exceção.
 */
export async function executeTursoTransaction(statements: TursoStatement[]): Promise<void> {
  if (!statements || statements.length === 0) return;

  const httpUrl = `${getTursoHttpUrl()}/v2/pipeline`;

  const requests: any[] = [
    {
      type: 'execute',
      stmt: { sql: 'BEGIN TRANSACTION', args: [] },
    },
    ...statements.map((stmt) => ({
      type: 'execute',
      stmt: {
        sql: stmt.sql,
        args: formatTursoArgs(stmt.args || []),
      },
    })),
    {
      type: 'execute',
      stmt: { sql: 'COMMIT', args: [] },
    },
    { type: 'close' },
  ];

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const authToken = getTursoAuthToken();
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken.trim()}`;
  }

  const response = await fetch(httpUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({ requests }),
    cache: 'no-store',
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erro HTTP Turso em Transação [${response.status}]: ${errorText || response.statusText}`);
  }

  const data = await response.json();
  const results = data.results || [];

  // Verifica se alguma instrução da transação retornou erro
  for (let i = 0; i < results.length; i++) {
    const res = results[i];
    if (res?.type === 'error') {
      // Tenta rollback explícito por segurança
      try {
        await executeTursoQuery('ROLLBACK;');
      } catch {}
      throw new Error(`Erro na transação Turso (instrução ${i}): ${res.error?.message || 'Falha na execução'}`);
    }
  }
}

/**
 * Executa múltiplos comandos de criação/atualização de schema no Turso
 */
export async function executeTursoBatch(statements: string[]): Promise<void> {
  const httpUrl = `${getTursoHttpUrl()}/v2/pipeline`;

  const requests: any[] = statements.map((sql) => ({
    type: 'execute',
    stmt: { sql, args: [] },
  }));

  requests.push({ type: 'close' });

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const authToken = getTursoAuthToken();
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken.trim()}`;
  }

  const response = await fetch(httpUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({ requests }),
    cache: 'no-store',
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erro Turso Batch [${response.status}]: ${errorText || response.statusText}`);
  }
}

export const tursoConfig = {
  get dbUrl() {
    return getTursoDbUrl();
  },
  get httpUrl() {
    return getTursoHttpUrl();
  },
  get isConfigured() {
    return checkIsTursoConfigured();
  },
};

let schemaAutenticacaoVerificado = false;

export async function garantirSchemaAutenticacaoProfessores(): Promise<void> {
  if (schemaAutenticacaoVerificado || !checkIsTursoConfigured()) return;

  try {
    const infoRes = await executeTursoQuery('PRAGMA table_info(professores);');
    const existingColumns = new Set((infoRes.rows || []).map((r: any) => String(r.name).toLowerCase()));

    if (!existingColumns.has('senha_hash')) {
      await executeTursoQuery('ALTER TABLE professores ADD COLUMN senha_hash TEXT;');
    }
    if (!existingColumns.has('funcao_tipo')) {
      await executeTursoQuery("ALTER TABLE professores ADD COLUMN funcao_tipo TEXT DEFAULT 'PROFESSOR';");
    }
    if (!existingColumns.has('is_admin')) {
      await executeTursoQuery('ALTER TABLE professores ADD COLUMN is_admin INTEGER DEFAULT 0;');
    }
    if (!existingColumns.has('precisa_trocar_senha')) {
      await executeTursoQuery('ALTER TABLE professores ADD COLUMN precisa_trocar_senha INTEGER DEFAULT 1;');
    }
    if (!existingColumns.has('ultimo_login')) {
      await executeTursoQuery('ALTER TABLE professores ADD COLUMN ultimo_login TEXT;');
    }

    try {
      await executeTursoQuery(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_professores_cpf_limpo 
        ON professores (REPLACE(REPLACE(REPLACE(cpf, '.', ''), '-', ''), ' ', ''))
        WHERE cpf IS NOT NULL AND cpf != '';
      `);
    } catch {}

    schemaAutenticacaoVerificado = true;
  } catch (e) {
    console.warn('Aviso em garantirSchemaAutenticacaoProfessores:', e);
  }
}

