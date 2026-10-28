export default function KpiCards({ kpis }) {
  return (
    <div className="grid-auto grid-auto--220">
      {kpis.map((k) => (
        <div key={k.key} className="ui-card ui-card--raised kpi">
          <div className="meta-label">{k.label}</div>
          <div className={
            'num kpi__value' +
            (k.variant !== 'number' ? ' kpi__value--' + k.variant : '') +
            (k.accent ? ' kpi__value--accent' : '')
          }>
            {k.value}
          </div>
          <div className="kpi__meta">{k.meta}</div>
        </div>
      ))}
    </div>
  );
}
