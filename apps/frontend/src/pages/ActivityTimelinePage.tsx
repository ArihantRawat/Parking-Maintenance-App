import { Timeline } from "../components/Timeline";

export function ActivityTimelinePage() {
  return (
    <div className="page-stack">
      <section className="dashboard-heading">
        <div>
          <h1>Activity Timeline</h1>
          <p>Review activity across all structures in timeline or calendar view</p>
        </div>
      </section>

      <Timeline />
    </div>
  );
}
