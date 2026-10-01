/**
 * Regras Oficiais de Faixa Etária e Distorção Idade-Série
 * Data de Corte Oficial (MEC): 31 de Março do Ano Letivo
 */

export interface RegraFaixaEtaria {
  etapa: 'Educação Infantil' | 'Fundamental (Anos Iniciais)' | 'Fundamental (Anos Finais)' | 'Ensino Médio';
  serie: string;
  idadeRegularMin: number;
  idadeRegularMax: number;
  descricaoRegra: string;
}

/**
 * 1. Tabela de Referência Oficial de Faixa Etária por Série/Ano
 */
export const TABELA_REFERENCIA_FAIXA_ETARIA: RegraFaixaEtaria[] = [
  // Educação Infantil
  {
    etapa: 'Educação Infantil',
    serie: 'Berçário I',
    idadeRegularMin: 0,
    idadeRegularMax: 1,
    descricaoRegra: 'Até 1 ano completo',
  },
  {
    etapa: 'Educação Infantil',
    serie: 'Berçário II',
    idadeRegularMin: 1,
    idadeRegularMax: 2,
    descricaoRegra: '1 a 2 anos',
  },
  {
    etapa: 'Educação Infantil',
    serie: 'Maternal I',
    idadeRegularMin: 2,
    idadeRegularMax: 3,
    descricaoRegra: '2 a 3 anos',
  },
  {
    etapa: 'Educação Infantil',
    serie: 'Maternal II',
    idadeRegularMin: 3,
    idadeRegularMax: 4,
    descricaoRegra: '3 a 4 anos',
  },
  {
    etapa: 'Educação Infantil',
    serie: 'Pré-Escola I (Pré I)',
    idadeRegularMin: 4,
    idadeRegularMax: 4,
    descricaoRegra: '4 anos completos até 31/03',
  },
  {
    etapa: 'Educação Infantil',
    serie: 'Pré-Escola II (Pré II)',
    idadeRegularMin: 5,
    idadeRegularMax: 5,
    descricaoRegra: '5 anos completos até 31/03',
  },

  // Ensino Fundamental - Anos Iniciais
  {
    etapa: 'Fundamental (Anos Iniciais)',
    serie: '1º Ano',
    idadeRegularMin: 6,
    idadeRegularMax: 6,
    descricaoRegra: '6 anos completos até 31/03',
  },
  {
    etapa: 'Fundamental (Anos Iniciais)',
    serie: '2º Ano',
    idadeRegularMin: 7,
    idadeRegularMax: 7,
    descricaoRegra: '7 anos',
  },
  {
    etapa: 'Fundamental (Anos Iniciais)',
    serie: '3º Ano',
    idadeRegularMin: 8,
    idadeRegularMax: 8,
    descricaoRegra: '8 anos',
  },
  {
    etapa: 'Fundamental (Anos Iniciais)',
    serie: '4º Ano',
    idadeRegularMin: 9,
    idadeRegularMax: 9,
    descricaoRegra: '9 anos',
  },
  {
    etapa: 'Fundamental (Anos Iniciais)',
    serie: '5º Ano',
    idadeRegularMin: 10,
    idadeRegularMax: 10,
    descricaoRegra: '10 anos',
  },

  // Ensino Fundamental - Anos Finais
  {
    etapa: 'Fundamental (Anos Finais)',
    serie: '6º Ano',
    idadeRegularMin: 11,
    idadeRegularMax: 11,
    descricaoRegra: '11 anos',
  },
  {
    etapa: 'Fundamental (Anos Finais)',
    serie: '7º Ano',
    idadeRegularMin: 12,
    idadeRegularMax: 12,
    descricaoRegra: '12 anos',
  },
  {
    etapa: 'Fundamental (Anos Finais)',
    serie: '8º Ano',
    idadeRegularMin: 13,
    idadeRegularMax: 13,
    descricaoRegra: '13 anos',
  },
  {
    etapa: 'Fundamental (Anos Finais)',
    serie: '9º Ano',
    idadeRegularMin: 14,
    idadeRegularMax: 14,
    descricaoRegra: '14 anos',
  },

  // Ensino Médio
  {
    etapa: 'Ensino Médio',
    serie: '1ª Série',
    idadeRegularMin: 15,
    idadeRegularMax: 15,
    descricaoRegra: '15 anos',
  },
  {
    etapa: 'Ensino Médio',
    serie: '2ª Série',
    idadeRegularMin: 16,
    idadeRegularMax: 16,
    descricaoRegra: '16 anos',
  },
  {
    etapa: 'Ensino Médio',
    serie: '3ª Série',
    idadeRegularMin: 17,
    idadeRegularMax: 17,
    descricaoRegra: '17 anos (idade regular máxima)',
  },
];

/**
 * Identifica a regra de faixa etária a partir do nome ou grupo da turma
 */
export function identificarRegraTurma(turma: { nome?: string; grupo?: string }): RegraFaixaEtaria | null {
  const nome = (turma.nome || '').toLowerCase().trim();
  const grupo = (turma.grupo || '').toLowerCase().trim();

  // 1. Checagem em Berçários e Maternais
  if (nome.includes('berçário i') || nome.includes('bercario i') || nome.includes('berçario 1') || nome.includes('bercario 1')) {
    return TABELA_REFERENCIA_FAIXA_ETARIA.find(r => r.serie === 'Berçário I') || null;
  }
  if (nome.includes('berçário ii') || nome.includes('bercario ii') || nome.includes('berçario 2') || nome.includes('bercario 2')) {
    return TABELA_REFERENCIA_FAIXA_ETARIA.find(r => r.serie === 'Berçário II') || null;
  }
  if (nome.includes('maternal i') || nome.includes('maternal 1')) {
    return TABELA_REFERENCIA_FAIXA_ETARIA.find(r => r.serie === 'Maternal I') || null;
  }
  if (nome.includes('maternal ii') || nome.includes('maternal 2')) {
    return TABELA_REFERENCIA_FAIXA_ETARIA.find(r => r.serie === 'Maternal II') || null;
  }

  // 2. Checagem em Pré-Escola
  if (nome.includes('pré i') || nome.includes('pre i') || nome.includes('pré 1') || nome.includes('pre 1') || nome.includes('infantil 4') || nome.includes('infantil iv')) {
    return TABELA_REFERENCIA_FAIXA_ETARIA.find(r => r.serie === 'Pré-Escola I (Pré I)') || null;
  }
  if (nome.includes('pré ii') || nome.includes('pre ii') || nome.includes('pré 2') || nome.includes('pre 2') || nome.includes('infantil 5') || nome.includes('infantil v')) {
    return TABELA_REFERENCIA_FAIXA_ETARIA.find(r => r.serie === 'Pré-Escola II (Pré II)') || null;
  }

  // 3. Checagem em Ensino Médio
  const ehMedio = nome.includes('médio') || nome.includes('medio') || nome.includes('em') || grupo.includes('médio');
  if (ehMedio) {
    if (nome.includes('1ª') || nome.includes('1a') || nome.includes('1°') || nome.includes('1º') || /\b1\b/.test(nome)) {
      return TABELA_REFERENCIA_FAIXA_ETARIA.find(r => r.serie === '1ª Série') || null;
    }
    if (nome.includes('2ª') || nome.includes('2a') || nome.includes('2°') || nome.includes('2º') || /\b2\b/.test(nome)) {
      return TABELA_REFERENCIA_FAIXA_ETARIA.find(r => r.serie === '2ª Série') || null;
    }
    if (nome.includes('3ª') || nome.includes('3a') || nome.includes('3°') || nome.includes('3º') || /\b3\b/.test(nome)) {
      return TABELA_REFERENCIA_FAIXA_ETARIA.find(r => r.serie === '3ª Série') || null;
    }
  }

  // 4. Checagem em Anos do Fundamental (por nome ou grupo)
  // 6º Ano (Ex: '6E - TARDE', '6ºA', '6º Anos')
  if (/^(turma\s*)?6[a-z\s-]/i.test(nome) || nome.includes('6º') || nome.includes('6°') || nome.includes('6 ano') || grupo.includes('6')) {
    return TABELA_REFERENCIA_FAIXA_ETARIA.find(r => r.serie === '6º Ano') || null;
  }
  // 7º Ano
  if (/^(turma\s*)?7[a-z\s-]/i.test(nome) || nome.includes('7º') || nome.includes('7°') || nome.includes('7 ano') || grupo.includes('7')) {
    return TABELA_REFERENCIA_FAIXA_ETARIA.find(r => r.serie === '7º Ano') || null;
  }
  // 8º Ano
  if (/^(turma\s*)?8[a-z\s-]/i.test(nome) || nome.includes('8º') || nome.includes('8°') || nome.includes('8 ano') || grupo.includes('8')) {
    return TABELA_REFERENCIA_FAIXA_ETARIA.find(r => r.serie === '8º Ano') || null;
  }
  // 9º Ano
  if (/^(turma\s*)?9[a-z\s-]/i.test(nome) || nome.includes('9º') || nome.includes('9°') || nome.includes('9 ano') || grupo.includes('9')) {
    return TABELA_REFERENCIA_FAIXA_ETARIA.find(r => r.serie === '9º Ano') || null;
  }
  // 1º Ano
  if (/^(turma\s*)?1[a-z\s-]/i.test(nome) || nome.includes('1º') || nome.includes('1°') || nome.includes('1 ano') || grupo.includes('1')) {
    return TABELA_REFERENCIA_FAIXA_ETARIA.find(r => r.serie === '1º Ano') || null;
  }
  // 2º Ano
  if (/^(turma\s*)?2[a-z\s-]/i.test(nome) || nome.includes('2º') || nome.includes('2°') || nome.includes('2 ano') || grupo.includes('2')) {
    return TABELA_REFERENCIA_FAIXA_ETARIA.find(r => r.serie === '2º Ano') || null;
  }
  // 3º Ano
  if (/^(turma\s*)?3[a-z\s-]/i.test(nome) || nome.includes('3º') || nome.includes('3°') || nome.includes('3 ano') || grupo.includes('3')) {
    return TABELA_REFERENCIA_FAIXA_ETARIA.find(r => r.serie === '3º Ano') || null;
  }
  // 4º Ano
  if (/^(turma\s*)?4[a-z\s-]/i.test(nome) || nome.includes('4º') || nome.includes('4°') || nome.includes('4 ano') || grupo.includes('4')) {
    return TABELA_REFERENCIA_FAIXA_ETARIA.find(r => r.serie === '4º Ano') || null;
  }
  // 5º Ano
  if (/^(turma\s*)?5[a-z\s-]/i.test(nome) || nome.includes('5º') || nome.includes('5°') || nome.includes('5 ano') || grupo.includes('5')) {
    return TABELA_REFERENCIA_FAIXA_ETARIA.find(r => r.serie === '5º Ano') || null;
  }

  // 5. Fallback por grupo
  if (grupo.includes('creche')) {
    return TABELA_REFERENCIA_FAIXA_ETARIA.find(r => r.serie === 'Maternal I') || null;
  }
  if (grupo.includes('pré') || grupo.includes('pre')) {
    return TABELA_REFERENCIA_FAIXA_ETARIA.find(r => r.serie === 'Pré-Escola I (Pré I)') || null;
  }

  return null;
}

/**
 * 2. Lógica de Cálculo de Distorção Idade-Série
 * Calcula idade em 31/03 do ano letivo (data de corte oficial) e a idade atual.
 */
export interface CalculoIdadeAluno {
  idadeCorte: number;
  idadeAtual: number;
  dataNascimentoValida: boolean;
  dataNascimentoFormatada: string;
}

export function calcularIdadeAlunoNaDataCorte(
  dataNascimentoStr: string | undefined | null,
  anoLetivo: number = 2026
): CalculoIdadeAluno {
  if (!dataNascimentoStr || typeof dataNascimentoStr !== 'string') {
    return {
      idadeCorte: 0,
      idadeAtual: 0,
      dataNascimentoValida: false,
      dataNascimentoFormatada: 'Não informada',
    };
  }

  const str = dataNascimentoStr.trim();
  let ano = 0;
  let mes = 0;
  let dia = 0;

  if (str.includes('-')) {
    // Formato ISO: YYYY-MM-DD
    const partes = str.split('T')[0].split('-');
    ano = parseInt(partes[0], 10);
    mes = parseInt(partes[1], 10);
    dia = parseInt(partes[2], 10);
  } else if (str.includes('/')) {
    // Formato Brasileiro: DD/MM/YYYY
    const partes = str.split('/');
    dia = parseInt(partes[0], 10);
    mes = parseInt(partes[1], 10);
    ano = parseInt(partes[2], 10);
  }

  if (!ano || !mes || !dia || isNaN(ano) || isNaN(mes) || isNaN(dia) || ano < 1900 || ano > 2030 || mes < 1 || mes > 12 || dia < 1 || dia > 31) {
    return {
      idadeCorte: 0,
      idadeAtual: 0,
      dataNascimentoValida: false,
      dataNascimentoFormatada: 'Data inválida',
    };
  }

  // Idade na Data de Corte Oficial: 31 de Março do Ano Letivo
  let idadeCorte = anoLetivo - ano;
  if (mes > 3) {
    idadeCorte--;
  }

  // Idade Atual
  const hoje = new Date();
  const anoAtual = hoje.getFullYear();
  const mesAtual = hoje.getMonth() + 1; // 1-12
  const diaAtual = hoje.getDate();

  let idadeAtual = anoAtual - ano;
  if (mesAtual < mes || (mesAtual === mes && diaAtual < dia)) {
    idadeAtual--;
  }

  const diaStr = String(dia).padStart(2, '0');
  const mesStr = String(mes).padStart(2, '0');
  const dataFormatada = `${diaStr}/${mesStr}/${ano}`;

  return {
    idadeCorte: Math.max(0, idadeCorte),
    idadeAtual: Math.max(0, idadeAtual),
    dataNascimentoValida: true,
    dataNascimentoFormatada: dataFormatada,
  };
}

export type StatusIdadeSerie = 'adequado' | 'acima' | 'abaixo' | 'indeterminado';

export interface AnaliseEstudanteFaixaEtaria {
  estudanteId: string;
  nomeCompleto: string;
  dataNascimento: string;
  dataNascimentoFormatada: string;
  idadeCorte: number;
  idadeAtual: number;
  dataNascimentoValida: boolean;
  status: StatusIdadeSerie;
  diferencaAnos: number;
  descricaoStatus: string;
  faixaEsperadaFormatada: string;
}

export interface AnaliseTurmaFaixaEtaria {
  turmaId: string;
  turmaNome: string;
  anoLetivo: number;
  regra: RegraFaixaEtaria | null;
  serieNome: string;
  faixaEsperada: string;
  totalEstudantes: number;
  totalAdequados: number;
  totalForaDaFaixa: number;
  totalAcima: number;
  totalAbaixo: number;
  totalSemData: number;
  temAlunosForaDaFaixa: boolean;
  estudantes: AnaliseEstudanteFaixaEtaria[];
}

/**
 * 3. Analisa todos os alunos de uma turma em relação à faixa etária da série
 */
export function analisarFaixaEtariaTurma(
  turma: { id: string; nome: string; grupo?: string; ano_letivo?: number },
  estudantesDaTurma: Array<{ id: string; nome_completo: string; data_nascimento?: string }>,
  anoLetivoReferencia: number = 2026
): AnaliseTurmaFaixaEtaria {
  const anoLetivo = turma.ano_letivo || anoLetivoReferencia || 2026;
  const regra = identificarRegraTurma(turma);

  const serieNome = regra ? regra.serie : (turma.grupo || turma.nome);
  const faixaEsperada = regra
    ? (regra.idadeRegularMin === regra.idadeRegularMax
        ? `${regra.idadeRegularMin} ano(s)`
        : `${regra.idadeRegularMin} a ${regra.idadeRegularMax} anos`)
    : 'Referência não identificada';

  let totalAdequados = 0;
  let totalAcima = 0;
  let totalAbaixo = 0;
  let totalSemData = 0;

  const estudantesAnalisados: AnaliseEstudanteFaixaEtaria[] = estudantesDaTurma.map((est) => {
    const calc = calcularIdadeAlunoNaDataCorte(est.data_nascimento, anoLetivo);

    if (!calc.dataNascimentoValida) {
      totalSemData++;
      return {
        estudanteId: est.id,
        nomeCompleto: est.nome_completo,
        dataNascimento: est.data_nascimento || '',
        dataNascimentoFormatada: calc.dataNascimentoFormatada,
        idadeCorte: 0,
        idadeAtual: 0,
        dataNascimentoValida: false,
        status: 'indeterminado',
        diferencaAnos: 0,
        descricaoStatus: 'Sem data de nascimento',
        faixaEsperadaFormatada: faixaEsperada,
      };
    }

    if (!regra) {
      return {
        estudanteId: est.id,
        nomeCompleto: est.nome_completo,
        dataNascimento: est.data_nascimento || '',
        dataNascimentoFormatada: calc.dataNascimentoFormatada,
        idadeCorte: calc.idadeCorte,
        idadeAtual: calc.idadeAtual,
        dataNascimentoValida: true,
        status: 'adequado',
        diferencaAnos: 0,
        descricaoStatus: 'Série sem tabela cadastrada',
        faixaEsperadaFormatada: faixaEsperada,
      };
    }

    if (calc.idadeCorte > regra.idadeRegularMax) {
      const dif = calc.idadeCorte - regra.idadeRegularMax;
      totalAcima++;
      return {
        estudanteId: est.id,
        nomeCompleto: est.nome_completo,
        dataNascimento: est.data_nascimento || '',
        dataNascimentoFormatada: calc.dataNascimentoFormatada,
        idadeCorte: calc.idadeCorte,
        idadeAtual: calc.idadeAtual,
        dataNascimentoValida: true,
        status: 'acima',
        diferencaAnos: dif,
        descricaoStatus: `Acima da idade esperada (+${dif} ano${dif > 1 ? 's' : ''})`,
        faixaEsperadaFormatada: faixaEsperada,
      };
    }

    if (calc.idadeCorte < regra.idadeRegularMin) {
      const dif = regra.idadeRegularMin - calc.idadeCorte;
      totalAbaixo++;
      return {
        estudanteId: est.id,
        nomeCompleto: est.nome_completo,
        dataNascimento: est.data_nascimento || '',
        dataNascimentoFormatada: calc.dataNascimentoFormatada,
        idadeCorte: calc.idadeCorte,
        idadeAtual: calc.idadeAtual,
        dataNascimentoValida: true,
        status: 'abaixo',
        diferencaAnos: -dif,
        descricaoStatus: `Abaixo do corte etário legal (-${dif} ano${dif > 1 ? 's' : ''})`,
        faixaEsperadaFormatada: faixaEsperada,
      };
    }

    totalAdequados++;
    return {
      estudanteId: est.id,
      nomeCompleto: est.nome_completo,
      dataNascimento: est.data_nascimento || '',
      dataNascimentoFormatada: calc.dataNascimentoFormatada,
      idadeCorte: calc.idadeCorte,
      idadeAtual: calc.idadeAtual,
      dataNascimentoValida: true,
      status: 'adequado',
      diferencaAnos: 0,
      descricaoStatus: 'Idade regular adequada',
      faixaEsperadaFormatada: faixaEsperada,
    };
  });

  const totalForaDaFaixa = totalAcima + totalAbaixo;

  return {
    turmaId: turma.id,
    turmaNome: turma.nome,
    anoLetivo,
    regra,
    serieNome,
    faixaEsperada,
    totalEstudantes: estudantesDaTurma.length,
    totalAdequados,
    totalForaDaFaixa,
    totalAcima,
    totalAbaixo,
    totalSemData,
    temAlunosForaDaFaixa: totalForaDaFaixa > 0,
    estudantes: estudantesAnalisados,
  };
}
