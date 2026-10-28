import { createContext, useContext } from 'react';

// Contrato comum aos dois modos de login (simulado e Microsoft):
// { mode, isAuthenticated, busy, user: { name, department, email } | null,
//   login(): Promise, logout(): Promise,
//   getToken(forceRefresh?): Promise<string | null>  — token enviado à API }
export const AuthContext = createContext(null);

export function useAuth() {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error('useAuth precisa estar dentro de um provedor de autenticação.');
  return auth;
}
