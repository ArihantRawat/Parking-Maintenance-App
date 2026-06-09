import { humanize } from "../utils/format";

type StatusBadgeProps = {
  value: unknown;
};

export function StatusBadge({ value }: StatusBadgeProps) {
  const status = String(value ?? "none").toLowerCase();
  const tone =
    status.includes("open") || status.includes("overdue") || status.includes("damaged") || status.includes("emergency") || status.includes("repair")
      ? "danger"
      : status.includes("progress") || status.includes("ongoing") || status.includes("ordered") || status.includes("scheduled") || status.includes("pending")
        ? "warning"
        : status.includes("completed") || status.includes("active") || status.includes("installed") || status.includes("passed") || status.includes("paid")
          ? "success"
          : "muted";

  return <span className={`status-badge status-badge-${tone}`}>{humanize(String(value ?? "none"))}</span>;
}
