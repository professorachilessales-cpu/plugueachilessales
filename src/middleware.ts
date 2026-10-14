import { NextRequest, NextResponse } from 'next/server';
import { verifyJwt } from '@/lib/security';

// Rotas restritas exclusivamente à Administração Escolar
const ROTAS_PAGINAS_RESTRITAS = [
  '/estudantes',
  '/turmas',
  '/professores',
  '/auditoria',
  '/configuracoes',
];

const ROTAS_API_RESTRITAS = [
  '/api/estudantes',
  '/api/turmas',
  '/api/auditoria',
  '/api/turso/config',
  '/api/turso/migrate',
  '/api/turso/sync',
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Bloqueio definitivo da rota descontinuada "Usuários & Permissões"
  if (pathname === '/configuracoes/usuarios' || pathname.startsWith('/configuracoes/usuarios/')) {
    const userFuncao = req.cookies.get('plugue_funcao_tipo')?.value;
    const destino = userFuncao === 'GERAL' ? '/fotograma' : '/dashboard';
    return NextResponse.redirect(new URL(destino, req.url));
  }

  // 2. Extração segura do Token JWT (Header Authorization ou Cookie seguro)
  let token: string | null = null;
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  } else {
    token = req.cookies.get('plugue_access_token')?.value || 
            req.cookies.get('plugue_refresh_token')?.value || 
            null;
  }

  // 3. Validação Criptográfica do Token JWT (HMAC-SHA256)
  // Jamais confia em headers enviados pelo cliente (ex: x-user-role) para escalação de privilégios.
  const payload = token ? verifyJwt(token) : null;
  const userRole = payload?.role;
  const funcaoTipo = req.cookies.get('plugue_funcao_tipo')?.value;

  const isAdmin = payload !== null && (userRole === 'admin' || userRole === 'direcao');

  // 4. Proteção de Rotas de API Sensíveis (Responde 403 Forbidden se não for Admin autenticado)
  const isRestrictedApi = ROTAS_API_RESTRITAS.some((prefix) =>
    pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  // Tratamento especial para /api/professores (permite apenas consulta das próprias faltas do docente)
  const isApiProfessoresGeral = pathname.startsWith('/api/professores') && !pathname.includes('/faltas');

  if ((isRestrictedApi || isApiProfessoresGeral) && !isAdmin) {
    return NextResponse.json(
      { 
        error: '403 Forbidden: Módulo restrito e de uso exclusivo da Administração Escolar.',
        status: 403 
      },
      { status: 403 }
    );
  }

  // 5. Proteção de Páginas Restritas (Redirecionamento Rígido)
  const isRestrictedPage = ROTAS_PAGINAS_RESTRITAS.some((prefix) =>
    pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  if (isRestrictedPage) {
    if (isAdmin) {
      return NextResponse.next();
    }

    // Se o usuário estiver explicitamente autenticado como docente ou apoio geral, redireciona
    const isExplicitlyUnauthorized = userRole === 'professor' || funcaoTipo === 'GERAL';
    if (isExplicitlyUnauthorized) {
      const destino = funcaoTipo === 'GERAL' ? '/fotograma' : '/dashboard';
      return NextResponse.redirect(new URL(destino, req.url));
    }

    // Se não houver token ou usuário autenticado, redireciona para login
    if (!payload) {
      return NextResponse.redirect(new URL('/login', req.url));
    }

    return NextResponse.next();
  }

  // 6. Bloqueio de dashboard para funcionários Não Administrativos / Apoio (funcao_tipo = 'GERAL')
  if (funcaoTipo === 'GERAL' && (pathname === '/' || pathname === '/dashboard' || pathname.startsWith('/dashboard/'))) {
    return NextResponse.redirect(new URL('/fotograma', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/configuracoes/usuarios/:path*',
    '/estudantes/:path*',
    '/turmas/:path*',
    '/professores/:path*',
    '/auditoria/:path*',
    '/configuracoes/:path*',
    '/api/estudantes/:path*',
    '/api/turmas/:path*',
    '/api/auditoria/:path*',
    '/api/professores/:path*',
    '/api/turso/:path*',
    '/dashboard/:path*',
  ],
};
