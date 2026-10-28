import Brand from './Brand';
import { MicrosoftLogo } from './icons';

export default function LoginScreen({ onLogin, busy = false, hint }) {
  return (
    <div className="login">
      <div className="ui-card ui-card--login">
        <div>
          <Brand large />
          <p className="login__tagline">Apontamento de horas e indicadores de performance.</p>
        </div>
        <div className="login__actions">
          <button
            className="ui-button ui-button--outline ui-button--lg ui-button--full-width login__sso"
            type="button"
            onClick={onLogin}
            disabled={busy}
          >
            <MicrosoftLogo />
            {busy ? 'Conectando…' : 'Entrar com Microsoft'}
          </button>
          <p className="login__hint">{hint}</p>
        </div>
      </div>
    </div>
  );
}
