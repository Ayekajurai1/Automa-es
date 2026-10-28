# Chronos

Apontamento de horas e indicadores de performance da FPFtech.

O Chronos registra horas por cronômetro ou lançamento manual, organiza o catálogo de atividades (core, administrativa e outro), mantém colaboradores e centros de custo, e mostra um dashboard com filtros, KPIs, gráficos e exportação para CSV.

Este repositório é a versão em código-fonte do protótipo exportado do Claude Design (`Chronos.html`), reorganizado como um projeto React + Vite.

## Rodar no computador

É preciso ter o [Node.js](https://nodejs.org/) 18 ou mais recente e o Python 3.12 ou mais recente. Os dados ficam no banco da API Flask (`app.py`), então rode as duas partes, cada uma num terminal:

```bash
# Terminal 1: API (http://127.0.0.1:5000)
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
CHRONOS_DEMO_AUTH=1 python app.py   # sem SSO configurado; veja abaixo

# Terminal 2: frontend (http://localhost:5173)
npm install
npm run dev
```

O `npm run dev` repassa as chamadas de `/api` para a API na porta 5000.

`CHRONOS_DEMO_AUTH=1` faz a API aceitar requisições sem login, como um usuário admin fictício. Use só no desenvolvimento, com o login simulado. Com o SSO configurado (`.env.local` preenchido), rode só `python app.py` com as mesmas variáveis `VITE_AZURE_CLIENT_ID` e `VITE_AZURE_TENANT_ID` no ambiente (ou `AZURE_CLIENT_ID` e `AZURE_TENANT_ID`).

Outros comandos:

```bash
npm run build    # gera a versão de produção na pasta dist/
npm run preview  # serve a pasta dist/ localmente para conferir o build
```

## Configuração

As opções ficam em `src/config.js`:

| Opção | Padrão | O que faz |
| --- | --- | --- |
| `startOnLogin` | `true` | Abre na tela de login. Com `false`, entra direto no app (só no login simulado). |
| `defaultView` | `'apontamento'` | Aba inicial: `apontamento`, `atividades`, `cadastros` ou `dashboard`. |
| `darkMode` | `false` | Inicia no modo escuro. |
| `showWeeklyChart` | `true` | Exibe o gráfico "Evolução semanal" no dashboard. |

O usuário exibido no login simulado também está em `src/config.js` (`CURRENT_USER`). O login com Microsoft é configurado à parte, na seção [Login com Microsoft (SSO)](#login-com-microsoft-sso).

## Estrutura

```
chronos/
├── .github/workflows/deploy.yml   publica no GitHub Pages a cada push na main
├── index.html                     página de entrada
├── auth/callback/index.html       página-ponte do login Microsoft (MSAL v5), em /auth/callback
├── .env.example                   modelo das variáveis do SSO
├── package.json                   dependências e scripts
├── vite.config.js                 configuração do Vite
├── public/favicon.svg
└── src/
    ├── main.jsx                   inicializa o React e escolhe o modo de login
    ├── App.jsx                    login, barra superior e troca de abas
    ├── config.js                  opções do app e usuário do login simulado
    ├── auth/
    │   ├── config.js              Client ID, Tenant ID, endereços e permissões
    │   ├── AuthContext.js         hook useAuth() usado pelo app
    │   ├── DemoAuthProvider.jsx   login simulado (sem .env)
    │   └── sso/                   login Microsoft: MSAL, perfil do Graph
    ├── assets/fonts/              DM Sans (woff2, fonte variável 400–900)
    ├── styles/
    │   ├── index.css              importa tudo na ordem certa
    │   ├── design-system/         FPFtech Design System
    │   │   ├── fonts.css
    │   │   ├── base.css
    │   │   ├── tokens/            colors, typography, spacing
    │   │   └── components/        button, forms, feedback, card,
    │   │                          navigation, modal, table
    │   ├── theme.css              tema azul do Chronos e ajustes do modo escuro
    │   └── layout.css             layout das telas e cores dos gráficos
    ├── api/client.js              chamadas à API Flask (envia o token do login)
    ├── data/pages.js              títulos das abas
    ├── utils/
    │   ├── format.js              horas (HH:MM), datas e conversões
    │   ├── metrics.js             filtros, somas e números do dashboard
    │   ├── exportCsv.js           exportação do relatório
    │   └── activityTypes.js       rótulos, badges e cores por tipo
    ├── hooks/
    │   ├── useChronos.js          estado central e todas as ações
    │   └── useToast.js            mensagens temporárias
    ├── components/                Brand, Field, Options, LoginScreen, TopBar,
    │                              PageHeader, Toast, StartupError, icons
    └── views/
        ├── apontamento/           QuickStats, TimerCard, ManualEntryForm,
        │                          PausedTimers, EntriesTable
        ├── atividades/            AtividadesView
        ├── cadastros/             CadastrosView, RegistryPanel
        └── dashboard/             DashboardFilters, KpiCards,
                                   ActivityDistribution, CoreVsAdmin,
                                   CollaboratorRanking, WeeklyChart
```

### Onde mexer

- **Regras de negócio** (cronômetro, validações, mensagens): `src/hooks/useChronos.js`.
- **Cálculos do dashboard**: `src/utils/metrics.js`.
- **Listas iniciais** (atividades e centros de custo): `DEFAULT_ACTIVITIES` e `DEFAULT_COST_CENTERS` em `app.py`. Só entram quando a tabela está vazia.
- **Regras de acesso da API**: `login_required`, `admin_required` e `_can_change_entry` em `app.py`.
- **Cores e tema**: `src/styles/theme.css`. Os tokens do design system ficam em `src/styles/design-system/tokens/`.
- **Visual de uma tela**: o componente em `src/views/` e as classes correspondentes em `src/styles/layout.css`.

## Publicar no GitHub

### 1. Criar o repositório

No GitHub, clique em **New repository**, dê o nome `chronos` e crie sem README (este projeto já tem um).

### 2. Enviar o código

Na pasta do projeto:

```bash
git init
git add .
git commit -m "Chronos: versão inicial"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/chronos.git
git push -u origin main
```

Se preferir não usar o terminal, o [GitHub Desktop](https://desktop.github.com/) faz o mesmo: **File → Add local repository**, selecione a pasta e clique em **Publish repository**.

### 3. Publicar no GitHub Pages (opcional)

1. No repositório, abra **Settings → Pages**.
2. Em **Build and deployment → Source**, escolha **GitHub Actions**.
3. A cada push na `main`, o workflow `.github/workflows/deploy.yml` gera o build e publica o site.

O endereço fica em `https://SEU-USUARIO.github.io/chronos/` e aparece em **Actions** quando o deploy termina.

Depois de rodar `npm install` pela primeira vez, faça commit do `package-lock.json` que for criado. Isso garante que o GitHub instale exatamente as mesmas versões das dependências.

## Login com Microsoft (SSO)

O Chronos tem dois modos de login:

- **Simulado:** é o padrão quando o SSO não está configurado. O botão "Entrar com Microsoft" apenas libera o app, como no protótipo.
- **Microsoft (Entra ID):** é ativado sozinho quando as variáveis `VITE_AZURE_CLIENT_ID` e `VITE_AZURE_TENANT_ID` estão preenchidas. Só contas do diretório da FPFtech conseguem entrar, e nome e departamento vêm da conta Microsoft.

### Sobre os "tokens"

Você não coloca nenhum token no código. Os tokens são emitidos pela Microsoft no momento do login, e a biblioteca MSAL os guarda na aba do navegador (`sessionStorage`). O que você configura são dois identificadores do registro do app: o **Client ID** e o **Tenant ID**.

Esses dois valores não são segredos e acabam visíveis no JavaScript publicado, o que é normal em apps que rodam só no navegador. Já um **client secret** nunca deve ir para este projeto: aqui ele não é necessário e ficaria exposto para qualquer pessoa.

### 1. Registrar o app no Entra ID

Registrar um app costuma exigir permissão de administrador no tenant da FPFtech. Se você não tiver acesso, peça à equipe de TI para fazer este passo e te passar o Client ID e o Tenant ID.

1. Acesse o [Microsoft Entra admin center](https://entra.microsoft.com) e abra **Registros de aplicativo** (*App registrations*) → **Novo registro**.
2. Em **Nome**, use `Chronos`.
3. Em **Tipos de conta com suporte**, escolha **Contas somente neste diretório organizacional** (*single tenant*).
4. Em **URI de redirecionamento**, escolha a plataforma **Aplicativo de página única (SPA)** e informe `http://localhost:5173/auth/callback`.
5. Clique em **Registrar**. Na página **Visão geral**, copie o **ID do aplicativo (cliente)** e o **ID do diretório (locatário)**.

### 2. Cadastrar todos os endereços

Em **Autenticação**, na seção da plataforma SPA, deixe cadastrados estes endereços:

| Endereço | Para quê |
| --- | --- |
| `https://chronos.fpftech.dev/auth/callback` | site em produção |
| `http://localhost:5173/auth/callback` | seu computador (`npm run dev`) |
| `https://NOME-DO-CODESPACE-5173.app.github.dev/auth/callback` | GitHub Codespaces |

O mesmo endereço serve para a volta do login e do logout. Todos precisam estar na plataforma **Aplicativo de página única (SPA)**, não em **Web**. Na plataforma Web, a Microsoft recusa o login feito pelo navegador (erro `AADSTS9002326`).

O app "Chronos" da FPFtech já está registrado: Client ID `8474dd60-56c5-4ac1-8367-6ef4231baf22`, Tenant ID `ec9abbad-f150-4692-818c-e0ab7214fc06`. Esses valores são o padrão do `Dockerfile`. O **client secret** do registro não é usado e nunca deve ir para este projeto.

Os endereços precisam ser exatamente iguais, incluindo `http`/`https`, porta e barra final. Qualquer diferença gera o erro `AADSTS50011` (*redirect URI mismatch*) na tela da Microsoft.

### 3. Conferir a permissão

Em **Permissões de APIs**, confira se existe **Microsoft Graph → User.Read** (delegada). Ela costuma vir por padrão e é usada para ler nome e departamento do usuário. Se a organização exigir, peça a um administrador para **conceder consentimento**.

### 4. Configurar no seu computador

```bash
cp .env.example .env.local
```

Abra o `.env.local`, preencha `VITE_AZURE_CLIENT_ID` e `VITE_AZURE_TENANT_ID` e reinicie o `npm run dev`. O `.env.local` está no `.gitignore` e não vai para o GitHub.

O servidor de desenvolvimento usa sempre a porta 5173, que é a cadastrada no Entra ID. Se ela estiver ocupada, o Vite avisa em vez de trocar de porta.

### 5. Configurar no GitHub Pages

No repositório, abra **Settings → Secrets and variables → Actions**, vá na aba **Variables** e crie duas variáveis de repositório:

- `VITE_AZURE_CLIENT_ID`
- `VITE_AZURE_TENANT_ID`

Use **Variables** e não **Secrets**: como os valores ficam no JavaScript publicado de qualquer jeito, esconder no Actions não protege nada. Depois, faça um novo push (ou rode o workflow em **Actions**) para publicar com o SSO ativo.

### Como funciona

1. O usuário clica em "Entrar com Microsoft" e vai para a página de login da Microsoft.
2. A Microsoft devolve a resposta para `/auth/callback`, a página-ponte exigida pelo MSAL v5, que a repassa ao Chronos.
3. O Chronos registra a conta e busca nome e departamento no Microsoft Graph. Se o Graph falhar, usa o nome e o e-mail do próprio token.
4. "Sair" encerra a sessão Microsoft e volta para a tela de login.

O código fica em `src/auth/`. As partes que mais mudam são as permissões pedidas (`loginRequest` em `src/auth/config.js`) e os dados exibidos do usuário (`src/auth/sso/SsoAuthProvider.jsx`).

### O que o login protege (e o que não protege)

A API não confia no navegador. Toda requisição leva o ID token da Microsoft (`Authorization: Bearer ...`), e o `app.py` confere a assinatura com as chaves públicas do Entra ID, a validade, o Client ID e o tenant da FPFtech. Sem token válido, a API responde 401.

- **Lançamentos:** qualquer usuário logado lança horas. O autor (`createdBy`) vem do token, não do navegador. Cada um só altera ou exclui os próprios lançamentos.
- **Admin:** os e-mails listados em `ADMIN_EMAILS` (separados por vírgula) podem excluir qualquer lançamento e cuidar de atividades, colaboradores e centros de custo. A aba Cadastros só aparece para eles.
- **Colaboradores:** quem entra pelo SSO é cadastrado como colaborador automaticamente.

O frontend envia o ID token porque ele não exige configuração extra no Entra ID. Se a TI preferir o modelo recomendado para APIs maiores, dá para trocar por um access token com escopo próprio (*Expor uma API* no registro do app).

## Backend (API Flask) e Docker

O `app.py` é a API Flask com banco de dados (SQLite local ou Postgres via `DATABASE_URL`). Ele também serve o frontend compilado da pasta `dist/`, então em produção app e API ficam no mesmo endereço.

```bash
npm run build        # gera dist/, que o Flask serve em /
python app.py        # http://127.0.0.1:5000
pytest               # testes do backend
```

Variáveis da API:

| Variável | Para quê |
| --- | --- |
| `DATABASE_URL` | Postgres em produção. Sem ela, usa `chronos.db` (SQLite). |
| `AZURE_CLIENT_ID`, `AZURE_TENANT_ID` | Validar o token da Microsoft. Também aceita os nomes `VITE_*`. |
| `ADMIN_EMAILS` | E-mails com papel de admin, separados por vírgula. |
| `SECRET_KEY` | Assina os tokens das contas com senha (rotas `/api/auth/*`). |
| `CHRONOS_DEMO_AUTH` | `1` libera a API sem login. Só para desenvolvimento. |

A imagem Docker compila o frontend e o backend juntos. Passe o Client ID e o Tenant ID na hora do build: eles ativam o SSO no frontend e a validação de token na API.

```bash
docker build -t chronos \
  --build-arg VITE_AZURE_CLIENT_ID=... \
  --build-arg VITE_AZURE_TENANT_ID=... .
docker run -p 8000:8000 -v chronos-data:/data chronos
```

Em produção, defina também `DATABASE_URL` (Postgres), `ADMIN_EMAILS` e `SECRET_KEY`.

No GitHub Codespaces, o arquivo `.devcontainer/devcontainer.json` já instala o Node e o Python e as dependências dos dois.

## Limitações atuais

- **GitHub Pages:** o Pages publica só o frontend, sem a API, então o site de lá mostra erro ao carregar os dados. Para uso real, publique a imagem Docker (app e API juntos).
- **Cronômetros por navegador:** cronômetros em andamento ou pausados ficam no `localStorage` de cada navegador até virarem lançamento.

## Diferenças em relação ao HTML original

- A data de "hoje" agora usa o fuso horário local. O original usava UTC, então lançamentos feitos no Brasil depois das 21h ficavam com a data do dia seguinte.
- A margem padrão de 8px do `<body>` foi removida. Ela deixava uma faixa clara nas bordas da página, visível principalmente no modo escuro.
- As abas da barra superior passaram a mostrar o realce de hover previsto no design system. No original, um estilo inline bloqueava esse efeito.
- O React foi atualizado da versão 18 para a 19, exigida pela biblioteca de login da Microsoft (MSAL React v5).
- O login com Microsoft passou a funcionar de verdade quando configurado. Sem configuração, continua simulado.

## Créditos

- Login com [MSAL.js](https://github.com/AzureAD/microsoft-authentication-library-for-js) (Microsoft, licença MIT).
- Fonte [DM Sans](https://fonts.google.com/specimen/DM+Sans), licenciada sob a SIL Open Font License 1.1.
- Design system FPFtech.
