import { NextRequest, NextResponse } from 'next/server';
import { sanitizeTextarea } from '@/lib/security';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { rascunho, alunoNome, turmaNome, disciplina, professorNome } = body;

    const rascunhoLimpo = sanitizeTextarea(rascunho);
    if (!rascunhoLimpo || rascunhoLimpo.trim().length < 5) {
      return NextResponse.json(
        { error: 'Por favor, insira um relato preliminar com mais detalhes para que a IA possa refinar.' },
        { status: 400 }
      );
    }

    const systemInstruction = `Você é um assistente e consultor pedagógico especializado do Colégio Integrado PLUGUE.
Sua missão é reescrever o relato do professor sobre o estudante ${alunoNome || 'o estudante'} (Turma: ${turmaNome || 'não informada'}), mantendo estritamente todos os fatos observados, adaptando o texto para um tom formal, pedagógico, construtivo, ético e humanizado.

DIRETRIZES FUNDAMENTAIS:
1. Preserve todas as informações factuais relatadas pelo docente (engajamento, atenção, desenvolvimento socioemocional, facilidades, pontos de melhoria, postura e relacionamento em grupo).
2. Não invente diagnósticos clínicos nem fatos que não constem no relato original.
3. Utilize linguagem polida e respeitosa, destacando o potencial de aprendizagem e estratégias colaborativas.
4. Elimine gírias, expressões coloquiais e ambiguidades.
5. Retorne APENAS o texto aprimorado final, estruturado em parágrafos coesos, sem introduções explicativas ou saudações.`;

    const userPrompt = `Relato preliminar do professor ${professorNome || 'Docente'}${disciplina ? ` (${disciplina})` : ''}:
"""
${rascunhoLimpo}
"""

Reescreva o parecer pedagógico conforme as instruções de tom formal e humanizado:`;

    const geminiApiKey = process.env.GEMINI_API_KEY;

    if (geminiApiKey && geminiApiKey.trim() !== '' && !geminiApiKey.includes('your-key')) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${geminiApiKey.trim()}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                {
                  role: 'user',
                  parts: [{ text: `${systemInstruction}\n\n${userPrompt}` }],
                },
              ],
              generationConfig: {
                temperature: 0.3,
                maxOutputTokens: 1024,
              },
            }),
          }
        );

        if (response.ok) {
          const json = await response.json();
          const candidateText = json.candidates?.[0]?.content?.parts?.[0]?.text;
          if (candidateText && candidateText.trim().length > 0) {
            return NextResponse.json({
              success: true,
              texto_ia: candidateText.trim(),
              provider: 'gemini-3.8-flash',
            });
          }
        } else {
          console.warn('Falha na API Gemini [Status ' + response.status + '], acionando polimento pedagógico inteligente de contingência.');
        }
      } catch (geminiError) {
        console.error('Erro na requisição Gemini:', geminiError);
      }
    }

    // Heurística de Polimento Pedagógico Inteligente Humanizado (Garante funcionamento resiliente offline e de demonstração)
    const textoPolido = simularPolimentoPedagogico(rascunhoLimpo, alunoNome);

    return NextResponse.json({
      success: true,
      texto_ia: textoPolido,
      provider: 'polidor-pedagogico-plugue',
    });
  } catch (error: any) {
    console.error('Erro no endpoint de polimento:', error);
    return NextResponse.json(
      { error: error?.message || 'Erro interno ao processar polimento de relatório.' },
      { status: 500 }
    );
  }
}

function simularPolimentoPedagogico(textoOriginal: string, alunoNome?: string): string {
  const nome = alunoNome || 'O(A) estudante';
  
  // Tratamento de frases e pontuações
  let texto = textoOriginal.trim();
  if (!texto.endsWith('.')) texto += '.';

  // Substituições de termos coloquiais para vocabulário pedagógico humanizado
  const substituicoes: [RegExp, string][] = [
    [/\bnao faz nada\b/gi, 'apresenta resistência na execução das atividades propostas'],
    [/\bbagunceiro\b/gi, 'evidencia agitação psicomotora e momentos de dispersão'],
    [/\bpreguicoso\b/gi, 'demanda incentivo contínuo e mediação pedagógica para engajamento'],
    [/\bnao aprende\b/gi, 'encontra-se em processo de apropriação dos conteúdos com ritmo próprio'],
    [/\binteligente\b/gi, 'dotado de grande perspicácia analítica e raciocínio estruturado'],
    [/\blegal\b/gi, 'demonstra excelente sociabilidade e cooperação harmoniosa'],
    [/\bchato\b/gi, 'apresenta pontuais desafios na autorregulação socioemocional'],
    [/\bso conversa\b/gi, 'tende a expressar-se com frequência verbal durante as explicações coletivas'],
    [/\bmuito bom\b/gi, 'notável desempenho e dedicação exemplar'],
    [/\bfraco\b/gi, 'necessita de intervenções didáticas complementares para consolidação de habilidades'],
  ];

  substituicoes.forEach(([regex, substituto]) => {
    texto = texto.replace(regex, substituto);
  });

  return `Ao longo do período pedagógico avaliado, observou-se que ${nome} ${texto.charAt(0).toLowerCase() + texto.slice(1)} Demonstra potencial contínuo de evolução em suas competências socioemocionais e cognitivas, sendo recomendado o acompanhamento colaborativo entre o corpo docente e a família para fortalecimento de sua autonomia escolar.`;
}
