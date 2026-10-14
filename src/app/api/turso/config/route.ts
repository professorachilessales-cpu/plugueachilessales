import { NextRequest, NextResponse } from 'next/server';
import { 
  getTursoDbUrl, 
  getTursoAuthToken, 
  setTursoCredentials, 
  checkIsTursoConfigured,
  executeTursoQuery,
  DEFAULT_TURSO_DB_URL 
} from '@/lib/turso';
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

export async function GET(req: NextRequest) {
  try {
    if (!verificarAdmin(req)) {
      return NextResponse.json(
        { error: '403 Forbidden: Acesso restrito a administradores.' },
        { status: 403 }
      );
    }

    const dbUrl = getTursoDbUrl();
    const authToken = getTursoAuthToken();
    const isConfigured = checkIsTursoConfigured();

    // Mascara o token para nunca vazar o segredo em trânsito
    const maskedToken = authToken
      ? `${authToken.substring(0, 8)}...${authToken.substring(authToken.length - 4)}`
      : '';

    return NextResponse.json({
      success: true,
      dbUrl,
      maskedToken,
      hasToken: Boolean(authToken),
      defaultDbUrl: DEFAULT_TURSO_DB_URL,
      isConfigured,
    });
  } catch (error: any) {
    console.error('Erro ao consultar configurações do Turso:', error);
    return NextResponse.json(
      { error: 'Falha ao consultar configurações do banco de dados.' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!verificarAdmin(req)) {
      return NextResponse.json(
        { error: '403 Forbidden: Acesso restrito a administradores.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { dbUrl, authToken } = body;

    if (!dbUrl || typeof dbUrl !== 'string' || !dbUrl.trim()) {
      return NextResponse.json(
        { error: 'A Database URL do Turso é obrigatória.' },
        { status: 400 }
      );
    }

    // Aplica as credenciais em memória para o runtime atual
    setTursoCredentials(dbUrl.trim(), authToken ? authToken.trim() : '');

    // Testa a conexão
    let connectionSuccess = false;
    let serverTime: string | null = null;
    let tablesCount = 0;

    try {
      const testRes = await executeTursoQuery("SELECT 1 as connected, datetime('now') as server_time");
      connectionSuccess = true;
      serverTime = testRes.rows[0]?.server_time || null;

      try {
        const tablesRes = await executeTursoQuery(
          "SELECT count(*) as total FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
        );
        tablesCount = tablesRes.rows[0]?.total || 0;
      } catch {
        // Ignora contagem
      }
    } catch (connErr) {
      console.warn('Aviso: Teste de conexão do Turso falhou:', connErr);
    }

    return NextResponse.json({
      success: true,
      message: connectionSuccess
        ? 'Credenciais do Turso atualizadas e validadas com sucesso!'
        : 'Credenciais recebidas, mas a validação de conexão falhou. Verifique se a URL e o Token estão corretos.',
      connected: connectionSuccess,
      serverTime,
      tablesCount,
      dbUrl: getTursoDbUrl(),
      isConfigured: checkIsTursoConfigured(),
    });
  } catch (error: any) {
    console.error('Erro ao atualizar configurações do Turso:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar credenciais do banco de dados.' },
      { status: 500 }
    );
  }
}
