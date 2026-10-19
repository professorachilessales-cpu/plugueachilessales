import { NextRequest, NextResponse } from 'next/server';
import { executeTursoQuery, checkIsTursoConfigured } from '@/lib/turso';
import {
  garantirSchemaRecorrenciaEventos,
  validarParametrosRecorrencia,
  toBooleanStrict,
} from '@/lib/calendario-service';
import { EventoEscolar } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
};

/**
 * GET /api/calendario/eventos
 * Consulta direta e exclusiva à tabela definitiva 'calendario_eventos' no banco de dados.
 */
export async function GET(req: NextRequest) {
  try {
    const userRole = req.headers.get('x-user-role') || req.nextUrl.searchParams.get('role');

    if (!checkIsTursoConfigured()) {
      return NextResponse.json(
        { success: true, data: [] },
        { headers: NO_CACHE_HEADERS }
      );
    }

    await garantirSchemaRecorrenciaEventos();

    // Consulta exclusiva à tabela canônica 'calendario_eventos'
    const res = await executeTursoQuery(`
      SELECT 
        id, 
        titulo, 
        descricao, 
        data_inicio, 
        data_fim, 
        COALESCE(categoria_id, categoria) as categoria_id,
        COALESCE(categoria, categoria_id) as categoria,
        COALESCE(cor_hex, cor, '#2563EB') as cor_hex,
        COALESCE(cor, cor_hex, '#2563EB') as cor,
        publico_alvo,
        created_at, 
        recorrencia_tipo, 
        recorrencia_dia, 
        recorrencia_mes,
        recorrencia_ativa, 
        recorrencia_data_limite,
        criado_por_usuario_id
      FROM calendario_eventos
      ORDER BY data_inicio ASC
    `);

    let eventos: EventoEscolar[] = (res.rows || []).map((r: any) => ({
      id: String(r.id),
      titulo: r.titulo,
      descricao: r.descricao || '',
      data_inicio: r.data_inicio,
      data_fim: r.data_fim,
      categoria: r.categoria || r.categoria_id,
      cor: r.cor || r.cor_hex || '#2563EB',
      publico_alvo: r.publico_alvo || 'Todos',
      all_day: true,
      created_at: r.created_at || new Date().toISOString(),
      recorrencia_tipo: r.recorrencia_tipo || 'NENHUMA',
      recorrencia_dia: r.recorrencia_dia != null ? Number(r.recorrencia_dia) : null,
      recorrencia_mes: r.recorrencia_mes != null ? Number(r.recorrencia_mes) : null,
      recorrencia_ativa: toBooleanStrict(r.recorrencia_ativa),
      recorrencia_data_limite: r.recorrencia_data_limite || null,
    }));

    // Se o usuário for professor, filtrar categorias restritas à gestão
    if (userRole === 'professor') {
      try {
        const catRes = await executeTursoQuery('SELECT id, nome, visivel_docentes FROM calendario_categorias');
        const hiddenCats = new Set<string>();
        for (const c of catRes.rows) {
          if (!toBooleanStrict((c as any).visivel_docentes, true)) {
            hiddenCats.add(String((c as any).id).toLowerCase());
            hiddenCats.add(String((c as any).nome).toLowerCase());
          }
        }
        hiddenCats.add('cat-aniversarios');
        hiddenCats.add('aniversários');
        hiddenCats.add('aniversarios');
        hiddenCats.add('aniverssarios');
        hiddenCats.add('aniverssários');

        eventos = eventos.filter((ev) => {
          const cat = ev.categoria?.toLowerCase() || '';
          return !hiddenCats.has(cat);
        });
      } catch {}
    }

    return NextResponse.json(
      { success: true, data: eventos },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error: any) {
    console.error('Erro na rota GET /api/calendario/eventos:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao carregar eventos do banco de dados' },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

/**
 * POST /api/calendario/eventos
 * Inserção direta e definitiva na tabela 'calendario_eventos' sem retenção em cache.
 */
export async function POST(req: NextRequest) {
  try {
    const userRole = req.headers.get('x-user-role');
    const userId = req.headers.get('x-user-id') || null;

    if (userRole === 'professor') {
      return NextResponse.json(
        { error: 'Acesso negado: Apenas Administradores podem cadastrar eventos.' },
        { status: 403, headers: NO_CACHE_HEADERS }
      );
    }

    const body = await req.json();
    const {
      id,
      titulo,
      descricao,
      data_inicio,
      data_fim,
      categoria,
      categoria_id,
      cor,
      cor_hex,
      publico_alvo,
      recorrencia_tipo,
      recorrencia_dia,
      recorrencia_mes,
      recorrencia_ativa,
      recorrencia_data_limite,
      criado_por_usuario_id,
      usuario_id,
    } = body;

    const catFinal = categoria || categoria_id;
    if (!titulo || !data_inicio || !data_fim || !catFinal) {
      return NextResponse.json(
        { error: 'Título, data de início, data de término e categoria são obrigatórios.' },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    // Validação de regras estruturais de recorrência
    const validacao = validarParametrosRecorrencia({
      recorrencia_tipo,
      recorrencia_dia,
      recorrencia_mes,
      recorrencia_ativa,
      recorrencia_data_limite,
    });

    if (!validacao.valido) {
      return NextResponse.json(
        { error: validacao.erro },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const eventoId = id || `ev-${Date.now()}`;
    const corFinal = cor_hex || cor || '#2563EB';
    const autorId = criado_por_usuario_id || usuario_id || userId;
    const recTipo = recorrencia_tipo || 'NENHUMA';
    const recDia = recTipo !== 'NENHUMA' && recorrencia_dia != null ? Number(recorrencia_dia) : null;
    const recMes = recTipo === 'ANUAL' && recorrencia_mes != null ? Number(recorrencia_mes) : null;
    const recAtiva = recTipo !== 'NENHUMA' && toBooleanStrict(recorrencia_ativa) ? 1 : 0;
    const recLimite = recTipo !== 'NENHUMA' && recorrencia_data_limite ? recorrencia_data_limite : null;

    if (isTursoConfigured) {
      await garantirSchemaRecorrenciaEventos();

      // Query SQL explícita e direta na tabela definitiva 'calendario_eventos'
      const sqlInsertCal = `
        INSERT INTO calendario_eventos (
          id,
          titulo,
          categoria_id,
          categoria,
          data_inicio,
          data_fim,
          cor_hex,
          cor,
          publico_alvo,
          recorrencia_tipo,
          recorrencia_dia,
          recorrencia_mes,
          recorrencia_ativa,
          recorrencia_data_limite,
          descricao,
          criado_por_usuario_id,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(id) DO UPDATE SET
          titulo = excluded.titulo,
          categoria_id = excluded.categoria_id,
          categoria = excluded.categoria,
          data_inicio = excluded.data_inicio,
          data_fim = excluded.data_fim,
          cor_hex = excluded.cor_hex,
          cor = excluded.cor,
          publico_alvo = excluded.publico_alvo,
          recorrencia_tipo = excluded.recorrencia_tipo,
          recorrencia_dia = excluded.recorrencia_dia,
          recorrencia_mes = excluded.recorrencia_mes,
          recorrencia_ativa = excluded.recorrencia_ativa,
          recorrencia_data_limite = excluded.recorrencia_data_limite,
          descricao = excluded.descricao,
          criado_por_usuario_id = COALESCE(excluded.criado_por_usuario_id, calendario_eventos.criado_por_usuario_id)
      `;

      const args = [
        eventoId,
        titulo.trim(),
        catFinal,
        catFinal,
        data_inicio,
        data_fim,
        corFinal,
        corFinal,
        publico_alvo || 'Todos',
        recTipo,
        recDia,
        recMes,
        recAtiva,
        recLimite,
        descricao || '',
        autorId,
      ];

      await executeTursoQuery(sqlInsertCal, args);

      // Espelhamento na tabela legada 'eventos' para retrocompatibilidade
      try {
        const sqlInsertEventos = sqlInsertCal.replace(/calendario_eventos/g, 'eventos');
        await executeTursoQuery(sqlInsertEventos, args);
      } catch {}
    }

    const eventoSalvo: EventoEscolar = {
      id: eventoId,
      titulo: titulo.trim(),
      descricao: descricao || '',
      data_inicio,
      data_fim,
      categoria: catFinal,
      cor: corFinal,
      publico_alvo: publico_alvo || 'Todos',
      all_day: true,
      created_at: new Date().toISOString(),
      recorrencia_tipo: recTipo,
      recorrencia_dia: recDia,
      recorrencia_mes: recMes,
      recorrencia_ativa: Boolean(recAtiva),
      recorrencia_data_limite: recLimite,
    };

    return NextResponse.json(
      { success: true, data: eventoSalvo },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error: any) {
    console.error('Erro ao salvar evento em calendario_eventos:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao persistir evento no banco de dados' },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

/**
 * PUT /api/calendario/eventos
 * Atualização direta no banco de dados 'calendario_eventos'.
 */
export async function PUT(req: NextRequest) {
  return POST(req);
}

/**
 * DELETE /api/calendario/eventos
 * Exclusão definitiva da tabela 'calendario_eventos' no banco de dados.
 */
export async function DELETE(req: NextRequest) {
  try {
    const userRole = req.headers.get('x-user-role');
    if (userRole === 'professor') {
      return NextResponse.json(
        { error: 'Acesso negado: Apenas Administradores podem excluir eventos.' },
        { status: 403, headers: NO_CACHE_HEADERS }
      );
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const aPartirDeAno = searchParams.get('apartir_de_ano');

    if (!id) {
      return NextResponse.json(
        { error: 'ID do evento é obrigatório para exclusão.' },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    if (isTursoConfigured) {
      if (aPartirDeAno) {
        const anoNum = Number(aPartirDeAno);
        // Busca a data de início original do evento para saber se é o primeiro ano
        const eventoExistente = await executeTursoQuery(
          'SELECT data_inicio FROM calendario_eventos WHERE id = ?',
          [id]
        );
        const dataInicio = eventoExistente.rows?.[0]?.data_inicio
          ? String(eventoExistente.rows[0].data_inicio)
          : '';
        const anoInicio = dataInicio ? Number(dataInicio.split('-')[0]) : anoNum;

        if (isNaN(anoNum) || anoNum <= anoInicio) {
          // Se for o ano de início ou anterior, exclui completamente
          await executeTursoQuery('DELETE FROM calendario_eventos WHERE id = ?', [id]);
          try {
            await executeTursoQuery('DELETE FROM eventos WHERE id = ?', [id]);
          } catch {}
        } else {
          // Define a data limite da recorrência para 31/12 do ano anterior
          const limite = `${anoNum - 1}-12-31`;
          await executeTursoQuery(
            'UPDATE calendario_eventos SET recorrencia_data_limite = ? WHERE id = ?',
            [limite, id]
          );
          try {
            await executeTursoQuery(
              'UPDATE eventos SET recorrencia_data_limite = ? WHERE id = ?',
              [limite, id]
            );
          } catch {}
        }
      } else {
        // Exclusão definitiva de todas as ocorrências em ambas as tabelas
        await executeTursoQuery('DELETE FROM calendario_eventos WHERE id = ?', [id]);
        try {
          await executeTursoQuery('DELETE FROM eventos WHERE id = ?', [id]);
        } catch {}
      }
    }

    return NextResponse.json(
      { success: true, message: 'Operação de exclusão realizada com sucesso.' },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error: any) {
    console.error('Erro ao excluir evento em calendario_eventos:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao excluir evento do banco de dados' },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
