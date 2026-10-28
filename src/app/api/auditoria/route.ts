import { NextRequest, NextResponse } from 'next/server';
import { executeTursoQuery, checkIsTursoConfigured } from '@/lib/turso';
import { ActivityLog } from '@/lib/types';

/**
 * GET /api/auditoria
 * Retorna a lista de logs de atividades com ordenação decrescente por data/hora.
 * Suporta filtros por: action_type, user_id, data_inicio, data_fim.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const actionType = searchParams.get('action_type');
    const userId = searchParams.get('user_id');
    const dataInicio = searchParams.get('data_inicio');
    const dataFim = searchParams.get('data_fim');

    if (!checkIsTursoConfigured()) {
      return NextResponse.json({
        logs: [],
        connected: false,
        message: 'Turso não está configurado. Os logs serão consultados localmente.',
      });
    }

    let sql = 'SELECT id, action_type, user_id, user_name, target_class_id, target_class_name, details, created_at FROM activity_logs WHERE 1=1';
    const args: any[] = [];

    if (actionType && actionType !== 'todos') {
      sql += ' AND action_type = ?';
      args.push(actionType);
    }

    if (userId && userId !== 'todos') {
      sql += ' AND user_id = ?';
      args.push(userId);
    }

    if (dataInicio) {
      sql += ' AND date(created_at) >= date(?)';
      args.push(dataInicio);
    }

    if (dataFim) {
      sql += ' AND date(created_at) <= date(?)';
      args.push(dataFim);
    }

    sql += ' ORDER BY datetime(created_at) DESC LIMIT 200';

    const result = await executeTursoQuery<any>(sql, args);

    const logs: ActivityLog[] = result.rows.map((row) => {
      let parsedDetails = {};
      try {
        parsedDetails = typeof row.details === 'string' ? JSON.parse(row.details) : row.details;
      } catch {
        parsedDetails = { resumo: row.details, total_afetados: 0, estudantes_afetados: [] };
      }

      return {
        id: String(row.id),
        action_type: row.action_type,
        user_id: String(row.user_id),
        user_name: String(row.user_name || 'Usuário'),
        target_class_id: row.target_class_id ? String(row.target_class_id) : undefined,
        target_class_name: row.target_class_name ? String(row.target_class_name) : undefined,
        details: parsedDetails as any,
        created_at: String(row.created_at),
      };
    });

    return NextResponse.json({
      logs,
      connected: true,
      total: logs.length,
    });
  } catch (error: any) {
    console.error('Erro ao consultar logs de auditoria:', error);
    return NextResponse.json(
      { error: error.message || 'Falha ao consultar logs de auditoria.' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/auditoria
 * Registra um novo log de atividade de forma atômica (Append-Only).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action_type, user_id, user_name, target_class_id, target_class_name, details } = body;

    if (!action_type || !user_id || !details) {
      return NextResponse.json(
        { error: 'Parâmetros obrigatórios ausentes: action_type, user_id e details.' },
        { status: 400 }
      );
    }

    const logId = `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const nowIso = new Date().toISOString();
    const detailsJson = typeof details === 'string' ? details : JSON.stringify(details);

    if (checkIsTursoConfigured()) {
      const insertSql = `
        INSERT INTO activity_logs (id, action_type, user_id, user_name, target_class_id, target_class_name, details, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;
      await executeTursoQuery(insertSql, [
        logId,
        action_type,
        user_id,
        user_name || 'Administrador',
        target_class_id || null,
        target_class_name || null,
        detailsJson,
        nowIso,
      ]);
    }

    const createdLog: ActivityLog = {
      id: logId,
      action_type,
      user_id,
      user_name: user_name || 'Administrador',
      target_class_id,
      target_class_name,
      details: typeof details === 'string' ? JSON.parse(details) : details,
      created_at: nowIso,
    };

    return NextResponse.json({
      success: true,
      log: createdLog,
    });
  } catch (error: any) {
    console.error('Erro ao inserir log de auditoria:', error);
    return NextResponse.json(
      { error: error.message || 'Falha ao registrar log de auditoria.' },
      { status: 500 }
    );
  }
}

/**
 * PUT / PATCH / DELETE - BLOQUEADOS (AUDITORIA IMUTÁVEL / APPEND-ONLY)
 */
export async function PUT() {
  return NextResponse.json(
    { error: 'Operação proibida: a tabela de auditoria é estritamente imutável (Append-Only). Edições não são permitidas.' },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Operação proibida: a tabela de auditoria é estritamente imutável (Append-Only). Exclusões não são permitidas.' },
    { status: 405 }
  );
}
