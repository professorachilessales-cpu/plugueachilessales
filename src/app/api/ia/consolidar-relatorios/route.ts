import { NextRequest, NextResponse } from 'next/server';
import { sanitizeTextarea } from '@/lib/security';
import { 
  determinarGeneroEstudante, 
  montarPromptConsolidacaoPedagogica,
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
      alunoGenero,
      genero,
      sexo,
      turmaNome, 
      turma_nome,
      turno, 
      turma_turno,
      pareceres = [],
      anotacoesPedagogicas = [],
      observacoesSecretaria 
    } = body as {
      alunoNome?: string;
      nome_estudante?: string;
      genero_estudante?: string;
      alunoGenero?: string;
      genero?: string;
      sexo?: string;
      turmaNome?: string;
      turma_nome?: string;
      turno?: string;
      turma_turno?: string;
      pareceres: ParecerDocenteEntrada[];
      anotacoesPedagogicas?: AnotacaoPedagogicaEntrada[];
      observacoesSecretaria?: string;
    };

    const nomeFinal = (nome_estudante || alunoNome || 'Estudante').trim();
    const turmaFinal = (turma_nome || turmaNome || 'Turma Regular').trim();
    
    // Normalização amigável de turno
    const turnoBruto = (turma_turno || turno || '').trim().toLowerCase();
    const turnoFormatado = turnoBruto === 'manha' || turnoBruto === 'manhã' 
      ? 'Manhã' 
      : turnoBruto === 'tarde' 
        ? 'Tarde' 
        : turnoBruto === 'noite' 
          ? 'Noite' 
          : (turma_turno || turno || 'Regular');

    // Determina os parâmetros de gênero e concordância nominal
    const dadosGenero = determinarGeneroEstudante({
      nome_completo: nomeFinal,
      genero: genero_estudante || alunoGenero || genero || sexo,
      sexo: sexo || genero || alunoGenero || genero_estudante,
    });

    // Se não há pareceres docentes válidos enviados
    if (!pareceres || pareceres.length === 0) {
      return NextResponse.json(
        { error: 'Não há pareceres docentes enviados para consolidação desta solicitação.' },
        { status: 400 }
      );
    }

    // Formatação exclusiva da lista de pareceres dos professores para o prompt (sem registros contínuos)
    const blocosTextos: string[] = [];

    // Pareceres descritivos de professores e equipe de apoio
    pareceres.forEach((p, idx) => {
      const disc = p.disciplinas && p.disciplinas.length > 0 ? ` - ${p.disciplinas.join(', ')}` : '';
      const papel = p.ehApoio ? 'Equipe de Apoio & Inclusão' : 'Docente Regente';
      blocosTextos.push(`[${papel} ${idx + 1}: ${p.professorNome}${disc}]\n${p.textoFinal.trim()}`);
    });

    // Observações institucionais da Secretaria Escolar (se houver)
    if (observacoesSecretaria && observacoesSecretaria.trim()) {
      blocosTextos.push(`[Observações da Secretaria / Gestão Escolar]\n${sanitizeTextarea(observacoesSecretaria.trim())}`);
    }

    const listaPareceresFormatada = blocosTextos.join('\n\n');

    // Monta o prompt oficial de consolidação via Gemini
    const promptConsolidacao = montarPromptConsolidacaoPedagogica({
      estudanteNome: nomeFinal,
      turmaNome: turmaFinal,
      turmaTurno: turnoFormatado,
      generoGramatical: dadosGenero.generoGramatical,
      listaPareceresProfessores: listaPareceresFormatada,
    });

    // 1. Provedor Primário: Google Gemini API Oficial (modelos da família Gemini com fallback em cascata)
    const geminiApiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '').trim();

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

      for (const modelo of modelosGemini) {
        try {
          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${geminiApiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                systemInstruction: {
                  parts: [
                    {
                      text: 'Você é um coordenador pedagógico sênior e especialista em redação institucional avaliativa escolar, operando via Gemini. Sua missão é ler todos os relatórios e apontamentos individuais enviados pelos diferentes professores de um estudante e consolidá-los em um parecer único, abrangente, rico e pedagogicamente sofisticado. Siga rigorosamente as diretrizes e retorne EXCLUSIVAMENTE o texto pedagógico consolidado e contínuo, pronto para o documento oficial, sem qualquer saudação, preâmbulo, nota, menção a registros contínuos ou tópico final de encaminhamentos.'
                    }
                  ]
                },
                contents: [
                  {
                    role: 'user',
                    parts: [{ text: promptConsolidacao }],
                  },
                ],
                generationConfig: {
                  temperature: 0.5,
                  topP: 0.95,
                  topK: 40,
                  maxOutputTokens: 3500,
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
                provider: `google-gemini-${modelo}`,
              });
            }
          } else {
            const errorBody = await response.text();
            console.warn(`[Google Gemini API] Falha no modelo ${modelo} (HTTP ${response.status}):`, errorBody);
          }
        } catch (geminiError) {
          console.warn(`[Google Gemini API] Tentativa com ${modelo} falhou:`, geminiError);
        }
      }
    }

    // 2. Provedor Secundário: OpenAI API (se configurado)
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
              { role: 'user', content: promptConsolidacao },
            ],
            temperature: 0.7,
            top_p: 0.95,
            max_tokens: 2500,
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

    // 3. Fallback Heurístico Pedagógico de Alta Precisão (Sem metatexto, sem registros contínuos, concordância de gênero estrita)
    const consolidadoHeuristico = gerarConsolidadoHeuristico({
      nomeEstudante: nomeFinal,
      generoGramatical: dadosGenero.generoGramatical,
      turmaNome: turmaFinal,
      pareceres,
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
