import { NextRequest, NextResponse } from 'next/server';
import { Readable } from 'stream';
import { executeTursoQuery, isTursoConfigured } from '@/lib/turso';
import { normalizarNomeParaDrive } from '@/lib/security';

export const dynamic = 'force-dynamic';

/**
 * Função utilitária para buscar ou criar uma pasta no Google Drive de forma recursiva
 */
async function obterOuCriarPasta(
  drive: any,
  nomePasta: string,
  parentFolderId?: string
): Promise<string> {
  const nomeSeguro = nomePasta.replace(/'/g, "\\'");
  let query = `mimeType = 'application/vnd.google-apps.folder' and name = '${nomeSeguro}' and trashed = false`;
  if (parentFolderId) {
    query += ` and '${parentFolderId}' in parents`;
  }

  const response = await drive.files.list({
    q: query,
    fields: 'files(id, name)',
    spaces: 'drive',
    pageSize: 1,
  });

  if (response.data.files && response.data.files.length > 0) {
    return response.data.files[0].id!;
  }

  // Cria a pasta caso ainda não exista
  const requestBody: { name: string; mimeType: string; parents?: string[] } = {
    name: nomePasta,
    mimeType: 'application/vnd.google-apps.folder',
  };
  if (parentFolderId) {
    requestBody.parents = [parentFolderId];
  }

  const novaPasta = await drive.files.create({
    requestBody,
    fields: 'id, name',
  });

  return novaPasta.data.id!;
}

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

    // 1. Definição da Nomenclatura do Arquivo (foto_perfil_3x4.jpg ou {cpf_ou_matricula}_foto_3x4.jpg)
    let nomeArquivo = 'foto_perfil_3x4.jpg';
    const identificador = (estudanteCpf || estudanteMatricula || '')
      .replace(/\D/g, '')
      .trim();

    if (identificador && identificador !== '11111111111' && identificador !== '00000000000') {
      nomeArquivo = `${identificador}_foto_3x4.jpg`;
    } else if (estudanteCpf && estudanteCpf.trim()) {
      const safeCpf = estudanteCpf.replace(/[^a-zA-Z0-9_-]/g, '_');
      nomeArquivo = `${safeCpf}_foto_3x4.jpg`;
    }

    // Normalização do nome para a subpasta do aluno
    const nomePastaEstudante = estudanteNome.trim().toUpperCase() || 'ESTUDANTE';

    const serviceEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const rawPrivateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
    const parentFolderId = process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID;

    let driveFileId = `drive_foto_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    let directViewUrl = `https://lh3.googleusercontent.com/d/${driveFileId}`;
    let isSimulated = true;
    let caminhoCompletoDrive = `PLUGUE / FICHA DOS ESTUDANTES / ${nomePastaEstudante}`;

    // 2. Integração com a Google Drive API (v3) com criação recursiva de pastas
    if (serviceEmail && rawPrivateKey && !serviceEmail.includes('your-service-account')) {
      try {
        const { google } = await import('googleapis');
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

        // Passo 2.1: Obter ou criar pasta raiz da aplicação "PLUGUE"
        const pastaPlugueId = await obterOuCriarPasta(
          drive,
          'PLUGUE',
          parentFolderId || undefined
        );

        // Passo 2.2: Obter ou criar subpasta "FICHA DOS ESTUDANTES" dentro de "PLUGUE"
        const pastaFichaId = await obterOuCriarPasta(
          drive,
          'FICHA DOS ESTUDANTES',
          pastaPlugueId
        );

        // Passo 2.3: Obter ou criar subpasta com o nome do estudante dentro de "FICHA DOS ESTUDANTES"
        const pastaEstudanteId = await obterOuCriarPasta(
          drive,
          nomePastaEstudante,
          pastaFichaId
        );

        // Passo 2.4: Upload do arquivo foto_perfil_3x4.jpg
        const buffer = Buffer.from(await file.arrayBuffer());
        const stream = new Readable();
        stream.push(buffer);
        stream.push(null);

        // Verifica se já existe uma foto de perfil anterior na pasta do estudante para atualizar ou substituir
        const existingFotoQuery = `name = '${nomeArquivo}' and '${pastaEstudanteId}' in parents and trashed = false`;
        const existingFotoRes = await drive.files.list({
          q: existingFotoQuery,
          fields: 'files(id, name)',
          spaces: 'drive',
          pageSize: 1,
        });

        let uploadedFileId = '';

        if (existingFotoRes.data.files && existingFotoRes.data.files.length > 0) {
          // Atualiza o arquivo existente
          const existingFileId = existingFotoRes.data.files[0].id!;
          const updateRes = await drive.files.update({
            fileId: existingFileId,
            media: {
              mimeType: 'image/jpeg',
              body: stream,
            },
            fields: 'id, name, webViewLink',
          });
          uploadedFileId = updateRes.data.id || existingFileId;
        } else {
          // Cria novo arquivo
          const createRes = await drive.files.create({
            requestBody: {
              name: nomeArquivo,
              parents: [pastaEstudanteId],
              description: `Foto 3x4 Oficial do Estudante ${nomePastaEstudante}`,
            },
            media: {
              mimeType: 'image/jpeg',
              body: stream,
            },
            fields: 'id, name, webViewLink',
          });
          uploadedFileId = createRes.data.id!;
        }

        if (uploadedFileId) {
          driveFileId = uploadedFileId;

          // Passo 2.5: Permissão pública de leitura para que a imagem possa ser renderizada via lh3
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

          // Link direto oficial de visualização e renderização do Googleusercontent
          directViewUrl = `https://lh3.googleusercontent.com/d/${driveFileId}`;
          isSimulated = false;
        }
      } catch (driveErr) {
        console.warn('Erro ao conectar à API do Google Drive para upload da foto:', driveErr);
      }
    }

    // 3. Persistência no Banco de Dados Turso (se estudante_id foi fornecido)
    if (isTursoConfigured && estudanteId) {
      try {
        await executeTursoQuery(
          `UPDATE estudantes SET foto_url = ? WHERE id = ?`,
          [directViewUrl, estudanteId]
        );
      } catch (dbErr) {
        console.warn('Aviso: Erro ao atualizar foto_url na tabela estudantes:', dbErr);
      }
    }

    return NextResponse.json({
      success: true,
      foto_url: directViewUrl,
      drive_file_id: driveFileId,
      nome_arquivo: nomeArquivo,
      caminho_drive: caminhoCompletoDrive,
      tamanho_bytes: file.size,
      mime_type: 'image/jpeg',
      is_simulated: isSimulated,
      message: isSimulated
        ? `Foto 3x4 processada com sucesso (Simulação ativa: ${caminhoCompletoDrive}/${nomeArquivo})`
        : `Foto 3x4 enviada com sucesso para ${caminhoCompletoDrive}/${nomeArquivo}`,
    });
  } catch (error: any) {
    console.error('Erro no processamento da foto do estudante:', error);
    return NextResponse.json(
      { error: error?.message || 'Falha ao processar upload da foto do estudante.' },
      { status: 500 }
    );
  }
}
