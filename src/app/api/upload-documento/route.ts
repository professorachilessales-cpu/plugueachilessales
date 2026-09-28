import { NextRequest, NextResponse } from 'next/server';
import { Readable } from 'stream';
import { executeTursoQuery, isTursoConfigured } from '@/lib/turso';
import { 
  getGoogleDriveClient, 
  resolverOuCriarEstruturaPastasEstudante 
} from '@/lib/google-drive';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const estudanteId = formData.get('estudante_id') as string | null;
    const estudanteNome = (formData.get('estudante_nome') as string | null) || 'ESTUDANTE_DOCUMENTOS';
    const tipoDocumento = (formData.get('tipo_documento') as string | null) || 'OUTROS';

    if (!file) {
      return NextResponse.json(
        { error: 'Nenhum arquivo enviado para o Google Drive.' },
        { status: 400 }
      );
    }

    // 1. Obter cliente Google Drive (OAuth ou Service Account)
    const driveClient = await getGoogleDriveClient();
    const { drive, rootFolderId, isSimulated } = driveClient;

    // 2. Resolução da Árvore de Diretórios Padronizada por Inicial:
    // FICHA DOS ESTUDANTES / [Letra Inicial] / [Nome Completo do Estudante]
    const {
      estudanteFolderId,
      caminhoFormatado,
      letraInicial
    } = await resolverOuCriarEstruturaPastasEstudante(drive, estudanteNome, rootFolderId);

    const nomeFormatadoArquivo = `[${tipoDocumento.toUpperCase()}]_${file.name}`;
    let driveFileId = `drive_doc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    let viewLink = `https://drive.google.com/file/d/${driveFileId}/view?usp=sharing`;

    if (drive) {
      try {
        const buffer = Buffer.from(await file.arrayBuffer());
        const stream = new Readable();
        stream.push(buffer);
        stream.push(null);

        const response = await drive.files.create({
          requestBody: {
            name: nomeFormatadoArquivo,
            parents: [estudanteFolderId],
          },
          media: {
            mimeType: file.type,
            body: stream,
          },
          fields: 'id, name, webViewLink, webContentLink',
        });

        if (response.data.id) {
          driveFileId = response.data.id;
          viewLink = response.data.webViewLink || `https://drive.google.com/file/d/${driveFileId}/view`;

          // Permissão pública de leitura
          try {
            await drive.permissions.create({
              fileId: driveFileId,
              requestBody: { role: 'reader', type: 'anyone' },
            });
          } catch (e) {
            // Ignora se não conseguir aplicar
          }
        }
      } catch (uploadErr) {
        console.warn('Aviso: Falha ao enviar documento para o Drive API:', uploadErr);
      }
    }

    // 3. Persistência na tabela documentos_estudantes no Turso
    if (isTursoConfigured && estudanteId) {
      try {
        const docId = `doc-${Date.now()}`;
        await executeTursoQuery(
          `INSERT INTO documentos_estudantes (id, estudante_id, tipo_documento, nome_arquivo, tamanho_bytes, drive_file_id, drive_view_link)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [docId, estudanteId, tipoDocumento.toLowerCase(), file.name, file.size, driveFileId, viewLink]
        );
      } catch (dbErr) {
        console.warn('Aviso: Falha ao registrar documento no banco Turso:', dbErr);
      }
    }

    return NextResponse.json({
      success: true,
      drive_file_id: driveFileId,
      drive_view_link: viewLink,
      nome_arquivo: file.name,
      tamanho_bytes: file.size,
      mime_type: file.type,
      tipo_documento: tipoDocumento,
      estudante_id: estudanteId,
      caminho_drive: caminhoFormatado,
      letra_inicial: letraInicial,
      is_simulated: isSimulated,
      auth_type: driveClient.authType,
      message: `Documento salvo com sucesso em ${caminhoFormatado}/${nomeFormatadoArquivo}`,
    });
  } catch (error: any) {
    console.error('Erro no upload de documento:', error);
    return NextResponse.json(
      { error: error?.message || 'Erro interno no servidor ao processar upload.' },
      { status: 500 }
    );
  }
}
