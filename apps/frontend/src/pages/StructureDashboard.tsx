import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { modulesByKey, structureDashboardTabs, type ApiRecord } from "@parking/shared";
import { getModuleRecord } from "../api/client";
import { AdvancedTable } from "../components/AdvancedTable";
import { RelationshipView } from "../components/RelationshipView";
import { ReportPanel } from "../components/ReportPanel";
import { StrippingCalendar } from "../components/StrippingCalendar";
import { Timeline } from "../components/Timeline";
import { StatusBadge } from "../components/StatusBadge";
import { humanize, recordTitle } from "../utils/format";

const tabToDefinition = {
  signs: modulesByKey.signs,
  "sign-orders": modulesByKey.signOrders,
  equipment: modulesByKey.equipment,
  "cleaning-logs": modulesByKey.cleaningLogs,
  "stripping-logs": modulesByKey.strippingLogs,
  purchases: modulesByKey.purchases,
  reminders: modulesByKey.reminders
};

export function StructureDashboard() {
  const params = useParams();
  const navigate = useNavigate();
  const structureId = Number(params.id);
  const activeTab = params.tab ?? "overview";
  const [structure, setStructure] = useState<ApiRecord | null>(null);

  useEffect(() => {
    getModuleRecord(modulesByKey.structures, structureId).then((result) => setStructure(result.data));
  }, [structureId]);

  const currentTab = useMemo(() => structureDashboardTabs.find((tab) => tab.key === activeTab) ?? structureDashboardTabs[0], [activeTab]);

  function setTab(tab: string) {
    navigate(`/structures/${structureId}/${tab === "overview" ? "" : tab}`.replace(/\/$/, ""));
  }

  function renderTab() {
    if (activeTab === "overview") {
      return (
        <div className="overview-grid">
          <RelationshipView structureId={structureId} />
        </div>
      );
    }
    if (activeTab === "parking-spaces") {
      return <AdvancedTable definition={modulesByKey.parkingSpaces} structureId={structureId} />;
    }
    if (activeTab === "stripping-logs") {
      return (
        <div className="page-stack">
          <AdvancedTable definition={modulesByKey.strippingLogs} structureId={structureId} />
          <StrippingCalendar structureId={structureId} />
        </div>
      );
    }
    if (activeTab === "timeline") {
      return <Timeline structureId={structureId} />;
    }
    if (activeTab === "reports") {
      return <ReportPanel structureId={structureId} />;
    }

    const definition = tabToDefinition[activeTab as keyof typeof tabToDefinition];
    if (definition) {
      return <AdvancedTable definition={definition} structureId={structureId} />;
    }

    return <AdvancedTable definition={modulesByKey.parkingSpaces} structureId={structureId} />;
  }

  return (
    <div className="page-stack">
      <section className="structure-hero">
        <div>
          <div className="breadcrumb-row">
            <Link to="/structures">Structures</Link>
            <span>/</span>
            <span>{structure ? recordTitle(structure) : "Structure"}</span>
          </div>
          <h1>{structure ? recordTitle(structure) : "Structure"}</h1>
          <p>
            {[structure?.type ? humanize(String(structure.type)) : "", String(structure?.location ?? "")].filter(Boolean).join(" · ")}
          </p>
        </div>
        {structure ? <StatusBadge value={structure.status} /> : null}
      </section>

      <div className="structure-tabs">
        {structureDashboardTabs.map((tab) => (
          <button key={tab.key} className={currentTab.key === tab.key ? "active" : ""} onClick={() => setTab(tab.key)}>
            {tab.label}
          </button>
        ))}
      </div>

      {renderTab()}
    </div>
  );
}
