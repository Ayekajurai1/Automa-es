export default function CollaboratorRanking({ bars }) {
  return (
    <section className="ui-card chart-card">
      <div className="chart-card__title">Horas por colaborador</div>
      <p className="chart-card__desc chart-card__desc--tight">Ranking no período filtrado.</p>

      {bars.map((c) => (
        <div key={c.key} className="rank-row">
          <div className="rank-row__main">
            <div className="rank-row__name">{c.name}</div>
            <div className="rank-row__track track">
              <div className="rank-row__fill fill--core" style={{ width: c.pct + '%' }} />
            </div>
          </div>
          <span className="num rank-row__value">{c.hours}</span>
        </div>
      ))}
    </section>
  );
}
