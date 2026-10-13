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
 * Verifica se um dia da semana da grade coincide com o dia da semana apurado.
 */
export function coincideDiaSemana(diaGrade: string, diaChave: string): boolean {
  if (!diaGrade || !diaChave) return false;
  const gradeNorm = normalizarTexto(diaGrade);
  const chaveNorm = normalizarTexto(diaChave);
  return gradeNorm.startsWith(chaveNorm.slice(0, 3));
}

/**
 * Verifica se o professor é o mesmo pelo ID ou pelo nome completo.
 */
export function coincideProfessor(
  horario: HorarioAula,
  professorId: string,
  professorNome?: string
): boolean {
  if (horario.professor_id && professorId && horario.professor_id === professorId) {
    return true;
  }
  if (professorNome && horario.professor_nome) {
    const nomeH = normalizarTexto(horario.professor_nome);
    const nomeP = normalizarTexto(professorNome);
    if (nomeH === nomeP) return true;
    // Correspondência se nome contiver partes expressivas (mínimo 2 palavras iguais)
    const partesH = nomeH.split(/\s+/).filter(p => p.length > 2);
    const partesP = nomeP.split(/\s+/).filter(p => p.length > 2);
    if (partesH.length >= 2 && partesP.length >= 2) {
      if (partesH[0] === partesP[0] && partesH[partesH.length - 1] === partesP[partesP.length - 1]) {
        return true;
      }
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
  } = params;

  const dataFimEfetiva = (tipoRegistro === 'DATA_UNICA' || !params.dataFim) ? dataInicio : params.dataFim;

  if (!professorId || !dataInicio) {
    return {
      aulasCalculadasSistema: 0,
      resumoFormatado: 'Selecione o docente e a data para apurar a grade horária.',
      diasDetalhados: [],
      totalDiasLetivos: 0,
      totalDiasIntervalo: 0,
    };
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
    };
  }

  // Filtrar turmas ativas
  const turmasAtivas = (turmas || []).filter(t => t.ativa !== false && t.ativa !== 0);

  const diasDetalhados: DetalheDiaCalculo[] = [];
  let somaAulasTotal = 0;
  let totalDiasLetivos = 0;

  // Itera por cada dia do intervalo
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
            coincideProfessor(horario, professorId, professorNome)
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
      descricaoCurta = '0 aulas na grade deste docente';
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

  // Gera o resumo explicativo conforme especificado
  // Exemplo: "Segunda-feira (10/10): 5 aulas | Terça-feira (11/10): 6 aulas → Total sugerido: 11 aulas"
  const diasComAulas = diasDetalhados.filter(d => !d.isFinalDeSemana && !d.isFeriadoOuNaoLetivo);
  let resumoFormatado = '';

  if (diasComAulas.length === 0) {
    if (diasDetalhados.some(d => d.isFinalDeSemana || d.isFeriadoOuNaoLetivo)) {
      resumoFormatado = `Nenhum dia letivo regular no intervalo selecionado (Total sugerido: 0 aulas).`;
    } else {
      resumoFormatado = `Nenhuma aula localizada na grade para este docente no período selecionado (Total sugerido: 0 aulas).`;
    }
  } else {
    const segmentos = diasComAulas.map(d => {
      // Ex: "Segunda-feira (10/10): 5 aulas"
      const diaAbrev = d.dataFormatada.slice(0, 5); // "DD/MM"
      return `${d.diaSemana} (${diaAbrev}): ${d.aulasTotal} aula${d.aulasTotal > 1 ? 's' : ''}`;
    });
    resumoFormatado = `${segmentos.join(' | ')} → Total sugerido: ${somaAulasTotal} aula${somaAulasTotal > 1 ? 's' : ''}`;
  }

  return {
    aulasCalculadasSistema: somaAulasTotal,
    resumoFormatado,
    diasDetalhados,
    totalDiasLetivos,
    totalDiasIntervalo: diasDetalhados.length,
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
          coincideProfessor(h, falta.professor_id, falta.professor_nome)
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

