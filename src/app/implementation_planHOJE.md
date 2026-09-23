# Plano de Implementação: Modernização da Sidebar, Gestão de Usuários & Permissões (RBAC) e Primeiro Acesso

Implementação completa das melhorias de UX/UI no menu lateral (Sidebar retrátil com persistência, tooltips, área de clique ampliada e feedback de tema), módulo de Gestão de Usuários & Permissões para Administradores, fluxo de primeiro acesso por CPF com troca obrigatória de senha, barreiras de segurança RBAC (403 Forbidden e ocultação de menus restritos) e inicialização do servidor de desenvolvimento.

---

## 1. Mudanças Propostas

### 🎨 A. UX/UI: Modernização da Sidebar (`Sidebar.tsx` & `AppLayout.tsx`)
- **Área de Clique Otimizada**:
  - Altura mínima de 48px (`min-h-[48px]` ou `h-12`) e padding confortável (`px-3.5 py-3`).
  - Container do link como bloco clicável (`flex w-full rounded-xl transition-all`).
- **Modo Retrátil (Collapse / Expand)**:
  - Botão de alternância com ícone de Chevron/Menu localizado estrategicamente no cabeçalho ou rodapé da Sidebar.
  - Estado Expandido (~256px / `w-64`): Exibe ícone, título do módulo e badges.
  - Estado Contraído (~72px / `w-[72px]`): Oculta textos e badges, centraliza ícones.
  - **Tooltips Flutuantes**: No modo contraído, ao passar o cursor sobre qualquer ícone, exibir tooltip flutuante fixado à direita com design moderno e animação suave.
  - **Persistência**: Salvar estado na chave `localStorage.getItem('sidebar_collapsed')` e sincronizar com o layout.
- **Adaptação do Layout (`AppLayout.tsx`)**:
  - Ajustar a margem/padding da página principal dinamicamente (`lg:pl-64` quando expandido, `lg:pl-[72px]` quando contraído) com `transition-all duration-300`.
- **Feedback Visual (Hover & Active States)**:
  - **Modo Claro**:
    - Fundo neutro/transparente.
    - Hover: `hover:bg-slate-100 hover:text-slate-900`.
    - Ativo: Fundo realçado (`bg-slate-200/90 text-school-blue-900 dark:text-white`), indicador de borda lateral ativa (`border-l-4 border-school-blue-700`) e peso tipográfico aumentado.
  - **Modo Escuro**:
    - Fundo escuro.
    - Hover: `hover:bg-slate-800 hover:text-slate-100`.
    - Ativo: `bg-slate-800 text-white`, indicador lateral com a cor de acento dourada (`border-l-4 border-school-gold-400`).
- **Filtragem Rígida de Menus para Professor**:
  - Quando no perfil **Professor**, os módulos de **Turmas**, **Estudantes**, **Registro de Atividades (Auditoria)** e **Configurações** são completamente omitidos da lista de navegação.

---

### 👥 B. Módulo de Usuários e Permissões (`src/app/configuracoes/usuarios` e `src/app/configuracoes`)
- **Navegação em Configurações**:
  - Criação da página/aba dedicada: `Configurações ➡️ Usuários & Permissões`.
  - Atalho direto no menu lateral sob Configurações e botão no painel de configurações.
- **Painel de Gestão de Usuários (Exclusivo para Administrador)**:
  - Listagem de usuários cadastrados com filtro por perfil (Administrador vs. Professor) e status (Ativo/Inativo).
  - Modal/Formulário para **Cadastrar Novo Usuário** e **Editar Usuário**:
    - Campos: Nome completo, E-mail, CPF (apenas números ou formatado com máscara e validação).
    - Seleção de Perfil: Administrador ou Professor.
    - Se Professor, exibir a **Matriz de Permissões**:
      - `[x] Perfil` (Sempre ativo e bloqueado para alteração).
      - `[ ] Diário de Classe / Frequência` (Opcional).
      - `[ ] Lançamento de Notas` (Opcional).
      - `[ ] Conteúdos e Aulas` (Opcional).
      - *(Estudantes, Turmas e Auditoria NUNCA aparecem como opção de concessão).*
  - Botão de **Resetar Senha para o CPF Padrão**: redefine a senha para o CPF (apenas dígitos) e marca `must_change_password = true`.
  - Botão de **Alternar Status (Ativo / Inativo)**.

---

### 🔑 C. Fluxo de Primeiro Acesso & Redefinição Obrigatória de Senha
- **Regra de Credenciais**:
  - Usuário padrão / Professor criado recebe como login o CPF (11 dígitos) e como senha inicial o mesmo CPF.
  - O campo `must_change_password: true` sinaliza a obrigatoriedade.
- **Modal de Redefinição Obrigatória**:
  - Modal bloqueante em tela cheia que intercepta a navegação se o usuário ativo tiver `must_change_password: true` ou se a senha atual for igual ao CPF.
  - Exige definição de nova senha segura (mínimo 6 dígitos, diferente do CPF).
  - Confirmação de senha com validação em tempo real.
  - Ao salvar, atualiza o usuário no estado persistente e desativa a flag de obrigatoriedade.
- **Seletor de Usuário / Login Demo**:
  - No `Header.tsx` ou em modal de perfil, permitir simular login com qualquer usuário da lista (para testar o primeiro acesso do professor e o perfil do administrador).

---

### 🛡️ D. Proteção de Rotas (Route Guard 403 Forbidden)
- Componente `RouteGuard` no `AppLayout.tsx` (ou nas páginas restritas):
  - Verifica o perfil ativo atual.
  - Se for `professor` e a rota atual for `/estudantes`, `/turmas`, `/auditoria` ou `/configuracoes`:
    - Bloqueia a renderização do conteúdo.
    - Exibe tela amigável de **403 Forbidden - Acesso Restrito**:
      - Ilustração e mensagem explicativa de que apenas a Secretaria / Administração possui permissão.
      - Botão para voltar à página inicial / fotograma permitido.

---

### 🗄️ E. Modelo de Dados & Tipagem (`src/lib/types.ts`, `AppContext.tsx`, `turso-schema.sql`)
- Criação dos tipos `User`, `UserRole`, `AllowedModule`.
- Schema SQL (PostgreSQL & SQLite/Turso) documentado e atualizado.
- Lista inicial de usuários pré-cadastrados (Administrador padrão e Professores com CPFs formatados).
- Métodos no `AppContext`: `users`, `addUser`, `updateUser`, `resetUserPassword`, `changePassword`, `currentUser`.

---

### 🚀 F. Inicialização do Servidor
- Iniciar o servidor de desenvolvimento Next.js na porta 3000 em segundo plano via `npm run dev`.

---

## 2. Plano de Verificação

### Testes Manuais & Funcionais
1. **Sidebar Retrátil**:
   - Clicar no botão de alternância (Collapse): verificar se a sidebar encolhe para ~72px e o layout se ajusta (`lg:pl-[72px]`).
   - Passar o mouse sobre os ícones no modo contraído: verificar se o tooltip flutuante surge corretamente alinhado.
   - Recarregar a página (F5): verificar se o estado colapsado/expandido é preservado via `localStorage.getItem('sidebar_collapsed')`.
   - Testar estados de hover e active nos modos Claro e Escuro.
2. **RBAC & Omissão de Menus**:
   - Alternar para o perfil Professor: verificar que Estudantes, Turmas, Auditoria e Configurações somem completamente do menu.
   - Tentar navegar diretamente para `/estudantes` ou `/auditoria` como Professor: verificar exibição da tela 403 Forbidden.
3. **Gestão de Usuários & Permissões**:
   - Acessar `Configurações ➡️ Usuários & Permissões`.
   - Cadastrar um novo professor com CPF e permissões opcionais selecionadas.
   - Resetar senha de um usuário e verificar status.
4. **Primeiro Acesso**:
   - Selecionar o professor com senha padrão: verificar ativação imediata do modal bloqueante de redefinição de senha.
   - Cadastrar nova senha e verificar desbloqueio normal do sistema.
