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

### Primeiro acesso

O primeiro usuário a se cadastrar na tela de login vira **admin**
automaticamente (ou qualquer usuário chamado literalmente "admin"). Contas
seguintes entram como usuário comum. Só administradores veem a aba
"Cadastros" (atividades, centros de custo, colaboradores).

## O que é compartilhado vs. o que fica só no seu navegador

- **Compartilhado entre todos (no banco de dados):** apontamentos, atividades,
  centros de custo, colaboradores, contas de usuário e senhas (com hash).
- **Só no seu navegador (localStorage):** preferência de tema (claro/escuro) e
  a sessão de login atual do dispositivo.
