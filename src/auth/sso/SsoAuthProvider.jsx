import { useCallback, useMemo, useRef } from 'react';
import { InteractionStatus } from '@azure/msal-browser';
import { useIsAuthenticated, useMsal } from '@azure/msal-react';
import { AuthContext } from '../AuthContext';
import { loginRequest } from '../config';
import { useGraphProfile } from './useGraphProfile';

// Login real com Microsoft (Entra ID) via MSAL.
export default function SsoAuthProvider({ children }) {
  const { instance, accounts, inProgress } = useMsal();
  const isAuthenticated = useIsAuthenticated();
  const account = instance.getActiveAccount() || accounts[0] || null;
  const profile = useGraphProfile(instance, account);

  // ID token da Microsoft, validado pela API (app.py). O MSAL renova sozinho quando
  // possível; forceRefresh é usado quando a API responde 401 (token vencido).
  // Função estável (lê a conta por ref) para não disparar nova carga de dados.
  const accountRef = useRef(account);
  accountRef.current = account;
  const getToken = useCallback(async (forceRefresh = false) => {
    if (!accountRef.current) return null;
    const result = await instance.acquireTokenSilent({ ...loginRequest, account: accountRef.current, forceRefresh });
    return result.idToken;
  }, [instance]);

  const value = useMemo(() => ({
    mode: 'sso',
    isAuthenticated,
    // true enquanto o MSAL processa o retorno da Microsoft ou um login em andamento
    busy: inProgress !== InteractionStatus.None,
    user: account
      ? {
        name: (profile && profile.displayName) || account.name || account.username,
        department: (profile && (profile.department || profile.jobTitle)) || '',
        email: (profile && profile.mail) || account.username,
      }
      : null,
    // Leva o usuário para a página de login da Microsoft e volta para o app.
    login: () => instance.loginRedirect(loginRequest),
    // Encerra a sessão Microsoft e volta para a tela de login do Chronos.
    logout: () => instance.logoutRedirect({ account }),
    getToken,
  }), [instance, account, isAuthenticated, inProgress, profile, getToken]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
