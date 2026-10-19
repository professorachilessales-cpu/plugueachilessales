import { NextRequest, NextResponse } from 'next/server';
import { executeTursoQuery, checkIsTursoConfigured } from '@/lib/turso';
import { isProfessorAdministrativo, isProfessorApoio, isDocenteAptoRegencia } from '@/lib/pareceres-ia';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function toBoolean(val: any, defaultIfNull: boolean = true): boolean {
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
          data: []
        },
        { 
          status: 503,
          headers: ANTI_CACHE_HEADERS
        }
      );
    }

    // 1. Busca todos os professores e usuários para resolução de regência e nomes
    let professores: any[] = [];
    let users: any[] = [];
    try {
      const profRes = await executeTursoQuery('SELECT * FROM professores ORDER BY nome_completo ASC');
      professores = profRes.rows || [];
    } catch (e) {
      console.warn('Aviso ao consultar professores em /api/turmas:', e);
    }

    try {
      const usersRes = await executeTursoQuery('SELECT * FROM users ORDER BY created_at ASC');
      users = usersRes.rows || [];
    } catch {}

    // 1.1 Vínculos relacionais em turma_professores
    let turmaProfessores: any[] = [];
    try {
      const tpRes = await executeTursoQuery('SELECT * FROM turma_professores');
      turmaProfessores = tpRes.rows || [];
    } catch {}

    // 2. Busca todas as turmas cadastradas direto do banco de dados Turso
    const turmasRes = await executeTursoQuery('SELECT * FROM turmas ORDER BY nome ASC');

    const turmas = (turmasRes.rows || []).map((row: any) => {
      // 2.1 Parse seguro de professores_ids
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

      const validProfs = (parsedProfs || []).filter((id: string) => {
        const prof = professores.find((p) => p.id === id);
        if (!prof) return true;
        return isDocenteAptoRegencia(prof, users);
      });

      // 2.2 Parse seguro de equipe_apoio_ids
      let parsedApoio: string[] = [];
      if (row.equipe_apoio_ids) {
        try {
          parsedApoio = typeof row.equipe_apoio_ids === 'string' ? JSON.parse(row.equipe_apoio_ids) : row.equipe_apoio_ids;
        } catch {
          parsedApoio = [];
        }
      }
      const validApoio = (parsedApoio || []).filter((id: string) => {
        const prof = professores.find((p) => p.id === id);
        return prof && !isProfessorAdministrativo(prof, users);
      });

      // 2.3 Parse seguro de grade_horaria
      let parsedGrade: any[] = [];
      if (row.grade_horaria) {
        try {
          parsedGrade = typeof row.grade_horaria === 'string' ? JSON.parse(row.grade_horaria) : row.grade_horaria;
        } catch {
          parsedGrade = [];
        }
      }

      // 2.4 Resolução de Professor Regente
      let regenteId = row.professor_regente_id;
      let regenteNome = row.professor_regente_nome;
      if (regenteId && !regenteNome) {
        const found = professores.find((p: any) => p.id === regenteId);
        if (found) regenteNome = found.nome_completo;
      }
      if (!regenteId && validProfs.length > 0) {
        regenteId = validProfs[0];
        const found = professores.find((p: any) => p.id === regenteId);
        if (found) regenteNome = found.nome_completo;
      }

      // 2.5 Normalização do turno
      let turnoNormalizado = row.turno || 'manha';
      if (turnoNormalizado === 'manhã') turnoNormalizado = 'manha';

      return {
        ...row,
        turno: turnoNormalizado,
        ativa: toBoolean(row.ativa, true) ? 1 : 0,
        professores_ids: validProfs,
        equipe_apoio_ids: validApoio,
        grade_horaria: Array.isArray(parsedGrade) ? parsedGrade : [],
        professor_regente_id: regenteId,
        professor_regente_nome: regenteNome,
      };
    });

    return NextResponse.json(
      {
        success: true,
        data: turmas,
        count: turmas.length,
        timestamp: Date.now(),
      },
      {
        status: 200,
        headers: ANTI_CACHE_HEADERS,
      }
    );
  } catch (error: any) {
    console.error('Erro ao consultar /api/turmas no banco Turso:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Falha ao buscar turmas diretamente do banco de dados.',
        data: [],
      },
      {
        status: 500,
        headers: ANTI_CACHE_HEADERS,
      }
    );
  }
}
