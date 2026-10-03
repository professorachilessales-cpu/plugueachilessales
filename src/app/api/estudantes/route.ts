import { NextRequest, NextResponse } from 'next/server';
import { executeTursoQuery, isTursoConfigured } from '@/lib/turso';

export const dynamic = 'force-dynamic';

function toBoolean(val: any, defaultIfNull: boolean = false): boolean {
  if (val === null || val === undefined) return defaultIfNull;
  if (val === true || val === 1 || val === '1') return true;
  if (val === false || val === 0 || val === '0') return false;
  if (typeof val === 'string') {
    const s = val.trim().toLowerCase();
    return s === 'true' || s === 'sim' || s === '1';
  }
  return Boolean(val);
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.max(1, Number(searchParams.get('limit') || searchParams.get('pageSize')) || 10);
    const page = Math.max(1, Number(searchParams.get('page')) || 1);
    const offset = (page - 1) * limit;

    const busca = (searchParams.get('busca') || searchParams.get('search') || '').trim();
    const turmaId = (searchParams.get('turma_id') || searchParams.get('turma') || '').trim();
    const aee = searchParams.get('aee') || 'todos';

    if (!isTursoConfigured) {
      return NextResponse.json(
        { 
          error: 'Turso não está configurado.',
          estudantes: [],
          totalRegistros: 0,
          totalPaginas: 1,
          paginaAtual: page,
          limit
        },
        { status: 200 }
      );
    }

    const conditions: string[] = [];
    const args: (string | number)[] = [];

    if (busca) {
      const buscaPattern = `%${busca}%`;
      const buscaDigitos = busca.replace(/\D/g, '');
      if (buscaDigitos) {
        conditions.push(
          '(nome_completo LIKE ? OR cpf LIKE ? OR rg_numero LIKE ? OR numero_bolsa_familia LIKE ? OR certidao_nascimento LIKE ?)'
        );
        args.push(buscaPattern, `%${buscaDigitos}%`, buscaPattern, buscaPattern, buscaPattern);
      } else {
        conditions.push(
          '(nome_completo LIKE ? OR cpf LIKE ? OR rg_numero LIKE ? OR numero_bolsa_familia LIKE ? OR certidao_nascimento LIKE ?)'
        );
        args.push(buscaPattern, buscaPattern, buscaPattern, buscaPattern, buscaPattern);
      }
    }

    if (turmaId) {
      conditions.push('turma_id = ?');
      args.push(turmaId);
    }

    if (aee === 'com_aee') {
      conditions.push('(aee = 1 OR possui_laudo = 1)');
    } else if (aee === 'sem_aee') {
      conditions.push('(aee = 0 AND (possui_laudo = 0 OR possui_laudo IS NULL))');
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Contagem total para metadados de paginação
    const countSql = `SELECT COUNT(*) as total FROM estudantes ${whereClause}`;
    const countRes = await executeTursoQuery<{ total: number }>(countSql, args);
    const totalRegistros = Number(countRes.rows[0]?.total || 0);
    const totalPaginas = Math.max(1, Math.ceil(totalRegistros / limit));

    // Busca paginada no banco
    const selectSql = `
      SELECT * FROM estudantes
      ${whereClause}
      ORDER BY nome_completo ASC
      LIMIT ? OFFSET ?
    `;
    const dataRes = await executeTursoQuery(selectSql, [...args, limit, offset]);

    const estudantes = dataRes.rows.map((row: any) => ({
      ...row,
      possui_laudo: toBoolean(row.possui_laudo),
      aee: toBoolean(row.aee),
    }));

    return NextResponse.json({
      estudantes,
      totalRegistros,
      totalPaginas,
      paginaAtual: page,
      limit,
    });
  } catch (error: any) {
    console.error('Erro na rota GET /api/estudantes:', error);
    return NextResponse.json(
      { error: error.message || 'Erro interno ao consultar estudantes' },
      { status: 500 }
    );
  }
}
