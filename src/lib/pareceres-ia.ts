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
 * Constrói o Prompt Oficial com Pipeline de Transformação Estrita em 3 Etapas
 * (Saneamento Gramatical Completo + Interpretação/Reestruturação Pedagógica + Redação Final Polida)
 */
export function montarPromptPipelinePolimentoRelato(params: {
  estudanteNome: string;
  generoGramatical: 'masculino' | 'feminino';
  textoRelatoLivre: string;
}): string {
  const generoFormatado = params.generoGramatical === 'feminino'
    ? 'FEMININO: ela, a aluna, a estudante, dedicada, participativa'
    : 'MASCULINO: ele, o aluno, o estudante, dedicado, participativo';

  return `Você é um linguista revisor e coordenador pedagógico sênior.
Sua função é reescrever o texto do professor, eliminando 100% dos erros gramaticais e elevando o relato a um padrão pedagógico formal, rico e contextualizado.

---
DADOS DE ENTRADA:
- Nome do Estudante: ${params.estudanteNome}
- Gênero Gramatical: ${generoFormatado}
- Texto Bruto do Relato Livre:
"""
${params.textoRelatoLivre.trim()}
"""
---

PROCESSO OBRIGATÓRIO DE TRANSFORMAÇÃO (PASSO A PASSO):

Etapa 1: Saneamento Gramatical Completo (Tolerância Zero a Erros)
- Corrija absolutamente todos os erros de ortografia, acentuação gráfica, pontuação, uso de crase e digitação.
- Ajuste toda a concordância nominal (gênero e número) de acordo com o gênero do estudante informado acima.
- Ajuste toda a concordância verbal e a uniformidade de tempos verbais (evite misturar presente e pretérito sem sentido cronológico).
- Remova coloquialismos, abreviações informais (ex: "vc", "pq", "tbm") e vícios de oralidade (ex: "aí", "daí", "então", "né").

Etapa 2: Interpretação do Contexto e Reestruturação Pedagógica
- Compreenda o real significado e a intenção por trás do relato livre do professor.
- Traduza observações leigas ou informais em linguagem pedagógica e descritiva institucional (exemplo: transformar "aluno briga muito e não quer fazer nada" em "apresenta desafios no relacionamento interpessoal com os pares e oscilações no engajamento durante as atividades propostas").
- Amplie a redação, conectando os pontos levantados com aspectos do desenvolvimento cognitivo, motor, atitudinal ou socioemocional pertinentes ao contexto escolar.

Etapa 3: Redação Final Polida
- O texto final deve ser coeso, fluido, formal e estruturado em parágrafos pedagógicos bem encadeados.
- Preserve a verdade dos fatos descritos pelo professor; não invente dados clínicos ou ocorrências que não existam no relato.

REGRAS RÍGIDAS DE SAÍDA:
- NÃO escreva preâmbulos, saudações ou explicações (proibido usar: "Aqui está o texto revisado:", "Versão corrigida:", "Espero ter ajudado").
- NÃO adicione conclusões, encaminhamentos ou conselhos no final.
- Retorne EXCLUSIVAMENTE o texto final corrigido e ampliado, pronto para ser inserido no campo do formulário.`;
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
 * Heurística pedagógica resiliente que executa o pipeline em etapas:
 * Saneamento gramatical estrito + Interpretação contextual + Reestruturação pedagógica ampla
 */
export function simularPolimentoPedagogicoRelato(
  textoOriginal: string, 
  alunoNome?: string,
  generoGramatical: 'masculino' | 'feminino' = 'masculino'
): string {
  const isFeminino = generoGramatical === 'feminino';
  const artigo = isFeminino ? 'a' : 'o';
  const pronome = isFeminino ? 'ela' : 'ele';
  const nome = alunoNome || (isFeminino ? 'a aluna' : 'o aluno');
  
  let texto = textoOriginal.trim();

  // Etapa 1: Saneamento Gramatical (abreviações e oralidades)
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

  // Etapa 2: Dicionário de reestruturação pedagógica institucional
  const conversoes: [RegExp, string][] = [
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

  // Etapa 3: Redação Final Polida e Encadeada
  const textoLimpo = texto.charAt(0).toLowerCase() + texto.slice(1);
  return `No decorrer das atividades e rotinas pedagógicas observadas, constatou-se que ${artigo} estudante ${alunoNome || ''} ${textoLimpo} No âmbito atitudinal e socioemocional, ${pronome} responde satisfatoriamente às intervenções docentes quando estimulado${isFeminino ? 'a' : 'o'} de maneira estruturada, revelando-se participativo${isFeminino ? 'a' : ''} e colaborativo${isFeminino ? 'a' : ''} nas dinâmicas escolares.`.replace(/\s+/g, ' ').trim();
}


