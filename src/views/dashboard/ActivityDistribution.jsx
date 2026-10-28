import { ACTIVITY_TYPES, fillClass } from '../../utils/activityTypes';

export default function ActivityDistribution({ bars }) {
  return (
    <section className="ui-card chart-card">
      <div className="chart-card__title">Distribuição por atividade</div>
      <p className="chart-card__desc">Horas acumuladas no período filtrado.</p>

      <div className="hbars">
        {bars.map((b) => (
          <div key={b.key} className="hbar">
            <div className="hbar__label">{b.name}</div>
            <div className="hbar__track track">
              <div className={'hbar__fill ' + fillClass(b.type)} style={{ width: b.pct + '%' }} />
            </div>
            <div className="num hbar__value">{b.hours}</div>
          </div>
        ))}
      </div>

      <div className="legend">
        {ACTIVITY_TYPES.map((t) => (
          <span key={t.value} className="legend__item">
            <span className={'legend__swatch ' + fillClass(t.value)} />
            {t.label}
          </span>
        ))}
      </div>
    </section>
  );
}
