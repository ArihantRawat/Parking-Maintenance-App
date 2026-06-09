import { modulesByKey } from "@parking/shared";
import { AdvancedTable } from "../components/AdvancedTable";

export function SchedulerPage() {
  return (
    <div className="page-stack">
      <section className="dashboard-heading">
        <div>
          <h1>Scheduler</h1>
          <p>Create, filter, send, and track scheduled email reminders across all structures</p>
        </div>
      </section>
      <AdvancedTable definition={modulesByKey.reminders} title="Scheduler" />
    </div>
  );
}
