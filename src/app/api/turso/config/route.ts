import { NextRequest, NextResponse } from 'next/server';
import { 
  getTursoDbUrl, 
  getTursoAuthToken, 
  setTursoCredentials, 
  checkIsTursoConfigured,
  executeTursoQuery,
  DEFAULT_TURSO_DB_URL 
} from '@/lib/turso';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const dbUrl = getTursoDbUrl();
    const authToken = getTursoAuthToken();
    const isConfigured = checkIsTursoConfigured();

    return NextResponse.json({
      success: true,
      dbUrl,
      authToken,
      defaultDbUrl: DEFAULT_TURSO_DB_URL,
      isConfigured,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Falha ao consultar configurações do Turso.' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { dbUrl, authToken } = body;

    if (!dbUrl || typeof dbUrl !== 'string' || !dbUrl.trim()) {
      return NextResponse.json(
        { error: 'A Database URL do Turso é obrigatória.' },
        { status: 400 }
      );
    }

    // Aplica e persiste as credenciais
    setTursoCredentials(dbUrl.trim(), authToken ? authToken.trim() : '');

    // Testa a nova conexão
    let connectionSuccess = false;
    let serverTime: string | null = null;
    let tablesCount = 0;
    let testError: string | null = null;

    try {
      const testRes = await executeTursoQuery("SELECT 1 as connected, datetime('now') as server_time");
      connectionSuccess = true;
      serverTime = testRes.rows[0]?.server_time || null;

      try {
        const tablesRes = await executeTursoQuery(
          "SELECT count(*) as total FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
        );
        tablesCount = tablesRes.rows[0]?.total || 0;
      } catch (e) {
        // Ignora contagem de tabelas
      }
    } catch (connErr: any) {
      testError = connErr?.message || 'Não foi possível conectar com as novas credenciais.';
    }

    return NextResponse.json({
      success: true,
      message: connectionSuccess
        ? 'Credenciais do Turso salvas e conexão validada com sucesso!'
        : 'Credenciais salvas, mas a conexão retornou aviso. Verifique se o Token e a URL estão corretos.',
      connected: connectionSuccess,
      serverTime,
      tablesCount,
      testError,
      dbUrl: getTursoDbUrl(),
    });
  } catch (error: any) {
    console.error('Erro ao atualizar configurações do Turso:', error);
    return NextResponse.json(
      { error: error?.message || 'Erro ao salvar credenciais do Turso.' },
      { status: 500 }
    );
  }
}
