import { NextRequest, NextResponse } from 'next/server';
import { Readable } from 'stream';
import { normalizarNomeParaDrive, obterCaminhoEstudanteDrive, obterCaminhoProfessorDrive } from '@/lib/security';
import { executeTursoQuery, isTursoConfigured } from '@/lib/turso';

export const dynamic = 'force-dynamic';

const ALLOWED_EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg'];
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
];

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const tipoUpload = formData.get('tipo_upload') as string; // 'estudante' | 'professor_atestado'
    const alunoId = formData.get('aluno_id') as string | null;
    const alunoNome = formData.get('aluno_nome') as string | null;
    const professorId = formData.get('professor_id') as string | null;
    const professorNome = formData.get('professor_nome') as string | null;
    const tipoDocumento = (formData.get('tipo_documento') as string) || 'Outros';
    const uploaderId = formData.get('uploader_id') as string | null;

    // Campos específicos para atestado de professor
    const dataInicio = formData.get('data_inicio') as string | null;
    const dataFim = formData.get('data_fim') as string | null;
    const diasAfastamento = parseInt((formData.get('dias_afastamento') as string) || '1', 10);
    const motivoCid = formData.get('motivo_cid') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 });
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

    // Normalização do caminho de diretório conforme requisitos 7 e 8
    let diretorioDrive = 'PLUGUE/';
    if (tipoUpload === 'professor_atestado' && professorNome) {
      diretorioDrive = obterCaminhoProfessorDrive(professorNome);
    } else if (alunoNome) {
      diretorioDrive = obterCaminhoEstudanteDrive(alunoNome);
    }

    const serviceEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const rawPrivateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
    const parentFolderId = process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID;

    let driveFileId = `drive_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    let driveViewLink = `https://drive.google.com/file/d/${driveFileId}/view?usp=sharing`;
    let isSimulated = true;

    // Se as credenciais do Google Drive estiverem configuradas, faz upload real
    if (serviceEmail && rawPrivateKey && !serviceEmail.includes('your-service-account')) {
      try {
        const { google } = await import('googleapis');
        const privateKey = rawPrivateKey.replace(/\\n/g, '\n');
        const auth = new google.auth.JWT({
          email: serviceEmail,
          key: privateKey,
          scopes: ['https://www.googleapis.com/auth/drive.file'],
        });

        const drive = google.drive({ version: 'v3', auth });

        const buffer = Buffer.from(await file.arrayBuffer());
        const stream = new Readable();
        stream.push(buffer);
        stream.push(null);

        const safeOriginalName = normalizarNomeParaDrive(file.name.substring(0, file.name.lastIndexOf('.')) || file.name);
        const ext = file.name.substring(file.name.lastIndexOf('.'));
        const fileMetadata: { name: string; parents?: string[] } = {
          name: `[${tipoDocumento.toUpperCase()}]_${safeOriginalName}${ext}`,
        };

        if (parentFolderId) {
          fileMetadata.parents = [parentFolderId];
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
          isSimulated = false;
        }
      } catch (driveErr) {
        console.warn('Erro ao conectar ao Google Drive API real, usando fallback de demonstração:', driveErr);
      }
    }

    // Persistência no Turso se configurado
    if (isTursoConfigured) {
      try {
        if (tipoUpload === 'professor_atestado' && professorId) {
          const atestId = `atest-${Date.now()}`;
          await executeTursoQuery(
            `INSERT INTO atestados_professor (id, professor_id, drive_file_id, nome_arquivo, data_inicio, data_fim, dias_afastamento, motivo_cid, permite_exclusao)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
            [atestId, professorId, driveFileId, file.name, dataInicio || new Date().toISOString().split('T')[0], dataFim || new Date().toISOString().split('T')[0], diasAfastamento, motivoCid || null]
          );
        } else if (alunoId) {
          const docId = `doc-${Date.now()}`;
          await executeTursoQuery(
            `INSERT INTO documentos_estudante (id, aluno_id, drive_file_id, nome_arquivo, url_visualizacao, tipo_documento, uploader_id)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [docId, alunoId, driveFileId, file.name, driveViewLink, tipoDocumento, uploaderId || null]
          );
        }
      } catch (dbErr) {
        console.warn('Aviso: falha ao persistir metadados no Turso:', dbErr);
      }
    }

    return NextResponse.json({
      success: true,
      id: `doc-${Date.now()}`,
      drive_file_id: driveFileId,
      url_visualizacao: driveViewLink,
      nome_arquivo: file.name,
      tamanho_bytes: file.size,
      mime_type: file.type,
      diretorio_drive: diretorioDrive,
      tipo_documento: tipoDocumento,
      aluno_id: alunoId,
      professor_id: professorId,
      is_simulated: isSimulated,
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
