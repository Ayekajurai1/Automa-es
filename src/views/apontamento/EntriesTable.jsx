import { badgeClass } from '../../utils/activityTypes';
import { brDate, clock } from '../../utils/format';
import { indexById } from '../../utils/metrics';

const MAX_ROWS = 40;

export default function EntriesTable({ entries, activities, costCenters, canRemove, onRemove }) {
  const acts = indexById(activities);
  const ccs = indexById(costCenters);

  return (
    <section>
      <div className="section-head">
        <h4 className="section-head__title">Lançamentos recentes</h4>
        <span className="section-head__meta">
          {entries.length} lançamentos · exibindo os {MAX_ROWS} mais recentes
        </span>
      </div>

      <div className="ui-table-wrapper table-surface">
        <table className="ui-table ui-table--hoverable">
          <thead className="ui-table__header">
            <tr className="ui-table__row">
              <th className="ui-table__cell ui-table__cell--header col-90">Data</th>
              <th className="ui-table__cell ui-table__cell--header">Colaborador</th>
              <th className="ui-table__cell ui-table__cell--header">Atividade</th>
              <th className="ui-table__cell ui-table__cell--header">Centro de custo</th>
              <th className="ui-table__cell ui-table__cell--header">Detalhamento</th>
              <th className="ui-table__cell ui-table__cell--header col-90 cell-right">Tempo</th>
              <th className="ui-table__cell ui-table__cell--header col-80" />
            </tr>
          </thead>
          <tbody>
            {entries.slice(0, MAX_ROWS).map((e) => {
              const a = acts[e.activityId];
              return (
                <tr key={e.id} className="ui-table__row">
                  <td className="ui-table__cell num">{brDate(e.date)}</td>
                  <td className="ui-table__cell cell-strong">{e.colab}</td>
                  <td className="ui-table__cell">
                    <span className={'ui-badge ' + badgeClass(a && a.type)}>{a ? a.name : '—'}</span>
                  </td>
                  <td className="ui-table__cell">{ccs[e.costCenterId] ? ccs[e.costCenterId].name : '—'}</td>
                  <td className="ui-table__cell cell-details">{e.details || '—'}</td>
                  <td className="ui-table__cell num cell-total">{clock(e.hours)}</td>
                  <td className="ui-table__cell cell-right">
                    {canRemove(e) && (
                      <button className="ui-button ui-button--ghost ui-button--sm" type="button" onClick={() => onRemove(e.id)}>
                        Excluir
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {entries.length === 0 && (
        <div className="empty-state">
          Nenhum apontamento ainda. Use o cronômetro ou o lançamento manual acima.
        </div>
      )}
    </section>
  );
}
