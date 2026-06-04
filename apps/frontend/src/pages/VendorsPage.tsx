import { modulesByKey } from "@parking/shared";
import { AdvancedTable } from "../components/AdvancedTable";

export function VendorsPage() {
  return (
    <div className="page-stack">
      <section className="dashboard-heading">
        <div>
          <h1>Vendors</h1>
          <p>Local vendor directory for purchases, maintenance, cleaning, signs, and equipment.</p>
        </div>
      </section>
      <AdvancedTable definition={modulesByKey.vendors} />
    </div>
  );
}
