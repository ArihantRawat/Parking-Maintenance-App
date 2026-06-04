import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { Clock, Filter, Rows3, ZoomIn, ZoomOut } from "lucide-react";
import type { ApiRecord } from "@parking/shared";
import { fetchTimeline } from "../api/client";
import { formatDateTime, humanize } from "../utils/format";
import { StatusBadge } from "./StatusBadge";
import { EmptyState } from "./EmptyState";

type TimelineProps = {
  structureId?: number;
};

export function Timeline({ structureId }: TimelineProps) {
  const [rows, setRows] = useState<ApiRecord[]>([]);
  const [optionRows, setOptionRows] = useState<ApiRecord[]>([]);
  const [module, setModule] = useState("");
  const [status, setStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");
  const [layout, setLayout] = useState<"vertical" | "horizontal">("vertical");
  const [zoom, setZoom] = useState(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetchTimeline({ structure_id: structureId, module, status, from, to, pageSize: 100 })
      .then((result) => setRows(result.data))
      .finally(() => setLoading(false));
  }, [from, module, status, structureId, to]);

  useEffect(() => {
    fetchTimeline({ structure_id: structureId, from, to, pageSize: 100 }).then((result) => setOptionRows(result.data));
  }, [from, structureId, to]);

  const sortedRows = useMemo(
    () =>
      [...rows].sort((a, b) => {
        const left = new Date(String(a.event_date ?? "")).getTime();
        const right = new Date(String(b.event_date ?? "")).getTime();
        return sortDir === "asc" ? left - right : right - left;
      }),
    [rows, sortDir]
  );

  const activityTypes = useMemo(
    () => Array.from(new Set(optionRows.map((event) => String(event.entity_type ?? "")).filter(Boolean))).sort(),
    [optionRows]
  );
  const statuses = useMemo(() => Array.from(new Set(optionRows.map((event) => String(event.status ?? "")).filter(Boolean))).sort(), [optionRows]);

  return (
    <section className="timeline-panel">
      <div className="section-header">
        <div>
          <h2>Activity Timeline</h2>
          <p>See what happened in this structure, filtered by activity type, status, and date.</p>
        </div>
      </div>
      <div className="inline-filter-row">
        <Filter size={16} />
        <select value={module} onChange={(event) => setModule(event.target.value)} aria-label="Filter by activity type">
          <option value="">All activity types</option>
          {activityTypes.map((type) => (
            <option key={type} value={type}>
              {humanize(type)}
            </option>
          ))}
        </select>
        <select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter by status">
          <option value="">All statuses</option>
          {statuses.map((item) => (
            <option key={item} value={item}>
              {humanize(item)}
            </option>
          ))}
        </select>
        <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
        <input type="date" value={to} onChange={(event) => setTo(event.target.value)} />
        <select value={sortDir} onChange={(event) => setSortDir(event.target.value as "desc" | "asc")} aria-label="Sort timeline">
          <option value="desc">Newest first</option>
          <option value="asc">Oldest first</option>
        </select>
        <button className="text-button" type="button" onClick={() => setLayout((current) => (current === "vertical" ? "horizontal" : "vertical"))}>
          <Rows3 size={15} />
          {layout === "vertical" ? "Horizontal" : "Vertical"}
        </button>
        <button className="icon-button" type="button" onClick={() => setZoom((current) => Math.max(0.8, Number((current - 0.1).toFixed(1))))} aria-label="Zoom out">
          <ZoomOut size={15} />
        </button>
        <span className="zoom-label">{Math.round(zoom * 100)}%</span>
        <button className="icon-button" type="button" onClick={() => setZoom((current) => Math.min(1.4, Number((current + 0.1).toFixed(1))))} aria-label="Zoom in">
          <ZoomIn size={15} />
        </button>
      </div>
      <div className={`timeline-list timeline-list-${layout}`} style={{ "--timeline-zoom": zoom } as CSSProperties}>
        {sortedRows.map((event) => (
          <article className="timeline-item" key={String(event.id)}>
            <div className="timeline-dot">
              <Clock size={15} />
            </div>
            <div>
              <div className="timeline-item-header">
                <strong>{event.title}</strong>
                <StatusBadge value={event.status} />
              </div>
              <p>{event.description}</p>
              <div className="timeline-meta">
                <span>{formatDateTime(event.event_date)}</span>
                <span>{humanize(String(event.entity_type ?? ""))}</span>
                <span>{String(event.structure_name ?? "")}</span>
                <span>{String(event.actor ?? "")}</span>
              </div>
            </div>
          </article>
        ))}
        {!loading && sortedRows.length === 0 ? <EmptyState title="No timeline events" /> : null}
        {loading ? <div className="table-loading">Loading</div> : null}
      </div>
    </section>
  );
}
