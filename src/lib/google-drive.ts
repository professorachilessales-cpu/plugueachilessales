import { google } from 'googleapis';
import { executeTursoQuery, isTursoConfigured } from '@/lib/turso';

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
  drive: any | null;
  rootFolderId: string | null;
  connectedEmail: string | null;
  isOAuth: boolean;
  isServiceAccount: boolean;
  isSimulated: boolean;
  authType: 'oauth' | 'service_account' | 'simulated';
}

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
  drive: any,
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
  drive: any,
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
 * Carrega a configuração do Google Drive salva no Turso
 */
export async function carregarConfiguracaoDrive(): Promise<GoogleDriveConfigRow | null> {
  if (!isTursoConfigured) return null;
  try {
    const res = await executeTursoQuery<GoogleDriveConfigRow>(
      `SELECT * FROM google_drive_config WHERE id = 'default' LIMIT 1`
    );
    if (res.rows && res.rows.length > 0) {
      return res.rows[0];
    }
  } catch (err) {
    console.warn('Aviso: Tabela google_drive_config não encontrada ou indisponível:', err);
  }
  return null;
}

/**
 * Salva ou atualiza a configuração do Google Drive no Turso
 */
export async function salvarConfiguracaoDrive(dados: Partial<GoogleDriveConfigRow>): Promise<void> {
  if (!isTursoConfigured) return;

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
}

/**
 * Desconecta a conta Google Drive revogando os tokens no banco
 */
export async function desconectarContaDrive(): Promise<void> {
  if (!isTursoConfigured) return;
  await executeTursoQuery(
    `UPDATE google_drive_config SET 
      is_connected = 0, 
      access_token = NULL, 
      refresh_token = NULL, 
      connected_email = NULL,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = 'default'`
  );
}

/**
 * Obtém o cliente do Google Drive autenticado:
 * 1. Prioridade 1: OAuth 2.0 via tokens salvos no Turso
 * 2. Prioridade 2: Service Account configurada via variáveis de ambiente
 * 3. Modo Simulado / Fallback elegante para ambiente local
 */
export async function getGoogleDriveClient(): Promise<GoogleDriveClientResult> {
  // 1. Tentar autenticação via OAuth 2.0 (tokens do usuário conectado no banco)
  const dbConfig = await carregarConfiguracaoDrive();
  const clientId = process.env.GOOGLE_CLIENT_ID || dbConfig?.client_id || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || dbConfig?.client_secret;

  if (dbConfig?.is_connected && dbConfig.refresh_token) {
    try {
      const oauth2Client = new google.auth.OAuth2(
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

      const drive = google.drive({ version: 'v3', auth: oauth2Client });
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

  // 2. Tentar autenticação via Service Account (legado / servidor)
  const serviceEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawPrivateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

  if (serviceEmail && rawPrivateKey && !serviceEmail.includes('your-service-account')) {
    try {
      const privateKey = rawPrivateKey.replace(/\\n/g, '\n');
      const auth = new google.auth.JWT({
        email: serviceEmail,
        key: privateKey,
        scopes: [
          'https://www.googleapis.com/auth/drive.file',
          'https://www.googleapis.com/auth/drive',
        ],
      });

      const drive = google.drive({ version: 'v3', auth });
      return {
        drive,
        rootFolderId: dbConfig?.root_folder_id || process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID || null,
        connectedEmail: serviceEmail,
        isOAuth: false,
        isServiceAccount: true,
        isSimulated: false,
        authType: 'service_account',
      };
    } catch (saErr) {
      console.warn('Erro ao inicializar cliente Google Drive via Service Account:', saErr);
    }
  }

  // 3. Modo Simulado (quando não há chaves nem OAuth ativo)
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
  drive: any | null,
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

  // 1. Passo 1: Obter ou criar a pasta raiz "FICHA DOS ESTUDANTES"
  let rootFolderId = rootFolderIdConfigurado;
  if (rootFolderId) {
    // Valida se a pasta ainda existe com esse ID
    try {
      const checkRes = await drive.files.get({
        fileId: rootFolderId,
        fields: 'id, trashed',
      });
      if (checkRes.data.trashed) {
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
}
