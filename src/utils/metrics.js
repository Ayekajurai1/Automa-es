// Cálculos dos indicadores (cards rápidos, tabelas e dashboard).

import { brDate, clock, iso, mondayOf } from './format';

export const EMPTY_FILTERS = { colab: '', activityId: '', from: '', to: '' };

export function indexById(list) {
  return Object.fromEntries(list.map((item) => [item.id, item]));
}

export function sumHours(entries, predicate = () => true) {
  return entries.filter(predicate).reduce((n, e) => n + e.hours, 0);
}

export function filterEntries(entries, filters) {
  const { colab, activityId, from, to } = filters;
  return entries.filter((e) =>
    (!colab || e.colab === colab) &&
    (!activityId || e.activityId === activityId) &&
    (!from || e.date >= from) &&
    (!to || e.date <= to));
}

// Horas de hoje e da semana corrente (desde segunda-feira).
export function quickStats(entries, now = new Date()) {
  const todayIso = iso(now);
  const weekIso = iso(mondayOf(now));
  return [
    { key: 'd', label: 'Horas hoje', value: clock(sumHours(entries, (e) => e.date === todayIso)), meta: 'meta diária 09:00' },
    { key: 'w', label: 'Horas na semana', value: clock(sumHours(entries, (e) => e.date >= weekIso)), meta: 'desde segunda-feira' },
  ];
}

// Todos os números do dashboard a partir dos lançamentos já filtrados.
export function dashboardData(filtered, activities) {
  const acts = indexById(activities);
  const hoursByAct = {};
  const hoursByColab = {};
  const byType = { core: 0, admin: 0, other: 0 };
  const weeks = {};
  let total = 0;

  for (const e of filtered) {
    const a = acts[e.activityId];
    total += e.hours;
    hoursByAct[e.activityId] = (hoursByAct[e.activityId] || 0) + e.hours;
    hoursByColab[e.colab] = (hoursByColab[e.colab] || 0) + e.hours;
    byType[a ? a.type : 'other'] += e.hours;

    const k = iso(mondayOf(new Date(e.date + 'T00:00:00')));
    if (!weeks[k]) weeks[k] = { total: 0, core: 0 };
    weeks[k].total += e.hours;
    if (a && a.type === 'core') weeks[k].core += e.hours;
  }

  const pct = (v) => (total ? Math.round((v / total) * 1000) / 10 : 0);

  // Top 8 atividades
  const actEntries = Object.entries(hoursByAct).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const maxAct = actEntries.length ? actEntries[0][1] : 1;
  const activityBars = actEntries.map(([id, h]) => ({
    key: id,
    name: acts[id] ? acts[id].name : '—',
    type: acts[id] ? acts[id].type : 'other',
    hours: clock(h),
    pct: Math.max(2, (h / maxAct) * 100),
  }));

  // Ranking de colaboradores
  const colabEntries = Object.entries(hoursByColab).sort((a, b) => b[1] - a[1]);
  const maxColab = colabEntries.length ? colabEntries[0][1] : 1;
  const collabBars = colabEntries.map(([name, h]) => ({
    key: name, name, hours: clock(h), pct: Math.max(2, (h / maxColab) * 100),
  }));

  // Últimas 6 semanas (barra mais alta = 86% da área do gráfico)
  const weekKeys = Object.keys(weeks).sort().slice(-6);
  const maxWeek = weekKeys.reduce((m, k) => Math.max(m, weeks[k].total), 1);
  const weekBars = weekKeys.map((k) => {
    const w = weeks[k];
    const h = (w.total / maxWeek) * 86;
    const coreShare = w.total ? w.core / w.total : 0;
    return {
      key: k,
      label: brDate(k),
      total: Math.round(w.total) + 'h',
      corePct: h * coreShare,
      adminPct: h * (1 - coreShare),
    };
  });

  const topColab = colabEntries[0];
  const topAct = actEntries[0];
  const kpis = [
    { key: 't', label: 'Total de horas', value: clock(total), meta: filtered.length + ' lançamentos', variant: 'number' },
    { key: 'c', label: '% em atividades core', value: Math.round(pct(byType.core)) + '%', meta: clock(byType.core) + ' de ' + clock(total), variant: 'number', accent: true },
    { key: 'p', label: 'Colaborador destaque', value: topColab ? topColab[0] : '—', meta: topColab ? clock(topColab[1]) + ' apontadas' : 'sem dados', variant: 'name' },
    { key: 'a', label: 'Atividade mais registrada', value: topAct && acts[topAct[0]] ? acts[topAct[0]].name : '—', meta: topAct ? clock(topAct[1]) + ' no total' : 'sem dados', variant: 'text' },
  ];

  return {
    total,
    byType,
    share: { core: pct(byType.core), admin: pct(byType.admin), other: pct(byType.other) },
    activityBars,
    collabBars,
    weekBars,
    kpis,
  };
}
