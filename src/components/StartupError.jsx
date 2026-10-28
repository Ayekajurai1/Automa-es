import Brand from './Brand';

// Exibida quando o MSAL não consegue iniciar (ex.: Client ID ou Tenant ID inválidos).
export default function StartupError() {
  return (
    <div className="app">
      <div className="login">
        <div className="ui-card ui-card--login">
          <Brand large />
          <div className="ui-alert ui-alert--danger">
            Não foi possível iniciar o login com a Microsoft. Confira VITE_AZURE_CLIENT_ID e
            VITE_AZURE_TENANT_ID e recarregue a página.
          </div>
        </div>
      </div>
    </div>
  );
}
