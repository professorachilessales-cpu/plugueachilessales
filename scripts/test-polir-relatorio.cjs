// Executar: node --test scripts/test-polir-relatorio.cjs
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

// Carrega os módulos TypeScript reais sem servidor e sem chamadas externas.
const cache = new Map();
function load(file) {
  const filename = path.resolve(file);
  if (cache.has(filename)) return cache.get(filename);
  const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const mod = { exports: {} };
  cache.set(filename, mod.exports);
  const localRequire = (id) => id.startsWith('@/') ? load('src/' + id.slice(2) + '.ts')
    : id.startsWith('.') ? load(path.resolve(path.dirname(filename), id + '.ts')) : require(id);
  vm.runInThisContext('(function(require, module, exports) {' + output + '\n})', { filename })(localRequire, mod, mod.exports);
  return mod.exports;
}
const { POST } = load('src/app/api/ia/polir-relatorio/route.ts');
const input = { rascunho: 'Participa das aulas e precisa avançar na leitura.', estudanteNome: 'Alice', estudanteGenero: 'F', anoEscolar: '4º anos' };
const generated = (text, finishReason = 'STOP') => Response.json({ candidates: [{ finishReason, content: { parts: [{ text }] } }] });

async function run(body, mock, env = {}) {
  const keys = ['GEMINI_API_KEY', 'GOOGLE_API_KEY', 'GEMINI_MODEL'];
  const saved = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  const originalFetch = global.fetch;
  const calls = [];
  try {
    for (const key of keys) delete process.env[key];
    Object.assign(process.env, { GEMINI_API_KEY: 'test-key', GEMINI_MODEL: 'models/gemini-configurado', ...env });
    global.fetch = async (url, options) => {
      calls.push({ url, options, payload: JSON.parse(options.body) });
      return mock(calls.length, calls.at(-1));
    };
    const response = await POST({ json: async () => body });
    return { status: response.status, data: await response.json(), calls };
  } finally {
    global.fetch = originalFetch;
    for (const key of keys) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  }
}

test('envia anotações, série, gênero e regras; usa modelo e chave do servidor', async () => {
  const result = await run({ ...input, apiKey: 'ignorar-chave-cliente' }, () => generated('Alice participa das aulas. A estudante precisa avançar na leitura.'));
  assert.equal(result.status, 200);
  assert.match(result.data.texto_ia, /A estudante/);
  const { url, payload, options } = result.calls[0];
  assert.match(url, /gemini-configurado:generateContent$/);
  assert.equal(options.headers['x-goog-api-key'], 'test-key');
  assert.ok(!url.includes('test-key'));
  assert.match(payload.contents[0].parts[0].text, /Alice.*4º anos/);
  assert.match(payload.contents[0].parts[0].text, /feminino/);
  assert.ok(payload.contents[0].parts[0].text.includes(input.rascunho));
  assert.match(payload.systemInstruction.parts[0].text, /no máximo 200 palavras/);
  assert.match(payload.systemInstruction.parts[0].text, /NÃO inclua sugestões finais/);
});

test('gênero ausente não é inferido pelo nome e turma é contexto alternativo', async () => {
  const result = await run({ rascunho: input.rascunho, alunoNome: 'Alice', turmaNome: '5º A' }, () => generated('Alice participa das aulas.'));
  assert.equal(result.data.genero_aplicado, 'não informado');
  assert.match(result.calls[0].payload.contents[0].parts[0].text, /5º A/);
});

test('reúne partes de texto e ignora partes de raciocínio', async () => {
  const result = await run(input, () => Response.json({ candidates: [{ finishReason: 'STOP', content: { parts: [
    { text: 'raciocínio interno', thought: true }, { text: 'Alice participa.' }, { text: 'Precisa avançar na leitura.' },
  ] } }] }));
  assert.equal(result.data.texto_ia, 'Alice participa.\nPrecisa avançar na leitura.');
});

test('aceita exatamente 200 palavras', async () => {
  const result = await run(input, () => generated(Array(200).fill('palavra').join(' ') + '.'));
  assert.equal(result.status, 200);
  assert.equal(result.calls.length, 1);
});

test('pede nova versão se ultrapassar 200 palavras e nunca corta uma frase', async () => {
  const result = await run(input, n => generated(n === 1 ? Array(201).fill('palavra').join(' ') : 'Alice participa das aulas.'));
  assert.equal(result.calls.length, 2);
  assert.equal(result.data.texto_ia, 'Alice participa das aulas.');
});

test('rejeita duas respostas extensas em vez de substituir o rascunho', async () => {
  const result = await run(input, () => generated(Array(201).fill('palavra').join(' ')));
  assert.equal(result.status, 502);
  assert.equal(result.calls.length, 2);
  assert.equal(result.data.texto_ia, undefined);
});

test('rejeita resposta truncada mesmo com menos de 200 palavras', async () => {
  const result = await run(input, () => generated('Texto interrompido', 'MAX_TOKENS'));
  assert.equal(result.status, 502);
  assert.equal(result.calls.length, 2);
});

for (const [status, expected] of [[429, 429], [403, 503], [401, 503], [400, 503], [500, 502]]) {
  test('erro Google ' + status + ' retorna feedback sem fallback silencioso', async () => {
    const result = await run(input, () => Response.json({ error: { message: 'detalhes privados' } }, { status }));
    assert.equal(result.status, expected);
    assert.equal(result.calls.length, 1);
    assert.ok(result.data.error);
    assert.ok(!result.data.error.includes('detalhes privados'));
    assert.equal(result.data.texto_ia, undefined);
  });
}

test('modelo indisponível permite fallback para outro modelo Gemini', async () => {
  const result = await run(input, n => n === 1 ? new Response(null, { status: 404 }) : generated('Alice participa das aulas.'));
  assert.equal(result.status, 200);
  assert.equal(result.calls.length, 2);
  assert.match(result.calls[1].url, /gemini-3.8-flash/);
});

for (const [name, expected] of [['TimeoutError', 504], ['TypeError', 502]]) {
  test(name + ' preserva rascunho e devolve mensagem amigável', async () => {
    const result = await run(input, () => { const error = new Error('não expor'); error.name = name; throw error; });
    assert.equal(result.status, expected);
    assert.match(result.data.error, /preservadas/);
    assert.equal(result.data.texto_ia, undefined);
  });
}

test('resposta vazia ou bloqueada não é salva como relatório', async () => {
  for (const mock of [() => Response.json({}), () => generated('bloqueado', 'SAFETY'), () => generated('')]) {
    const result = await run(input, mock);
    assert.equal(result.status, 502);
    assert.equal(result.data.texto_ia, undefined);
  }
});

test('sem chave ou sem anotações não chama o Google', async () => {
  const noKey = await run(input, () => assert.fail('chamada inesperada'), { GEMINI_API_KEY: '' });
  assert.equal(noKey.status, 503);
  const noText = await run({ rascunho: '' }, () => assert.fail('chamada inesperada'));
  assert.equal(noText.status, 400);
});

test('limpa metatexto e seções finais proibidas', async () => {
  const result = await run(input, () => generated('Segue o parecer: Alice participa das aulas.\nPróximos passos: Estimular leitura.'));
  assert.equal(result.data.texto_ia, 'Alice participa das aulas.');
});
