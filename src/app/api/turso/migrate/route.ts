import { NextRequest, NextResponse } from 'next/server';
import { executeTursoBatch, checkIsTursoConfigured } from '@/lib/turso';
import { TURSO_CANONICAL_SCHEMA_SQL } from '@/lib/turso-schema-sql';
import { verifyJwt } from '@/lib/security';

export const dynamic = 'force-dynamic';

function verificarAdmin(req: NextRequest): boolean {
  let token: string | null = null;
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  } else {
    token = req.cookies.get('plugue_access_token')?.value || 
            req.cookies.get('plugue_refresh_token')?.value || 
            null;
  }
  if (!token) return false;
  const payload = verifyJwt(token);
  return Boolean(payload && (payload.role === 'admin' || payload.role === 'direcao'));
}

export async function POST(req: NextRequest) {
  try {
    if (!verificarAdmin(req)) {
      return NextResponse.json(
        { error: '403 Forbidden: Acesso restrito a administradores.' },
        { status: 403 }
      );
    }

    if (!checkIsTursoConfigured()) {
      return NextResponse.json(
        { error: 'Turso não está configurado. Configure TURSO_DATABASE_URL e TURSO_AUTH_TOKEN.' },
        { status: 400 }
      );
    }

    // Divide os comandos SQL por ponto e vírgula de forma serverless nativa
    const statements = TURSO_CANONICAL_SCHEMA_SQL
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith('--'));

    await executeTursoBatch(statements);

    return NextResponse.json({
      success: true,
      message: 'Esquema de banco de dados sincronizado com sucesso no Turso!',
      totalStatements: statements.length,
    });
  } catch (error: any) {
    console.error('Erro ao sincronizar tabelas com Turso:', error);
    return NextResponse.json(
      { error: 'Erro interno ao sincronizar tabelas com o banco de dados.' },
      { status: 500 }
    );
  }
}
