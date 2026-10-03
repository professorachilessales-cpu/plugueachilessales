import { NextResponse } from 'next/server';
import { executeTursoQuery, isTursoConfigured } from '@/lib/turso';
import { garantirTabelasObservacoes } from '@/lib/observacoes-service';
import { isProfessorAdministrativo, isProfessorApoio, isDocenteAptoRegencia } from '@/lib/pareceres-ia';

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

    await garantirTabelasObservacoes();

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
      const rawProfessores = profRes.rows.map((row: any) => ({
        ...row,
        tipo_profissional: row.tipo_profissional || 'docente',
        funcao_escola: row.funcao_escola || null,
        ativo: toBoolean(row.ativo, true),
        eh_apoio: toBoolean(row.eh_apoio),
        eh_administrativo: toBoolean(row.eh_administrativo),
        disciplinas: row.disciplinas ? (typeof row.disciplinas === 'string' ? JSON.parse(row.disciplinas) : row.disciplinas) : [],
        turmas_atribuidas_ids: row.turmas_atribuidas_ids ? (typeof row.turmas_atribuidas_ids === 'string' ? JSON.parse(row.turmas_atribuidas_ids) : row.turmas_atribuidas_ids) : [],
      }));

      // Sanitizar status administrativo e turmas atribuídas
      professores = rawProfessores.map((p: any) => {
        const admin = isProfessorAdministrativo(p, users);
        return {
          ...p,
          eh_administrativo: admin ? true : Boolean(p.eh_administrativo),
          turmas_atribuidas_ids: admin ? [] : p.turmas_atribuidas_ids,
        };
      });
    } catch (e) {
      console.error('Erro ao ler professores do Turso:', e);
    }

    // 4. Turmas
    let turmas: any[] = [];
    try {
      const turmasRes = await executeTursoQuery('SELECT * FROM turmas ORDER BY nome ASC');
      turmas = turmasRes.rows.map((row: any) => {
        const rawProfs: string[] = row.professores_ids
          ? (typeof row.professores_ids === 'string' ? JSON.parse(row.professores_ids) : row.professores_ids)
          : (row.professor_regente_id ? [row.professor_regente_id] : []);

        const validProfs = (rawProfs || []).filter((id: string) => {
          const prof = professores.find(p => p.id === id);
          if (!prof) return true;
          return isDocenteAptoRegencia(prof, users);
        });

        const regenteValido = row.professor_regente_id && validProfs.includes(row.professor_regente_id)
          ? row.professor_regente_id
          : (validProfs.length > 0 ? validProfs[0] : null);

        return {
          ...row,
          ativa: toBoolean(row.ativa, true) ? 1 : 0,
          professores_ids: validProfs,
          professor_regente_id: regenteValido,
          equipe_apoio_ids: row.equipe_apoio_ids ? (typeof row.equipe_apoio_ids === 'string' ? JSON.parse(row.equipe_apoio_ids) : row.equipe_apoio_ids) : [],
          grade_horaria: row.grade_horaria ? (typeof row.grade_horaria === 'string' ? JSON.parse(row.grade_horaria) : row.grade_horaria) : [],
        };
      });
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

    // 8.1 Categorias do Calendário
    let calendarioCategorias: any[] = [];
    try {
      const catRes = await executeTursoQuery('SELECT * FROM calendario_categorias ORDER BY created_at ASC');
      calendarioCategorias = catRes.rows.map((row: any) => ({
        ...row,
        visivel_docentes: Boolean(row.visivel_docentes === 1 || row.visivel_docentes === true),
        sistema_protegida: Boolean(row.sistema_protegida === 1 || row.sistema_protegida === true),
      }));
    } catch (e) {
      console.error('Erro ao ler calendario_categorias do Turso:', e);
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
      // 1. Tentar ler da tabela observacoes_pedagogicas (apenas ativas e não excluídas)
      let carregou = false;
      try {
        const pedRes = await executeTursoQuery(`
          SELECT 
            o.id,
            o.estudante_id,
            o.usuario_id,
            COALESCE(u.name, o.autor_nome, 'Equipe Escolar') AS autor_nome,
            o.categoria,
            o.texto,
            o.created_at,
            o.ativo,
            o.deleted_at,
            o.is_deleted,
            o.excluido_por_usuario_id
          FROM observacoes_pedagogicas o
          LEFT JOIN users u ON u.id = o.usuario_id
          WHERE (o.deleted_at IS NULL OR o.deleted_at = '' OR o.deleted_at = 0)
            AND (o.ativo = 1 OR o.ativo IS NULL OR o.ativo = '1')
            AND (o.is_deleted = 0 OR o.is_deleted IS NULL OR o.is_deleted = '0')
          ORDER BY o.created_at DESC
        `);
        if (pedRes.rows) {
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
            deleted_at: row.deleted_at || null,
            is_deleted: row.is_deleted === 1 || row.is_deleted === '1' ? 1 : 0,
            excluido_por_usuario_id: row.excluido_por_usuario_id || null,
            ativo: row.ativo === 0 || row.ativo === '0' ? 0 : 1,
          }));
          carregou = true;
        }
      } catch (errPed) {
        // Tabela pode ainda estar sendo inicializada
      }

      // 2. Se a tabela observacoes_pedagogicas não pôde ser consultada (ex: ausente), busca na observacoes_aluno
      if (!carregou) {
        const obsRes = await executeTursoQuery(`
          SELECT * FROM observacoes_aluno 
          WHERE (deleted_at IS NULL OR deleted_at = '' OR deleted_at = 0) 
            AND (ativo = 1 OR ativo IS NULL OR ativo = '1') 
            AND (is_deleted = 0 OR is_deleted IS NULL OR is_deleted = '0') 
          ORDER BY created_at DESC, data_registro DESC
        `);
        observacoesAluno = (obsRes.rows || []).map((row: any) => ({
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
          deleted_at: row.deleted_at || null,
          is_deleted: row.is_deleted === 1 || row.is_deleted === '1' ? 1 : 0,
          excluido_por_usuario_id: row.excluido_por_usuario_id || null,
          ativo: row.ativo === 0 || row.ativo === '0' ? 0 : 1,
        }));
      }
    } catch (e) {
      console.warn('Tabela de observações ainda não criada no Turso:', e);
    }

    let observacoesAuditoria: any[] = [];
    try {
      const audRes = await executeTursoQuery('SELECT * FROM observacoes_auditoria ORDER BY COALESCE(data_exclusao, created_at) DESC');
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
      // 12.1 Busca primariamente em documentos_estudantes (onde os uploads oficiais do Drive são gravados)
      const driveDocsRes1 = await executeTursoQuery('SELECT * FROM documentos_estudantes ORDER BY created_at DESC');
      const docs1 = (driveDocsRes1.rows || []).map((row: any) => ({
        id: row.id,
        aluno_id: row.estudante_id,
        estudante_id: row.estudante_id,
        nome_arquivo: row.nome_arquivo,
        tamanho_bytes: row.tamanho_bytes,
        mime_type: row.mime_type,
        drive_file_id: row.drive_file_id,
        drive_view_link: row.drive_view_link,
        url_visualizacao: row.drive_view_link,
        drive_view_url: row.drive_view_link,
        tipo_documento: row.tipo_documento,
        tipo: row.tipo_documento,
        data_upload: row.created_at,
        created_at: row.created_at,
      }));

      // 12.2 Busca complementar em documentos_estudante (se houver registros adicionais)
      let docs2: any[] = [];
      try {
        const driveDocsRes2 = await executeTursoQuery('SELECT * FROM documentos_estudante ORDER BY data_upload DESC');
        docs2 = (driveDocsRes2.rows || []).map((row: any) => ({
          id: row.id,
          aluno_id: row.aluno_id,
          estudante_id: row.aluno_id,
          nome_arquivo: row.nome_arquivo,
          tamanho_bytes: row.tamanho_bytes,
          mime_type: row.mime_type,
          drive_file_id: row.drive_file_id,
          drive_view_link: row.url_visualizacao,
          url_visualizacao: row.url_visualizacao,
          drive_view_url: row.url_visualizacao,
          tipo_documento: row.tipo_documento,
          tipo: row.tipo_documento,
          data_upload: row.data_upload,
          created_at: row.data_upload,
        }));
      } catch {}

      // Mescla evitando duplicados por id ou drive_file_id
      const idMap = new Set<string>();
      for (const d of [...docs1, ...docs2]) {
        const key = d.id || d.drive_file_id;
        if (key && !idMap.has(key)) {
          idMap.add(key);
          documentosEstudanteDrive.push(d);
        }
      }
    } catch (e) {
      console.warn('Tabela de documentos do Drive ainda não criada no Turso:', e);
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
        calendarioCategorias,
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
