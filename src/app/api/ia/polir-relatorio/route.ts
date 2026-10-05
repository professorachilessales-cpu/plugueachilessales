import { NextRequest, NextResponse } from 'next/server';
import { sanitizeTextarea } from '@/lib/security';
import { 
  determinarGeneroEstudante,
  montarSystemPromptPolimentoDocente,
  montarPromptPolimentoDocente,
  montarPromptPipelinePolimentoRelato, 
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
      professorNome,
      tentativa = 1,
      apiKey: customApiKey,
      geminiApiKey: customGeminiApiKey,
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

    const numTentativa = Number(tentativa) || 1;
    const promptPipeline = montarPromptPolimentoDocente({
      estudanteNome: nomeFinal,
      generoGramatical: dadosGenero.generoGramatical,
      disciplinaNome: disciplina,
      textoOriginalProfessor: rascunhoLimpo,
    });

    // 1. Provedor Primário: Google Gemini API Oficial
    const rawKey = (customApiKey || customGeminiApiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '').trim();
    const geminiApiKey = rawKey.replace(/^["']|["']$/g, '').trim();
    let statusGoogleErro: string | null = null;
    let motivoGoogleErro: string | null = null;

    if (geminiApiKey && !geminiApiKey.includes('your-key')) {
      const modelosGemini = [
        process.env.GEMINI_MODEL,
        'gemini-3.8-flash',
        'gemini-3.8',
        'gemini-2.5-flash',
        'gemini-1.5-flash',
        'gemini-2.0-flash',
        'gemini-2.5-pro',
        'gemini-flash-latest'
      ].filter(Boolean) as string[];

      const systemInstructionText = montarSystemPromptPolimentoDocente();

      for (const modelo of modelosGemini) {
        try {
          // Tentativa A: generateContent com systemInstruction e parâmetros equilibrados (temp 0.55, topP 0.95, topK 40, maxTokens 1500)
          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${geminiApiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                systemInstruction: {
                  parts: [{ text: systemInstructionText }]
                },
                contents: [
                  {
                    role: 'user',
                    parts: [{ text: promptPipeline }],
                  },
                ],
                generationConfig: {
                  temperature: 0.55, // Faixa 0.5 a 0.6 padronizada com o módulo administrativo
                  topP: 0.95,
                  topK: 40,
                  maxOutputTokens: 1500,
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
                provider: `google-gemini-${modelo}`,
                genero_aplicado: dadosGenero.generoGramatical,
                nome_estudante: nomeFinal,
                tentativa: numTentativa,
              });
            }
          } else {
            let erroInfoGoogle: any = null;
            try {
              erroInfoGoogle = await response.json();
            } catch (_) {}

            // Interrupção imediata se a chave ou o projeto estiver bloqueado pelo Google (403 PERMISSION_DENIED)
            if (response.status === 403 || erroInfoGoogle?.error?.status === 'PERMISSION_DENIED') {
              const motivo = erroInfoGoogle?.error?.details?.[0]?.reason || erroInfoGoogle?.error?.message || 'API_KEY_SERVICE_BLOCKED';
              console.warn(`[Google Gemini API] Chave restrita/bloqueada no Google Cloud (${response.status}: ${motivo}). Evitando chamadas redundantes.`);
              statusGoogleErro = 'bloqueada_403';
              motivoGoogleErro = motivo;
              break;
            }

            // Se for 400 por chave inválida, também interrompe imediatamente
            if (response.status === 400 && erroInfoGoogle?.error?.message?.includes('API key not valid')) {
              statusGoogleErro = 'chave_invalida';
              motivoGoogleErro = 'API key not valid';
              break;
            }

            // Se generateContent não funcionou, tenta endpoint interactions
            try {
              const interactionsResponse = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/interactions?key=${geminiApiKey}`,
                {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    model: modelo,
                    system_instruction: systemInstructionText,
                    input: promptPipeline,
                    generation_config: {
                      temperature: 0.55,
                      max_output_tokens: 1500,
                    }
                  }),
                }
              );

              if (interactionsResponse.ok) {
                const interJson = await interactionsResponse.json();
                const interText = interJson.output_text || 
                  interJson.steps?.find((s: any) => s.type === 'model_output')?.content?.find((c: any) => c.type === 'text')?.text;
                if (interText && interText.trim().length > 0) {
                  const textoFinal = limparMetatextoEEncerramentosRelato(interText);
                  return NextResponse.json({
                    success: true,
                    texto_ia: textoFinal,
                    provider: `google-gemini-interactions-${modelo}`,
                    genero_aplicado: dadosGenero.generoGramatical,
                    nome_estudante: nomeFinal,
                    tentativa: numTentativa,
                  });
                }
              }
            } catch (interError) {
              // segue para o próximo modelo ou fallback
            }
          }
        } catch (geminiError) {
          console.warn(`[Google Gemini API] Tentativa com ${modelo} falhou:`, geminiError);
        }
      }
    }

    // 2. Provedor Secundário: OpenAI API (se configurado no ambiente)
    const rawOpenAiKey = process.env.OPENAI_API_KEY || '';
    const openAiApiKey = rawOpenAiKey.replace(/^["']|["']$/g, '').trim();
    if (openAiApiKey && openAiApiKey !== '' && !openAiApiKey.includes('your-key')) {
      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openAiApiKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: montarSystemPromptPolimentoDocente()
              },
              { role: 'user', content: promptPipeline },
            ],
            temperature: 0.55,
            top_p: 0.95,
            max_tokens: 1500,
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
              provider: 'openai-gpt-4o-mini',
              genero_aplicado: dadosGenero.generoGramatical,
              nome_estudante: nomeFinal,
            });
          }
        }
      } catch (openAiError) {
        console.warn('Tentativa com OpenAI falhou:', openAiError);
      }
    }

    // 3. Fallback Pedagógico Resiliente de Alta Precisão (Garante funcionamento ininterrupto)
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
      status_google: statusGoogleErro || 'indisponivel',
      motivo_google: motivoGoogleErro || undefined,
      aviso_chave: statusGoogleErro === 'bloqueada_403'
        ? 'A chave do Google Gemini no servidor foi rejeitada pelo Google Cloud (403 PERMISSION_DENIED / API_KEY_SERVICE_BLOCKED). O relato foi aprimorado pelo motor pedagógico interno Plugue.'
        : undefined,
      genero_aplicado: dadosGenero.generoGramatical,
      nome_estudante: nomeFinal,
    });
  } catch (error: any) {
    console.error('Erro no endpoint de polimento de relato:', error);
    return NextResponse.json(
      { error: error?.message || 'Erro interno ao processar polimento de relatório.' },
      { status: 500 }
    );
  }
}
