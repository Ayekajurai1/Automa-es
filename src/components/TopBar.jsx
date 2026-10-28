import Brand from './Brand';
import { ClockIcon } from './icons';
import { TABS } from '../data/pages';

export default function TopBar({ view, onNavigate, showCadastros, dark, onToggleDark, user, onLogout }) {
  const tabs = showCadastros ? TABS : TABS.filter((tab) => tab.id !== 'cadastros');

  return (
    <div className="topbar">
      <div className="topbar__inner">
        <div className="topbar__brand">
          <Brand />
          <div className="topbar__org">FPFtech</div>
        </div>

        <nav className="ui-nav ui-nav--horizontal topbar__nav">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={'ui-nav__item tab' + (view === tab.id ? ' ui-nav__item--active' : '')}
              aria-current={view === tab.id ? 'page' : undefined}
              onClick={() => onNavigate(tab.id)}
            >
              <ClockIcon className="tab__icon" />
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>

        <label className="theme-toggle">
          <input
            className="ui-switch"
            type="checkbox"
            checked={dark}
            onChange={(ev) => onToggleDark(ev.target.checked)}
          />
          Modo escuro
        </label>

        <div className="topbar__user">
          <div className="user-info">
            <div className="user-info__name">{user.name}</div>
            <div className="user-info__role">{user.department}</div>
          </div>
          <button className="ui-button ui-button--outline ui-button--sm" type="button" onClick={onLogout}>
            Sair
          </button>
        </div>
      </div>
    </div>
  );
}
