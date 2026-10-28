// Tipos de atividade: core (entrega finalística), admin (suporte) e other.

export const ACTIVITY_TYPES = [
  { value: 'core', label: 'Core' },
  { value: 'admin', label: 'Administrativa' },
  { value: 'other', label: 'Outro' },
];

export function typeLabel(type) {
  return type === 'core' ? 'Core' : type === 'admin' ? 'Administrativa' : 'Outro';
}

// Classes do badge exibido nas tabelas.
export function badgeClass(type) {
  if (type === 'core') return 'ui-badge--soft ui-badge--success';
  if (type === 'admin') return 'ui-badge--soft ui-badge--info';
  return 'ui-badge--outline ui-badge--warning';
}

// Classe de cor usada nos gráficos (ver .fill--* em styles/layout.css).
export function fillClass(type) {
  return type === 'core' ? 'fill--core' : type === 'admin' ? 'fill--admin' : 'fill--other';
}
