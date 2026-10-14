// Cliente de conexão ao Turso Database (LibSQL HTTP API nativa)
// Arquitetura 100% Serverless para Vercel (Edge & Node.js runtimes) sem dependências locais de disco (Zero Local Storage).

export const DEFAULT_TURSO_DB_URL = process.env.TURSO_DATABASE_URL || 'libsql://plugueachiles-achilessales.aws-us-west-2.turso.io';

// Overrides dinâmicos em memória (apenas runtime, sem acesso a disco)
let overrideTursoDbUrl: string | null = null;
let overrideTursoAuthToken: string | null = null;

export function getTursoDbUrl(): string {
  if (overrideTursoDbUrl && overrideTursoDbUrl.trim() !== '') {
    return overrideTursoDbUrl.trim();
  }
  return (process.env.TURSO_DATABASE_URL || DEFAULT_TURSO_DB_URL || '').trim();
}

export function getTursoAuthToken(): string {
  if (overrideTursoAuthToken && overrideTursoAuthToken.trim() !== '') {
    return overrideTursoAuthToken.trim();
  }
  return (process.env.TURSO_AUTH_TOKEN || '').trim();
}

/**
 * Atualiza credenciais em memória durante o ciclo de vida do processo
 * (Sem escrita no sistema de arquivos local, compatível com a Vercel)
 */
export function setTursoCredentials(novaUrl: string, novoToken: string): void {
  const urlLimpa = novaUrl ? novaUrl.trim() : DEFAULT_TURSO_DB_URL;
  const tokenLimpo = novoToken ? novoToken.trim() : '';

  overrideTursoDbUrl = urlLimpa;
  overrideTursoAuthToken = tokenLimpo;

  process.env.TURSO_DATABASE_URL = urlLimpa;
  process.env.TURSO_AUTH_TOKEN = tokenLimpo;
}

/**
 * Normaliza a URL do Turso para HTTPS para chamadas de API HTTP v2
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
  return Boolean(url && url.trim() !== '' && token && token.trim() !== '');
}

export const isTursoConfigured = checkIsTursoConfigured();

export interface TursoQueryResult<T = any> {
  rows: T[];
  rowsAffected: number;
  lastInsertRowid?: number | string | null;
}

function formatTursoArgs(args: (string | number | boolean | null | undefined)[] = []) {
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
 * Executa queries SQL no Turso via protocolo HTTP v2 Pipeline (Prepared Statements)
 */
export async function executeTursoQuery<T = any>(
  sql: string,
  args: (string | number | boolean | null | undefined)[] = []
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
  args?: (string | number | boolean | null | undefined)[];
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

  for (let i = 0; i < results.length; i++) {
    const res = results[i];
    if (res?.type === 'error') {
      try {
        await executeTursoQuery('ROLLBACK;');
      } catch {}
      throw new Error(`Erro na transação Turso (instrução ${i}): ${res.error?.message || 'Falha na execução'}`);
    }
  }
}

/**
 * Executa múltiplos comandos DDL de schema no Turso
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

// ---------------------------------------------------------------------------
// 🗄️ CACHE DISTRIBUÍDO NO TURSO (ZERO LOCAL STORAGE / ADEQUAÇÃO VERCEL)
// ---------------------------------------------------------------------------
let schemaCacheVerificado = false;

export async function garantirSchemaCache(): Promise<void> {
  if (schemaCacheVerificado || !checkIsTursoConfigured()) return;
  try {
    await executeTursoQuery(`
      CREATE TABLE IF NOT EXISTS app_cache (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        expires_at INTEGER NOT NULL,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    try {
      await executeTursoQuery(`
        CREATE INDEX IF NOT EXISTS idx_app_cache_expires_at ON app_cache (expires_at);
      `);
    } catch {}
    schemaCacheVerificado = true;
  } catch (e) {
    console.warn('Aviso ao garantir schema app_cache no Turso:', e);
  }
}

export async function getTursoCache<T = any>(key: string): Promise<T | null> {
  if (!checkIsTursoConfigured()) return null;
  try {
    await garantirSchemaCache();
    const nowSec = Math.floor(Date.now() / 1000);
    const res = await executeTursoQuery<{ value: string; expires_at: number }>(
      'SELECT value, expires_at FROM app_cache WHERE key = ? LIMIT 1',
      [key]
    );
    if (!res.rows || res.rows.length === 0) return null;
    const row = res.rows[0];
    if (row.expires_at < nowSec) {
      // Expirado - deleta assincronamente
      executeTursoQuery('DELETE FROM app_cache WHERE key = ?', [key]).catch(() => {});
      return null;
    }
    return JSON.parse(row.value) as T;
  } catch {
    return null;
  }
}

export async function setTursoCache(key: string, value: any, ttlSeconds: number): Promise<void> {
  if (!checkIsTursoConfigured()) return;
  try {
    await garantirSchemaCache();
    const nowSec = Math.floor(Date.now() / 1000);
    const expiresAt = nowSec + ttlSeconds;
    const jsonStr = JSON.stringify(value);

    await executeTursoQuery(
      `INSERT INTO app_cache (key, value, expires_at, updated_at)
       VALUES (?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(key) DO UPDATE SET
         value = excluded.value,
         expires_at = excluded.expires_at,
         updated_at = CURRENT_TIMESTAMP`,
      [key, jsonStr, expiresAt]
    );
  } catch (e) {
    console.warn(`Aviso: falha ao gravar cache no Turso [key=${key}]:`, e);
  }
}

export async function deleteTursoCache(key: string): Promise<void> {
  if (!checkIsTursoConfigured()) return;
  try {
    await executeTursoQuery('DELETE FROM app_cache WHERE key = ?', [key]);
  } catch {}
}

export async function cleanupExpiredTursoCache(): Promise<void> {
  if (!checkIsTursoConfigured()) return;
  try {
    const nowSec = Math.floor(Date.now() / 1000);
    await executeTursoQuery('DELETE FROM app_cache WHERE expires_at < ?', [nowSec]);
  } catch {}
}

// ---------------------------------------------------------------------------
// SCHEMAS E MIGRAÇÕES DEFENSIVAS
// ---------------------------------------------------------------------------
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

let schemaAtestadosVerificado = false;

export async function garantirSchemaAtestadosProfessor(): Promise<void> {
  if (schemaAtestadosVerificado || !checkIsTursoConfigured()) return;
  try {
    await executeTursoQuery(`
      CREATE TABLE IF NOT EXISTS atestados_professor (
        id TEXT PRIMARY KEY,
        professor_id TEXT NOT NULL,
        drive_file_id TEXT,
        atestado_drive_url TEXT,
        nome_arquivo TEXT,
        data_inicio TEXT NOT NULL,
        data_fim TEXT NOT NULL,
        dias_afastamento INTEGER NOT NULL DEFAULT 1,
        quantidade_dias INTEGER DEFAULT 1,
        motivo_cid TEXT,
        data_upload TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        permite_exclusao INTEGER NOT NULL DEFAULT 1
      );
    `);
    const info = await executeTursoQuery('PRAGMA table_info(atestados_professor);');
    const cols = new Set((info.rows || []).map((r: any) => String(r.name).toLowerCase()));
    if (!cols.has('atestado_drive_url')) {
      await executeTursoQuery('ALTER TABLE atestados_professor ADD COLUMN atestado_drive_url TEXT;');
    }
    if (!cols.has('quantidade_dias')) {
      await executeTursoQuery('ALTER TABLE atestados_professor ADD COLUMN quantidade_dias INTEGER DEFAULT 1;');
    }
    schemaAtestadosVerificado = true;
  } catch (e) {
    console.warn('Aviso ao garantir schema atestados_professor:', e);
  }
}
