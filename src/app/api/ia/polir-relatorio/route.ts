import { NextRequest, NextResponse } from 'next/server';
import { sanitizeTextarea } from '@/lib/security';
import {
  montarSystemPromptPolimentoDocente,
  montarPromptPolimentoDocente,
  limparMetatextoEEncerramentosRelato,
} from '@/lib/pareceres-ia';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const texto = (value: unknown): string => typeof value === 'string' ? value.trim() : '';
const falha = (error: string, status: number) => NextResponse.json({ error }, { status });

export async function POST(req: NextRequest) {
  let body;
  try {
    body = await req.json();
  } catch {
    return falha('Não foi possível ler as observações. Tente novamente.', 400);
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return falha('Envie as observações do estudante para elaborar o relatório.', 400);
  }

  const rascunho = sanitizeTextarea(body.rascunho);
  if (rascunho.length < 5) {
    return falha('Por favor, insira um relato preliminar com mais detalhes para que a IA possa refinar.', 400);
  }

  // As credenciais são lidas somente no servidor, a partir do ambiente configurado.
  const apiKey = (process.env.GROQ_API_KEY || '')
    .trim().replace(/^["']|["']$/g, '').trim();
  if (!apiKey || apiKey.includes('your-key')) {
    return falha('A assistência de IA ainda não está configurada. Cadastre GROQ_API_KEY no ambiente Production da Vercel e faça um novo deploy.', 503);
  }

  const nome = texto(body.estudanteNome) || texto(body.alunoNome) || texto(body.nome_estudante) || 'Estudante';
  const generoCadastro = (texto(body.estudanteGenero) || texto(body.alunoGenero) || texto(body.genero) || texto(body.sexo)).toLowerCase();
  const genero = ['f', 'feminino', 'mulher'].includes(generoCadastro) ? 'feminino'
    : ['m', 'masculino', 'homem'].includes(generoCadastro) ? 'masculino' : 'não informado';
  const prompt = montarPromptPolimentoDocente({
    estudanteNome: nome,
    generoGramatical: genero,
    anoEscolar: texto(body.anoEscolar) || texto(body.serie) || texto(body.turmaNome),
    disciplinaNome: texto(body.disciplina),
    textoOriginalProfessor: rascunho,
  });
  const modelo = texto(process.env.GROQ_MODEL) || 'qwen/qwen3.8-27b';
  const prazo = Date.now() + 55000;
  const preservado = ' Suas observações foram preservadas.';

  try {
    for (let revisao = 0; revisao < 2; revisao++) {
      const tempoRestante = prazo - Date.now();
      if (tempoRestante <= 0) {
        return falha('A IA demorou para responder. Tente novamente.' + preservado, 504);
      }
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + apiKey },
        signal: AbortSignal.timeout(Math.min(25000, tempoRestante)),
        body: JSON.stringify({
          model: modelo,
          messages: [
            { role: 'system', content: montarSystemPromptPolimentoDocente() },
            { role: 'user', content: prompt + (revisao
              ? '\nRedija uma versão mais concisa, com até 200 palavras, terminando em uma frase completa e sem conclusão genérica.' : '') },
          ],
          temperature: 0.55,
          top_p: 0.95,
          max_completion_tokens: 2048,
          stream: false,
          // O modo de redação do Qwen economiza tokens e retorna apenas o parecer.
          ...(modelo === 'qwen/qwen3.8-27b'
            ? { reasoning_effort: 'none', reasoning_format: 'hidden' } : {}),
        }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        const code = texto(payload?.error?.code);
        const codigosModelo = ['model_not_found', 'model_decommissioned', 'model_permission_blocked'];
        // Nunca registra a chave, as anotações ou a mensagem bruta do provedor.
        console.warn('[Groq] Chamada recusada', {
          httpStatus: response.status,
          codigo: codigosModelo.includes(code) ? code : 'OUTRO',
        });
        if (response.status === 429) {
          return falha('O limite de uso da Groq foi atingido. Aguarde um pouco e tente novamente.' + preservado, 429);
        }
        if (response.status === 401) {
          return falha('A Groq não aceitou a chave. Confira GROQ_API_KEY na Vercel e faça um novo deploy após corrigi-la.' + preservado, 503);
        }
        if (response.status === 403 || code === 'model_permission_blocked') {
          return falha('A Groq negou acesso ao modelo. Confira as permissões do modelo na sua organização ou projeto no console da Groq.' + preservado, 503);
        }
        if (response.status === 404 || codigosModelo.includes(code)) {
          return falha('O modelo da Groq não está disponível. Confira GROQ_MODEL ou remova essa variável para usar o modelo padrão.' + preservado, 503);
        }
        if (response.status === 400 || response.status === 422) {
          return falha('A Groq rejeitou os parâmetros da chamada. A equipe responsável deve conferir a compatibilidade do modelo GROQ_MODEL.' + preservado, 502);
        }
        return falha('A Groq está temporariamente indisponível. Tente novamente em instantes.' + preservado, 502);
      }
      const json = await response.json();
      const candidate = json.choices?.[0];
      // A resposta útil fica em content; message.reasoning não deve ir para o editor.
      const rawText = texto(candidate?.message?.content);
      const semRaciocinio = rawText.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
      if (/<\/?think>/i.test(semRaciocinio)) {
        return falha('A IA não retornou um parecer válido. Tente novamente.' + preservado, 502);
      }
      const resultado = limparMetatextoEEncerramentosRelato(semRaciocinio);
      if (candidate?.finish_reason === 'length' || resultado.split(/\s+/u).length > 200) {
        if (revisao === 0) continue;
        return falha('A IA não conseguiu produzir um relatório completo de até 200 palavras. Tente novamente.' + preservado, 502);
      }
      if (!resultado || candidate?.finish_reason !== 'stop') {
        return falha('A IA não retornou um parecer válido para essas observações. Revise o texto e tente novamente.' + preservado, 502);
      }
      return NextResponse.json({
        success: true,
        texto_ia: resultado,
        provider: 'groq-' + modelo,
        genero_aplicado: genero,
        nome_estudante: nome,
        tentativa: Number(body.tentativa) || 1,
      });
    }
    return falha('A IA não conseguiu concluir o parecer. Tente novamente.' + preservado, 502);
  } catch (error) {
    if (error instanceof Error && ['TimeoutError', 'AbortError'].includes(error.name)) {
      return falha('A IA demorou para responder. Tente novamente.' + preservado, 504);
    }
    return falha('Não foi possível conectar à Groq. Tente novamente em instantes.' + preservado, 502);
  }
}
