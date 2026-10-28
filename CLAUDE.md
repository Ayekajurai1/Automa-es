# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Chronos is a timesheet tool (apontamento de horas) with a performance dashboard, for a team at FPF. A Flask backend serves one HTML page and a JSON API. All data lives in one shared database, so every user sees the same entries, activities, cost centers, collaborators and accounts. User-facing strings, code comments, the README and commit messages are in Brazilian Portuguese. Keep new strings and comments in Portuguese.

## Commands

```bash
npm install                            # frontend deps (React 19 + Vite 6 + MSAL v5)
npm run dev                            # Vite dev server on http://localhost:5173 (fixed port, registered in Entra ID)
npm run build                          # builds dist/ (index.html + auth/callback/index.html)
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt        # backend deps, includes pytest
CHRONOS_DEMO_AUTH=1 python app.py      # Flask on http://127.0.0.1:5000 without SSO (PORT env overrides); serves dist/ if built
pytest                                 # run all tests
pytest tests/test_auth.py::test_only_admin_token_can_manage_activities   # single test
docker build -t chronos --build-arg VITE_AZURE_CLIENT_ID=... --build-arg VITE_AZURE_TENANT_ID=... .
docker run -p 8000:8000 -v chronos-data:/data chronos
```

There is no linter or formatter configured. `.devcontainer/devcontainer.json` sets up Node 20 + Python 3.12 in Codespaces and runs both installs.

## Architecture

The repo has two parts:

- **Frontend (`src/`, `index.html`, `auth/callback/index.html`)**: React + Vite app. `src/hooks/useChronos.js` holds all state; it loads `GET /api/data` after login and calls the API for every mutation through `src/api/client.js`, which attaches `auth.getToken()` as Bearer and retries once with `forceRefresh` on 401. Only running/paused timers stay in the browser (`localStorage` key `chronos-timers`). API base is `<app url>/api/` unless `VITE_API_URL` is set; `npm run dev` proxies `/api` to Flask on port 5000. `Chronos.html` is the original Claude Design prototype it was ported from.
- **Backend (`app.py`)**: Flask app, SQLAlchemy models, seed data and a JSON API. `GET /` serves `dist/index.html` (the React build; `FRONTEND_DIST` overrides the folder), and `GET /<path>` serves other files from `dist/` (assets; a folder with `index.html` is served at its own path, e.g. `/auth/callback`). If there is no build, it falls back to the legacy `gestao-performance-atualizado(5).html`, which is not in the repo.

### Frontend SSO (`src/auth/`)

- `main.jsx` picks the provider: if `VITE_AZURE_CLIENT_ID` and `VITE_AZURE_TENANT_ID` are set (`.env.local`, GitHub Actions variables or Docker build args), MSAL is lazy-loaded (`src/auth/sso/`); otherwise `DemoAuthProvider` simulates login.
- Both providers expose the same context (`src/auth/AuthContext.js`): `{ mode, isAuthenticated, busy, user: { name, department, email }, login, logout, getToken }`. SSO `getToken` returns the MSAL **ID token**; demo returns `null`. Keep `getToken` referentially stable, since `useChronos` reloads data when it changes.
- MSAL v5 needs a bridge page as `redirectUri`: `auth/callback/index.html`, served at `/auth/callback`. It is also the `postLogoutRedirectUri`, so only one URI per host must be registered (as SPA platform) in Entra ID. Production app: `https://chronos.fpftech.dev`, its Client/Tenant IDs are the Dockerfile ARG defaults (not secrets; never add the client secret anywhere); `MsalProvider` calls `handleRedirectPromise`. Name/department come from Microsoft Graph `/me` (scope `User.Read`), falling back to the token claims.
- `useChronos(config, auth)` puts the logged-in user first in the collaborators list, so it is preselected in the timer and manual entry forms. `me.role` from `/api/data` drives `isAdmin`, which hides the Cadastros tab and the activity/catalog controls.
- `vite.config.js` allows `.app.github.dev` hosts so the dev server works through Codespaces port forwarding. Each redirect URI (localhost, Codespaces, GitHub Pages, production) must be registered as SPA in Entra ID.

### Backend (`app.py`)

- **Database setup runs at import time.** The module-level `with app.app_context():` block runs `db.create_all()`, then `run_migrations()`, then `seed_defaults()`. `DATABASE_URL` is read when the module is imported, which is why `tests/test_auth.py` sets it to in-memory SQLite *before* `from app import app, db`.
- **Database selection:**
  - If `DATABASE_URL` is set, it is used. A `postgres://` prefix is rewritten to `postgresql://`.
  - Otherwise the app uses `chronos.db` at the repo root.
  - On Vercel (`VERCEL` env var set) it falls back to `/tmp/chronos.db`, which does not persist.
- **No Alembic.** When you add a column to an existing model, also add a matching `ALTER TABLE ... ADD COLUMN` guard in `run_migrations()`. Otherwise existing Postgres and SQLite databases won't have the column. `create_all` only creates missing tables.
- **Seed data** (`DEFAULT_ACTIVITIES`, `DEFAULT_COST_CENTERS` with about 239 entries) is inserted only when its table is empty. The frontend has no copy; it reads everything from `/api/data`.
- **API JSON uses camelCase** (`activityId`, `costCenterId`, `createdBy`, `hasSecurityQuestion`) and DB columns use snake_case. Each model's `to_dict()` does the mapping, and request handlers read the camelCase keys.
- **Auth:**
  - Tokens are stateless `itsdangerous` `URLSafeTimedSerializer` tokens (salt `chronos-auth`, valid for 12h). They are sent as `Authorization: Bearer <token>`.
  - `SECRET_KEY` must be set in production. Without it, a random key is generated per process, which logs everyone out on each cold start.
  - Usernames are emails and are always compared case-insensitively (`db.func.lower(Account.username) == email.lower()`).
- **Authorization model:**
  - `_get_current_user()` resolves the Bearer token as: a legacy password-account token (itsdangerous), else an Entra ID token (PyJWT + JWKS from `login.microsoftonline.com/<tenant>/discovery/v2.0/keys`, checks `aud`=`AZURE_CLIENT_ID`, `iss`=`https://login.microsoftonline.com/<tenant>/v2.0`). No header + `CHRONOS_DEMO_AUTH=1` gives a fake admin (dev only).
  - `AZURE_CLIENT_ID`/`AZURE_TENANT_ID` fall back to the `VITE_*` names. SSO users are admin only if their email is in `ADMIN_EMAILS`.
  - `@login_required`: `/api/data` and `/api/entries*`. `createdBy` is set from the token; PUT/DELETE of an entry is allowed only for its creator or an admin. `/api/data` returns `me` and auto-creates a collaborator for SSO users.
  - `@admin_required`: create/delete for activities, cost centers and collaborators, plus `/api/accounts*`.
  - Password accounts can get `role="admin"` only by registering with `adminCode` equal to `ADMIN_REGISTRATION_CODE` (compared with `hmac.compare_digest`).
  - On purpose, there is no route that changes a role after registration, and the first user does not become admin automatically. Tests cover both rules.
  - Tests in `tests/test_sso_api.py` sign tokens with a local RSA key and monkeypatch `_get_jwks_client`, `SSO_ENABLED`, `AZURE_*` and `ADMIN_EMAILS`.
- **Password recovery:**
  - Security question/answer is optional at registration. If provided, both must be given. Answers are normalized with strip and lowercase, then hashed.
  - Users who don't have a security question can ask an admin to reset their password via `POST /api/accounts/<username>/reset-password`.
- `GET /api/admin/reset-accounts/<secret>` is a temporary, one-off route, gated by `ADMIN_RESET_SECRET`, that deletes all accounts. Its comment says to remove it after use.

## Deployment

- **GitHub Pages:** `.github/workflows/deploy.yml` builds only the frontend (`dist/`) on push to `main`. There is no API there, so the published site cannot load data.
- **GitLab (FPF):** `.gitlab-ci.yml` includes `devsecops/fpf-deploy-template` (builds the Dockerfile and deploys to Kubernetes) and runs `pytest`. The VITE_* build args must be passed to the Docker build for SSO to be active in that image.
- **Render:** start command is `gunicorn app:app` (needs `npm run build` first to serve the frontend).
- **Docker:**
  - Multi-stage: a `node:20-slim` stage runs `npm ci && npm run build` (build args `VITE_AZURE_CLIENT_ID`, `VITE_AZURE_TENANT_ID`, optional `VITE_AZURE_REDIRECT_URI`), then the Python stage copies `dist/` next to `app.py`. `npm ci` requires `package-lock.json` to be committed.
  - The image defaults to `DATABASE_URL=sqlite:////data/chronos.db`. Mount a volume at `/data`, or override the variable with a Postgres URL.
  - It runs gunicorn with 1 worker (`WEB_CONCURRENCY`) and `GUNICORN_THREADS` threads. More workers can crash on first boot, because each runs the import-time seed against an empty DB.
  - `.dockerignore` excludes `chronos.db`, `tests/`, `node_modules/`, `dist/` and `.env*` files.

Production requires these env vars:
- `DATABASE_URL` (Postgres)
- `AZURE_CLIENT_ID` / `AZURE_TENANT_ID` (set automatically in the Docker image from the build args)
- `ADMIN_EMAILS`
- `SECRET_KEY` (only matters for the legacy password accounts)
- `ADMIN_REGISTRATION_CODE` (same)

`ADMIN_RESET_SECRET` is optional.

## Repo hygiene

`.gitignore` covers `node_modules/`, `dist/`, `.env*` (except `.env.example`), `.venv/` and Python caches. `chronos.db` is the local SQLite file; running the backend modifies it. Don't commit it unless asked.
