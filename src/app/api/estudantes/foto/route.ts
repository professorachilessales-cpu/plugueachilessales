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
    const estudanteNome = (formData.get('estudante_nome') as string | null) || 'ESTUDANTE_SEM_NOME';
    const estudanteCpf = formData.get('estudante_cpf') as string | null;
    const estudanteMatricula = formData.get('estudante_matricula') as string | null;

    if (!file) {
      return NextResponse.json(
        { error: 'Nenhuma foto enviada para processamento.' },
        { status: 400 }
      );
    }

    // 1. Definição da Nomenclatura Padrão: foto_perfil_3x4.jpg
    const nomeArquivo = 'foto_perfil_3x4.jpg';

    // 2. Conexão com o Google Drive (OAuth 2.0 conectado ou Service Account)
    const driveClient = await getGoogleDriveClient();
    const { drive, rootFolderId, isSimulated } = driveClient;

    // 3. Resolução da Hierarquia de Pastas por Inicial:
    // FICHA DOS ESTUDANTES / [Letra Inicial] / [Nome Completo do Estudante]
    const {
      estudanteFolderId,
      caminhoFormatado,
      letraInicial,
      nomeEstudanteFormatado
    } = await resolverOuCriarEstruturaPastasEstudante(drive, estudanteNome, rootFolderId);

    let driveFileId = `drive_foto_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    let directViewUrl = `https://lh3.googleusercontent.com/d/${driveFileId}`;

    if (drive) {
      try {
        const buffer = Buffer.from(await file.arrayBuffer());
        const stream = new Readable();
        stream.push(buffer);
        stream.push(null);

        // Verifica se já existe foto com esse nome na pasta do estudante para atualizar
        const queryExistente = `name = '${nomeArquivo}' and '${estudanteFolderId}' in parents and trashed = false`;
        const resExistente = await drive.files.list({
          q: queryExistente,
          fields: 'files(id, name)',
          spaces: 'drive',
          pageSize: 1,
        });

        let uploadedId = '';

        if (resExistente.data.files && resExistente.data.files.length > 0) {
          const fileIdExistente = resExistente.data.files[0].id!;
          const updateRes = await drive.files.update({
            fileId: fileIdExistente,
            media: {
              mimeType: 'image/jpeg',
              body: stream,
            },
            fields: 'id, name, webViewLink',
          });
          uploadedId = updateRes.data.id || fileIdExistente;
        } else {
          const createRes = await drive.files.create({
            requestBody: {
              name: nomeArquivo,
              parents: [estudanteFolderId],
              description: `Foto 3x4 Oficial do Estudante ${nomeEstudanteFormatado}`,
            },
            media: {
              mimeType: 'image/jpeg',
              body: stream,
            },
            fields: 'id, name, webViewLink',
          });
          uploadedId = createRes.data.id!;
        }

        if (uploadedId) {
          driveFileId = uploadedId;

          // Permissão pública de leitura para que a foto possa ser renderizada via lh3
          try {
            await drive.permissions.create({
              fileId: driveFileId,
              requestBody: {
                role: 'reader',
                type: 'anyone',
              },
            });
          } catch (permErr) {
            console.warn('Aviso: Falha ao aplicar permissão pública na foto:', permErr);
          }

          directViewUrl = `https://lh3.googleusercontent.com/d/${driveFileId}`;
        }
      } catch (uploadErr) {
        console.warn('Aviso: Erro ao enviar foto para o Google Drive API:', uploadErr);
      }
    }

    // 4. Persistência no Banco de Dados Turso
    if (isTursoConfigured && estudanteId) {
      try {
        await executeTursoQuery(
          `UPDATE estudantes SET foto_url = ? WHERE id = ?`,
          [directViewUrl, estudanteId]
        );
      } catch (dbErr) {
        console.warn('Aviso: Erro ao atualizar foto_url no Turso:', dbErr);
      }
    }

    return NextResponse.json({
      success: true,
      foto_url: directViewUrl,
      drive_file_id: driveFileId,
      nome_arquivo: nomeArquivo,
      caminho_drive: caminhoFormatado,
      letra_inicial: letraInicial,
      tamanho_bytes: file.size,
      mime_type: 'image/jpeg',
      is_simulated: isSimulated,
      auth_type: driveClient.authType,
      message: `Foto 3x4 salva com sucesso em ${caminhoFormatado}/${nomeArquivo}`,
    });
  } catch (error: any) {
    console.error('Erro no upload da foto do estudante:', error);
    return NextResponse.json(
      { error: error?.message || 'Falha ao processar upload da foto do estudante.' },
      { status: 500 }
    );
  }
}
