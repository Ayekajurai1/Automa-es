import { useRef } from 'react';
import Field from '../../components/Field';
import { ActivityOptions, CollaboratorOptions, CostCenterOptions } from '../../components/Options';
import { elapsedMs } from '../../hooks/useChronos';
import { elapsedClock } from '../../utils/format';

const STATUS_LABEL = { running: 'Em execução', paused: 'Pausado', idle: 'Parado' };

export default function TimerCard({
  timer, collaborators, activities, costCenters,
  onStart, onPause, onFinish, onDiscard,
}) {
  const colab = useRef(null);
  const activity = useRef(null);
  const costCenter = useRef(null);
  const details = useRef(null);

  const elapsed = elapsedMs(timer);
  const running = timer.status === 'running';
  const idle = timer.status === 'idle';

  const start = () => onStart({
    colab: colab.current?.value ?? '',
    activityId: activity.current?.value ?? '',
    costCenterId: costCenter.current?.value ?? '',
    details: details.current?.value ?? '',
  });

  return (
    <section className="ui-card ui-card--raised timer-card">
      <div className="timer-card__status">
        <span className={'status-dot status-dot--' + timer.status} />
        <span className="meta-label">Cronômetro · {STATUS_LABEL[timer.status]}</span>
      </div>

      <div className="num timer-card__display">{elapsedClock(elapsed)}</div>

      <div className="timer-card__actions">
        <button className="ui-button ui-button--primary ui-button--lg" type="button" onClick={start} disabled={running}>
          {timer.status === 'paused' ? 'Retomar' : 'Iniciar'}
        </button>
        <button className="ui-button ui-button--outline" type="button" onClick={onPause} disabled={!running}>
          Pausar
        </button>
        <button className="ui-button ui-button--secondary" type="button" onClick={onFinish} disabled={idle || elapsed < 1000}>
          Finalizar e lançar
        </button>
        <button className="ui-button ui-button--ghost" type="button" onClick={onDiscard} disabled={idle}>
          Descartar
        </button>
      </div>

      <div className="timer-card__divider" />

      <div className="form-grid-2">
        <Field id="t-colab" label="Colaborador">
          <select className="ui-select" id="t-colab" ref={colab} disabled={running}>
            <CollaboratorOptions items={collaborators} />
          </select>
        </Field>
        <Field id="t-ativ" label="Atividade">
          <select className="ui-select" id="t-ativ" ref={activity} disabled={running}>
            <ActivityOptions items={activities} />
          </select>
        </Field>
        <Field id="t-cc" label="Centro de custo">
          <select className="ui-select" id="t-cc" ref={costCenter} disabled={running}>
            <CostCenterOptions items={costCenters} />
          </select>
        </Field>
        <Field id="t-det" label="Detalhamento">
          <input className="ui-input" id="t-det" type="text" ref={details} placeholder="O que está sendo executado" />
        </Field>
      </div>
    </section>
  );
}
