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
 * Constrói o Prompt Oficial com Técnica de Consolidação Inteligente e Padrão Institucional via Gemini
 */
export function montarPromptConsolidacaoPedagogica(params: {
  estudanteNome: string;
  turmaNome: string;
  turmaTurno: string;
  generoGramatical: 'masculino' | 'feminino';
  listaPareceresProfessores: string;
}): string {
  const isFeminino = params.generoGramatical === 'feminino';
  const estudanteGenero = isFeminino ? 'FEMININO' : 'MASCULINO';

  return `Você é um coordenador pedagógico sênior e especialista em redação institucional avaliativa escolar, operando via Gemini.
Sua missão é ler todos os relatórios e apontamentos individuais enviados pelos diferentes professores de um estudante e consolidá-los em um parecer único, abrangente, rico e pedagogicamente sofisticado.

---
DADOS DO ESTUDANTE:
- Nome Completo: ${params.estudanteNome}
- Turma e Turno: ${params.turmaNome} - ${params.turmaTurno}
- Gênero Gramatical: ${estudanteGenero} (MASCULINO: o estudante, o educando, o aluno, engajado, participativo / FEMININO: a estudante, a educanda, a aluna, engajada, participativa)

---
RELATÓRIOS INDIVIDUAIS DOS PROFESSORES ENVIADOS:
"""
${params.listaPareceresProfessores.trim()}
"""

---
DIRETRIZES OBRIGATÓRIAS DE CONSOLIDAÇÃO E REDAÇÃO:

1. ✍️ Saneamento Gramatical e Correção Ortográfica:
   - Corrija rigorosamente qualquer desvio ortográfico, de acentuação, pontuação ou concordância verbal/nominal presente nos textos originais dos professores.
   - Aplique com precisão a concordância de gênero informada para ${params.estudanteNome}.

2. 🎨 Vocabulário Técnico, Rico e Variado:
   - Evite jargões repetitivos ou estruturas mecânicas. Utilize variedade lexical culta adequada ao ambiente escolar (ex.: desenvolvimento cognitivo, competências socioemocionais, mediação pedagógica contextualizada, autorregulação, participação colaborativa, funções executivas, engajamento formativo).
   - Conecte as diferentes áreas e relatos em parágrafos temáticos contínuos e harmônicos (dimensão cognitiva, dimensão socioemocional/atitudinal e convivência em grupo).

3. 🔄 Síntese e Unificação sem Redundâncias:
   - Não liste o texto "professor por professor". Integre os pontos comuns e destaque as especificidades de maneira orgânica.
   - Eleve a linguagem: transforme apontamentos informais ou coloquiais em termos técnicos descritivos e respeitosos.

4. 🚫 Restrições Rígidas:
   - NÃO adicione saudações, preâmbulos ou notas (ex.: "Aqui está o parecer consolidado:").
   - NÃO adicione tópicos finais de sugestões para os pais, encaminhamentos ou conselhos.
   - NÃO coloque registros contínuos no texto nem faça menção a eles (ex.: "registros contínuos", "anotações pedagógicas de acompanhamento", históricos pontuais).
   - Retorne EXCLUSIVAMENTE o texto pedagógico consolidado e contínuo, pronto para o documento oficial.`;
}

/**
 * Constrói o System Prompt oficial com rigor formal pedagógico e restrições estritas de saída (compatibilidade)
 */
export function montarSystemPromptConsolidacao(): string {
  return `Você é um coordenador pedagógico sênior e especialista em redação institucional avaliativa escolar, operando via Gemini.
Sua missão é ler todos os relatórios e apontamentos individuais enviados pelos diferentes professores de um estudante e consolidá-los em um parecer único, abrangente, rico e pedagogicamente sofisticado.

DIRETRIZES OBRIGATÓRIAS DE CONSOLIDAÇÃO E REDAÇÃO:
1. Saneamento Gramatical e Correção Ortográfica: Corrija rigorosamente qualquer desvio ortográfico, acentuação, pontuação ou concordância verbal/nominal.
2. Vocabulário Técnico, Rico e Variado: Utilize variedade lexical culta adequada ao ambiente escolar (desenvolvimento cognitivo, competências socioemocionais, mediação pedagógica, autorregulação).
3. Síntese e Unificação sem Redundâncias: Integre os pontos comuns dos professores e destaque especificidades organicamente, sem listar professor por professor.
4. Restrições Rígidas: Retorne EXCLUSIVAMENTE o texto pedagógico consolidado, sem preâmbulos, saudações, sugestões finais e sem qualquer menção ou inclusão de registros contínuos.`;
}

/**
 * Constrói o User Prompt estruturado (compatibilidade)
 */
export function montarUserPromptConsolidacao(params: {
  nomeEstudante: string;
  generoEstudante: string;
  listaPareceres: string;
  turmaNome?: string;
  turmaTurno?: string;
}): string {
  return montarPromptConsolidacaoPedagogica({
    estudanteNome: params.nomeEstudante,
    turmaNome: params.turmaNome || 'Turma Regular',
    turmaTurno: params.turmaTurno || 'Regular',
    generoGramatical: params.generoEstudante.toLowerCase().includes('fem') ? 'feminino' : 'masculino',
    listaPareceresProfessores: params.listaPareceres,
  });
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

  // Remove eventuais títulos no início (ex: "Parecer Pedagógico Consolidado:")
  limpo = limpo.replace(/^(?:#{1,4}\s*)?(?:parecer pedagógico consolidado|parecer consolidado|relatório consolidado|síntese avaliativa consolidada):?\s*\n+/i, '');

  // Remove seções proibidas no final do texto (Sugestões de melhoria, Recomendações, Próximos passos, Dicas, etc.)
  const secoesProibidasRegex = /\n+(?:#{1,4}\s*)?(?:sugestões de melhoria|sugestões pedagógicas|recomendações para a família|recomendações aos responsáveis|recomendações pedagógicas|próximos passos|dicas para os pais|dicas de estudo|orientações para a família|em resumo|conclusão e recomendações)[:\s\S]*$/i;
  limpo = limpo.replace(secoesProibidasRegex, '');

  // Remove notas de encerramento da IA
  limpo = limpo.replace(/\n+(?:espero ter ajudado|qualquer dúvida|atenciosamente|estou à disposição|caso precise)[\s\S]*$/i, '');

  // Remove qualquer menção residual a registros contínuos
  limpo = limpo.replace(/(?:os\s+registros\s+cont[íi]nuos\s+de\s+acompanhamento\s+pedag[óo]gico\s+corroboram\s+que|registros\s+cont[íi]nuos\s+de\s+acompanhamento\s+pedag[óo]gico|registros\s+cont[íi]nuos\s+de\s+acompanhamento|registros\s+cont[íi]nuos|registros\s+pedag[óo]gicos\s+cont[íi]nuos)\s*/gi, '');

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

  // Parágrafo 4: Observações Institucionais da Secretaria (se houver)
  if (params.observacoesSecretaria?.trim()) {
    paragrafos.push(params.observacoesSecretaria.trim());
  }

  return paragrafos.join('\n\n');
}

/**
 * Constrói o Prompt Oficial com Técnica de Lapidação Pedagógica Criativa e Padrão Institucional via Gemini
 */
export function montarPromptPipelinePolimentoRelato(params: {
  estudanteNome: string;
  generoGramatical: 'masculino' | 'feminino';
  textoRelatoLivre: string;
}): string {
  const isFeminino = params.generoGramatical === 'feminino';
  const generoFormatado = isFeminino
    ? 'FEMININO: ela, a estudante, a educanda, a aluna, reflexiva, colaborativa'
    : 'MASCULINO: ele, o estudante, o educando, o aluno, reflexivo, colaborativo';

  const artigoEstudante = isFeminino ? 'a estudante' : 'o estudante';
  const artigoAluno = isFeminino ? 'a aluna' : 'o aluno';
  const estimulado = isFeminino ? 'estimulada' : 'estimulado';

  const saidaEsperada = `No decorrer das atividades e rotinas pedagógicas observadas, constatou-se que ${artigoEstudante} ${params.estudanteNome} relata situações que sugerem possíveis sintomas de maus-tratos, além de apresentar episódios de uso frequente de linguagem inadequada (palavrões) e falas desconexas. No âmbito atitudinal e socioemocional, ${artigoAluno} responde de forma satisfatória às intervenções docentes quando ${estimulado} de maneira estruturada, demonstrando postura participativa e colaborativa nas dinâmicas escolares.`;

  return `Você é um consultor pedagógico institucional sênior, mestre em avaliação formativa e literatura descritiva educacional, operando via Gemini.
Sua missão é pegar apontamentos brutos de professores (frequentemente informais, truncados ou com vícios de linguagem) e lapidá-los com alta sensibilidade pedagógica, criatividade de vocabulário e rigor formal impecável.

---
METADADOS DO ESTUDANTE:
- Nome Completo: ${params.estudanteNome}
- Gênero Gramatical: ${generoFormatado}

---
DIRETRIZES DE ESTILO CRIATIVO & INSTITUCIONAL:

1. 🎨 Repertório Vocabular Fluido e Enriquecido:
   - Evite frases clichês repetitivas. Explore recursos estilísticos cultos e termos pedagógicos sofisticados (ex.: "desenvolvimento socioafetivo", "mediação contextualizada", "funções executivas e autorregulação", "linguagem expressiva e pragmática", "receptividade às intervenções").
   - Conecte as ações concretas do relato original com as dimensões formativas da BNCC (competências cognitivas, atitudinais, comunicativas e socioemocionais).

2. ✍️ Saneamento Gramatical sem Perder a Essência:
   - Corrija 100% dos desvios ortográficos, pontuações truncadas, concordâncias verbais e nominais.
   - Aplique com rigor absoluto a concordância de gênero informada para ${params.estudanteNome}.

3. 🔍 Contextualização Sensível e Humana:
   - Capte o contexto subjacente das anotações rápidas do docente e estruture uma narrativa pedagógica coerente, fluida e equilibrada, que valorize o potencial de desenvolvimento do aluno mesmo ao relatar dificuldades ou episódios de indisciplina.

---
REFERÊNCIA DE TRANSFORMAÇÃO ESPERADA:

[ENTRADA BRUTA]:
"Estudante alegra com sintomas de maus tratos
Fala mutos palavroes e farses desconecao"

[SAÍDA ESPERADA - ELEGANTE, CRIATIVA E INSTITUCIONAL]:
"${saidaEsperada}"

---
RESTRIÇÕES E LIMITES:
- NÃO invente laudos ou ocorrências que contrariem o relato original.
- NÃO adicione cabeçalhos, saudações, introduções ou notas conversacionais (ex: "Aqui está o texto refinado:").
- NÃO adicione seções de "Dicas para a coordenação", "Encaminhamentos" ou "Sugestões".
- Retorne EXCLUSIVAMENTE o texto pedagógico refinado, pronto para leitura e validação do professor.

---
TEXTO DO RELATO LIVRE:
"""
${params.textoRelatoLivre.trim()}
"""`;
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
  const introRegex = /^(?:aqui\s+está\s+(?:o\s+texto\s+revisado|o\s+texto|a\s+versão\s+refinada|a\s+versão\s+corrigida|a\s+versão\s+revisada)|segue\s+(?:a\s+versão\s+refinada|o\s+texto\s+revisado|o\s+texto|a\s+versão\s+corrigida)|versão\s+(?:refinada|corrigida|revisada)|texto\s+revisado|em\s+síntese|olá|prezado|relato\s+revisado|parecer\s+revisado).*?:\s*\n*/i;
  limpo = limpo.replace(introRegex, '');

  // Remove notas de encerramento da IA
  const encerramentoRegex = /\n+(?:espero\s+(?:ter\s+ajudado|que\s+ajude)|qualquer\s+dúvida|atenciosamente|estou\s+à\s+disposição|em\s+resumo|conclusão)[\s\S]*$/i;
  limpo = limpo.replace(encerramentoRegex, '');

  return limpo.trim();
}

/**
 * Heurística pedagógica resiliente alinhada ao padrão institucional oficial
 */
export function simularPolimentoPedagogicoRelato(
  textoOriginal: string, 
  alunoNome?: string,
  generoGramatical: 'masculino' | 'feminino' = 'masculino'
): string {
  const isFeminino = generoGramatical === 'feminino';
  const artigoEstudante = isFeminino ? 'a estudante' : 'o estudante';
  const artigoAluno = isFeminino ? 'a aluna' : 'o aluno';
  const estimulado = isFeminino ? 'estimulada' : 'estimulado';
  const nome = alunoNome || (isFeminino ? 'a aluna' : 'o aluno');
  
  let texto = textoOriginal.trim();

  // 1. Saneamento de abreviações e erros ortográficos frequentes
  texto = texto
    .replace(/\bvc\b/gi, 'você')
    .replace(/\bpq\b/gi, 'porque')
    .replace(/\btbm?\b/gi, 'também')
    .replace(/\bpra\b/gi, 'para a')
    .replace(/\bpro\b/gi, 'para o')
    .replace(/\btá\b/gi, 'está')
    .replace(/\btô\b/gi, 'estou')
    .replace(/\bné\b/gi, '')
    .replace(/\baí\b/gi, 'posteriormente')
    .replace(/\bdaí\b/gi, 'em seguida')
    .replace(/\bentão\b/gi, 'portanto');

  if (!texto.endsWith('.')) texto += '.';

  // 2. Transposição para o padrão técnico-pedagógico institucional
  const conversoes: [RegExp, string][] = [
    [/\b(?:estudante\s+)?alegr?a\s+(?:de\s+)?(?:com\s+)?sintomas\s+de\s+maus[\s-]tratos\b/gi, 'relata situações que sugerem possíveis sintomas de maus-tratos'],
    [/\bsintomas\s+de\s+maus[\s-]tratos\b/gi, 'situações que sugerem possíveis sintomas de maus-tratos'],
    [/\b(?:fala|usa|falam)\s+mut?os\s+palavr[oõ]es\b/gi, 'apresentar episódios de uso frequente de linguagem inadequada (palavrões)'],
    [/\bpalavr[oõ]es\b/gi, 'linguagem inadequada (palavrões)'],
    [/\bfars?es?\s+desconec[aã]o\b/gi, 'falas desconexas'],
    [/\bfrases?\s+desconexas?\b/gi, 'falas desconexas'],
    [/\b(?:alun[oa]\s+)?briga\s+muito\s+e\s+n[aã]o\s+quer\s+fazer\s+nada\b/gi, 'apresenta desafios no relacionamento interpessoal com os pares e oscilações no engajamento durante as atividades propostas'],
    [/\bn[aã]o para quiet[oa]\s+e\s+atrapalha\b/gi, 'apresenta momentos de inquietação psicomotora que demandam mediação pedagógica contínua para manutenção do foco e harmonia do ambiente coletivo'],
    [/\bn[aã]o para quiet[oa]\b/gi, 'apresenta inquietação psicomotora e constantes deslocamentos em sala'],
    [/\bnao faz nada\b/gi, 'apresenta resistência e oscilações no engajamento durante a execução das tarefas propostas'],
    [/\bnão faz nada\b/gi, 'apresenta resistência e oscilações no engajamento durante a execução das tarefas propostas'],
    [/\bbagunceir[oa]s?\b/gi, 'evidencia agitação psicomotora e frequentes momentos de dispersão durante as rotinas pedagógicas'],
    [/\bpreguiços[oa]s?\b/gi, 'demanda estímulos pedagógicos sistemáticos e acompanhamento mediador contínuo para consolidação de sua autonomia acadêmica'],
    [/\bpreguicos[oa]s?\b/gi, 'demanda estímulos pedagógicos sistemáticos e acompanhamento mediador contínuo para consolidação de sua autonomia acadêmica'],
    [/\bnao aprende\b/gi, 'encontra-se em processo contínuo de apropriação dos conteúdos curriculares em ritmo próprio e singular de desenvolvimento'],
    [/\bnão aprende\b/gi, 'encontra-se em processo contínuo de apropriação dos conteúdos curriculares em ritmo próprio e singular de desenvolvimento'],
    [/\binteligent[es]?\b/gi, 'demonstra perspicácia analítica notável, rápida apreensão dos conceitos curriculares e raciocínio lógico bem estruturado'],
    [/\blega(?:l|is)\b/gi, 'manifesta conduta cooperativa e relacionamento harmonioso com os pares e o corpo docente'],
    [/\bchat[oa]s?\b/gi, 'apresenta pontuais desafios na autorregulação socioemocional durante as interações em grupo'],
    [/\bs[oó] conversa\b/gi, 'tende a estabelecer diálogos paralelos com frequência durante os períodos de instrução coletiva'],
    [/\bmuito bo[am]s?\b/gi, 'apresenta desempenho consistente, postura colaborativa e dedicação exemplar'],
    [/\bfrac[oa]s?\b/gi, 'demanda intervenções didáticas direcionadas para superação de defasagens pontuais nas habilidades curriculares'],
    [/\bteimos[oa]s?\b/gi, 'mostra-se relutante no acolhimento imediato das orientações pedagógicas ministradas'],
  ];

  conversoes.forEach(([regex, substituto]) => {
    texto = texto.replace(regex, substituto);
  });

  // 3. Estruturação no padrão institucional (com abertura contextualizada e dimensão atitudinal)
  const textoLimpo = texto.charAt(0).toLowerCase() + texto.slice(1);
  return `No decorrer das atividades e rotinas pedagógicas observadas, constatou-se que ${artigoEstudante} ${alunoNome || ''} ${textoLimpo} No âmbito atitudinal e socioemocional, ${artigoAluno} responde de forma satisfatória às intervenções docentes quando ${estimulado} de maneira estruturada, demonstrando postura participativa e colaborativa nas dinâmicas escolares.`.replace(/\s+/g, ' ').trim();
}


