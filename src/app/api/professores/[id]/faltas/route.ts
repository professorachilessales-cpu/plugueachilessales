import { NextRequest, NextResponse } from 'next/server';
import { executeTursoQuery, checkIsTursoConfigured } from '@/lib/turso';
import { verifyJwt } from '@/lib/security';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const professorId = resolvedParams?.id;

    if (!professorId) {
      return NextResponse.json({ error: 'ID do professor não informado' }, { status: 400 });
    }

    // 1. Verificação de Autenticação e Prevenção de IDOR (Broken Object Level Authorization)
    let token: string | null = null;
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    } else {
      token = request.cookies.get('plugue_access_token')?.value || 
              request.cookies.get('plugue_refresh_token')?.value || 
              null;
    }

    const payload = token ? verifyJwt(token) : null;
    const isAdmin = payload !== null && (payload.role === 'admin' || payload.role === 'direcao');

    // Se for docente comum, ele só tem permissão para visualizar as suas próprias faltas
    if (payload && !isAdmin && payload.userId !== professorId) {
      return NextResponse.json(
        { error: '403 Forbidden: Acesso não autorizado aos registros funcionais de outro colaborador.' },
        { status: 403 }
      );
    }

    if (!checkIsTursoConfigured()) {
      return NextResponse.json({ error: 'Banco de dados Turso não configurado' }, { status: 500 });
    }

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

    const faltas = (res.rows || []).map((row: any) => {
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
        aulas_faltadas: totalDevido,
        aulas_pagas: Number(row.aulas_pagas || 0),
        aulas_abonadas: Number(row.aulas_abonadas || 0),
        status_reposicao: row.status_reposicao || 'A pagar',
        motivo: row.motivo || row.justificativa || '',
        atestado_drive_url: atestadoUrl,
        apresentou_atestado: apresentouAtestado,
        created_at: row.created_at || '',
      };
    });

    return NextResponse.json({
      success: true,
      professor_id: professorId,
      total: faltas.length,
      faltas,
    });
  } catch (error: any) {
    console.error('Erro ao buscar faltas_professores por professor_id:', error);
    return NextResponse.json(
      { error: 'Erro interno ao consultar faltas do professor.' },
      { status: 500 }
    );
  }
}
