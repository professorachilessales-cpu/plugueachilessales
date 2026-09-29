import { NextRequest, NextResponse } from 'next/server';
import { 
  carregarConfiguracaoDrive, 
  salvarConfiguracaoDrive, 
  getGoogleDriveClient,
  obterOuCriarPastaDrive 
} from '@/lib/google-drive';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const config = await carregarConfiguracaoDrive();
    const driveClient = await getGoogleDriveClient();

    const clientId = process.env.GOOGLE_CLIENT_ID || config?.client_id || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const hasClientCredentials = Boolean(clientId && clientId.trim() !== '');

    const isConnected = Number(config?.is_connected) === 1 && (driveClient.isOAuth || driveClient.isServiceAccount || driveClient.isSimulated);
    const connectedEmail = isConnected ? (config?.connected_email || driveClient.connectedEmail || null) : null;
    const rootFolderId = isConnected ? (config?.root_folder_id || driveClient.rootFolderId || null) : null;

    return NextResponse.json({
      success: true,
      is_connected: isConnected,
      connected_email: connectedEmail,
      root_folder_id: rootFolderId,
      root_folder_name: config?.root_folder_name || 'FICHA DOS ESTUDANTES',
      auth_type: isConnected ? driveClient.authType : 'disconnected',
      is_oauth: isConnected ? driveClient.isOAuth : false,
      is_service_account: isConnected ? driveClient.isServiceAccount : false,
      is_simulated: isConnected ? driveClient.isSimulated : true,
      has_client_credentials: hasClientCredentials,
      client_id_preview: clientId ? `${clientId.substring(0, 12)}...` : null,
      updated_at: config?.updated_at || null,
    });
  } catch (error: any) {
    console.error('Erro ao consultar status da conexão com Google Drive:', error);
    return NextResponse.json(
      { error: error?.message || 'Falha ao consultar status do Google Drive' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { client_id, client_secret, simular_conexao, email_simulado } = body;

    // Caso seja para salvar credenciais OAuth do Google
    if (client_id || client_secret) {
      await salvarConfiguracaoDrive({
        client_id: client_id || undefined,
        client_secret: client_secret || undefined,
      });
      return NextResponse.json({
        success: true,
        message: 'Credenciais de aplicativo Google salvas com sucesso no banco de dados.',
      });
    }

    // Modo de Conexão Rápida / Simulação (para testes locais sem console do Google ativo)
    if (simular_conexao) {
      const email = email_simulado || 'escola.plugue@gmail.com';
      const mockRootId = `drive_root_${Date.now()}`;
      await salvarConfiguracaoDrive({
        connected_email: email,
        access_token: `mock_token_${Date.now()}`,
        refresh_token: `mock_refresh_${Date.now()}`,
        expiry_date: Date.now() + 3600 * 1000,
        root_folder_id: mockRootId,
        root_folder_name: 'FICHA DOS ESTUDANTES',
        is_connected: 1,
      });

      return NextResponse.json({
        success: true,
        is_connected: true,
        connected_email: email,
        root_folder_id: mockRootId,
        message: `Conta ${email} vinculada com sucesso no Google Drive Storage!`,
      });
    }

    return NextResponse.json({ error: 'Nenhuma ação válida informada.' }, { status: 400 });
  } catch (error: any) {
    console.error('Erro ao atualizar configurações do Google Drive:', error);
    return NextResponse.json(
      { error: error?.message || 'Erro ao processar solicitação' },
      { status: 500 }
    );
  }
}
