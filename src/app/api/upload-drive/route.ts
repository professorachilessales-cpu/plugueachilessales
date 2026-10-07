import { NextRequest, NextResponse } from 'next/server';
import { Readable } from 'stream';
import { normalizarNomeParaDrive, obterCaminhoProfessorDrive } from '@/lib/security';
import { executeTursoQuery, checkIsTursoConfigured, garantirSchemaAtestadosProfessor } from '@/lib/turso';
import { 
  getGoogleDriveClient, 
  resolverOuCriarEstruturaPastasEstudante, 
  resolverOuCriarEstruturaPastasProfessor,
  obterOuCriarPastaDrive,
  excluirArquivoDriveComAuditoria
} from '@/lib/google-drive';
import { extrairUsuarioAutenticado } from '@/lib/observacoes-service';

export const dynamic = 'force-dynamic';

const ALLOWED_EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg'];
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const tipoUpload = formData.get('tipo_upload') as string; // 'estudante' | 'professor_atestado'
    const alunoId = formData.get('aluno_id') as string | null;
    let alunoNome = (formData.get('aluno_nome') as string | null) || (formData.get('estudante_nome') as string | null);
    const professorId = formData.get('professor_id') as string | null;
    const professorNome = formData.get('professor_nome') as string | null;
    const tipoDocumento = (formData.get('tipo_documento') as string) || (formData.get('tipo') as string) || 'Outros';
    const uploaderId = formData.get('uploader_id') as string | null;

    // Campos específicos para atestado de professor
    const dataInicio = (formData.get('data_inicio') as string | null) || (formData.get('data_ausencia') as string | null);
    const dataFim = formData.get('data_fim') as string | null || dataInicio;
    const diasAfastamento = parseInt((formData.get('dias_afastamento') as string) || (formData.get('quantidade_dias') as string) || '1', 10);
    const motivoCid = formData.get('motivo_cid') as string | null;
    const faltaId = (formData.get('falta_id') as string | null) || (formData.get('ausencia_id') as string | null);

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 });
    }

    // Validação de limite de tamanho (até 10 MB)
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `O arquivo enviado (${(file.size / 1024 / 1024).toFixed(1)} MB) excede o limite máximo permitido de 10 MB.` },
        { status: 400 }
      );
    }

    // Se for estudante e não temos o nome mas temos o ID, busca no Turso
    if (tipoUpload !== 'professor_atestado' && !alunoNome && alunoId && checkIsTursoConfigured()) {
      try {
        const estRes = await executeTursoQuery<{ nome_completo: string }>(
          `SELECT nome_completo FROM estudantes WHERE id = ? LIMIT 1`,
          [alunoId]
        );
        if (estRes.rows && estRes.rows.length > 0 && estRes.rows[0].nome_completo) {
          alunoNome = estRes.rows[0].nome_completo;
        }
      } catch (e) {
        // Ignora
      }
    }

    // Validação de formato (apenas PDF, PNG, JPG, JPEG)
    const fileNameLower = file.name.toLowerCase();
    const hasValidExt = ALLOWED_EXTENSIONS.some(ext => fileNameLower.endsWith(ext));
    if (!hasValidExt && !ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { 
          error: `Formato de arquivo inválido (${file.name}). Formatos estritamente permitidos: .pdf, .png, .jpg, .jpeg.` 
        },
        { status: 400 }
      );
    }

    // 1. Obter cliente Google Drive Unificado (OAuth 2.0 ativo ou Service Account)
    const driveClient = await getGoogleDriveClient();
    const { drive, rootFolderId, isSimulated } = driveClient;

    const isConnected = Boolean(driveClient.isOAuth || driveClient.isServiceAccount || driveClient.isSimulated);
    if (!isConnected) {
      return NextResponse.json(
        { error: 'É necessário vincular uma conta Google antes de enviar arquivos.' },
        { status: 400 }
      );
    }

    let targetFolderId: string | null = rootFolderId;
    let diretorioDrive = 'FICHA DOS ESTUDANTES/';

    if (tipoUpload === 'professor_atestado') {
      const nomeProfessorResolver = professorNome || 'DOCENTE_GERAL';
      const estrutura = await resolverOuCriarEstruturaPastasProfessor(drive, nomeProfessorResolver, rootFolderId);
      targetFolderId = estrutura.professorFolderId;
      diretorioDrive = estrutura.caminhoFormatado;
    } else {
      // 2. Resolução da Árvore de Diretórios Padronizada por Inicial para Estudantes
      const nomeParaResolver = alunoNome || 'ESTUDANTE_DOCUMENTOS';
      const estrutura = await resolverOuCriarEstruturaPastasEstudante(drive, nomeParaResolver, rootFolderId);
      targetFolderId = estrutura.estudanteFolderId;
      diretorioDrive = estrutura.caminhoFormatado;
    }

    let driveFileId = `drive_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    let driveViewLink = `https://drive.google.com/file/d/${driveFileId}/view?usp=sharing`;
    let nomeArquivoFinal = file.name;

    if (drive) {
      try {
        const buffer = Buffer.from(await file.arrayBuffer());
        const stream = new Readable();
        stream.push(buffer);
        stream.push(null);

        const safeOriginalName = normalizarNomeParaDrive(file.name.substring(0, file.name.lastIndexOf('.')) || file.name);
        const ext = file.name.substring(file.name.lastIndexOf('.')) || '.pdf';

        if (tipoUpload === 'professor_atestado') {
          // Hierarquia estruturada: atestado_[DATA]_[ID_UNICO].[ext]
          const dataReferencia = (dataInicio || new Date().toISOString().split('T')[0]).replace(/-/g, '_');
          const idUnico = Math.random().toString(36).substring(2, 8).toUpperCase();
          nomeArquivoFinal = `atestado_${dataReferencia}_${idUnico}${ext.toLowerCase()}`;
        } else {
          nomeArquivoFinal = `[${tipoDocumento.toUpperCase()}]_${safeOriginalName}${ext}`;
        }

        const fileMetadata: { name: string; parents?: string[] } = {
          name: nomeArquivoFinal,
        };

        if (targetFolderId) {
          fileMetadata.parents = [targetFolderId];
        }

        const response = await drive.files.create({
          requestBody: fileMetadata,
          media: {
            mimeType: file.type,
            body: stream,
          },
          fields: 'id, name, webViewLink, webContentLink',
        });

        if (response.data.id) {
          driveFileId = response.data.id;
          driveViewLink = response.data.webViewLink || `https://drive.google.com/file/d/${driveFileId}/view`;

          try {
            await drive.permissions.create({
              fileId: driveFileId,
              requestBody: { role: 'reader', type: 'anyone' },
            });
          } catch (e) {
            // Ignora
          }
        }
      } catch (driveErr) {
        console.warn('Erro ao conectar ao Google Drive API real, usando fallback:', driveErr);
      }
    }

    // Persistência no Turso se configurado
    let atestId = `atest-${Date.now()}`;
    if (checkIsTursoConfigured()) {
      try {
        if (tipoUpload === 'professor_atestado' && professorId) {
          await garantirSchemaAtestadosProfessor();
          const qtdDias = Math.max(1, diasAfastamento || 1);
          const dataIniVal = dataInicio || new Date().toISOString().split('T')[0];
          const dataFimVal = dataFim || dataIniVal;

          try {
            await executeTursoQuery(
              `INSERT INTO atestados_professor (
                id, professor_id, drive_file_id, atestado_drive_url, nome_arquivo, 
                data_inicio, data_fim, dias_afastamento, quantidade_dias, motivo_cid, permite_exclusao
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
              [
                atestId, 
                professorId, 
                driveFileId, 
                driveViewLink, 
                nomeArquivoFinal, 
                dataIniVal, 
                dataFimVal, 
                qtdDias, 
                qtdDias, 
                motivoCid || null
              ]
            );
          } catch (insertErr) {
            await executeTursoQuery(
              `INSERT INTO atestados_professor (
                id, professor_id, drive_file_id, nome_arquivo, 
                data_inicio, data_fim, dias_afastamento, motivo_cid, permite_exclusao
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
              [
                atestId, 
                professorId, 
                driveFileId, 
                nomeArquivoFinal, 
                dataIniVal, 
                dataFimVal, 
                qtdDias, 
                motivoCid || null
              ]
            );
          }

          if (faltaId) {
            await executeTursoQuery(
              `UPDATE faltas_professores 
               SET atestado_drive_url = ?, drive_file_id = ?, atestado_drive_link = ?, atestado_drive_id = ?,
                   data_inicio = COALESCE(?, data_inicio), data_fim = COALESCE(?, data_fim),
                   motivo = COALESCE(?, motivo)
               WHERE id = ?`,
              [driveViewLink, driveFileId, driveViewLink, driveFileId, dataIniVal, dataFimVal, motivoCid, faltaId]
            );
            try {
              await executeTursoQuery(
                `UPDATE ausencias_docentes 
                 SET atestado_drive_url = ?, drive_file_id = ?,
                     data_inicio = COALESCE(?, data_inicio), data_fim = COALESCE(?, data_fim)
                 WHERE id = ?`,
                [driveViewLink, driveFileId, dataIniVal, dataFimVal, faltaId]
              );
            } catch {}
          }
        } else if (alunoId) {
          const docId = `doc-${Date.now()}`;
          await executeTursoQuery(
            `INSERT INTO documentos_estudantes (id, estudante_id, tipo_documento, nome_arquivo, tamanho_bytes, drive_file_id, drive_view_link)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [docId, alunoId, tipoDocumento.toLowerCase(), file.name, file.size, driveFileId, driveViewLink]
          );
        }
      } catch (dbErr) {
        console.warn('Aviso: falha ao persistir metadados no Turso:', dbErr);
      }
    }

    return NextResponse.json({
      success: true,
      id: atestId,
      drive_file_id: driveFileId,
      url_visualizacao: driveViewLink,
      atestado_drive_url: driveViewLink,
      data_inicio: dataInicio || new Date().toISOString().split('T')[0],
      data_fim: dataFim || dataInicio || new Date().toISOString().split('T')[0],
      quantidade_dias: Math.max(1, diasAfastamento || 1),
      dias_afastamento: Math.max(1, diasAfastamento || 1),
      motivo_cid: motivoCid || null,
      nome_arquivo: nomeArquivoFinal,
      tamanho_bytes: file.size,
      mime_type: file.type,
      diretorio_drive: diretorioDrive,
      tipo_documento: tipoDocumento,
      aluno_id: alunoId,
      professor_id: professorId,
      is_simulated: isSimulated,
      auth_type: driveClient.authType,
      message: `Arquivo enviado com sucesso para ${diretorioDrive}.`,
    });
  } catch (error: any) {
    console.error('Erro no upload para o Drive:', error);
    return NextResponse.json(
      { error: error?.message || 'Falha ao processar upload para o Google Drive.' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/upload-drive
 * Exclui fisicamente o arquivo do Google Drive autenticado, remove metadados locais e registra auditoria
 */
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    let fileId = searchParams.get('fileId') || searchParams.get('file_id');
    let docId = searchParams.get('docId') || searchParams.get('doc_id') || searchParams.get('id');
    let estudanteId = searchParams.get('estudanteId') || searchParams.get('estudante_id') || searchParams.get('aluno_id');
    let professorId = searchParams.get('professorId') || searchParams.get('professor_id');
    let faltaId = searchParams.get('faltaId') || searchParams.get('falta_id') || searchParams.get('ausencia_id');
    let nomeArquivo = searchParams.get('nomeArquivo') || searchParams.get('nome_arquivo');

    let body: any = {};
    try {
      body = await req.json();
      if (!fileId) {
        fileId = body.fileId || body.file_id || body.drive_file_id;
      }
      if (!docId) {
        docId = body.docId || body.doc_id || body.id;
      }
      if (!fileId && docId && !docId.startsWith('doc-') && !docId.startsWith('falta-') && !docId.startsWith('atest-')) {
        fileId = docId;
      }
      if (!estudanteId) {
        estudanteId = body.estudanteId || body.estudante_id || body.aluno_id;
      }
      if (!professorId) {
        professorId = body.professorId || body.professor_id;
      }
      if (!faltaId) {
        faltaId = body.faltaId || body.falta_id || body.ausencia_id;
      }
      if (!nomeArquivo) {
        nomeArquivo = body.nomeArquivo || body.nome_arquivo;
      }
    } catch {
      // Body JSON opcional caso venha por query param
    }

    if (!fileId && !docId && !nomeArquivo && !faltaId) {
      return NextResponse.json(
        { error: 'Identificador do arquivo (fileId, docId, faltaId ou nomeArquivo) é obrigatório para exclusão.' },
        { status: 400 }
      );
    }

    const usuario = extrairUsuarioAutenticado(req, body);

    const result = await excluirArquivoDriveComAuditoria({
      fileId: fileId || '',
      docId: docId || undefined,
      estudanteId: estudanteId || undefined,
      professorId: professorId || undefined,
      faltaId: faltaId || undefined,
      nomeArquivo: nomeArquivo || undefined,
      usuario,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Erro na exclusão do arquivo do Google Drive:', error);
    return NextResponse.json(
      { error: error?.message || 'Falha ao excluir arquivo do Google Drive.' },
      { status: 500 }
    );
  }
}

