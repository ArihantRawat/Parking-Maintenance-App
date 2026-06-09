import { modulesByKey } from "@parking/shared";
import { AdvancedTable } from "../components/AdvancedTable";

export function StructureList() {
  return (
    <div className="page-stack">
      <section className="dashboard-heading">
        <div>
          <h1>Structures</h1>
          <p>Create and manage the structures that the rest of the records belong to.</p>
        </div>
      </section>
      <AdvancedTable definition={modulesByKey.structures} />
    </div>
  );
}
