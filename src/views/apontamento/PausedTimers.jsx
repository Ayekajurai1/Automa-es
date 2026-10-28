import { indexById } from '../../utils/metrics';
import { elapsedClock } from '../../utils/format';

export default function PausedTimers({ paused, activities, onResume, onRemove }) {
  if (paused.length === 0) return null;
  const acts = indexById(activities);

  return (
    <section className="ui-card panel">
      <div className="panel__title panel__title--spaced">Cronômetros pausados</div>
      <div className="paused-list">
        {paused.map((p) => (
          <div key={p.id} className="paused-row">
            <span className="num paused-row__elapsed">{elapsedClock(p.accMs)}</span>
            <span className="paused-row__info">
              {p.colab || 'Sem colaborador'} · {acts[p.activityId] ? acts[p.activityId].name : 'Sem atividade'}
            </span>
            <button className="ui-button ui-button--outline ui-button--sm" type="button" onClick={() => onResume(p.id)}>
              Retomar
            </button>
            <button className="ui-button ui-button--ghost ui-button--sm" type="button" onClick={() => onRemove(p.id)}>
              Excluir
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
