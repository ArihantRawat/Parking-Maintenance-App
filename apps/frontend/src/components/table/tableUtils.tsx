import type { ReactNode } from "react";
import type { FieldDefinition, ModuleDefinition } from "@parking/shared";
import { formatCurrency, formatDate, formatDateTime, formatTime, humanize } from "../../utils/format";
import type { FilterState, RelationMap } from "./types";

export const ALL_LEVELS_OPTION = "All Levels / Full Structure";

export const defaultTableMeta = {
  page: 1,
  pageSize: 20,
  total: 0,
  totalPages: 1
};

export function parseLevels(value: unknown) {
  return String(value ?? "")
    .split(/[\n,]/)
    .map((level) => level.trim())
    .filter(Boolean);
}

export function tableStorageKey(definition: ModuleDefinition, structureId?: number) {
  return `parking-table:${definition.key}:${structureId ?? "global"}`;
}

export function cleanFilters(filters: FilterState, allowedKeys: Set<string>, structureId?: number): FilterState {
  const output: FilterState = {};
  for (const [key, value] of Object.entries(filters)) {
    if (allowedKeys.has(key) && Object.values(value).some((entry) => entry !== undefined && entry !== "")) {
      output[key] = value;
    }
  }
  if (structureId) {
    output.structure_id = { value: String(structureId) };
  }
  return output;
}

export function valueForInput(value: unknown) {
  return value === undefined || value === null ? "" : String(value);
}

export function isInteractiveTarget(target: EventTarget | null) {
  return target instanceof Element && Boolean(target.closest("button, a, input, select, textarea"));
}

export function displayCell(field: FieldDefinition, value: unknown, relationMap: RelationMap): ReactNode {
  if (field.key === "file_path" && value) {
    return (
      <a href={String(value)} target="_blank" rel="noreferrer">
        {String(value)}
      </a>
    );
  }
  if (field.type === "date") {
    return formatDate(value);
  }
  if (field.type === "time") {
    return formatTime(value);
  }
  if (field.type === "datetime" || field.key.endsWith("_at")) {
    return formatDateTime(value);
  }
  if (field.key.includes("cost")) {
    return formatCurrency(value);
  }
  if (field.relation && value !== undefined && value !== null && value !== "") {
    return relationMap[field.key]?.[String(value)] ?? String(value);
  }
  if (field.type === "number") {
    return String(value ?? "");
  }
  if (field.type === "enum") {
    return humanize(String(value ?? ""));
  }
  return String(value ?? "");
}

export function downloadCsv(definition: ModuleDefinition, rows: Record<string, unknown>[], fields: FieldDefinition[]) {
  const headers = fields.map((field) => field.key);
  const labels = fields.map((field) => field.label);
  const lines = [
    labels.join(","),
    ...rows.map((row) =>
      headers
        .map((key) => {
          const raw = row[key] ?? "";
          return `"${String(raw).replaceAll('"', '""')}"`;
        })
        .join(",")
    )
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${definition.route}-filtered.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}
