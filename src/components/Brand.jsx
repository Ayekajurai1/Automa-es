// Logotipo em texto "Chronos" (com "nos" na cor de destaque).
export default function Brand({ large = false }) {
  return (
    <div className={large ? 'brand brand--lg' : 'brand'}>
      Chro<span className="brand__accent">nos</span>
    </div>
  );
}
