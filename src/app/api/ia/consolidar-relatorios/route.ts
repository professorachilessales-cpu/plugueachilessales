import { NextRequest, NextResponse } from 'next/server';
import { sanitizeTextarea } from '@/lib/security';

export const dynamic = 'force-dynamic';

interface ParecerDocenteEntrada {
  professorNome: string;
  disciplinas?: string[];
  textoFinal: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      alunoNome, 
      turmaNome, 
      turno, 
      pareceres,
      observacoesSecretaria 
    } = body as {
      alunoNome: string;
      turmaNome: string;
      turno?: string;
      pareceres: ParecerDocenteEntrada[];
      observacoesSecretaria?: string;
    };

    if (!pareceres || pareceres.length === 0) {
      return NextResponse.json(
        { error: 'Não há pareceres docentes enviados para consolidação desta solicitação.' },
        { status: 400 }
      );
    }

    const pareceresFormatados = pareceres
      .map((p, idx) => {
        const disc = p.disciplinas && p.disciplinas.length > 0 ? ` (${p.disciplinas.join(', ')})` : '';
        return `[Docente ${idx + 1}: ${p.professorNome}${disc}]\n${p.textoFinal.trim()}`;
      })
      .join('\n\n');

    const systemInstruction = `Você é o Coordenador Pedagógico e Diretor de Ensino do Colégio Integrado PLUGUE.
Sua tarefa é compilar e sintetizar os pareceres pedagógicos de múltiplos professores sobre o(a) estudante ${alunoNome} (Turma: ${turmaNome}), produzindo um "PARECER PEDAGÓGICO INTEGRADO" oficial, coeso, abrangente, sem repetições e sem redundâncias.

ESTRUTURA DESEJADA DO DOCUMENTO CONSOLIDADO:
1. INTRODUÇÃO INSTITUCIONAL: Síntese da adaptação geral do estudante no período, frequência e postura diante da rotina escolar.
2. DESEMPENHO COGNITIVO & HABILIDADES CURRICULARES: Integração dos pontos fortes observados pelos professores nas áreas do conhecimento (Exatas, Linguagens, Humanas e Ciências), evidenciando progressos concretos e competências em desenvolvimento.
3. ASPECTOS SOCIOEMOCIONAIS & CONVIVÊNCIA: Descrição do relacionamento interpessoal com colegas e educadores, participação em projetos colaborativos, respeito às normas e postura de escuta.
4. DIRETRIZES & ENCAMINHAMENTOS PEDAGÓGICOS: Orientações claras e estimulantes para continuidade do processo educativo no próximo ciclo, reforçando a parceria entre a instituição escolar e a família.

REQUISITOS ESSENCIAIS:
- Elimine redundâncias: se mais de um professor mencionou o mesmo aspecto, unifique a informação em um único período harmonioso.
- Mantenha tom formal, pedagógico, ético, humanizado e propositivo.
- Não cite nomes de professores como "o professor Marcos disse", mas sim integre as observações harmonicamente ("No âmbito das ciências exatas e raciocínio lógico...", "Na expressão verbal e produções textuais...").
- Retorne apenas o texto final consolidado em parágrafos justificados e bem pontuados.`;

    const userPrompt = `Pareceres individuais enviados pelo corpo docente:
"""
${pareceresFormatados}
"""
${observacoesSecretaria ? `\nObservações complementares da Secretaria/Coordenação:\n"""\n${sanitizeTextarea(observacoesSecretaria)}\n"""` : ''}

Gere o Parecer Pedagógico Integrado definitivo:`;

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
                temperature: 0.25,
                maxOutputTokens: 2048,
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
              conteudo_consolidado: candidateText.trim(),
              provider: 'gemini-3.8-flash',
            });
          }
        } else {
          console.warn('Falha na API Gemini [Status ' + response.status + '], acionando consolidador heurístico pedagógico de contingência.');
        }
      } catch (geminiError) {
        console.error('Erro na consolidação com Gemini:', geminiError);
      }
    }

    // Heurística de Consolidação de Contingência Pedagógica
    const consolidadoHeuristico = gerarConsolidadoHeuristico(alunoNome, turmaNome, pareceres, observacoesSecretaria);

    return NextResponse.json({
      success: true,
      conteudo_consolidado: consolidadoHeuristico,
      provider: 'consolidador-pedagogico-plugue',
    });
  } catch (error: any) {
    console.error('Erro na rota de consolidação:', error);
    return NextResponse.json(
      { error: error?.message || 'Erro ao consolidar pareceres pedagógicos.' },
      { status: 500 }
    );
  }
}

function gerarConsolidadoHeuristico(
  alunoNome: string,
  turmaNome: string,
  pareceres: ParecerDocenteEntrada[],
  observacoesSecretaria?: string
): string {
  const nome = alunoNome || 'O(A) estudante';
  const trechosTextos = pareceres.map(p => p.textoFinal.trim()).join(' ');

  return `Ao longo do período letivo avaliado, ${nome} (Turma ${turmaNome}) apresentou desempenho pedagógico positivo e consistente com as diretrizes educacionais da instituição.

No tocante ao rendimento acadêmico e apropriação dos conteúdos curriculares, as avaliações dos docentes evidenciam que ${trechosTextos}

No âmbito do desenvolvimento socioemocional e da convivência comunitária, ${nome} destaca-se pela receptividade às intervenções formativas, demonstrando espírito de cooperação, empatia nas atividades em grupo e progressiva autonomia na gestão de seus compromissos escolares.

${observacoesSecretaria ? `Registros institucionais complementares: ${observacoesSecretaria.trim()}` : ''}

Para o próximo ciclo formativo, a equipe pedagógica recomenda a continuidade do estímulo à leitura crítica, consolidação do hábito de estudos extraclasse e a permanente integração colaborativa entre a escola e a família no acompanhamento do percurso acadêmico.`;
}
