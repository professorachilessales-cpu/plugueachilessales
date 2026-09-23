import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { Readable } from 'stream';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const estudanteId = formData.get('estudante_id') as string | null;
    const tipoDocumento = formData.get('tipo_documento') as string | null;

    if (!file) {
      return NextResponse.json(
        { error: 'Nenhum arquivo enviado.' },
        { status: 400 }
      );
    }

    const serviceEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const rawPrivateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
    const parentFolderId = process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID;

    // Se as credenciais do Google Drive estiverem configuradas, faz upload real
    if (serviceEmail && rawPrivateKey && !serviceEmail.includes('your-service-account')) {
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

      const fileMetadata: { name: string; parents?: string[] } = {
        name: `[${tipoDocumento || 'DOC'}]_${file.name}`,
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

      const fileId = response.data.id || '';
      const viewLink = response.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view`;

      return NextResponse.json({
        success: true,
        drive_file_id: fileId,
        drive_view_link: viewLink,
        nome_arquivo: file.name,
        tamanho_bytes: file.size,
        mime_type: file.type,
        tipo_documento: tipoDocumento,
        estudante_id: estudanteId,
        is_simulated: false,
      });
    }

    // Fallback Inteligente (quando as credenciais do Drive ainda não foram inseridas no .env)
    const mockId = `drive_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const mockViewLink = `https://drive.google.com/file/d/${mockId}/view?usp=sharing`;

    return NextResponse.json({
      success: true,
      drive_file_id: mockId,
      drive_view_link: mockViewLink,
      nome_arquivo: file.name,
      tamanho_bytes: file.size,
      mime_type: file.type,
      tipo_documento: tipoDocumento,
      estudante_id: estudanteId,
      is_simulated: true,
      message: 'Upload processado com sucesso. (Modo demonstração do Google Drive ativo)',
    });
  } catch (error: unknown) {
    console.error('Erro no upload para o Google Drive:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro interno no servidor ao processar upload.';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
