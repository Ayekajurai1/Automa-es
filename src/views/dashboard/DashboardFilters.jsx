import Field from '../../components/Field';
import { DownloadIcon } from '../../components/icons';
import { ActivityOptions, CollaboratorOptions } from '../../components/Options';

export default function DashboardFilters({ filters, collaborators, activities, onChange, onClear, onExport }) {
  const bind = (key) => ({ value: filters[key], onChange: (ev) => onChange(key, ev.target.value) });

  return (
    <section className="ui-card filters">
      <Field id="d-colab" label="Colaborador">
        <select className="ui-select" id="d-colab" {...bind('colab')}>
          <option value="">Todos</option>
          <CollaboratorOptions items={collaborators} />
        </select>
      </Field>
      <Field id="d-ativ" label="Atividade">
        <select className="ui-select" id="d-ativ" {...bind('activityId')}>
          <option value="">Todas</option>
          <ActivityOptions items={activities} />
        </select>
      </Field>
      <Field id="d-de" label="Período — de">
        <input className="ui-input" id="d-de" type="date" {...bind('from')} />
      </Field>
      <Field id="d-ate" label="até">
        <input className="ui-input" id="d-ate" type="date" {...bind('to')} />
      </Field>
      <div className="filters__actions">
        <button className="ui-button ui-button--outline filters__button" type="button" onClick={onClear}>
          Limpar
        </button>
        <button className="ui-button ui-button--primary filters__button" type="button" onClick={onExport}>
          <DownloadIcon />
          Exportar relatório
        </button>
      </div>
    </section>
  );
}
