# Automações — Chronos (Gestão de Performance)

Sistema de apontamento de horas e dashboard de performance, com backend Flask
e banco de dados compartilhado — todos os usuários da equipe veem os mesmos
dados (apontamentos, atividades, centros de custo, colaboradores e contas).

## Como rodar localmente

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python app.py
```

Acesse em: http://127.0.0.1:5000

Sem configuração adicional, os dados ficam num arquivo local `chronos.db`
(SQLite) — ótimo para testar, mas **não use isso em produção** (veja abaixo).

## Publicar online (equipe toda, dados compartilhados)

⚠️ **Importante:** para a equipe toda compartilhar os mesmos dados de forma
persistente, é necessário um banco de dados gerenciado (Postgres), não o
SQLite local — hosts como Render/Railway apagam o disco local a cada reinício
no plano gratuito.

### Passo a passo no Render

1. Crie um banco **PostgreSQL** no Render (plano free) e copie a "Internal
   Database URL" gerada.
2. Crie um novo **Web Service**, conectando este repositório.
3. Configure:
   - Build command: `pip install -r requirements.txt`
   - Start command: `gunicorn app:app`
4. Em "Environment", adicione a variável:
   - `DATABASE_URL` = (a URL do Postgres do passo 1)
5. Faça o deploy. Na primeira execução, o app cria as tabelas e já popula as
   atividades e os 239 centros de custo padrão automaticamente.

### Passo a passo no Vercel

⚠️ Na Vercel, o sistema de arquivos das funções é **somente leitura** (exceto
`/tmp`, que não é persistente). Isso quer dizer que **é obrigatório** configurar
um Postgres externo (ex.: Neon, Supabase ou Vercel Postgres) — sem isso, os
dados se perdem a cada nova execução da função e o app não cumpre a proposta
de dados compartilhados. Sem `DATABASE_URL`, o app também evita crashar
caindo num SQLite temporário em `/tmp`, mas isso é só uma rede de segurança,
não uma solução de produção.

1. Crie um banco Postgres (ex.: [Neon](https://neon.tech) ou
   [Vercel Postgres](https://vercel.com/storage/postgres)) e copie a connection
   string.
2. Importe este repositório em [vercel.com/new](https://vercel.com/new).
   A Vercel detecta o `app.py` (variável `app` do Flask) automaticamente —
   não é necessário configurar Build/Start command.
3. Em **Project Settings → Environment Variables**, adicione:
   - `DATABASE_URL` = (a connection string do Postgres)
   - `SECRET_KEY` = uma string aleatória longa (ex.: gerada com
     `python -c "import secrets;print(secrets.token_hex(32))"`). Sem isso, o
     login expira toda vez que a função reinicia (cold start), pois a chave de
     assinatura dos tokens seria gerada de novo aleatoriamente a cada vez.
   - `ADMIN_REGISTRATION_CODE` = um código secreto **que só você deve saber**
     (veja "Primeiro acesso" abaixo).
4. Faça o deploy (ou re-deploy, se o projeto já existia). Na primeira
   execução, o app cria as tabelas e popula atividades e centros de custo
   automaticamente.

### Primeiro acesso (virar administrador)

Não existe mais "o primeiro a se cadastrar vira admin automaticamente" — isso
era um risco de segurança (qualquer pessoa que se cadastrasse primeiro
viraria admin sem querer). Agora, virar admin exige um código secreto:

1. Configure a variável de ambiente `ADMIN_REGISTRATION_CODE` (no Vercel, em
   Project Settings → Environment Variables) com um valor que só você conhece.
2. Acesse a tela de cadastro com o parâmetro `?admin` na URL, por exemplo:
   `https://chronos-pdi.vercel.app/?admin`. Isso revela um campo extra
   "Código de administrador" no formulário de cadastro (ele fica escondido
   para todo mundo que acessa a URL normal).
3. Cadastre-se informando esse código. Sua conta será criada como **admin**.
4. Qualquer outra pessoa que se cadastrar (sem saber o link `?admin` nem o
   código) sempre entra como usuário comum.

Só administradores veem e conseguem usar a aba "Cadastros" (atividades,
centros de custo, colaboradores) — isso é reforçado tanto na tela quanto no
servidor, então mesmo alguém tentando chamar a API diretamente sem ser admin
recebe erro 403.

## O que é compartilhado vs. o que fica só no seu navegador

- **Compartilhado entre todos (no banco de dados):** apontamentos, atividades,
  centros de custo, colaboradores, contas de usuário e senhas (com hash).
- **Só no seu navegador (localStorage):** preferência de tema (claro/escuro) e
  a sessão de login atual do dispositivo.
