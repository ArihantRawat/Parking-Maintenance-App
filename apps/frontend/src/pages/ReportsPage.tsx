import { ReportPanel } from "../components/ReportPanel";

export function ReportsPage() {
  return (
    <div className="page-stack">
      <section className="dashboard-heading">
        <div>
          <h1>Reports</h1>
          <p>Local Excel and PDF exports for maintenance, cleaning, stripping, signs, equipment, purchases, costs, and overdue tasks.</p>
        </div>
      </section>
      <ReportPanel />
    </div>
  );
}
