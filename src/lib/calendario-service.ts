import { executeTursoQuery, checkIsTursoConfigured } from '@/lib/turso';
import { EventoEscolar, RecorrenciaTipo } from '@/lib/types';

/**
 * Garante que as tabelas 'eventos' e 'calendario_eventos' possuam todas as colunas
 * de controle de recorrência no banco de dados Turso (LibSQL/SQLite).
 * Idempotente e auto-recuperável.
 */
export async function garantirSchemaRecorrenciaEventos(): Promise<void> {
  if (!checkIsTursoConfigured()) return;

  try {
    // 1. Garante existência da tabela 'eventos'
    await executeTursoQuery(`
      CREATE TABLE IF NOT EXISTS eventos (
        id TEXT PRIMARY KEY,
        titulo TEXT NOT NULL,
        descricao TEXT,
        data_inicio TEXT NOT NULL,
        data_fim TEXT NOT NULL,
        categoria TEXT NOT NULL,
        cor TEXT DEFAULT '#2563EB',
        publico_alvo TEXT DEFAULT 'Todos',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2. Garante existência da tabela 'calendario_eventos'
    await executeTursoQuery(`
      CREATE TABLE IF NOT EXISTS calendario_eventos (
        id TEXT PRIMARY KEY,
        titulo TEXT NOT NULL,
        descricao TEXT,
        data_inicio TEXT NOT NULL,
        data_fim TEXT NOT NULL,
        categoria TEXT NOT NULL,
        cor TEXT DEFAULT '#2563EB',
        publico_alvo TEXT DEFAULT 'Todos',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 3. Verifica e adiciona colunas em 'eventos'
    const infoEventos = await executeTursoQuery('PRAGMA table_info(eventos)');
    const colunasEventos = (infoEventos.rows || []).map((r: any) => r.name);

    if (!colunasEventos.includes('categoria_id')) {
      await executeTursoQuery('ALTER TABLE eventos ADD COLUMN categoria_id TEXT');
    }
    if (!colunasEventos.includes('cor_hex')) {
      await executeTursoQuery('ALTER TABLE eventos ADD COLUMN cor_hex TEXT');
    }
    if (!colunasEventos.includes('criado_por_usuario_id')) {
      await executeTursoQuery('ALTER TABLE eventos ADD COLUMN criado_por_usuario_id TEXT');
    }
    if (!colunasEventos.includes('recorrencia_tipo')) {
      await executeTursoQuery(
        "ALTER TABLE eventos ADD COLUMN recorrencia_tipo TEXT DEFAULT 'NENHUMA' CHECK(recorrencia_tipo IN ('NENHUMA', 'ANUAL', 'MENSAL'))"
      );
    }
    if (!colunasEventos.includes('recorrencia_dia')) {
      await executeTursoQuery('ALTER TABLE eventos ADD COLUMN recorrencia_dia INTEGER');
    }
    if (!colunasEventos.includes('recorrencia_mes')) {
      await executeTursoQuery('ALTER TABLE eventos ADD COLUMN recorrencia_mes INTEGER');
    }
    if (!colunasEventos.includes('recorrencia_ativa')) {
      await executeTursoQuery('ALTER TABLE eventos ADD COLUMN recorrencia_ativa INTEGER DEFAULT 0');
    }
    if (!colunasEventos.includes('recorrencia_data_limite')) {
      await executeTursoQuery('ALTER TABLE eventos ADD COLUMN recorrencia_data_limite TEXT');
    }

    // 4. Verifica e adiciona colunas em 'calendario_eventos'
    const infoCal = await executeTursoQuery('PRAGMA table_info(calendario_eventos)');
    const colunasCal = (infoCal.rows || []).map((r: any) => r.name);

    if (!colunasCal.includes('categoria_id')) {
      await executeTursoQuery('ALTER TABLE calendario_eventos ADD COLUMN categoria_id TEXT');
    }
    if (!colunasCal.includes('cor_hex')) {
      await executeTursoQuery('ALTER TABLE calendario_eventos ADD COLUMN cor_hex TEXT');
    }
    if (!colunasCal.includes('criado_por_usuario_id')) {
      await executeTursoQuery('ALTER TABLE calendario_eventos ADD COLUMN criado_por_usuario_id TEXT');
    }
    if (!colunasCal.includes('recorrencia_tipo')) {
      await executeTursoQuery(
        "ALTER TABLE calendario_eventos ADD COLUMN recorrencia_tipo TEXT DEFAULT 'NENHUMA' CHECK(recorrencia_tipo IN ('NENHUMA', 'ANUAL', 'MENSAL'))"
      );
    }
    if (!colunasCal.includes('recorrencia_dia')) {
      await executeTursoQuery('ALTER TABLE calendario_eventos ADD COLUMN recorrencia_dia INTEGER');
    }
    if (!colunasCal.includes('recorrencia_mes')) {
      await executeTursoQuery('ALTER TABLE calendario_eventos ADD COLUMN recorrencia_mes INTEGER');
    }
    if (!colunasCal.includes('recorrencia_ativa')) {
      await executeTursoQuery('ALTER TABLE calendario_eventos ADD COLUMN recorrencia_ativa INTEGER DEFAULT 0');
    }
    if (!colunasCal.includes('recorrencia_data_limite')) {
      await executeTursoQuery('ALTER TABLE calendario_eventos ADD COLUMN recorrencia_data_limite TEXT');
    }

    // 5. Garante sincronia bidirecional de dados entre eventos e calendario_eventos
    try {
      await executeTursoQuery(`
        INSERT OR IGNORE INTO calendario_eventos (
          id, titulo, descricao, data_inicio, data_fim, categoria, categoria_id,
          cor, cor_hex, publico_alvo, recorrencia_tipo, recorrencia_dia, recorrencia_mes,
          recorrencia_ativa, recorrencia_data_limite, criado_por_usuario_id, created_at
        )
        SELECT 
          id, titulo, descricao, data_inicio, data_fim, categoria, COALESCE(categoria_id, categoria),
          cor, COALESCE(cor_hex, cor), publico_alvo, recorrencia_tipo, recorrencia_dia, recorrencia_mes,
          recorrencia_ativa, recorrencia_data_limite, criado_por_usuario_id, created_at
        FROM eventos
      `);
    } catch {}
  } catch (err) {
    console.error('Erro ao verificar/migrar schema de recorrência de eventos:', err);
  }
}

/**
 * Validação rigorosa dos parâmetros de recorrência de um evento.
 */
export function validarParametrosRecorrencia(ev: Partial<EventoEscolar>): { valido: boolean; erro?: string } {
  const tipo = ev.recorrencia_tipo || 'NENHUMA';

  if (!['NENHUMA', 'ANUAL', 'MENSAL'].includes(tipo)) {
    return { valido: false, erro: "Tipo de recorrência inválido. Valores aceitos: 'NENHUMA', 'ANUAL', 'MENSAL'." };
  }

  if (tipo !== 'NENHUMA') {
    if (ev.recorrencia_dia != null) {
      const dia = Number(ev.recorrencia_dia);
      if (isNaN(dia) || dia < 1 || dia > 31) {
        return { valido: false, erro: 'O dia da recorrência deve ser um número inteiro entre 1 e 31.' };
      }
    }

    if (tipo === 'ANUAL' && ev.recorrencia_mes != null) {
      const mes = Number(ev.recorrencia_mes);
      if (isNaN(mes) || mes < 1 || mes > 12) {
        return { valido: false, erro: 'O mês da recorrência anual deve ser um número inteiro entre 1 e 12.' };
      }
    }

    if (ev.recorrencia_data_limite) {
      const limite = new Date(ev.recorrencia_data_limite);
      if (isNaN(limite.getTime())) {
        return { valido: false, erro: 'A data limite de recorrência deve ser uma data válida.' };
      }
    }
  }

  return { valido: true };
}

/**
 * Converte valor boolean ou numérico para boolean estrito.
 */
export function toBooleanStrict(val: any, defaultVal = false): boolean {
  if (val === null || val === undefined) return defaultVal;
  if (val === true || val === 1 || val === '1' || val === 'true') return true;
  if (val === false || val === 0 || val === '0' || val === 'false') return false;
  return Boolean(val);
}

/**
 * Extrai o primeiro e segundo nome de uma pessoa.
 * Se o segundo termo for uma preposição comum ("de", "da", "do", "dos", "das", "d'"),
 * agrega a preposição e o termo seguinte para formar um nome composto natural
 * (ex.: "Alexandre de Jesus", "Maria do Socorro").
 */
export function extrairPrimeiroESegundoNome(nomeCompleto?: string | null): string {
  if (!nomeCompleto) return 'Funcionário';
  const partes = nomeCompleto.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return 'Funcionário';
  if (partes.length === 1) return partes[0];

  const preposicoes = new Set(['de', 'da', 'do', 'dos', 'das', "d'"]);
  if (preposicoes.has(partes[1].toLowerCase()) && partes.length >= 3) {
    return `${partes[0]} ${partes[1]} ${partes[2]}`;
  }

  return `${partes[0]} ${partes[1]}`;
}

/**
 * Analisa e extrai ano, mês e dia de uma data de nascimento com tolerância a múltiplos formatos.
 * Aceita ISO (YYYY-MM-DD...), brasileiro (DD/MM/YYYY ou DD-MM-YYYY) e variações.
 */
export function parseDataNascimento(dataStr?: string | null): { dia: number; mes: number; ano: number } | null {
  if (!dataStr || typeof dataStr !== 'string') return null;
  const str = dataStr.trim();
  if (!str) return null;

  let ano = 0;
  let mes = 0;
  let dia = 0;

  if (str.includes('T')) {
    const [datePart] = str.split('T');
    const parts = datePart.split('-').map(Number);
    ano = parts[0];
    mes = parts[1];
    dia = parts[2];
  } else if (str.includes('-')) {
    const parts = str.split('-').map(Number);
    if (parts[0] > 1000) {
      ano = parts[0];
      mes = parts[1];
      dia = parts[2];
    } else {
      dia = parts[0];
      mes = parts[1];
      ano = parts[2];
    }
  } else if (str.includes('/')) {
    const parts = str.split('/').map(Number);
    if (parts[2] > 1000) {
      dia = parts[0];
      mes = parts[1];
      ano = parts[2];
    } else {
      ano = parts[0];
      mes = parts[1];
      dia = parts[2];
    }
  }

  if (!ano || !mes || !dia || isNaN(ano) || isNaN(mes) || isNaN(dia)) return null;
  if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return null;

  return { dia, mes, ano };
}
