import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { 
  carregarConfiguracaoDrive, 
  salvarConfiguracaoDrive, 
  obterOuCriarPastaDrive 
} from '@/lib/google-drive';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin;
  const searchParams = req.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error || !code) {
    console.error('Erro no callback do Google OAuth:', error);
    return NextResponse.redirect(
      `${origin}/configuracoes?tab=storage&error=${encodeURIComponent(error || 'Código de autorização não recebido')}`
    );
  }

  try {
    const redirectUri = `${origin}/api/auth/google-drive/callback`;

    const dbConfig = await carregarConfiguracaoDrive();
    const clientId = process.env.GOOGLE_CLIENT_ID || dbConfig?.client_id || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET || dbConfig?.client_secret;

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(
        `${origin}/configuracoes?tab=storage&error=missing_credentials`
      );
    }

    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

    // 1. Troca o código de autorização pelos tokens
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // 2. Identifica o e-mail da conta Google conectada
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();
    const connectedEmail = userInfo.data.email || 'Conta Google Conectada';

    // 3. Localiza ou cria automaticamente a pasta raiz "FICHA DOS ESTUDANTES" no Drive da conta
    const drive = google.drive({ version: 'v3', auth: oauth2Client });
    const rootFolderId = await obterOuCriarPastaDrive(drive, 'FICHA DOS ESTUDANTES', null);

    // 4. Persiste as credenciais e o root_folder_id com segurança no banco de dados Turso
    await salvarConfiguracaoDrive({
      connected_email: connectedEmail,
      access_token: tokens.access_token || null,
      refresh_token: tokens.refresh_token || dbConfig?.refresh_token || null,
      expiry_date: tokens.expiry_date || null,
      root_folder_id: rootFolderId,
      root_folder_name: 'FICHA DOS ESTUDANTES',
      is_connected: 1,
    });

    return NextResponse.redirect(
      `${origin}/configuracoes?tab=storage&status=google_connected&email=${encodeURIComponent(connectedEmail)}`
    );
  } catch (err: any) {
    console.error('Erro no processamento do callback do Google Drive:', err);
    return NextResponse.redirect(
      `${origin}/configuracoes?tab=storage&error=${encodeURIComponent(err?.message || 'Falha ao autenticar com Google Drive')}`
    );
  }
}
