import { EventType, PublicClientApplication } from '@azure/msal-browser';
import { MsalProvider } from '@azure/msal-react';
import { msalConfig } from '../config';
import SsoAuthProvider from './SsoAuthProvider';

// Cria e inicializa o MSAL e devolve a árvore React já envolvida pelos provedores.
export async function createSsoTree(children) {
  const pca = new PublicClientApplication(msalConfig);
  await pca.initialize();

  // Recarregou a página com uma sessão já aberta: reaproveita a conta.
  const accounts = pca.getAllAccounts();
  if (!pca.getActiveAccount() && accounts.length > 0) {
    pca.setActiveAccount(accounts[0]);
  }

  // No MSAL v5, o payload de LOGIN_SUCCESS é a própria conta (AccountInfo).
  pca.addEventCallback((event) => {
    if (event.eventType === EventType.LOGIN_SUCCESS && event.payload) {
      pca.setActiveAccount(event.payload);
    }
  });

  return (
    <MsalProvider instance={pca}>
      <SsoAuthProvider>{children}</SsoAuthProvider>
    </MsalProvider>
  );
}
