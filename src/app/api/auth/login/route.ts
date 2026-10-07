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
import { initialProfessores } from '@/lib/mock-data';
import { executeTursoQuery, isTursoConfigured, garantirSchemaAutenticacaoProfessores } from '@/lib/turso';

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
    const loginCpf = sanitizeString(body.cpf || body.login || '').replace(/\D/g, '');
    const password = String(body.password || '');

    if (!loginCpf || !password) {
      return NextResponse.json(
        { error: 'CPF e senha são obrigatórios.' },
        { status: 400 }
      );
    }

    // Garante que as colunas de autenticação existam na tabela professores
    if (isTursoConfigured) {
      await garantirSchemaAutenticacaoProfessores();
    }

    // 2. Busca do colaborador diretamente na tabela 'professores'
    let colaborador: any = null;
    if (isTursoConfigured) {
      try {
        const queryRes = await executeTursoQuery(
          `SELECT * FROM professores 
           WHERE REPLACE(REPLACE(REPLACE(cpf, '.', ''), '-', ''), ' ', '') = ?
             AND (deleted_at IS NULL OR deleted_at = '')
           LIMIT 1`,
          [loginCpf]
        );
        if (queryRes.rows.length > 0) {
          colaborador = queryRes.rows[0];
        }
      } catch (e) {
        console.error('Falha ao buscar colaborador no Turso:', e);
      }
    }

    // Fallback para mock caso não encontre no Turso
    if (!colaborador) {
      colaborador = initialProfessores.find(
        (p: any) => (p.cpf || '').replace(/\D/g, '') === loginCpf
      );
    }

    // Suporte especial ao Administrador Mestre "00000000000"
    if (!colaborador && loginCpf === '00000000000') {
      colaborador = {
        id: 'admin-master',
        nome_completo: 'Coordenação Pedagógica / Admin',
        cpf: '00000000000',
        email: 'admin@plugue.edu.br',
        funcao_tipo: 'ADMINISTRATIVO',
        funcao_escola: 'Administrativo',
        is_admin: 1,
        precisa_trocar_senha: 0,
        ativo: 1,
        senha_hash: null,
      };
    }

    if (!colaborador) {
      const fail = registerFailedLogin(ip);
      const remainingMsg = fail.isBlocked
        ? `Limite de 5 tentativas excedido. IP bloqueado por 15 minutos.`
        : `Tentativa inválida. Restam ${fail.remainingAttempts} tentativas antes do bloqueio do IP.`;
      return NextResponse.json(
        { error: `Credenciais incorretas ou CPF não localizado no quadro funcional. ${remainingMsg}` },
        { status: 401 }
      );
    }

    // Checa se o colaborador está ativo
    const isAtivo = colaborador.ativo !== 0 && colaborador.ativo !== false && colaborador.ativo !== '0';
    if (!isAtivo) {
      return NextResponse.json(
        { error: 'Acesso bloqueado: Este colaborador consta como inativo/desligado no quadro funcional.' },
        { status: 403 }
      );
    }

    // 3. Determinação de Perfis e Escopos de Acesso
    // Perfil Administrador: Ativado se is_admin = true OU funcao_tipo = 'ADMINISTRATIVO'
    const isAdmin = Boolean(
      colaborador.is_admin === 1 || 
      colaborador.is_admin === true || 
      colaborador.is_admin === '1' ||
      colaborador.funcao_tipo === 'ADMINISTRATIVO' ||
      colaborador.eh_administrativo === 1 ||
      colaborador.funcao_escola === 'Administrativo' ||
      loginCpf === '00000000000'
    );

    let funcaoTipo: 'ADMINISTRATIVO' | 'GERAL' | 'PROFESSOR' = 'PROFESSOR';
    if (isAdmin) {
      funcaoTipo = 'ADMINISTRATIVO';
    } else if (
      colaborador.funcao_tipo === 'GERAL' ||
      colaborador.tipo_profissional === 'funcionario' ||
      colaborador.eh_apoio === 1
    ) {
      funcaoTipo = 'GERAL';
    } else {
      funcaoTipo = 'PROFESSOR';
    }

    const role: 'admin' | 'professor' = isAdmin ? 'admin' : 'professor';

    // 4. Fluxo de validação de senha
    // Se senha_hash IS NULL: valida se a senha digitada é igual ao CPF limpo
    const storedHash = colaborador.senha_hash ? String(colaborador.senha_hash).trim() : null;
    let passwordValid = false;
    let precisaTrocarSenha = false;

    if (!storedHash) {
      // Primeiro acesso: senha padrão é o CPF limpo (somente dígitos)
      const senhaPadraoEsperada = (loginCpf === '00000000000' && password === 'admin123') ? password : loginCpf;
      if (password === senhaPadraoEsperada) {
        passwordValid = true;
        precisaTrocarSenha = true; // Exige troca obrigatória de senha
      }
    } else {
      // Valida via bcrypt / verifyPassword
      passwordValid = verifyPassword(password, storedHash);
      precisaTrocarSenha = Boolean(
        colaborador.precisa_trocar_senha === 1 || 
        colaborador.precisa_trocar_senha === true || 
        colaborador.precisa_trocar_senha === '1'
      );
    }

    if (!passwordValid) {
      const fail = registerFailedLogin(ip);
      const remainingMsg = fail.isBlocked
        ? `Limite de 5 tentativas excedido. IP bloqueado por 15 minutos.`
        : `Senha incorreta. Restam ${fail.remainingAttempts} tentativas antes do bloqueio.`;
      return NextResponse.json(
        { error: `Senha incorreta. ${remainingMsg}` },
        { status: 401 }
      );
    }

    // 5. Sucesso: Resetar contador de falhas do IP
    resetFailedLogin(ip);

    // 6. Atualizar último login na tabela professores
    if (isTursoConfigured && colaborador.id) {
      try {
        await executeTursoQuery(
          'UPDATE professores SET ultimo_login = CURRENT_TIMESTAMP WHERE id = ?',
          [colaborador.id]
        );
      } catch (err) {
        console.warn('Falha ao atualizar ultimo_login em professores:', err);
      }
    }

    // 7. Módulos Permitidos conforme a matriz
    let allowedModules = ['PROFILE', 'FOTOGRAMA', 'CALENDARIO', 'RELATORIOS'];
    if (isAdmin) {
      allowedModules = ['PROFILE', 'FOTOGRAMA', 'CALENDARIO', 'RELATORIOS', 'AUDITORIA', 'CONFIGURACOES', 'ESTUDANTES', 'TURMAS', 'PROFESSORES'];
    } else if (funcaoTipo === 'GERAL') {
      // Acesso restrito a Fotograma e Calendário
      allowedModules = ['FOTOGRAMA', 'CALENDARIO'];
    }

    const defaultRoute = funcaoTipo === 'GERAL' ? '/fotograma' : '/dashboard';

    // 8. Geração de Tokens JWT
    const tokenUser = {
      id: colaborador.id,
      name: colaborador.nome_completo,
      email: colaborador.email || '',
      role: role,
      cpf: colaborador.cpf || loginCpf,
    };

    const accessToken = generateAccessToken(tokenUser);
    const refreshToken = generateRefreshToken(tokenUser);

    const response = NextResponse.json({
      success: true,
      user: {
        id: colaborador.id,
        name: colaborador.nome_completo,
        email: colaborador.email || '',
        role: role,
        funcao_tipo: funcaoTipo,
        is_admin: isAdmin,
        cpf: colaborador.cpf || loginCpf,
        must_change_password: precisaTrocarSenha,
        precisa_trocar_senha: precisaTrocarSenha,
        allowed_modules: allowedModules,
        default_route: defaultRoute,
      },
      token: accessToken,
    });

    // Configuração de Cookie Seguro HttpOnly para Refresh Token e cookies de perfil
    response.cookies.set({
      name: 'plugue_refresh_token',
      value: refreshToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 dias
    });

    response.cookies.set({
      name: 'plugue_access_token',
      value: accessToken,
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 15 * 60, // 15 minutos
    });

    response.cookies.set({
      name: 'plugue_user_role',
      value: role,
      httpOnly: false,
      path: '/',
      sameSite: 'lax',
    });

    response.cookies.set({
      name: 'plugue_funcao_tipo',
      value: funcaoTipo,
      httpOnly: false,
      path: '/',
      sameSite: 'lax',
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
