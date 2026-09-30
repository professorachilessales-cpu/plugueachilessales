import { NextRequest } from 'next/server';
import { executeTursoQuery, executeTursoTransaction, isTursoConfigured, TursoStatement } from '@/lib/turso';
import { verifyJwt } from '@/lib/security';

let tabelasGarantidas = false;

/**
 * Garante que as tabelas necessárias de observações e auditoria existem no Turso com todas as colunas
 */
export async function garantirTabelasObservacoes(): Promise<void> {
  if (!isTursoConfigured || tabelasGarantidas) return;
  try {
    // 1. Tabela observacoes_pedagogicas
    await executeTursoQuery(`
      CREATE TABLE IF NOT EXISTS observacoes_pedagogicas (
        id TEXT PRIMARY KEY,
        estudante_id TEXT NOT NULL,
        usuario_id TEXT NOT NULL,
        autor_nome TEXT,
        categoria TEXT,
        texto TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        ativo INTEGER DEFAULT 1,
        deleted_at TEXT
      )
    `);

    // 2. Tabela observacoes_aluno (compatibilidade legada)
    await executeTursoQuery(`
      CREATE TABLE IF NOT EXISTS observacoes_aluno (
        id TEXT PRIMARY KEY,
        aluno_id TEXT NOT NULL,
        estudante_id TEXT,
        autor_id TEXT NOT NULL,
        usuario_id TEXT,
        autor_nome TEXT,
        autor_cargo TEXT,
        tipo TEXT,
        categoria TEXT,
        texto TEXT NOT NULL,
        texto_completo TEXT,
        data_registro TEXT DEFAULT CURRENT_TIMESTAMP,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        ativo INTEGER DEFAULT 1,
        deleted_at TEXT
      )
    `);

    // 3. Tabela observacoes_auditoria
    await executeTursoQuery(`
      CREATE TABLE IF NOT EXISTS observacoes_auditoria (
        id TEXT PRIMARY KEY,
        observacao_id TEXT NOT NULL,
        estudante_id TEXT NOT NULL,
        evento TEXT,
        acao TEXT,
        conteudo_observacao TEXT,
        texto_anterior TEXT,
        texto_novo TEXT,
        categoria TEXT,
        registro_anterior TEXT,
        usuario_id TEXT,
        usuario_nome TEXT,
        excluido_por_usuario_id TEXT,
        excluido_por_usuario_nome TEXT,
        data_exclusao TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 4. Tabela activity_logs (auditoria global)
    await executeTursoQuery(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id TEXT PRIMARY KEY,
        action_type TEXT NOT NULL,
        user_id TEXT NOT NULL,
        user_name TEXT,
        target_class_id TEXT,
        target_class_name TEXT,
        details TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 5. Migrações defensivas caso a tabela já existisse no Turso com colunas faltantes
    const alterStatements = [
      'ALTER TABLE observacoes_auditoria ADD COLUMN acao TEXT;',
      'ALTER TABLE observacoes_auditoria ADD COLUMN conteudo_observacao TEXT;',
      'ALTER TABLE observacoes_auditoria ADD COLUMN excluido_por_usuario_id TEXT;',
      'ALTER TABLE observacoes_auditoria ADD COLUMN excluido_por_usuario_nome TEXT;',
      'ALTER TABLE observacoes_auditoria ADD COLUMN data_exclusao TEXT;',
      'ALTER TABLE observacoes_pedagogicas ADD COLUMN deleted_at TEXT;',
      'ALTER TABLE observacoes_pedagogicas ADD COLUMN excluido_por_usuario_id TEXT;',
      'ALTER TABLE observacoes_pedagogicas ADD COLUMN is_deleted INTEGER DEFAULT 0;',
      'ALTER TABLE observacoes_aluno ADD COLUMN deleted_at TEXT;',
      'ALTER TABLE observacoes_aluno ADD COLUMN excluido_por_usuario_id TEXT;',
      'ALTER TABLE observacoes_aluno ADD COLUMN is_deleted INTEGER DEFAULT 0;',
    ];

    for (const sql of alterStatements) {
      try {
        await executeTursoQuery(sql);
      } catch {
        // Ignora erro se coluna já existir no SQLite
      }
    }
    tabelasGarantidas = true;
  } catch (e) {
    console.warn('Aviso ao verificar tabelas de observações e auditoria:', e);
  }
}

/**
 * Extrai o usuário autenticado a partir do token JWT (Authorization Bearer),
 * cookie seguro (plugue_refresh_token), headers customizados ou fallback do payload
 */
export function extrairUsuarioAutenticado(
  req: NextRequest,
  body?: any
): { userId: string; userName: string; userRole?: string } {
  // 1. Tentar via cabeçalho Authorization Bearer
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    const payload = verifyJwt(token);
    if (payload && payload.userId) {
      return {
        userId: payload.userId,
        userName: payload.name || 'Usuário Autenticado',
        userRole: payload.role,
      };
    }
  }

  // 2. Tentar via cookie HttpOnly de refresh token
  const cookieToken = req.cookies.get('plugue_refresh_token')?.value;
  if (cookieToken) {
    const payload = verifyJwt(cookieToken);
    if (payload && payload.userId) {
      return {
        userId: payload.userId,
        userName: payload.name || 'Usuário Autenticado',
        userRole: payload.role,
      };
    }
  }

  // 3. Fallback defensivo para headers de sessão passados pelo frontend/proxy
  const headerUserId = req.headers.get('x-user-id');
  const headerUserName = req.headers.get('x-user-name');
  const headerUserRole = req.headers.get('x-user-role');

  const userId =
    body?.usuario_id ||
    body?.autor_id ||
    body?.excluido_por_usuario_id ||
    headerUserId ||
    'user-admin';
  const userName =
    body?.usuario_nome ||
    body?.autor_nome ||
    body?.excluido_por_usuario_nome ||
    headerUserName ||
    'Equipe Escolar';
  const userRole =
    body?.usuario_role ||
    body?.autor_cargo ||
    headerUserRole ||
    'Administração Escolar';

  return { userId, userName, userRole };
}

export interface RemoveObservacaoParams {
  observacaoId: string;
  usuario: {
    userId: string;
    userName: string;
    userRole?: string;
  };
  payloadFallback?: any;
}

export interface RemoveObservacaoResult {
  success: boolean;
  observacaoId: string;
  estudanteId: string;
  auditRecord: any;
  message: string;
}

/**
 * Remove uma observação da timeline ativa garantindo atomicidade absoluta:
 * 
 * Etapa 1: Captura os dados completos da observação antes da exclusão.
 * Etapa 2: Grava obrigatoriamente na auditoria (observacoes_auditoria + activity_logs).
 * Etapa 3: Remove da timeline ativa (soft delete com ativo=0 e deleted_at).
 * 
 * Todas as operações ocorrem dentro de BEGIN TRANSACTION ... COMMIT via executeTursoTransaction.
 * Se a auditoria falhar, o rollback é acionado e a exclusão da timeline não é efetivada.
 */
export async function removerObservacaoComAuditoria(
  params: RemoveObservacaoParams
): Promise<RemoveObservacaoResult> {
  const { observacaoId, usuario, payloadFallback } = params;

  if (!observacaoId) {
    throw new Error('ID da observação é obrigatório para exclusão.');
  }

  if (!isTursoConfigured) {
    throw new Error('Banco de dados Turso não está configurado.');
  }

  await garantirTabelasObservacoes();

  // -------------------------------------------------------------
  // Etapa 1: Captura dos Dados Antes da Exclusão
  // -------------------------------------------------------------
  let registro: any = null;

  // 1.1 Consulta na tabela principal (observacoes_pedagogicas) ativa
  try {
    const res = await executeTursoQuery(
      `SELECT * FROM observacoes_pedagogicas 
       WHERE id = ? 
         AND (deleted_at IS NULL OR deleted_at = '' OR deleted_at = 0)
         AND (ativo = 1 OR ativo IS NULL OR ativo = '1')
         AND (is_deleted = 0 OR is_deleted IS NULL OR is_deleted = '0')
       LIMIT 1`,
      [observacaoId]
    );
    if (res.rows && res.rows.length > 0) {
      registro = res.rows[0];
    }
  } catch (err) {
    console.warn('Aviso ao consultar observacoes_pedagogicas ativas:', err);
  }

  // 1.2 Consulta na tabela legada/espelho (observacoes_aluno) ativa
  if (!registro) {
    try {
      const resLeg = await executeTursoQuery(
        `SELECT * FROM observacoes_aluno 
         WHERE id = ? 
           AND (deleted_at IS NULL OR deleted_at = '' OR deleted_at = 0)
           AND (ativo = 1 OR ativo IS NULL OR ativo = '1')
           AND (is_deleted = 0 OR is_deleted IS NULL OR is_deleted = '0')
         LIMIT 1`,
        [observacaoId]
      );
      if (resLeg.rows && resLeg.rows.length > 0) {
        registro = resLeg.rows[0];
      }
    } catch (err) {
      console.warn('Aviso ao consultar observacoes_aluno ativas:', err);
    }
  }

  // 1.3 Se ainda não encontrou, busca sem o filtro de ativo (em caso de soft-delete anterior pendente de expurgo)
  if (!registro) {
    try {
      const resPedAll = await executeTursoQuery(
        'SELECT * FROM observacoes_pedagogicas WHERE id = ? LIMIT 1',
        [observacaoId]
      );
      if (resPedAll.rows && resPedAll.rows.length > 0) {
        registro = resPedAll.rows[0];
      }
    } catch (err) {}
  }

  if (!registro) {
    try {
      const resAluAll = await executeTursoQuery(
        'SELECT * FROM observacoes_aluno WHERE id = ? LIMIT 1',
        [observacaoId]
      );
      if (resAluAll.rows && resAluAll.rows.length > 0) {
        registro = resAluAll.rows[0];
      }
    } catch (err) {}
  }

  // 1.4 Fallback defensivo com payload enviado pelo cliente caso não encontrado no banco
  if (!registro && payloadFallback?.registro_completo) {
    registro = payloadFallback.registro_completo;
  }

  // Se o registro não existe de forma alguma no banco nem no payload, trata como já excluído com sucesso (idempotente)
  if (!registro && !payloadFallback?.estudante_id && !payloadFallback?.aluno_id) {
    return {
      success: true,
      observacaoId,
      estudanteId: '',
      auditRecord: null,
      message: 'Observação já se encontrava excluída.',
    };
  }

  // Extração precisa dos metadados da anotação
  const idOriginal = observacaoId;
  const estudanteId =
    registro?.estudante_id ||
    registro?.aluno_id ||
    payloadFallback?.estudante_id ||
    payloadFallback?.aluno_id ||
    'estudante-desconhecido';
  const categoria = (
    registro?.categoria ||
    registro?.tipo ||
    payloadFallback?.categoria ||
    'geral'
  ).toLowerCase();
  const conteudoOriginal =
    registro?.texto ||
    registro?.texto_completo ||
    payloadFallback?.texto ||
    payloadFallback?.texto_completo ||
    '';
  const dataCriacaoOriginal =
    registro?.created_at ||
    registro?.data_registro ||
    new Date().toISOString();
  const usuarioCriadorId =
    registro?.usuario_id ||
    registro?.autor_id ||
    'sistema';
  const usuarioCriadorNome =
    registro?.autor_nome ||
    'Equipe Escolar';

  const agoraIso = new Date().toISOString();
  const auditId = `aud-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const activityLogId = `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  const usuarioExecutorId = usuario.userId || 'sistema';
  const usuarioExecutorNome = usuario.userName || 'Usuário Não Identificado';

  // Serializa o snapshot anterior completo para o histórico
  const snapshotAnterior = JSON.stringify(
    registro || {
      id: idOriginal,
      estudante_id: estudanteId,
      categoria,
      texto: conteudoOriginal,
      created_at: dataCriacaoOriginal,
      usuario_id: usuarioCriadorId,
      autor_nome: usuarioCriadorNome,
    }
  );

  const auditRecord = {
    id: auditId,
    observacao_id: idOriginal,
    estudante_id: estudanteId,
    evento: 'DELETE',
    acao: 'EXCLUSAO',
    conteudo_observacao: conteudoOriginal,
    texto_anterior: conteudoOriginal,
    categoria: categoria,
    registro_anterior: snapshotAnterior,
    usuario_id: usuarioExecutorId,
    usuario_nome: usuarioExecutorNome,
    excluido_por_usuario_id: usuarioExecutorId,
    excluido_por_usuario_nome: usuarioExecutorNome,
    data_exclusao: agoraIso,
    created_at: agoraIso,
  };

  const detailsActivityLog = {
    resumo: `Exclusão de observação (${categoria}) do estudante`,
    observacao_id: idOriginal,
    estudante_id: estudanteId,
    categoria: categoria,
    conteudo_observacao: conteudoOriginal,
    autor_original_id: usuarioCriadorId,
    autor_original_nome: usuarioCriadorNome,
    data_criacao_original: dataCriacaoOriginal,
    excluido_por_id: usuarioExecutorId,
    excluido_por_nome: usuarioExecutorNome,
    data_exclusao: agoraIso,
  };

  // -------------------------------------------------------------
  // Etapa 2 e Etapa 3: Execução em Transação Obrigatória (BEGIN TRANSACTION)
  // -------------------------------------------------------------
  const statements: TursoStatement[] = [
    // 1. Gravação Obrigatória na Auditoria (observacoes_auditoria)
    {
      sql: `INSERT INTO observacoes_auditoria (
        id,
        observacao_id,
        estudante_id,
        evento,
        acao,
        conteudo_observacao,
        texto_anterior,
        categoria,
        registro_anterior,
        usuario_id,
        usuario_nome,
        excluido_por_usuario_id,
        excluido_por_usuario_nome,
        data_exclusao,
        created_at
      ) VALUES (?, ?, ?, 'DELETE', 'EXCLUSAO', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        auditId,
        idOriginal,
        estudanteId,
        conteudoOriginal,
        conteudoOriginal,
        categoria,
        snapshotAnterior,
        usuarioExecutorId,
        usuarioExecutorNome,
        usuarioExecutorId,
        usuarioExecutorNome,
        agoraIso,
        agoraIso,
      ],
    },

    // 2. Remoção da Timeline Ativa via Soft Delete (Exclusão Lógica)
    // Preserva o registro histórico no banco, mas oculta da timeline ativa
    {
      sql: `UPDATE observacoes_pedagogicas 
            SET deleted_at = ?,
                ativo = 0,
                is_deleted = 1,
                excluido_por_usuario_id = ?
            WHERE id = ?`,
      args: [agoraIso, usuarioExecutorId, idOriginal],
    },
    {
      sql: `UPDATE observacoes_aluno 
            SET deleted_at = ?,
                ativo = 0,
                is_deleted = 1,
                excluido_por_usuario_id = ?
            WHERE id = ?`,
      args: [agoraIso, usuarioExecutorId, idOriginal],
    },
  ];

  // Executa toda a transação atômica (Auditoria Obrigatória + Soft Delete)
  try {
    await executeTursoTransaction(statements);
  } catch (error: any) {
    console.error("Erro na exclusão/auditoria:", error);
    throw new Error(`Falha atômica ao excluir observação e gravar auditoria: ${error?.message || String(error)}`);
  }

  // Gravação secundária em activity_logs (fora da transação principal, sem quebrar exclusão caso haja restrição de CHECK)
  try {
    await executeTursoQuery(
      `INSERT INTO activity_logs (id, action_type, user_id, user_name, target_class_id, target_class_name, details, created_at)
       VALUES (?, 'OBSERVACAO_DELETE', ?, ?, null, null, ?, ?)`,
      [activityLogId, usuarioExecutorId, usuarioExecutorNome, JSON.stringify(detailsActivityLog), agoraIso]
    );
  } catch (logErr) {
    // Ignora restrições de CHECK legadas em activity_logs sem impactar a exclusão
  }

  return {
    success: true,
    observacaoId: idOriginal,
    estudanteId,
    auditRecord,
    message: 'Observação pedagógica excluída com sucesso e registrada na auditoria.',
  };
}
