import { useMemo, useState } from "react";
import { homeModuleKeys, modulesByKey, type ModuleKey } from "@parking/shared";
import { AdvancedTable } from "../components/AdvancedTable";
const homeTabs = homeModuleKeys.map((key) => ({
  key,
  label: modulesByKey[key].label,
  description: modulesByKey[key].description
}));

export function HomeDashboard() {
  const [activeTab, setActiveTab] = useState<ModuleKey>("structures");
  const activeDefinition = useMemo(() => modulesByKey[activeTab], [activeTab]);

  return (
    <div className="page-stack">
      <section className="dashboard-heading">
        <div>
          <h1>Parking Maintenance</h1>
          <p>Choose a module below to add, filter, sort, and update records in one place.</p>
        </div>
      </section>

      <div className="module-tabs home-module-tabs">
        {homeTabs.map((tab) => (
          <button key={tab.key} className={activeTab === tab.key ? "active" : ""} onClick={() => setActiveTab(tab.key)}>
            <strong>{tab.label}</strong>
            <span>{tab.description}</span>
          </button>
        ))}
      </div>

      <AdvancedTable definition={activeDefinition} />
    </div>
  );
}
