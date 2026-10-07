import { NextRequest, NextResponse } from 'next/server';

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
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Bloqueio definitivo da rota descontinuada "Usuários & Permissões"
  // Redireciona imediatamente para o dashboard do usuário logado
  if (pathname === '/configuracoes/usuarios' || pathname.startsWith('/configuracoes/usuarios/')) {
    const userFuncao = req.cookies.get('plugue_funcao_tipo')?.value;
    const destino = userFuncao === 'GERAL' ? '/fotograma' : '/dashboard';
    return NextResponse.redirect(new URL(destino, req.url));
  }

  // Obtém o perfil e papel do usuário a partir dos cookies seguros da sessão
  const userRole = req.cookies.get('plugue_user_role')?.value;
  const funcaoTipo = req.cookies.get('plugue_funcao_tipo')?.value;
  const headerRole = req.headers.get('x-user-role');

  const isAdmin = 
    userRole === 'admin' || 
    funcaoTipo === 'ADMINISTRATIVO' || 
    headerRole === 'admin';

  // 2. Proteção de Rotas de API Sensíveis (Responde 403 Forbidden se não for Admin)
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

  // 3. Proteção de Páginas Restritas (Redirecionamento Rígido)
  const isRestrictedPage = ROTAS_PAGINAS_RESTRITAS.some((prefix) =>
    pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  if (isRestrictedPage && !isAdmin) {
    // Funcionários de apoio geral vão para o Fotograma, professores para o Dashboard
    const destino = funcaoTipo === 'GERAL' ? '/fotograma' : '/dashboard';
    return NextResponse.redirect(new URL(destino, req.url));
  }

  // 4. Bloqueio de dashboard para funcionários Não Administrativos / Apoio (funcao_tipo = 'GERAL')
  // A tela inicial padrão deve ser diretamente o Fotograma da Turma
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
    '/dashboard/:path*',
  ],
};
