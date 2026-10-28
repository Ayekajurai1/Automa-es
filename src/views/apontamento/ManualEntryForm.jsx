import { useRef } from 'react';
import Field from '../../components/Field';
import { ActivityOptions, CollaboratorOptions, CostCenterOptions } from '../../components/Options';
import { iso } from '../../utils/format';

export default function ManualEntryForm({ collaborators, activities, costCenters, onAdd }) {
  const colab = useRef(null);
  const date = useRef(null);
  const activity = useRef(null);
  const hours = useRef(null);
  const costCenter = useRef(null);
  const details = useRef(null);

  const submit = async () => {
    const ok = await onAdd({
      colab: colab.current.value,
      date: date.current.value,
      activityId: activity.current.value,
      costCenterId: costCenter.current.value,
      hoursText: hours.current.value,
      details: details.current.value,
    });
    if (ok) {
      hours.current.value = '';
      details.current.value = '';
    }
  };

  return (
    <section className="ui-card panel">
      <div className="panel__title">Lançamento manual</div>
      <p className="panel__desc">Horas já executadas, no formato HH:MM.</p>

      <div className="form-grid-manual">
        <Field id="f-colab" label="Colaborador">
          <select className="ui-select" id="f-colab" ref={colab}>
            <CollaboratorOptions items={collaborators} />
          </select>
        </Field>
        <Field id="f-data" label="Data">
          <input className="ui-input" id="f-data" type="date" ref={date} defaultValue={iso(new Date())} />
        </Field>
        <Field id="f-ativ" label="Atividade">
          <select className="ui-select" id="f-ativ" ref={activity}>
            <ActivityOptions items={activities} />
          </select>
        </Field>
        <Field id="f-horas" label="Horas">
          <input className="ui-input" id="f-horas" type="text" ref={hours} placeholder="01:30" />
        </Field>
        <Field id="f-cc" label="Centro de custo">
          <select className="ui-select" id="f-cc" ref={costCenter}>
            <CostCenterOptions items={costCenters} />
          </select>
        </Field>
        <div className="form-align-end">
          <button className="ui-button ui-button--primary ui-button--full-width btn-field" type="button" onClick={submit}>
            Lançar
          </button>
        </div>
        <Field id="f-det" label="Detalhamento" className="form-span-all">
          <input className="ui-input" id="f-det" type="text" ref={details} placeholder="O que foi realizado" />
        </Field>
      </div>
    </section>
  );
}
