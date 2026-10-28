// Cliente da API Flask (app.py).
// Por padrão a API fica no mesmo endereço do app (pasta api/). No "npm run dev"
// o Vite repassa /api para o Flask em http://127.0.0.1:5000 (veja vite.config.js).

import { appUrl } from '../auth/config';

const API_BASE = (import.meta.env.VITE_API_URL || '').trim() || new URL('api/', appUrl).href;

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

// getToken(forceRefresh) devolve o token do usuário logado (ou null no login simulado).
export function createApi(getToken) {
  async function send(path, { method = 'GET', body } = {}, forceRefresh = false) {
    const token = await getToken(forceRefresh);
    const headers = {};
    if (token) headers.Authorization = 'Bearer ' + token;
    if (body !== undefined) headers['Content-Type'] = 'application/json';

    let res;
    try {
      res = await fetch(new URL(path, API_BASE), {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch {
      throw new ApiError('Sem conexão com o servidor do Chronos.', 0);
    }

    // Token vencido: pede um novo à Microsoft e tenta mais uma vez.
    if (res.status === 401 && token && !forceRefresh) return send(path, { method, body }, true);

    if (res.status === 204) return null;
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw new ApiError((data && data.error) || 'Erro ' + res.status + ' ao falar com o servidor.', res.status);
    }
    return data;
  }

  return {
    get: (path) => send(path),
    post: (path, body) => send(path, { method: 'POST', body }),
    put: (path, body) => send(path, { method: 'PUT', body }),
    del: (path) => send(path, { method: 'DELETE' }),
  };
}
