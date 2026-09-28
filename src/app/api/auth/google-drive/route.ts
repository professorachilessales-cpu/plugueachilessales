import { NextRequest, NextResponse } from 'next/server';
import { google, carregarConfiguracaoDrive } from '@/lib/google-drive';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const origin = req.nextUrl.origin;
    const redirectUri = `${origin}/api/auth/google-drive/callback`;

    // Carrega credenciais do .env ou do banco de dados
    const dbConfig = await carregarConfiguracaoDrive();
    const clientId = process.env.GOOGLE_CLIENT_ID || dbConfig?.client_id || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET || dbConfig?.client_secret;

    if (!clientId || !clientSecret || clientId.includes('your-google-client-id')) {
      // Se não houver credenciais OAuth cadastradas ainda, retorna aviso para a tela de configurações
      return NextResponse.redirect(
        `${origin}/configuracoes?tab=storage&error=missing_credentials`
      );
    }

    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

    const scopes = [
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/drive.metadata.readonly',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
    ];

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: scopes,
      include_granted_scopes: true,
    });

    return NextResponse.redirect(authUrl);
  } catch (error: any) {
    console.error('Erro ao iniciar fluxo OAuth 2.0 do Google Drive:', error);
    const origin = req.nextUrl.origin;
    return NextResponse.redirect(
      `${origin}/configuracoes?tab=storage&error=${encodeURIComponent(error?.message || 'Falha ao autenticar')}`
    );
  }
}
