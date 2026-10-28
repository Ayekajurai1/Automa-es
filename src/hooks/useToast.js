import { useCallback, useEffect, useRef, useState } from 'react';

const EMPTY = { message: '', tone: 'success' };

// Mensagem temporária exibida no canto inferior esquerdo.
// tone: 'success' (padrão) ou 'error'.
export function useToast(duration = 2600) {
  const [toast, setToast] = useState(EMPTY);
  const timeout = useRef(null);

  const show = useCallback((message, tone = 'success') => {
    setToast({ message, tone });
    clearTimeout(timeout.current);
    timeout.current = setTimeout(() => setToast(EMPTY), duration);
  }, [duration]);

  useEffect(() => () => clearTimeout(timeout.current), []);

  return [toast, show];
}
