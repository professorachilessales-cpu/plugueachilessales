import { NextRequest, NextResponse } from 'next/server';
import { 
  verifyPassword, 
  hashPassword, 
  sanitizeString 
} from '@/lib/security';
import { validarNovaSenha } from '@/lib/validations';
import { executeTursoQuery, isTursoConfigured, garantirSchemaAutenticacaoProfessores } from '@/lib/turso';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const currentPassword = String(body.currentPassword || body.senhaAtual || '');
    const newPassword = String(body.newPassword || body.novaSenha || '');
    const confirmPassword = String(body.confirmPassword || body.confirmacaoSenha || '');
    const userId = body.userId ? String(body.userId).trim() : '';
    const cpfLimpo = body.cpf ? sanitizeString(body.cpf).replace(/\D/g, '') : '';
    const isFirstAccess = Boolean(body.isFirstAccess || body.primeiroAcesso);

    if (!newPassword || !confirmPassword) {
      return NextResponse.json(
        { error: 'Nova senha e confirmação de senha são obrigatórias.' },
        { status: 400 }
      );
    }

    if (!isFirstAccess && !currentPassword) {
      return NextResponse.json(
        { error: 'A senha atual é obrigatória.' },
        { status: 400 }
      );
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { error: 'A confirmação de senha não coincide com a nova senha digitada.' },
        { status: 400 }
      );
    }

    if (isTursoConfigured) {
      await garantirSchemaAutenticacaoProfessores();
    }

    // Busca o colaborador em professores
    let colaborador: any = null;
    if (isTursoConfigured) {
      let query = '';
      const params: any[] = [];
      if (userId && cpfLimpo) {
        query = `SELECT * FROM professores WHERE id = ? OR REPLACE(REPLACE(REPLACE(cpf, '.', ''), '-', ''), ' ', '') = ? LIMIT 1;`;
        params.push(userId, cpfLimpo);
      } else if (userId) {
        query = `SELECT * FROM professores WHERE id = ? LIMIT 1;`;
        params.push(userId);
      } else if (cpfLimpo) {
        query = `SELECT * FROM professores WHERE REPLACE(REPLACE(REPLACE(cpf, '.', ''), '-', ''), ' ', '') = ? LIMIT 1;`;
        params.push(cpfLimpo);
      }

      if (query) {
        const queryRes = await executeTursoQuery(query, params);
        if (queryRes.rows.length > 0) {
          colaborador = queryRes.rows[0];
        }
      }
    }

    if (!colaborador) {
      return NextResponse.json(
        { error: 'Colaborador não localizado para atualização de credenciais.' },
        { status: 404 }
      );
    }

    const cleanColabCpf = (colaborador.cpf || cpfLimpo || '').replace(/\D/g, '');

    // Validação estrita da Nova Senha (mínimo 6 chars, diferente do CPF, sem sequências de 3 dígitos)
    const validacao = validarNovaSenha(newPassword, cleanColabCpf);
    if (!validacao.valida) {
      return NextResponse.json(
        { error: validacao.erro || 'A nova senha não atende aos requisitos de segurança.' },
        { status: 400 }
      );
    }

    // Validação da Senha Atual (se informada ou se não for primeiro acesso)
    const storedHash = colaborador.senha_hash ? String(colaborador.senha_hash).trim() : null;
    const precisaTrocarFlag = Boolean(
      colaborador.precisa_trocar_senha === 1 || 
      colaborador.precisa_trocar_senha === true || 
      colaborador.precisa_trocar_senha === '1' ||
      !storedHash
    );

    if (currentPassword) {
      let currentMatch = false;
      if (!storedHash) {
        if (cleanColabCpf === '00000000000') {
          currentMatch = currentPassword === 'admin123' || currentPassword === cleanColabCpf;
        } else {
          currentMatch = currentPassword === cleanColabCpf;
        }
      } else {
        currentMatch = verifyPassword(currentPassword, storedHash);
      }

      if (!currentMatch && !isFirstAccess) {
        return NextResponse.json(
          { error: 'A senha atual informada está incorreta.' },
          { status: 401 }
        );
      }
    } else if (!isFirstAccess && !precisaTrocarFlag) {
      return NextResponse.json(
        { error: 'Senha atual é obrigatória.' },
        { status: 400 }
      );
    }

    // Gera novo hash seguro com PBKDF2/bcrypt
    const novoHash = hashPassword(newPassword);

    if (isTursoConfigured && colaborador.id) {
      await executeTursoQuery(
        `UPDATE professores 
         SET senha_hash = ?, precisa_trocar_senha = 0 
         WHERE id = ?;`,
        [novoHash, colaborador.id]
      );
      try {
        await executeTursoQuery(
          `UPDATE users 
           SET password_hash = ?, must_change_password = 0 
           WHERE id = ? OR cpf = ?;`,
          [novoHash, colaborador.id, cleanColabCpf]
        );
      } catch {}
    }

    return NextResponse.json({
      success: true,
      precisa_trocar_senha: false,
      message: 'Senha alterada com sucesso! Você já pode utilizar sua nova senha.',
    });
  } catch (error: any) {
    console.error('Erro ao alterar senha:', error);
    return NextResponse.json(
      { error: error?.message || 'Erro interno ao processar a troca de senha.' },
      { status: 500 }
    );
  }
}
