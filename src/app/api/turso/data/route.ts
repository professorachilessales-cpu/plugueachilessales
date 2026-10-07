import { NextResponse } from 'next/server';
import { executeTursoQuery, isTursoConfigured, garantirSchemaAutenticacaoProfessores, garantirSchemaAtestadosProfessor } from '@/lib/turso';
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
    if (!isTursoConfigured) {
      return NextResponse.json(
        { error: 'Turso não está configurado.' },
        { status: 400 }
      );
    }

    await garantirTabelasObservacoes();
    await garantirSchemaRecorrenciaEventos();
    await garantirSchemaAutenticacaoProfessores();

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
      const rawProfessores = profRes.rows.map((row: any) => {
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

      // Sanitizar status administrativo e turmas atribuídas
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
      console.error('Erro ao ler professores do Turso:', e);
    }

    // 3.1 Vínculos Relacionais Estritos (turma_professores)
    let turmaProfessores: any[] = [];
    try {
      const tpRes = await executeTursoQuery('SELECT * FROM turma_professores');
      turmaProfessores = tpRes.rows || [];
    } catch (e) {
      console.warn('Tabela turma_professores ainda não encontrada:', e);
    }

    // Vincula turmas atribuídas aos professores a partir de turma_professores
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
    let turmas: any[] = [];
    try {
      const turmasRes = await executeTursoQuery('SELECT * FROM turmas ORDER BY nome ASC');
      turmas = turmasRes.rows.map((row: any) => {
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

    // 7. Faltas Professores / Ausências Docentes
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

      faltasProfessores = faltasRes.rows.map((row: any) => {
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
    } catch (e) {
      console.error('Erro ao ler faltas_professores do Turso:', e);
    }

    // 8. Eventos Escolares (Consulta direta e exclusiva à tabela definitiva calendario_eventos)
    let eventos: any[] = [];
    try {
      const eventosRes = await executeTursoQuery(`
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
      `);
      eventos = (eventosRes.rows || []).map((row: any) => ({
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
    } catch (e) {
      console.error('Erro ao ler calendario_eventos do Turso:', e);
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
      const solicitacoesConcluidasIds = new Set(
        solicitacoesRelatorio.filter((s: any) => s.status === 'concluido').map((s: any) => s.id)
      );
      relatoriosProfessores = relProfRes.rows.map((rp: any) => {
        if (solicitacoesConcluidasIds.has(rp.solicitacao_id) && rp.status !== 'enviado') {
          return { ...rp, status: 'nao_elaborado' };
        }
        return rp;
      });
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
      await garantirSchemaAtestadosProfessor();
      const atestRes = await executeTursoQuery('SELECT * FROM atestados_professor ORDER BY data_upload DESC');
      atestadosProfessor = atestRes.rows.map((row: any) => ({
        ...row,
        quantidade_dias: row.quantidade_dias !== undefined && row.quantidade_dias !== null ? Number(row.quantidade_dias) : Number(row.dias_afastamento || 1),
        dias_afastamento: row.dias_afastamento !== undefined && row.dias_afastamento !== null ? Number(row.dias_afastamento) : Number(row.quantidade_dias || 1),
        atestado_drive_url: row.atestado_drive_url || row.drive_view_url || (row.drive_file_id ? `https://drive.google.com/file/d/${row.drive_file_id}/view` : undefined),
        drive_view_url: row.atestado_drive_url || row.drive_view_url || (row.drive_file_id ? `https://drive.google.com/file/d/${row.drive_file_id}/view` : undefined),
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
    });
  } catch (error: any) {
    console.error('Erro geral ao carregar dados do Turso:', error);
    return NextResponse.json(
      { error: error.message || 'Falha ao buscar dados no Turso' },
      { status: 500 }
    );
  }
}
