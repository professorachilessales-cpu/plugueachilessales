import { NextRequest, NextResponse } from 'next/server';
import { executeTursoQuery, checkIsTursoConfigured } from '@/lib/turso';
import { coincideDiaSemana, coincideProfessor } from '@/lib/ausencias-service';

export const dynamic = 'force-dynamic';

const DIAS_SEMANA_NOMES = [
  'Domingo',
  'Segunda',
  'Terça',
  'Quarta',
  'Quinta',
  'Sexta',
  'Sábado'
];

export async function GET(request: NextRequest) {
  try {
    if (!checkIsTursoConfigured()) {
      return NextResponse.json({ error: 'Turso Database não configurado.' }, { status: 500 });
    }

    const agora = new Date();
    const diaSemanaHoje = DIAS_SEMANA_NOMES[agora.getDay()];
    const hojeIso = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}-${String(agora.getDate()).padStart(2, '0')}`;

    // 1. Busca ausências vigentes hoje
    const queryAusencias = `
      SELECT 
        f.id,
        f.professor_id,
        f.professor_nome,
        f.tipo_registro,
        COALESCE(f.data_inicio, f.data_falta) AS data_inicio,
        COALESCE(f.data_fim, f.data_inicio, f.data_falta) AS data_fim,
        f.aulas_totais_devidas,
        f.aulas_faltadas,
        f.motivo,
        f.justificativa,
        f.atestado_drive_url,
        f.atestado_drive_link,
        f.status_reposicao,
        f.created_at
      FROM faltas_professores f
      WHERE CURRENT_DATE >= COALESCE(f.data_inicio, f.data_falta)
        AND CURRENT_DATE <= COALESCE(f.data_fim, f.data_inicio, f.data_falta)
        AND (f.deleted_at IS NULL OR f.deleted_at = '')
      ORDER BY COALESCE(f.data_inicio, f.data_falta) DESC;
    `;

    const resAusencias = await executeTursoQuery(queryAusencias);
    const faltasRows = resAusencias.rows || [];

    // 2. Busca turmas ativas com sua respectiva grade horária
    const queryTurmas = `
      SELECT id, nome, turno, ativa, grade_horaria
      FROM turmas
      WHERE (deleted_at IS NULL OR deleted_at = '')
        AND (ativa = 1 OR ativa = '1' OR ativa IS NULL);
    `;

    const resTurmas = await executeTursoQuery(queryTurmas);
    const turmas = (resTurmas.rows || []).map((t: any) => ({
      id: String(t.id),
      nome: t.nome,
      turno: t.turno || 'Manhã',
      grade_horaria: t.grade_horaria ? (typeof t.grade_horaria === 'string' ? JSON.parse(t.grade_horaria) : t.grade_horaria) : []
    }));

    // 3. Processa cada ausência com cálculo de dias restantes e turmas impactadas hoje
    const resultado = faltasRows.map((falta: any) => {
      const dataInicio = falta.data_inicio || hojeIso;
      const dataFim = falta.data_fim || dataInicio;

      const [anoFim, mesFim, diaFim] = dataFim.split('T')[0].split('-').map(Number);
      const [anoHoje, mesHoje, diaHoje] = hojeIso.split('-').map(Number);
      const dataFimUtc = Date.UTC(anoFim, mesFim - 1, diaFim);
      const hojeUtc = Date.UTC(anoHoje, mesHoje - 1, diaHoje);
      const diasRestantes = Math.max(0, Math.round((dataFimUtc - hojeUtc) / (1000 * 60 * 60 * 24)));

      const dtRetorno = new Date(anoFim, mesFim - 1, diaFim + 1);
      const dataRetornoFormatada = `${String(dtRetorno.getDate()).padStart(2, '0')}/${String(dtRetorno.getMonth() + 1).padStart(2, '0')}`;

      // Cruzamento com a grade horária do dia atual
      const turmasMap = new Map<string, { turma_nome: string; turno: string; quantidade_aulas: number; disciplina?: string }>();

      for (const t of turmas) {
        const grade = t.grade_horaria || [];
        for (const h of grade) {
          if (
            coincideDiaSemana(h.dia_semana, diaSemanaHoje) &&
            coincideProfessor(h, falta.professor_id, falta.professor_nome)
          ) {
            const qtd = Number(h.quantidade_aulas) || 1;
            const exist = turmasMap.get(t.id);
            if (exist) {
              exist.quantidade_aulas += qtd;
            } else {
              turmasMap.set(t.id, {
                turma_nome: t.nome,
                turno: t.turno,
                quantidade_aulas: qtd,
                disciplina: h.disciplina,
              });
            }
          }
        }
      }

      const turmasImpactadas = Array.from(turmasMap.values());

      return {
        id: String(falta.id),
        professor_id: String(falta.professor_id),
        professor_nome: falta.professor_nome,
        data_inicio: dataInicio,
        data_fim: dataFim,
        aulas_devidas: Number(falta.aulas_totais_devidas || falta.aulas_faltadas || 1),
        motivo: falta.motivo || falta.justificativa || 'Ausência Registrada',
        atestado_drive_url: falta.atestado_drive_url || falta.atestado_drive_link || undefined,
        dias_restantes: diasRestantes,
        encerra_hoje: diasRestantes === 0,
        data_retorno: dataRetornoFormatada,
        turmas_impactadas_hoje: turmasImpactadas,
      };
    });

    return NextResponse.json({
      success: true,
      data_hoje: hojeIso,
      dia_semana: diaSemanaHoje,
      total_ausencias_vigentes: resultado.length,
      ausencias: resultado,
    });
  } catch (error: any) {
    console.error('Erro na API /api/ausencias/hoje:', error);
    return NextResponse.json(
      { error: 'Erro interno ao consultar ausências vigentes hoje.' },
      { status: 500 }
    );
  }
}
