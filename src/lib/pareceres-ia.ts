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
 * Constrói o System Prompt oficial para o bloco "Seu Relato Livre & Observações Concretas"
 * Rigor técnico, norma-padrão da língua portuguesa, concordância de gênero e número, e construção textual fluida
 */
export function montarSystemPromptPolimentoRelato(): string {
  return `Você é um revisor textual e linguista especializado em documentação pedagógica e relatórios escolares formativos.
Sua função é reescrever o relato do professor garantindo clareza, alta qualidade sintática, norma-padrão da língua portuguesa e rigor descritivo.

DIRETRIZES OBRIGATÓRIAS DE REDAÇÃO:

1. CONCORDÂNCIA ESTRITA EM GÊNERO E NÚMERO:
   - Respeite rigorosamente o gênero gramatical (masculino ou feminino) e o número (singular ou plural) referente ao estudante identificado.
   - Todos os artigos (o/a, um/uma), pronomes (ele/ela, o/a, seu/sua) e adjetivos/particípios predicativos (ex: atento/atenta, dedicado/dedicada, participativo/participativa, empenhado/empenhada, pontual, matriculado/matriculada) DEVEM flexionar em absoluta harmonia com o estudante.
   - Aplique concordância verbal e nominal com precisão cirúrgica: termos no singular mantêm verbos no singular; menções coletivas ou plurais concordam harmonicamente. Jamais utilize linguagem neutra informal (como "elu", "@" ou "x"); empregue a norma culta oficial da língua portuguesa.

2. MELHORIA NA CONSTRUÇÃO TEXTUAL E FLUIDEZ:
   - Aprimore a estruturação sintática das frases: transforme rascunhos desconexos, períodos truncados ou orações fragmentadas em um texto fluido, articulado e coeso.
   - Empregue conectivos oracionais adequados (ex: "ademais", "outrossim", "no tocante a", "durante as atividades", "revela-se", "evidencia", "por sua vez") para garantir transições naturais e ritmo de leitura culto e profissional.
   - Elimine ambiguidades, repetições excessivas, cacofonias e expressões coloquiais ou gírias, elevando o vocabulário para o registro técnico-pedagógico formal.

3. CORREÇÃO GRAMATICAL RIGOROSA:
   - Corrija minuciosamente quaisquer desvios de ortografia e acentuação gráfica oficial (segundo o Acordo Ortográfico vigente).
   - Pontuação apurada: uso adequado de vírgulas (em orações subordinadas, adjuntos adverbiais deslocados e enumerações), pontos finais continuativos e períodos bem delimitados.
   - Regência verbal e nominal precisa (ex: "assistir às explicações", "dedicar-se às tarefas", "apto a").
   - Coerência temporal estrita nos tempos verbais (pretérito perfeito ou imperfeito para eventos e fatos observados; presente do indicativo para comportamentos e atitudes habituais/recorrentes).

RESTRIÇÕES MÁXIMAS (O QUE NÃO FAZER):
- NÃO adicione conclusões, julgamentos de valor, rótulos pejorativos ou diagnósticos clínicos/psicológicos que não estejam no texto original.
- NÃO crie encaminhamentos, tarefas para a coordenação, intervenções futuras ou recomendações à família.
- NÃO insira saudações, introduções ou notas de encerramento (ex: "Segue o texto revisado:", "Aqui está:", "Em síntese", "Atenciosamente").
- Entregue APENAS o parágrafo ou texto revisado pronto para ser gravado no prontuário/ficha pedagógica.`;
}

/**
 * Constrói o User Prompt contextualizado para revisão do relato livre com concordância orientada
 */
export function montarUserPromptPolimentoRelato(params: {
  alunoNome?: string;
  generoGramatical?: 'masculino' | 'feminino';
  instrucaoGenero?: string;
  turmaNome?: string;
  disciplina?: string;
  professorNome?: string;
  rascunho: string;
}): string {
  const metadados: string[] = [];
  if (params.alunoNome) metadados.push(`- Estudante: ${params.alunoNome}`);
  if (params.generoGramatical) {
    const art = params.generoGramatical === 'feminino' ? 'a / ela' : 'o / ele';
    const adjEx = params.generoGramatical === 'feminino' ? 'atenta, dedicada, participativa, matriculada' : 'atento, dedicado, participativo, matriculado';
    metadados.push(`- Gênero Gramatical para Concordância Obrigatória: ${params.generoGramatical.toUpperCase()} (Flexione artigos "${art}" e adjetivos: "${adjEx}")`);
  }
  if (params.instrucaoGenero) metadados.push(`- Orientação de Flexão: ${params.instrucaoGenero}`);
  if (params.turmaNome) metadados.push(`- Turma: ${params.turmaNome}`);
  if (params.disciplina) metadados.push(`- Componente Curricular: ${params.disciplina}`);
  if (params.professorNome) metadados.push(`- Docente Responsável: ${params.professorNome}`);

  const blocoMetadados = metadados.length > 0 ? `DADOS DE IDENTIFICAÇÃO E CONCORDÂNCIA:\n${metadados.join('\n')}\n\n` : '';

  return `${blocoMetadados}TEXTO BRUTO / RELATO DO DOCENTE (BLOCO "SEU RELATO LIVRE & OBSERVAÇÕES CONCRETAS"):
"""
${params.rascunho.trim()}
"""

Reescreva o relato com concordância estrita em gênero e número com relação ao estudante, construção textual aprimorada e correção gramatical rigorosa. Entregue apenas o texto revisado:`;
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
  const introRegex = /^(?:segue\s+o\s+texto\s+revisado|aqui\s+está\s+o\s+texto\s+revisado|texto\s+revisado|versão\s+revisada|em\s+síntese|olá|prezado|relato\s+revisado|parecer\s+revisado).*?:\s*\n*/i;
  limpo = limpo.replace(introRegex, '');

  // Remove notas de encerramento da IA
  const encerramentoRegex = /\n+(?:espero\s+ter\s+ajudado|qualquer\s+dúvida|atenciosamente|estou\s+à\s+disposição|em\s+resumo|conclusão)[\s\S]*$/i;
  limpo = limpo.replace(encerramentoRegex, '');

  return limpo.trim();
}

/**
 * Heurística de contingência resiliente com rigor gramatical, concordância de gênero/número e construção sintática fluida
 */
export function simularPolimentoPedagogicoRelato(
  textoOriginal: string, 
  alunoNome?: string,
  generoGramatical: 'masculino' | 'feminino' = 'masculino'
): string {
  const isFeminino = generoGramatical === 'feminino';
  const artigo = isFeminino ? 'A' : 'O';
  const pronome = isFeminino ? 'ela' : 'ele';
  const nome = alunoNome || (isFeminino ? 'A estudante' : 'O estudante');
  
  let texto = textoOriginal.trim();
  if (!texto.endsWith('.')) texto += '.';

  // Dicionário de termos coloquiais -> vocabulário técnico com concordância contextual
  const conversoes: [RegExp, string][] = [
    [/\bnao faz nada\b/gi, `apresenta resistência e baixa adesão na execução das tarefas propostas`],
    [/\bnão faz nada\b/gi, `apresenta resistência e baixa adesão na execução das tarefas propostas`],
    [/\bbagunceir[oa]s?\b/gi, isFeminino ? 'evidencia agitação motora e dispersão nas rotinas coletivas' : 'evidencia agitação motora e dispersão nas rotinas coletivas'],
    [/\bpreguiços[oa]s?\b/gi, `demanda mediação contínua e estímulos frequentes para seu engajamento`],
    [/\bpreguicos[oa]s?\b/gi, `demanda mediação contínua e estímulos frequentes para seu engajamento`],
    [/\bnao aprende\b/gi, 'apresenta ritmo próprio no processo de assimilação dos conteúdos'],
    [/\bnão aprende\b/gi, 'apresenta ritmo próprio no processo de assimilação dos conteúdos'],
    [/\binteligent[es]?\b/gi, isFeminino ? 'demonstra perspicácia analítica e raciocínio lógico bem estruturado' : 'demonstra perspicácia analítica e raciocínio lógico bem estruturado'],
    [/\blega(?:l|is)\b/gi, isFeminino ? 'manifesta cooperação e excelente sociabilidade com os pares' : 'manifesta cooperação e excelente sociabilidade com os pares'],
    [/\bchat[oa]s?\b/gi, 'apresenta pontuais desafios na autorregulação durante as dinâmicas em grupo'],
    [/\bs[oó] conversa\b/gi, 'mantém diálogos paralelos frequentes durante os períodos de explicação coletiva'],
    [/\bmuito bo[am]s?\b/gi, isFeminino ? 'apresenta desempenho consistente e dedicação satisfatória' : 'apresenta desempenho consistente e dedicação satisfatória'],
    [/\bfrac[oa]s?\b/gi, 'apresenta defasagens pontuais nas habilidades curriculares avaliadas'],
    [/\bteimos[oa]s?\b/gi, isFeminino ? 'mostra-se relutante ao acolhimento das orientações pedagógicas' : 'mostra-se relutante ao acolhimento das orientações pedagógicas'],
    [/\bn[aã]o para quiet[oa]\b/gi, 'apresenta inquietação psicomotora e constantes deslocamentos em sala'],
  ];

  conversoes.forEach(([regex, substituto]) => {
    texto = texto.replace(regex, substituto);
  });

  // Melhora na construção e fluidez frasal
  const textoLimpo = texto.charAt(0).toLowerCase() + texto.slice(1);
  return `No decorrer das atividades pedagógicas observadas, constatou-se que ${artigo.toLowerCase()} estudante ${alunoNome || ''} ${textoLimpo}`.replace(/\s+/g, ' ').trim();
}


