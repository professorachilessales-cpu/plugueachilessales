import { NextRequest, NextResponse } from 'next/server';
import { sanitizeTextarea } from '@/lib/security';
import { 
  determinarGeneroEstudante,
  montarSystemPromptPolimentoRelato, 
  montarUserPromptPolimentoRelato, 
  limparMetatextoEEncerramentosRelato, 
  simularPolimentoPedagogicoRelato 
} from '@/lib/pareceres-ia';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      rascunho, 
      alunoNome, 
      estudanteNome,
      nome_estudante,
      alunoGenero,
      estudanteGenero,
      genero,
      sexo,
      turmaNome, 
      disciplina, 
      professorNome 
    } = body;

    const rascunhoLimpo = sanitizeTextarea(rascunho);
    if (!rascunhoLimpo || rascunhoLimpo.trim().length < 5) {
      return NextResponse.json(
        { error: 'Por favor, insira um relato preliminar com mais detalhes para que a IA possa refinar.' },
        { status: 400 }
      );
    }

    const nomeFinal = (estudanteNome || alunoNome || nome_estudante || 'Estudante').trim();
    const generoInformado = estudanteGenero || alunoGenero || genero || sexo || '';

    // Identificação de gênero para concordância gramatical estrita em gênero e número
    const dadosGenero = determinarGeneroEstudante({
      nome_completo: nomeFinal,
      genero: generoInformado,
      sexo: generoInformado,
    });

    const systemPrompt = montarSystemPromptPolimentoRelato({
      estudanteNome: nomeFinal,
      generoGramatical: dadosGenero.generoGramatical,
    });

    const userPrompt = montarUserPromptPolimentoRelato({
      alunoNome: nomeFinal,
      generoGramatical: dadosGenero.generoGramatical,
      turmaNome,
      disciplina,
      professorNome,
      rascunho: rascunhoLimpo,
    });

    // 1. Provedor Primário: Google Gemini API (modelos oficiais com fallback em cascata)
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
                  temperature: 0.3,
                  maxOutputTokens: 2048,
                },
              }),
            }
          );

          if (response.ok) {
            const json = await response.json();
            const candidateText = json.candidates?.[0]?.content?.parts?.[0]?.text;
            if (candidateText && candidateText.trim().length > 0) {
              const textoFinal = limparMetatextoEEncerramentosRelato(candidateText);
              return NextResponse.json({
                success: true,
                texto_ia: textoFinal,
                provider: modelo,
              });
            }
          } else {
            console.warn(`Tentativa Gemini com modelo ${modelo} retornou status ${response.status}.`);
          }
        } catch (geminiError) {
          console.error(`Erro ao chamar modelo ${modelo} da Gemini:`, geminiError);
        }
      }
    }

    // 2. Provedor Secundário: OpenAI API (se configurado no ambiente)
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
            const textoFinal = limparMetatextoEEncerramentosRelato(rawText);
            return NextResponse.json({
              success: true,
              texto_ia: textoFinal,
              provider: 'gpt-4o-mini',
            });
          }
        }
      } catch (openAiError) {
        console.warn('Tentativa com OpenAI falhou:', openAiError);
      }
    }

    // 3. Fallback Pedagógico Resiliente (Garante funcionamento offline sem quebrar restrições)
    const textoPolido = simularPolimentoPedagogicoRelato(
      rascunhoLimpo, 
      nomeFinal, 
      dadosGenero.generoGramatical
    );
    const textoFinal = limparMetatextoEEncerramentosRelato(textoPolido);

    return NextResponse.json({
      success: true,
      texto_ia: textoFinal,
      provider: 'polidor-pedagogico-plugue',
    });
  } catch (error: any) {
    console.error('Erro no endpoint de polimento de relato:', error);
    return NextResponse.json(
      { error: error?.message || 'Erro interno ao processar polimento de relatório.' },
      { status: 500 }
    );
  }
}
