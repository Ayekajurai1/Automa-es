// Rótulo + controle de formulário.
export default function Field({ id, label, className, children }) {
  return (
    <div className={className}>
      <label className="ui-label" htmlFor={id}>{label}</label>
      {children}
    </div>
  );
}
