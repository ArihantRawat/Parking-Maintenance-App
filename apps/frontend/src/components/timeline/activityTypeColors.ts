import type { CSSProperties } from "react";

const ACTIVITY_TYPE_COLORS: Record<string, string> = {
  structures: "#5b4fcf",
  "parking-spaces": "#c8553d",
  "parking-space-groups": "#ea580c",
  signs: "#9333ea",
  "sign-orders": "#2563eb",
  "sign-order-items": "#db2777",
  equipment: "#d97706",
  "maintenance-tickets": "#dc2626",
  "cleaning-logs": "#059669",
  "elevator-cleaning-logs": "#2563eb",
  "stripping-logs": "#7c3aed",
  "barricading-logs": "#b45309",
  inspections: "#4f46e5",
  purchases: "#e11d48",
  reminders: "#ca8a04",
  attachments: "#64748b",
  vendors: "#0ea5e9",
  "activity-events": "#6b7280"
};

const FALLBACK_COLOR = "#6b7280";

export function normalizeActivityType(type: string) {
  return type.replace(/_/g, "-").trim().toLowerCase();
}

export function activityTypeColor(type: string) {
  const key = normalizeActivityType(type);
  return ACTIVITY_TYPE_COLORS[key] ?? FALLBACK_COLOR;
}

export function activityTypeStyles(type: string): CSSProperties {
  const color = activityTypeColor(type);
  return {
    color,
    backgroundColor: `${color}18`,
    borderColor: `${color}55`
  };
}

export function activityTypeDotStyle(type: string): CSSProperties {
  const color = activityTypeColor(type);
  return {
    color,
    backgroundColor: `${color}20`,
    border: `1px solid ${color}55`
  };
}

export function activityTypeSwatchStyle(type: string): CSSProperties {
  return { backgroundColor: activityTypeColor(type) };
}
