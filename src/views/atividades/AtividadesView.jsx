import { useRef } from 'react';
import Field from '../../components/Field';
import { ACTIVITY_TYPES, badgeClass, typeLabel } from '../../utils/activityTypes';
import { clock } from '../../utils/format';
import { sumHours } from '../../utils/metrics';

// Aba "Atividades": cadastro e catálogo de atividades (core / administrativa / outro).
export default function AtividadesView({ chronos }) {
  const { activities, entries, addActivity, removeActivity, isAdmin } = chronos;
  const name = useRef(null);
  const type = useRef(null);

  const submit = async () => {
    const ok = await addActivity({ name: name.current.value.trim(), type: type.current.value });
    if (ok) name.current.value = '';
  };

  return (
    <div className="grid-auto grid-auto--320">
      {/* Só admin cadastra e remove atividades (o servidor também confere). */}
      {isAdmin && (
        <section className="ui-card panel">
          <div className="panel__title">Nova atividade</div>
          <p className="panel__desc">
            Core alimenta o indicador de produtividade; administrativa e outro entram como suporte.
          </p>
          <div className="form-stack">
            <Field id="a-nome" label="Nome">
              <input className="ui-input" id="a-nome" type="text" ref={name} placeholder="Ex: Análise de prestação de contas" />
            </Field>
            <Field id="a-tipo" label="Tipo">
              <select className="ui-select" id="a-tipo" ref={type}>
                {ACTIVITY_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </Field>
            <button className="ui-button ui-button--primary ui-button--full-width" type="button" onClick={submit}>
              Adicionar atividade
            </button>
          </div>
        </section>
      )}

      <section>
        <div className="section-head">
          <h4 className="section-head__title">Atividades mapeadas</h4>
          <span className="section-head__meta">{activities.length} atividades</span>
        </div>
        <div className="ui-table-wrapper table-surface">
          <table className="ui-table ui-table--hoverable">
            <thead className="ui-table__header">
              <tr className="ui-table__row">
                <th className="ui-table__cell ui-table__cell--header">Atividade</th>
                <th className="ui-table__cell ui-table__cell--header col-150">Tipo</th>
                <th className="ui-table__cell ui-table__cell--header col-110 cell-right">Horas</th>
                <th className="ui-table__cell ui-table__cell--header col-90" />
              </tr>
            </thead>
            <tbody>
              {activities.map((a) => (
                <tr key={a.id} className="ui-table__row">
                  <td className="ui-table__cell cell-strong">{a.name}</td>
                  <td className="ui-table__cell">
                    <span className={'ui-badge ' + badgeClass(a.type)}>{typeLabel(a.type)}</span>
                  </td>
                  <td className="ui-table__cell num cell-right">
                    {clock(sumHours(entries, (e) => e.activityId === a.id))}
                  </td>
                  <td className="ui-table__cell cell-right">
                    {isAdmin && (
                      <button className="ui-button ui-button--ghost ui-button--sm" type="button" onClick={() => removeActivity(a.id)}>
                        Remover
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
