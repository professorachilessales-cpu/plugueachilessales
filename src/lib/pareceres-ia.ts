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
  
  // Nomes masculinos terminados em 'a' ou com grafia ambígua
  const nomesMasculinosExcecao = [
    'luca', 'lucas', 'joshua', 'sasha', 'elias', 'matias', 'jonas', 'isaías', 'isaias', 'jean'
  ];
  if (nomesMasculinosExcecao.includes(primeiroNome)) {
    return masculino;
  }

  const nomesFemininosExcecao = [
    'alice', 'beatriz', 'clarice', 'ester', 'esther', 'ines', 'inês', 'isabel', 
    'isabele', 'isabella', 'isabelle', 'laiz', 'laís', 'liz', 'raquel', 'ruth', 'sarah', 'shirley',
    'carmem', 'carmen', 'cleo', 'cléo', 'ellen', 'helen', 'lilian', 'ketlyn', 'kethlyn',
    'yasmin', 'yasmim', 'lorrane', 'lorraine', 'ingrid', 'sueli', 'suely', 'giselle', 'gisele',
    'monique', 'simone', 'solange', 'viviane', 'vivian', 'elaine', 'ariane', 'ariadne',
    'joyce', 'karen', 'carol', 'caroline', 'gabrielle', 'gabriele', 'emanuelle', 'emanuely',
    'nicole', 'nicolly', 'mirian', 'miriam'
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
 * Constrói o Prompt Oficial com Técnica de Lapidação Pedagógica e Padrão Institucional via Google Gemini
 */
export function montarPromptPipelinePolimentoRelato(params: {
  estudanteNome: string;
  generoGramatical: 'masculino' | 'feminino';
  textoRelatoLivre: string;
}): string {
  const isFeminino = params.generoGramatical === 'feminino';
  const generoFormatado = isFeminino
    ? 'FEMININO (utilize estritamente artigos, pronomes e adjetivos femininos: a estudante, a aluna, a educanda, ela, dedicada, atenta, participativa, estimulada, motivada, segura)'
    : 'MASCULINO (utilize estritamente artigos, pronomes e adjetivos masculinos: o estudante, o aluno, o educando, ele, dedicado, atento, participativo, estimulado, motivado, seguro)';

  return `Você é um consultor pedagógico institucional sênior e especialista em redação avaliativa escolar oficial operando via Google Gemini.
Sua missão é pegar o texto bruto de "Relato Livre & Observações Concretas" digitado pelo professor e lapidá-lo com perfeição segundo as diretrizes a seguir:

---
DADOS DO ESTUDANTE AVALIADO:
- Nome Completo: ${params.estudanteNome}
- Gênero Gramatical: ${generoFormatado}

---
DIRETRIZES OBRIGATÓRIAS DE POLIMENTO PEDAGÓGICO:

1. 🏛️ Linguagem Formal, Culta e Institucional:
   - Eleve o texto original para uma prosa avaliativa nobre, elegante, respeitosa e técnica.
   - Utilize repertório pedagógico culto (ex.: desenvolvimento cognitivo, apropriação dos conteúdos curriculares, mediação contextualizada, autorregulação socioemocional, interação com os pares, manutenção da atenção sustentada).

2. ✍️ Correção Integral de Todos os Erros de Português:
   - Corrija 100% dos desvios ortográficos, acentuação gráfica, pontuação, sintaxe, concordância nominal e concordância verbal.
   - Elimine abreviações da internet (vc, pq, tbm, pra, etc.) e vícios de oralidade.

3. ⚖️ Concordância Rigorosa de Gênero com o Estudante:
   - Aplique estritamente o gênero ${isFeminino ? 'FEMININO' : 'MASCULINO'} em todos os artigos, pronomes e adjetivos atribuídos a ${params.estudanteNome}.
   ${isFeminino 
     ? '- Ex.: "a estudante", "a aluna", "a educanda", "ela", "dedicada", "atenta", "participativa", "acolhida", "estimulada". NUNCA utilize termos masculinos para a estudante.' 
     : '- Ex.: "o estudante", "o aluno", "o educando", "ele", "dedicado", "atento", "participativo", "acolhido", "estimulado". NUNCA utilize termos femininos para o estudante.'}

4. 📖 Melhoria Textual e Fluidez Narrativa:
   - Estruture as observações em uma narrativa contínua, clara e pedagogicamente coerente.
   - Conserve com total fidelidade todos os fatos, conquistas e dificuldades observados pelo professor, valorizando o processo de desenvolvimento e sem inventar dados, ocorrências ou diagnósticos clínicos não relatados.

---
EXEMPLOS DE TRANSFORMAÇÃO ESPERADA:

[Exemplo 1 - Aluna (Gênero Feminino)]:
Entrada: "a aluna e dedicada mais conversa d+ e as vezes nao presta atencao na aula de portugues"
Saída: "A estudante demonstra dedicação aos estudos e bom potencial formativo. Observa-se, contudo, que estabelece conversas paralelas com frequência durante as explanações teóricas de Língua Portuguesa, demandando intervenções pontuais para a manutenção do foco e da atenção contínua."

[Exemplo 2 - Aluno (Gênero Masculino)]:
Entrada: "ele aprende rapido e ajuda os colega mas briga no recreio e nao para quieto"
Saída: "O educando evidencia rápida apropriação dos conteúdos curriculares e postura cooperativa ao auxiliar os colegas nas tarefas. No ambiente do recreio e em momentos coletivos, contudo, apresenta agitação psicomotora e pontuais desafios na mediação pacífica de conflitos com os pares, necessitando de mediação docente para a consolidação de sua autorregulação socioemocional."

---
RESTRIÇÕES E LIMITES RÍGIDOS:
- Retorne EXCLUSIVAMENTE o texto pedagógico polido final, pronto para inclusão no relatório.
- NÃO inclua introduções, saudações (como "Aqui está o texto..."), preâmbulos ou aspas envolventes.
- NÃO adicione seções de "Dicas para a coordenação", encaminhamentos ou sugestões finais.

---
TEXTO DO RELATO LIVRE DIGITADO PELO PROFESSOR:
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
 * Polidor pedagógico avançado de contingência:
 * Aplica linguagem formal, correção integral de português e concordância estrita de gênero.
 */
export function simularPolimentoPedagogicoRelato(
  textoOriginal: string, 
  alunoNome?: string,
  generoGramatical: 'masculino' | 'feminino' = 'masculino'
): string {
  const isFeminino = generoGramatical === 'feminino';
  const artigoEstudante = isFeminino ? 'a estudante' : 'o estudante';
  const nome = (alunoNome || '').trim();

  let texto = (textoOriginal || '').trim();
  if (!texto) return '';

  // 1. Saneamento de abreviações e gírias
  const abreviacoes: [RegExp, string][] = [
    [/\bvc\b/gi, 'você'],
    [/\bvcs\b/gi, 'vocês'],
    [/\bpq\b/gi, 'porque'],
    [/\btbm?\b/gi, 'também'],
    [/\btb\b/gi, 'também'],
    [/\bpra\s+a\b/gi, 'para a'],
    [/\bpra\s+o\b/gi, 'para o'],
    [/\bpra\b/gi, isFeminino ? 'para a' : 'para o'],
    [/\bpro\b/gi, 'para o'],
    [/\bd\+(?:\s|$)/gi, 'demais '],
    [/\btá\b/gi, 'está'],
    [/\btô\b/gi, 'estou'],
    [/\bné\b/gi, ''],
    [/\baí\b/gi, 'posteriormente'],
    [/\bdaí\b/gi, 'em seguida'],
    [/\bentão\b/gi, 'portanto'],
    [/\bcmg\b/gi, 'comigo'],
    [/\btds?\b/gi, 'todos'],
    [/\btd\b/gi, 'tudo'],
    [/\bhj\b/gi, 'hoje'],
    [/\bnd\b/gi, 'nada'],
    [/\boq\b/gi, 'o que'],
    [/\bblz\b/gi, 'satisfatório'],
    [/\bqndo\b/gi, 'quando'],
    [/\bmt[oa]s?\b/gi, 'muito'],
  ];

  for (const [re, sub] of abreviacoes) {
    texto = texto.replace(re, sub);
  }

  // 2. Saneamento ortográfico e sintático do Português
  const correcoesOrtograficas: [RegExp, string][] = [
    [/\bnao\b/gi, 'não'],
    [/\bcomvers(?:a|ar|am|ou|ando)\b/gi, 'conversa'],
    [/\bescrevel\b/gi, 'escreveu'],
    [/\bdesenvolvel\b/gi, 'desenvolveu'],
    [/\bresolvel\b/gi, 'resolveu'],
    [/\bentendeo\b/gi, 'entendeu'],
    [/\baprendeo\b/gi, 'aprendeu'],
    [/\bfas\b/gi, 'faz'],
    [/\bfazemdo\b/gi, 'fazendo'],
    [/\bconcerteza\b/gi, 'com certeza'],
    [/\bderrepente\b/gi, 'de repente'],
    [/\bdevagar\b/gi, 'em ritmo gradativo'],
    [/\bfars?es?\s+desconec[aã]o\b/gi, 'falas desconexas'],
    [/\bfrases?\s+desconexas?\b/gi, 'falas desconexas'],
    [/\bfalta\s+de\s+atencao\b/gi, 'dificuldade na manutenção da atenção sustentada'],
    [/\bsem\s+atencao\b/gi, 'com dispersão atencional'],
    [/\bdesatent[oa]s?\b/gi, 'disperso'],
    [/\bpreguicos[oa]s?\b/gi, 'resistente à rotina de estudos'],
    [/\bpreguiços[oa]s?\b/gi, 'resistente à rotina de estudos'],
    [/\bdificuldade\s+pra\s+ler\b/gi, 'dificuldade no processo de leitura'],
    [/\bnao\s+sabe\s+ler\b/gi, 'encontra-se em fase inicial de alfabetização e decodificação textual'],
  ];

  for (const [re, sub] of correcoesOrtograficas) {
    texto = texto.replace(re, sub);
  }

  // Diferenciação inteligente: 'e' (conjunção) vs 'é' (verbo ser)
  texto = texto.replace(/\be\s+(muito|bastante|pouco|atent[oa]|dedicad[oa]|caprichos[oa]|respons[aá]vel|pontual|agitad[oa]|focad[oa]|interessad[oa]|uma?|capaz|exemplar|participativ[oa]|calad[oa]|quiet[oa]|t[ií]mid[oa])\b/gi, 'é $1');

  // Diferenciação inteligente: 'mais' (intensidade/adição) vs 'mas' (adversativa)
  texto = texto.replace(/\bmais\s+(quando|porém|contudo|todavia|entretanto|não|nem|conversa|briga|apresenta|demanda|precisa|tem|está|fica|mostra)\b/gi, 'mas $1');

  // 3. Elevação para linguagem formal e padrão técnico institucional
  const conversoesPedagogicas: [RegExp, string][] = [
    [/\b(?:n[aã]o\s+para\s+quiet[oa]|n[aã]o\s+fica\s+quiet[oa])\b/gi, 'apresenta momentos de agitação psicomotora e constantes deslocamentos em sala'],
    [/\b(?:n[aã]o\s+faz\s+nada|n[aã]o\s+quer\s+fazer\s+nada)\b/gi, 'manifesta resistência transitória e oscilações no engajamento durante a execução das atividades pedagógicas propostas'],
    [/\b(?:briga\s+muito\s+com\s+(?:os|as)?\s*colegas?|briga\s+com\s+(?:os|as)?\s*colegas?|vive\s+brigando)\b/gi, 'apresenta pontuais desafios na mediação de conflitos e na convivência harmoniosa com os pares'],
    [/\b(?:s[oó]\s+conversa|conversa\s+muito|conversa\s+demais)\b/gi, 'estabelece diálogos paralelos com frequência durante os momentos de explicação coletiva'],
    [/\b(?:n[aã]o\s+aprende|n[aã]o\s+sabe\s+nada)\b/gi, 'encontra-se em processo contínuo de apropriação dos conteúdos curriculares em ritmo próprio e singular'],
    [/\b(?:muito\s+inteligent[es]?|super\s+inteligent[es]?)\b/gi, 'demonstra perspicácia analítica notável, boa capacidade reflexiva e rapidez na apreensão dos conteúdos curriculares'],
    [/\b(?:ajuda\s+todo\s+mundo|ajuda\s+os\s+colegas|muito\s+prestativo)\b/gi, 'manifesta postura colaborativa, empatia e prontidão para cooperar nas dinâmicas de grupo'],
    [/\b(?:faz\s+tudo\s+certinho|muito\s+caprichos[oa])\b/gi, 'cumpre com esmero, organização e pontualidade as metas pedagógicas orientadas'],
    [/\b(?:fala\s+muitos?\s+palavr[oõ]es?|usa\s+palavr[oõ]es?)\b/gi, 'apresenta episódios ocasionais de uso de linguagem inadequada no ambiente escolar'],
    [/\b(?:sintomas?\s+de\s+maus[\s-]tratos)\b/gi, 'situações que sugerem necessidade de acolhimento e escuta atenta'],
    [/\b(?:bagunceir[oa]s?)\b/gi, 'evidencia agitação psicomotora e momentos de dispersão'],
    [/\b(?:teimos[oa]s?)\b/gi, 'mostra-se relutante no acolhimento imediato das orientações docentes'],
    [/\b(?:chat[oa]s?)\b/gi, 'apresenta pontuais desafios na autorregulação socioemocional'],
  ];

  for (const [re, sub] of conversoesPedagogicas) {
    texto = texto.replace(re, sub);
  }

  // 4. Concordância estrita de gênero gramatical (Feminino vs Masculino)
  if (isFeminino) {
    texto = texto
      .replace(/\bo\s+aluno\b/gi, 'a aluna')
      .replace(/\bo\s+estudante\b/gi, 'a estudante')
      .replace(/\bo\s+educando\b/gi, 'a educanda')
      .replace(/\bdo\s+aluno\b/gi, 'da aluna')
      .replace(/\bdo\s+estudante\b/gi, 'da estudante')
      .replace(/\bdo\s+educando\b/gi, 'da educanda')
      .replace(/\bao\s+aluno\b/gi, 'à aluna')
      .replace(/\bao\s+estudante\b/gi, 'à estudante')
      .replace(/\bao\s+educando\b/gi, 'à educanda')
      .replace(/\bpelo\s+aluno\b/gi, 'pela aluna')
      .replace(/\bno\s+aluno\b/gi, 'na aluna')
      .replace(/\bele\b/gi, 'ela')
      .replace(/\bdele\b/gi, 'dela')
      .replace(/\bnele\b/gi, 'nela')
      .replace(/\bcom\s+os\s+colegas\b/gi, 'com as colegas')
      .replace(/\batento\b/gi, 'atenta')
      .replace(/\batentos\b/gi, 'atentas')
      .replace(/\bdedicado\b/gi, 'dedicada')
      .replace(/\bdedicados\b/gi, 'dedicadas')
      .replace(/\bparticipativo\b/gi, 'participativa')
      .replace(/\bparticipativos\b/gi, 'participativas')
      .replace(/\binteressado\b/gi, 'interessada')
      .replace(/\binquieto\b/gi, 'inquieta')
      .replace(/\bagitado\b/gi, 'agitada')
      .replace(/\bdisperso\b/gi, 'dispersa')
      .replace(/\bfocado\b/gi, 'focada')
      .replace(/\bconcentrado\b/gi, 'concentrada')
      .replace(/\bcalado\b/gi, 'calada')
      .replace(/\bquieto\b/gi, 'quieta')
      .replace(/\btímido\b/gi, 'tímida')
      .replace(/\btimido\b/gi, 'tímida')
      .replace(/\besforçado\b/gi, 'esforçada')
      .replace(/\bcomprometido\b/gi, 'comprometida')
      .replace(/\bestimulado\b/gi, 'estimulada')
      .replace(/\bmotivado\b/gi, 'motivada')
      .replace(/\bacolhido\b/gi, 'acolhida')
      .replace(/\bautônomo\b/gi, 'autônoma')
      .replace(/\bseguro\b/gi, 'segura')
      .replace(/\binseguro\b/gi, 'insegura')
      .replace(/\bsozinho\b/gi, 'sozinha')
      .replace(/\bmatriculado\b/gi, 'matriculada');
  } else {
    texto = texto
      .replace(/\ba\s+aluna\b/gi, 'o aluno')
      .replace(/\ba\s+estudante\b/gi, 'o estudante')
      .replace(/\ba\s+educanda\b/gi, 'o educando')
      .replace(/\bda\s+aluna\b/gi, 'do aluno')
      .replace(/\bda\s+estudante\b/gi, 'do estudante')
      .replace(/\bà\s+aluna\b/gi, 'ao aluno')
      .replace(/\bpela\s+aluna\b/gi, 'pelo aluno')
      .replace(/\bna\s+aluna\b/gi, 'no aluno')
      .replace(/\bela\b/gi, 'ele')
      .replace(/\bdela\b/gi, 'dele')
      .replace(/\bnela\b/gi, 'nele')
      .replace(/\batenta\b/gi, 'atento')
      .replace(/\batentas\b/gi, 'atentos')
      .replace(/\bdedicada\b/gi, 'dedicado')
      .replace(/\bdedicadas\b/gi, 'dedicados')
      .replace(/\bparticipativa\b/gi, 'participativo')
      .replace(/\bparticipativas\b/gi, 'participativos')
      .replace(/\binteressada\b/gi, 'interessado')
      .replace(/\binquieta\b/gi, 'inquieto')
      .replace(/\bagitada\b/gi, 'agitado')
      .replace(/\bdispersa\b/gi, 'disperso')
      .replace(/\bfocada\b/gi, 'focado')
      .replace(/\bconcentrada\b/gi, 'concentrado')
      .replace(/\bcalada\b/gi, 'calado')
      .replace(/\bquieta\b/gi, 'quieto')
      .replace(/\btímida\b/gi, 'tímido')
      .replace(/\btimida\b/gi, 'tímido')
      .replace(/\besforçada\b/gi, 'esforçado')
      .replace(/\bcomprometida\b/gi, 'comprometido')
      .replace(/\bestimulada\b/gi, 'estimulado')
      .replace(/\bmotivada\b/gi, 'motivado')
      .replace(/\bacolhida\b/gi, 'acolhido')
      .replace(/\bautônoma\b/gi, 'autônomo')
      .replace(/\bsegura\b/gi, 'seguro')
      .replace(/\binsegura\b/gi, 'inseguro')
      .replace(/\bsozinha\b/gi, 'sozinho')
      .replace(/\bmatriculada\b/gi, 'matriculado');
  }

  // 5. Estruturação gramatical e narrativa limpa
  texto = texto.replace(/\s+/g, ' ').trim();
  if (!texto.endsWith('.')) texto += '.';
  texto = texto.charAt(0).toUpperCase() + texto.slice(1);
  texto = texto.replace(/([.!?]\s+)([a-z])/g, (_, p1, p2) => p1 + p2.toUpperCase());

  // Se o texto não menciona o estudante, insere uma introdução institucional sutil
  const jaMenciona = nome && new RegExp(`\\b${nome.split(' ')[0]}\\b`, 'i').test(texto);
  const comecaComArtigo = /^(a|o)\s+(alun[oa]|estudante|educand[oa])/i.test(texto);

  if (!comecaComArtigo && !jaMenciona) {
    const abertura = nome 
      ? `No acompanhamento pedagógico de ${nome}, constata-se que ${artigoEstudante} `
      : `Durante as atividades e rotinas pedagógicas observadas, constata-se que ${artigoEstudante} `;
    
    const primeiraLetra = texto.charAt(0).toLowerCase();
    return (abertura + primeiraLetra + texto.slice(1)).replace(/\s+/g, ' ').trim();
  }

  return texto;
}


