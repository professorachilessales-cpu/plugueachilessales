import { NextRequest, NextResponse } from 'next/server';
import { executeTursoQuery, checkIsTursoConfigured, garantirSchemaAutenticacaoProfessores, garantirSchemaAtestadosProfessor } from '@/lib/turso';
import { isProfessorAdministrativo } from '@/lib/pareceres-ia';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function toBoolean(val: any, defaultIfNull: boolean = false): boolean {
  if (val === null || val === undefined) return defaultIfNull;
  if (val === true || val === 1 || val === '1') return true;
  if (val === false || val === 0 || val === '0') return false;
  if (typeof val === 'string') {
    const s = val.trim().toLowerCase();
    return s === 'true' || s === 'sim' || s === '1';
  }
  return Boolean(val);
}

const ANTI_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
  Pragma: 'no-cache',
  Expires: '0',
  'Surrogate-Control': 'no-store',
};

export async function GET(req: NextRequest) {
  try {
    if (!checkIsTursoConfigured()) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Turso não está configurado no servidor.',
          data: null 
        },
        { 
          status: 503,
          headers: ANTI_CACHE_HEADERS
        }
      );
    }

    await garantirSchemaAutenticacaoProfessores();
    await garantirSchemaAtestadosProfessor();

    // 1. Usuários para checagem administrativa
    let users: any[] = [];
    try {
      const usersRes = await executeTursoQuery('SELECT id, name, cpf, role, is_active FROM users ORDER BY created_at ASC');
      users = usersRes.rows || [];
    } catch (e) {
      console.warn('Aviso ao consultar users em /api/professores:', e);
    }

    // 2. Professores e Funcionários
    let professores: any[] = [];
    try {
      const profRes = await executeTursoQuery('SELECT * FROM professores ORDER BY nome_completo ASC');
      const rawProfessores = (profRes.rows || []).map((row: any) => {
        const isAdmin = toBoolean(row.is_admin) || toBoolean(row.eh_administrativo) || row.funcao_escola === 'Administrativo' || row.funcao_tipo === 'ADMINISTRATIVO';
        const isGeral = !isAdmin && (row.funcao_tipo === 'GERAL' || row.tipo_profissional === 'funcionario' || toBoolean(row.eh_apoio));
        const funcaoTipo = isAdmin ? 'ADMINISTRATIVO' : isGeral ? 'GERAL' : (row.funcao_tipo || 'PROFESSOR');

        return {
          ...row,
          tipo_profissional: row.tipo_profissional || 'docente',
          funcao_escola: row.funcao_escola || null,
          funcao_tipo: funcaoTipo,
          is_admin: isAdmin,
          precisa_trocar_senha: toBoolean(row.precisa_trocar_senha, true),
          ultimo_login: row.ultimo_login || null,
          ativo: toBoolean(row.ativo, true),
          eh_apoio: toBoolean(row.eh_apoio),
          eh_administrativo: isAdmin,
          disciplinas: row.disciplinas ? (typeof row.disciplinas === 'string' ? JSON.parse(row.disciplinas) : row.disciplinas) : [],
          turmas_atribuidas_ids: row.turmas_atribuidas_ids ? (typeof row.turmas_atribuidas_ids === 'string' ? JSON.parse(row.turmas_atribuidas_ids) : row.turmas_atribuidas_ids) : [],
        };
      });

      professores = rawProfessores.map((p: any) => {
        const admin = p.is_admin || isProfessorAdministrativo(p, users);
        return {
          ...p,
          eh_administrativo: admin ? true : Boolean(p.eh_administrativo),
          is_admin: admin,
          turmas_atribuidas_ids: admin ? [] : p.turmas_atribuidas_ids,
        };
      });
    } catch (e) {
      console.error('Erro ao ler professores em /api/professores:', e);
    }

    // 2.1 Vínculos turma_professores
    try {
      const tpRes = await executeTursoQuery('SELECT * FROM turma_professores');
      const turmaProfessores = tpRes.rows || [];
      if (turmaProfessores.length > 0) {
        professores = professores.map((p: any) => {
          const relTurmas = turmaProfessores.filter((tp: any) => tp.professor_id === p.id).map((tp: any) => tp.turma_id);
          return {
            ...p,
            turmas_atribuidas_ids: Array.from(new Set([...(p.turmas_atribuidas_ids || []), ...relTurmas])),
          };
        });
      }
    } catch (e) {
      console.warn('Aviso turma_professores em /api/professores:', e);
    }

    // 3. Turmas (para exibição de turmas atribuídas e regência)
    let turmas: any[] = [];
    try {
      const turmasRes = await executeTursoQuery('SELECT id, nome, grupo, turno, ano_letivo, professor_regente_id, professor_regente_nome, professores_ids, equipe_apoio_ids, ativa FROM turmas ORDER BY nome ASC');
      turmas = (turmasRes.rows || []).map((t: any) => ({
        ...t,
        professores_ids: t.professores_ids ? (typeof t.professores_ids === 'string' ? JSON.parse(t.professores_ids) : t.professores_ids) : [],
        equipe_apoio_ids: t.equipe_apoio_ids ? (typeof t.equipe_apoio_ids === 'string' ? JSON.parse(t.equipe_apoio_ids) : t.equipe_apoio_ids) : [],
        ativa: toBoolean(t.ativa, true),
      }));
    } catch (e) {
      console.warn('Aviso ao consultar turmas em /api/professores:', e);
    }

    // 4. Faltas de Professores / Ausências Docentes
    let faltasProfessores: any[] = [];
    try {
      const faltasRes = await executeTursoQuery('SELECT * FROM faltas_professores ORDER BY COALESCE(data_inicio, data_falta) DESC');

      const historicoMap: Record<string, any[]> = {};
      try {
        const histRes = await executeTursoQuery('SELECT * FROM historico_reposicoes_pagamentos ORDER BY data_registro DESC');
        for (const h of histRes.rows || []) {
          if (!historicoMap[h.ausencia_id]) historicoMap[h.ausencia_id] = [];
          historicoMap[h.ausencia_id].push({
            id: h.id,
            ausencia_id: h.ausencia_id,
            aulas_abatidas: Number(h.aulas_abatidas || 1),
            tipo_baixa: h.tipo_baixa,
            data_reposicao: h.data_reposicao || undefined,
            observacao: h.observacao || undefined,
            data_registro: h.data_registro,
            usuario_id: h.usuario_id || undefined,
            usuario_nome: h.usuario_nome || undefined,
          });
        }
      } catch {}

      faltasProfessores = (faltasRes.rows || []).map((row: any) => {
        const aulasTotais = Number(row.aulas_totais_devidas ?? row.aulas_faltadas ?? 1);
        const aulasPagas = Number(row.aulas_pagas ?? 0);
        const aulasAbonadas = Number(row.aulas_abonadas ?? 0);
        const saldoRestante = Math.max(0, aulasTotais - (aulasPagas + aulasAbonadas));

        let statusReposicao = row.status_reposicao;
        if (!statusReposicao) {
          if (aulasPagas === 0 && aulasAbonadas === 0) {
            statusReposicao = 'A pagar';
          } else if (saldoRestante === 0) {
            statusReposicao = (aulasAbonadas >= aulasTotais) ? 'Abonadas' : 'Totalmente Pago';
          } else {
            statusReposicao = 'Pago Parcialmente';
          }
        }

        return {
          ...row,
          tipo_registro: row.tipo_registro || 'DATA_UNICA',
          data_inicio: row.data_inicio || row.data_falta,
          data_fim: row.data_fim || row.data_inicio || row.data_falta,
          data_falta: row.data_falta || row.data_inicio,
          aulas_calculadas_sistema: Number(row.aulas_calculadas_sistema || 0),
          aulas_totais_devidas: aulasTotais,
          aulas_faltadas: aulasTotais,
          aulas_pagas: aulasPagas,
          aulas_abonadas: aulasAbonadas,
          saldo_restante: saldoRestante,
          status_reposicao: statusReposicao,
          historico_reposicoes: historicoMap[row.id] || [],
          homologada: toBoolean(row.homologada),
        };
      });
    } catch (e) {
      console.error('Erro ao ler faltas_professores em /api/professores:', e);
    }

    // 5. Reposições de Aulas
    let reposicoesAulas: any[] = [];
    try {
      const repRes = await executeTursoQuery('SELECT * FROM reposicoes_aulas ORDER BY data_reposicao DESC');
      reposicoesAulas = (repRes.rows || []).map((row: any) => ({
        ...row,
        homologada: toBoolean(row.homologada),
      }));
    } catch (e) {
      console.warn('Aviso reposicoes_aulas em /api/professores:', e);
    }

    // 6. Atestados Médicos
    let atestadosProfessor: any[] = [];
    try {
      const atRes = await executeTursoQuery('SELECT * FROM atestados_professor ORDER BY created_at DESC');
      atestadosProfessor = (atRes.rows || []).map((row: any) => ({
        ...row,
        homologado: toBoolean(row.homologado),
        aprovado: toBoolean(row.aprovado),
      }));
    } catch (e) {
      console.warn('Aviso atestados_professor em /api/professores:', e);
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          professores,
          turmas,
          faltasProfessores,
          reposicoesAulas,
          atestadosProfessor,
        },
      },
      {
        headers: ANTI_CACHE_HEADERS,
      }
    );
  } catch (err: any) {
    console.error('Erro geral em /api/professores:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Erro ao consultar banco de dados' },
      { status: 500, headers: ANTI_CACHE_HEADERS }
    );
  }
}
