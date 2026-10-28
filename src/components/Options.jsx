// <option>s reutilizados nos selects de colaborador, atividade e centro de custo.

export function CollaboratorOptions({ items }) {
  return items.map((c) => <option key={c.id} value={c.name}>{c.name}</option>);
}

export function ActivityOptions({ items }) {
  return items.map((a) => <option key={a.id} value={a.id}>{a.name}</option>);
}

export function CostCenterOptions({ items }) {
  return items.map((c) => <option key={c.id} value={c.id}>{c.name}</option>);
}
