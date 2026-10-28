import { clock } from '../../utils/format';

export default function CoreVsAdmin({ share, byType, total }) {
  const rows = [
    { key: 'core', label: 'Core — entrega finalística', hours: byType.core },
    { key: 'admin', label: 'Administrativa', hours: byType.admin },
    { key: 'other', label: 'Outro', hours: byType.other },
  ];

  return (
    <section className="ui-card chart-card">
      <div className="chart-card__title">Core vs. administrativo</div>
      <p className="chart-card__desc">Proporção do tempo em entrega finalística.</p>

      <div className="num core-share__value">{share.core}%</div>
      <div className="core-share__meta">{clock(byType.core) + ' de ' + clock(total) + ' no período'}</div>

      <div className="stacked-bar">
        <div className="fill--core" style={{ width: share.core + '%' }} />
        <div className="fill--admin" style={{ width: share.admin + '%' }} />
        <div className="fill--other" style={{ width: share.other + '%' }} />
      </div>

      <div className="type-rows">
        {rows.map((t) => (
          <div key={t.key} className="type-row">
            <span className="type-row__label">{t.label}</span>
            <span className="num type-row__value">{clock(t.hours)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
