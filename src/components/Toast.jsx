export default function Toast({ toast }) {
  if (!toast.message) return null;
  const tone = toast.tone === 'error' ? 'ui-alert--danger' : 'ui-alert--success';
  return (
    <div className={'ui-alert toast ' + tone} role="status">
      {toast.message}
    </div>
  );
}
