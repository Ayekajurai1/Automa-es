import { useRef } from 'react';
import Field from '../../components/Field';

// Card genérico de cadastro: campo + botão "Adicionar" + lista com horas e "Remover".
export default function RegistryPanel({
  title, description, inputId, inputLabel, placeholder, rows, onAdd, onRemove,
}) {
  const input = useRef(null);

  const submit = async () => {
    const ok = await onAdd(input.current.value.trim());
    if (ok) input.current.value = '';
  };

  return (
    <section className="ui-card panel">
      <div className="panel__title">{title}</div>
      <p className="panel__desc">{description}</p>

      <div className="inline-form">
        <Field id={inputId} label={inputLabel} className="inline-form__field">
          <input className="ui-input" id={inputId} type="text" ref={input} placeholder={placeholder} />
        </Field>
        <button className="ui-button ui-button--primary btn-field" type="button" onClick={submit}>
          Adicionar
        </button>
      </div>

      {rows.map((row) => (
        <div key={row.id} className="list-row">
          <span className="list-row__name">{row.name}</span>
          <span className="num list-row__meta">{row.hours}</span>
          <button className="ui-button ui-button--ghost ui-button--sm" type="button" onClick={() => onRemove(row.id)}>
            Remover
          </button>
        </div>
      ))}
    </section>
  );
}
