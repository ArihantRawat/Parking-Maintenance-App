import { useMemo, useState } from "react";
import { homeModuleKeys, modulesByKey, type ModuleKey } from "@parking/shared";
import { AdvancedTable } from "../components/AdvancedTable";

export function HomeDashboard() {
  const [activeModule, setActiveModule] = useState<ModuleKey>("structures");

  const activeDefinition = useMemo(() => modulesByKey[activeModule], [activeModule]);

  return (
    <div className="page-stack">
      <section className="dashboard-heading">
        <div>
          <h1>Parking Maintenance</h1>
          <p>Choose a workspace below, then add, filter, sort, and update records from one clean table.</p>
        </div>
      </section>

      <div className="module-tabs home-module-tabs">
        {homeModuleKeys.map((key) => (
          <button key={key} className={activeModule === key ? "active" : ""} onClick={() => setActiveModule(key)}>
            <strong>{modulesByKey[key].label}</strong>
            <span>{modulesByKey[key].description}</span>
          </button>
        ))}
      </div>

      <AdvancedTable definition={activeDefinition} />
    </div>
  );
}
