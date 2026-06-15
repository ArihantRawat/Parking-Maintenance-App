import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { homeModuleKeys, modulesByKey, type ModuleKey } from "@parking/shared";
import { AdvancedTable } from "../components/AdvancedTable";

const homeTabs = homeModuleKeys.map((key) => ({
  key,
  label: modulesByKey[key].label,
  description: modulesByKey[key].description
}));

const homeTabRoutes = new Map(homeModuleKeys.map((key) => [modulesByKey[key].route, key]));

function homeKeyFromParam(value: string | null) {
  if (!value) {
    return null;
  }
  if (homeModuleKeys.includes(value as ModuleKey)) {
    return value as ModuleKey;
  }
  return homeTabRoutes.get(value) ?? null;
}

export function HomeDashboard() {
  const [params, setParams] = useSearchParams();
  const activeTab = homeKeyFromParam(params.get("tab")) ?? "structures";
  const activeDefinition = useMemo(() => modulesByKey[activeTab], [activeTab]);

  function selectTab(key: ModuleKey) {
    setParams(key === "structures" ? {} : { tab: modulesByKey[key].route });
  }

  return (
    <div className="page-stack">
      <section className="dashboard-heading">
        <div>
          <h1>Parking Maintenance Logs</h1>
          <p>Choose a module below to view, add, filter, sort, and update records in one place</p>
        </div>
      </section>

      <div className="module-tabs home-module-tabs">
        {homeTabs.map((tab) => (
          <button key={tab.key} className={activeTab === tab.key ? "active" : ""} onClick={() => selectTab(tab.key)}>
            <strong>{tab.label}</strong>
            <span>{tab.description}</span>
          </button>
        ))}
      </div>

      <AdvancedTable definition={activeDefinition} />
    </div>
  );
}
