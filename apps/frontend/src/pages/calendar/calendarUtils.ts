import type { ApiRecord } from "@parking/shared";
import { recordTitle } from "../../utils/format";

export type CalendarMode = "month" | "quarter" | "fiscal-year" | "annual";
export type ModuleFilter = "cleaning" | "elevator-cleaning" | "stripping" | "barricading";

export type CalendarEvent = {
  id: string;
  module: ModuleFilter;
  title: string;
  structureId: number;
  structureName: string;
  date: string;
  dateKind: "completed" | "scheduled";
  status: string;
  type: string;
  subtitle: string;
  record: ApiRecord;
};

export const moduleOptions: Array<{ key: ModuleFilter; label: string; color: string }> = [
  { key: "cleaning", label: "Cleaning Logs", color: "#1f6f85" },
  { key: "elevator-cleaning", label: "Elevator Cleaning", color: "#2563eb" },
  { key: "stripping", label: "Stripping Logs", color: "#6a5d37" },
  { key: "barricading", label: "Barricading Logs", color: "#b45309" }
];

const monthFormatter = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" });
const rangeFormatter = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" });

export const shortMonthFormatter = new Intl.DateTimeFormat(undefined, { month: "short" });
export const weekdayFormatter = new Intl.DateTimeFormat(undefined, { weekday: "short" });

export function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function monthStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

export function fiscalYearStart(date: Date) {
  return new Date(date.getMonth() >= 6 ? date.getFullYear() : date.getFullYear() - 1, 6, 1);
}

export function fiscalYearLabel(date: Date) {
  return `FY ${fiscalYearStart(date).getFullYear() + 1}`;
}

function fiscalQuarterStart(date: Date) {
  const start = fiscalYearStart(date);
  const offset = (date.getFullYear() - start.getFullYear()) * 12 + date.getMonth() - start.getMonth();
  return addMonths(start, Math.floor(offset / 3) * 3);
}

function fiscalQuarterNumber(date: Date) {
  const start = fiscalYearStart(date);
  const offset = (date.getFullYear() - start.getFullYear()) * 12 + date.getMonth() - start.getMonth();
  return Math.floor(offset / 3) + 1;
}

export function formatRange(start: Date, endExclusive: Date) {
  const end = new Date(endExclusive);
  end.setDate(end.getDate() - 1);
  return `${rangeFormatter.format(start)} - ${rangeFormatter.format(end)}`;
}

function daysInMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

export function getPeriodStart(date: Date, mode: CalendarMode) {
  if (mode === "annual") {
    return fiscalYearStart(addMonths(date, -24));
  }
  if (mode === "fiscal-year") {
    return fiscalYearStart(date);
  }
  if (mode === "quarter") {
    return fiscalQuarterStart(date);
  }
  return monthStart(date);
}

export function getPeriodMonths(date: Date, mode: CalendarMode) {
  const start = getPeriodStart(date, mode);
  const count = mode === "annual" ? 60 : mode === "fiscal-year" ? 12 : mode === "quarter" ? 3 : 1;
  return Array.from({ length: count }, (_item, index) => addMonths(start, index));
}

export function periodTitle(date: Date, mode: CalendarMode) {
  if (mode === "annual") {
    const start = getPeriodStart(date, mode);
    const end = addMonths(start, 60);
    return `${fiscalYearLabel(start)} - ${fiscalYearLabel(addMonths(end, -1))}`;
  }
  if (mode === "fiscal-year") {
    return fiscalYearLabel(date);
  }
  if (mode === "quarter") {
    return `Q${fiscalQuarterNumber(date)} ${fiscalYearLabel(date)}`;
  }
  return monthFormatter.format(date);
}

export function periodRangeLabel(date: Date, mode: CalendarMode) {
  const start = getPeriodStart(date, mode);
  const end = mode === "annual" ? addMonths(start, 60) : mode === "fiscal-year" ? addMonths(start, 12) : mode === "quarter" ? addMonths(start, 3) : addMonths(start, 1);
  return formatRange(start, end);
}

export function shiftPeriod(date: Date, mode: CalendarMode, direction: number) {
  if (mode === "annual" || mode === "fiscal-year") {
    return addMonths(date, direction * 12);
  }
  if (mode === "quarter") {
    return addMonths(date, direction * 3);
  }
  return addMonths(date, direction);
}

export function calendarDaysForMonth(date: Date) {
  const start = monthStart(date);
  const leading = start.getDay();
  const total = daysInMonth(date);
  const cells: Array<{ day?: number; iso?: string }> = [];
  for (let index = 0; index < leading; index += 1) {
    cells.push({});
  }
  for (let day = 1; day <= total; day += 1) {
    cells.push({ day, iso: isoDate(new Date(date.getFullYear(), date.getMonth(), day)) });
  }
  while (cells.length % 7 !== 0) {
    cells.push({});
  }
  return cells;
}

export function eventFromRecord(module: ModuleFilter, record: ApiRecord, structureMap: Map<number, string>): CalendarEvent | null {
  const completed = String(record.completed_date ?? "");
  const scheduled = String(record.scheduled_date ?? record.event_date ?? "");
  const date = completed || scheduled;
  if (!date) {
    return null;
  }
  const structureId = Number(record.structure_id ?? 0);
  const type =
    module === "cleaning" || module === "elevator-cleaning"
      ? String(record.cleaning_type ?? "Cleaning")
      : module === "barricading"
        ? "Barricading"
        : String(record.stripping_type ?? "Stripping");
  const subtitle =
    module === "cleaning"
      ? String(record.level ?? record.cleaning_scope ?? record.category ?? "")
      : module === "elevator-cleaning"
        ? String(record.elevator_name ?? record.level ?? record.category ?? "")
        : module === "barricading"
          ? String(record.message ?? "")
          : String(record.affected_area ?? "");
  return {
    id: `${module}-${record.id}`,
    module,
    title: type,
    structureId,
    structureName: structureId ? structureMap.get(structureId) ?? "Structure" : "No structure",
    date: date.slice(0, 10),
    dateKind: completed ? "completed" : "scheduled",
    status: String(record.status ?? ""),
    type,
    subtitle,
    record
  };
}

export function structureNameMap(structures: ApiRecord[]) {
  return new Map(structures.map((structure) => [Number(structure.id), recordTitle(structure)]));
}
