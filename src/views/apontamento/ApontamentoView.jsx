import QuickStats from './QuickStats';
import TimerCard from './TimerCard';
import ManualEntryForm from './ManualEntryForm';
import PausedTimers from './PausedTimers';
import EntriesTable from './EntriesTable';

// Aba "Apontamento": cronômetro, lançamento manual e lista de lançamentos.
export default function ApontamentoView({ chronos }) {
  const { entries, activities, costCenters, collaborators, timer, paused } = chronos;
  const catalogs = { collaborators, activities, costCenters };

  return (
    <div className="stack">
      <QuickStats entries={entries} />

      <div className="grid-auto grid-auto--430">
        <TimerCard
          {...catalogs}
          timer={timer}
          onStart={chronos.timerStart}
          onPause={chronos.timerPause}
          onFinish={chronos.timerFinish}
          onDiscard={chronos.timerDiscard}
        />
        <div className="stack">
          <ManualEntryForm {...catalogs} onAdd={chronos.addEntry} />
        </div>
      </div>

      <PausedTimers
        paused={paused}
        activities={activities}
        onResume={chronos.resumePaused}
        onRemove={chronos.removePaused}
      />

      <EntriesTable
        entries={entries}
        activities={activities}
        costCenters={costCenters}
        canRemove={chronos.canRemoveEntry}
        onRemove={chronos.removeEntry}
      />
    </div>
  );
}
