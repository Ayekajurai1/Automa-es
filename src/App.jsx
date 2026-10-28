import { CONFIG } from './config';
import { useAuth } from './auth/AuthContext';
import { authErrorMessage } from './auth/config';
import { useChronos } from './hooks/useChronos';
import LoginScreen from './components/LoginScreen';
import TopBar from './components/TopBar';
import PageHeader from './components/PageHeader';
import Toast from './components/Toast';
import ApontamentoView from './views/apontamento/ApontamentoView';
import AtividadesView from './views/atividades/AtividadesView';
import CadastrosView from './views/cadastros/CadastrosView';
import DashboardView from './views/dashboard/DashboardView';

const DEMO_HINT_DEV = 'Login simulado: preencha o .env.local para usar o SSO (veja o README).';
const LOGIN_HINT = 'Use seu e-mail corporativo FPFtech.';

export default function App() {
  const auth = useAuth();
  const chronos = useChronos(CONFIG, auth);
  const { dark, status, isAdmin } = chronos;
  // Cadastros é só para admin (o servidor também confere).
  const view = chronos.view === 'cadastros' && !isAdmin ? 'apontamento' : chronos.view;

  const handleLogin = () => {
    auth.login()
      .then(() => {
        // No SSO real a página vai para a Microsoft; o aviso só faz sentido no modo simulado.
        if (auth.mode === 'demo') chronos.notify('Conectado com Microsoft.');
      })
      .catch((error) => chronos.notify(authErrorMessage(error), 'error'));
  };

  const handleLogout = () => {
    auth.logout().catch((error) => chronos.notify(authErrorMessage(error), 'error'));
  };

  const hint = auth.mode === 'demo' && import.meta.env.DEV ? DEMO_HINT_DEV : LOGIN_HINT;

  return (
    <div className={dark ? 'app dark' : 'app'}>
      {!auth.isAuthenticated && <LoginScreen onLogin={handleLogin} busy={auth.busy} hint={hint} />}

      {auth.isAuthenticated && (
        <div className="shell">
          <TopBar
            view={view}
            onNavigate={chronos.setView}
            showCadastros={isAdmin}
            dark={dark}
            onToggleDark={chronos.setDark}
            user={auth.user}
            onLogout={handleLogout}
          />

          <div className="content">
            <PageHeader view={view} />
            <main className="page">
              {status === 'loading' && <div className="empty-state">Carregando dados…</div>}
              {status === 'error' && (
                <div className="ui-alert ui-alert--danger">
                  Não foi possível carregar os dados: {chronos.loadError}{' '}
                  <button className="ui-button ui-button--outline ui-button--sm" type="button" onClick={chronos.reload}>
                    Tentar de novo
                  </button>
                </div>
              )}
              {status === 'ready' && view === 'apontamento' && <ApontamentoView chronos={chronos} />}
              {status === 'ready' && view === 'atividades' && <AtividadesView chronos={chronos} />}
              {status === 'ready' && view === 'cadastros' && <CadastrosView chronos={chronos} />}
              {status === 'ready' && view === 'dashboard' && <DashboardView chronos={chronos} showWeeklyChart={CONFIG.showWeeklyChart} />}
            </main>
          </div>
        </div>
      )}

      <Toast toast={chronos.toast} />
    </div>
  );
}
