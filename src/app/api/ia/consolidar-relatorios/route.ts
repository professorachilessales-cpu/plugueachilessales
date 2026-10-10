import { NextRequest, NextResponse } from 'next/server';
import { sanitizeTextarea } from '@/lib/security';
import { 
  determinarGeneroEstudante, 
  montarPromptConsolidacaoPedagogica,
  montarSystemPromptConsolidacao, 
  limparMetatextoEEncerramentos
} from '@/lib/pareceres-ia';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

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
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Envie os dados do estudante e os pareceres para consolidação.' }, { status: 400 });
    }
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
      genero: genero || sexo || alunoGenero || (genero_estudante?.toLowerCase().startsWith('fem') ? 'feminino' : genero_estudante?.toLowerCase().startsWith('masc') ? 'masculino' : genero_estudante),
      sexo: sexo || genero || alunoGenero || genero_estudante,
    });

    // Se não há pareceres docentes válidos enviados
    if (!Array.isArray(pareceres) || pareceres.length === 0 || pareceres.some(p => !p || typeof p.textoFinal !== 'string' || !p.textoFinal.trim())) {
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

    // Monta o prompt oficial de consolidação via Groq
    const promptConsolidacao = montarPromptConsolidacaoPedagogica({
      estudanteNome: nomeFinal,
      turmaNome: turmaFinal,
      turmaTurno: turnoFormatado,
      generoGramatical: dadosGenero.generoGramatical,
      listaPareceresProfessores: listaPareceresFormatada,
    });

    const apiKey = (process.env.GROQ_API_KEY || '').trim().replace(/^["']|["']$/g, '').trim();
    if (!apiKey || apiKey.includes('your-key')) {
      return NextResponse.json(
        { error: 'A consolidação com IA ainda não está configurada. Configure GROQ_API_KEY no servidor e faça um novo deploy.' },
        { status: 503 }
      );
    }

    const modeloConfigurado = (process.env.GROQ_MODEL || '').trim().replace(/^["']|["']$/g, '').trim();
    const modelos = [...new Set([modeloConfigurado, 'qwen/qwen3.8-27b', 'openai/gpt-oss-120b'].filter(Boolean))];
    const prazo = Date.now() + 50000;
    for (const [indice, modelo] of modelos.entries()) {
      const tempoRestante = prazo - Date.now();
      if (tempoRestante <= 0) {
        return NextResponse.json({ error: 'A Groq demorou para responder. Tente novamente.' }, { status: 504 });
      }
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + apiKey },
        signal: AbortSignal.timeout(tempoRestante),
        body: JSON.stringify({
          model: modelo,
          messages: [
            { role: 'system', content: montarSystemPromptConsolidacao() },
            { role: 'user', content: promptConsolidacao },
          ],
          temperature: 0.5,
          max_completion_tokens: 3500,
          stream: false,
          ...(modelo === 'qwen/qwen3.8-27b'
            ? { reasoning_effort: 'none', reasoning_format: 'hidden' }
            : modelo === 'openai/gpt-oss-120b' ? { reasoning_effort: 'low' } : {}),
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        const codigo = typeof payload?.error?.code === 'string' ? payload.error.code : '';
        const erroModelo = response.status === 404 || ['model_not_found', 'model_decommissioned', 'model_permission_blocked'].includes(codigo);
        // Tenta outro modelo apenas para recusas específicas de modelo, usando a mesma chave.
        if (erroModelo && indice < modelos.length - 1) continue;
        let error = 'A Groq está temporariamente indisponível. Tente novamente em instantes.';
        let status = 502;
        if (response.status === 429) {
          error = 'O limite de uso da Groq foi atingido. Aguarde um pouco e tente novamente.';
          status = 429;
        } else if (response.status === 401) {
          error = 'A Groq não aceitou a chave. Confira GROQ_API_KEY no servidor e faça um novo deploy.';
          status = 503;
        } else if (erroModelo) {
          error = 'Nenhum dos modelos de consolidação está disponível para esta chave. Confira GROQ_MODEL e libere qwen/qwen3.8-27b ou openai/gpt-oss-120b nas permissões da organização e do projeto no console da Groq.';
          status = 503;
        } else if (response.status === 403) {
          error = 'A Groq negou acesso a esta chave ou projeto. Confira as permissões da organização e do projeto no console da Groq.';
          status = 503;
        } else if (response.status === 400 || response.status === 422) {
          error = 'A Groq rejeitou os parâmetros da consolidação. Confira a compatibilidade do modelo GROQ_MODEL.';
        }
        return NextResponse.json({ error }, { status });
      }

      const json = await response.json();
      const candidate = json.choices?.[0];
      const rawText = typeof candidate?.message?.content === 'string' ? candidate.message.content : '';
      const semRaciocinio = rawText.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
      const textoFinal = limparMetatextoEEncerramentos(semRaciocinio);
      if (!textoFinal || candidate?.finish_reason !== 'stop' || /<\/?think>/i.test(semRaciocinio)) {
        return NextResponse.json(
          { error: 'A Groq não retornou um parecer consolidado completo. Tente novamente.' },
          { status: 502 }
        );
      }

      return NextResponse.json({
        success: true,
        conteudo_consolidado: textoFinal,
        textoConsolidado: textoFinal,
        provider: 'groq-' + modelo,
      });
    }
    return NextResponse.json({ error: 'Não foi possível selecionar um modelo da Groq.' }, { status: 503 });
  } catch (error: any) {
    const timeout = error instanceof Error && ['TimeoutError', 'AbortError'].includes(error.name);
    return NextResponse.json(
      { error: timeout ? 'A Groq demorou para responder. Tente novamente.' : 'Não foi possível consolidar os pareceres. Tente novamente em instantes.' },
      { status: timeout ? 504 : 502 }
    );
  }
}
