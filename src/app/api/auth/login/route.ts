import { NextRequest, NextResponse } from 'next/server';
import { 
  checkRateLimit, 
  registerFailedLogin, 
  resetFailedLogin, 
  verifyPassword, 
  generateAccessToken, 
  generateRefreshToken, 
  sanitizeString 
} from '@/lib/security';
import { initialUsers } from '@/lib/mock-data';
import { executeTursoQuery, isTursoConfigured } from '@/lib/turso';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';

    // 1. Verificação de Rate Limit (Anti Brute-Force)
    const rateCheck = checkRateLimit(ip);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { 
          error: `Muitas tentativas incorretas consecutivas. Acesso bloqueado temporariamente por segurança. Tente novamente em ${rateCheck.retryAfterSeconds} segundos.` 
        },
        { status: 429 }
      );
    }

    const body = await req.json();
    const loginCpf = sanitizeString(body.cpf || body.login).replace(/\D/g, '');
    const password = String(body.password || '');

    if (!loginCpf || !password) {
      return NextResponse.json(
        { error: 'CPF e senha são obrigatórios.' },
        { status: 400 }
      );
    }

    // 2. Busca do usuário (Turso ou Mock Fallback)
    let user: any = null;
    if (isTursoConfigured) {
      try {
        const queryRes = await executeTursoQuery('SELECT * FROM users WHERE cpf = ? LIMIT 1', [loginCpf]);
        if (queryRes.rows.length > 0) {
          user = queryRes.rows[0];
        }
      } catch (e) {
        console.error('Falha ao buscar usuário no Turso, usando mock:', e);
      }
    }

    if (!user) {
      user = initialUsers.find(u => u.cpf.replace(/\D/g, '') === loginCpf);
    }

    if (!user) {
      const fail = registerFailedLogin(ip);
      const remainingMsg = fail.isBlocked
        ? `Limite de 5 tentativas excedido. IP bloqueado por 15 minutos.`
        : `Tentativa inválida. Restam ${fail.remainingAttempts} tentativas antes do bloqueio do IP.`;
      return NextResponse.json(
        { error: `Credenciais incorretas. ${remainingMsg}` },
        { status: 401 }
      );
    }

    // 3. Verificação de Senha (bcrypt / pbkdf2)
    const passwordMatch = verifyPassword(password, user.password_hash);
    if (!passwordMatch) {
      const fail = registerFailedLogin(ip);
      const remainingMsg = fail.isBlocked
        ? `Limite de 5 tentativas excedido. IP bloqueado por 15 minutos.`
        : `Senha incorreta. Restam ${fail.remainingAttempts} tentativas antes do bloqueio.`;
      return NextResponse.json(
        { error: `Credenciais incorretas. ${remainingMsg}` },
        { status: 401 }
      );
    }

    // 4. Sucesso: Resetar contador de falhas do IP
    resetFailedLogin(ip);

    // 5. Geração de Tokens JWT (Acesso curto + Refresh Token em HttpOnly)
    const tokenUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role as 'admin' | 'direcao' | 'professor',
      cpf: user.cpf,
    };

    const accessToken = generateAccessToken(tokenUser);
    const refreshToken = generateRefreshToken(tokenUser);

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        cpf: user.cpf,
        must_change_password: Boolean(user.must_change_password),
        allowed_modules: typeof user.allowed_modules === 'string' ? JSON.parse(user.allowed_modules) : user.allowed_modules || ['PROFILE', 'FOTOGRAMA', 'CALENDARIO'],
      },
      token: accessToken,
    });

    // Configuração de Cookie Seguro HttpOnly para Refresh Token
    response.cookies.set({
      name: 'plugue_refresh_token',
      value: refreshToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 dias
    });

    return response;
  } catch (error: any) {
    console.error('Erro na autenticação:', error);
    return NextResponse.json(
      { error: error?.message || 'Erro interno no servidor de autenticação.' },
      { status: 500 }
    );
  }
}
