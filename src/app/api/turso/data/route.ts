import { NextResponse } from 'next/server';
import { executeTursoQuery, isTursoConfigured } from '@/lib/turso';

export const dynamic = 'force-dynamic';

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
        must_change_password: toBoolean(row.must_change_password),
        is_active: toBoolean(row.is_active, true),
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
        ativo: toBoolean(row.ativo, true),
        eh_apoio: toBoolean(row.eh_apoio),
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
        ativa: toBoolean(row.ativa, true) ? 1 : 0,
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
      const turmaByName = new Map(turmas.map((t: any) => [t.nome?.trim(), t.id]));
      estudantes = estRes.rows.map((row: any) => {
        // Garantia de integridade: se turma_id estiver vazio/nulo mas houver turma_nome, recupera pelo mapa de turmas
        const resolvedTurmaId = (row.turma_id && String(row.turma_id).trim() !== '')
          ? row.turma_id
          : (row.turma_nome ? turmaByName.get(String(row.turma_nome).trim()) : null) || null;

        return {
          ...row,
          turma_id: resolvedTurmaId,
          possui_laudo: toBoolean(row.possui_laudo),
          aee: toBoolean(row.aee),
          documentos: documentosMap[row.id] || [],
        };
      });
    } catch (e) {
      console.error('Erro ao ler estudantes do Turso:', e);
    }

    // 7. Faltas Professores
    let faltasProfessores: any[] = [];
    try {
      const faltasRes = await executeTursoQuery('SELECT * FROM faltas_professores ORDER BY data_falta DESC');
      faltasProfessores = faltasRes.rows.map((row: any) => ({
        ...row,
        homologado: toBoolean(row.homologado),
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

    // 11. Observações Contínuas do Estudante & Auditoria
    let observacoesAluno: any[] = [];
    try {
      // 1. Tentar ler da tabela observacoes_pedagogicas
      let carregou = false;
      try {
        const pedRes = await executeTursoQuery(
          'SELECT * FROM observacoes_pedagogicas WHERE (ativo = 1 OR ativo IS NULL) ORDER BY created_at DESC'
        );
        if (pedRes.rows && pedRes.rows.length > 0) {
          observacoesAluno = pedRes.rows.map((row: any) => ({
            id: row.id,
            estudante_id: row.estudante_id,
            aluno_id: row.estudante_id,
            usuario_id: row.usuario_id,
            autor_id: row.usuario_id,
            autor_nome: row.autor_nome || 'Equipe Escolar',
            autor_cargo: 'Equipe Escolar',
            categoria: row.categoria || 'pedagogico',
            tipo: row.categoria || 'pedagogico',
            texto_completo: row.texto,
            texto: row.texto,
            created_at: row.created_at || new Date().toISOString(),
            data_registro: row.created_at || new Date().toISOString(),
          }));
          carregou = true;
        }
      } catch (errPed) {
        // Tabela pode ainda estar sendo inicializada
      }

      // 2. Se não carregou da nova tabela, busca na observacoes_aluno
      if (!carregou) {
        const obsRes = await executeTursoQuery(
          'SELECT * FROM observacoes_aluno WHERE (ativo = 1 OR ativo IS NULL) ORDER BY created_at DESC, data_registro DESC'
        );
        observacoesAluno = obsRes.rows.map((row: any) => ({
          id: row.id,
          estudante_id: row.estudante_id || row.aluno_id,
          aluno_id: row.aluno_id || row.estudante_id,
          usuario_id: row.usuario_id || row.autor_id,
          autor_id: row.autor_id || row.usuario_id,
          autor_nome: row.autor_nome || 'Usuário',
          autor_cargo: row.autor_cargo || 'Equipe Escolar',
          categoria: row.categoria || row.tipo || 'pedagogico',
          tipo: row.tipo || row.categoria || 'pedagogico',
          texto_completo: row.texto_completo || row.texto || '',
          texto: row.texto || row.texto_completo || '',
          created_at: row.created_at || row.data_registro || new Date().toISOString(),
          data_registro: row.data_registro || row.created_at || new Date().toISOString(),
        }));
      }
    } catch (e) {
      console.warn('Tabela de observações ainda não criada no Turso:', e);
    }

    let observacoesAuditoria: any[] = [];
    try {
      const audRes = await executeTursoQuery('SELECT * FROM observacoes_auditoria ORDER BY created_at DESC');
      observacoesAuditoria = audRes.rows.map((row: any) => ({
        ...row,
        registro_anterior: row.registro_anterior ? (typeof row.registro_anterior === 'string' ? JSON.parse(row.registro_anterior) : row.registro_anterior) : null,
      }));
    } catch (e) {
      console.warn('Tabela observacoes_auditoria ainda não criada no Turso:', e);
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
        observacoesAuditoria,
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
