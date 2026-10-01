import { NextRequest, NextResponse } from 'next/server';
import { executeTursoQuery, executeTursoTransaction, isTursoConfigured, TursoStatement } from '@/lib/turso';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      solicitacao_id,
      estudante_id,
      turma_id,
      texto_consolidado_final,
      homologado_por_usuario_id,
      homologado_por_usuario_nome,
      snapshot_pareceres_enviados = [],
      professores_nao_entregaram = [],
    } = body;

    if (!solicitacao_id || !estudante_id || !texto_consolidado_final) {
      return NextResponse.json(
        { error: 'Parâmetros obrigatórios ausentes (solicitacao_id, estudante_id, texto_consolidado_final).' },
        { status: 400 }
      );
    }

    const agora = new Date().toISOString();
    const consolidacaoId = `cons-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    // Se o Turso estiver ativo, executa as operações em transação atômica
    if (isTursoConfigured) {
      try {
        // Assegura existência da tabela consolidacoes_pareceres
        await executeTursoQuery(`
          CREATE TABLE IF NOT EXISTS consolidacoes_pareceres (
            id TEXT PRIMARY KEY,
            solicitacao_id TEXT NOT NULL REFERENCES solicitacoes_relatorio(id) ON DELETE CASCADE,
            estudante_id TEXT NOT NULL REFERENCES estudantes(id) ON DELETE CASCADE,
            turma_id TEXT,
            texto_consolidado_final TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'CONCLUIDO',
            homologado_por_usuario_id TEXT,
            homologado_por_usuario_nome TEXT,
            data_homologacao TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            snapshot_pareceres_enviados TEXT NOT NULL DEFAULT '[]',
            professores_nao_entregaram TEXT NOT NULL DEFAULT '[]',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
          );
        `);

        // Transação Atômica:
        // 1. Atualizar status geral da solicitação para 'concluido'
        // 2. Atualizar status de pareceres não enviados para 'nao_entregue'
        // 3. Gravar na tabela de consolidações com snapshot e lista de faltosos
        // 4. Gravar/atualizar relatorios_consolidados para compatibilidade com DOCX e exportações
        const statements: TursoStatement[] = [
          {
            sql: `UPDATE solicitacoes_relatorio SET status = 'concluido' WHERE id = ?;`,
            args: [solicitacao_id],
          },
          {
            sql: `UPDATE relatorios_professores SET status = 'nao_entregue' WHERE solicitacao_id = ? AND status != 'enviado';`,
            args: [solicitacao_id],
          },
          {
            sql: `INSERT OR REPLACE INTO consolidacoes_pareceres (
              id,
              solicitacao_id,
              estudante_id,
              turma_id,
              texto_consolidado_final,
              status,
              homologado_por_usuario_id,
              homologado_por_usuario_nome,
              data_homologacao,
              snapshot_pareceres_enviados,
              professores_nao_entregaram,
              created_at
            ) VALUES (?, ?, ?, ?, ?, 'CONCLUIDO', ?, ?, CURRENT_TIMESTAMP, ?, ?, CURRENT_TIMESTAMP);`,
            args: [
              consolidacaoId,
              solicitacao_id,
              estudante_id,
              turma_id || null,
              texto_consolidado_final,
              homologado_por_usuario_id || null,
              homologado_por_usuario_nome || 'Coordenação Pedagógica',
              typeof snapshot_pareceres_enviados === 'string'
                ? snapshot_pareceres_enviados
                : JSON.stringify(snapshot_pareceres_enviados),
              typeof professores_nao_entregaram === 'string'
                ? professores_nao_entregaram
                : JSON.stringify(professores_nao_entregaram),
            ],
          },
          {
            sql: `INSERT OR REPLACE INTO relatorios_consolidados (
              id,
              solicitacao_id,
              conteudo_final,
              data_geracao,
              arquivo_docx_url,
              created_at
            ) VALUES (?, ?, ?, CURRENT_TIMESTAMP, ?, CURRENT_TIMESTAMP);`,
            args: [
              `rel-cons-${Date.now()}`,
              solicitacao_id,
              texto_consolidado_final,
              `/api/relatorios/docx?solicitacao_id=${solicitacao_id}`,
            ],
          },
        ];

        await executeTursoTransaction(statements);
      } catch (dbErr: any) {
        console.error('Erro na transação atômica do Turso ao homologar consolidação:', dbErr);
        return NextResponse.json(
          { error: `Falha na transação atômica de homologação: ${dbErr?.message || 'Erro desconhecido'}` },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Parecer consolidado e homologado com sucesso no histórico!',
      consolidacao: {
        id: consolidacaoId,
        solicitacao_id,
        estudante_id,
        turma_id,
        texto_consolidado_final,
        status: 'CONCLUIDO',
        homologado_por_usuario_id,
        homologado_por_usuario_nome,
        data_homologacao: agora,
        snapshot_pareceres_enviados,
        professores_nao_entregaram,
        created_at: agora,
      },
    });
  } catch (err: any) {
    console.error('Erro ao processar homologação de relatório:', err);
    return NextResponse.json(
      { error: err?.message || 'Falha ao processar homologação de pareceres.' },
      { status: 500 }
    );
  }
}
