import { useMemo } from 'react';
import DashboardFilters from './DashboardFilters';
import KpiCards from './KpiCards';
import ActivityDistribution from './ActivityDistribution';
import CoreVsAdmin from './CoreVsAdmin';
import CollaboratorRanking from './CollaboratorRanking';
import WeeklyChart from './WeeklyChart';
import { dashboardData } from '../../utils/metrics';

// Aba "Dashboard": filtros, KPIs e gráficos de performance.
export default function DashboardView({ chronos, showWeeklyChart = true }) {
  const { filtered, activities, collaborators, filters } = chronos;
  const data = useMemo(() => dashboardData(filtered, activities), [filtered, activities]);

  return (
    <div className="stack">
      <DashboardFilters
        filters={filters}
        collaborators={collaborators}
        activities={activities}
        onChange={chronos.setFilter}
        onClear={chronos.clearFilters}
        onExport={chronos.exportReport}
      />

      <KpiCards kpis={data.kpis} />

      <div className="grid-auto grid-auto--380">
        <ActivityDistribution bars={data.activityBars} />
        <CoreVsAdmin share={data.share} byType={data.byType} total={data.total} />
      </div>

      <div className="grid-auto grid-auto--380">
        <CollaboratorRanking bars={data.collabBars} />
        <WeeklyChart weeks={showWeeklyChart ? data.weekBars : []} />
      </div>
    </div>
  );
}
