import { NextResponse } from 'next/server';
import { executeTursoQuery, isTursoConfigured } from '@/lib/turso';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    if (!isTursoConfigured) {
      return NextResponse.json(
        { error: 'Turso não está configurado.' },
        { status: 400 }
      );
    }

    // 1. Config Escola
    let escolaConfig = null;
    try {
      const configRes = await executeTursoQuery('SELECT * FROM config_escola LIMIT 1');
      if (configRes.rows.length > 0) {
        const row = configRes.rows[0];
        escolaConfig = {
          ...row,
          modelos_whatsapp: row.modelos_whatsapp ? JSON.parse(row.modelos_whatsapp) : {},
        };
      }
    } catch (e) {
      console.error('Erro ao ler config_escola do Turso:', e);
    }

    // 2. Users
    let users: any[] = [];
    try {
      const usersRes = await executeTursoQuery('SELECT * FROM users ORDER BY created_at ASC');
      users = usersRes.rows.map((row: any) => ({
        ...row,
        must_change_password: Boolean(row.must_change_password),
        is_active: Boolean(row.is_active),
        allowed_modules: row.allowed_modules ? JSON.parse(row.allowed_modules) : ['PROFILE'],
      }));
    } catch (e) {
      console.error('Erro ao ler users do Turso:', e);
    }

    // 3. Professores
    let professores: any[] = [];
    try {
      const profRes = await executeTursoQuery('SELECT * FROM professores ORDER BY nome_completo ASC');
      professores = profRes.rows.map((row: any) => ({
        ...row,
        ativo: Boolean(row.ativo),
        eh_apoio: Boolean(row.eh_apoio),
        disciplinas: row.disciplinas ? (typeof row.disciplinas === 'string' ? JSON.parse(row.disciplinas) : row.disciplinas) : [],
        turmas_atribuidas_ids: row.turmas_atribuidas_ids ? (typeof row.turmas_atribuidas_ids === 'string' ? JSON.parse(row.turmas_atribuidas_ids) : row.turmas_atribuidas_ids) : [],
      }));
    } catch (e) {
      console.error('Erro ao ler professores do Turso:', e);
    }

    // 4. Turmas
    let turmas: any[] = [];
    try {
      const turmasRes = await executeTursoQuery('SELECT * FROM turmas ORDER BY nome ASC');
      turmas = turmasRes.rows.map((row: any) => ({
        ...row,
        ativa: Boolean(row.ativa !== 0 && row.ativa !== false),
        professores_ids: row.professores_ids ? (typeof row.professores_ids === 'string' ? JSON.parse(row.professores_ids) : row.professores_ids) : (row.professor_regente_id ? [row.professor_regente_id] : []),
        equipe_apoio_ids: row.equipe_apoio_ids ? (typeof row.equipe_apoio_ids === 'string' ? JSON.parse(row.equipe_apoio_ids) : row.equipe_apoio_ids) : [],
        grade_horaria: row.grade_horaria ? (typeof row.grade_horaria === 'string' ? JSON.parse(row.grade_horaria) : row.grade_horaria) : [],
      }));
    } catch (e) {
      console.error('Erro ao ler turmas do Turso:', e);
    }

    // 5. Documentos dos Estudantes
    let documentosMap: Record<string, any[]> = {};
    try {
      const docRes = await executeTursoQuery('SELECT * FROM documentos_estudantes');
      docRes.rows.forEach((doc: any) => {
        if (!documentosMap[doc.estudante_id]) {
          documentosMap[doc.estudante_id] = [];
        }
        documentosMap[doc.estudante_id].push(doc);
      });
    } catch (e) {
      console.error('Erro ao ler documentos_estudantes do Turso:', e);
    }

    // 6. Estudantes
    let estudantes: any[] = [];
    try {
      const estRes = await executeTursoQuery('SELECT * FROM estudantes ORDER BY nome_completo ASC');
      estudantes = estRes.rows.map((row: any) => ({
        ...row,
        possui_laudo: Boolean(row.possui_laudo),
        aee: Boolean(row.aee),
        documentos: documentosMap[row.id] || [],
      }));
    } catch (e) {
      console.error('Erro ao ler estudantes do Turso:', e);
    }

    // 7. Faltas Professores
    let faltasProfessores: any[] = [];
    try {
      const faltasRes = await executeTursoQuery('SELECT * FROM faltas_professores ORDER BY data_falta DESC');
      faltasProfessores = faltasRes.rows.map((row: any) => ({
        ...row,
        homologado: Boolean(row.homologado),
      }));
    } catch (e) {
      console.error('Erro ao ler faltas_professores do Turso:', e);
    }

    // 8. Eventos
    let eventos: any[] = [];
    try {
      const eventosRes = await executeTursoQuery('SELECT * FROM eventos ORDER BY data_inicio ASC');
      eventos = eventosRes.rows;
    } catch (e) {
      console.error('Erro ao ler eventos do Turso:', e);
    }

    // 9. Activity Logs
    let activityLogs: any[] = [];
    try {
      const logsRes = await executeTursoQuery('SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT 100');
      activityLogs = logsRes.rows.map((row: any) => ({
        ...row,
        details: row.details ? (typeof row.details === 'string' ? JSON.parse(row.details) : row.details) : {},
      }));
    } catch (e) {
      console.error('Erro ao ler activity_logs do Turso:', e);
    }

    // 10. Módulo de Relatórios Pedagógicos Colaborativos
    let solicitacoesRelatorio: any[] = [];
    let relatoriosProfessores: any[] = [];
    let relatoriosConsolidados: any[] = [];
    let notificacoesAdmin: any[] = [];

    try {
      const solRes = await executeTursoQuery('SELECT * FROM solicitacoes_relatorio ORDER BY data_solicitacao DESC');
      solicitacoesRelatorio = solRes.rows;
    } catch (e) {
      console.warn('Tabela solicitacoes_relatorio ainda não criada no Turso:', e);
    }

    try {
      const relProfRes = await executeTursoQuery('SELECT * FROM relatorios_professores');
      relatoriosProfessores = relProfRes.rows;
    } catch (e) {
      console.warn('Tabela relatorios_professores ainda não criada no Turso:', e);
    }

    try {
      const relConsRes = await executeTursoQuery('SELECT * FROM relatorios_consolidados');
      relatoriosConsolidados = relConsRes.rows;
    } catch (e) {
      console.warn('Tabela relatorios_consolidados ainda não criada no Turso:', e);
    }

    try {
      const notifRes = await executeTursoQuery('SELECT * FROM notificacoes_admin ORDER BY data_criacao DESC');
      notificacoesAdmin = notifRes.rows.map((row: any) => ({
        ...row,
        lido: Boolean(row.lido),
      }));
    } catch (e) {
      console.warn('Tabela notificacoes_admin ainda não criada no Turso:', e);
    }

    // 11. Observações Contínuas do Estudante
    let observacoesAluno: any[] = [];
    try {
      const obsRes = await executeTursoQuery('SELECT * FROM observacoes_aluno ORDER BY data_registro DESC');
      observacoesAluno = obsRes.rows;
    } catch (e) {
      console.warn('Tabela observacoes_aluno ainda não criada no Turso:', e);
    }

    // 12. Documentos do Estudante no Google Drive
    let documentosEstudanteDrive: any[] = [];
    try {
      const driveDocsRes = await executeTursoQuery('SELECT * FROM documentos_estudante ORDER BY data_upload DESC');
      documentosEstudanteDrive = driveDocsRes.rows;
    } catch (e) {
      console.warn('Tabela documentos_estudante ainda não criada no Turso:', e);
    }

    // 13. Atestados dos Professores
    let atestadosProfessor: any[] = [];
    try {
      const atestRes = await executeTursoQuery('SELECT * FROM atestados_professor ORDER BY data_upload DESC');
      atestadosProfessor = atestRes.rows.map((row: any) => ({
        ...row,
        permite_exclusao: Boolean(row.permite_exclusao),
      }));
    } catch (e) {
      console.warn('Tabela atestados_professor ainda não criada no Turso:', e);
    }

    // 14. Débito & Reposições de Aulas (Regra dos 30 Dias)
    let reposicoesAulas: any[] = [];
    try {
      const repRes = await executeTursoQuery('SELECT * FROM reposicoes_aulas ORDER BY data_limite_reposicao ASC');
      reposicoesAulas = repRes.rows;
    } catch (e) {
      console.warn('Tabela reposicoes_aulas ainda não criada no Turso:', e);
    }

    return NextResponse.json({
      success: true,
      data: {
        escolaConfig,
        users,
        professores,
        turmas,
        estudantes,
        faltasProfessores,
        eventos,
        activityLogs,
        solicitacoesRelatorio,
        relatoriosProfessores,
        relatoriosConsolidados,
        notificacoesAdmin,
        observacoesAluno,
        documentosEstudanteDrive,
        atestadosProfessor,
        reposicoesAulas,
      },
    });
  } catch (error: any) {
    console.error('Erro geral ao carregar dados do Turso:', error);
    return NextResponse.json(
      { error: error.message || 'Falha ao buscar dados no Turso' },
      { status: 500 }
    );
  }
}
