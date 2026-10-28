import { quickStats } from '../../utils/metrics';

export default function QuickStats({ entries }) {
  return (
    <div className="grid-auto grid-auto--220">
      {quickStats(entries).map((q) => (
        <div key={q.key} className="ui-card quick-stat">
          <div className="meta-label">{q.label}</div>
          <div className="num quick-stat__value">{q.value}</div>
          <div className="quick-stat__meta">{q.meta}</div>
        </div>
      ))}
    </div>
  );
}
