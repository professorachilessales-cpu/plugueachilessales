import { NextRequest, NextResponse } from 'next/server';
import { extrairUsuarioAutenticado, removerObservacaoComAuditoria } from '@/lib/observacoes-service';

export const dynamic = 'force-dynamic';

/**
 * DELETE /api/observacoes/:id
 * Remove a observação por ID com transação atômica e auditoria obrigatória
 */
export async function DELETE(
  req: NextRequest,
  context: { params: { id: string } | Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await Promise.resolve(context.params);
    const id = resolvedParams?.id;

    if (!id) {
      return NextResponse.json(
        { error: 'ID da observação é obrigatório no parâmetro da URL.' },
        { status: 400 }
      );
    }

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      // Requisição sem corpo JSON é válida se o ID estiver na URL
    }

    const usuario = extrairUsuarioAutenticado(req, body);

    const result = await removerObservacaoComAuditoria({
      observacaoId: id,
      usuario,
      payloadFallback: body,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Erro ao excluir observação via /api/observacoes/:id:', err);
    return NextResponse.json(
      { error: err?.message || 'Falha ao processar exclusão da observação.' },
      { status: 500 }
    );
  }
}
