import { NextRequest, NextResponse } from 'next/server';
import { executeTursoQuery, checkIsTursoConfigured } from '@/lib/turso';
import { CalendarioCategoria } from '@/lib/types';
import { initialCategoriasEvento } from '@/lib/mock-data';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const userRole = req.headers.get('x-user-role') || req.nextUrl.searchParams.get('role');

    if (checkIsTursoConfigured()) {
      await executeTursoQuery(`
        CREATE TABLE IF NOT EXISTS calendario_categorias (
          id TEXT PRIMARY KEY,
          nome TEXT NOT NULL UNIQUE,
          cor_hex TEXT NOT NULL,
          visivel_docentes INTEGER NOT NULL DEFAULT 1,
          sistema_protegida INTEGER NOT NULL DEFAULT 0,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);

      const res = await executeTursoQuery('SELECT * FROM calendario_categorias ORDER BY created_at ASC');
      let cats: CalendarioCategoria[] = res.rows.map((r: any) => ({
        id: r.id,
        nome: r.nome,
        cor_hex: r.cor_hex,
        visivel_docentes: Boolean(r.visivel_docentes === 1 || r.visivel_docentes === true),
        sistema_protegida: Boolean(r.sistema_protegida === 1 || r.sistema_protegida === true),
        created_at: r.created_at,
      }));

      if (cats.length === 0) {
        cats = initialCategoriasEvento;
        for (const c of cats) {
          await executeTursoQuery(
            'INSERT OR IGNORE INTO calendario_categorias (id, nome, cor_hex, visivel_docentes, sistema_protegida) VALUES (?, ?, ?, ?, ?)',
            [c.id, c.nome, c.cor_hex, c.visivel_docentes ? 1 : 0, c.sistema_protegida ? 1 : 0]
          );
        }
      }

      // Regra de Visibilidade: Aniversários não é visível aos docentes
      cats = cats.map(c => {
        if (c.id === 'cat-aniversarios' || c.nome.toLowerCase() === 'aniversários') {
          return { ...c, visivel_docentes: false };
        }
        // Auto-correção: categorias pedagógicas essenciais são visíveis aos docentes
        const nomeLower = c.nome.toLowerCase();
        if (
          (c.id === 'cat-provas' || c.id === 'cat-reunioes' || nomeLower.includes('prova') || nomeLower.includes('avalia') || nomeLower.includes('reuni')) &&
          c.visivel_docentes === false
        ) {
          return { ...c, visivel_docentes: true };
        }
        return c;
      });

      // Regra de Visibilidade Docente: se perfil for professor, oculta categorias restritas
      if (userRole === 'professor') {
        cats = cats.filter((c) => c.visivel_docentes);
      }

      return NextResponse.json({ success: true, data: cats });
    }

    let cats = initialCategoriasEvento.map(c => {
      if (c.id === 'cat-aniversarios' || c.nome.toLowerCase() === 'aniversários') {
        return { ...c, visivel_docentes: false };
      }
      return c;
    });
    if (userRole === 'professor') {
      cats = cats.filter((c) => c.visivel_docentes);
    }
    return NextResponse.json({ success: true, data: cats });
  } catch (error: any) {
    console.error('Erro na API de categorias do calendário:', error);
    return NextResponse.json({ error: error.message || 'Erro ao carregar categorias' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userRole = req.headers.get('x-user-role');
    if (userRole === 'professor') {
      return NextResponse.json(
        { error: 'Acesso negado: Apenas Administradores podem cadastrar ou editar categorias.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { id, nome, cor_hex, visivel_docentes } = body;

    if (!nome || !cor_hex) {
      return NextResponse.json(
        { error: 'Nome e cor da categoria são obrigatórios.' },
        { status: 400 }
      );
    }

    const catId = id || `cat-${Date.now()}`;
    const isAniversarios = catId === 'cat-aniversarios' || nome.trim().toLowerCase() === 'aniversários';
    const visivel = isAniversarios ? 0 : (visivel_docentes !== false ? 1 : 0);

    // Regra de Proteção: A categoria Aniversários não pode ter seu nome alterado
    if (catId === 'cat-aniversarios' && nome.trim().toLowerCase() !== 'aniversários') {
      return NextResponse.json(
        { error: 'O nome da categoria "Aniversários" é protegido do sistema e não pode ser alterado.' },
        { status: 400 }
      );
    }

    if (checkIsTursoConfigured()) {
      // Valida se já existe outra categoria com esse nome
      const checkDupe = await executeTursoQuery(
        'SELECT id FROM calendario_categorias WHERE LOWER(nome) = LOWER(?) AND id != ?',
        [nome.trim(), catId]
      );
      if (checkDupe.rows.length > 0) {
        return NextResponse.json(
          { error: 'Já existe uma categoria cadastrada com este nome.' },
          { status: 400 }
        );
      }

      await executeTursoQuery(
        `INSERT INTO calendario_categorias (id, nome, cor_hex, visivel_docentes, sistema_protegida)
         VALUES (?, ?, ?, ?, 0)
         ON CONFLICT(id) DO UPDATE SET
           nome = excluded.nome,
           cor_hex = excluded.cor_hex,
           visivel_docentes = excluded.visivel_docentes`,
        [catId, nome.trim(), cor_hex.trim(), visivel]
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: catId,
        nome: nome.trim(),
        cor_hex: cor_hex.trim(),
        visivel_docentes: Boolean(visivel),
        sistema_protegida: catId === 'cat-aniversarios',
      },
    });
  } catch (error: any) {
    console.error('Erro ao salvar categoria:', error);
    return NextResponse.json({ error: error.message || 'Erro ao salvar categoria' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  return POST(req);
}

export async function DELETE(req: NextRequest) {
  try {
    const userRole = req.headers.get('x-user-role');
    if (userRole === 'professor') {
      return NextResponse.json(
        { error: 'Acesso negado: Apenas Administradores podem excluir categorias.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID da categoria não fornecido.' }, { status: 400 });
    }

    // Regra Obrigatória: Categoria "Aniversários" é protegida e NUNCA pode ser excluída
    if (
      id === 'cat-aniversarios' ||
      id.toLowerCase().includes('aniversario')
    ) {
      return NextResponse.json(
        { error: 'A categoria "Aniversários" é fixa e protegida do sistema. Não é permitida a exclusão.' },
        { status: 403 }
      );
    }

    if (checkIsTursoConfigured()) {
      const checkRes = await executeTursoQuery(
        'SELECT sistema_protegida, nome FROM calendario_categorias WHERE id = ?',
        [id]
      );
      if (checkRes.rows.length > 0) {
        const row: any = checkRes.rows[0];
        if (
          row.sistema_protegida === 1 ||
          row.sistema_protegida === true ||
          row.nome?.toLowerCase() === 'aniversários'
        ) {
          return NextResponse.json(
            { error: 'Esta categoria é protegida pelo sistema e não pode ser excluída.' },
            { status: 403 }
          );
        }
      }

      await executeTursoQuery('DELETE FROM calendario_categorias WHERE id = ?', [id]);
    }

    return NextResponse.json({ success: true, message: 'Categoria excluída com sucesso.' });
  } catch (error: any) {
    console.error('Erro ao excluir categoria:', error);
    return NextResponse.json({ error: error.message || 'Erro ao excluir categoria' }, { status: 500 });
  }
}
