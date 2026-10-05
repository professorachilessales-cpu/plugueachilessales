import { NextRequest, NextResponse } from 'next/server';
import { executeTursoQuery, isTursoConfigured } from '@/lib/turso';
import {
  garantirSchemaRecorrenciaEventos,
  validarParametrosRecorrencia,
  toBooleanStrict,
} from '@/lib/calendario-service';
import { EventoEscolar } from '@/lib/types';
import { initialEventos } from '@/lib/mock-data';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const userRole = req.headers.get('x-user-role') || req.nextUrl.searchParams.get('role');

    if (isTursoConfigured) {
      await garantirSchemaRecorrenciaEventos();

      // Consulta eventos do banco de dados Turso
      const res = await executeTursoQuery(`
        SELECT 
          id, titulo, descricao, data_inicio, data_fim, categoria, cor, publico_alvo,
          created_at, recorrencia_tipo, recorrencia_dia, recorrencia_mes,
          recorrencia_ativa, recorrencia_data_limite
        FROM eventos
        ORDER BY data_inicio ASC
      `);

      let eventos: EventoEscolar[] = (res.rows || []).map((r: any) => ({
        id: r.id,
        titulo: r.titulo,
        descricao: r.descricao || '',
        data_inicio: r.data_inicio,
        data_fim: r.data_fim,
        categoria: r.categoria,
        cor: r.cor || '#2563EB',
        publico_alvo: r.publico_alvo || 'Todos',
        all_day: true,
        created_at: r.created_at,
        recorrencia_tipo: r.recorrencia_tipo || 'NENHUMA',
        recorrencia_dia: r.recorrencia_dia != null ? Number(r.recorrencia_dia) : null,
        recorrencia_mes: r.recorrencia_mes != null ? Number(r.recorrencia_mes) : null,
        recorrencia_ativa: toBooleanStrict(r.recorrencia_ativa),
        recorrencia_data_limite: r.recorrencia_data_limite || null,
      }));

      // Se o usuário for professor, filtrar eventos de categorias restritas
      if (userRole === 'professor') {
        const catRes = await executeTursoQuery('SELECT id, nome, visivel_docentes FROM calendario_categorias');
        const hiddenCats = new Set<string>();
        for (const c of catRes.rows) {
          if (!toBooleanStrict((c as any).visivel_docentes, true)) {
            hiddenCats.add(String((c as any).id).toLowerCase());
            hiddenCats.add(String((c as any).nome).toLowerCase());
          }
        }
        // Sempre oculta 'cat-aniversarios'
        hiddenCats.add('cat-aniversarios');
        hiddenCats.add('aniversários');
        hiddenCats.add('aniversarios');

        eventos = eventos.filter((ev) => {
          const cat = ev.categoria?.toLowerCase() || '';
          return !hiddenCats.has(cat);
        });
      }

      return NextResponse.json({ success: true, data: eventos });
    }

    // Fallback Mock se Turso não estiver configurado
    let eventos = initialEventos.map((ev) => ({
      ...ev,
      recorrencia_tipo: ev.recorrencia_tipo || 'NENHUMA',
      recorrencia_dia: ev.recorrencia_dia || null,
      recorrencia_mes: ev.recorrencia_mes || null,
      recorrencia_ativa: Boolean(ev.recorrencia_ativa),
      recorrencia_data_limite: ev.recorrencia_data_limite || null,
    }));

    if (userRole === 'professor') {
      eventos = eventos.filter((e) => e.categoria !== 'cat-aniversarios' && !e.categoria.includes('aniversario'));
    }

    return NextResponse.json({ success: true, data: eventos });
  } catch (error: any) {
    console.error('Erro na rota GET /api/calendario/eventos:', error);
    return NextResponse.json({ error: error.message || 'Erro ao carregar eventos' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userRole = req.headers.get('x-user-role');
    if (userRole === 'professor') {
      return NextResponse.json(
        { error: 'Acesso negado: Apenas Administradores podem cadastrar eventos.' },
        { status: 403 }
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
      cor,
      publico_alvo,
      recorrencia_tipo,
      recorrencia_dia,
      recorrencia_mes,
      recorrencia_ativa,
      recorrencia_data_limite,
    } = body;

    if (!titulo || !data_inicio || !data_fim || !categoria) {
      return NextResponse.json(
        { error: 'Título, data de início, data de término e categoria são obrigatórios.' },
        { status: 400 }
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
      return NextResponse.json({ error: validacao.erro }, { status: 400 });
    }

    const eventoId = id || `ev-${Date.now()}`;
    const recTipo = recorrencia_tipo || 'NENHUMA';
    const recDia = recTipo !== 'NENHUMA' && recorrencia_dia != null ? Number(recorrencia_dia) : null;
    const recMes = recTipo === 'ANUAL' && recorrencia_mes != null ? Number(recorrencia_mes) : null;
    const recAtiva = recTipo !== 'NENHUMA' && toBooleanStrict(recorrencia_ativa) ? 1 : 0;
    const recLimite = recTipo !== 'NENHUMA' && recorrencia_data_limite ? recorrencia_data_limite : null;

    if (isTursoConfigured) {
      await garantirSchemaRecorrenciaEventos();

      const sqlInsertEventos = `
        INSERT INTO eventos (
          id, titulo, descricao, data_inicio, data_fim, categoria, cor,
          publico_alvo, recorrencia_tipo, recorrencia_dia, recorrencia_mes,
          recorrencia_ativa, recorrencia_data_limite, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          titulo = excluded.titulo,
          descricao = excluded.descricao,
          data_inicio = excluded.data_inicio,
          data_fim = excluded.data_fim,
          categoria = excluded.categoria,
          cor = excluded.cor,
          publico_alvo = excluded.publico_alvo,
          recorrencia_tipo = excluded.recorrencia_tipo,
          recorrencia_dia = excluded.recorrencia_dia,
          recorrencia_mes = excluded.recorrencia_mes,
          recorrencia_ativa = excluded.recorrencia_ativa,
          recorrencia_data_limite = excluded.recorrencia_data_limite
      `;

      const args = [
        eventoId,
        titulo.trim(),
        descricao || '',
        data_inicio,
        data_fim,
        categoria,
        cor || '#2563EB',
        publico_alvo || 'Todos',
        recTipo,
        recDia,
        recMes,
        recAtiva,
        recLimite,
        new Date().toISOString(),
      ];

      // Salva em eventos
      await executeTursoQuery(sqlInsertEventos, args);

      // Sincroniza em paralelo em calendario_eventos para integridade total
      const sqlInsertCal = sqlInsertEventos.replace('INTO eventos', 'INTO calendario_eventos');
      await executeTursoQuery(sqlInsertCal, args);
    }

    const eventoSalvo: EventoEscolar = {
      id: eventoId,
      titulo: titulo.trim(),
      descricao: descricao || '',
      data_inicio,
      data_fim,
      categoria,
      cor: cor || '#2563EB',
      publico_alvo: publico_alvo || 'Todos',
      all_day: true,
      created_at: new Date().toISOString(),
      recorrencia_tipo: recTipo,
      recorrencia_dia: recDia,
      recorrencia_mes: recMes,
      recorrencia_ativa: Boolean(recAtiva),
      recorrencia_data_limite: recLimite,
    };

    return NextResponse.json({ success: true, data: eventoSalvo });
  } catch (error: any) {
    console.error('Erro ao salvar evento no banco de dados:', error);
    return NextResponse.json({ error: error.message || 'Erro ao persistir evento' }, { status: 500 });
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
        { error: 'Acesso negado: Apenas Administradores podem excluir eventos.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID do evento é obrigatório.' }, { status: 400 });
    }

    if (isTursoConfigured) {
      await executeTursoQuery('DELETE FROM eventos WHERE id = ?', [id]);
      await executeTursoQuery('DELETE FROM calendario_eventos WHERE id = ?', [id]);
    }

    return NextResponse.json({ success: true, message: 'Evento excluído com sucesso.' });
  } catch (error: any) {
    console.error('Erro ao excluir evento:', error);
    return NextResponse.json({ error: error.message || 'Erro ao excluir evento' }, { status: 500 });
  }
}
