import { Turma, HorarioAula, EventoEscolar, TipoRegistroAusencia, FaltaProfessor, Professor } from '@/lib/types';

export interface TurmaImpactadaDia {
  turmaId: string;
  turmaNome: string;
  turno: string;
  quantidadeAulas: number;
  disciplina?: string;
}

export interface AusenciaVigenteHoje {
  falta: FaltaProfessor;
  dataInicio: string;
  dataFim: string;
  dataFormatada: string;
  diasRestantes: number;
  encerraHoje: boolean;
  dataRetorno: string;
  turmasImpactadas: TurmaImpactadaDia[];
  totalAulasSemProfessorHoje: number;
  professorMatricula?: string;
  professorDisciplinas?: string[];
}

export interface DetalheDiaCalculo {
  data: string; // YYYY-MM-DD
  dataFormatada: string; // DD/MM/YYYY
  diaSemana: string; // 'Segunda-feira', 'Terça-feira', etc.
  diaSemanaChave: 'Segunda' | 'Terça' | 'Quarta' | 'Quinta' | 'Sexta' | 'Outro';
  isFinalDeSemana: boolean;
  isFeriadoOuNaoLetivo: boolean;
  motivoNaoLetivo?: string;
  aulasTotal: number;
  turmasDetalhadas: {
    turmaId: string;
    turmaNome: string;
    quantidadeAulas: number;
    disciplina?: string;
  }[];
  descricaoCurta: string; // Ex: "5 aulas (2 no 6ºA, 3 no 7ºB)"
}

export interface ResultadoCalculoAulas {
  aulasCalculadasSistema: number;
  resumoFormatado: string;
  diasDetalhados: DetalheDiaCalculo[];
  totalDiasLetivos: number;
  totalDiasIntervalo: number;
  totalAulasSemanaDocente?: number;
  resumoSemanalDocente?: string;
  diasSemanaComAulasDocente?: string[];
}

const DIAS_SEMANA_MAP: Record<number, { nome: string; chave: 'Segunda' | 'Terça' | 'Quarta' | 'Quinta' | 'Sexta' | 'Outro' }> = {
  0: { nome: 'Domingo', chave: 'Outro' },
  1: { nome: 'Segunda-feira', chave: 'Segunda' },
  2: { nome: 'Terça-feira', chave: 'Terça' },
  3: { nome: 'Quarta-feira', chave: 'Quarta' },
  4: { nome: 'Quinta-feira', chave: 'Quinta' },
  5: { nome: 'Sexta-feira', chave: 'Sexta' },
  6: { nome: 'Sábado', chave: 'Outro' },
};

/**
 * Converte string 'YYYY-MM-DD' em objeto Date no fuso horário local sem deslocamento UTC.
 */
export function parseDataLocal(dataStr: string): Date {
  if (!dataStr) return new Date();
  const partes = dataStr.split('T')[0].split('-').map(Number);
  if (partes.length < 3 || isNaN(partes[0]) || isNaN(partes[1]) || isNaN(partes[2])) {
    return new Date();
  }
  return new Date(partes[0], partes[1] - 1, partes[2]);
}

/**
 * Formata Date em 'YYYY-MM-DD' local.
 */
export function formatDataIsoLocal(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Formata Date em 'DD/MM/YYYY'.
 */
export function formatDataBr(date: Date): string {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

/**
 * Normaliza strings para comparações insensíveis a acentos e maiúsculas/minúsculas.
 */
export function normalizarTexto(texto?: string): string {
  if (!texto) return '';
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

/**
 * Limpa strings removendo acentos, caracteres de mojibake/substituição ('?', '\uFFFD')
 * e caracteres não alfanuméricos para permitir correspondência fonética e estrutural tolerante.
 */
export function limparTextoParaComparacao(texto?: string): string {
  if (!texto) return '';
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\uFFFD\?\"\'\`´\^~_\-%]/g, '')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * Calcula a distância de Levenshtein entre duas strings curtas (tokens).
 */
export function distanciaLevenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[m][n];
}

/**
 * Avalia se dois tokens de nome coincidem, considerando variações de acentuação e mojibake.
 * Ex: "digenes" ~ "diogenes", "joo" ~ "joao", "kssia" ~ "kassia", "concei" ~ "conceicao".
 */
export function tokensDeNomeCoincidem(t1: string, t2: string): boolean {
  if (t1 === t2) return true;
  if (t1.length >= 3 && t2.length >= 3) {
    if (t1.startsWith(t2) || t2.startsWith(t1)) return true;
  }
  const maxLen = Math.max(t1.length, t2.length);
  if (maxLen <= 2) return false;
  const dist = distanciaLevenshtein(t1, t2);
  if (dist <= 1) return true;
  if (maxLen >= 6 && dist <= 2) return true;
  return false;
}

/**
 * Compara dois nomes completos de docentes com tolerância a acentos, pontuação e encoding.
 */
export function nomesDocentesCoincidem(nomeGrade?: string, nomeDocente?: string): boolean {
  if (!nomeGrade || !nomeDocente) return false;
  if (nomeGrade.trim().toLowerCase() === nomeDocente.trim().toLowerCase()) return true;

  const limpoG = limparTextoParaComparacao(nomeGrade);
  const limpoD = limparTextoParaComparacao(nomeDocente);
  if (limpoG === limpoD) return true;

  const stopWords = new Set(['da', 'de', 'do', 'dos', 'das', 'e']);
  const partesG = limpoG.split(' ').filter(p => p.length >= 2 && !stopWords.has(p));
  const partesD = limpoD.split(' ').filter(p => p.length >= 2 && !stopWords.has(p));

  if (partesG.length === 0 || partesD.length === 0) return false;

  // Primeiro token do nome deve coincidir (ex: "Alexandre", "Maria", "João", "Diógenes")
  if (!tokensDeNomeCoincidem(partesG[0], partesD[0])) {
    return false;
  }

  // Se ambos têm só 1 token significativo e coincidem
  if (partesG.length === 1 && partesD.length === 1) return true;

  // Conta quantos tokens coincidem ao longo do nome completo
  let matches = 0;
  for (const tg of partesG) {
    if (partesD.some(td => tokensDeNomeCoincidem(tg, td))) {
      matches++;
    }
  }

  // Exige no mínimo 2 tokens coincidentes (ou todos caso o nome tenha menos que 2)
  const minExigido = Math.min(2, partesG.length, partesD.length);
  return matches >= minExigido;
}

/**
 * Converte qualquer representação de dia da semana em índice numérico canônico:
 * 0 = Domingo, 1 = Segunda, 2 = Terça, 3 = Quarta, 4 = Quinta, 5 = Sexta, 6 = Sábado.
 */
export function extrairDiaSemanaIndice(diaStr?: string): number | null {
  if (!diaStr) return null;
  const limpo = limparTextoParaComparacao(diaStr);

  if (limpo.startsWith('seg')) return 1;
  if (limpo.startsWith('ter') || limpo.startsWith('ter')) return 2;
  if (limpo.startsWith('qua')) return 3;
  if (limpo.startsWith('qui')) return 4;
  if (limpo.startsWith('sex')) return 5;
  if (limpo.startsWith('sab') || limpo.startsWith('sbado')) return 6;
  if (limpo.startsWith('dom')) return 0;
  return null;
}

/**
 * Verifica se um dia da semana da grade coincide com o dia da semana apurado.
 */
export function coincideDiaSemana(diaGrade: string, diaChave: string): boolean {
  if (!diaGrade || !diaChave) return false;
  const idxGrade = extrairDiaSemanaIndice(diaGrade);
  const idxChave = extrairDiaSemanaIndice(diaChave);
  if (idxGrade !== null && idxChave !== null) {
    return idxGrade === idxChave;
  }
  const gradeNorm = normalizarTexto(diaGrade);
  const chaveNorm = normalizarTexto(diaChave);
  return gradeNorm.slice(0, 3) === chaveNorm.slice(0, 3);
}

/**
 * Verifica se o professor é o mesmo pelo ID ou pelo nome completo.
 */
export function coincideProfessor(
  horario: HorarioAula | { professor_id?: string; professor_nome?: string },
  professorId: string,
  professorNome?: string,
  professores?: Professor[]
): boolean {
  if (!horario) return false;

  // 1. Coincidência direta por ID se ambos existirem
  if (horario.professor_id && professorId) {
    if (String(horario.professor_id).trim() === String(professorId).trim()) {
      return true;
    }
  }

  // Se professorNome não foi informado, tenta resolver o nome a partir do ID na lista de docentes
  let nomeReferencia = professorNome;
  if (!nomeReferencia && professorId && professores && professores.length > 0) {
    const p = professores.find(prof => prof.id === professorId);
    if (p?.nome_completo) {
      nomeReferencia = p.nome_completo;
    }
  }

  // 2. Coincidência por Nome (com tolerância a mojibake, diacríticos e acentuação)
  if (horario.professor_nome && nomeReferencia) {
    if (nomesDocentesCoincidem(horario.professor_nome, nomeReferencia)) {
      return true;
    }
  }

  return false;
}

/**
 * Verifica se a data coincide com algum feriado / recesso escolar cadastrado no sistema.
 */
function verificarFeriadoOuNaoLetivo(
  dataIso: string,
  eventos: EventoEscolar[] = []
): { isNaoLetivo: boolean; motivo?: string } {
  for (const ev of eventos) {
    const inicioIso = ev.data_inicio ? ev.data_inicio.split('T')[0] : '';
    const fimIso = ev.data_fim ? ev.data_fim.split('T')[0] : inicioIso;

    let ocorre = Boolean(inicioIso && dataIso >= inicioIso && dataIso <= fimIso);

    // Suporte a recorrência anual
    if (!ocorre && ev.recorrencia_ativa && ev.recorrencia_tipo === 'ANUAL' && dataIso >= inicioIso) {
      if (!ev.recorrencia_data_limite || dataIso <= ev.recorrencia_data_limite.split('T')[0]) {
        const [dMes, dDia] = dataIso.split('-').slice(1).map(Number);
        const [iAno, iMes, iDia] = inicioIso.split('-').map(Number);
        const [fAno, fMes, fDia] = fimIso.split('-').map(Number);
        const dtI = new Date(iAno, iMes - 1, iDia);
        const dtF = new Date(fAno, fMes - 1, fDia);
        const diffDias = Math.max(0, Math.round((dtF.getTime() - dtI.getTime()) / (1000 * 60 * 60 * 24)));
        const baseMes = ev.recorrencia_mes != null ? Number(ev.recorrencia_mes) : iMes;
        const baseDia = ev.recorrencia_dia != null ? Number(ev.recorrencia_dia) : iDia;

        if (dMes === baseMes && dDia >= baseDia && dDia <= baseDia + diffDias) {
          ocorre = true;
        }
      }
    }

    if (ocorre) {
      const cat = normalizarTexto(ev.categoria);
      const tit = normalizarTexto(ev.titulo);
      const isFeriado =
        cat.includes('feriado') ||
        cat.includes('recesso') ||
        cat.includes('nao letivo') ||
        cat.includes('sem aula') ||
        tit.includes('feriado') ||
        tit.includes('recesso') ||
        tit.includes('nao letivo') ||
        tit.includes('ponto facultativo');

      if (isFeriado) {
        return { isNaoLetivo: true, motivo: ev.titulo };
      }
    }
  }
  return { isNaoLetivo: false };
}

export interface CalcularAulasParams {
  professorId: string;
  professorNome?: string;
  tipoRegistro: TipoRegistroAusencia;
  dataInicio: string; // YYYY-MM-DD
  dataFim?: string;    // YYYY-MM-DD (para DATA_UNICA pode ser omitido ou igual a dataInicio)
  turmas: Turma[];
  eventos?: EventoEscolar[];
  professores?: Professor[];
}

/**
 * Calcula automaticamente o total de aulas devidas por um docente para uma data ou intervalo,
 * consultando a grade horária ativa de todas as turmas ativas.
 */
export function calcularAulasDevidasGrade(params: CalcularAulasParams): ResultadoCalculoAulas {
  const {
    professorId,
    professorNome,
    tipoRegistro,
    dataInicio,
    turmas,
    eventos = [],
    professores = [],
  } = params;

  const dataFimEfetiva = (tipoRegistro === 'DATA_UNICA' || !params.dataFim) ? dataInicio : params.dataFim;

  if (!professorId || !dataInicio) {
    return {
      aulasCalculadasSistema: 0,
      resumoFormatado: 'Selecione o docente e a data para apurar a grade horária.',
      diasDetalhados: [],
      totalDiasLetivos: 0,
      totalDiasIntervalo: 0,
      totalAulasSemanaDocente: 0,
      resumoSemanalDocente: 'Sem docente selecionado',
      diasSemanaComAulasDocente: [],
    };
  }

  // Tenta resolver o nome completo do docente caso não venha no parâmetro
  let nomeReferencia = professorNome;
  if (!nomeReferencia && professores.length > 0) {
    const prof = professores.find(p => p.id === professorId);
    if (prof?.nome_completo) {
      nomeReferencia = prof.nome_completo;
    }
  }

  const dtIni = parseDataLocal(dataInicio);
  const dtFim = parseDataLocal(dataFimEfetiva);

  // Validação: dataFim >= dataInicio
  if (dtFim.getTime() < dtIni.getTime()) {
    return {
      aulasCalculadasSistema: 0,
      resumoFormatado: 'A data de término não pode ser anterior à data de início.',
      diasDetalhados: [],
      totalDiasLetivos: 0,
      totalDiasIntervalo: 0,
      totalAulasSemanaDocente: 0,
      resumoSemanalDocente: 'Intervalo inválido',
      diasSemanaComAulasDocente: [],
    };
  }

  // Filtrar turmas ativas
  const turmasAtivas = (turmas || []).filter(
    t => t.ativa !== false && (t.ativa as any) !== 0 && (t.ativa as any) !== '0'
  );

  // 1. Mapeamento completo do quadro semanal do docente em todas as turmas ativas
  const aulasPorDiaSemanaDocente: Record<number, { nome: string; chave: string; totalAulas: number }> = {
    1: { nome: 'Segunda-feira', chave: 'Segunda', totalAulas: 0 },
    2: { nome: 'Terça-feira', chave: 'Terça', totalAulas: 0 },
    3: { nome: 'Quarta-feira', chave: 'Quarta', totalAulas: 0 },
    4: { nome: 'Quinta-feira', chave: 'Quinta', totalAulas: 0 },
    5: { nome: 'Sexta-feira', chave: 'Sexta', totalAulas: 0 },
  };

  let totalAulasSemanaDocente = 0;

  for (const turma of turmasAtivas) {
    const grade = turma.grade_horaria || [];
    for (const horario of grade) {
      if (coincideProfessor(horario, professorId, nomeReferencia, professores)) {
        const diaIdx = extrairDiaSemanaIndice(horario.dia_semana);
        const qtd = Number(horario.quantidade_aulas) || 1;
        if (diaIdx !== null && aulasPorDiaSemanaDocente[diaIdx]) {
          aulasPorDiaSemanaDocente[diaIdx].totalAulas += qtd;
          totalAulasSemanaDocente += qtd;
        }
      }
    }
  }

  const diasComAulasNaSemana = Object.values(aulasPorDiaSemanaDocente).filter(d => d.totalAulas > 0);
  const diasSemanaComAulasDocente = diasComAulasNaSemana.map(d => d.chave);

  let resumoSemanalDocente = '';
  if (totalAulasSemanaDocente > 0) {
    const segmentosSemana = diasComAulasNaSemana.map(d => `${d.chave.slice(0, 3)}: ${d.totalAulas}h`).join(' | ');
    resumoSemanalDocente = `${totalAulasSemanaDocente} aulas/semana (${segmentosSemana})`;
  } else {
    resumoSemanalDocente = 'Sem aulas cadastradas na grade horária ativa';
  }

  // 2. Itera por cada dia do intervalo solicitado
  const diasDetalhados: DetalheDiaCalculo[] = [];
  let somaAulasTotal = 0;
  let totalDiasLetivos = 0;

  const cursor = new Date(dtIni.getFullYear(), dtIni.getMonth(), dtIni.getDate());
  const limite = new Date(dtFim.getFullYear(), dtFim.getMonth(), dtFim.getDate());

  while (cursor.getTime() <= limite.getTime()) {
    const dataIso = formatDataIsoLocal(cursor);
    const dataFormatada = formatDataBr(cursor);
    const dayOfWeek = cursor.getDay();
    const diaInfo = DIAS_SEMANA_MAP[dayOfWeek] || { nome: 'Dia', chave: 'Outro' };
    const isFinalDeSemana = dayOfWeek === 0 || dayOfWeek === 6;

    // Checagem de feriado/não letivo
    const feriadoCheck = verificarFeriadoOuNaoLetivo(dataIso, eventos);

    let aulasDoDia = 0;
    const turmasDetalhadas: DetalheDiaCalculo['turmasDetalhadas'] = [];

    if (!isFinalDeSemana && !feriadoCheck.isNaoLetivo) {
      totalDiasLetivos++;

      // Varre todas as turmas ativas e suas grades
      for (const turma of turmasAtivas) {
        const grade = turma.grade_horaria || [];
        for (const horario of grade) {
          if (
            coincideDiaSemana(horario.dia_semana, diaInfo.chave) &&
            coincideProfessor(horario, professorId, nomeReferencia, professores)
          ) {
            const qtd = Number(horario.quantidade_aulas) || 1;
            aulasDoDia += qtd;
            turmasDetalhadas.push({
              turmaId: turma.id,
              turmaNome: turma.nome,
              quantidadeAulas: qtd,
              disciplina: horario.disciplina,
            });
          }
        }
      }

      somaAulasTotal += aulasDoDia;
    }

    // Descrição textual do dia
    let descricaoCurta = '';
    if (isFinalDeSemana) {
      descricaoCurta = 'Final de semana (sem aulas regulares)';
    } else if (feriadoCheck.isNaoLetivo) {
      descricaoCurta = `Dia não letivo / feriado: ${feriadoCheck.motivo || 'Sem expediente'}`;
    } else if (aulasDoDia === 0) {
      if (diasSemanaComAulasDocente.length > 0) {
        descricaoCurta = `0 aulas na grade (docente leciona às ${diasSemanaComAulasDocente.join(', ')})`;
      } else {
        descricaoCurta = '0 aulas na grade deste docente';
      }
    } else {
      const partesTurmas = turmasDetalhadas.map(
        t => `${t.quantidadeAulas} no ${t.turmaNome}${t.disciplina ? ` (${t.disciplina})` : ''}`
      );
      descricaoCurta = `${aulasDoDia} aula(s)${partesTurmas.length > 0 ? ` (${partesTurmas.join(', ')})` : ''}`;
    }

    diasDetalhados.push({
      data: dataIso,
      dataFormatada,
      diaSemana: diaInfo.nome,
      diaSemanaChave: diaInfo.chave,
      isFinalDeSemana,
      isFeriadoOuNaoLetivo: feriadoCheck.isNaoLetivo,
      motivoNaoLetivo: feriadoCheck.motivo,
      aulasTotal: aulasDoDia,
      turmasDetalhadas,
      descricaoCurta,
    });

    // Avança 1 dia
    cursor.setDate(cursor.getDate() + 1);
  }

  // 3. Gera o resumo explicativo transparente e contextualizado
  const diasComAulas = diasDetalhados.filter(d => !d.isFinalDeSemana && !d.isFeriadoOuNaoLetivo);
  let resumoFormatado = '';

  if (diasComAulas.length === 0) {
    if (diasDetalhados.some(d => d.isFinalDeSemana || d.isFeriadoOuNaoLetivo)) {
      resumoFormatado = `Nenhum dia letivo regular no intervalo selecionado (Total sugerido: 0 aulas).`;
    } else {
      resumoFormatado = `Nenhuma aula localizada na grade para este docente no período selecionado (Total sugerido: 0 aulas).`;
    }
  } else if (somaAulasTotal === 0) {
    // Dias letivos selecionados, porém o docente não possui aulas neles
    if (totalAulasSemanaDocente === 0) {
      resumoFormatado = `Docente sem aulas cadastradas na grade horária ativa (Total sugerido: 0 aulas).`;
    } else if (diasDetalhados.length === 1) {
      const diaUnico = diasDetalhados[0];
      const diasLeciona = diasSemanaComAulasDocente.length > 0 ? ` (o docente leciona às ${diasSemanaComAulasDocente.join(', ')})` : '';
      resumoFormatado = `${diaUnico.diaSemana} (${diaUnico.dataFormatada}): Nenhuma aula prevista na grade nesta data${diasLeciona} → Total sugerido: 0 aulas.`;
    } else {
      const diasLeciona = diasSemanaComAulasDocente.length > 0 ? ` (o docente leciona às ${diasSemanaComAulasDocente.join(', ')})` : '';
      resumoFormatado = `Nenhuma aula prevista na grade para as datas selecionadas${diasLeciona} → Total sugerido: 0 aulas.`;
    }
  } else {
    // Há aulas calculadas (> 0)
    if (diasDetalhados.length === 1) {
      const d = diasDetalhados[0];
      const diaAbrev = d.dataFormatada.slice(0, 5); // "DD/MM"
      const partesTurmas = d.turmasDetalhadas.map(t => `${t.quantidadeAulas} no ${t.turmaNome}`).join(', ');
      resumoFormatado = `${d.diaSemana} (${diaAbrev}): ${somaAulasTotal} aula${somaAulasTotal > 1 ? 's' : ''}${partesTurmas ? ` (${partesTurmas})` : ''} → Total sugerido: ${somaAulasTotal} aula${somaAulasTotal > 1 ? 's' : ''}.`;
    } else {
      const segmentos = diasComAulas.map(d => {
        const diaAbrev = d.dataFormatada.slice(0, 5); // "DD/MM"
        return `${d.diaSemana} (${diaAbrev}): ${d.aulasTotal} aula${d.aulasTotal > 1 ? 's' : ''}`;
      });
      resumoFormatado = `${segmentos.join(' | ')} → Total sugerido: ${somaAulasTotal} aula${somaAulasTotal > 1 ? 's' : ''}.`;
    }
  }

  return {
    aulasCalculadasSistema: somaAulasTotal,
    resumoFormatado,
    diasDetalhados,
    totalDiasLetivos,
    totalDiasIntervalo: diasDetalhados.length,
    totalAulasSemanaDocente,
    resumoSemanalDocente,
    diasSemanaComAulasDocente,
  };
}

/**
 * Localiza todas as ausências ativas/vigentes na data de referência (hoje)
 * Regra: dataReferencia >= data_inicio AND dataReferencia <= data_fim
 * E cruza com a grade horária das turmas para apurar turmas desassistidas no dia.
 */
export function calcularAusenciasVigentesHoje(
  faltas: FaltaProfessor[],
  turmas: Turma[],
  professores?: Professor[],
  dataReferencia: Date = new Date()
): AusenciaVigenteHoje[] {
  const anoRef = dataReferencia.getFullYear();
  const mesRef = dataReferencia.getMonth() + 1;
  const diaRef = dataReferencia.getDate();
  const hojeIso = `${anoRef}-${String(mesRef).padStart(2, '0')}-${String(diaRef).padStart(2, '0')}`;
  const diaSemanaChave = DIAS_SEMANA_MAP[dataReferencia.getDay()]?.chave || 'Outro';

  const formatDataPtBr = (iso: string) => {
    const partes = iso.split('-');
    if (partes.length < 3) return iso;
    return `${partes[2].padStart(2, '0')}/${partes[1].padStart(2, '0')}/${partes[0]}`;
  };

  const ausenciasAtivas: AusenciaVigenteHoje[] = [];

  for (const falta of faltas) {
    if ((falta as any).deleted_at) continue;

    const dataInicioRaw = (falta.data_inicio || falta.data_falta || '').split('T')[0];
    const dataFimRaw = (falta.data_fim || falta.data_inicio || falta.data_falta || '').split('T')[0];
    if (!dataInicioRaw) continue;

    const dataInicio = dataInicioRaw;
    const dataFim = dataFimRaw || dataInicio;

    // Critério: CURRENT_DATE >= data_inicio AND CURRENT_DATE <= data_fim
    if (hojeIso < dataInicio || hojeIso > dataFim) {
      continue;
    }

    const [anoF, mesF, diaF] = dataFim.split('-').map(Number);
    const [anoH, mesH, diaH] = hojeIso.split('-').map(Number);
    const fimUtc = Date.UTC(anoF, mesF - 1, diaF);
    const hojeUtc = Date.UTC(anoH, mesH - 1, diaH);
    const diasRestantes = Math.max(0, Math.round((fimUtc - hojeUtc) / (1000 * 60 * 60 * 24)));

    const dtRetorno = new Date(anoF, mesF - 1, diaF + 1);
    const dataRetorno = `${String(dtRetorno.getDate()).padStart(2, '0')}/${String(dtRetorno.getMonth() + 1).padStart(2, '0')}`;

    const dataFormatada = dataInicio === dataFim
      ? formatDataPtBr(dataInicio)
      : `${formatDataPtBr(dataInicio)} a ${formatDataPtBr(dataFim)}`;

    const prof = professores?.find(p => p.id === falta.professor_id || p.nome_completo === falta.professor_nome);

    // Mapeamento de turmas impactadas hoje pela grade horária
    const turmasMap = new Map<string, TurmaImpactadaDia>();
    const turmasAtivas = (turmas || []).filter(t => t.ativa !== false && (t.ativa as any) !== 0 && (t.ativa as any) !== '0');

    for (const t of turmasAtivas) {
      const grade = t.grade_horaria || [];
      for (const h of grade) {
        if (
          coincideDiaSemana(h.dia_semana, diaSemanaChave) &&
          coincideProfessor(h, falta.professor_id, falta.professor_nome, professores)
        ) {
          const qtd = Number(h.quantidade_aulas) || 1;
          const exist = turmasMap.get(t.id);
          if (exist) {
            exist.quantidadeAulas += qtd;
          } else {
            turmasMap.set(t.id, {
              turmaId: t.id,
              turmaNome: t.nome,
              turno: t.turno,
              quantidadeAulas: qtd,
              disciplina: h.disciplina,
            });
          }
        }
      }
    }

    const turmasImpactadas = Array.from(turmasMap.values());
    const totalAulasSemProfessorHoje = turmasImpactadas.reduce((acc, curr) => acc + curr.quantidadeAulas, 0);

    ausenciasAtivas.push({
      falta,
      dataInicio,
      dataFim,
      dataFormatada,
      diasRestantes,
      encerraHoje: diasRestantes === 0,
      dataRetorno,
      turmasImpactadas,
      totalAulasSemProfessorHoje,
      professorMatricula: prof?.matricula,
      professorDisciplinas: prof?.disciplinas,
    });
  }

  return ausenciasAtivas.sort((a, b) => b.dataInicio.localeCompare(a.dataInicio));
}

