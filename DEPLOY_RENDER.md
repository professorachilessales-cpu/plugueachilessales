# 🚀 Guia de Publicação no Render.com - PLUGUE

O projeto já está 100% configurado para rodar no **Render.com** com banco de dados **Turso (LibSQL)**.

---

## Passo 1: Subir o código para o GitHub ou GitLab

Como o Render realiza o deploy a partir de um repositório Git, execute no terminal do seu projeto:

```powershell
# 1. Inicializar o Git
git init

# 2. Adicionar os arquivos (o .gitignore já está configurado para não enviar dados sensíveis ou arquivos pesados)
git add .

# 3. Fazer o primeiro commit
git commit -m "feat: configuracao para deploy no render com turso db"

# 4. Vincular ao seu repositório remoto no GitHub (substitua pela sua URL)
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/SEU_REPOSITORIO.git

# 5. Enviar o código
git push -u origin main
```

---

## Passo 2: Criar o Web Service no Render

1. Acesse o [Dashboard do Render](https://dashboard.render.com/).
2. Clique no botão **New +** e selecione **Web Service**.
3. Conecte sua conta do GitHub/GitLab e selecione o repositório do **PLUGUE**.

---

## Passo 3: Configurar os Parâmetros do Serviço

Preencha os campos da seguinte forma:

| Campo | Valor |
|---|---|
| **Name** | `plugue-escola` (ou outro nome de sua preferência) |
| **Region** | `Oregon (US West)` ou `Ohio (US East)` |
| **Branch** | `main` |
| **Root Directory** | *(deixe em branco)* |
| **Runtime** | `Node` |
| **Build Command** | `npm install && npm run build` |
| **Start Command** | `npm run start` |
| **Instance Type** | `Free` (ou pago se preferir sem hibernação) |

---

## Passo 4: Adicionar as Variáveis de Ambiente (Environment Variables)

Acesse a seção **Environment Variables** no Render e adicione as seguintes chaves:

1. **`NODE_ENV`**:
   ```
   production
   ```

2. **`TURSO_DATABASE_URL`**:
   ```
   libsql://plugueachiles-achilessales.aws-us-west-2.turso.io
   ```

3. **`TURSO_AUTH_TOKEN`**:
   ```
   eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJnaWQiOiJiZWJmOGFkYi00NjNkLTQ2NDctYWE3Yi1hY2RiNjA3ZDA2ZjkiLCJpYXQiOjE3OTAxOTI5MjAsImtpZCI6InZXd1FEZ29POHVQc3FFY0lMOVloZzlxSm5SMjlqVWlaSWdQcW41U3AxQk0iLCJyaWQiOiIyOWE0Y2YzNS05M2FhLTRkMmUtOTA2My04NDQ1NmQ1MDNjNGMifQ.4ESQbOOPJw45FGHv9RbhRLtfMT2m72ptAhfVBG6k0utCdDqmCIZN3PpP3tgmrmZ7LtcfgjuexLPpoDcrMTfLAQ
   ```

*(Opcional: Se utilizar integração do Google Drive, adicione também suas chaves do Google).*

---

## Passo 5: Concluir o Deploy

1. Clique em **Create Web Service**.
2. O Render iniciará a instalação de dependências e a compilação do Next.js.
3. Ao finalizar, você receberá a URL pública (ex.: `https://plugue-escola.onrender.com`).
