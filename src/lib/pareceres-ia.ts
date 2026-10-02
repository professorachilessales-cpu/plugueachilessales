/**
 * Utilitários e Diretrizes de Engenharia de Prompt para Consolidação de Pareceres com IA
 * Plataforma PLUGUE - Módulo de Relatórios e Pareceres Pedagógicos
 */

export interface DadosGeneroEstudante {
  termo: string;
  generoGramatical: 'masculino' | 'feminino';
  instrucaoGramatical: string;
  artigoDefinido: string;
  pronomePessoal: string;
  adjetivoAtento: string;
  adjetivoMatriculado: string;
  adjetivoDedicado: string;
}

/**
 * Identifica o gênero gramatical do estudante para concordância nominal estrita
 */
export function determinarGeneroEstudante(estudante: {
  nome_completo?: string;
  genero?: string;
  sexo?: string;
}): DadosGeneroEstudante {
  const g = (estudante.genero || estudante.sexo || '').toUpperCase().trim();

  const feminino: DadosGeneroEstudante = {
    termo: 'Feminino',
    generoGramatical: 'feminino',
    instrucaoGramatical: 'Feminino (Utilize estritamente artigos e adjetivos adequados: a/ela/atenta/matriculada)',
    artigoDefinido: 'a',
    pronomePessoal: 'ela',
    adjetivoAtento: 'atenta',
    adjetivoMatriculado: 'matriculada',
    adjetivoDedicado: 'dedicada',
  };

  const masculino: DadosGeneroEstudante = {
    termo: 'Masculino',
    generoGramatical: 'masculino',
    instrucaoGramatical: 'Masculino (Utilize estritamente artigos e adjetivos adequados: o/ele/atento/matriculado)',
    artigoDefinido: 'o',
    pronomePessoal: 'ele',
    adjetivoAtento: 'atento',
    adjetivoMatriculado: 'matriculado',
    adjetivoDedicado: 'dedicado',
  };

  if (g === 'F' || g === 'FEMININO' || g === 'MULHER') {
    return feminino;
  }

  if (g === 'M' || g === 'MASCULINO' || g === 'HOMEM') {
    return masculino;
  }

  // Dedução inteligente com base no primeiro nome do estudante
  const primeiroNome = (estudante.nome_completo || '').trim().split(' ')[0].toLowerCase();
  const nomesFemininosExcecao = [
    'alice', 'beatriz', 'clarice', 'ester', 'esther', 'ines', 'inês', 'isabel', 
    'isabelle', 'laiz', 'laís', 'liz', 'raquel', 'ruth', 'sarah', 'shirley'
  ];

  if (primeiroNome.endsWith('a') || nomesFemininosExcecao.includes(primeiroNome)) {
    return feminino;
  }

  return masculino;
}

/**
 * Constrói o System Prompt oficial com rigor formal pedagógico e restrições estritas de saída
 */
export function montarSystemPromptConsolidacao(): string {
  return `Você é um especialista em redação pedagógica e avaliação escolar formativa.
Sua tarefa é consolidar múltiplos pareceres descritivos de professores em um ÚNICO documento coeso, claro e formal sobre o desenvolvimento do estudante.

DIRETRIZES DE ESTILO E REDAÇÃO:
1. Tom de Voz: Linguagem estritamente formal, culta, técnica, profissional e pedagógica.
2. Correção Gramatical: Corrija todos os desvios ortográficos, pontuação incorreta e inadequações de concordância verbal ou nominal presentes nos textos originais.
3. Síntese e Clareza: Agrupe ideias correlatas (desenvolvimento cognitivo, socioemocional, participação, autonomia e convivência coletiva), eliminando repetições desnecessárias e contradições.
4. Concordância de Gênero: Respeite rigorosamente a concordância nominal de gênero do estudante ao longo de todo o documento.

RESTRIÇÃO MÁXIMA DE SAÍDA:
- NÃO inclua seções de "Sugestões de melhoria", "Recomendações para a família", "Próximos passos" ou "Dicas".
- NÃO adicione saudações, introduções ou notas de encerramento (ex: "Aqui está o texto consolidado:", "Espero ter ajudado", "Em resumo").
- Entregue APENAS o corpo da análise pedagógica consolidada, dividida em parágrafos temáticos fluidos e bem articulados.`;
}

/**
 * Constrói o User Prompt estruturado
 */
export function montarUserPromptConsolidacao(params: {
  nomeEstudante: string;
  generoEstudante: string;
  listaPareceres: string;
}): string {
  return `DADOS DE ENTRADA:
- Nome do Estudante: ${params.nomeEstudante}
- Gênero/Gênero Gramatical: ${params.generoEstudante}
- Pareceres Originais:
${params.listaPareceres}

Gere o Parecer Pedagógico Consolidado definitivo, estritamente de acordo com as diretrizes e restrições:`;
}

/**
 * Remove qualquer metatexto, saudações de IA e seções proibidas (sugestões, dicas, próximos passos)
 */
export function limparMetatextoEEncerramentos(texto: string): string {
  if (!texto) return '';

  let limpo = texto.trim();

  // Remove blocos de código markdown se houver
  limpo = limpo.replace(/^```[a-z]*\s*\n?/i, '').replace(/\n?```\s*$/i, '');

  // Remove saudações ou metatexto introdutório da IA (ex: "Aqui está o texto consolidado:", "Com base nos dados:", etc.)
  limpo = limpo.replace(/^(?:aqui está|segue|abaixo|conforme solicitado|olá|prezado|com base nos pareceres|apresento|em resposta ao pedido).*?:\s*\n*/i, '');

  // Remove seções proibidas no final do texto (Sugestões de melhoria, Recomendações, Próximos passos, Dicas, etc.)
  const secoesProibidasRegex = /\n+(?:#{1,4}\s*)?(?:sugestões de melhoria|sugestões pedagógicas|recomendações para a família|recomendações aos responsáveis|recomendações pedagógicas|próximos passos|dicas para os pais|dicas de estudo|orientações para a família|em resumo|conclusão e recomendações)[:\s\S]*$/i;
  limpo = limpo.replace(secoesProibidasRegex, '');

  // Remove notas de encerramento da IA
  limpo = limpo.replace(/\n+(?:espero ter ajudado|qualquer dúvida|atenciosamente|estou à disposição|caso precise)[\s\S]*$/i, '');

  return limpo.trim();
}

/**
 * Heurística de contingência pedagógica com rigor formal e estrita concordância de gênero
 */
export function gerarConsolidadoHeuristico(params: {
  nomeEstudante: string;
  generoGramatical: 'masculino' | 'feminino';
  turmaNome: string;
  pareceres: Array<{ professorNome: string; disciplinas?: string[]; textoFinal: string }>;
  anotacoesPedagogicas?: Array<{ autorNome?: string; texto: string; categoria?: string }>;
  observacoesSecretaria?: string;
}): string {
  const nome = params.nomeEstudante || (params.generoGramatical === 'feminino' ? 'A estudante' : 'O estudante');
  const adjetivoMatriculado = params.generoGramatical === 'feminino' ? 'matriculada' : 'matriculado';
  const adjetivoDedicado = params.generoGramatical === 'feminino' ? 'dedicada' : 'dedicado';

  const textosPareceres = params.pareceres
    .map(p => p.textoFinal.trim())
    .filter(Boolean);

  const textosAnotacoes = (params.anotacoesPedagogicas || [])
    .map(a => a.texto.trim())
    .filter(Boolean);

  const paragrafos: string[] = [];

  // Parágrafo 1: Contextualização Institucional e Postura
  paragrafos.push(
    `Durante o período letivo avaliado na Turma ${params.turmaNome}, ${nome}, regularmente ${adjetivoMatriculado}, apresentou desenvolvimento acadêmico consistente e harmonioso com a proposta pedagógica institucional. Revelou-se ${adjetivoDedicado} no cumprimento das rotinas escolares, demonstrando pontualidade, organização com os materiais didáticos e comprometimento com as metas de aprendizagem.`
  );

  // Parágrafo 2: Dimensão Cognitiva e Habilidades Curriculares
  if (textosPareceres.length > 0) {
    const sintese = textosPareceres.join(' ');
    paragrafos.push(
      `No tocante às competências cognitivas e ao domínio dos componentes curriculares, as avaliações dos educadores evidenciam avanços expressivos na apropriação dos conteúdos programáticos. Especificamente, o corpo docente registrou que ${sintese}`
    );
  }

  // Parágrafo 3: Dimensão Socioemocional, Participação e Convivência
  paragrafos.push(
    `No âmbito do desenvolvimento socioemocional, convivência coletiva e autonomia, ${nome} destaca-se pela relação respeitosa e empática com colegas e profissionais da educação. Demonstra maturidade na escuta atenta, capacidade de trabalho em equipe e equilíbrio na resolução participativa das situações cotidianas, exercendo sua cidadania escolar com responsabilidade e protagonismo.`
  );

  // Parágrafo 4: Anotações Pedagógicas e Observações de Acompanhamento (se houver)
  if (textosAnotacoes.length > 0 || params.observacoesSecretaria?.trim()) {
    const complementares: string[] = [];
    if (textosAnotacoes.length > 0) {
      complementares.push(`Os registros contínuos de acompanhamento pedagógico corroboram que ${textosAnotacoes.join(' ')}`);
    }
    if (params.observacoesSecretaria?.trim()) {
      complementares.push(params.observacoesSecretaria.trim());
    }
    paragrafos.push(complementares.join(' '));
  }

  return paragrafos.join('\n\n');
}

/**
 * Constrói o System Prompt oficial para o bloco "Versão Pedagógica Refinada (Revisável pelo Professor)"
 * Ampliação qualitativa, enriquecimento pedagógico formal e concordância rigorosa de gênero e número
 */
export function montarSystemPromptPolimentoRelato(params: {
  estudanteNome: string;
  generoGramatical: 'masculino' | 'feminino';
}): string {
  const estudanteGenero = params.generoGramatical === 'feminino'
    ? 'FEMININO: ela, a aluna, dedicada, matriculada, atenta'
    : 'MASCULINO: ele, o aluno, dedicado, matriculado, atento';

  return `Você é um especialista sênior em redação pedagógica, linguística aplicada e avaliação formativa escolar.
Sua missão é transformar anotações pedagógicas brutas em uma versão refinada, ampla, culta e profundamente articulada para compor os relatórios escolares oficiais.

METADADOS OBRIGATÓRIOS DO ESTUDANTE:
- Nome do Estudante: ${params.estudanteNome}
- Gênero Gramatical: ${estudanteGenero}

DIRETRIZES DE REFINAMENTO E TRANSFORMAÇÃO:
1. Ampliação Qualitativa e Enriquecimento Pedagógico:
   - Não se limite a consertar vírgulas. Reestruture e amplie o relato bruto do professor, traduzindo observações informais em termos pedagógicos formais (ex.: de "não para quieto e atrapalha" para "apresenta momentos de inquietação motora que demandam mediação pedagógica contínua para manutenção do foco").
   - Detalhe e contextualize os aspectos cognitivos, atitudinais e socioemocionais citados no relato.
2. Concordância Rigorosa de Gênero e Número:
   - Respeite rigorosamente o gênero gramatical informado em todos os artigos, substantivos, adjetivos e particípios referentes ao estudante ao longo de todo o texto.
   - Aplique concordância verbal e nominal perfeita de acordo com a norma-padrão da Língua Portuguesa.
3. Coerência Temporal e Fluidez:
   - Mantenha tempos verbais uniformes e precisos (foco no pretérito perfeito/imperfeito para acontecimentos observados, ou presente para comportamentos habituais consolidados).
4. Limites da Produção:
   - NÃO adicione notas introdutórias nem comentários do tipo "Segue a versão refinada:", "Aqui está o texto" ou "Espero que ajude".
   - NÃO crie dados fictícios não sugeridos pelo relato original.
   - Retorne EXCLUSIVAMENTE o texto pedagógico refinado e pronto para o parecer.`;
}

/**
 * Constrói o User Prompt contextualizado para transformação pedagógica do relato livre
 */
export function montarUserPromptPolimentoRelato(params: {
  alunoNome: string;
  generoGramatical: 'masculino' | 'feminino';
  turmaNome?: string;
  disciplina?: string;
  professorNome?: string;
  rascunho: string;
}): string {
  const metadados: string[] = [];
  metadados.push(`- Nome do Estudante: ${params.alunoNome}`);
  metadados.push(`- Gênero Gramatical: ${params.generoGramatical === 'feminino' ? 'FEMININO (ela, a aluna, dedicada, matriculada, atenta)' : 'MASCULINO (ele, o aluno, dedicado, matriculado, atento)'}`);
  if (params.turmaNome) metadados.push(`- Turma: ${params.turmaNome}`);
  if (params.disciplina) metadados.push(`- Componente Curricular: ${params.disciplina}`);
  if (params.professorNome) metadados.push(`- Docente Responsável: ${params.professorNome}`);

  return `METADADOS OBRIGATÓRIOS DO ESTUDANTE:
${metadados.join('\n')}

RELATO ORIGINAL DO PROFESSOR (TEXTO BRUTO A SER TRANSFORMADO):
"""
${params.rascunho.trim()}
"""

Transforme o relato bruto do professor acima na versão pedagógica refinada, ampla, culta e profundamente articulada conforme as diretrizes do sistema. Retorne EXCLUSIVAMENTE o texto refinado:`;
}

/**
 * Remove qualquer metatexto, saudações de IA, aspas externas ou notas de encerramento
 */
export function limparMetatextoEEncerramentosRelato(texto: string): string {
  if (!texto) return '';

  let limpo = texto.trim();

  // Remove blocos de código markdown (```texto```)
  limpo = limpo.replace(/^```[a-z]*\s*\n?/i, '').replace(/\n?```\s*$/i, '');

  // Remove aspas duplas ou simples envolventes se a IA tiver encapsulado toda a resposta entre aspas
  if ((limpo.startsWith('"') && limpo.endsWith('"')) || (limpo.startsWith('“') && limpo.endsWith('”'))) {
    limpo = limpo.slice(1, -1).trim();
  }

  // Remove saudações ou metatexto introdutório da IA
  const introRegex = /^(?:segue\s+a\s+versão\s+refinada|segue\s+o\s+texto\s+revisado|aqui\s+está\s+o\s+texto|aqui\s+está\s+a\s+versão\s+refinada|versão\s+refinada|texto\s+revisado|em\s+síntese|olá|prezado|relato\s+revisado|parecer\s+revisado).*?:\s*\n*/i;
  limpo = limpo.replace(introRegex, '');

  // Remove notas de encerramento da IA
  const encerramentoRegex = /\n+(?:espero\s+ter\s+ajudado|espero\s+que\s+ajude|qualquer\s+dúvida|atenciosamente|estou\s+à\s+disposição|em\s+resumo|conclusão)[\s\S]*$/i;
  limpo = limpo.replace(encerramentoRegex, '');

  return limpo.trim();
}

/**
 * Heurística pedagógica resiliente com ampliação qualitativa e concordância estrita de gênero e número
 */
export function simularPolimentoPedagogicoRelato(
  textoOriginal: string, 
  alunoNome?: string,
  generoGramatical: 'masculino' | 'feminino' = 'masculino'
): string {
  const isFeminino = generoGramatical === 'feminino';
  const artigo = isFeminino ? 'A' : 'O';
  const artigoMinusculo = isFeminino ? 'a' : 'o';
  const pronome = isFeminino ? 'ela' : 'ele';
  const nome = alunoNome || (isFeminino ? 'a aluna' : 'o aluno');
  
  let texto = textoOriginal.trim();
  if (!texto.endsWith('.')) texto += '.';

  // Dicionário de ampliação qualitativa de termos coloquiais -> vocabulário pedagógico formal
  const conversoes: [RegExp, string][] = [
    [/\bn[aã]o para quiet[oa] e atrapalha\b/gi, 'apresenta momentos de inquietação psicomotora que demandam mediação pedagógica contínua para manutenção do foco e harmonia do ambiente coletivo'],
    [/\bn[aã]o para quiet[oa]\b/gi, 'apresenta inquietação psicomotora e constantes deslocamentos em sala'],
    [/\bnao faz nada\b/gi, 'apresenta resistência e baixa adesão na execução das tarefas propostas, necessitando de intervenções individualizadas para engajamento'],
    [/\bnão faz nada\b/gi, 'apresenta resistência e baixa adesão na execução das tarefas propostas, necessitando de intervenções individualizadas para engajamento'],
    [/\bbagunceir[oa]s?\b/gi, 'evidencia agitação psicomotora e frequentes momentos de dispersão durante as rotinas de aprendizagem'],
    [/\bpreguiços[oa]s?\b/gi, 'demanda estímulos pedagógicos sistemáticos e acompanhamento mediador contínuo para consolidação de sua autonomia acadêmica'],
    [/\bpreguicos[oa]s?\b/gi, 'demanda estímulos pedagógicos sistemáticos e acompanhamento mediador contínuo para consolidação de sua autonomia acadêmica'],
    [/\bnao aprende\b/gi, 'encontra-se em processo contínuo de apropriação dos conteúdos em ritmo próprio e singular de desenvolvimento'],
    [/\bnão aprende\b/gi, 'encontra-se em processo contínuo de apropriação dos conteúdos em ritmo próprio e singular de desenvolvimento'],
    [/\binteligent[es]?\b/gi, 'demonstra perspicácia analítica notável, rápida apreensão dos conceitos curriculares e raciocínio lógico bem estruturado'],
    [/\blega(?:l|is)\b/gi, 'manifesta conduta cooperativa e relacionamento harmonioso com os pares e educadores'],
    [/\bchat[oa]s?\b/gi, 'apresenta pontuais desafios na autorregulação socioemocional durante as interações em grupo'],
    [/\bs[oó] conversa\b/gi, 'tende a estabelecer diálogos paralelos com frequência durante os períodos de instrução coletiva'],
    [/\bmuito bo[am]s?\b/gi, isFeminino ? 'apresenta desempenho consistente, postura colaborativa e dedicação exemplar' : 'apresenta desempenho consistente, postura colaborativa e dedicação exemplar'],
    [/\bfrac[oa]s?\b/gi, 'demanda intervenções didáticas direcionadas para superação de defasagens pontuais nas habilidades curriculares'],
    [/\bteimos[oa]s?\b/gi, isFeminino ? 'mostra-se relutante no acolhimento imediato das orientações pedagógicas' : 'mostra-se relutante no acolhimento imediato das orientações pedagógicas'],
  ];

  conversoes.forEach(([regex, substituto]) => {
    texto = texto.replace(regex, substituto);
  });

  // Reestruturação em períodos pedagógicos articulados e fluidos
  const textoLimpo = texto.charAt(0).toLowerCase() + texto.slice(1);
  return `No decorrer das atividades e rotinas pedagógicas observadas, constatou-se que ${artigoMinusculo} estudante ${alunoNome || ''} ${textoLimpo} No âmbito atitudinal e socioemocional, ${pronome} responde satisfatoriamente às intervenções docentes quando estimulado${isFeminino ? 'a' : 'o'} de maneira estruturada, revelando-se participativo${isFeminino ? 'a' : ''} nos projetos interdisciplinares.`.replace(/\s+/g, ' ').trim();
}


