import { NextResponse } from 'next/server';
import { executeTursoQuery, checkIsTursoConfigured, garantirSchemaAutenticacaoProfessores, garantirSchemaAtestadosProfessor } from '@/lib/turso';
import { garantirTabelasObservacoes } from '@/lib/observacoes-service';
import { garantirSchemaRecorrenciaEventos } from '@/lib/calendario-service';
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
    if (!checkIsTursoConfigured()) {
      return NextResponse.json(
        { error: 'Turso não está configurado.' },
        { status: 400 }
      );
    }

    // Executa em paralelo a verificação pontual de schemas (apenas na 1ª requisição do runtime)
    try {
      await Promise.allSettled([
        garantirTabelasObservacoes(),
        garantirSchemaRecorrenciaEventos(),
        garantirSchemaAutenticacaoProfessores(),
        garantirSchemaAtestadosProfessor(),
      ]);
    } catch (schemaErr) {
      console.warn('Aviso nao fatal ao verificar schemas do Turso:', schemaErr);
    }

    // DISPARO SIMULTÂNEO DE TODAS AS CONSULTAS AO TURSO (High Performance Parallel Queries)
    // Transforma 22 roundtrips sequenciais de ~5-8s em uma única rodada paralela de ~300-500ms
    const [
      configRes,
      usersRes,
      profRes,
      tpRes,
      turmasRes,
      docRes,
      estRes,
      faltasRes,
      histRes,
      eventosRes,
      catRes,
      logsRes,
      solRes,
      relProfRes,
      relConsRes,
      notifRes,
      pedRes,
      audRes,
      driveDocsRes2,
      atestRes,
      repRes,
    ] = await Promise.all([
      executeTursoQuery('SELECT * FROM config_escola LIMIT 1').catch(() => ({ rows: [] })),
      executeTursoQuery('SELECT * FROM users ORDER BY created_at ASC').catch(() => ({ rows: [] })),
      executeTursoQuery('SELECT * FROM professores ORDER BY nome_completo ASC').catch(() => ({ rows: [] })),
      executeTursoQuery('SELECT * FROM turma_professores').catch(() => ({ rows: [] })),
      executeTursoQuery('SELECT * FROM turmas ORDER BY nome ASC').catch(() => ({ rows: [] })),
      executeTursoQuery('SELECT * FROM documentos_estudantes ORDER BY created_at DESC').catch(() => ({ rows: [] })),
      executeTursoQuery('SELECT * FROM estudantes ORDER BY nome_completo ASC').catch(() => ({ rows: [] })),
      executeTursoQuery('SELECT * FROM faltas_professores ORDER BY COALESCE(data_inicio, data_falta) DESC').catch(() => ({ rows: [] })),
      executeTursoQuery('SELECT * FROM historico_reposicoes_pagamentos ORDER BY data_registro DESC').catch(() => ({ rows: [] })),
      executeTursoQuery(`
        SELECT 
          id, 
          titulo, 
          descricao, 
          data_inicio, 
          data_fim, 
          COALESCE(categoria_id, categoria) as categoria_id,
          COALESCE(categoria, categoria_id) as categoria,
          COALESCE(cor_hex, cor, '#2563EB') as cor_hex,
          COALESCE(cor, cor_hex, '#2563EB') as cor,
          publico_alvo,
          created_at, 
          recorrencia_tipo, 
          recorrencia_dia, 
          recorrencia_mes,
          recorrencia_ativa, 
          recorrencia_data_limite,
          criado_por_usuario_id
        FROM calendario_eventos 
        ORDER BY data_inicio ASC
      `).catch(() => ({ rows: [] })),
      executeTursoQuery('SELECT * FROM calendario_categorias ORDER BY created_at ASC').catch(() => ({ rows: [] })),
      executeTursoQuery('SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT 100').catch(() => ({ rows: [] })),
      executeTursoQuery('SELECT * FROM solicitacoes_relatorio ORDER BY data_solicitacao DESC').catch(() => ({ rows: [] })),
      executeTursoQuery('SELECT * FROM relatorios_professores').catch(() => ({ rows: [] })),
      executeTursoQuery('SELECT * FROM relatorios_consolidados').catch(() => ({ rows: [] })),
      executeTursoQuery('SELECT * FROM notificacoes_admin ORDER BY data_criacao DESC').catch(() => ({ rows: [] })),
      executeTursoQuery(`
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
      `).catch(() => ({ rows: [] })),
      executeTursoQuery('SELECT * FROM observacoes_auditoria ORDER BY COALESCE(data_exclusao, created_at) DESC').catch(() => ({ rows: [] })),
      executeTursoQuery('SELECT * FROM documentos_estudante ORDER BY data_upload DESC').catch(() => ({ rows: [] })),
      executeTursoQuery('SELECT * FROM atestados_professor ORDER BY data_upload DESC').catch(() => ({ rows: [] })),
      executeTursoQuery('SELECT * FROM reposicoes_aulas ORDER BY data_limite_reposicao ASC').catch(() => ({ rows: [] })),
    ]);

    // 1. Config Escola
    let escolaConfig = null;
    if (configRes.rows && configRes.rows.length > 0) {
      const row = configRes.rows[0];
      escolaConfig = {
        ...row,
        modelos_whatsapp: row.modelos_whatsapp ? JSON.parse(row.modelos_whatsapp) : {},
      };
    }

    // 2. Users
    const users = (usersRes.rows || []).map((row: any) => ({
      ...row,
      must_change_password: toBoolean(row.must_change_password),
      is_active: toBoolean(row.is_active, true),
      allowed_modules: row.allowed_modules ? JSON.parse(row.allowed_modules) : ['PROFILE'],
    }));

    // 3. Professores
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

    let professores = rawProfessores.map((p: any) => {
      const admin = p.is_admin || isProfessorAdministrativo(p, users);
      return {
        ...p,
        eh_administrativo: admin ? true : Boolean(p.eh_administrativo),
        is_admin: admin,
        turmas_atribuidas_ids: admin ? [] : p.turmas_atribuidas_ids,
      };
    });

    // 3.1 Vínculos Relacionais Estritos (turma_professores)
    const turmaProfessores = tpRes.rows || [];
    if (turmaProfessores.length > 0) {
      professores = professores.map((p: any) => {
        const relTurmas = turmaProfessores.filter((tp: any) => tp.professor_id === p.id).map((tp: any) => tp.turma_id);
        return {
          ...p,
          turmas_atribuidas_ids: relTurmas.length > 0 ? relTurmas : p.turmas_atribuidas_ids,
        };
      });
    }

    // 4. Turmas
    const turmas = (turmasRes.rows || []).map((row: any) => {
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

      const rawProfs: string[] = parsedProfs;

      const validProfs = (rawProfs || []).filter((id: string) => {
        const prof = professores.find(p => p.id === id);
        if (!prof) return true;
        return isDocenteAptoRegencia(prof, users);
      });

      const regenteValido = row.professor_regente_id && validProfs.includes(row.professor_regente_id)
        ? row.professor_regente_id
        : (validProfs.length > 0 ? validProfs[0] : null);

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
        ...row,
        ativa: toBoolean(row.ativa, true) ? 1 : 0,
        professores_ids: validProfs,
        professor_regente_id: regenteValido,
        equipe_apoio_ids: Array.isArray(parsedApoio) ? parsedApoio : [],
        grade_horaria: Array.isArray(parsedGrade) ? parsedGrade : [],
      };
    });

    // 5. Documentos dos Estudantes
    const documentosMap: Record<string, any[]> = {};
    (docRes.rows || []).forEach((doc: any) => {
      if (!documentosMap[doc.estudante_id]) {
        documentosMap[doc.estudante_id] = [];
      }
      documentosMap[doc.estudante_id].push(doc);
    });

    // 6. Estudantes
    const turmaByName = new Map(turmas.map((t: any) => [t.nome?.trim(), t.id]));
    const estudantes = (estRes.rows || []).map((row: any) => {
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

    // 7. Faltas Professores / Ausências Docentes
    const historicoMap: Record<string, any[]> = {};
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

    const faltasProfessores = (faltasRes.rows || []).map((row: any) => {
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
        status_reposicao: statusReposicao,
        historico_pagamentos: historicoMap[row.id] || [],
        motivo: row.motivo || row.justificativa || '',
        justificativa: row.justificativa || row.motivo || '',
        atestado_drive_url: row.atestado_drive_url || row.atestado_drive_link || undefined,
        atestado_drive_link: row.atestado_drive_link || row.atestado_drive_url || undefined,
        drive_file_id: row.drive_file_id || row.atestado_drive_id || undefined,
        atestado_drive_id: row.atestado_drive_id || row.drive_file_id || undefined,
        observacao: row.observacao || undefined,
        usuario_registro_id: row.usuario_registro_id || undefined,
      };
    });

    // 8. Eventos Escolares
    const eventos = (eventosRes.rows || []).map((row: any) => ({
      id: String(row.id),
      titulo: row.titulo,
      descricao: row.descricao || '',
      data_inicio: row.data_inicio,
      data_fim: row.data_fim,
      categoria: row.categoria || row.categoria_id,
      categoria_id: row.categoria_id || row.categoria,
      cor: row.cor || row.cor_hex || '#2563EB',
      cor_hex: row.cor_hex || row.cor || '#2563EB',
      publico_alvo: row.publico_alvo || 'Todos',
      all_day: true,
      created_at: row.created_at || new Date().toISOString(),
      recorrencia_tipo: row.recorrencia_tipo || 'NENHUMA',
      recorrencia_dia: row.recorrencia_dia != null ? Number(row.recorrencia_dia) : null,
      recorrencia_mes: row.recorrencia_mes != null ? Number(row.recorrencia_mes) : null,
      recorrencia_ativa: toBoolean(row.recorrencia_ativa),
      recorrencia_data_limite: row.recorrencia_data_limite || null,
      criado_por_usuario_id: row.criado_por_usuario_id || null,
    }));

    // 8.1 Categorias do Calendário
    const calendarioCategorias = (catRes.rows || []).map((row: any) => {
      const id = String(row.id || '');
      const nome = String(row.nome || '').toLowerCase();
      let visivel = Boolean(row.visivel_docentes === 1 || row.visivel_docentes === true);
      if (id === 'cat-aniversarios' || nome === 'aniversários' || nome === 'aniversarios') {
        visivel = false;
      } else if ((id === 'cat-provas' || id === 'cat-reunioes' || nome.includes('prova') || nome.includes('avalia') || nome.includes('reuni')) && !visivel) {
        visivel = true;
      }
      return {
        ...row,
        visivel_docentes: visivel,
        sistema_protegida: Boolean(row.sistema_protegida === 1 || row.sistema_protegida === true || id === 'cat-aniversarios'),
      };
    });

    // 9. Activity Logs
    const activityLogs = (logsRes.rows || []).map((row: any) => ({
      ...row,
      details: row.details ? (typeof row.details === 'string' ? JSON.parse(row.details) : row.details) : {},
    }));

    // 10. Módulo de Relatórios Pedagógicos Colaborativos
    const solicitacoesRelatorio = solRes.rows || [];
    const solicitacoesConcluidasIds = new Set(
      solicitacoesRelatorio.filter((s: any) => s.status === 'concluido').map((s: any) => s.id)
    );
    const relatoriosProfessores = (relProfRes.rows || []).map((rp: any) => {
      if (solicitacoesConcluidasIds.has(rp.solicitacao_id) && rp.status !== 'enviado') {
        return { ...rp, status: 'nao_elaborado' };
      }
      return rp;
    });

    const relatoriosConsolidados = relConsRes.rows || [];
    const notificacoesAdmin = (notifRes.rows || []).map((row: any) => ({
      ...row,
      lido: Boolean(row.lido),
    }));

    // 11. Observações Contínuas do Estudante & Auditoria
    let observacoesAluno: any[] = [];
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
        deleted_at: row.deleted_at || null,
        is_deleted: row.is_deleted === 1 || row.is_deleted === '1' ? 1 : 0,
        excluido_por_usuario_id: row.excluido_por_usuario_id || null,
        ativo: row.ativo === 0 || row.ativo === '0' ? 0 : 1,
      }));
    } else {
      // Fallback legado se observacoes_pedagogicas estiver vazia
      try {
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
      } catch {}
    }

    const observacoesAuditoria = (audRes.rows || []).map((row: any) => ({
      ...row,
      registro_anterior: row.registro_anterior ? (typeof row.registro_anterior === 'string' ? JSON.parse(row.registro_anterior) : row.registro_anterior) : null,
    }));

    // 12. Documentos do Estudante no Google Drive
    const docs1 = (docRes.rows || []).map((row: any) => ({
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

    const docs2 = (driveDocsRes2.rows || []).map((row: any) => ({
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

    const documentosEstudanteDrive: any[] = [];
    const idMap = new Set<string>();
    for (const d of [...docs1, ...docs2]) {
      const key = d.id || d.drive_file_id;
      if (key && !idMap.has(key)) {
        idMap.add(key);
        documentosEstudanteDrive.push(d);
      }
    }

    // 13. Atestados dos Professores
    const atestadosProfessor = (atestRes.rows || []).map((row: any) => ({
      ...row,
      quantidade_dias: row.quantidade_dias !== undefined && row.quantidade_dias !== null ? Number(row.quantidade_dias) : Number(row.dias_afastamento || 1),
      dias_afastamento: row.dias_afastamento !== undefined && row.dias_afastamento !== null ? Number(row.dias_afastamento) : Number(row.quantidade_dias || 1),
      atestado_drive_url: row.atestado_drive_url || row.drive_view_url || (row.drive_file_id ? `https://drive.google.com/file/d/${row.drive_file_id}/view` : undefined),
      drive_view_url: row.atestado_drive_url || row.drive_view_url || (row.drive_file_id ? `https://drive.google.com/file/d/${row.drive_file_id}/view` : undefined),
      permite_exclusao: Boolean(row.permite_exclusao),
    }));

    // 14. Débito & Reposições de Aulas (Regra dos 30 Dias)
    const reposicoesAulas = repRes.rows || [];

    return NextResponse.json(
      {
        success: true,
        data: {
          escolaConfig,
          users,
          professores,
          turmas,
          turmaProfessores,
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
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    );
  } catch (error: any) {
    console.error('Erro geral ao carregar dados do Turso:', error);
    return NextResponse.json(
      { error: error.message || 'Falha ao buscar dados no Turso' },
      { status: 500 }
    );
  }
}
