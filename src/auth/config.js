// Configuração do login com Microsoft (Entra ID).
// Os valores vêm do arquivo .env.local (copie de .env.example) ou das
// variáveis do repositório no GitHub Actions. Não são segredos: o Client ID e o
// Tenant ID ficam visíveis no JavaScript publicado, e isso é esperado num app SPA.
// NUNCA coloque um "client secret" aqui.

export const AZURE_CLIENT_ID = (import.meta.env.VITE_AZURE_CLIENT_ID || '').trim();
export const AZURE_TENANT_ID = (import.meta.env.VITE_AZURE_TENANT_ID || '').trim();

// O SSO só é ativado com os dois valores preenchidos. Sem eles, o login é simulado.
export const isSsoEnabled = Boolean(AZURE_CLIENT_ID && AZURE_TENANT_ID);

// Endereço da página do app, ex.: http://localhost:5173/ ou https://usuario.github.io/chronos/
export const appUrl = new URL('./', window.location.href).href;

// Página-ponte que recebe a resposta da Microsoft (exigida pelo MSAL v5).
// Precisa estar cadastrada como "URI de redirecionamento" do tipo SPA no Entra ID,
// ex.: https://chronos.fpftech.dev/auth/callback
export const redirectUri =
  (import.meta.env.VITE_AZURE_REDIRECT_URI || '').trim() || new URL('auth/callback', appUrl).href;

export const msalConfig = {
  auth: {
    clientId: AZURE_CLIENT_ID,
    // Tenant fixo: só contas do diretório da FPFtech conseguem entrar.
    authority: `https://login.microsoftonline.com/${AZURE_TENANT_ID}`,
    redirectUri,
    // A volta do logout também passa pela página-ponte, que devolve para o app.
    // Assim só um endereço precisa estar cadastrado no Entra ID.
    postLogoutRedirectUri: redirectUri,
  },
  cache: {
    // Tokens ficam só na aba atual e somem ao fechá-la.
    cacheLocation: 'sessionStorage',
  },
};

// Permissões pedidas no login. User.Read permite ler nome e departamento no Microsoft Graph.
export const loginRequest = { scopes: ['User.Read'] };

export const GRAPH_ME_URL =
  'https://graph.microsoft.com/v1.0/me?$select=displayName,mail,department,jobTitle';

// O MSAL v5 não traz mais mensagens legíveis em error.message; usamos error.errorCode.
const AUTH_ERRORS = {
  user_cancelled: 'Login cancelado.',
  interaction_in_progress: 'Já existe um login em andamento. Aguarde alguns segundos.',
  no_network_connectivity: 'Sem conexão com a internet.',
};

export function authErrorMessage(error) {
  if (error && error.errorCode) console.error('MSAL [' + error.errorCode + ']:', error.message);
  return AUTH_ERRORS[error && error.errorCode] || 'Não foi possível conectar com a Microsoft. Tente novamente.';
}
