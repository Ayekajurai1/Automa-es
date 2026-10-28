import RegistryPanel from './RegistryPanel';
import { clock } from '../../utils/format';
import { sumHours } from '../../utils/metrics';

// Aba "Cadastros": colaboradores e centros de custo.
export default function CadastrosView({ chronos }) {
  const { entries, collaborators, costCenters } = chronos;

  const collaboratorRows = collaborators.map((c) => ({
    id: c.id, name: c.name, hours: clock(sumHours(entries, (e) => e.colab === c.name)),
  }));
  const costRows = costCenters.map((c) => ({
    id: c.id, name: c.name, hours: clock(sumHours(entries, (e) => e.costCenterId === c.id)),
  }));

  return (
    <div className="grid-auto grid-auto--340">
      <RegistryPanel
        title="Colaboradores"
        description="Quem pode aparecer nos apontamentos."
        inputId="c-nome"
        inputLabel="Nome"
        placeholder="Ex: Maria Silva"
        rows={collaboratorRows}
        onAdd={chronos.addCollaborator}
        onRemove={chronos.removeCollaborator}
      />
      <RegistryPanel
        title="Centros de custo"
        description="Código numérico seguido do nome, como no ERP."
        inputId="cc-nome"
        inputLabel="Centro de custo"
        placeholder="Ex: 2007 - Administração"
        rows={costRows}
        onAdd={chronos.addCostCenter}
        onRemove={chronos.removeCostCenter}
      />
    </div>
  );
}
