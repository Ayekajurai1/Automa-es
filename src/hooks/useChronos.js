// Estado central do Chronos: navegação, cronômetro, lançamentos, cadastros e filtros.
// O login fica fora daqui, em src/auth/.
// Lançamentos e cadastros ficam no banco, pela API Flask (src/api/client.js).
// Os cronômetros ficam no navegador (localStorage) até virarem lançamento.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createApi } from '../api/client';
import { clock, iso, parseHours, uid } from '../utils/format';
import { EMPTY_FILTERS, filterEntries } from '../utils/metrics';
import { exportEntriesCsv } from '../utils/exportCsv';
import { useToast } from './useToast';

export const IDLE_TIMER = {
  status: 'idle', // 'idle' | 'running' | 'paused'
  accMs: 0,
  startedAt: null,
  colab: '',
  activityId: '',
  costCenterId: '',
  details: '',
};

// Tempo decorrido de um cronômetro, em milissegundos.
export function elapsedMs(t) {
  return t.accMs + (t.status === 'running' ? Date.now() - t.startedAt : 0);
}

// Id fixo do colaborador que representa o usuário logado (SSO ou simulado).
const SELF_ID = 'self';

const TIMERS_KEY = 'chronos-timers';

function loadTimers() {
  try {
    const saved = JSON.parse(localStorage.getItem(TIMERS_KEY) || 'null');
    if (saved && saved.timer && Array.isArray(saved.paused)) return saved;
  } catch {
    // localStorage indisponível ou conteúdo inválido: começa do zero.
  }
  return { timer: IDLE_TIMER, paused: [] };
}

// auth: contexto de login (src/auth/AuthContext.js). Os dados só são buscados
// depois que o usuário entra.
export function useChronos(config, auth) {
  const user = auth.isAuthenticated ? auth.user : null;
  const { getToken } = auth;
  const api = useMemo(() => createApi(getToken), [getToken]);

  const [view, setView] = useState(config.defaultView || 'apontamento');
  const [status, setStatus] = useState('idle'); // 'idle' | 'loading' | 'ready' | 'error'
  const [loadError, setLoadError] = useState('');
  const [me, setMe] = useState(null); // { email, name, role } segundo a API
  const [entries, setEntries] = useState([]);
  const [activities, setActivities] = useState([]);
  const [costCenters, setCostCenters] = useState([]);
  const [collaborators, setCollaborators] = useState([]);
  const [timer, setTimer] = useState(() => loadTimers().timer);
  const [paused, setPaused] = useState(() => loadTimers().paused);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [dark, setDark] = useState(!!config.darkMode);
  const [toast, showToast] = useToast();
  const [, setTick] = useState(0);

  const isAdmin = !!me && me.role === 'admin';

  // ── Carga inicial ─────────────────────────────────────────────────────
  const loggedIn = !!user;
  const reload = useCallback(() => {
    setStatus('loading');
    return api.get('data')
      .then((data) => {
        setMe(data.me);
        setEntries(data.entries);
        setActivities(data.activities);
        setCostCenters(data.costCenters);
        setCollaborators(data.collaborators);
        setStatus('ready');
      })
      .catch((error) => {
        setLoadError(error.message);
        setStatus('error');
      });
  }, [api]);

  useEffect(() => {
    if (loggedIn) {
      reload();
    } else {
      setStatus('idle');
      setMe(null);
    }
  }, [loggedIn, reload]);

  // Guarda os cronômetros para sobreviverem a uma recarga da página.
  useEffect(() => {
    try {
      localStorage.setItem(TIMERS_KEY, JSON.stringify({ timer, paused }));
    } catch {
      // Sem localStorage (modo privado restrito): os cronômetros ficam só na memória.
    }
  }, [timer, paused]);

  // Mostra o erro da API num aviso vermelho e devolve false para o formulário.
  const fail = (error) => {
    showToast(error.message, 'error');
    return false;
  };

  // Atualiza o visor do cronômetro a cada 0,5 s enquanto ele está rodando.
  useEffect(() => {
    if (timer.status !== 'running') return undefined;
    const iv = setInterval(() => setTick(Date.now()), 500);
    return () => clearInterval(iv);
  }, [timer.status]);

  // Inclui o usuário logado na lista de colaboradores, em primeiro lugar, para que
  // ele venha selecionado no cronômetro e no lançamento manual.
  const userName = user && user.name ? user.name.trim() : '';
  useEffect(() => {
    if (!userName || status !== 'ready') return;
    setCollaborators((list) => {
      const others = list.filter((c) => c.id !== SELF_ID);
      const same = (c) => c.name.toLowerCase() === userName.toLowerCase();
      const existing = others.find(same);
      if (existing) return [existing, ...others.filter((c) => c !== existing)];
      return [{ id: SELF_ID, name: userName }, ...others];
    });
  }, [userName, status]);

  // Aplica a classe .dark em <html> e <body> (o fundo em gradiente depende disso).
  useEffect(() => {
    document.body.classList.toggle('dark', dark);
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

  const todayIso = () => iso(new Date());

  // ── Cronômetro ────────────────────────────────────────────────────────
  const timerStart = (fields) => {
    if (timer.status === 'running') return;
    setTimer({ ...timer, ...fields, status: 'running', startedAt: Date.now() });
  };

  const timerPause = () => {
    if (timer.status !== 'running') return;
    const stopped = { ...timer, status: 'paused', accMs: elapsedMs(timer), startedAt: null, id: uid() };
    setPaused((list) => [stopped, ...list]);
    setTimer(IDLE_TIMER);
    showToast('Cronômetro pausado e guardado na lista.');
  };

  const timerDiscard = () => {
    setTimer(IDLE_TIMER);
    showToast('Tempo descartado.');
  };

  const timerFinish = () => {
    const hours = Math.round((elapsedMs(timer) / 3600000) * 100) / 100;
    if (hours <= 0) {
      showToast('Tempo curto demais para lançar.');
      return;
    }
    return api.post('entries', {
      colab: timer.colab,
      date: todayIso(),
      activityId: timer.activityId,
      costCenterId: timer.costCenterId,
      details: timer.details || '—',
      hours,
    })
      .then((entry) => {
        setEntries((list) => [entry, ...list]);
        setTimer(IDLE_TIMER);
        showToast('Apontamento de ' + clock(hours) + ' lançado pelo cronômetro.');
      })
      .catch(fail);
  };

  const resumePaused = (id) => {
    const p = paused.find((x) => x.id === id);
    if (!p) return;
    setPaused((list) => list.filter((x) => x.id !== id));
    setTimer({ ...p, status: 'running', startedAt: Date.now() });
  };

  const removePaused = (id) => setPaused((list) => list.filter((x) => x.id !== id));

  // ── Lançamentos ───────────────────────────────────────────────────────
  // As ações de cadastro devolvem uma Promise<boolean>: true quando o servidor
  // aceitou (o formulário então limpa os campos).
  const addEntry = async ({ colab, date, activityId, costCenterId, hoursText, details }) => {
    const hours = parseHours(hoursText);
    if (!Number.isFinite(hours) || hours <= 0) {
      showToast('Informe as horas no formato HH:MM.');
      return false;
    }
    return api.post('entries', {
      colab,
      date: date || todayIso(),
      activityId,
      costCenterId,
      details: details || '—',
      hours,
    })
      .then((entry) => {
        setEntries((list) => [entry, ...list]);
        showToast('Apontamento de ' + clock(hours) + ' lançado.');
        return true;
      })
      .catch(fail);
  };

  // Admin exclui qualquer lançamento; os demais, só os que criaram (regra do servidor).
  const canRemoveEntry = (entry) =>
    isAdmin || (!!me && !!entry.createdBy && entry.createdBy.toLowerCase() === me.email.toLowerCase());

  const removeEntry = (id) => api.del('entries/' + encodeURIComponent(id))
    .then(() => {
      setEntries((list) => list.filter((x) => x.id !== id));
      showToast('Apontamento excluído.');
    })
    .catch(fail);

  // ── Atividades ────────────────────────────────────────────────────────
  const addActivity = async ({ name, type }) => {
    if (!name) {
      showToast('Informe o nome da atividade.');
      return false;
    }
    return api.post('activities', { name, type })
      .then((activity) => {
        setActivities((list) => [...list, activity]);
        showToast('Atividade adicionada.');
        return true;
      })
      .catch(fail);
  };

  const removeActivity = (id) => api.del('activities/' + encodeURIComponent(id))
    .then(() => {
      setActivities((list) => list.filter((x) => x.id !== id));
      showToast('Atividade removida.');
    })
    .catch(fail);

  // ── Colaboradores e centros de custo ──────────────────────────────────
  const addCollaborator = async (name) => {
    if (!name) {
      showToast('Informe o nome do colaborador.');
      return false;
    }
    return api.post('collaborators', { name })
      .then((collaborator) => {
        setCollaborators((list) => [...list, collaborator]);
        showToast('Colaborador adicionado.');
        return true;
      })
      .catch(fail);
  };

  const removeCollaborator = (id) => {
    // O usuário logado aparece na lista mesmo sem estar no banco (login simulado).
    if (id === SELF_ID) {
      setCollaborators((list) => list.filter((x) => x.id !== id));
      return Promise.resolve();
    }
    return api.del('collaborators/' + encodeURIComponent(id))
      .then(() => setCollaborators((list) => list.filter((x) => x.id !== id)))
      .catch(fail);
  };

  const addCostCenter = async (name) => {
    const code = /^\d+/.exec(name);
    if (!code) {
      showToast('O centro de custo deve começar pelo código numérico.');
      return false;
    }
    // Mesmo formato de id dos centros de custo padrão: "cc-<código>".
    return api.post('cost-centers', { id: 'cc-' + code[0], name })
      .then((costCenter) => {
        setCostCenters((list) => [...list, costCenter]);
        showToast('Centro de custo adicionado.');
        return true;
      })
      .catch(fail);
  };

  const removeCostCenter = (id) => api.del('cost-centers/' + encodeURIComponent(id))
    .then(() => setCostCenters((list) => list.filter((x) => x.id !== id)))
    .catch(fail);

  // ── Dashboard ─────────────────────────────────────────────────────────
  const setFilter = (key, value) => setFilters((f) => ({ ...f, [key]: value }));
  const clearFilters = () => setFilters(EMPTY_FILTERS);
  const filtered = useMemo(() => filterEntries(entries, filters), [entries, filters]);

  const exportReport = () => {
    if (!filtered.length) {
      showToast('Nenhum lançamento no filtro atual.');
      return;
    }
    exportEntriesCsv(filtered, activities, costCenters, todayIso());
    showToast('Relatório exportado: ' + filtered.length + ' lançamentos.');
  };

  return {
    // estado
    view, status, loadError, me, isAdmin,
    entries, filtered, activities, costCenters, collaborators,
    timer, paused, filters, dark, toast,
    // ações
    setView, setDark, notify: showToast, reload,
    timerStart, timerPause, timerDiscard, timerFinish, resumePaused, removePaused,
    addEntry, removeEntry, canRemoveEntry,
    addActivity, removeActivity,
    addCollaborator, removeCollaborator, addCostCenter, removeCostCenter,
    setFilter, clearFilters, exportReport,
  };
}
