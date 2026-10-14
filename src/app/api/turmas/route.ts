import { NextRequest, NextResponse } from 'next/server';
import { executeTursoQuery, checkIsTursoConfigured } from '@/lib/turso';
import { Turma } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
};

function toBoolean(val: any, defaultVal = true): boolean {
  if (val === null || val === undefined) return defaultVal;
  if (val === true || val === 1 || val === '1') return true;
  if (val === false || val === 0 || val === '0') return false;
  if (typeof val === 'string') {
    const s = val.trim().toLowerCase();
    return s === 'true' || s === 'sim' || s === '1';
  }
  return Boolean(val);
}

/**
 * GET /api/turmas
 * Consulta direta e exclusiva à tabela definitiva 'turmas' no banco de dados Turso.
 */
export async function GET(req: NextRequest) {
  try {
    if (!checkIsTursoConfigured()) {
      return NextResponse.json(
        { success: true, data: [] },
        { headers: NO_CACHE_HEADERS }
      );
    }

    // Consulta turmas do banco
    const turmasRes = await executeTursoQuery('SELECT * FROM turmas ORDER BY nome ASC');
    
    // Consulta vínculos relacionais adicionais se disponíveis
    let turmaProfessores: any[] = [];
    try {
      const tpRes = await executeTursoQuery('SELECT * FROM turma_professores');
      turmaProfessores = tpRes.rows || [];
    } catch {}

    const turmas: Turma[] = (turmasRes.rows || []).map((row: any) => {
      let parsedProfs: string[] = [];
      if (row.professores_ids) {
        try {
          parsedProfs = typeof row.professores_ids === 'string' ? JSON.parse(row.professores_ids) : row.professores_ids;
        } catch {
          parsedProfs = [];
        }
      }
      if (!Array.isArray(parsedProfs) || parsedProfs.length === 0) {
        const relProfs = turmaProfessores.filter((tp: any) => tp.turma_id === row.id).map((tp: any) => tp.professor_id);
        parsedProfs = relProfs.length > 0
          ? relProfs
          : (row.professor_regente_id ? [row.professor_regente_id] : []);
      }

      let parsedApoio: string[] = [];
      if (row.equipe_apoio_ids) {
        try {
          parsedApoio = typeof row.equipe_apoio_ids === 'string' ? JSON.parse(row.equipe_apoio_ids) : row.equipe_apoio_ids;
        } catch {
          parsedApoio = [];
        }
      }

      let parsedGrade: any[] = [];
      if (row.grade_horaria) {
        try {
          parsedGrade = typeof row.grade_horaria === 'string' ? JSON.parse(row.grade_horaria) : row.grade_horaria;
        } catch {
          parsedGrade = [];
        }
      }

      return {
        id: String(row.id),
        nome: String(row.nome || ''),
        grupo: row.grupo || undefined,
        turno: row.turno || 'manha',
        capacidade: Number(row.capacidade) || 0,
        ano_letivo: Number(row.ano_letivo) || new Date().getFullYear(),
        professor_regente_id: row.professor_regente_id || undefined,
        professor_regente_nome: row.professor_regente_nome || undefined,
        professores_ids: parsedProfs,
        equipe_apoio_ids: parsedApoio,
        sala: String(row.sala || ''),
        ativa: toBoolean(row.ativa, true) ? 1 : 0,
        grade_horaria: parsedGrade,
        created_at: row.created_at || new Date().toISOString(),
      };
    });

    return NextResponse.json(
      { success: true, data: turmas },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error: any) {
    console.error('Erro ao buscar turmas no Turso:', error);
    return NextResponse.json(
      { error: error.message || 'Falha ao buscar turmas no banco de dados' },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
