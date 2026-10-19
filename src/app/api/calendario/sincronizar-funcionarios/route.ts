import { NextRequest, NextResponse } from 'next/server';
import { executeTursoQuery, checkIsTursoConfigured } from '@/lib/turso';
import {
  garantirSchemaRecorrenciaEventos,
  extrairPrimeiroESegundoNome,
  parseDataNascimento,
} from '@/lib/calendario-service';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
};

/**
 * POST /api/calendario/sincronizar-funcionarios
 * Botão de sistema para sincronizar aniversários dos funcionários/professores
 * na tabela 'calendario_eventos' com base na data de nascimento de cada um.
 * Título: primeiro e segundo nome do professor.
 * Categoria: aniverssarios.
 * Recorrência: ativa (ANUAL, recorrencia_ativa = 1).
 */
export async function POST(req: NextRequest) {
  try {
    const userRole = req.headers.get('x-user-role');
    if (userRole === 'professor') {
      return NextResponse.json(
        { error: 'Acesso negado: Apenas a Gestão/Administração pode sincronizar funcionários.' },
        { status: 403, headers: NO_CACHE_HEADERS }
      );
    }

    if (!checkIsTursoConfigured()) {
      return NextResponse.json(
        { success: false, error: 'Banco de dados Turso não está configurado.' },
        { status: 503, headers: NO_CACHE_HEADERS }
      );
    }

    // 1. Garante integridade do schema de eventos e recorrência
    await garantirSchemaRecorrenciaEventos();

    // 2. Obtém ano letivo ativo
    let anoLetivo = new Date().getFullYear();
    try {
      const configRes = await executeTursoQuery(
        'SELECT ano_letivo_ativo FROM config_escola LIMIT 1'
      );
      if (configRes.rows && configRes.rows.length > 0 && (configRes.rows[0] as any).ano_letivo_ativo) {
        anoLetivo = Number((configRes.rows[0] as any).ano_letivo_ativo) || anoLetivo;
      }
    } catch (e) {
      console.warn('Aviso ao consultar ano_letivo_ativo de config_escola:', e);
    }

    // 3. Consulta professores da base (inclui professores e funcionários de apoio/administrativos)
    let profRes;
    try {
      profRes = await executeTursoQuery(
        'SELECT id, nome_completo, data_nascimento, ativo, deleted_at FROM professores WHERE deleted_at IS NULL ORDER BY nome_completo ASC'
      );
    } catch {
      // Caso a coluna deleted_at não exista
      profRes = await executeTursoQuery(
        'SELECT id, nome_completo, data_nascimento, ativo FROM professores ORDER BY nome_completo ASC'
      );
    }
    const professores = profRes.rows || [];

    // 4. Consulta eventos existentes em calendario_eventos
    const calRes = await executeTursoQuery(`
      SELECT 
        id, 
        titulo, 
        descricao, 
        data_inicio, 
        data_fim, 
        categoria, 
        categoria_id, 
        recorrencia_tipo, 
        recorrencia_dia, 
        recorrencia_mes, 
        recorrencia_ativa 
      FROM calendario_eventos
    `);
    const eventosExistentes = calRes.rows || [];

    let cadastrados = 0;
    let alterados = 0;
    let inalterados = 0;
    let semDataNascimento = 0;
    const detalhes: Array<{
      professorId: string;
      nomeCompleto: string;
      titulo: string;
      status: 'cadastrado' | 'alterado' | 'inalterado' | 'sem_data';
      dataNascimento?: string;
    }> = [];

    const categoriaFinal = 'aniverssarios';
    const categoriaIdFinal = 'cat-aniversarios';
    const corFinal = '#4169E1'; // Azul Royal padrão de Aniversários

    for (const p of professores as any[]) {
      const profId = String(p.id);
      const nomeCompleto = String(p.nome_completo || '').trim();
      const dataNascRaw = p.data_nascimento ? String(p.data_nascimento).trim() : '';

      const parsedNasc = parseDataNascimento(dataNascRaw);
      if (!parsedNasc) {
        semDataNascimento++;
        detalhes.push({
          professorId: profId,
          nomeCompleto,
          titulo: extrairPrimeiroESegundoNome(nomeCompleto),
          status: 'sem_data',
        });
        continue;
      }

      const { dia, mes } = parsedNasc;
      const titulo = extrairPrimeiroESegundoNome(nomeCompleto);
      const diaStr = String(dia).padStart(2, '0');
      const mesStr = String(mes).padStart(2, '0');
      const dataEvento = `${anoLetivo}-${mesStr}-${diaStr}`;
      const descricaoEvento = `Aniversário de ${nomeCompleto} [prof_id:${profId}]`;

      // Localiza evento existente deste professor
      const evExistente = (eventosExistentes as any[]).find((ev) => {
        const evId = String(ev.id);
        const evDesc = String(ev.descricao || '');
        const evTitulo = String(ev.titulo || '').trim().toLowerCase();
        const evCat = String(ev.categoria || ev.categoria_id || '').toLowerCase();

        // Match por ID determinístico ou metadado
        if (evId === `aniv-prof-${profId}` || evId === `ev-aniv-${profId}` || evId === `aniv-${profId}`) {
          return true;
        }
        if (evDesc.includes(`[prof_id:${profId}]`)) {
          return true;
        }

        // Match por categoria de aniversário e título exato
        const isCatAniv = [
          'aniverssarios',
          'aniverssário',
          'aniversarios',
          'aniversários',
          'cat-aniversarios',
        ].includes(evCat);
        if (isCatAniv && evTitulo === titulo.toLowerCase()) {
          return true;
        }

        return false;
      });

      if (!evExistente) {
        // CADASTRAR NOVO REGISTRO
        const novoEventoId = `aniv-prof-${profId}`;
        const sqlInsert = `
          INSERT INTO calendario_eventos (
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
            created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ANUAL', ?, ?, 1, NULL, CURRENT_TIMESTAMP)
          ON CONFLICT(id) DO UPDATE SET
            titulo = excluded.titulo,
            descricao = excluded.descricao,
            data_inicio = excluded.data_inicio,
            data_fim = excluded.data_fim,
            categoria = excluded.categoria,
            categoria_id = excluded.categoria_id,
            cor = excluded.cor,
            cor_hex = excluded.cor_hex,
            publico_alvo = excluded.publico_alvo,
            recorrencia_tipo = excluded.recorrencia_tipo,
            recorrencia_dia = excluded.recorrencia_dia,
            recorrencia_mes = excluded.recorrencia_mes,
            recorrencia_ativa = excluded.recorrencia_ativa
        `;

        const argsInsert = [
          novoEventoId,
          titulo,
          descricaoEvento,
          dataEvento,
          dataEvento,
          categoriaFinal,
          categoriaIdFinal,
          corFinal,
          corFinal,
          'Toda a Escola',
          dia,
          mes,
        ];

        await executeTursoQuery(sqlInsert, argsInsert);

        // Espelha na tabela legada 'eventos'
        try {
          const sqlInsertEventos = sqlInsert.replace(/calendario_eventos/g, 'eventos');
          await executeTursoQuery(sqlInsertEventos, argsInsert);
        } catch {}

        cadastrados++;
        detalhes.push({
          professorId: profId,
          nomeCompleto,
          titulo,
          status: 'cadastrado',
          dataNascimento: `${diaStr}/${mesStr}`,
        });
      } else {
        // VERIFICAR SE HÁ ALTERAÇÃO
        const evId = String(evExistente.id);
        const evTitulo = String(evExistente.titulo || '').trim();
        const evDia = Number(evExistente.recorrencia_dia);
        const evMes = Number(evExistente.recorrencia_mes);
        const evTipo = String(evExistente.recorrencia_tipo || '');
        const evAtiva = Number(evExistente.recorrencia_ativa) === 1 || evExistente.recorrencia_ativa === true;
        const evInicio = String(evExistente.data_inicio || '').split('T')[0];
        const evCat = String(evExistente.categoria || '');

        const precisaAtualizar =
          evTitulo !== titulo ||
          evDia !== dia ||
          evMes !== mes ||
          evTipo !== 'ANUAL' ||
          !evAtiva ||
          evInicio !== dataEvento ||
          evCat !== categoriaFinal;

        if (precisaAtualizar) {
          const sqlUpdate = `
            UPDATE calendario_eventos SET
              titulo = ?,
              descricao = ?,
              data_inicio = ?,
              data_fim = ?,
              categoria = ?,
              categoria_id = ?,
              cor = ?,
              cor_hex = ?,
              publico_alvo = 'Toda a Escola',
              recorrencia_tipo = 'ANUAL',
              recorrencia_dia = ?,
              recorrencia_mes = ?,
              recorrencia_ativa = 1,
              recorrencia_data_limite = NULL
            WHERE id = ?
          `;

          const argsUpdate = [
            titulo,
            descricaoEvento,
            dataEvento,
            dataEvento,
            categoriaFinal,
            categoriaIdFinal,
            corFinal,
            corFinal,
            dia,
            mes,
            evId,
          ];

          await executeTursoQuery(sqlUpdate, argsUpdate);

          // Espelha na tabela legada 'eventos'
          try {
            const sqlUpdateEventos = sqlUpdate.replace(/calendario_eventos/g, 'eventos');
            await executeTursoQuery(sqlUpdateEventos, argsUpdate);
          } catch {}

          alterados++;
          detalhes.push({
            professorId: profId,
            nomeCompleto,
            titulo,
            status: 'alterado',
            dataNascimento: `${diaStr}/${mesStr}`,
          });
        } else {
          inalterados++;
          detalhes.push({
            professorId: profId,
            nomeCompleto,
            titulo,
            status: 'inalterado',
            dataNascimento: `${diaStr}/${mesStr}`,
          });
        }
      }
    }

    return NextResponse.json(
      {
        success: true,
        totalProfessores: professores.length,
        cadastrados,
        alterados,
        inalterados,
        semDataNascimento,
        detalhes,
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error: any) {
    console.error('Erro na sincronização de funcionários no calendário:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Erro interno ao sincronizar funcionários' },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
