// Configurações do Chronos.
// No arquivo original estas opções eram "props" editáveis no painel do Claude Design.

export const CONFIG = {
  // Comportamento
  startOnLogin: true,          // abre na tela de login (false = entra direto no app; só no login simulado)
  defaultView: 'apontamento',  // 'apontamento' | 'atividades' | 'cadastros' | 'dashboard'

  // Aparência
  darkMode: false,             // inicia no modo escuro

  // Dashboard
  showWeeklyChart: true,       // exibe o gráfico "Evolução semanal"
};

// Usuário exibido no login simulado. Com o SSO ativo, nome e departamento vêm da conta Microsoft.
// O SSO é configurado em .env.local (veja .env.example e src/auth/config.js).
export const CURRENT_USER = {
  name: 'Maria Silva',
  department: 'Controladoria',
};
