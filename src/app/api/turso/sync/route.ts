import { NextRequest, NextResponse } from 'next/server';
import { executeTursoQuery, isTursoConfigured } from '@/lib/turso';

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
          `INSERT OR REPLACE INTO config_escola (
            id, nome_escola, codigo_inep, cnpj, endereco, telefone, email,
            logo_url, logo_drive_id, cor_primaria, cor_secundaria,
            ano_letivo_ativo, modelos_whatsapp, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
          `INSERT OR REPLACE INTO users (
            id, name, email, cpf, password_hash, role, must_change_password,
            allowed_modules, is_active, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
      // TURMAS
      // ----------------------------------------------------
      case 'save_turma': {
        const t = payload;
        await executeTursoQuery(
          `INSERT OR REPLACE INTO turmas (
            id, nome, grupo, turno, capacidade, ano_letivo,
            professor_regente_id, professor_regente_nome, professores_ids,
            equipe_apoio_ids, sala, ativa, grade_horaria, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            t.id,
            t.nome,
            t.grupo || '1º anos',
            t.turno,
            t.capacidade || 35,
            t.ano_letivo || 2026,
            t.professor_regente_id || null,
            t.professor_regente_nome || null,
            JSON.stringify(t.professores_ids || []),
            JSON.stringify(t.equipe_apoio_ids || []),
            t.sala || '',
            t.ativa !== false ? 1 : 0,
            JSON.stringify(t.grade_horaria || []),
            t.created_at || new Date().toISOString()
          ]
        );
        return NextResponse.json({ success: true });
      }

      // ----------------------------------------------------
      // ESTUDANTES
      // ----------------------------------------------------
      case 'save_estudante': {
        const e = payload;
        await executeTursoQuery(
          `INSERT OR REPLACE INTO estudantes (
            id, turma_id, turma_nome, nome_completo, data_nascimento, cpf,
            rg_numero, rg_data_expedicao, certidao_nascimento, naturalidade_cidade,
            nacionalidade, numero_sus, numero_bolsa_familia, percentual_cota,
            filiacao_materna, filiacao_paterna, telefone_responsavel, telefone_2,
            telefone_3, telefone_4, email, nome_responsavel, cpf_responsavel,
            parentesco_responsavel, endereco, endereco_logradouro, endereco_numero,
            endereco_bairro, possui_laudo, laudo_descricao, aee, apoio_id,
            apoio_nome, foto_url, status_matricula, tipo_movimentacao,
            tipo_historico_escolar, observacoes, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        await executeTursoQuery(
          `INSERT OR REPLACE INTO professores (
            id, profile_id, nome_completo, matricula, formacao, disciplinas,
            telefone, email, eh_apoio, ativo, turmas_atribuidas_ids, cpf, rg,
            rg_data_expedicao, graduacao_instituicao, titulacao,
            pos_graduacao_instituicao, graduacao_inicio, graduacao_fim,
            pos_graduacao_inicio, pos_graduacao_fim, endereco_completo,
            nome_mae, nome_pai, telefone_emergencia, telefone_emergencia2,
            contato_emergencia_nome, observacoes, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            p.id,
            p.profile_id || null,
            p.nome_completo,
            p.matricula,
            p.formacao || '',
            JSON.stringify(p.disciplinas || []),
            p.telefone || '',
            p.email || '',
            p.eh_apoio ? 1 : 0,
            p.ativo !== false ? 1 : 0,
            JSON.stringify(p.turmas_atribuidas_ids || []),
            p.cpf || null,
            p.rg || null,
            p.rg_data_expedicao || null,
            p.graduacao_instituicao || null,
            p.titulacao || null,
            p.pos_graduacao_instituicao || null,
            p.graduacao_inicio || null,
            p.graduacao_fim || null,
            p.pos_graduacao_inicio || null,
            p.pos_graduacao_fim || null,
            p.endereco_completo || null,
            p.nome_mae || null,
            p.nome_pai || null,
            p.telefone_emergencia || null,
            p.telefone_emergencia2 || null,
            p.contato_emergencia_nome || null,
            p.observacoes || null,
            p.created_at || new Date().toISOString()
          ]
        );
        return NextResponse.json({ success: true });
      }

      // ----------------------------------------------------
      // FALTAS DE PROFESSORES
      // ----------------------------------------------------
      case 'save_falta': {
        const f = payload;
        await executeTursoQuery(
          `INSERT OR REPLACE INTO faltas_professores (
            id, professor_id, professor_nome, data_falta, aulas_faltadas,
            justificativa, atestado_drive_id, atestado_drive_link,
            homologado, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            f.id,
            f.professor_id,
            f.professor_nome || null,
            f.data_falta,
            f.aulas_faltadas || 1,
            f.justificativa || '',
            f.atestado_drive_id || null,
            f.atestado_drive_link || null,
            f.homologado ? 1 : 0,
            f.created_at || new Date().toISOString()
          ]
        );
        return NextResponse.json({ success: true });
      }

      // ----------------------------------------------------
      // EVENTOS
      // ----------------------------------------------------
      case 'save_evento': {
        const ev = payload;
        await executeTursoQuery(
          `INSERT OR REPLACE INTO eventos (
            id, titulo, descricao, data_inicio, data_fim, categoria, cor,
            publico_alvo, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            ev.id,
            ev.titulo,
            ev.descricao || '',
            ev.data_inicio,
            ev.data_fim,
            ev.categoria || 'cultural',
            ev.cor || '#2563EB',
            ev.publico_alvo || 'Todos',
            ev.created_at || new Date().toISOString()
          ]
        );
        return NextResponse.json({ success: true });
      }

      case 'delete_evento': {
        await executeTursoQuery('DELETE FROM eventos WHERE id = ?', [payload.id]);
        return NextResponse.json({ success: true });
      }

      // ----------------------------------------------------
      // DOCUMENTOS DE ESTUDANTE
      // ----------------------------------------------------
      case 'save_documento': {
        const doc = payload;
        await executeTursoQuery(
          `INSERT OR REPLACE INTO documentos_estudantes (
            id, estudante_id, tipo_documento, nome_arquivo,
            drive_file_id, drive_view_link, tamanho_bytes, mime_type, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
