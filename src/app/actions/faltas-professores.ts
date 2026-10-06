'use server';

import { executeTursoQuery, isTursoConfigured } from '@/lib/turso';

export interface FaltaDocenteItem {
  id: string;
  professor_id: string;
  professor_nome?: string;
  tipo_registro?: string;
  data_inicio: string;
  data_fim?: string;
  data_falta?: string;
  aulas_totais_devidas: number;
  aulas_pagas?: number;
  aulas_abonadas?: number;
  status_reposicao?: string;
  motivo?: string;
  atestado_drive_url?: string;
  apresentou_atestado: boolean;
  created_at?: string;
}

export async function buscarFaltasDoProfessorAction(professorId: string): Promise<FaltaDocenteItem[]> {
  if (!professorId || !isTursoConfigured) {
    return [];
  }

  try {
    const query = `
      SELECT 
        id,
        professor_id,
        professor_nome,
        tipo_registro,
        data_inicio,
        data_fim,
        data_falta,
        aulas_calculadas_sistema,
        aulas_totais_devidas,
        aulas_faltadas,
        aulas_pagas,
        aulas_abonadas,
        status_reposicao,
        motivo,
        justificativa,
        atestado_drive_url,
        atestado_drive_link,
        drive_file_id,
        observacao,
        created_at
      FROM faltas_professores
      WHERE professor_id = ?
      ORDER BY COALESCE(data_inicio, data_falta) DESC
    `;

    const res = await executeTursoQuery(query, [professorId]);

    return (res.rows || []).map((row: any) => {
      const dataInicio = row.data_inicio || row.data_falta || row.data_ausencia || '';
      const dataFim = row.data_fim || dataInicio;
      const totalDevido = Number(
        row.aulas_totais_devidas ?? row.total_aulas_devidas ?? row.aulas_faltadas ?? row.aulas_calculadas ?? 1
      );
      const atestadoUrl = row.atestado_drive_url || row.atestado_drive_link || undefined;
      const apresentouAtestado = Boolean(atestadoUrl || row.drive_file_id || row.apresentou_atestado);

      return {
        id: String(row.id),
        professor_id: String(row.professor_id),
        professor_nome: row.professor_nome || '',
        tipo_registro: row.tipo_registro || (dataFim && dataFim !== dataInicio ? 'PERIODO' : 'DATA_UNICA'),
        data_inicio: dataInicio,
        data_fim: dataFim,
        data_falta: row.data_falta || dataInicio,
        aulas_totais_devidas: totalDevido,
        aulas_pagas: Number(row.aulas_pagas || 0),
        aulas_abonadas: Number(row.aulas_abonadas || 0),
        status_reposicao: row.status_reposicao || 'A pagar',
        motivo: row.motivo || row.justificativa || '',
        atestado_drive_url: atestadoUrl,
        apresentou_atestado: apresentouAtestado,
        created_at: row.created_at || '',
      };
    });
  } catch (error) {
    console.error('Erro na Server Action buscarFaltasDoProfessorAction:', error);
    return [];
  }
}
