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
  const apiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '')
    .trim().replace(/^["']|["']$/g, '').trim();
  if (!apiKey || apiKey.includes('your-key')) {
    return falha('A assistência do Google IA ainda não está configurada. Entre em contato com a equipe responsável.', 503);
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
  // Prioriza o modelo do ambiente; só troca de modelo quando ele não está disponível.
  const modelos = Array.from(new Set([
    texto(process.env.GEMINI_MODEL).replace(/^models\//, ''),
    'gemini-3.8-flash',
    'gemini-flash-latest',
  ].filter(Boolean)));
  const prazo = Date.now() + 55000;

  try {
    for (const modelo of modelos) {
      for (let revisao = 0; revisao < 2; revisao++) {
        const tempoRestante = prazo - Date.now();
        if (tempoRestante <= 0) {
          return falha('O Google IA demorou para responder. Suas observações foram preservadas; tente novamente.', 504);
        }
        const response = await fetch(
          'https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(modelo) + ':generateContent',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
            signal: AbortSignal.timeout(Math.min(25000, tempoRestante)),
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: montarSystemPromptPolimentoDocente() }] },
              contents: [{ role: 'user', parts: [{ text: prompt + (revisao
                ? '\nRedija uma versão mais concisa, com até 200 palavras, terminando em uma frase completa e sem conclusão genérica.' : '') }] }],
              generationConfig: { temperature: 0.55, topP: 0.95, maxOutputTokens: 4096 },
            }),
          }
        );
        if (!response.ok) {
          if (response.status === 404) break;
          if (response.status === 429) {
            return falha('O limite de uso do Google IA foi atingido. Aguarde um pouco e tente novamente. Suas observações foram preservadas.', 429);
          }
          if ([400, 401, 403].includes(response.status)) {
            return falha('Não foi possível autorizar a assistência do Google IA. Entre em contato com a equipe responsável. Suas observações foram preservadas.', 503);
          }
          return falha('O Google IA está temporariamente indisponível. Tente novamente em instantes. Suas observações foram preservadas.', 502);
        }
        const json = await response.json();
        const candidate = json.candidates?.[0];
        // Ignora partes internas de raciocínio e reúne todas as partes de texto da resposta.
        const partes = candidate?.content?.parts;
        const rawText = Array.isArray(partes) ? partes
          .filter((part: { thought?: boolean; text?: string }) => !part.thought && typeof part.text === 'string')
          .map((part: { text: string }) => part.text).join('\n') : '';
        const resultado = limparMetatextoEEncerramentosRelato(rawText);
        if (candidate?.finishReason === 'MAX_TOKENS' || resultado.split(/\s+/u).length > 200) {
          if (revisao === 0) continue;
          return falha('A IA não conseguiu produzir um relatório completo de até 200 palavras. Tente novamente. Suas observações foram preservadas.', 502);
        }
        if (!resultado || candidate?.finishReason !== 'STOP') {
          return falha('O Google IA não retornou um parecer válido para essas observações. Revise o texto e tente novamente.', 502);
        }
        return NextResponse.json({
          success: true,
          texto_ia: resultado,
          provider: 'google-gemini-' + modelo,
          genero_aplicado: genero,
          nome_estudante: nome,
          tentativa: Number(body.tentativa) || 1,
        });
      }
    }
    return falha('O modelo do Google IA não está disponível. Entre em contato com a equipe responsável pela configuração.', 503);
  } catch (error) {
    if (error instanceof Error && ['TimeoutError', 'AbortError'].includes(error.name)) {
      return falha('O Google IA demorou para responder. Suas observações foram preservadas; tente novamente.', 504);
    }
    return falha('Não foi possível conectar ao Google IA. Tente novamente em instantes. Suas observações foram preservadas.', 502);
  }
}
