# 🚀 Guia de Publicação no Render.com - PLUGUE

O projeto está 100% configurado para rodar no **Render.com** integrado nativamente ao banco de dados **Turso (LibSQL Cloud)**.

---

## ⚠️ Diagnóstico e Correções Recentes de Banco de Dados no Render

Se o app no Render não estava lendo o banco de dados, os motivos identificados e corrigidos no código foram:
1. **Barras finais na URL**: Uma barra no final (`.turso.io/`) causava rota `//v2/pipeline`, retornando **404 Not Found**. O código agora remove barras finais automaticamente.
2. **Aspas nos Valores das Variáveis**: Copiar variáveis entre aspas (ex.: `"libsql://..."` ou `"eyJhb..."`) causava erro de parsing e **400 Bad Request**. O sanitizador interno agora remove aspas automaticamente.
3. **Variável `TURSO_AUTH_TOKEN` desincronizada**: O arquivo `render.yaml` agora contém o token configurado e o fallback direto em código, impedindo que o app inicie sem credenciais.
4. **Versão do Node no Render**: O Next.js 15 requer Node >= 20. Configurado `NODE_VERSION: 20.18.0` no `render.yaml` e `engines` no `package.json`.

---

## Passo 1: Subir as alterações para o GitHub

Execute no terminal:

```powershell
git add .
git commit -m "fix(turso): corrigir leitura do banco no Render com sanitizacao de URL e fallback de token"
git push origin main
```

---

## Passo 2: Configurar no Render.com

Se você usa **Blueprints** (recomendado):
1. O Render detectará automaticamente o arquivo `render.yaml` atualizado e aplicará todas as variáveis de ambiente necessárias.

Se você configurou o **Web Service manualmente**:
Acesse o [Dashboard do Render](https://dashboard.render.com/) -> selecione seu Web Service -> **Environment**:

| Chave | Valor (sem aspas!) |
|---|---|
| `NODE_ENV` | `production` |
| `NODE_VERSION` | `20.18.0` |
| `TURSO_DATABASE_URL` | `libsql://plugueachiles-achilessales.aws-us-west-2.turso.io` |
| `TURSO_AUTH_TOKEN` | `eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJnaWQiOiJiZWJmOGFkYi00NjNkLTQ2NDctYWE3Yi1hY2RiNjA3ZDA2ZjkiLCJpYXQiOjE3OTAxOTI5MjAsImtpZCI6InZXd1FEZ29POHVQc3FFY0lMOVloZzlxSm5SMjlqVWlaSWdQcW41U3AxQk0iLCJyaWQiOiIyOWE0Y2YzNS05M2FhLTRkMmUtOTA2My04NDQ1NmQ1MDNjNGMifQ.4ESQbOOPJw45FGHv9RbhRLtfMT2m72ptAhfVBG6k0utCdDqmCIZN3PpP3tgmrmZ7LtcfgjuexLPpoDcrMTfLAQ` |

> ⚠️ **IMPORTANTE**: Certifique-se de **NÃO** colocar aspas duplas (`"`) ou simples (`'`) nos valores dentro do painel do Render.

---

## Passo 3: Testar e Validar

Após o novo deploy concluir no Render, acesse no navegador:
- `https://SEU-APP.onrender.com/api/turso/status`

Essa rota deve responder:
```json
{
  "configured": true,
  "connected": true,
  "dbUrl": "libsql://plugueachiles-achilessales.aws-us-west-2.turso.io",
  "serverTime": "...",
  "tables": ["..."]
}
```
Isso confirma que o servidor em nuvem está com leitura e escrita ativas no banco de dados Turso.
