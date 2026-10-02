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
 * Rigor técnico, norma-padrão da língua portuguesa, tom descritivo e restrições absolutas de saída
 */
export function montarSystemPromptPolimentoRelato(): string {
  return `Você é um revisor textual especializado em documentação pedagógica e relatórios escolares formativos.
Sua função é reescrever o relato do professor garantindo clareza, norma-padrão da língua portuguesa e rigor descritivo.

DIRETRIZES OBRIGATÓRIAS DE REDAÇÃO:
1. Tom e Registro:
   - Linguagem estritamente formal, impessoal, culta e objetiva.
   - Vocabulário técnico-pedagógico adequado ao contexto escolar.
2. Correção Gramatical Rigorosa:
   - Corrija quaisquer desvios de ortografia, acentuação e pontuação.
   - Ajuste a concordância nominal e verbal com precisão.
   - Mantenha estrita coerência temporal nos verbos (ex: preferência pelo pretérito perfeito/imperfeito para fatos ocorridos, ou presente do indicativo para comportamentos recorrentes/atitudes habituais).
3. Clareza e Objetividade:
   - Elimine ambiguidades, repetições excessivas, gírias ou expressões coloquiais.
   - Reorganize o fluxo das frases para que a leitura seja fluida e direta ao ponto.

RESTRIÇÕES MÁXIMAS (O QUE NÃO FAZER):
- NÃO adicione conclusões, julgamentos de valor ou diagnósticos clínicos/psicológicos que não estejam no texto original.
- NÃO crie encaminhamentos, intervenções futuras, tarefas para a coordenação ou recomendações à família.
- NÃO insira saudações, introduções ou notas de encerramento (ex: "Segue o texto revisado:", "Aqui está:", "Em síntese").
- Entregue APENAS o parágrafo ou texto revisado pronto para ser gravado no prontuário/ficha pedagógica.`;
}

/**
 * Constrói o User Prompt contextualizado para revisão do relato livre
 */
export function montarUserPromptPolimentoRelato(params: {
  alunoNome?: string;
  turmaNome?: string;
  disciplina?: string;
  professorNome?: string;
  rascunho: string;
}): string {
  const metadados: string[] = [];
  if (params.alunoNome) metadados.push(`- Estudante: ${params.alunoNome}`);
  if (params.turmaNome) metadados.push(`- Turma: ${params.turmaNome}`);
  if (params.disciplina) metadados.push(`- Componente Curricular: ${params.disciplina}`);
  if (params.professorNome) metadados.push(`- Docente: ${params.professorNome}`);

  const blocoMetadados = metadados.length > 0 ? `DADOS DE CONTEXTO ESCOLAR:\n${metadados.join('\n')}\n\n` : '';

  return `${blocoMetadados}TEXTO BRUTO / RELATO DO DOCENTE (BLOCO "SEU RELATO LIVRE & OBSERVAÇÕES CONCRETAS"):
"""
${params.rascunho.trim()}
"""

Reescreva o texto do relato aplicando estritamente as diretrizes de norma-padrão, objetividade e clareza. Não inclua saudações, conclusões extras nem recomendações:`;
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
 * Heurística de contingência resiliente que refina o texto bruto sem inferir diagnósticos nem criar encaminhamentos
 */
export function simularPolimentoPedagogicoRelato(textoOriginal: string, alunoNome?: string): string {
  const nome = alunoNome || 'O(A) estudante';
  let texto = textoOriginal.trim();

  // Garante terminação com ponto
  if (!texto.endsWith('.')) texto += '.';

  // Dicionário de conversão de termos coloquiais/estigmatizantes para registro técnico formal e descritivo
  const conversoes: [RegExp, string][] = [
    [/\bnao faz nada\b/gi, 'apresenta resistência e baixa adesão no cumprimento das tarefas propostas'],
    [/\bnão faz nada\b/gi, 'apresenta resistência e baixa adesão no cumprimento das tarefas propostas'],
    [/\bbagunceiro\b/gi, 'evidencia agitação motora e frequentes momentos de dispersão'],
    [/\bbagunceira\b/gi, 'evidencia agitação motora e frequentes momentos de dispersão'],
    [/\bpreguicoso\b/gi, 'demanda intervenções constantes e incentivo sistemático para engajar-se'],
    [/\bpreguiçoso\b/gi, 'demanda intervenções constantes e incentivo sistemático para engajar-se'],
    [/\bpreguicosa\b/gi, 'demanda intervenções constantes e incentivo sistemático para engajar-se'],
    [/\bpreguiçosa\b/gi, 'demanda intervenções constantes e incentivo sistemático para engajar-se'],
    [/\bnao aprende\b/gi, 'encontra-se em processo de assimilação dos conteúdos em ritmo individual'],
    [/\bnão aprende\b/gi, 'encontra-se em processo de assimilação dos conteúdos em ritmo individual'],
    [/\binteligente\b/gi, 'demonstra facilidade analítica e raciocínio lógico bem desenvolvido'],
    [/\blegal\b/gi, 'manifesta boa convivência e cooperação com os pares'],
    [/\bchato\b/gi, 'apresenta pontuais dificuldades na autorregulação durante as atividades coletivas'],
    [/\bchata\b/gi, 'apresenta pontuais dificuldades na autorregulação durante as atividades coletivas'],
    [/\bso conversa\b/gi, 'mantém diálogos paralelos frequentes durante os períodos de instrução coletiva'],
    [/\bsó conversa\b/gi, 'mantém diálogos paralelos frequentes durante os períodos de instrução coletiva'],
    [/\bmuito bom\b/gi, 'apresenta desempenho consistente e dedicação satisfatória'],
    [/\bmuito boa\b/gi, 'apresenta desempenho consistente e dedicação satisfatória'],
    [/\bfraco\b/gi, 'apresenta defasagens pontuais nas habilidades curriculares avaliadas'],
    [/\bfraca\b/gi, 'apresenta defasagens pontuais nas habilidades curriculares avaliadas'],
    [/\bteimoso\b/gi, 'demonstra relutância em acolher as orientações pedagógicas ministradas'],
    [/\bteimosa\b/gi, 'demonstra relutância em acolher as orientações pedagógicas ministradas'],
    [/\bnao para quieto\b/gi, 'apresenta inquietação psicomotora e constantes deslocamentos pela sala'],
    [/\bnão para quieto\b/gi, 'apresenta inquietação psicomotora e constantes deslocamentos pela sala'],
    [/\bnao para quieta\b/gi, 'apresenta inquietação psicomotora e constantes deslocamentos pela sala'],
    [/\bnão para quieta\b/gi, 'apresenta inquietação psicomotora e constantes deslocamentos pela sala'],
  ];

  conversoes.forEach(([regex, substituto]) => {
    texto = texto.replace(regex, substituto);
  });

  // Ajusta maiúscula inicial do texto
  const textoFormatado = texto.charAt(0).toUpperCase() + texto.slice(1);

  // Mantém descrição direta e factual dos fatos observados, sem adiantar conclusões ou tarefas futuras
  return `No decorrer das atividades pedagógicas observadas, constatou-se que ${nome} ${textoFormatado.charAt(0).toLowerCase() + textoFormatado.slice(1)}`;
}

