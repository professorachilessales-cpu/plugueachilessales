import { NextRequest, NextResponse } from 'next/server';
import { sanitizeTextarea } from '@/lib/security';
import { 
  determinarGeneroEstudante, 
  montarSystemPromptConsolidacao, 
  montarUserPromptConsolidacao, 
  limparMetatextoEEncerramentos, 
  gerarConsolidadoHeuristico 
} from '@/lib/pareceres-ia';

export const dynamic = 'force-dynamic';

interface ParecerDocenteEntrada {
  professorNome: string;
  disciplinas?: string[];
  textoFinal: string;
  ehApoio?: boolean;
}

interface AnotacaoPedagogicaEntrada {
  autorNome?: string;
  categoria?: string;
  texto: string;
  dataRegistro?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      alunoNome,
      nome_estudante,
      genero_estudante,
      genero,
      sexo,
      turmaNome, 
      turno, 
      pareceres = [],
      anotacoesPedagogicas = [],
      observacoesSecretaria 
    } = body as {
      alunoNome?: string;
      nome_estudante?: string;
      genero_estudante?: string;
      genero?: string;
      sexo?: string;
      turmaNome?: string;
      turno?: string;
      pareceres: ParecerDocenteEntrada[];
      anotacoesPedagogicas?: AnotacaoPedagogicaEntrada[];
      observacoesSecretaria?: string;
    };

    const nomeFinal = (nome_estudante || alunoNome || 'Estudante').trim();
    const turmaFinal = (turmaNome || 'Regular').trim();

    // Determina os parâmetros de gênero e concordância nominal
    const dadosGenero = determinarGeneroEstudante({
      nome_completo: nomeFinal,
      genero: genero_estudante || genero || sexo,
      sexo: sexo || genero || genero_estudante,
    });

    const instrucaoGenero = genero_estudante && genero_estudante.includes('(')
      ? genero_estudante
      : dadosGenero.instrucaoGramatical;

    // Se não há pareceres e nem anotações pedagógicas válidas
    if ((!pareceres || pareceres.length === 0) && (!anotacoesPedagogicas || anotacoesPedagogicas.length === 0)) {
      return NextResponse.json(
        { error: 'Não há pareceres docentes ou anotações pedagógicas enviadas para consolidação desta solicitação.' },
        { status: 400 }
      );
    }

    // Formatação da lista de pareceres e anotações para o prompt
    const blocosTextos: string[] = [];

    // 1. Pareceres descritivos de professores e equipe de apoio
    if (pareceres && pareceres.length > 0) {
      pareceres.forEach((p, idx) => {
        const disc = p.disciplinas && p.disciplinas.length > 0 ? ` - ${p.disciplinas.join(', ')}` : '';
        const papel = p.ehApoio ? 'Equipe de Apoio & Inclusão' : 'Docente Regente';
        blocosTextos.push(`[${papel} ${idx + 1}: ${p.professorNome}${disc}]\n${p.textoFinal.trim()}`);
      });
    }

    // 2. Anotações pedagógicas válidas do estudante
    if (anotacoesPedagogicas && anotacoesPedagogicas.length > 0) {
      anotacoesPedagogicas.forEach((a, idx) => {
        const cat = a.categoria ? ` (${a.categoria.toUpperCase()})` : '';
        const autor = a.autorNome ? ` por ${a.autorNome}` : '';
        const data = a.dataRegistro ? ` em ${a.dataRegistro}` : '';
        blocosTextos.push(`[Registro Pedagógico ${idx + 1}${cat}${autor}${data}]\n${a.texto.trim()}`);
      });
    }

    // 3. Observações da Secretaria Escolar
    if (observacoesSecretaria && observacoesSecretaria.trim()) {
      blocosTextos.push(`[Observações da Secretaria / Gestão Escolar]\n${sanitizeTextarea(observacoesSecretaria.trim())}`);
    }

    const listaPareceresFormatada = blocosTextos.join('\n\n');

    // Monta os prompts estritos de sistema e usuário
    const systemPrompt = montarSystemPromptConsolidacao();
    const userPrompt = montarUserPromptConsolidacao({
      nomeEstudante: nomeFinal,
      generoEstudante: instrucaoGenero,
      listaPareceres: listaPareceresFormatada,
    });

    // 1. Tentativa via Google Gemini API
    const geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    if (geminiApiKey && geminiApiKey.trim() !== '' && !geminiApiKey.includes('your-key')) {
      const modelosGemini = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-2.0-flash'];

      for (const modelo of modelosGemini) {
        try {
          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${geminiApiKey.trim()}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                systemInstruction: {
                  parts: [{ text: systemPrompt }],
                },
                contents: [
                  {
                    role: 'user',
                    parts: [{ text: userPrompt }],
                  },
                ],
                generationConfig: {
                  temperature: 0.2,
                  maxOutputTokens: 2500,
                },
              }),
            }
          );

          if (response.ok) {
            const json = await response.json();
            const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text;
            if (rawText && rawText.trim().length > 0) {
              const textoFinalLimpo = limparMetatextoEEncerramentos(rawText);
              return NextResponse.json({
                success: true,
                conteudo_consolidado: textoFinalLimpo,
                textoConsolidado: textoFinalLimpo,
                provider: modelo,
              });
            }
          }
        } catch (geminiError) {
          console.warn(`Tentativa com ${modelo} falhou:`, geminiError);
        }
      }
    }

    // 2. Tentativa via OpenAI API (se configurado)
    const openAiApiKey = process.env.OPENAI_API_KEY;
    if (openAiApiKey && openAiApiKey.trim() !== '') {
      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openAiApiKey.trim()}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            temperature: 0.2,
          }),
        });

        if (response.ok) {
          const json = await response.json();
          const rawText = json.choices?.[0]?.message?.content;
          if (rawText && rawText.trim().length > 0) {
            const textoFinalLimpo = limparMetatextoEEncerramentos(rawText);
            return NextResponse.json({
              success: true,
              conteudo_consolidado: textoFinalLimpo,
              textoConsolidado: textoFinalLimpo,
              provider: 'gpt-4o-mini',
            });
          }
        }
      } catch (openAiError) {
        console.warn('Tentativa com OpenAI falhou:', openAiError);
      }
    }

    // 3. Fallback Heurístico Pedagógico de Alta Precisão (Sem metatexto, concordância de gênero estrita)
    const consolidadoHeuristico = gerarConsolidadoHeuristico({
      nomeEstudante: nomeFinal,
      generoGramatical: dadosGenero.generoGramatical,
      turmaNome: turmaFinal,
      pareceres,
      anotacoesPedagogicas,
      observacoesSecretaria,
    });

    const textoFinalHeuristico = limparMetatextoEEncerramentos(consolidadoHeuristico);

    return NextResponse.json({
      success: true,
      conteudo_consolidado: textoFinalHeuristico,
      textoConsolidado: textoFinalHeuristico,
      provider: 'consolidador-pedagogico-plugue',
    });
  } catch (error: any) {
    console.error('Erro na rota de consolidação de pareceres:', error);
    return NextResponse.json(
      { error: error?.message || 'Erro ao consolidar pareceres pedagógicos.' },
      { status: 500 }
    );
  }
}
