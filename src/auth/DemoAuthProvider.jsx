import { useMemo, useState } from 'react';
import { AuthContext } from './AuthContext';
import { CONFIG, CURRENT_USER } from '../config';

// Sem token: a API só aceita isso com CHRONOS_DEMO_AUTH=1 (desenvolvimento).
const getToken = async () => null;

// Login simulado, usado enquanto o SSO não está configurado (comportamento do protótipo original).
export default function DemoAuthProvider({ children }) {
  const [loggedIn, setLoggedIn] = useState(CONFIG.startOnLogin === false);

  const value = useMemo(() => ({
    mode: 'demo',
    isAuthenticated: loggedIn,
    busy: false,
    user: CURRENT_USER,
    login: async () => setLoggedIn(true),
    logout: async () => setLoggedIn(false),
    getToken,
  }), [loggedIn]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
