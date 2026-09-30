import { NextRequest, NextResponse } from 'next/server';
import { executeTursoQuery, checkIsTursoConfigured } from '@/lib/turso';
import { 
  getGoogleDriveClient, 
  resolverOuCriarEstruturaPastasEstudante, 
  carregarConfiguracaoDrive 
} from '@/lib/google-drive';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const estudanteId = searchParams.get('estudanteId') || searchParams.get('aluno_id');
    let estudanteNome = searchParams.get('estudanteNome') || searchParams.get('nome');

    // Se temos o ID e não temos o nome, busca no Turso
    if (!estudanteNome && estudanteId && checkIsTursoConfigured()) {
      try {
        const estRes = await executeTursoQuery<{ nome_completo: string }>(
          `SELECT nome_completo FROM estudantes WHERE id = ? LIMIT 1`,
          [estudanteId]
        );
        if (estRes.rows && estRes.rows.length > 0 && estRes.rows[0].nome_completo) {
          estudanteNome = estRes.rows[0].nome_completo;
        }
      } catch (e) {
        // Ignora
      }
    }

    const config = await carregarConfiguracaoDrive();
    const driveClient = await getGoogleDriveClient();
    const rootFolderId = config?.root_folder_id || driveClient.rootFolderId;

    const nomeFormatado = (estudanteNome || 'ESTUDANTE').trim();
    const letraInicial = (nomeFormatado || 'A').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().charAt(0).toUpperCase();
    const caminhoFormatado = `FICHA DOS ESTUDANTES / ${letraInicial} / ${nomeFormatado.toUpperCase()}`;

    // Se temos cliente Google Drive ativo
    if (driveClient.drive) {
      try {
        const estrutura = await resolverOuCriarEstruturaPastasEstudante(
          driveClient.drive,
          nomeFormatado,
          rootFolderId
        );

        const folderUrl = `https://drive.google.com/drive/folders/${estrutura.estudanteFolderId}`;
        const rootFolderUrl = rootFolderId
          ? `https://drive.google.com/drive/folders/${rootFolderId}`
          : 'https://drive.google.com';

        // Lista arquivos físicos contidos na pasta do estudante no Drive
        let arquivosFisicos: any[] = [];
        try {
          const filesRes = await driveClient.drive.files.list({
            q: `'${estrutura.estudanteFolderId}' in parents and trashed = false`,
            fields: 'files(id, name, mimeType, webViewLink, webContentLink, size, createdTime)',
            pageSize: 50,
          });
          if (filesRes.data && filesRes.data.files) {
            arquivosFisicos = filesRes.data.files.map((f: any) => ({
              id: f.id,
              drive_file_id: f.id,
              nome_arquivo: f.name,
              drive_view_url: f.webViewLink || `https://drive.google.com/file/d/${f.id}/view`,
              url_visualizacao: f.webViewLink || `https://drive.google.com/file/d/${f.id}/view`,
              drive_download_url: f.webContentLink || undefined,
              mime_type: f.mimeType,
              tamanho_bytes: f.size ? parseInt(f.size, 10) : undefined,
              data_upload: f.createdTime,
              aluno_id: estudanteId,
              tipo_documento: 'outro',
            }));
          }
        } catch (filesErr) {
          console.warn('Aviso: Não foi possível listar arquivos da pasta do estudante:', filesErr);
        }

        return NextResponse.json({
          success: true,
          is_connected: true,
          folder_id: estrutura.estudanteFolderId,
          folder_url: folderUrl,
          letra_folder_id: estrutura.letraFolderId,
          root_folder_id: estrutura.rootFolderId,
          root_folder_url: rootFolderUrl,
          caminho_pasta: estrutura.caminhoFormatado,
          arquivos: arquivosFisicos,
        });
      } catch (err: any) {
        console.warn('Aviso: Erro ao resolver pasta do estudante no Drive API, aplicando fallback:', err);
      }
    }

    // Fallback inteligente se a API do Drive não responder ou estiver desconectada
    const rootFolderUrl = rootFolderId && !rootFolderId.startsWith('mock_') && !rootFolderId.startsWith('drive_root_')
      ? `https://drive.google.com/drive/folders/${rootFolderId}`
      : 'https://drive.google.com';

    const searchUrl = `https://drive.google.com/drive/u/0/search?q=${encodeURIComponent(nomeFormatado)}`;

    return NextResponse.json({
      success: true,
      is_connected: Boolean(driveClient.isOAuth || driveClient.isServiceAccount),
      folder_id: null,
      folder_url: rootFolderUrl !== 'https://drive.google.com' ? rootFolderUrl : searchUrl,
      root_folder_id: rootFolderId || null,
      root_folder_url: rootFolderUrl,
      caminho_pasta: caminhoFormatado,
      arquivos: [],
    });
  } catch (error: any) {
    console.error('Erro na rota GET /api/drive/pasta-estudante:', error);
    return NextResponse.json(
      { error: error?.message || 'Falha ao resolver pasta do estudante no Google Drive.' },
      { status: 500 }
    );
  }
}
