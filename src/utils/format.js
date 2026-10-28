// Funções de formatação de horas e datas.

export function pad(n) {
  return String(n).padStart(2, '0');
}

// Horas decimais → "HH:MM" (ex.: 1.5 → "01:30").
export function clock(h) {
  const t = Math.max(0, Math.round(Number(h || 0) * 3600));
  return pad(Math.floor(t / 3600)) + ':' + pad(Math.floor((t % 3600) / 60));
}

// Milissegundos → "HH:MM:SS" (usado no cronômetro).
export function elapsedClock(ms) {
  const t = Math.max(0, Math.floor(ms / 1000));
  return [Math.floor(t / 3600), Math.floor((t % 3600) / 60), t % 60].map(pad).join(':');
}

// Date → "AAAA-MM-DD" no fuso horário local.
// (O original usava toISOString(), que converte para UTC: no Brasil, depois das
// 21h, o "hoje" virava o dia seguinte.)
export function iso(d) {
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}

// "AAAA-MM-DD" → "DD/MM".
export function brDate(s) {
  const p = String(s).split('-');
  return p[2] + '/' + p[1];
}

// Identificador curto aleatório.
export function uid() {
  return Math.random().toString(36).slice(2, 10);
}

// Aceita "1:30", "01:30", "1.5" ou "1,5" e devolve horas decimais (NaN se inválido).
export function parseHours(v) {
  const s = String(v || '').trim().replace(',', '.');
  if (/^\d+(\.\d+)?$/.test(s)) return parseFloat(s);
  const p = s.split(':').map(Number);
  if (p.length !== 2 || p.some(Number.isNaN) || p[1] > 59) return NaN;
  return p[0] + p[1] / 60;
}

// Segunda-feira da semana de uma data.
export function mondayOf(date) {
  const monday = new Date(date);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return monday;
}
