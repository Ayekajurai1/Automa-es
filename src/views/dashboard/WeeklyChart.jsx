// Barras empilhadas por semana: administrativo em cima, core embaixo.
export default function WeeklyChart({ weeks }) {
  return (
    <section className="ui-card chart-card">
      <div className="chart-card__title">Evolução semanal</div>
      <p className="chart-card__desc chart-card__desc--loose">Horas apontadas por semana — core em destaque.</p>

      <div className="week-chart">
        {weeks.map((w) => (
          <div key={w.key} className="week-chart__col">
            <div className="num week-chart__total">{w.total}</div>
            <div className="week-chart__seg--top fill--admin" style={{ height: w.adminPct + '%' }} />
            <div className="fill--core" style={{ height: w.corePct + '%' }} />
          </div>
        ))}
      </div>

      <div className="week-chart__labels">
        {weeks.map((w) => (
          <div key={w.key} className="week-chart__label">{w.label}</div>
        ))}
      </div>
    </section>
  );
}
