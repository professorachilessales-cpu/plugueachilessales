import { NextRequest, NextResponse } from 'next/server';
import { executeTursoQuery, isTursoConfigured } from '@/lib/turso';
import { verifyJwt } from '@/lib/security';
import { 
  garantirTabelasObservacoes, 
  extrairUsuarioAutenticado, 
  removerObservacaoComAuditoria 
} from '@/lib/observacoes-service';

export const dynamic = 'force-dynamic';



/**
 * GET /api/observacoes
 * Lista observações ativas (com suporte a filtro por estudante_id)
 * Ordenação padrão: sempre da mais recente para a mais antiga (ORDER BY created_at DESC)
 */
export async function GET(req: NextRequest) {
  try {
    if (!isTursoConfigured) {
      return NextResponse.json({ error: 'Banco de dados Turso não configurado.' }, { status: 400 });
    }

    await garantirTabelasObservacoes();

    const { searchParams } = new URL(req.url);
    const estudanteId = searchParams.get('estudante_id') || searchParams.get('aluno_id');

    let query = `
      SELECT 
        id, 
        estudante_id, 
        usuario_id, 
        autor_nome, 
        categoria, 
        texto, 
        created_at, 
        ativo
      FROM observacoes_pedagogicas 
      WHERE (ativo = 1 OR ativo IS NULL) AND deleted_at IS NULL
    `;
    const args: any[] = [];

    if (estudanteId) {
      query += ` AND estudante_id = ?`;
      args.push(estudanteId);
    }

    query += ` ORDER BY created_at DESC`;

    const res = await executeTursoQuery(query, args);

    // Mapeia para o formato esperado pelo frontend
    const observacoes = res.rows.map((row: any) => ({
      id: row.id,
      estudante_id: row.estudante_id,
      aluno_id: row.estudante_id,
      usuario_id: row.usuario_id,
      autor_id: row.usuario_id,
      autor_nome: row.autor_nome || 'Equipe Escolar',
      autor_cargo: 'Equipe Escolar',
      categoria: row.categoria || 'pedagogico',
      tipo: row.categoria || 'pedagogico',
      texto_completo: row.texto,
      texto: row.texto,
      created_at: row.created_at,
      data_registro: row.created_at,
    }));

    return NextResponse.json({
      success: true,
      total: observacoes.length,
      observacoes,
    });
  } catch (err: any) {
    console.error('Erro ao listar observações pedagógicas:', err);
    return NextResponse.json(
      { error: err?.message || 'Falha ao buscar observações pedagógicas.' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/observacoes
 * Registra uma nova observação pedagógica com auditoria e usuário autenticado
 */
export async function POST(req: NextRequest) {
  try {
    if (!isTursoConfigured) {
      return NextResponse.json(
        { error: 'Banco de dados Turso não está configurado.' },
        { status: 503 }
      );
    }

    await garantirTabelasObservacoes();

    let body: any;
    try {
      body = await req.json();
    } catch (parseErr) {
      return NextResponse.json(
        { error: 'Corpo da requisição JSON inválido.' },
        { status: 400 }
      );
    }

    // 1. Extração segura do usuário autenticado da sessão/token
    const { userId, userName } = extrairUsuarioAutenticado(req, body);

    // 2. Validação rigorosa dos campos obrigatórios
    const estudanteId = (body.estudante_id || body.aluno_id)?.toString().trim();
    if (!estudanteId) {
      return NextResponse.json(
        { error: 'ID do estudante (estudante_id) é obrigatório.' },
        { status: 400 }
      );
    }

    const texto = (body.texto_completo || body.texto || body.conteudo)?.toString().trim();
    if (!texto) {
      return NextResponse.json(
        { error: 'O texto integral da observação pedagógica é obrigatório.' },
        { status: 400 }
      );
    }

    const categoria = (body.categoria || body.tipo || 'pedagogico').toString().trim().toLowerCase();
    const id = body.id?.toString().trim() || `obs-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const agoraIso = new Date().toISOString();
    const createdAt = body.created_at || agoraIso;

    // 3. Execução explícita da query na tabela observacoes_pedagogicas
    try {
      await executeTursoQuery(
        `INSERT INTO observacoes_pedagogicas (
          id,
          estudante_id,
          usuario_id,
          autor_nome,
          categoria,
          texto,
          created_at,
          ativo
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 1)
        ON CONFLICT(id) DO UPDATE SET
          categoria = excluded.categoria,
          texto = excluded.texto,
          ativo = 1`,
        [
          id,
          estudanteId,
          userId,
          userName,
          categoria,
          texto,
          createdAt,
        ]
      );
    } catch (queryErr: any) {
      console.error('Erro ao salvar observação pedagógica no Turso:', queryErr);
      return NextResponse.json(
        { 
          error: 'Erro ao gravar observação no banco de dados.', 
          details: queryErr?.message || String(queryErr) 
        },
        { status: 500 }
      );
    }

    // 4. Inserção espelho na tabela observacoes_aluno (para compatibilidade legada)
    try {
      await executeTursoQuery(
        `INSERT INTO observacoes_aluno (
          id,
          aluno_id,
          estudante_id,
          autor_id,
          usuario_id,
          autor_nome,
          autor_cargo,
          tipo,
          categoria,
          texto,
          texto_completo,
          data_registro,
          created_at,
          ativo
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
        ON CONFLICT(id) DO UPDATE SET
          texto = excluded.texto,
          texto_completo = excluded.texto_completo,
          tipo = excluded.tipo,
          categoria = excluded.categoria,
          ativo = 1`,
        [
          id,
          estudanteId,
          estudanteId,
          userId,
          userId,
          userName,
          body.autor_cargo || 'Equipe Escolar',
          categoria,
          categoria,
          texto,
          texto,
          createdAt,
          createdAt,
        ]
      );
    } catch (legErr) {
      console.warn('Aviso: Falha ao espelhar em observacoes_aluno (legada):', legErr);
    }

    // 5. Registro automático na tabela de auditoria (CREATE)
    try {
      const auditId = `aud-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      await executeTursoQuery(
        `INSERT INTO observacoes_auditoria (
          id,
          observacao_id,
          estudante_id,
          evento,
          texto_novo,
          categoria,
          usuario_id,
          usuario_nome,
          created_at
        ) VALUES (?, ?, ?, 'CREATE', ?, ?, ?, ?, ?)`,
        [
          auditId,
          id,
          estudanteId,
          texto,
          categoria,
          userId,
          userName,
          createdAt,
        ]
      );
    } catch (audErr) {
      console.warn('Aviso: Falha ao registrar auditoria de observação:', audErr);
    }

    const novaObservacao = {
      id,
      estudante_id: estudanteId,
      aluno_id: estudanteId,
      usuario_id: userId,
      autor_id: userId,
      autor_nome: userName,
      autor_cargo: body.autor_cargo || 'Equipe Escolar',
      categoria,
      tipo: categoria,
      texto_completo: texto,
      texto,
      created_at: createdAt,
      data_registro: createdAt,
    };

    return NextResponse.json(
      {
        success: true,
        message: 'Observação pedagógica registrada com sucesso!',
        observacao: novaObservacao,
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error('Erro não tratado ao processar POST /api/observacoes:', err);
    return NextResponse.json(
      { error: err?.message || 'Erro interno no servidor ao registrar observação.' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/observacoes
 * Atualiza o texto de uma observação existente com auditoria (apenas autor)
 */
export async function PUT(req: NextRequest) {
  try {
    if (!isTursoConfigured) {
      return NextResponse.json({ error: 'Banco de dados não configurado.' }, { status: 400 });
    }

    const body = await req.json();
    const { userId, userName } = extrairUsuarioAutenticado(req, body);

    const observacaoId = body.id || body.observacao_id;
    const novoTexto = (body.texto_completo || body.texto || body.novo_texto)?.toString().trim();

    if (!observacaoId || !novoTexto) {
      return NextResponse.json(
        { error: 'ID da observação e novo texto são obrigatórios.' },
        { status: 400 }
      );
    }

    // Consulta registro anterior para auditoria e validação de permissão
    let registroAnterior: any = null;
    try {
      const res = await executeTursoQuery(
        'SELECT * FROM observacoes_pedagogicas WHERE id = ? LIMIT 1',
        [observacaoId]
      );
      if (res.rows.length > 0) {
        registroAnterior = res.rows[0];
      }
    } catch (e) {
      // Tenta na tabela legada
      const resLeg = await executeTursoQuery(
        'SELECT * FROM observacoes_aluno WHERE id = ? LIMIT 1',
        [observacaoId]
      );
      if (resLeg.rows.length > 0) {
        registroAnterior = resLeg.rows[0];
      }
    }

    if (registroAnterior) {
      const autorIdAnterior = registroAnterior.usuario_id || registroAnterior.autor_id;
      // Caso não seja o autor e não seja super admin, bloqueia
      if (autorIdAnterior && autorIdAnterior !== userId && userId !== 'user-admin') {
        return NextResponse.json(
          { error: 'Permissão negada. Apenas o autor original pode editar esta observação.' },
          { status: 403 }
        );
      }
    }

    const agora = new Date().toISOString();

    // Atualiza tabela observacoes_pedagogicas
    await executeTursoQuery(
      `UPDATE observacoes_pedagogicas SET texto = ? WHERE id = ?`,
      [novoTexto, observacaoId]
    );

    // Atualiza tabela observacoes_aluno
    try {
      await executeTursoQuery(
        `UPDATE observacoes_aluno SET texto = ?, texto_completo = ? WHERE id = ?`,
        [novoTexto, novoTexto, observacaoId]
      );
    } catch (e) {
      // Ignora erro na legada
    }

    // Grava auditoria (UPDATE)
    try {
      const auditId = `aud-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const estudanteId = registroAnterior?.estudante_id || registroAnterior?.aluno_id || body.estudante_id || '';
      const textoAnterior = registroAnterior?.texto || registroAnterior?.texto_completo || '';
      const categoria = registroAnterior?.categoria || registroAnterior?.tipo || 'pedagogico';

      await executeTursoQuery(
        `INSERT INTO observacoes_auditoria (
          id, observacao_id, estudante_id, evento,
          texto_anterior, texto_novo, categoria, registro_anterior,
          usuario_id, usuario_nome, created_at
        ) VALUES (?, ?, ?, 'UPDATE', ?, ?, ?, ?, ?, ?, ?)`,
        [
          auditId,
          observacaoId,
          estudanteId,
          textoAnterior,
          novoTexto,
          categoria,
          JSON.stringify(registroAnterior || {}),
          userId,
          userName,
          agora,
        ]
      );
    } catch (audErr) {
      console.warn('Aviso: Erro ao gravar auditoria no UPDATE:', audErr);
    }

    return NextResponse.json({
      success: true,
      message: 'Observação pedagógica atualizada com sucesso!',
      observacao: {
        id: observacaoId,
        texto: novoTexto,
        texto_completo: novoTexto,
        updated_at: agora,
      },
    });
  } catch (err: any) {
    console.error('Erro ao atualizar observação pedagógica:', err);
    return NextResponse.json(
      { error: err?.message || 'Falha ao atualizar observação.' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/observacoes
 * Remove a observação por ID (via query param ?id=... ou JSON body) com transação atômica e auditoria
 */
export async function DELETE(req: NextRequest) {
  try {
    if (!isTursoConfigured) {
      return NextResponse.json({ error: 'Banco de dados Turso não configurado.' }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    let id = searchParams.get('id');

    let body: any = {};
    try {
      body = await req.json();
      if (!id) {
        id = body.id || body.observacao_id;
      }
    } catch (e) {
      // Sem body JSON
    }

    if (!id) {
      return NextResponse.json({ error: 'ID da observação é obrigatório.' }, { status: 400 });
    }

    const usuario = extrairUsuarioAutenticado(req, body);

    const result = await removerObservacaoComAuditoria({
      observacaoId: id,
      usuario,
      payloadFallback: body,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("Erro na exclusão/auditoria:", err);
    return NextResponse.json(
      { error: err?.message || 'Falha ao excluir observação pedagógica.' },
      { status: 500 }
    );
  }
}
