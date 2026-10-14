import { executeTursoQuery, checkIsTursoConfigured } from '@/lib/turso';

export interface GoogleDriveConfigRow {
  id: string;
  connected_email?: string | null;
  access_token?: string | null;
  refresh_token?: string | null;
  expiry_date?: number | null;
  root_folder_id?: string | null;
  root_folder_name?: string | null;
  is_connected?: number | null;
  client_id?: string | null;
  client_secret?: string | null;
  updated_at?: string | null;
}

export interface GoogleDriveClientResult {
  drive: GoogleDriveApiClient | any | null;
  rootFolderId: string | null;
  connectedEmail: string | null;
  isOAuth: boolean;
  isServiceAccount: boolean;
  isSimulated: boolean;
  authType: 'oauth' | 'service_account' | 'simulated';
}

/**
 * Cliente OAuth 2.0 nativo de alta performance para o Google APIs
 */
export class GoogleOAuth2Client {
  public clientId: string;
  public clientSecret: string;
  public redirectUri?: string;
  public credentials: {
    access_token?: string | null;
    refresh_token?: string | null;
    expiry_date?: number | null;
  } = {};
  private listeners: Record<string, ((...args: any[]) => void)[]> = {};

  constructor(clientId: string, clientSecret: string, redirectUri?: string) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.redirectUri = redirectUri;
  }

  generateAuthUrl(options: {
    access_type?: string;
    prompt?: string;
    scope: string[] | string;
    include_granted_scopes?: boolean;
    state?: string;
  }): string {
    const scopeStr = Array.isArray(options.scope) ? options.scope.join(' ') : options.scope;
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri || '',
      response_type: 'code',
      scope: scopeStr,
      access_type: options.access_type || 'offline',
      prompt: options.prompt || 'consent',
    });
    if (options.include_granted_scopes) {
      params.append('include_granted_scopes', 'true');
    }
    if (options.state) {
      params.append('state', options.state);
    }
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  async getToken(code: string): Promise<{ tokens: { access_token: string; refresh_token?: string; expiry_date: number } }> {
    const params = new URLSearchParams({
      code,
      client_id: this.clientId,
      client_secret: this.clientSecret,
      redirect_uri: this.redirectUri || '',
      grant_type: 'authorization_code',
    });

    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    const data = await res.json();
    if (!res.ok || data.error) {
      throw new Error(`Erro ao trocar código por tokens: ${data.error_description || data.error || res.statusText}`);
    }

    const tokens = {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expiry_date: Date.now() + (data.expires_in || 3600) * 1000,
    };
    this.setCredentials(tokens);
    return { tokens };
  }

  setCredentials(tokens: { access_token?: string | null; refresh_token?: string | null; expiry_date?: number | null }) {
    this.credentials = { ...this.credentials, ...tokens };
  }

  on(event: string, callback: (...args: any[]) => void) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
  }

  private emit(event: string, ...args: any[]) {
    if (this.listeners[event]) {
      for (const cb of this.listeners[event]) {
        cb(...args);
      }
    }
  }

  async getValidAccessToken(): Promise<string> {
    const now = Date.now();
    const expiry = this.credentials.expiry_date || 0;
    // Se o token ainda é válido por pelo menos 1 minuto, use-o
    if (this.credentials.access_token && expiry > now + 60000) {
      return this.credentials.access_token;
    }

    // Se temos refresh_token, renove o access_token automaticamente
    if (this.credentials.refresh_token) {
      try {
        const params = new URLSearchParams({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          refresh_token: this.credentials.refresh_token,
          grant_type: 'refresh_token',
        });

        const res = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: params.toString(),
        });

        const data = await res.json();
        if (res.ok && data.access_token) {
          const newTokens = {
            access_token: data.access_token,
            expiry_date: Date.now() + (data.expires_in || 3600) * 1000,
            refresh_token: data.refresh_token || this.credentials.refresh_token,
          };
          this.setCredentials(newTokens);
          this.emit('tokens', newTokens);
          return data.access_token;
        }
      } catch (e) {
        console.warn('Aviso: Falha ao renovar token com refresh_token:', e);
      }
    }

    if (this.credentials.access_token) {
      return this.credentials.access_token;
    }

    throw new Error('Nenhum access_token válido disponível. É necessário autenticar.');
  }

  async revokeToken(token: string): Promise<void> {
    try {
      await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
    } catch (e) {
      console.warn('Erro ao chamar revokeToken:', e);
    }
  }
}

/**
 * Cliente nativo para Google Drive API v3 (REST puro, zero dependências externas)
 */
export class GoogleDriveApiClient {
  private authClient: GoogleOAuth2Client | any;

  constructor(authClient: any) {
    this.authClient = authClient;
  }

  private async getAuthHeader(): Promise<string> {
    if (typeof this.authClient?.getValidAccessToken === 'function') {
      const token = await this.authClient.getValidAccessToken();
      return `Bearer ${token}`;
    }
    if (this.authClient?.credentials?.access_token) {
      return `Bearer ${this.authClient.credentials.access_token}`;
    }
    return '';
  }

  get files() {
    const client = this;
    return {
      async list(options: { q?: string; fields?: string; spaces?: string; pageSize?: number }) {
        const authHeader = await client.getAuthHeader();
        const url = new URL('https://www.googleapis.com/drive/v3/files');
        if (options.q) url.searchParams.set('q', options.q);
        if (options.fields) url.searchParams.set('fields', options.fields);
        if (options.spaces) url.searchParams.set('spaces', options.spaces);
        if (options.pageSize) url.searchParams.set('pageSize', String(options.pageSize));

        const res = await fetch(url.toString(), {
          headers: { Authorization: authHeader },
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(`Erro Drive list [${res.status}]: ${data.error?.message || res.statusText}`);
        }
        return { data };
      },

      async get(options: { fileId: string; fields?: string }) {
        const authHeader = await client.getAuthHeader();
        const url = new URL(`https://www.googleapis.com/drive/v3/files/${options.fileId}`);
        if (options.fields) url.searchParams.set('fields', options.fields);

        const res = await fetch(url.toString(), {
          headers: { Authorization: authHeader },
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(`Erro Drive get [${res.status}]: ${data.error?.message || res.statusText}`);
        }
        return { data };
      },

      async create(options: {
        requestBody: { name: string; mimeType?: string; parents?: string[]; description?: string };
        media?: { mimeType: string; body: any };
        fields?: string;
      }) {
        const authHeader = await client.getAuthHeader();
        const fields = options.fields || 'id, name, webViewLink, webContentLink';

        if (options.media) {
          // Upload Multipart (Metadados + Arquivo Binário)
          const boundary = `----GoogleDriveUploadBoundary${Date.now()}`;
          const delimiter = `\r\n--${boundary}\r\n`;
          const closeDelimiter = `\r\n--${boundary}--`;

          const metaPart = Buffer.from(
            `Content-Type: application/json; charset=UTF-8\r\n\r\n` + JSON.stringify(options.requestBody)
          );
          const mediaHeader = Buffer.from(
            `Content-Type: ${options.media.mimeType || 'application/octet-stream'}\r\n\r\n`
          );

          let mediaBuffer: Buffer;
          const body = options.media.body;
          if (Buffer.isBuffer(body)) {
            mediaBuffer = body;
          } else if (body instanceof ArrayBuffer) {
            mediaBuffer = Buffer.from(body);
          } else if (typeof body?.on === 'function') {
            mediaBuffer = await new Promise<Buffer>((resolve, reject) => {
              const chunks: Buffer[] = [];
              body.on('data', (c: any) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
              body.on('end', () => resolve(Buffer.concat(chunks)));
              body.on('error', reject);
            });
          } else {
            mediaBuffer = Buffer.from(body || '');
          }

          const multipartBody = Buffer.concat([
            Buffer.from(delimiter),
            metaPart,
            Buffer.from(delimiter),
            mediaHeader,
            mediaBuffer,
            Buffer.from(closeDelimiter),
          ]);

          const res = await fetch(
            `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=${encodeURIComponent(fields)}`,
            {
              method: 'POST',
              headers: {
                Authorization: authHeader,
                'Content-Type': `multipart/related; boundary=${boundary}`,
              },
              body: multipartBody,
            }
          );

          const data = await res.json();
          if (!res.ok) {
            throw new Error(`Erro Drive create upload [${res.status}]: ${data.error?.message || res.statusText}`);
          }
          return { data };
        } else {
          // Criação somente de pasta ou metadados
          const res = await fetch(
            `https://www.googleapis.com/drive/v3/files?fields=${encodeURIComponent(fields)}`,
            {
              method: 'POST',
              headers: {
                Authorization: authHeader,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(options.requestBody),
            }
          );
          const data = await res.json();
          if (!res.ok) {
            throw new Error(`Erro Drive create [${res.status}]: ${data.error?.message || res.statusText}`);
          }
          return { data };
        }
      },

      async update(options: {
        fileId: string;
        requestBody?: any;
        media?: { mimeType: string; body: any };
        fields?: string;
      }) {
        const authHeader = await client.getAuthHeader();
        const fields = options.fields || 'id, name, webViewLink';

        if (options.media) {
          let mediaBuffer: Buffer;
          const body = options.media.body;
          if (Buffer.isBuffer(body)) {
            mediaBuffer = body;
          } else if (body instanceof ArrayBuffer) {
            mediaBuffer = Buffer.from(body);
          } else if (typeof body?.on === 'function') {
            mediaBuffer = await new Promise<Buffer>((resolve, reject) => {
              const chunks: Buffer[] = [];
              body.on('data', (c: any) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
              body.on('end', () => resolve(Buffer.concat(chunks)));
              body.on('error', reject);
            });
          } else {
            mediaBuffer = Buffer.from(body || '');
          }

          const res = await fetch(
            `https://www.googleapis.com/upload/drive/v3/files/${options.fileId}?uploadType=media&fields=${encodeURIComponent(fields)}`,
            {
              method: 'PATCH',
              headers: {
                Authorization: authHeader,
                'Content-Type': options.media.mimeType || 'application/octet-stream',
              },
              body: mediaBuffer as any,
            }
          );
          const data = await res.json();
          if (!res.ok) {
            throw new Error(`Erro Drive update media [${res.status}]: ${data.error?.message || res.statusText}`);
          }
          return { data };
        } else {
          const res = await fetch(
            `https://www.googleapis.com/drive/v3/files/${options.fileId}?fields=${encodeURIComponent(fields)}`,
            {
              method: 'PATCH',
              headers: {
                Authorization: authHeader,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(options.requestBody || {}),
            }
          );
          const data = await res.json();
          return { data };
        }
      },

      async delete(options: { fileId: string }) {
        const authHeader = await client.getAuthHeader();
        const res = await fetch(`https://www.googleapis.com/drive/v3/files/${options.fileId}`, {
          method: 'DELETE',
          headers: { Authorization: authHeader },
        });
        if (!res.ok && res.status !== 404) {
          const errorText = await res.text().catch(() => '');
          throw new Error(`Erro Drive delete [${res.status}]: ${errorText || res.statusText}`);
        }
        return { data: { success: true } };
      },
    };
  }

  get permissions() {
    const client = this;
    return {
      async create(options: { fileId: string; requestBody: { role: string; type: string } }) {
        const authHeader = await client.getAuthHeader();
        const res = await fetch(`https://www.googleapis.com/drive/v3/files/${options.fileId}/permissions`, {
          method: 'POST',
          headers: {
            Authorization: authHeader,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(options.requestBody),
        });
        const data = await res.json();
        return { data };
      },
    };
  }
}

/**
 * Objeto unificado com a mesma assinatura do Google APIs
 */
export const google = {
  auth: {
    OAuth2: GoogleOAuth2Client,
  },
  drive: (options: { version?: string; auth: any }) => new GoogleDriveApiClient(options.auth),
  oauth2: (options: { version?: string; auth: any }) => ({
    userinfo: {
      get: async () => {
        let token = '';
        if (typeof options.auth?.getValidAccessToken === 'function') {
          token = await options.auth.getValidAccessToken();
        } else if (options.auth?.credentials?.access_token) {
          token = options.auth.credentials.access_token;
        }
        const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          throw new Error(`Erro ao obter perfil do usuário do Google: ${res.statusText}`);
        }
        const data = await res.json();
        return { data };
      },
    },
  }),
};

/**
 * Normaliza o primeiro caractere de um nome para letra inicial maiúscula sem acentos
 */
export function extrairLetraInicial(nome: string): string {
  if (!nome || !nome.trim()) return 'OUTROS';
  const limpo = nome
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
  const primeiraLetra = limpo.charAt(0);
  if (/^[A-Z]$/.test(primeiraLetra)) {
    return primeiraLetra;
  }
  return 'OUTROS';
}

/**
 * Busca uma pasta no Google Drive pelo nome e parentId
 */
export async function buscarPastaNoDrive(
  drive: GoogleDriveApiClient | any,
  nomePasta: string,
  parentId?: string | null
): Promise<string | null> {
  const nomeSeguro = nomePasta.replace(/'/g, "\\'");
  let q = `mimeType = 'application/vnd.google-apps.folder' and name = '${nomeSeguro}' and trashed = false`;
  if (parentId) {
    q += ` and '${parentId}' in parents`;
  }

  const response = await drive.files.list({
    q,
    fields: 'files(id, name)',
    spaces: 'drive',
    pageSize: 1,
  });

  if (response.data.files && response.data.files.length > 0) {
    return response.data.files[0].id!;
  }
  return null;
}

/**
 * Cria ou obtém uma pasta no Google Drive
 */
export async function obterOuCriarPastaDrive(
  drive: GoogleDriveApiClient | any,
  nomePasta: string,
  parentId?: string | null
): Promise<string> {
  const existente = await buscarPastaNoDrive(drive, nomePasta, parentId);
  if (existente) return existente;

  const requestBody: { name: string; mimeType: string; parents?: string[] } = {
    name: nomePasta,
    mimeType: 'application/vnd.google-apps.folder',
  };
  if (parentId) {
    requestBody.parents = [parentId];
  }

  const res = await drive.files.create({
    requestBody,
    fields: 'id, name',
  });

  return res.data.id!;
}

/**
 * Garante que a tabela google_drive_config existe no Turso
 */
export async function garantirTabelaConfigDriveTurso(): Promise<void> {
  if (!checkIsTursoConfigured()) return;
  try {
    await executeTursoQuery(`
      CREATE TABLE IF NOT EXISTS google_drive_config (
        id TEXT PRIMARY KEY DEFAULT 'default',
        connected_email TEXT,
        access_token TEXT,
        refresh_token TEXT,
        expiry_date INTEGER,
        root_folder_id TEXT,
        root_folder_name TEXT DEFAULT 'FICHA DOS ESTUDANTES',
        is_connected INTEGER DEFAULT 0,
        client_id TEXT,
        client_secret TEXT,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);
  } catch (e) {
    // Tabela já existe ou não foi possível criar
  }
}

/**
 * Carrega a configuração do Google Drive salva no Turso (com fallback para variáveis de ambiente)
 */
export async function carregarConfiguracaoDrive(): Promise<GoogleDriveConfigRow | null> {
  if (checkIsTursoConfigured()) {
    try {
      await garantirTabelaConfigDriveTurso();
      const res = await executeTursoQuery<GoogleDriveConfigRow>(
        `SELECT * FROM google_drive_config WHERE id = 'default' LIMIT 1`
      );
      if (res.rows && res.rows.length > 0) {
        return res.rows[0];
      }
    } catch (err) {
      console.warn('Aviso: Falha ao consultar google_drive_config no Turso:', err);
    }
  }

  // Fallback seguro para variáveis de ambiente da Vercel / Servidor
  const envClientId = process.env.GOOGLE_CLIENT_ID;
  const envClientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const envFolderId = process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID;

  if (envClientId && envClientSecret) {
    return {
      id: 'default',
      client_id: envClientId,
      client_secret: envClientSecret,
      root_folder_id: envFolderId || null,
      root_folder_name: 'FICHA DOS ESTUDANTES',
      is_connected: 1,
    };
  }

  return null;
}

/**
 * Salva ou atualiza a configuração do Google Drive exclusivamente no banco Turso
 */
export async function salvarConfiguracaoDrive(dados: Partial<GoogleDriveConfigRow>): Promise<void> {
  const atual = await carregarConfiguracaoDrive();
  const merged: GoogleDriveConfigRow = {
    id: 'default',
    connected_email: dados.connected_email !== undefined ? dados.connected_email : atual?.connected_email,
    access_token: dados.access_token !== undefined ? dados.access_token : atual?.access_token,
    refresh_token: dados.refresh_token !== undefined ? dados.refresh_token : atual?.refresh_token,
    expiry_date: dados.expiry_date !== undefined ? dados.expiry_date : atual?.expiry_date,
    root_folder_id: dados.root_folder_id !== undefined ? dados.root_folder_id : atual?.root_folder_id,
    root_folder_name: 'FICHA DOS ESTUDANTES',
    is_connected: dados.is_connected !== undefined ? dados.is_connected : (atual?.is_connected ?? 1),
    client_id: dados.client_id !== undefined ? dados.client_id : atual?.client_id,
    client_secret: dados.client_secret !== undefined ? dados.client_secret : atual?.client_secret,
    updated_at: new Date().toISOString(),
  };

  // Salva exclusivamente no banco de dados Turso (Zero Local Storage)

  // Salva no banco de dados Turso
  if (checkIsTursoConfigured()) {
    try {
      await garantirTabelaConfigDriveTurso();
      await executeTursoQuery(
        `INSERT INTO google_drive_config (
          id, connected_email, access_token, refresh_token, expiry_date,
          root_folder_id, root_folder_name, is_connected, client_id, client_secret, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          connected_email = excluded.connected_email,
          access_token = excluded.access_token,
          refresh_token = excluded.refresh_token,
          expiry_date = excluded.expiry_date,
          root_folder_id = excluded.root_folder_id,
          root_folder_name = excluded.root_folder_name,
          is_connected = excluded.is_connected,
          client_id = excluded.client_id,
          client_secret = excluded.client_secret,
          updated_at = excluded.updated_at`,
        [
          merged.id,
          merged.connected_email || null,
          merged.access_token || null,
          merged.refresh_token || null,
          merged.expiry_date || null,
          merged.root_folder_id || null,
          merged.root_folder_name || 'FICHA DOS ESTUDANTES',
          merged.is_connected ? 1 : 0,
          merged.client_id || null,
          merged.client_secret || null,
          merged.updated_at || new Date().toISOString(),
        ]
      );
    } catch (err) {
      console.warn('Aviso: Falha ao persistir google_drive_config no Turso:', err);
    }
  }
}

/**
 * Desconecta a conta Google Drive revogando os tokens no Google e limpando o banco
 */
export async function desconectarContaDrive(): Promise<void> {
  const config = await carregarConfiguracaoDrive();

  // Tenta revogar o token junto ao endpoint oficial do Google OAuth
  if (config?.access_token || config?.refresh_token) {
    try {
      const clientId = process.env.GOOGLE_CLIENT_ID || config?.client_id || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET || config?.client_secret || '';
      const oauth2Client = new GoogleOAuth2Client(clientId, clientSecret);
      const tokenToRevoke = config.refresh_token || config.access_token;
      if (tokenToRevoke && !tokenToRevoke.startsWith('mock_')) {
        await oauth2Client.revokeToken(tokenToRevoke);
      }
    } catch (revErr) {
      console.warn('Aviso: Erro ao revogar token no Google OAuth (pode já estar revogado):', revErr);
    }
  }

  // Atualiza no Turso
  if (checkIsTursoConfigured()) {
    try {
      await garantirTabelaConfigDriveTurso();
      await executeTursoQuery(
        `INSERT INTO google_drive_config (id, is_connected, access_token, refresh_token, connected_email, updated_at)
         VALUES ('default', 0, NULL, NULL, NULL, CURRENT_TIMESTAMP)
         ON CONFLICT(id) DO UPDATE SET 
          is_connected = 0, 
          access_token = NULL, 
          refresh_token = NULL, 
          connected_email = NULL,
          updated_at = CURRENT_TIMESTAMP`
      );
    } catch (err) {
      console.warn('Aviso ao atualizar Turso na desconexão:', err);
    }
  }
}

/**
 * Obtém o cliente do Google Drive autenticado:
 * 1. Prioridade 1: OAuth 2.0 via tokens salvos no Turso ou disco
 * 2. Prioridade 2: Service Account configurada via variáveis de ambiente
 * 3. Modo Simulado / Fallback elegante para ambiente local
 */
export async function getGoogleDriveClient(): Promise<GoogleDriveClientResult> {
  // 1. Tentar autenticação via OAuth 2.0 (tokens do usuário conectado)
  const dbConfig = await carregarConfiguracaoDrive();
  const clientId = process.env.GOOGLE_CLIENT_ID || dbConfig?.client_id || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || dbConfig?.client_secret;

  if (dbConfig && Number(dbConfig.is_connected) === 1 && dbConfig.refresh_token) {
    // Caso seja modo de teste com token simulado
    if (dbConfig.refresh_token.startsWith('mock_') || dbConfig.access_token?.startsWith('mock_')) {
      return {
        drive: null,
        rootFolderId: dbConfig.root_folder_id || 'mock_root_ficha_estudantes',
        connectedEmail: dbConfig.connected_email || null,
        isOAuth: true,
        isServiceAccount: false,
        isSimulated: true,
        authType: 'oauth',
      };
    }

    try {
      const oauth2Client = new GoogleOAuth2Client(
        clientId || 'dummy-client-id',
        clientSecret || 'dummy-client-secret'
      );

      oauth2Client.setCredentials({
        access_token: dbConfig.access_token || undefined,
        refresh_token: dbConfig.refresh_token,
        expiry_date: dbConfig.expiry_date || undefined,
      });

      // Atualiza o token se houver evento de renovação automática
      oauth2Client.on('tokens', async (tokens) => {
        try {
          await salvarConfiguracaoDrive({
            access_token: tokens.access_token,
            expiry_date: tokens.expiry_date,
            refresh_token: tokens.refresh_token || dbConfig.refresh_token,
          });
        } catch (e) {
          console.warn('Erro ao persistir novo token renovado:', e);
        }
      });

      const drive = new GoogleDriveApiClient(oauth2Client);
      return {
        drive,
        rootFolderId: dbConfig.root_folder_id || null,
        connectedEmail: dbConfig.connected_email || null,
        isOAuth: true,
        isServiceAccount: false,
        isSimulated: false,
        authType: 'oauth',
      };
    } catch (oauthErr) {
      console.warn('Erro ao inicializar cliente Google Drive via OAuth 2.0:', oauthErr);
    }
  }

  // 2. Modo Simulado (quando não há chaves nem OAuth ativo)
  return {
    drive: null,
    rootFolderId: dbConfig?.root_folder_id || 'mock_root_ficha_estudantes',
    connectedEmail: dbConfig?.connected_email || null,
    isOAuth: false,
    isServiceAccount: false,
    isSimulated: true,
    authType: 'simulated',
  };
}

/**
 * Resolução recursiva da árvore padronizada por inicial:
 *
 * FICHA DOS ESTUDANTES/
 * └── [Letra Inicial Maiúscula]/
 *     └── [Nome Completo do Estudante]/
 *         ├── foto_perfil_3x4.jpg
 *         └── [Documentos / Repositório Geral]
 */
export async function resolverOuCriarEstruturaPastasEstudante(
  drive: GoogleDriveApiClient | any | null,
  nomeEstudante: string,
  rootFolderIdConfigurado?: string | null
): Promise<{
  rootFolderId: string;
  letraFolderId: string;
  estudanteFolderId: string;
  caminhoFormatado: string;
  letraInicial: string;
  nomeEstudanteFormatado: string;
}> {
  const letraInicial = extrairLetraInicial(nomeEstudante);
  const nomeEstudanteFormatado = (nomeEstudante || 'ESTUDANTE_SEM_NOME').trim().toUpperCase();

  // Caso esteja em modo simulado
  if (!drive) {
    const rootFolderId = rootFolderIdConfigurado || 'mock_root_ficha_estudantes';
    const letraFolderId = `mock_folder_letra_${letraInicial}`;
    const estudanteFolderId = `mock_folder_${nomeEstudanteFormatado.replace(/\s+/g, '_')}`;
    return {
      rootFolderId,
      letraFolderId,
      estudanteFolderId,
      caminhoFormatado: `FICHA DOS ESTUDANTES / ${letraInicial} / ${nomeEstudanteFormatado}`,
      letraInicial,
      nomeEstudanteFormatado,
    };
  }

  try {
    // 1. Passo 1: Obter ou criar a pasta raiz "FICHA DOS ESTUDANTES"
    let rootFolderId = rootFolderIdConfigurado;
    if (rootFolderId) {
      // Valida se a pasta ainda existe com esse ID
      try {
        const checkRes = await drive.files.get({
          fileId: rootFolderId,
          fields: 'id, trashed',
        });
        if (checkRes.data?.trashed) {
          rootFolderId = null;
        }
      } catch (e) {
        rootFolderId = null; // ID inválido ou inacessível, re-busca/cria
      }
    }

    if (!rootFolderId) {
      rootFolderId = await obterOuCriarPastaDrive(drive, 'FICHA DOS ESTUDANTES', null);
      // Salva o root_folder_id nas configurações para não repetir a busca
      try {
        await salvarConfiguracaoDrive({ root_folder_id: rootFolderId });
      } catch (e) {
        // Ignora erro assíncrono de persistência
      }
    }

    // 2. Passo 2: Obter ou criar a pasta da Letra Inicial (ex: "A", "B", "C")
    const letraFolderId = await obterOuCriarPastaDrive(drive, letraInicial, rootFolderId);

    // 3. Passo 3: Obter ou criar a pasta do Estudante dentro da Letra Inicial
    const estudanteFolderId = await obterOuCriarPastaDrive(
      drive,
      nomeEstudanteFormatado,
      letraFolderId
    );

    return {
      rootFolderId,
      letraFolderId,
      estudanteFolderId,
      caminhoFormatado: `FICHA DOS ESTUDANTES / ${letraInicial} / ${nomeEstudanteFormatado}`,
      letraInicial,
      nomeEstudanteFormatado,
    };
  } catch (driveErr) {
    console.warn('Aviso: Falha ao resolver árvore no Google Drive (usando fallback estruturado):', driveErr);
    const rootFolderId = rootFolderIdConfigurado || 'mock_root_ficha_estudantes';
    const letraFolderId = `folder_letra_${letraInicial}`;
    const estudanteFolderId = `folder_${nomeEstudanteFormatado.replace(/\s+/g, '_')}`;
    return {
      rootFolderId,
      letraFolderId,
      estudanteFolderId,
      caminhoFormatado: `FICHA DOS ESTUDANTES / ${letraInicial} / ${nomeEstudanteFormatado}`,
      letraInicial,
      nomeEstudanteFormatado,
    };
  }
}

/**
 * Resolução recursiva da árvore padronizada por inicial para Professores:
 *
 * FICHA DOS PROFESSORES /
 * └── [Letra Inicial Maiúscula]/        (Ex: A, B, C...)
 *     └── [Nome Completo do Professor]/  (Ex: ANA CLAUDIA DA SILVA)
 *         └── atestado_medico_[DATA].pdf
 */
export async function resolverOuCriarEstruturaPastasProfessor(
  drive: GoogleDriveApiClient | any | null,
  nomeProfessor: string,
  rootFolderIdConfigurado?: string | null
): Promise<{
  rootFolderId: string;
  letraFolderId: string;
  professorFolderId: string;
  caminhoFormatado: string;
  letraInicial: string;
  nomeProfessorFormatado: string;
}> {
  const letraInicial = extrairLetraInicial(nomeProfessor);
  const nomeProfessorFormatado = (nomeProfessor || 'PROFESSOR_SEM_NOME').trim().toUpperCase();

  // Modo simulado ou fallback
  if (!drive) {
    const rootFolderId = rootFolderIdConfigurado || 'mock_root_ficha_professores';
    const letraFolderId = `mock_folder_letra_${letraInicial}`;
    const professorFolderId = `mock_folder_${nomeProfessorFormatado.replace(/\s+/g, '_')}`;
    return {
      rootFolderId,
      letraFolderId,
      professorFolderId,
      caminhoFormatado: `FICHA DOS PROFESSORES / ${letraInicial} / ${nomeProfessorFormatado}`,
      letraInicial,
      nomeProfessorFormatado,
    };
  }

  try {
    // 1. Localizar ou criar a pasta raiz "FICHA DOS PROFESSORES"
    const pastaProfessoresId = await obterOuCriarPastaDrive(drive, 'FICHA DOS PROFESSORES', null);

    // 2. Obter a primeira letra do nome em maiúscula e localizar/criar a subpasta da letra
    const letraFolderId = await obterOuCriarPastaDrive(drive, letraInicial, pastaProfessoresId);

    // 3. Localizar ou criar a pasta com o Nome Completo do Professor dentro da pasta da letra
    const professorFolderId = await obterOuCriarPastaDrive(
      drive,
      nomeProfessorFormatado,
      letraFolderId
    );

    return {
      rootFolderId: pastaProfessoresId,
      letraFolderId,
      professorFolderId,
      caminhoFormatado: `FICHA DOS PROFESSORES / ${letraInicial} / ${nomeProfessorFormatado}`,
      letraInicial,
      nomeProfessorFormatado,
    };
  } catch (driveErr) {
    console.warn('Aviso: Falha ao resolver árvore do professor no Google Drive:', driveErr);
    const rootFolderId = rootFolderIdConfigurado || 'mock_root_ficha_professores';
    const letraFolderId = `folder_letra_${letraInicial}`;
    const professorFolderId = `folder_${nomeProfessorFormatado.replace(/\s+/g, '_')}`;
    return {
      rootFolderId,
      letraFolderId,
      professorFolderId,
      caminhoFormatado: `FICHA DOS PROFESSORES / ${letraInicial} / ${nomeProfessorFormatado}`,
      letraInicial,
      nomeProfessorFormatado,
    };
  }
}

export function isRealDriveId(id?: string | null): boolean {
  if (!id || typeof id !== 'string') return false;
  const limpo = id.trim();
  if (
    limpo.startsWith('drive_') ||
    limpo.startsWith('mock_') ||
    limpo.endsWith('_mock') ||
    limpo.includes('mock') ||
    limpo.startsWith('doc-') ||
    limpo === 'default' ||
    limpo.length < 25
  ) {
    return false;
  }
  return /^[a-zA-Z0-9_-]{25,50}$/.test(limpo);
}

export interface ExcluirArquivoDriveParams {
  fileId?: string;
  docId?: string;
  nomeArquivo?: string;
  estudanteId?: string;
  professorId?: string;
  faltaId?: string;
  usuario: {
    userId: string;
    userName: string;
    userRole?: string;
  };
}

export interface ExcluirArquivoDriveResult {
  success: boolean;
  fileId: string;
  estudanteId?: string;
  professorId?: string;
  faltaId?: string;
  nomeArquivo: string;
  message: string;
}

/**
 * Exclui fisicamente o arquivo do Google Drive, limpa registros locais associados e registra auditoria
 */
export async function excluirArquivoDriveComAuditoria(
  params: ExcluirArquivoDriveParams
): Promise<ExcluirArquivoDriveResult> {
  const { docId, estudanteId, professorId, faltaId, usuario } = params;
  let fileId = params.fileId || '';
  let nomeArquivo = params.nomeArquivo || '';

  // 1. Obter cliente do Google Drive
  const driveClient = await getGoogleDriveClient();
  const { drive } = driveClient;

  // 1.1 Se fileId não for um ID real do Drive, tenta resolver consultando o Turso
  if (checkIsTursoConfigured() && (!fileId || !isRealDriveId(fileId))) {
    try {
      const lookup = await executeTursoQuery<{ id: string; drive_file_id: string; nome_arquivo: string }>(
        `SELECT id, drive_file_id, nome_arquivo FROM documentos_estudantes 
         WHERE (id = ? AND id != '')
            OR (drive_file_id = ? AND drive_file_id != '')
            OR (? != '' AND ? != '' AND estudante_id = ? AND nome_arquivo = ?)
         LIMIT 1`,
        [docId || fileId || '', fileId || docId || '', estudanteId || '', nomeArquivo || '', estudanteId || '', nomeArquivo || '']
      );
      if (lookup.rows && lookup.rows.length > 0) {
        const found = lookup.rows[0];
        if (found.drive_file_id && isRealDriveId(found.drive_file_id)) {
          fileId = found.drive_file_id;
        }
        if (!nomeArquivo && found.nome_arquivo) {
          nomeArquivo = found.nome_arquivo;
        }
      }
    } catch {
      // Ignora erro de lookup preliminar
    }
  }

  // 2. Se não temos o nome do arquivo, busca metadados antes de excluir
  if (!nomeArquivo && drive && fileId && isRealDriveId(fileId)) {
    try {
      const meta = await drive.files.get({ fileId, fields: 'id, name, mimeType' });
      if (meta?.data?.name) {
        nomeArquivo = meta.data.name;
      }
    } catch {
      // Ignora erro se não puder consultar
    }
  }
  if (!nomeArquivo) {
    nomeArquivo = fileId ? `arquivo_${fileId}` : (docId || 'documento');
  }

  // 3. Exclusão física no Google Drive autenticado
  if (drive && !driveClient.isSimulated && fileId && isRealDriveId(fileId)) {
    try {
      await drive.files.delete({ fileId });
    } catch (err: any) {
      console.warn('Aviso: Erro ao deletar arquivo no Google Drive API:', err?.message || err);
    }
  }

  // Se tivermos estudanteId e nomeArquivo, busca e deleta na pasta do estudante eventuais réplicas
  if (drive && !driveClient.isSimulated && estudanteId && nomeArquivo) {
    try {
      const config = await carregarConfiguracaoDrive();
      const rootFolderId = config?.root_folder_id || driveClient.rootFolderId;
      let nomeEstudante = '';
      if (checkIsTursoConfigured()) {
        const estRes = await executeTursoQuery<{ nome_completo: string }>(
          `SELECT nome_completo FROM estudantes WHERE id = ? LIMIT 1`,
          [estudanteId]
        );
        if (estRes.rows && estRes.rows[0]?.nome_completo) {
          nomeEstudante = estRes.rows[0].nome_completo;
        }
      }
      if (nomeEstudante) {
        const estrutura = await resolverOuCriarEstruturaPastasEstudante(drive, nomeEstudante, rootFolderId);
        if (estrutura.estudanteFolderId) {
          const dupFiles = await drive.files.list({
            q: `'${estrutura.estudanteFolderId}' in parents and name = '${nomeArquivo.replace(/'/g, "\\'")}' and trashed = false`,
            fields: 'files(id, name)',
          });
          if (dupFiles.data?.files && dupFiles.data.files.length > 0) {
            for (const dup of dupFiles.data.files) {
              if (dup.id && dup.id !== fileId) {
                try {
                  await drive.files.delete({ fileId: dup.id });
                } catch {}
              }
            }
          }
        }
      }
    } catch {
      // Ignora erro secundário
    }
  }

  const agoraIso = new Date().toISOString();
  const usuarioId = usuario.userId || 'sistema';
  const usuarioNome = usuario.userName || 'Equipe Escolar';

  // 4. Tratamento de registros associados no banco de dados local (Turso)
  if (checkIsTursoConfigured()) {
    try {
      // Remove das tabelas de documentos do estudante de forma abrangente
      await executeTursoQuery(
        `DELETE FROM documentos_estudantes 
         WHERE (drive_file_id = ? AND ? != '')
            OR (id = ? AND ? != '')
            OR (id = ? AND ? != '')
            OR (? != '' AND ? != '' AND estudante_id = ? AND (nome_arquivo = ? OR LOWER(nome_arquivo) = LOWER(?)))`,
        [
          fileId, fileId,
          docId || '', docId || '',
          fileId, fileId,
          estudanteId || '', nomeArquivo || '', estudanteId || '', nomeArquivo || '', nomeArquivo || ''
        ]
      );

      await executeTursoQuery(
        `DELETE FROM documentos_estudante 
         WHERE (drive_file_id = ? AND ? != '')
            OR (id = ? AND ? != '')
            OR (id = ? AND ? != '')
            OR (? != '' AND ? != '' AND aluno_id = ? AND (nome_arquivo = ? OR LOWER(nome_arquivo) = LOWER(?)))`,
        [
          fileId, fileId,
          docId || '', docId || '',
          fileId, fileId,
          estudanteId || '', nomeArquivo || '', estudanteId || '', nomeArquivo || '', nomeArquivo || ''
        ]
      );

      // Remove de atestados de professor se aplicável
      if (fileId || docId) {
        await executeTursoQuery(
          `DELETE FROM atestados_professor WHERE drive_file_id = ? OR id = ?`,
          [fileId || docId || '', docId || fileId || '']
        );
      }

      // Desvincula atestado de faltas_professores e ausencias_docentes
      if (fileId || docId || faltaId) {
        try {
          await executeTursoQuery(
            `UPDATE faltas_professores 
             SET atestado_drive_url = NULL, atestado_drive_link = NULL, drive_file_id = NULL, atestado_drive_id = NULL 
             WHERE drive_file_id = ? OR atestado_drive_id = ? OR id = ?`,
            [fileId || '', fileId || '', faltaId || docId || '']
          );
        } catch {}
        try {
          await executeTursoQuery(
            `UPDATE ausencias_docentes 
             SET atestado_drive_url = NULL, drive_file_id = NULL 
             WHERE drive_file_id = ? OR id = ?`,
            [fileId || '', faltaId || docId || '']
          );
        } catch {}
      }

      // Se o arquivo excluído for foto de perfil do aluno (foto_perfil_3x4.jpg ou similar), defina foto_url = NULL
      const isFotoPerfil =
        nomeArquivo.toLowerCase().includes('foto_perfil_3x4') ||
        nomeArquivo.toLowerCase().startsWith('[foto') ||
        nomeArquivo.toLowerCase().includes('foto_3x4') ||
        nomeArquivo.toLowerCase().includes('perfil');

      if (isFotoPerfil && estudanteId) {
        await executeTursoQuery(
          `UPDATE estudantes SET foto_url = NULL WHERE id = ?`,
          [estudanteId]
        );
      } else if (isFotoPerfil && fileId) {
        await executeTursoQuery(
          `UPDATE estudantes SET foto_url = NULL WHERE foto_url LIKE ?`,
          [`%${fileId}%`]
        );
      }

      // 5. Registro Obrigatório na Auditoria do Sistema (auditoria_sistema e repositorio_auditoria)
      const auditId = `aud-drive-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const isAtestadoDocente = Boolean(faltaId || professorId || nomeArquivo.toLowerCase().includes('atestado'));
      const descricao = isAtestadoDocente
        ? `Exclusão de atestado médico da ausência docente: ${nomeArquivo}`
        : `Exclusão do arquivo: ${nomeArquivo}`;

      await executeTursoQuery(
        `INSERT INTO auditoria_sistema (
          id,
          estudante_id,
          acao,
          descricao,
          recurso_id,
          drive_file_id,
          nome_arquivo,
          usuario_id,
          usuario_nome,
          data_exclusao,
          created_at
        ) VALUES (?, ?, 'EXCLUSAO_ARQUIVO_DRIVE', ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          auditId,
          estudanteId || null,
          descricao,
          faltaId || fileId || docId || 'sem_id',
          fileId || docId || 'sem_id',
          nomeArquivo,
          usuarioId,
          usuarioNome,
          agoraIso,
          agoraIso,
        ]
      );

      try {
        await executeTursoQuery(
          `INSERT INTO repositorio_auditoria (
            id,
            estudante_id,
            acao,
            descricao,
            recurso_id,
            drive_file_id,
            nome_arquivo,
            usuario_id,
            usuario_nome,
            data_exclusao,
            created_at
          ) VALUES (?, ?, 'EXCLUSAO_ARQUIVO_DRIVE', ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            auditId,
            estudanteId || null,
            descricao,
            faltaId || fileId || docId || 'sem_id',
            fileId || docId || 'sem_id',
            nomeArquivo,
            usuarioId,
            usuarioNome,
            agoraIso,
            agoraIso,
          ]
        );
      } catch {}
    } catch (dbErr) {
      console.warn('Aviso ao registrar auditoria de exclusão do Drive no Turso:', dbErr);
    }
  }

  return {
    success: true,
    fileId,
    estudanteId,
    professorId,
    faltaId,
    nomeArquivo,
    message: `Arquivo "${nomeArquivo}" excluído com sucesso do Google Drive e registrado na auditoria.`,
  };
}

