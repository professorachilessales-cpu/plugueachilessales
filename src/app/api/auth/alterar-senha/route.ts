import { NextRequest, NextResponse } from 'next/server';
import { 
  verifyPassword, 
  hashPassword, 
  sanitizeString 
} from '@/lib/security';
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

    if (!currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.json(
        { error: 'Senha atual, nova senha e confirmação de senha são obrigatórias.' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'A nova senha deve possuir no mínimo 6 caracteres.' },
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

    // Validação da Senha Atual
    const storedHash = colaborador.senha_hash ? String(colaborador.senha_hash).trim() : null;
    const cleanColabCpf = (colaborador.cpf || '').replace(/\D/g, '');
    let currentMatch = false;

    if (!storedHash) {
      // Se ainda não tinha senha_hash, a senha atual válida é o CPF limpo (ou admin123 para o master)
      if (cleanColabCpf === '00000000000') {
        currentMatch = currentPassword === 'admin123' || currentPassword === cleanColabCpf;
      } else {
        currentMatch = currentPassword === cleanColabCpf;
      }
    } else {
      currentMatch = verifyPassword(currentPassword, storedHash);
    }

    if (!currentMatch) {
      return NextResponse.json(
        { error: 'A senha atual informada está incorreta.' },
        { status: 401 }
      );
    }

    // Gera novo hash seguro com bcrypt / pbkdf2
    const novoHash = hashPassword(newPassword);

    if (isTursoConfigured && colaborador.id) {
      await executeTursoQuery(
        `UPDATE professores 
         SET senha_hash = ?, precisa_trocar_senha = 0 
         WHERE id = ?;`,
        [novoHash, colaborador.id]
      );
    }

    return NextResponse.json({
      success: true,
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
