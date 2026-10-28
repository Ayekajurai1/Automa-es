// Exporta lançamentos para CSV (separador ";" e BOM UTF-8, para abrir direto no Excel).

import { clock } from './format';
import { indexById } from './metrics';
import { typeLabel } from './activityTypes';

export function exportEntriesCsv(rows, activities, costCenters, todayIso) {
  const acts = indexById(activities);
  const ccs = indexById(costCenters);
  const esc = (v) => '"' + String(v ?? '').replace(/"/g, '""') + '"';
  const head = ['Data', 'Colaborador', 'Atividade', 'Tipo', 'Centro de custo', 'Detalhamento', 'Horas (HH:MM)', 'Horas (decimal)'];

  const lines = rows.map((e) => {
    const a = acts[e.activityId];
    return [
      e.date.split('-').reverse().join('/'),
      e.colab,
      a ? a.name : '',
      typeLabel(a && a.type),
      ccs[e.costCenterId] ? ccs[e.costCenterId].name : '',
      e.details,
      clock(e.hours),
      String(e.hours.toFixed(2)).replace('.', ','),
    ].map(esc).join(';');
  });

  const csv = '\ufeff' + [head.map(esc).join(';'), ...lines].join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'chronos-relatorio-' + todayIso + '.csv';
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
