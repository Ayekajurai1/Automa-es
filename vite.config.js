import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const root = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  plugins: [react()],
  // Caminhos relativos: o build funciona no GitHub Pages (https://usuario.github.io/chronos/)
  // e em qualquer outra pasta.
  base: './',
  server: {
    // Porta fixa: o endereço http://localhost:5173/auth/callback fica cadastrado no Entra ID.
    port: 5173,
    strictPort: true,
    // Libera o endereço público do GitHub Codespaces (https://<nome>-5173.app.github.dev).
    // Sem isso o Vite responde "Blocked request" e o login com Microsoft não carrega.
    allowedHosts: ['.app.github.dev'],
    // Repassa a API para o Flask (python app.py) rodando na porta 5000.
    proxy: {
      '/api': 'http://127.0.0.1:5000',
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(root, 'index.html'),
        // Página-ponte do login Microsoft (MSAL v5), publicada em /auth/callback.
        callback: resolve(root, 'auth/callback/index.html'),
      },
    },
  },
});
