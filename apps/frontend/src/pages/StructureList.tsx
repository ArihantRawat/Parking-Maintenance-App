import { modulesByKey } from "@parking/shared";
import { AdvancedTable } from "../components/AdvancedTable";

export function StructureList() {
  return (
    <div className="page-stack">
      <section className="dashboard-heading">
        <div>
          <h1>Structures</h1>
          <p>Parking structures are the root entity for all traceable records.</p>
        </div>
      </section>
      <AdvancedTable definition={modulesByKey.structures} />
    </div>
  );
}
