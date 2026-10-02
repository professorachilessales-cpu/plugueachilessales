import { NextRequest, NextResponse } from 'next/server';
import { excluirArquivoDriveComAuditoria } from '@/lib/google-drive';
import { extrairUsuarioAutenticado } from '@/lib/observacoes-service';

export const dynamic = 'force-dynamic';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const { fileId } = await params;

    if (!fileId) {
      return NextResponse.json(
        { error: 'ID do arquivo no Google Drive (fileId) é obrigatório.' },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(req.url);
    let estudanteId = searchParams.get('estudanteId') || searchParams.get('estudante_id') || searchParams.get('aluno_id');
    let nomeArquivo = searchParams.get('nomeArquivo') || searchParams.get('nome_arquivo');

    let body: any = {};
    try {
      body = await req.json();
      if (!estudanteId) {
        estudanteId = body.estudanteId || body.estudante_id || body.aluno_id;
      }
      if (!nomeArquivo) {
        nomeArquivo = body.nomeArquivo || body.nome_arquivo;
      }
    } catch {
      // Body opcional
    }

    const usuario = extrairUsuarioAutenticado(req, body);

    const result = await excluirArquivoDriveComAuditoria({
      fileId,
      estudanteId: estudanteId || undefined,
      nomeArquivo: nomeArquivo || undefined,
      usuario,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Erro na rota DELETE /api/drive/files/:fileId:', error);
    return NextResponse.json(
      { error: error?.message || 'Falha ao processar exclusão no Google Drive.' },
      { status: 500 }
    );
  }
}
