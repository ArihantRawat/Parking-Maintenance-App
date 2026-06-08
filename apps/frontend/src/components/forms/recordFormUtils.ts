import type { ApiRecord, FieldDefinition } from "@parking/shared";

export const ALL_LEVELS_OPTION = "All Levels / Full Structure";

export function fileKey(file: File) {
  return `${file.name}:${file.size}:${file.lastModified}`;
}

export function parseLevels(value: unknown) {
  return String(value ?? "")
    .split(/[\n,]/)
    .map((level) => level.trim())
    .filter(Boolean);
}

export function initialValue(field: FieldDefinition, record?: ApiRecord, forcedStructureId?: number) {
  if (field.key === "structure_id" && forcedStructureId) {
    return forcedStructureId;
  }
  if (record?.[field.key] !== undefined && record?.[field.key] !== null) {
    return record[field.key];
  }
  if (field.type === "number") {
    return "";
  }
  if (field.type === "enum") {
    return field.enumValues?.[0] ?? "";
  }
  return "";
}
