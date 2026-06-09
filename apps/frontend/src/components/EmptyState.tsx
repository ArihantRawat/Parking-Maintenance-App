import { Inbox } from "lucide-react";

export function EmptyState({ title = "No matching records found" }: { title?: string }) {
  return (
    <div className="empty-state">
      <Inbox size={22} />
      <span>{title}</span>
    </div>
  );
}
