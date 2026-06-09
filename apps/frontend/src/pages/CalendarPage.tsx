import { useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Layers, MapPin } from "lucide-react";
import { modulesByKey, type ApiRecord, type ModuleDefinition } from "@parking/shared";
import { listModule } from "../api/client";
import { formatDate, humanize, recordTitle } from "../utils/format";
import { EmptyState } from "../components/EmptyState";
import { StatusBadge } from "../components/StatusBadge";
import { DetailDrawer } from "../components/DetailDrawer";
import {
  addMonths,
  calendarDaysForMonth,
  eventFromRecord,
  fiscalYearLabel,
  formatRange,
  getPeriodMonths,
  getPeriodStart,
  isoDate,
  moduleOptions,
  monthStart,
  periodRangeLabel,
  periodTitle,
  shiftPeriod,
  shortMonthFormatter,
  structureNameMap,
  weekdayFormatter,
  type CalendarEvent,
  type CalendarMode,
  type ModuleFilter
} from "./calendar/calendarUtils";

function includesAny(set: Set<string>, value: string) {
  return set.size === 0 || set.has(value);
}

export function CalendarPage() {
  const [structures, setStructures] = useState<ApiRecord[]>([]);
  const [cleaningRows, setCleaningRows] = useState<ApiRecord[]>([]);
  const [strippingRows, setStrippingRows] = useState<ApiRecord[]>([]);
  const [selectedModules, setSelectedModules] = useState<Set<ModuleFilter>>(new Set(["cleaning"]));
  const [selectedStructures, setSelectedStructures] = useState<Set<number>>(new Set());
  const [mode, setMode] = useState<CalendarMode>("month");
  const [anchorDate, setAnchorDate] = useState(() => monthStart(new Date()));
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      listModule(modulesByKey.structures, { pageSize: 100, sortBy: "name", sortDir: "asc" }),
      listModule(modulesByKey.cleaningLogs, { pageSize: 100, sortBy: "scheduled_date", sortDir: "asc" }),
      listModule(modulesByKey.strippingLogs, { pageSize: 100, sortBy: "scheduled_date", sortDir: "asc" })
    ])
      .then(([structureResult, cleaningResult, strippingResult]) => {
        setStructures(structureResult.data);
        setCleaningRows(cleaningResult.data);
        setStrippingRows(strippingResult.data);
        setSelectedStructures(new Set(structureResult.data.map((structure) => Number(structure.id))));
      })
      .finally(() => setLoading(false));
  }, []);

  const structureMap = useMemo(() => structureNameMap(structures), [structures]);

  const allEvents = useMemo(() => {
    const events = [
      ...cleaningRows.map((row) => eventFromRecord("cleaning", row, structureMap)),
      ...strippingRows.map((row) => eventFromRecord("stripping", row, structureMap))
    ].filter((event): event is CalendarEvent => Boolean(event));
    return events.sort((left, right) => left.date.localeCompare(right.date));
  }, [cleaningRows, strippingRows, structureMap]);

  const typeOptions = useMemo(() => Array.from(new Set(allEvents.map((event) => event.type).filter(Boolean))).sort(), [allEvents]);
  const statusOptions = useMemo(() => Array.from(new Set(allEvents.map((event) => event.status).filter(Boolean))).sort(), [allEvents]);

  const periodMonths = useMemo(() => getPeriodMonths(anchorDate, mode), [anchorDate, mode]);
  const periodStart = periodMonths[0];
  const periodEnd = addMonths(periodMonths[periodMonths.length - 1], 1);

  const filteredEvents = useMemo(
    () =>
      allEvents.filter((event) => {
        const eventTime = new Date(`${event.date}T12:00:00`).getTime();
        return (
          selectedModules.has(event.module) &&
          selectedStructures.has(event.structureId) &&
          eventTime >= periodStart.getTime() &&
          eventTime < periodEnd.getTime() &&
          includesAny(status ? new Set([status]) : new Set(), event.status) &&
          includesAny(type ? new Set([type]) : new Set(), event.type)
        );
      }),
    [allEvents, periodEnd, periodStart, selectedModules, selectedStructures, status, type]
  );

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const event of filteredEvents) {
      map.set(event.date, [...(map.get(event.date) ?? []), event]);
    }
    return map;
  }, [filteredEvents]);

  const eventsByMonth = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const event of filteredEvents) {
      const key = event.date.slice(0, 7);
      map.set(key, [...(map.get(key) ?? []), event]);
    }
    return map;
  }, [filteredEvents]);

  const annualColumns = useMemo(() => {
    if (mode !== "annual") {
      return [];
    }
    const start = getPeriodStart(anchorDate, mode);
    return Array.from({ length: 5 }, (_item, index) => {
      const columnStart = addMonths(start, index * 12);
      const columnEnd = addMonths(columnStart, 12);
      const events = filteredEvents.filter((event) => {
        const eventTime = new Date(`${event.date}T12:00:00`).getTime();
        return eventTime >= columnStart.getTime() && eventTime < columnEnd.getTime();
      });
      return { start: columnStart, end: columnEnd, events };
    });
  }, [anchorDate, filteredEvents, mode]);

  function toggleModule(module: ModuleFilter) {
    setSelectedModules((current) => {
      const next = new Set(current);
      if (next.has(module)) {
        next.delete(module);
      } else {
        next.add(module);
      }
      return next.size > 0 ? next : current;
    });
  }

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

  const allStructuresSelected = structures.length > 0 && selectedStructures.size === structures.length;
  const selectedDefinition: ModuleDefinition | undefined =
    selectedEvent?.module === "cleaning" ? modulesByKey.cleaningLogs : selectedEvent?.module === "stripping" ? modulesByKey.strippingLogs : undefined;

  return (
    <div className="page-stack">
      <section className="calendar-hero">
        <div>
          <p>Operations Calendar</p>
          <h1>Calendar View</h1>
          <span>See cleaning and stripping work across every structure, or narrow it to the places and work types you care about</span>
        </div>
        <div className="calendar-hero-stat">
          <strong>{filteredEvents.length}</strong>
          <span>shown in {periodTitle(anchorDate, mode)}</span>
        </div>
      </section>

      <section className="calendar-panel calendar-page-panel">
        <div className="calendar-controls">
          <div className="calendar-control-group">
            <span>
              <Layers size={14} />
              Work shown
            </span>
            <div className="calendar-chip-row">
              {moduleOptions.map((option) => (
                <button key={option.key} type="button" className={selectedModules.has(option.key) ? "active" : ""} onClick={() => toggleModule(option.key)}>
                  <i style={{ backgroundColor: option.color }} />
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="calendar-control-group">
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

          <div className="calendar-filter-grid">
            <label>
              <span>Calendar range</span>
              <select value={mode} onChange={(event) => setMode(event.target.value as CalendarMode)}>
                <option value="month">Monthly</option>
                <option value="quarter">Fiscal quarter</option>
                <option value="fiscal-year">Fiscal year</option>
                <option value="annual">Annual columns</option>
              </select>
            </label>
            <label>
              <span>Status</span>
              <select value={status} onChange={(event) => setStatus(event.target.value)}>
                <option value="">All statuses</option>
                {statusOptions.map((option) => (
                  <option key={option} value={option}>
                    {humanize(option)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Type</span>
              <select value={type} onChange={(event) => setType(event.target.value)}>
                <option value="">All types</option>
                {typeOptions.map((option) => (
                  <option key={option} value={option}>
                    {humanize(option)}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="calendar-title-row">
          <button className="icon-button" type="button" onClick={() => setAnchorDate((current) => shiftPeriod(current, mode, -1))} aria-label="Previous period">
            <ChevronLeft size={17} />
          </button>
          <div>
            <p>{mode === "month" ? "Month view" : mode === "quarter" ? "Fiscal quarter view" : mode === "fiscal-year" ? "Fiscal year view" : "Annual column view"}</p>
            <h2>{periodTitle(anchorDate, mode)}</h2>
            <span>{periodRangeLabel(anchorDate, mode)}</span>
          </div>
          <button className="icon-button" type="button" onClick={() => setAnchorDate((current) => shiftPeriod(current, mode, 1))} aria-label="Next period">
            <ChevronRight size={17} />
          </button>
          <button className="text-button" type="button" onClick={() => setAnchorDate(monthStart(new Date()))}>
            <CalendarDays size={15} />
            Today
          </button>
        </div>

        {mode === "month" ? (
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
                  {dayEvents.slice(0, 4).map((event) => (
                    <button className={`calendar-event calendar-event-${event.module}`} key={event.id} type="button" onClick={() => setSelectedEvent(event)}>
                      <span>{humanize(event.dateKind)}</span>
                      <strong>{humanize(event.title)}</strong>
                      <small>{event.structureName}</small>
                    </button>
                  ))}
                  {dayEvents.length > 4 ? <small className="calendar-more">+{dayEvents.length - 4} more</small> : null}
                </div>
              );
            })}
          </div>
        ) : mode === "annual" ? (
          <div className="calendar-annual-grid">
            {annualColumns.map((column) => (
              <section className="calendar-annual-column" key={isoDate(column.start)}>
                <div>
                  <p>{formatRange(column.start, column.end)}</p>
                  <h3>{fiscalYearLabel(column.start)}</h3>
                  <span>{column.events.length} records</span>
                </div>
                <div className="calendar-period-events">
                  {column.events.map((event) => (
                    <button className={`calendar-event calendar-event-${event.module}`} key={event.id} type="button" onClick={() => setSelectedEvent(event)}>
                      <span>{formatDate(event.date)}</span>
                      <strong>{humanize(event.title)}</strong>
                      <small>
                        {event.structureName}
                        {event.subtitle ? ` / ${humanize(event.subtitle)}` : ""}
                      </small>
                      {event.status ? <StatusBadge value={event.status} /> : null}
                    </button>
                  ))}
                  {column.events.length === 0 ? <p>No work logged</p> : null}
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
                    {monthEvents.slice(0, 8).map((event) => (
                      <button className={`calendar-event calendar-event-${event.module}`} key={event.id} type="button" onClick={() => setSelectedEvent(event)}>
                        <span>{formatDate(event.date)}</span>
                        <strong>{humanize(event.title)}</strong>
                        <small>
                          {event.structureName}
                          {event.subtitle ? ` / ${event.subtitle}` : ""}
                        </small>
                        {event.status ? <StatusBadge value={event.status} /> : null}
                      </button>
                    ))}
                    {monthEvents.length === 0 ? <p>No work logged</p> : null}
                    {monthEvents.length > 8 ? <small className="calendar-more">+{monthEvents.length - 8} more records</small> : null}
                  </div>
                </section>
              );
            })}
          </div>
        )}

        {!loading && filteredEvents.length === 0 ? <EmptyState title="No calendar records match the selected filters" /> : null}
        {loading ? <div className="table-loading">Loading calendar</div> : null}
      </section>
      {selectedDefinition ? (
        <DetailDrawer
          open={Boolean(selectedEvent)}
          mode="view"
          definition={selectedDefinition}
          record={selectedEvent?.record}
          onClose={() => setSelectedEvent(null)}
          onSubmit={() => undefined}
        />
      ) : null}
    </div>
  );
}
