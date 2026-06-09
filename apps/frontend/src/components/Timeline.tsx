import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, Clock, Filter, MapPin, Rows3 } from "lucide-react";
import type { ApiRecord } from "@parking/shared";
import { modulesByKey } from "@parking/shared";
import { fetchTimeline, listModule } from "../api/client";
import { formatDateTime, humanize, recordTitle } from "../utils/format";
import { StatusBadge } from "./StatusBadge";
import { EmptyState } from "./EmptyState";
import {
  addMonths,
  calendarDaysForMonth,
  fiscalYearLabel,
  formatRange,
  getPeriodMonths,
  getPeriodStart,
  isoDate,
  monthStart,
  periodRangeLabel,
  periodTitle,
  shiftPeriod,
  shortMonthFormatter,
  weekdayFormatter,
  type CalendarMode
} from "../pages/calendar/calendarUtils";

type TimelineProps = {
  structureId?: number;
};

export function Timeline({ structureId }: TimelineProps) {
  const [rows, setRows] = useState<ApiRecord[]>([]);
  const [optionRows, setOptionRows] = useState<ApiRecord[]>([]);
  const [structures, setStructures] = useState<ApiRecord[]>([]);
  const [selectedStructures, setSelectedStructures] = useState<Set<number>>(new Set());
  const [selectedActivityTypes, setSelectedActivityTypes] = useState<Set<string>>(new Set());
  const [activityTypeMenuOpen, setActivityTypeMenuOpen] = useState(false);
  const [status, setStatus] = useState("");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");
  const [layout, setLayout] = useState<"vertical" | "horizontal">("vertical");
  const [view, setView] = useState<"timeline" | "calendar">("timeline");
  const [calendarMode, setCalendarMode] = useState<CalendarMode>("month");
  const [anchorDate, setAnchorDate] = useState(() => monthStart(new Date()));
  const [loading, setLoading] = useState(false);
  const isGlobalTimeline = !structureId;

  useEffect(() => {
    setLoading(true);
    fetchTimeline({ structure_id: structureId, status, pageSize: 500 })
      .then((result) => setRows(result.data))
      .finally(() => setLoading(false));
  }, [status, structureId]);

  useEffect(() => {
    fetchTimeline({ structure_id: structureId, pageSize: 500 }).then((result) => setOptionRows(result.data));
  }, [structureId]);

  useEffect(() => {
    if (!isGlobalTimeline) {
      setStructures([]);
      setSelectedStructures(new Set());
      return;
    }
    listModule(modulesByKey.structures, { pageSize: 100, sortBy: "name", sortDir: "asc" }).then((result) => {
      setStructures(result.data);
      setSelectedStructures(new Set(result.data.map((structure) => Number(structure.id))));
    });
  }, [isGlobalTimeline]);

  const sortedRows = useMemo(
    () =>
      rows
        .filter((event) => !isGlobalTimeline || selectedStructures.has(Number(event.structure_id ?? 0)))
        .filter((event) => selectedActivityTypes.has(String(event.entity_type ?? "")))
        .sort((a, b) => {
        const left = new Date(String(a.event_date ?? "")).getTime();
        const right = new Date(String(b.event_date ?? "")).getTime();
        return sortDir === "asc" ? left - right : right - left;
      }),
    [isGlobalTimeline, rows, selectedActivityTypes, selectedStructures, sortDir]
  );

  const activityTypes = useMemo(
    () => Array.from(new Set(optionRows.map((event) => String(event.entity_type ?? "")).filter(Boolean))).sort(),
    [optionRows]
  );
  const statuses = useMemo(() => Array.from(new Set(optionRows.map((event) => String(event.status ?? "")).filter(Boolean))).sort(), [optionRows]);
  useEffect(() => {
    setSelectedActivityTypes((current) => {
      const available = new Set(activityTypes);
      const next = new Set(Array.from(current).filter((type) => available.has(type)));
      if (next.size === 0) {
        return available;
      }
      if (current.size === activityTypes.length && Array.from(current).every((type) => available.has(type))) {
        return current;
      }
      return next;
    });
  }, [activityTypes]);

  const allStructuresSelected = structures.length > 0 && selectedStructures.size === structures.length;
  const allActivityTypesSelected = activityTypes.length > 0 && selectedActivityTypes.size === activityTypes.length;
  const activityTypeLabel = allActivityTypesSelected
    ? "All activity types"
    : selectedActivityTypes.size === 1
      ? humanize(Array.from(selectedActivityTypes)[0])
      : `${selectedActivityTypes.size} activity types`;
  const periodMonths = useMemo(() => getPeriodMonths(anchorDate, calendarMode), [anchorDate, calendarMode]);
  const periodStart = periodMonths[0];
  const periodEnd = addMonths(periodMonths[periodMonths.length - 1], 1);
  const calendarRows = useMemo(
    () =>
      sortedRows.filter((event) => {
        const eventTime = new Date(String(event.event_date ?? "")).getTime();
        return eventTime >= periodStart.getTime() && eventTime < periodEnd.getTime();
      }),
    [periodEnd, periodStart, sortedRows]
  );
  const eventsByDate = useMemo(() => {
    const output = new Map<string, ApiRecord[]>();
    for (const event of calendarRows) {
      const key = String(event.event_date ?? "").slice(0, 10);
      if (key) {
        output.set(key, [...(output.get(key) ?? []), event]);
      }
    }
    return output;
  }, [calendarRows]);
  const eventsByMonth = useMemo(() => {
    const output = new Map<string, ApiRecord[]>();
    for (const event of calendarRows) {
      const key = String(event.event_date ?? "").slice(0, 7);
      if (key) {
        output.set(key, [...(output.get(key) ?? []), event]);
      }
    }
    return output;
  }, [calendarRows]);
  const annualColumns = useMemo(() => {
    if (calendarMode !== "annual") {
      return [];
    }
    const start = getPeriodStart(anchorDate, calendarMode);
    return Array.from({ length: 5 }, (_item, index) => {
      const columnStart = addMonths(start, index * 12);
      const columnEnd = addMonths(columnStart, 12);
      const events = sortedRows.filter((event) => {
        const eventTime = new Date(String(event.event_date ?? "")).getTime();
        return eventTime >= columnStart.getTime() && eventTime < columnEnd.getTime();
      });
      return { start: columnStart, end: columnEnd, events };
    });
  }, [anchorDate, calendarMode, sortedRows]);

  function toggleStructure(id: number) {
    setSelectedStructures((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function selectAllStructures() {
    setSelectedStructures(new Set(structures.map((structure) => Number(structure.id))));
  }

  function toggleActivityType(type: string) {
    setSelectedActivityTypes((current) => {
      const next = new Set(current);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  }

  function selectAllActivityTypes() {
    setSelectedActivityTypes(new Set(activityTypes));
  }

  function renderCalendarEvent(event: ApiRecord) {
    return (
      <button className="calendar-event calendar-event-activity" key={String(event.id)} type="button">
        <span>{humanize(String(event.event_type ?? event.entity_type ?? "activity"))}</span>
        <strong>{humanize(String(event.title ?? "Activity"))}</strong>
        <small>
          {String(event.structure_name ?? "")}
          {event.actor ? ` / ${event.actor}` : ""}
        </small>
        {event.status ? <StatusBadge value={event.status} /> : null}
      </button>
    );
  }

  return (
    <section className="timeline-panel">
      <div className="section-header">
        <div>
          <h2>Activity Timeline</h2>
          <p>{structureId ? "See what happened in this structure, filtered by activity type and status" : "Review activity across structures, filtered by structure, activity type, and status"}</p>
        </div>
      </div>
      <div className="inline-filter-row">
        <Filter size={16} />
        <div className="segmented-control" aria-label="Activity view">
          <button className={view === "timeline" ? "active" : ""} type="button" onClick={() => setView("timeline")}>
            <Rows3 size={15} />
            Timeline
          </button>
          <button className={view === "calendar" ? "active" : ""} type="button" onClick={() => setView("calendar")}>
            <CalendarDays size={15} />
            Calendar
          </button>
        </div>
        <div className="timeline-multi-filter">
          <button type="button" className="text-button timeline-multi-trigger" onClick={() => setActivityTypeMenuOpen((current) => !current)} aria-expanded={activityTypeMenuOpen}>
            {activityTypeLabel}
            <ChevronDown size={14} />
          </button>
          {activityTypeMenuOpen ? (
            <div className="timeline-multi-menu">
              <button type="button" className={allActivityTypesSelected ? "active" : ""} onClick={selectAllActivityTypes}>
                {allActivityTypesSelected ? <Check size={14} /> : <span />}
                All activity types
              </button>
              {activityTypes.map((type) => (
                <button key={type} type="button" className={selectedActivityTypes.has(type) ? "active" : ""} onClick={() => toggleActivityType(type)}>
                  {selectedActivityTypes.has(type) ? <Check size={14} /> : <span />}
                  {humanize(type)}
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter by status">
          <option value="">All statuses</option>
          {statuses.map((item) => (
            <option key={item} value={item}>
              {humanize(item)}
            </option>
          ))}
        </select>
        <select value={sortDir} onChange={(event) => setSortDir(event.target.value as "desc" | "asc")} aria-label="Sort timeline">
          <option value="desc">Newest first</option>
          <option value="asc">Oldest first</option>
        </select>
        {view === "timeline" ? (
          <>
            <button className="text-button" type="button" onClick={() => setLayout((current) => (current === "vertical" ? "horizontal" : "vertical"))}>
              <Rows3 size={15} />
              {layout === "vertical" ? "Horizontal" : "Vertical"}
            </button>
          </>
        ) : (
          <select value={calendarMode} onChange={(event) => setCalendarMode(event.target.value as CalendarMode)} aria-label="Calendar range">
            <option value="month">Monthly</option>
            <option value="quarter">Fiscal quarter</option>
            <option value="fiscal-year">Fiscal year</option>
            <option value="annual">Annual columns</option>
          </select>
        )}
      </div>
      {isGlobalTimeline ? (
        <div className="calendar-control-group timeline-structure-filter">
          <span>
            <MapPin size={14} />
            Structures
          </span>
          <div className="calendar-chip-row calendar-chip-row-scroll">
            <button type="button" className={allStructuresSelected ? "active" : ""} onClick={selectAllStructures}>
              All structures
            </button>
            {structures.map((structure) => {
              const id = Number(structure.id);
              return (
                <button key={id} type="button" className={selectedStructures.has(id) ? "active" : ""} onClick={() => toggleStructure(id)}>
                  {recordTitle(structure)}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
      {view === "timeline" ? (
        <div className={`timeline-list timeline-list-${layout}`}>
          {sortedRows.map((event) => (
            <article className="timeline-item" key={String(event.id)}>
              <div className="timeline-dot">
                <Clock size={15} />
              </div>
              <div>
                <div className="timeline-item-header">
                  <strong>{humanize(String(event.title ?? ""))}</strong>
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
          {!loading && sortedRows.length === 0 ? <EmptyState title="No timeline activity found" /> : null}
          {loading ? <div className="table-loading">Loading</div> : null}
        </div>
      ) : (
        <div className="calendar-page-panel timeline-calendar-panel">
          <div className="calendar-title-row">
            <button className="icon-button" type="button" onClick={() => setAnchorDate((current) => shiftPeriod(current, calendarMode, -1))} aria-label="Previous period">
              <ChevronLeft size={17} />
            </button>
            <div>
              <p>{calendarMode === "month" ? "Month view" : calendarMode === "quarter" ? "Fiscal quarter view" : calendarMode === "fiscal-year" ? "Fiscal year view" : "Annual column view"}</p>
              <h2>{periodTitle(anchorDate, calendarMode)}</h2>
              <span>{periodRangeLabel(anchorDate, calendarMode)}</span>
            </div>
            <button className="icon-button" type="button" onClick={() => setAnchorDate((current) => shiftPeriod(current, calendarMode, 1))} aria-label="Next period">
              <ChevronRight size={17} />
            </button>
            <button className="text-button" type="button" onClick={() => setAnchorDate(monthStart(new Date()))}>
              <CalendarDays size={15} />
              Today
            </button>
          </div>
          {calendarMode === "month" ? (
            <div className="calendar-month-grid">
              {Array.from({ length: 7 }, (_item, index) => (
                <div className="calendar-weekday" key={index}>
                  {weekdayFormatter.format(new Date(2025, 5, index + 1))}
                </div>
              ))}
              {calendarDaysForMonth(anchorDate).map((cell, index) => {
                const dayEvents = cell.iso ? eventsByDate.get(cell.iso) ?? [] : [];
                return (
                  <div className={`calendar-day ${cell.iso === isoDate(new Date()) ? "calendar-day-today" : ""}`} key={`${cell.iso ?? "empty"}-${index}`}>
                    {cell.day ? <strong>{cell.day}</strong> : null}
                    {dayEvents.slice(0, 4).map(renderCalendarEvent)}
                    {dayEvents.length > 4 ? <small className="calendar-more">+{dayEvents.length - 4} more</small> : null}
                  </div>
                );
              })}
            </div>
          ) : calendarMode === "annual" ? (
            <div className="calendar-annual-grid">
              {annualColumns.map((column) => (
                <section className="calendar-annual-column" key={isoDate(column.start)}>
                  <div>
                    <p>{formatRange(column.start, column.end)}</p>
                    <h3>{fiscalYearLabel(column.start)}</h3>
                    <span>{column.events.length} records</span>
                  </div>
                  <div className="calendar-period-events">
                    {column.events.map(renderCalendarEvent)}
                    {column.events.length === 0 ? <p>No activity logged</p> : null}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <div className="calendar-period-grid">
              {periodMonths.map((month) => {
                const key = isoDate(month).slice(0, 7);
                const monthEvents = eventsByMonth.get(key) ?? [];
                return (
                  <section className="calendar-period-card" key={key}>
                    <div>
                      <p>{month.getFullYear()}</p>
                      <h3>{shortMonthFormatter.format(month)}</h3>
                      <span>{monthEvents.length} records</span>
                    </div>
                    <div className="calendar-period-events">
                      {monthEvents.slice(0, 8).map(renderCalendarEvent)}
                      {monthEvents.length === 0 ? <p>No activity logged</p> : null}
                      {monthEvents.length > 8 ? <small className="calendar-more">+{monthEvents.length - 8} more records</small> : null}
                    </div>
                  </section>
                );
              })}
            </div>
          )}
          {!loading && calendarRows.length === 0 ? <EmptyState title="No timeline activity found for this calendar range" /> : null}
          {loading ? <div className="table-loading">Loading</div> : null}
        </div>
      )}
    </section>
  );
}
