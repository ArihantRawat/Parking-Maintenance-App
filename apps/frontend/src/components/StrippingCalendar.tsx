import { useEffect, useMemo, useState } from "react";
import type { ApiRecord } from "@parking/shared";
import { modulesByKey } from "@parking/shared";
import { listModule } from "../api/client";
import { formatDate } from "../utils/format";
import { StatusBadge } from "./StatusBadge";

export function StrippingCalendar({ structureId }: { structureId?: number }) {
  const [rows, setRows] = useState<ApiRecord[]>([]);

  useEffect(() => {
    listModule(modulesByKey.strippingLogs, {
      pageSize: 100,
      sortBy: "scheduled_date",
      sortDir: "asc",
      filters: structureId ? { structure_id: { value: structureId } } : {}
    }).then((result) => setRows(result.data));
  }, [structureId]);

  const groups = useMemo(() => {
    const output = new Map<string, ApiRecord[]>();
    for (const row of rows) {
      const status = String(row.status ?? "scheduled");
      output.set(status, [...(output.get(status) ?? []), row]);
    }
    return Array.from(output.entries());
  }, [rows]);

  return (
    <section className="calendar-panel">
      <div className="section-header">
        <div>
          <h2>Stripping Timeline</h2>
          <p>Upcoming, ongoing, and completed stripping tasks</p>
        </div>
      </div>
      <div className="calendar-lanes">
        {groups.map(([status, items]) => (
          <div className="calendar-lane" key={status}>
            <div className="calendar-lane-header">
              <StatusBadge value={status} />
              <strong>{items.length}</strong>
            </div>
            {items.map((item) => (
              <article className="calendar-card" key={String(item.id)}>
                <strong>{String(item.stripping_type ?? `Task #${item.id}`)}</strong>
                <span>{formatDate(item.scheduled_date)}</span>
                <p>{String(item.affected_area ?? item.area ?? "")}</p>
              </article>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
