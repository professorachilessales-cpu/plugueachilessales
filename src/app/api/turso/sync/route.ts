import { NextRequest, NextResponse } from 'next/server';
import { executeTursoQuery, isTursoConfigured } from '@/lib/turso';
import { removerObservacaoComAuditoria } from '@/lib/observacoes-service';
import { garantirSchemaRecorrenciaEventos, toBooleanStrict, validarParametrosRecorrencia } from '@/lib/calendario-service';

export async function POST(req: NextRequest) {
  try {
    if (!isTursoConfigured) {
      return NextResponse.json({ error: 'Turso não está configurado' }, { status: 400 });
    }

    const body = await req.json();
    const { action, payload } = body;

    switch (action) {
      // ----------------------------------------------------
      // CONFIG ESCOLA
      // ----------------------------------------------------
      case 'save_config': {
        const c = payload;
        await executeTursoQuery(
          `INSERT INTO config_escola (
            id, nome_escola, codigo_inep, cnpj, endereco, telefone, email,
            logo_url, logo_drive_id, cor_primaria, cor_secundaria,
            ano_letivo_ativo, modelos_whatsapp, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            nome_escola = excluded.nome_escola,
            codigo_inep = excluded.codigo_inep,
            cnpj = excluded.cnpj,
            endereco = excluded.endereco,
            telefone = excluded.telefone,
            email = excluded.email,
            logo_url = excluded.logo_url,
            logo_drive_id = excluded.logo_drive_id,
            cor_primaria = excluded.cor_primaria,
            cor_secundaria = excluded.cor_secundaria,
            ano_letivo_ativo = excluded.ano_letivo_ativo,
            modelos_whatsapp = excluded.modelos_whatsapp,
            updated_at = excluded.updated_at`,
          [
            c.id,
            c.nome_escola || 'Colégio Integrado PLUGUE',
            c.codigo_inep || '',
            c.cnpj || '',
            c.endereco || '',
            c.telefone || '',
            c.email || '',
            c.logo_url || '',
            c.logo_drive_id || '',
            c.cor_primaria || '#1E40AF',
            c.cor_secundaria || '#EAB308',
            c.ano_letivo_ativo || 2026,
            c.modelos_whatsapp ? JSON.stringify(c.modelos_whatsapp) : '{}',
            c.updated_at || new Date().toISOString()
          ]
        );
        return NextResponse.json({ success: true });
      }

      // ----------------------------------------------------
      // USUÁRIOS
      // ----------------------------------------------------
      case 'save_user': {
        const u = payload;
        await executeTursoQuery(
          `INSERT INTO users (
            id, name, email, cpf, password_hash, role, must_change_password,
            allowed_modules, is_active, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            name = excluded.name,
            email = excluded.email,
            cpf = excluded.cpf,
            password_hash = excluded.password_hash,
            role = excluded.role,
            must_change_password = excluded.must_change_password,
            allowed_modules = excluded.allowed_modules,
            is_active = excluded.is_active`,
          [
            u.id,
            u.name,
            u.email || null,
            u.cpf,
            u.password_hash,
            u.role,
            u.must_change_password ? 1 : 0,
            JSON.stringify(u.allowed_modules || ['PROFILE']),
            u.is_active ? 1 : 0,
            u.created_at || new Date().toISOString()
          ]
        );
        return NextResponse.json({ success: true });
      }

      case 'delete_user': {
        await executeTursoQuery('DELETE FROM users WHERE id = ?', [payload.id]);
        return NextResponse.json({ success: true });
      }

      // ----------------------------------------------------
      // TURMAS (Preserva turma_id dos estudantes sem disparar ON DELETE CASCADE/SET NULL)
      // ----------------------------------------------------
      case 'save_turma': {
        const t = payload;
        let sanitizedProfsIds: string[] = Array.isArray(t.professores_ids) ? [...t.professores_ids] : [];
        let sanitizedRegenteId: string | null = t.professor_regente_id || null;
        let sanitizedRegenteNome: string | null = t.professor_regente_nome || null;

        try {
          const profRes = await executeTursoQuery('SELECT id, eh_administrativo, eh_apoio, tipo_profissional, funcao_escola, formacao FROM professores');
          const ineligibleIds = new Set(
            profRes.rows
              .filter((row: any) => {
                const isAdmin = Boolean(
                  row.eh_administrativo === 1 ||
                  row.eh_administrativo === true ||
                  row.tipo_profissional === 'funcionario' ||
                  /diretor|secret[áa]ri|administrativ|porteir|servi[çc]os\s+gerais/i.test(row.funcao_escola || '') ||
                  /diretor|secret[áa]ri|administrativ|porteir|servi[çc]os\s+gerais/i.test(row.formacao || '')
                );
                const isApoio = Boolean(
                  row.eh_apoio === 1 ||
                  row.eh_apoio === true ||
                  /apoio/i.test(row.formacao || '')
                );
                return isAdmin || isApoio;
              })
              .map((row: any) => row.id)
          );

          sanitizedProfsIds = sanitizedProfsIds.filter(id => !ineligibleIds.has(id));
          if (sanitizedRegenteId && ineligibleIds.has(sanitizedRegenteId)) {
            sanitizedRegenteId = sanitizedProfsIds[0] || null;
            sanitizedRegenteNome = null;
          }
        } catch (errCheck) {
          console.error('Erro ao verificar professores inelegíveis em save_turma:', errCheck);
        }

        await executeTursoQuery(
          `INSERT INTO turmas (
            id, nome, grupo, turno, capacidade, ano_letivo,
            professor_regente_id, professor_regente_nome, professores_ids,
            equipe_apoio_ids, sala, ativa, grade_horaria, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            nome = excluded.nome,
            grupo = excluded.grupo,
            turno = excluded.turno,
            capacidade = excluded.capacidade,
            ano_letivo = excluded.ano_letivo,
            professor_regente_id = excluded.professor_regente_id,
            professor_regente_nome = excluded.professor_regente_nome,
            professores_ids = excluded.professores_ids,
            equipe_apoio_ids = excluded.equipe_apoio_ids,
            sala = excluded.sala,
            ativa = excluded.ativa,
            grade_horaria = excluded.grade_horaria`,
          [
            t.id,
            t.nome,
            t.grupo || '1º anos',
            t.turno,
            t.capacidade || 35,
            t.ano_letivo || 2026,
            sanitizedRegenteId,
            sanitizedRegenteNome,
            JSON.stringify(sanitizedProfsIds),
            JSON.stringify(t.equipe_apoio_ids || []),
            t.sala || '',
            t.ativa !== false ? 1 : 0,
            JSON.stringify(t.grade_horaria || []),
            t.created_at || new Date().toISOString()
          ]
        );

        // Se o nome da turma foi modificado, sincroniza o turma_nome dos estudantes vinculados
        if (t.id && t.nome) {
          await executeTursoQuery(
            'UPDATE estudantes SET turma_nome = ? WHERE turma_id = ?',
            [t.nome, t.id]
          );
        }

        // Sincroniza vínculos relacionais estritos na tabela turma_professores
        if (t.id && Array.isArray(sanitizedProfsIds)) {
          try {
            await executeTursoQuery('DELETE FROM turma_professores WHERE turma_id = ?', [t.id]);
            for (const pid of sanitizedProfsIds) {
              const pInfo = await executeTursoQuery('SELECT disciplinas FROM professores WHERE id = ?', [pid]);
              let disc = 'Geral';
              try {
                const parsedD = JSON.parse(pInfo.rows[0]?.disciplinas || '[]');
                if (parsedD.length > 0) disc = parsedD.join(' / ');
              } catch {}
              const relId = `tp-${t.id}-${pid}`;
              await executeTursoQuery(
                `INSERT INTO turma_professores (id, turma_id, professor_id, disciplina)
                 VALUES (?, ?, ?, ?)
                 ON CONFLICT(turma_id, professor_id, disciplina) DO NOTHING`,
                [relId, t.id, pid, disc]
              );
            }
          } catch (errTp) {
            console.error('Erro ao sincronizar turma_professores em save_turma:', errTp);
          }
        }

        return NextResponse.json({ success: true });
      }

      // ----------------------------------------------------
      // ESTUDANTES (Preserva vínculos existentes caso payload seja parcial)
      // ----------------------------------------------------
      case 'save_estudante': {
        const e = payload;
        await executeTursoQuery(
          `INSERT INTO estudantes (
            id, turma_id, turma_nome, nome_completo, data_nascimento, cpf,
            rg_numero, rg_data_expedicao, certidao_nascimento, naturalidade_cidade,
            nacionalidade, numero_sus, numero_bolsa_familia, percentual_cota,
            filiacao_materna, filiacao_paterna, telefone_responsavel, telefone_2,
            telefone_3, telefone_4, email, nome_responsavel, cpf_responsavel,
            parentesco_responsavel, endereco, endereco_logradouro, endereco_numero,
            endereco_bairro, possui_laudo, laudo_descricao, aee, apoio_id,
            apoio_nome, foto_url, status_matricula, tipo_movimentacao,
            tipo_historico_escolar, observacoes, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            turma_id = COALESCE(excluded.turma_id, estudantes.turma_id),
            turma_nome = COALESCE(excluded.turma_nome, estudantes.turma_nome),
            nome_completo = excluded.nome_completo,
            data_nascimento = excluded.data_nascimento,
            cpf = excluded.cpf,
            rg_numero = excluded.rg_numero,
            rg_data_expedicao = excluded.rg_data_expedicao,
            certidao_nascimento = excluded.certidao_nascimento,
            naturalidade_cidade = excluded.naturalidade_cidade,
            nacionalidade = excluded.nacionalidade,
            numero_sus = excluded.numero_sus,
            numero_bolsa_familia = excluded.numero_bolsa_familia,
            percentual_cota = excluded.percentual_cota,
            filiacao_materna = excluded.filiacao_materna,
            filiacao_paterna = excluded.filiacao_paterna,
            telefone_responsavel = excluded.telefone_responsavel,
            telefone_2 = excluded.telefone_2,
            telefone_3 = excluded.telefone_3,
            telefone_4 = excluded.telefone_4,
            email = excluded.email,
            nome_responsavel = excluded.nome_responsavel,
            cpf_responsavel = excluded.cpf_responsavel,
            parentesco_responsavel = excluded.parentesco_responsavel,
            endereco = excluded.endereco,
            endereco_logradouro = excluded.endereco_logradouro,
            endereco_numero = excluded.endereco_numero,
            endereco_bairro = excluded.endereco_bairro,
            possui_laudo = excluded.possui_laudo,
            laudo_descricao = excluded.laudo_descricao,
            aee = excluded.aee,
            apoio_id = excluded.apoio_id,
            apoio_nome = excluded.apoio_nome,
            foto_url = excluded.foto_url,
            status_matricula = excluded.status_matricula,
            tipo_movimentacao = excluded.tipo_movimentacao,
            tipo_historico_escolar = excluded.tipo_historico_escolar,
            observacoes = excluded.observacoes`,
          [
            e.id,
            e.turma_id || null,
            e.turma_nome || null,
            e.nome_completo,
            e.data_nascimento,
            e.cpf || null,
            e.rg_numero || null,
            e.rg_data_expedicao || null,
            e.certidao_nascimento || null,
            e.naturalidade_cidade || null,
            e.nacionalidade || 'Brasileira',
            e.numero_sus || null,
            e.numero_bolsa_familia || null,
            e.percentual_cota || '0%',
            e.filiacao_materna || null,
            e.filiacao_paterna || null,
            e.telefone_responsavel || null,
            e.telefone_2 || null,
            e.telefone_3 || null,
            e.telefone_4 || null,
            e.email || null,
            e.nome_responsavel || null,
            e.cpf_responsavel || null,
            e.parentesco_responsavel || 'Mãe',
            e.endereco || null,
            e.endereco_logradouro || null,
            e.endereco_numero || null,
            e.endereco_bairro || null,
            e.possui_laudo ? 1 : 0,
            e.laudo_descricao || null,
            e.aee ? 1 : 0,
            e.apoio_id || null,
            e.apoio_nome || null,
            e.foto_url || null,
            e.status_matricula || 'Ativo',
            e.tipo_movimentacao || 'Entrada Interna',
            e.tipo_historico_escolar || 'Definitivo',
            e.observacoes || null,
            e.created_at || new Date().toISOString()
          ]
        );
        return NextResponse.json({ success: true });
      }

      case 'delete_estudante': {
        await executeTursoQuery('DELETE FROM estudantes WHERE id = ?', [payload.id]);
        return NextResponse.json({ success: true });
      }

      case 'migrar_estudantes': {
        const { estudantesIds, turmaDestinoId, turmaDestinoNome } = payload;
        for (const estId of estudantesIds) {
          await executeTursoQuery(
            'UPDATE estudantes SET turma_id = ?, turma_nome = ? WHERE id = ?',
            [turmaDestinoId, turmaDestinoNome, estId]
          );
        }
        return NextResponse.json({ success: true });
      }

      // ----------------------------------------------------
      // PROFESSORES
      // ----------------------------------------------------
      case 'save_professor': {
        const p = payload;
        const isAdmin = Boolean(
          p.eh_administrativo ||
          p.tipo_profissional === 'funcionario' ||
          /diretor|secret[áa]ri|administrativ|porteir|servi[çc]os\s+gerais/i.test(p.funcao_escola || '') ||
          /diretor|secret[áa]ri|administrativ|porteir|servi[çc]os\s+gerais/i.test(p.formacao || '')
        );
        const isApoio = Boolean(p.eh_apoio || /apoio/i.test(p.formacao || ''));
        const turmasAtribuidas = isAdmin ? [] : (p.turmas_atribuidas_ids || []);

        await executeTursoQuery(
          `INSERT INTO professores (
            id, profile_id, nome_completo, matricula, tipo_profissional, funcao_escola,
            formacao, disciplinas, telefone, email, eh_apoio, eh_administrativo, ativo, turmas_atribuidas_ids,
            cpf, rg, rg_data_expedicao, data_nascimento, genero, vinculo_empregaticio,
            graduacao_instituicao, titulacao, pos_graduacao_instituicao, graduacao_inicio,
            graduacao_fim, pos_graduacao_inicio, pos_graduacao_fim, filiacao_1, filiacao_2,
            nome_mae, nome_pai, cep, logradouro, numero, complemento, bairro, cidade, uf,
            endereco_completo, celular_whatsapp, telefone_emergencia, telefone_emergencia2,
            contato_emergencia_nome, contato_emergencia_parentesco, observacoes, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            profile_id = excluded.profile_id,
            nome_completo = excluded.nome_completo,
            matricula = excluded.matricula,
            tipo_profissional = excluded.tipo_profissional,
            funcao_escola = excluded.funcao_escola,
            formacao = excluded.formacao,
            disciplinas = excluded.disciplinas,
            telefone = excluded.telefone,
            email = excluded.email,
            eh_apoio = excluded.eh_apoio,
            eh_administrativo = excluded.eh_administrativo,
            ativo = excluded.ativo,
            turmas_atribuidas_ids = excluded.turmas_atribuidas_ids,
            cpf = excluded.cpf,
            rg = excluded.rg,
            rg_data_expedicao = excluded.rg_data_expedicao,
            data_nascimento = excluded.data_nascimento,
            genero = excluded.genero,
            vinculo_empregaticio = excluded.vinculo_empregaticio,
            graduacao_instituicao = excluded.graduacao_instituicao,
            titulacao = excluded.titulacao,
            pos_graduacao_instituicao = excluded.pos_graduacao_instituicao,
            graduacao_inicio = excluded.graduacao_inicio,
            graduacao_fim = excluded.graduacao_fim,
            pos_graduacao_inicio = excluded.pos_graduacao_inicio,
            pos_graduacao_fim = excluded.pos_graduacao_fim,
            filiacao_1 = excluded.filiacao_1,
            filiacao_2 = excluded.filiacao_2,
            nome_mae = excluded.nome_mae,
            nome_pai = excluded.nome_pai,
            cep = excluded.cep,
            logradouro = excluded.logradouro,
            numero = excluded.numero,
            complemento = excluded.complemento,
            bairro = excluded.bairro,
            cidade = excluded.cidade,
            uf = excluded.uf,
            endereco_completo = excluded.endereco_completo,
            celular_whatsapp = excluded.celular_whatsapp,
            telefone_emergencia = excluded.telefone_emergencia,
            telefone_emergencia2 = excluded.telefone_emergencia2,
            contato_emergencia_nome = excluded.contato_emergencia_nome,
            contato_emergencia_parentesco = excluded.contato_emergencia_parentesco,
            observacoes = excluded.observacoes`,
          [
            p.id,
            p.profile_id || null,
            p.nome_completo,
            p.matricula,
            p.tipo_profissional || 'docente',
            p.funcao_escola || null,
            p.formacao || '',
            JSON.stringify(p.disciplinas || []),
            p.telefone || '',
            p.email || '',
            isApoio ? 1 : 0,
            isAdmin ? 1 : 0,
            p.ativo !== false ? 1 : 0,
            JSON.stringify(turmasAtribuidas),
            p.cpf || null,
            p.rg || null,
            p.rg_data_expedicao || null,
            p.data_nascimento || null,
            p.genero || null,
            p.vinculo_empregaticio || null,
            p.graduacao_instituicao || null,
            p.titulacao || null,
            p.pos_graduacao_instituicao || null,
            p.graduacao_inicio || null,
            p.graduacao_fim || null,
            p.pos_graduacao_inicio || null,
            p.pos_graduacao_fim || null,
            p.filiacao_1 || null,
            p.filiacao_2 || null,
            p.nome_mae || null,
            p.nome_pai || null,
            p.cep || null,
            p.logradouro || null,
            p.numero || null,
            p.complemento || null,
            p.bairro || null,
            p.cidade || null,
            p.uf || null,
            p.endereco_completo || null,
            p.celular_whatsapp || null,
            p.telefone_emergencia || null,
            p.telefone_emergencia2 || null,
            p.contato_emergencia_nome || null,
            p.contato_emergencia_parentesco || null,
            p.observacoes || null,
            p.created_at || new Date().toISOString()
          ]
        );

        // Se for administrativo ou apoio, remover de qualquer turma que possa ter seu vínculo como regente ou em professores_ids
        if (isAdmin || isApoio) {
          try {
            const turmasRes = await executeTursoQuery('SELECT id, professor_regente_id, professor_regente_nome, professores_ids FROM turmas');
            for (const tRow of turmasRes.rows) {
              let tProfs: string[] = [];
              try {
                tProfs = typeof tRow.professores_ids === 'string' ? JSON.parse(tRow.professores_ids) : (tRow.professores_ids || []);
              } catch (_) {
                tProfs = [];
              }
              const hasProfInList = tProfs.includes(p.id);
              const isRegente = tRow.professor_regente_id === p.id;
              if (hasProfInList || isRegente) {
                const cleanedProfs = tProfs.filter(id => id !== p.id);
                const cleanedRegenteId = isRegente ? (cleanedProfs[0] || null) : tRow.professor_regente_id;
                const cleanedRegenteNome = isRegente ? null : tRow.professor_regente_nome;
                await executeTursoQuery(
                  'UPDATE turmas SET professores_ids = ?, professor_regente_id = ?, professor_regente_nome = ? WHERE id = ?',
                  [JSON.stringify(cleanedProfs), cleanedRegenteId, cleanedRegenteNome, tRow.id]
                );
              }
            }
          } catch (errUnlink) {
            console.error('Erro ao desvincular professor de turmas no Turso:', errUnlink);
          }
        }

        // Sincroniza vínculos relacionais estritos na tabela turma_professores
        if (p.id) {
          try {
            await executeTursoQuery('UPDATE professores SET nome = nome_completo WHERE id = ? AND (nome IS NULL OR nome = "")', [p.id]);
            await executeTursoQuery('DELETE FROM turma_professores WHERE professor_id = ?', [p.id]);
            if (!isAdmin && Array.isArray(turmasAtribuidas)) {
              let disc = 'Geral';
              try {
                const parsedD = Array.isArray(p.disciplinas) ? p.disciplinas : JSON.parse(p.disciplinas || '[]');
                if (parsedD.length > 0) disc = parsedD.join(' / ');
              } catch {}
              for (const tid of turmasAtribuidas) {
                const relId = `tp-${tid}-${p.id}`;
                await executeTursoQuery(
                  `INSERT INTO turma_professores (id, turma_id, professor_id, disciplina)
                   VALUES (?, ?, ?, ?)
                   ON CONFLICT(turma_id, professor_id, disciplina) DO NOTHING`,
                  [relId, tid, p.id, disc]
                );
              }
            }
          } catch (errTp) {
            console.error('Erro ao sincronizar turma_professores em save_professor:', errTp);
          }
        }

        return NextResponse.json({ success: true });
      }

      // ----------------------------------------------------
      // FALTAS DE PROFESSORES / AUSÊNCIAS DOCENTES
      // ----------------------------------------------------
      case 'save_falta': {
        const f = payload;
        // Garante colunas no Turso
        const colunasAusencia = [
          'ALTER TABLE faltas_professores ADD COLUMN tipo_registro TEXT DEFAULT "DATA_UNICA"',
          'ALTER TABLE faltas_professores ADD COLUMN data_inicio TEXT',
          'ALTER TABLE faltas_professores ADD COLUMN data_fim TEXT',
          'ALTER TABLE faltas_professores ADD COLUMN aulas_calculadas_sistema INTEGER DEFAULT 0',
          'ALTER TABLE faltas_professores ADD COLUMN aulas_totais_devidas INTEGER DEFAULT 1',
          'ALTER TABLE faltas_professores ADD COLUMN aulas_pagas INTEGER DEFAULT 0',
          'ALTER TABLE faltas_professores ADD COLUMN aulas_abonadas INTEGER DEFAULT 0',
          'ALTER TABLE faltas_professores ADD COLUMN status_reposicao TEXT DEFAULT "A pagar"',
          'ALTER TABLE faltas_professores ADD COLUMN motivo TEXT',
          'ALTER TABLE faltas_professores ADD COLUMN atestado_drive_url TEXT',
          'ALTER TABLE faltas_professores ADD COLUMN drive_file_id TEXT',
          'ALTER TABLE faltas_professores ADD COLUMN observacao TEXT',
          'ALTER TABLE faltas_professores ADD COLUMN usuario_registro_id TEXT',
          'ALTER TABLE ausencias_docentes ADD COLUMN aulas_pagas INTEGER DEFAULT 0',
          'ALTER TABLE ausencias_docentes ADD COLUMN aulas_abonadas INTEGER DEFAULT 0',
          'ALTER TABLE ausencias_docentes ADD COLUMN status_reposicao TEXT DEFAULT "A pagar"',
          `CREATE TABLE IF NOT EXISTS historico_reposicoes_pagamentos (
            id TEXT PRIMARY KEY,
            ausencia_id TEXT NOT NULL,
            aulas_abatidas INTEGER NOT NULL DEFAULT 1,
            tipo_baixa TEXT NOT NULL CHECK(tipo_baixa IN ('PAGAMENTO', 'ABONO')),
            data_reposicao TEXT,
            observacao TEXT,
            data_registro TEXT DEFAULT CURRENT_TIMESTAMP,
            usuario_id TEXT,
            usuario_nome TEXT
          )`,
          'CREATE INDEX IF NOT EXISTS idx_hist_rep_ausencia ON historico_reposicoes_pagamentos(ausencia_id)',
        ];
        for (const sql of colunasAusencia) {
          try {
            await executeTursoQuery(sql);
          } catch {}
        }

        const tipoReg = f.tipo_registro || 'DATA_UNICA';
        const dataIni = f.data_inicio || f.data_falta || new Date().toISOString().split('T')[0];
        const dataFim = f.data_fim || dataIni;
        const aulasTotais = Number(f.aulas_totais_devidas ?? f.aulas_faltadas ?? 1);
        const aulasCalc = Number(f.aulas_calculadas_sistema ?? 0);
        const aulasPagas = Number(f.aulas_pagas ?? 0);
        const aulasAbonadas = Number(f.aulas_abonadas ?? 0);
        const statusReposicao = f.status_reposicao || (
          (aulasPagas === 0 && aulasAbonadas === 0) ? 'A pagar' :
          (aulasTotais - (aulasPagas + aulasAbonadas) <= 0) ? (aulasAbonadas >= aulasTotais ? 'Abonadas' : 'Totalmente Pago') :
          'Pago Parcialmente'
        );
        const motivoTexto = (f.motivo || f.justificativa || '').toUpperCase();
        const driveUrl = f.atestado_drive_url || f.atestado_drive_link || null;
        const driveId = f.drive_file_id || f.atestado_drive_id || null;
        const obs = f.observacao || null;
        const usuarioId = f.usuario_registro_id || null;

        await executeTursoQuery(
          `INSERT INTO faltas_professores (
            id, professor_id, professor_nome, tipo_registro, data_inicio, data_fim, data_falta,
            aulas_calculadas_sistema, aulas_totais_devidas, aulas_faltadas,
            aulas_pagas, aulas_abonadas, status_reposicao,
            motivo, justificativa, atestado_drive_url, atestado_drive_link,
            drive_file_id, atestado_drive_id, observacao, usuario_registro_id,
            created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            professor_id = excluded.professor_id,
            professor_nome = excluded.professor_nome,
            tipo_registro = excluded.tipo_registro,
            data_inicio = excluded.data_inicio,
            data_fim = excluded.data_fim,
            data_falta = excluded.data_falta,
            aulas_calculadas_sistema = excluded.aulas_calculadas_sistema,
            aulas_totais_devidas = excluded.aulas_totais_devidas,
            aulas_faltadas = excluded.aulas_faltadas,
            aulas_pagas = excluded.aulas_pagas,
            aulas_abonadas = excluded.aulas_abonadas,
            status_reposicao = excluded.status_reposicao,
            motivo = excluded.motivo,
            justificativa = excluded.justificativa,
            atestado_drive_url = excluded.atestado_drive_url,
            atestado_drive_link = excluded.atestado_drive_link,
            drive_file_id = excluded.drive_file_id,
            atestado_drive_id = excluded.atestado_drive_id,
            observacao = excluded.observacao,
            usuario_registro_id = excluded.usuario_registro_id`,
          [
            f.id,
            f.professor_id,
            f.professor_nome || null,
            tipoReg,
            dataIni,
            dataFim,
            dataIni,
            aulasCalc,
            aulasTotais,
            aulasTotais,
            aulasPagas,
            aulasAbonadas,
            statusReposicao,
            motivoTexto,
            motivoTexto,
            driveUrl,
            driveUrl,
            driveId,
            driveId,
            obs,
            usuarioId,
            f.created_at || new Date().toISOString()
          ]
        );

        try {
          await executeTursoQuery(
            `INSERT INTO ausencias_docentes (
              id, professor_id, tipo_registro, data_inicio, data_fim,
              aulas_calculadas_sistema, aulas_totais_devidas,
              aulas_pagas, aulas_abonadas, status_reposicao,
              motivo, atestado_drive_url, drive_file_id,
              observacao, usuario_registro_id, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              professor_id = excluded.professor_id,
              tipo_registro = excluded.tipo_registro,
              data_inicio = excluded.data_inicio,
              data_fim = excluded.data_fim,
              aulas_calculadas_sistema = excluded.aulas_calculadas_sistema,
              aulas_totais_devidas = excluded.aulas_totais_devidas,
              aulas_pagas = excluded.aulas_pagas,
              aulas_abonadas = excluded.aulas_abonadas,
              status_reposicao = excluded.status_reposicao,
              motivo = excluded.motivo,
              atestado_drive_url = excluded.atestado_drive_url,
              drive_file_id = excluded.drive_file_id,
              observacao = excluded.observacao,
              usuario_registro_id = excluded.usuario_registro_id`,
            [
              f.id,
              f.professor_id,
              tipoReg,
              dataIni,
              dataFim,
              aulasCalc,
              aulasTotais,
              aulasPagas,
              aulasAbonadas,
              statusReposicao,
              motivoTexto,
              driveUrl,
              driveId,
              obs,
              usuarioId,
              f.created_at || new Date().toISOString()
            ]
          );
        } catch {}

        return NextResponse.json({ success: true });
      }

      case 'save_baixa_reposicao': {
        const b = payload;
        const colunasGarantir = [
          'ALTER TABLE faltas_professores ADD COLUMN aulas_pagas INTEGER DEFAULT 0',
          'ALTER TABLE faltas_professores ADD COLUMN aulas_abonadas INTEGER DEFAULT 0',
          'ALTER TABLE faltas_professores ADD COLUMN status_reposicao TEXT DEFAULT "A pagar"',
          'ALTER TABLE ausencias_docentes ADD COLUMN aulas_pagas INTEGER DEFAULT 0',
          'ALTER TABLE ausencias_docentes ADD COLUMN aulas_abonadas INTEGER DEFAULT 0',
          'ALTER TABLE ausencias_docentes ADD COLUMN status_reposicao TEXT DEFAULT "A pagar"',
          `CREATE TABLE IF NOT EXISTS historico_reposicoes_pagamentos (
            id TEXT PRIMARY KEY,
            ausencia_id TEXT NOT NULL,
            aulas_abatidas INTEGER NOT NULL DEFAULT 1,
            tipo_baixa TEXT NOT NULL CHECK(tipo_baixa IN ('PAGAMENTO', 'ABONO')),
            data_reposicao TEXT,
            observacao TEXT,
            data_registro TEXT DEFAULT CURRENT_TIMESTAMP,
            usuario_id TEXT,
            usuario_nome TEXT
          )`,
          'CREATE INDEX IF NOT EXISTS idx_hist_rep_ausencia ON historico_reposicoes_pagamentos(ausencia_id)',
        ];
        for (const sql of colunasGarantir) {
          try {
            await executeTursoQuery(sql);
          } catch {}
        }

        if (b.historico) {
          await executeTursoQuery(
            `INSERT INTO historico_reposicoes_pagamentos (
              id, ausencia_id, aulas_abatidas, tipo_baixa,
              data_reposicao, observacao, data_registro,
              usuario_id, usuario_nome
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              b.historico.id,
              b.historico.ausencia_id,
              b.historico.aulas_abatidas,
              b.historico.tipo_baixa,
              b.historico.data_reposicao || null,
              b.historico.observacao || null,
              b.historico.data_registro || new Date().toISOString(),
              b.historico.usuario_id || null,
              b.historico.usuario_nome || null
            ]
          );
        }

        if (b.ausencia_id) {
          await executeTursoQuery(
            `UPDATE faltas_professores
             SET aulas_pagas = ?, aulas_abonadas = ?, status_reposicao = ?
             WHERE id = ?`,
            [Number(b.aulas_pagas ?? 0), Number(b.aulas_abonadas ?? 0), b.status_reposicao, b.ausencia_id]
          );
          try {
            await executeTursoQuery(
              `UPDATE ausencias_docentes
               SET aulas_pagas = ?, aulas_abonadas = ?, status_reposicao = ?
               WHERE id = ?`,
              [Number(b.aulas_pagas ?? 0), Number(b.aulas_abonadas ?? 0), b.status_reposicao, b.ausencia_id]
            );
          } catch {}
        }

        return NextResponse.json({ success: true });
      }

      case 'delete_falta': {
        const { id } = payload;
        if (id) {
          await executeTursoQuery('DELETE FROM faltas_professores WHERE id = ?', [id]);
          try {
            await executeTursoQuery('DELETE FROM ausencias_docentes WHERE id = ?', [id]);
            await executeTursoQuery('DELETE FROM historico_reposicoes_pagamentos WHERE ausencia_id = ?', [id]);
          } catch {}
        }
        return NextResponse.json({ success: true });
      }

      // ----------------------------------------------------
      // EVENTOS
      // ----------------------------------------------------
      case 'save_evento': {
        const ev = payload;
        await garantirSchemaRecorrenciaEventos();

        const recTipo = ev.recorrencia_tipo || 'NENHUMA';
        const recDia = recTipo !== 'NENHUMA' && ev.recorrencia_dia != null ? Number(ev.recorrencia_dia) : null;
        const recMes = recTipo === 'ANUAL' && ev.recorrencia_mes != null ? Number(ev.recorrencia_mes) : null;
        const recAtiva = recTipo !== 'NENHUMA' && toBooleanStrict(ev.recorrencia_ativa) ? 1 : 0;
        const recLimite = recTipo !== 'NENHUMA' && ev.recorrencia_data_limite ? ev.recorrencia_data_limite : null;

        const sqlEventos = `
          INSERT INTO eventos (
            id, titulo, descricao, data_inicio, data_fim, categoria, cor,
            publico_alvo, recorrencia_tipo, recorrencia_dia, recorrencia_mes,
            recorrencia_ativa, recorrencia_data_limite, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            titulo = excluded.titulo,
            descricao = excluded.descricao,
            data_inicio = excluded.data_inicio,
            data_fim = excluded.data_fim,
            categoria = excluded.categoria,
            cor = excluded.cor,
            publico_alvo = excluded.publico_alvo,
            recorrencia_tipo = excluded.recorrencia_tipo,
            recorrencia_dia = excluded.recorrencia_dia,
            recorrencia_mes = excluded.recorrencia_mes,
            recorrencia_ativa = excluded.recorrencia_ativa,
            recorrencia_data_limite = excluded.recorrencia_data_limite
        `;

        const args = [
          ev.id,
          ev.titulo,
          ev.descricao || '',
          ev.data_inicio,
          ev.data_fim,
          ev.categoria || 'cultural',
          ev.cor || '#2563EB',
          ev.publico_alvo || 'Todos',
          recTipo,
          recDia,
          recMes,
          recAtiva,
          recLimite,
          ev.created_at || new Date().toISOString()
        ];

        await executeTursoQuery(sqlEventos, args);

        // Espelha em paralelo na tabela calendario_eventos para compatibilidade plena
        const sqlCal = sqlEventos.replace('INTO eventos', 'INTO calendario_eventos');
        await executeTursoQuery(sqlCal, args);

        return NextResponse.json({ success: true });
      }

      case 'delete_evento': {
        await executeTursoQuery('DELETE FROM eventos WHERE id = ?', [payload.id]);
        await executeTursoQuery('DELETE FROM calendario_eventos WHERE id = ?', [payload.id]);
        return NextResponse.json({ success: true });
      }

      // ----------------------------------------------------
      // CATEGORIAS DE EVENTOS
      // ----------------------------------------------------
      case 'save_categoria_evento': {
        const cat = payload;
        await executeTursoQuery(
          `INSERT INTO calendario_categorias (
            id, nome, cor_hex, visivel_docentes, sistema_protegida, created_at
          ) VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            nome = excluded.nome,
            cor_hex = excluded.cor_hex,
            visivel_docentes = excluded.visivel_docentes`,
          [
            cat.id,
            cat.nome,
            cat.cor_hex,
            cat.visivel_docentes ? 1 : 0,
            cat.sistema_protegida ? 1 : 0,
            cat.created_at || new Date().toISOString()
          ]
        );
        return NextResponse.json({ success: true });
      }

      case 'delete_categoria_evento': {
        const { id } = payload;
        if (id === 'cat-aniversarios' || payload.sistema_protegida) {
          return NextResponse.json(
            { error: 'A categoria Aniversários é protegida do sistema e não pode ser excluída.' },
            { status: 403 }
          );
        }
        await executeTursoQuery('DELETE FROM calendario_categorias WHERE id = ? AND sistema_protegida != 1', [id]);
        return NextResponse.json({ success: true });
      }

      // ----------------------------------------------------
      // DOCUMENTOS DE ESTUDANTE
      // ----------------------------------------------------
      case 'save_documento': {
        const doc = payload;
        await executeTursoQuery(
          `INSERT INTO documentos_estudantes (
            id, estudante_id, tipo_documento, nome_arquivo,
            drive_file_id, drive_view_link, tamanho_bytes, mime_type, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            tipo_documento = excluded.tipo_documento,
            nome_arquivo = excluded.nome_arquivo,
            drive_file_id = excluded.drive_file_id,
            drive_view_link = excluded.drive_view_link,
            tamanho_bytes = excluded.tamanho_bytes,
            mime_type = excluded.mime_type`,
          [
            doc.id,
            doc.estudante_id,
            doc.tipo_documento,
            doc.nome_arquivo,
            doc.drive_file_id || null,
            doc.drive_view_link || null,
            doc.tamanho_bytes || null,
            doc.mime_type || null,
            doc.created_at || new Date().toISOString()
          ]
        );
        return NextResponse.json({ success: true });
      }

      // ----------------------------------------------------
      // OBSERVAÇÕES & AUDITORIA PEDAGÓGICA
      // ----------------------------------------------------
      case 'save_observacao': {
        const obs = payload;
        const estudanteId = obs.estudante_id || obs.aluno_id;
        const usuarioId = obs.usuario_id || obs.autor_id || 'user-admin';
        const textoCompleto = obs.texto_completo || obs.texto || '';
        const categoria = obs.categoria || obs.tipo || 'pedagogico';
        const createdAt = obs.created_at || obs.data_registro || new Date().toISOString();

        // 1. Inserir em observacoes_pedagogicas
        try {
          await executeTursoQuery(
            `INSERT INTO observacoes_pedagogicas (
              id, estudante_id, usuario_id, autor_nome, categoria, texto, created_at, ativo
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 1)
            ON CONFLICT(id) DO UPDATE SET
              categoria = excluded.categoria,
              texto = excluded.texto,
              ativo = 1`,
            [
              obs.id,
              estudanteId,
              usuarioId,
              obs.autor_nome || 'Usuário',
              categoria,
              textoCompleto,
              createdAt,
            ]
          );
        } catch (ePed) {
          console.warn('Erro ao inserir em observacoes_pedagogicas:', ePed);
        }

        // 2. Inserir em observacoes_aluno
        try {
          await executeTursoQuery(
            `INSERT INTO observacoes_aluno (
              id, estudante_id, aluno_id, usuario_id, autor_id,
              autor_nome, autor_cargo, categoria, tipo,
              texto_completo, texto, created_at, data_registro, ativo
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
            ON CONFLICT(id) DO UPDATE SET
              categoria = excluded.categoria,
              tipo = excluded.tipo,
              texto_completo = excluded.texto_completo,
              texto = excluded.texto,
              ativo = 1`,
            [
              obs.id,
              estudanteId,
              estudanteId,
              usuarioId,
              usuarioId,
              obs.autor_nome || 'Usuário',
              obs.autor_cargo || 'Equipe Escolar',
              categoria,
              categoria,
              textoCompleto,
              textoCompleto,
              createdAt,
              createdAt,
            ]
          );
        } catch (eAlu) {
          console.warn('Erro ao inserir em observacoes_aluno:', eAlu);
        }

        // 3. Registro de Auditoria de Criação
        try {
          const auditId = `aud-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
          await executeTursoQuery(
            `INSERT INTO observacoes_auditoria (
              id, observacao_id, estudante_id, evento,
              texto_novo, categoria, usuario_id, usuario_nome, created_at
            ) VALUES (?, ?, ?, 'CREATE', ?, ?, ?, ?, ?)`,
            [
              auditId,
              obs.id,
              estudanteId,
              textoCompleto,
              categoria,
              usuarioId,
              obs.autor_nome || 'Usuário',
              createdAt,
            ]
          );
        } catch (audErr) {
          console.warn('Aviso: Erro ao registrar auditoria de CREATE para observacao:', audErr);
        }

        return NextResponse.json({ success: true });
      }

      case 'update_observacao': {
        const { observacao_id, novo_texto, usuario_id, usuario_nome, registro_anterior } = payload;
        const agora = new Date().toISOString();

        // 1. Atualizar observacoes_pedagogicas
        try {
          await executeTursoQuery(
            `UPDATE observacoes_pedagogicas SET texto = ? WHERE id = ?`,
            [novo_texto, observacao_id]
          );
        } catch (e) {
          console.warn('Erro ao atualizar observacoes_pedagogicas:', e);
        }

        // 2. Atualizar observacoes_aluno
        try {
          await executeTursoQuery(
            `UPDATE observacoes_aluno SET texto_completo = ?, texto = ? WHERE id = ?`,
            [novo_texto, novo_texto, observacao_id]
          );
        } catch (e) {
          console.warn('Erro ao atualizar observacoes_aluno:', e);
        }

        // 3. Grava na tabela de auditoria o registro anterior completo
        const auditId = `aud-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const estudanteId = registro_anterior?.estudante_id || registro_anterior?.aluno_id || '';
        const textoAnterior = registro_anterior?.texto_completo || registro_anterior?.texto || '';
        const categoria = registro_anterior?.categoria || registro_anterior?.tipo || 'pedagogico';

        try {
          await executeTursoQuery(
            `INSERT INTO observacoes_auditoria (
              id, observacao_id, estudante_id, evento,
              texto_anterior, texto_novo, categoria, registro_anterior,
              usuario_id, usuario_nome, created_at
            ) VALUES (?, ?, ?, 'UPDATE', ?, ?, ?, ?, ?, ?, ?)`,
            [
              auditId,
              observacao_id,
              estudanteId,
              textoAnterior,
              novo_texto,
              categoria,
              JSON.stringify(registro_anterior || {}),
              usuario_id,
              usuario_nome || 'Usuário',
              agora,
            ]
          );
        } catch (audErr) {
          console.warn('Aviso: Erro ao gravar observacoes_auditoria no Turso:', audErr);
        }

        return NextResponse.json({ success: true });
      }

      case 'delete_observacao': {
        const { observacao_id, estudante_id, usuario_id, usuario_nome, registro_completo } = payload;
        try {
          const result = await removerObservacaoComAuditoria({
            observacaoId: observacao_id,
            usuario: {
              userId: usuario_id || 'user-admin',
              userName: usuario_nome || 'Administrador',
            },
            payloadFallback: {
              estudante_id,
              registro_completo,
            },
          });
          return NextResponse.json(result);
        } catch (error: any) {
          console.error("Erro na exclusão/auditoria:", error);
          return NextResponse.json(
            { error: error?.message || 'Falha ao processar exclusão de observação no sync.' },
            { status: 500 }
          );
        }
      }

      case 'criar_solicitacao_relatorio': {
        const { solicitacao, relatorios_professores } = payload;
        try {
          // 1. Valida estritamente contra a tabela turmas do banco de dados
          let profsValidosDaTurma: Set<string> | null = null;
          if (solicitacao?.aluno_id) {
            try {
              const estRes = await executeTursoQuery('SELECT turma_id, turma_nome FROM estudantes WHERE id = ?', [solicitacao.aluno_id]);
              const estDb = estRes.rows[0];
              if (estDb) {
                const tRes = await executeTursoQuery(
                  'SELECT id, professores_ids, professor_regente_id, equipe_apoio_ids FROM turmas WHERE id = ? OR LOWER(nome) = LOWER(?)',
                  [estDb.turma_id || '', (estDb.turma_nome || '').trim()]
                );
                if (tRes.rows.length > 0) {
                  const tRow = tRes.rows[0];
                  profsValidosDaTurma = new Set<string>();
                  try {
                    const pIds = typeof tRow.professores_ids === 'string' ? JSON.parse(tRow.professores_ids) : tRow.professores_ids;
                    if (Array.isArray(pIds)) pIds.forEach((id: string) => profsValidosDaTurma!.add(id));
                  } catch {}
                  if (tRow.professor_regente_id) profsValidosDaTurma.add(tRow.professor_regente_id);
                  try {
                    const aIds = typeof tRow.equipe_apoio_ids === 'string' ? JSON.parse(tRow.equipe_apoio_ids) : tRow.equipe_apoio_ids;
                    if (Array.isArray(aIds)) aIds.forEach((id: string) => profsValidosDaTurma!.add(id));
                  } catch {}
                }
              }
            } catch (errCheck) {
              console.warn('Aviso: Não foi possível validar turma_professores no sync:', errCheck);
            }
          }

          if (solicitacao) {
            await executeTursoQuery(
              `INSERT INTO solicitacoes_relatorio (id, aluno_id, status, data_solicitacao, admin_solicitante_id, created_at)
               VALUES (?, ?, ?, ?, ?, ?)
               ON CONFLICT(id) DO UPDATE SET
                 status = excluded.status,
                 data_solicitacao = excluded.data_solicitacao`,
              [
                solicitacao.id,
                solicitacao.aluno_id,
                solicitacao.status || 'pendente',
                solicitacao.data_solicitacao || new Date().toISOString().split('T')[0],
                solicitacao.admin_solicitante_id || 'admin',
                solicitacao.created_at || new Date().toISOString(),
              ]
            );
          }
          if (Array.isArray(relatorios_professores)) {
            // Filtra exclusivamente para os professores da turma do estudante cadastrados na tabela turmas do banco
            const relatoriosFiltrados = profsValidosDaTurma && profsValidosDaTurma.size > 0
              ? relatorios_professores.filter((rp: any) => profsValidosDaTurma!.has(rp.professor_id))
              : relatorios_professores;

            for (const rp of relatoriosFiltrados) {
              await executeTursoQuery(
                `INSERT INTO relatorios_professores (id, solicitacao_id, professor_id, rascunho_original, texto_ia, texto_final, status, data_envio, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                 ON CONFLICT(id) DO UPDATE SET
                   rascunho_original = COALESCE(excluded.rascunho_original, relatorios_professores.rascunho_original),
                   texto_ia = COALESCE(excluded.texto_ia, relatorios_professores.texto_ia),
                   texto_final = COALESCE(excluded.texto_final, relatorios_professores.texto_final),
                   status = excluded.status`,
                [
                  rp.id,
                  rp.solicitacao_id,
                  rp.professor_id,
                  rp.rascunho_original || '',
                  rp.texto_ia || '',
                  rp.texto_final || '',
                  rp.status || 'pendente',
                  rp.data_envio || null,
                  rp.created_at || new Date().toISOString(),
                ]
              );
            }
          }
        } catch (e: any) {
          console.error('Erro ao criar solicitação de relatório no Turso:', e);
          return NextResponse.json({ error: e?.message || 'Falha ao salvar solicitação no banco' }, { status: 500 });
        }
        return NextResponse.json({ success: true });
      }

      case 'salvar_rascunho_professor': {
        const { relatorio_id, rascunho, texto_final } = payload;
        try {
          await executeTursoQuery(
            `UPDATE relatorios_professores 
             SET rascunho_original = ?, 
                 texto_final = CASE WHEN (texto_final IS NULL OR texto_final = '') THEN ? ELSE texto_final END 
             WHERE id = ?`,
            [rascunho || '', texto_final || rascunho || '', relatorio_id]
          );
        } catch (e: any) {
          console.error('Erro ao salvar rascunho do professor no Turso:', e);
          return NextResponse.json({ error: e?.message || 'Falha ao salvar rascunho no banco' }, { status: 500 });
        }
        return NextResponse.json({ success: true });
      }

      case 'limpar_rascunho_professor': {
        const { relatorio_id } = payload;
        try {
          await executeTursoQuery(
            `UPDATE relatorios_professores 
             SET rascunho_original = '', 
                 texto_ia = '', 
                 texto_final = CASE WHEN status = 'enviado' THEN texto_final ELSE '' END
             WHERE id = ?`,
            [relatorio_id]
          );
        } catch (e: any) {
          console.error('Erro ao limpar rascunho do professor no Turso:', e);
          return NextResponse.json({ error: e?.message || 'Falha ao limpar rascunho no banco' }, { status: 500 });
        }
        return NextResponse.json({ success: true });
      }

      case 'atualizar_relatorio_professor': {
        const { relatorio_id, rascunho_original, texto_ia, texto_final, status } = payload;
        try {
          await executeTursoQuery(
            `UPDATE relatorios_professores 
             SET rascunho_original = COALESCE(?, rascunho_original),
                 texto_ia = COALESCE(?, texto_ia),
                 texto_final = COALESCE(?, texto_final),
                 status = COALESCE(?, status)
             WHERE id = ?`,
            [
              rascunho_original !== undefined ? rascunho_original : null,
              texto_ia !== undefined ? texto_ia : null,
              texto_final !== undefined ? texto_final : null,
              status !== undefined ? status : null,
              relatorio_id
            ]
          );
        } catch (e: any) {
          console.error('Erro ao atualizar relatório do professor no Turso:', e);
          return NextResponse.json({ error: e?.message || 'Falha ao atualizar relatório no banco' }, { status: 500 });
        }
        return NextResponse.json({ success: true });
      }

      case 'enviar_relatorio_professor': {
        const { relatorio_id, texto_final, data_envio, notificacao } = payload;
        const envio = data_envio || new Date().toISOString();
        try {
          await executeTursoQuery(
            `UPDATE relatorios_professores 
             SET texto_final = ?, 
                 status = 'enviado', 
                 data_envio = ? 
             WHERE id = ?`,
            [texto_final || '', envio, relatorio_id]
          );
          if (notificacao) {
            await executeTursoQuery(
              `INSERT INTO notificacoes_admin (id, relatorio_professor_id, solicitacao_id, professor_id, professor_nome, aluno_nome, lido, data_criacao)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)
               ON CONFLICT(id) DO UPDATE SET lido = excluded.lido`,
              [
                notificacao.id,
                notificacao.relatorio_professor_id || relatorio_id,
                notificacao.solicitacao_id || null,
                notificacao.professor_id || null,
                notificacao.professor_nome || 'Docente',
                notificacao.aluno_nome || 'Estudante',
                notificacao.lido ? 1 : 0,
                notificacao.data_criacao || envio,
              ]
            );
          }
        } catch (e: any) {
          console.error('Erro ao enviar relatório do professor no Turso:', e);
          return NextResponse.json({ error: e?.message || 'Falha ao enviar relatório no banco' }, { status: 500 });
        }
        return NextResponse.json({ success: true });
      }

      case 'salvar_relatorio_consolidado': {
        const { consolidado, solicitacao_id, conteudo_final, data_geracao, arquivo_docx_url } = payload;
        const solId = solicitacao_id || consolidado?.solicitacao_id;
        const cId = consolidado?.id || `rel-cons-${Date.now()}`;
        const cFinal = conteudo_final || consolidado?.conteudo_final || '';
        const cData = data_geracao || consolidado?.data_geracao || new Date().toISOString();
        const cDocx = arquivo_docx_url || consolidado?.arquivo_docx_url || `/api/relatorios/docx?solicitacao_id=${solId}`;
        const cCreated = consolidado?.created_at || cData;

        try {
          await executeTursoQuery(
            `INSERT INTO relatorios_consolidados (id, solicitacao_id, conteudo_final, data_geracao, arquivo_docx_url, created_at)
             VALUES (?, ?, ?, ?, ?, ?)
             ON CONFLICT(id) DO UPDATE SET
               conteudo_final = excluded.conteudo_final,
               data_geracao = excluded.data_geracao,
               arquivo_docx_url = excluded.arquivo_docx_url`,
            [cId, solId, cFinal, cData, cDocx, cCreated]
          );

          if (solId) {
            await executeTursoQuery(
              `UPDATE solicitacoes_relatorio SET status = 'concluido' WHERE id = ?`,
              [solId]
            );
            // Professores que não realizaram o relatório ficam com status 'nao_elaborado' registrado no banco
            await executeTursoQuery(
              `UPDATE relatorios_professores SET status = 'nao_elaborado' WHERE solicitacao_id = ? AND status != 'enviado'`,
              [solId]
            );
          }
        } catch (e: any) {
          console.error('Erro ao salvar relatório consolidado no Turso:', e);
          return NextResponse.json({ error: e?.message || 'Falha ao salvar consolidado no banco' }, { status: 500 });
        }
        return NextResponse.json({ success: true });
      }

      case 'concluir_solicitacao_relatorio': {
        const { solicitacao_id } = payload;
        try {
          if (solicitacao_id) {
            await executeTursoQuery(
              `UPDATE solicitacoes_relatorio SET status = 'concluido' WHERE id = ?`,
              [solicitacao_id]
            );
            await executeTursoQuery(
              `UPDATE relatorios_professores SET status = 'nao_elaborado' WHERE solicitacao_id = ? AND status != 'enviado'`,
              [solicitacao_id]
            );
          }
        } catch (e: any) {
          console.error('Erro ao concluir solicitação no Turso:', e);
          return NextResponse.json({ error: e?.message || 'Falha ao concluir solicitação no banco' }, { status: 500 });
        }
        return NextResponse.json({ success: true });
      }

      case 'marcar_notificacao_lida': {
        const { notificacao_id, todas } = payload;
        try {
          if (todas) {
            await executeTursoQuery('UPDATE notificacoes_admin SET lido = 1');
          } else if (notificacao_id) {
            await executeTursoQuery('UPDATE notificacoes_admin SET lido = 1 WHERE id = ?', [notificacao_id]);
          }
        } catch (e: any) {
          console.error('Erro ao marcar notificação no Turso:', e);
        }
        return NextResponse.json({ success: true });
      }

      case 'delete_relatorio_professor': {
        const { relatorio_id } = payload;
        try {
          await executeTursoQuery('DELETE FROM notificacoes_admin WHERE relatorio_professor_id = ?', [relatorio_id]);
          await executeTursoQuery('DELETE FROM relatorios_professores WHERE id = ?', [relatorio_id]);
        } catch (e: any) {
          console.error('Erro ao excluir parecer docente no Turso:', e);
        }
        return NextResponse.json({ success: true });
      }

      case 'delete_solicitacao': {
        const { solicitacao_id } = payload;
        try {
          await executeTursoQuery('DELETE FROM relatorios_professores WHERE solicitacao_id = ?', [solicitacao_id]);
          await executeTursoQuery('DELETE FROM relatorios_consolidados WHERE solicitacao_id = ?', [solicitacao_id]);
          await executeTursoQuery('DELETE FROM consolidacoes_pareceres WHERE solicitacao_id = ?', [solicitacao_id]);
          await executeTursoQuery('DELETE FROM notificacoes_admin WHERE solicitacao_id = ?', [solicitacao_id]);
          await executeTursoQuery('DELETE FROM solicitacoes_relatorio WHERE id = ?', [solicitacao_id]);
        } catch (e) {
          console.warn('Erro ao excluir solicitação no Turso:', e);
        }
        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json({ error: `Ação '${action}' desconhecida` }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Erro na sincronização com o Turso:', error);
    return NextResponse.json(
      { error: error.message || 'Falha ao sincronizar dados com o Turso' },
      { status: 500 }
    );
  }
}
