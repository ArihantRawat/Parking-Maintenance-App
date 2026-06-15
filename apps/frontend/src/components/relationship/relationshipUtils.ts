import { formatCurrency, formatDate, formatDateTime, humanize } from "../../utils/format";

export type GraphNode = {
  id: string;
  entityType: string;
  entityId: number;
  label: string;
  group: string;
  status?: string;
  data: Record<string, unknown>;
  [key: string]: unknown;
};

export type GraphEdge = {
  id: string;
  source: string;
  target: string;
  label: string;
  [key: string]: unknown;
};

export function groupColor(group: string) {
  const colors: Record<string, string> = {
    structures: "#174f4f",
    "parking-spaces": "#3f6f9f",
    "parking-space-groups": "#855d28",
    signs: "#8a3a3a",
    "sign-orders": "#755b9c",
    equipment: "#516b2d",
    "maintenance-tickets": "#9b4f2d",
    "cleaning-logs": "#1f6f85",
    "elevator-cleaning-logs": "#2563eb",
    "stripping-logs": "#6a5d37",
    "barricading-logs": "#b45309",
    inspections: "#495277",
    purchases: "#7d4d68",
    reminders: "#7c5d1f",
    attachments: "#666"
  };
  return colors[group] ?? "#4a5568";
}

export function formatDetailValue(key: string, value: unknown) {
  if (value === null || value === undefined || value === "") {
    return "";
  }
  if (key.includes("cost")) {
    return formatCurrency(value);
  }
  if (key.endsWith("_at")) {
    return formatDateTime(value);
  }
  if (key.includes("date") || key.includes("expiry")) {
    return formatDate(value);
  }
  const preserveRaw = /name|title|label|location|email|notes|description|number|url|path|file|address|phone|actor|vendor/i;
  if (typeof value === "string" && !preserveRaw.test(key)) {
    return humanize(value);
  }
  return String(value);
}

export function detailEntries(data: Record<string, unknown>) {
  return Object.entries(data)
    .filter(([key, value]) => key !== "id" && !key.endsWith("_id") && key !== "archived_at" && value !== null && value !== "")
    .slice(0, 14);
}

export function relationshipLinkCounts(edges: GraphEdge[], rootId?: string) {
  const map = new Map<string, number>();
  for (const edge of edges) {
    if (rootId && (edge.source === rootId || edge.target === rootId)) {
      continue;
    }
    map.set(edge.source, (map.get(edge.source) ?? 0) + 1);
    map.set(edge.target, (map.get(edge.target) ?? 0) + 1);
  }
  return map;
}
