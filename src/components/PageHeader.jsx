import { PAGES } from '../data/pages';

export default function PageHeader({ view }) {
  const [title, subtitle] = PAGES[view] || PAGES.apontamento;
  const todayLabel = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });

  return (
    <header className="page-header">
      <div className="page-header__titles">
        <h3 className="page-header__title">{title}</h3>
        <div className="page-header__subtitle">{subtitle}</div>
      </div>
      <span className="ui-badge ui-badge--soft ui-badge--info">{todayLabel}</span>
    </header>
  );
}
