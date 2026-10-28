# Etapa 1: compila o frontend React (Vite) para a pasta dist/.
FROM node:20-slim AS frontend

WORKDIR /build

# Client ID e Tenant ID do Entra ID entram no JavaScript na hora do build.
# Não são segredos (ficam visíveis no site publicado). O padrão é o app
# "Chronos" da FPFtech (https://chronos.fpftech.dev); use --build-arg para trocar.
# NUNCA coloque o client secret aqui: o login no navegador não usa segredo.
ARG VITE_AZURE_CLIENT_ID="8474dd60-56c5-4ac1-8367-6ef4231baf22"
ARG VITE_AZURE_TENANT_ID="ec9abbad-f150-4692-818c-e0ab7214fc06"
ARG VITE_AZURE_REDIRECT_URI=""
ENV VITE_AZURE_CLIENT_ID=$VITE_AZURE_CLIENT_ID \
    VITE_AZURE_TENANT_ID=$VITE_AZURE_TENANT_ID \
    VITE_AZURE_REDIRECT_URI=$VITE_AZURE_REDIRECT_URI

COPY package.json package-lock.json ./
RUN npm ci

COPY index.html vite.config.js ./
COPY auth ./auth
COPY public ./public
COPY src ./src
RUN npm run build

# Etapa 2: backend Flask, que serve a API e o frontend compilado.
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY app.py ./
COPY --from=frontend /build/dist ./dist

# A API valida o token da Microsoft com o mesmo Client ID e Tenant ID do frontend.
ARG VITE_AZURE_CLIENT_ID="8474dd60-56c5-4ac1-8367-6ef4231baf22"
ARG VITE_AZURE_TENANT_ID="ec9abbad-f150-4692-818c-e0ab7214fc06"
ENV AZURE_CLIENT_ID=$VITE_AZURE_CLIENT_ID \
    AZURE_TENANT_ID=$VITE_AZURE_TENANT_ID

# Usuário sem privilégios; /data guarda o SQLite padrão (monte um volume aqui
# para persistir os dados quando não houver Postgres).
RUN useradd --create-home --uid 1000 chronos \
    && mkdir -p /data \
    && chown chronos:chronos /data
USER chronos

# Em produção, sobrescreva DATABASE_URL com a URL do Postgres e defina
# SECRET_KEY e ADMIN_REGISTRATION_CODE (veja README).
ENV DATABASE_URL=sqlite:////data/chronos.db \
    PORT=8000 \
    WEB_CONCURRENCY=1 \
    GUNICORN_THREADS=4

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import os, urllib.request; urllib.request.urlopen(f'http://127.0.0.1:{os.environ[\"PORT\"]}/', timeout=4)" || exit 1

# Um único worker por padrão: o app cria tabelas e popula dados padrão ao ser
# importado, e vários workers subindo juntos num banco vazio podem colidir no
# seed. Escale com threads (GUNICORN_THREADS) ou, com Postgres já populado,
# aumentando WEB_CONCURRENCY.
CMD ["sh", "-c", "exec gunicorn app:app --bind 0.0.0.0:${PORT} --threads ${GUNICORN_THREADS} --access-logfile -"]
