import { useEffect, useState } from 'react';
import { GRAPH_ME_URL, loginRequest } from '../config';

// Busca nome e departamento do usuário no Microsoft Graph.
// Se falhar (sem permissão, sem rede), o app segue com os dados do próprio token.
export function useGraphProfile(instance, account) {
  const [profile, setProfile] = useState(null);
  const accountId = account ? account.homeAccountId : null;

  useEffect(() => {
    if (!account) {
      setProfile(null);
      return undefined;
    }
    let cancelled = false;

    instance.acquireTokenSilent({ ...loginRequest, account })
      .then((result) => fetch(GRAPH_ME_URL, { headers: { Authorization: 'Bearer ' + result.accessToken } }))
      .then((res) => {
        if (res.ok) return res.json();
        console.warn('Microsoft Graph respondeu ' + res.status + ' ao buscar o perfil.');
        return null;
      })
      .then((data) => { if (!cancelled) setProfile(data); })
      .catch((error) => console.warn('Perfil do Microsoft Graph indisponível:', error && error.errorCode));

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instance, accountId]);

  return profile;
}
