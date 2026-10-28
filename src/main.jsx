import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import DemoAuthProvider from './auth/DemoAuthProvider';
import { isSsoEnabled } from './auth/config';
import StartupError from './components/StartupError';
import './styles/index.css';

const root = createRoot(document.getElementById('root'));
const render = (tree) => root.render(<StrictMode>{tree}</StrictMode>);

if (isSsoEnabled) {
  // A biblioteca da Microsoft (MSAL) só é carregada quando o SSO está configurado.
  import('./auth/sso/createSsoTree')
    .then(({ createSsoTree }) => createSsoTree(<App />))
    .then(render)
    .catch((error) => {
      console.error('Falha ao iniciar o login com Microsoft:', error);
      render(<StartupError />);
    });
} else {
  render(<DemoAuthProvider><App /></DemoAuthProvider>);
}
