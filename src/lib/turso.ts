// Cliente de conexão ao Turso Database (LibSQL HTTP API nativa)
// Suporta execução direta de queries SQL tanto via Edge/Node.js quanto no browser sem dependências C/C++ binárias.

const DEFAULT_TURSO_DB_URL = 'libsql://plugueachiles-achilessales.aws-us-west-2.turso.io';
const DEFAULT_TURSO_AUTH_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJnaWQiOiJiZWJmOGFkYi00NjNkLTQ2NDctYWE3Yi1hY2RiNjA3ZDA2ZjkiLCJpYXQiOjE3OTAxOTI5MjAsImtpZCI6InZXd1FEZ29POHVQc3FFY0lMOVloZzlxSm5SMjlqVWlaSWdQcW41U3AxQk0iLCJyaWQiOiIyOWE0Y2YzNS05M2FhLTRkMmUtOTA2My04NDQ1NmQ1MDNjNGMifQ.4ESQbOOPJw45FGHv9RbhRLtfMT2m72ptAhfVBG6k0utCdDqmCIZN3PpP3tgmrmZ7LtcfgjuexLPpoDcrMTfLAQ';

export function getTursoDbUrl(): string {
  return process.env.TURSO_DATABASE_URL || DEFAULT_TURSO_DB_URL;
}

export function getTursoAuthToken(): string {
  return process.env.TURSO_AUTH_TOKEN || DEFAULT_TURSO_AUTH_TOKEN;
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

/**
 * Executa uma ou mais queries SQL no banco de dados Turso via protocolo HTTP v2
 */
export async function executeTursoQuery<T = any>(
  sql: string,
  args: (string | number | boolean | null)[] = []
): Promise<TursoQueryResult<T>> {
  const httpUrl = `${getTursoHttpUrl()}/v2/pipeline`;

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

  const resultResponse = executeResult?.response?.result;
  if (!resultResponse) {
    return { rows: [], rowsAffected: 0 };
  }

  const cols: string[] = resultResponse.cols?.map((c: any) => c.name) || [];
  const rows: T[] = (resultResponse.rows || []).map((row: any[]) => {
    const obj: any = {};
    cols.forEach((colName, index) => {
      const cell = row[index];
      if (cell === null || cell === undefined || cell.type === 'null') {
        obj[colName] = null;
      } else if (cell.type === 'integer') {
        obj[colName] = Number(cell.value);
      } else if (cell.type === 'float') {
        obj[colName] = Number(cell.value);
      } else {
        obj[colName] = cell.value;
      }
    });
    return obj as T;
  });

  return {
    rows,
    rowsAffected: resultResponse.affected_row_count || 0,
    lastInsertRowid: resultResponse.last_insert_rowid,
  };
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
  dbUrl: getTursoDbUrl(),
  httpUrl: getTursoHttpUrl(),
  isConfigured: isTursoConfigured,
};
