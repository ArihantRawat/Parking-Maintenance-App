import { type ModuleDefinition } from "@parking/shared";
import { db, nowIso } from "../db/database.js";

function chooseTitle(row: Record<string, unknown>, fallback: string) {
  return String(row.name ?? row.title ?? row.label ?? row.space_number ?? row.issue_type ?? row.sign_type ?? row.description ?? fallback);
}

export function recordAudit(definition: ModuleDefinition, id: number, action: string, row: Record<string, unknown>, summary?: string) {
  const structureId = Number(row.structure_id ?? (definition.key === "structures" ? id : 0)) || null;
  db.prepare(
    `INSERT INTO audit_log (structure_id, entity_type, entity_id, action, change_summary, actor, created_at)
     VALUES (@structure_id, @entity_type, @entity_id, @action, @change_summary, @actor, @created_at)`
  ).run({
    structure_id: structureId,
    entity_type: definition.route,
    entity_id: id,
    action,
    change_summary: summary ?? `${definition.singular} ${action}`,
    actor: "local user",
    created_at: nowIso()
  });
}

export function recordActivity(definition: ModuleDefinition, id: number, action: string, row: Record<string, unknown>) {
  if (definition.key === "activityEvents") {
    return;
  }

  const structureId = Number(row.structure_id ?? (definition.key === "structures" ? id : 0)) || null;
  if (!structureId) {
    return;
  }

  const title = `${definition.singular} ${action}: ${chooseTitle(row, `#${id}`)}`;
  db.prepare(
    `INSERT INTO activity_events
       (structure_id, entity_type, entity_id, event_type, event_date, title, description, status, category, actor, created_at)
     VALUES
       (@structure_id, @entity_type, @entity_id, @event_type, @event_date, @title, @description, @status, @category, @actor, @created_at)`
  ).run({
    structure_id: structureId,
    entity_type: definition.route,
    entity_id: id,
    event_type: action,
    event_date: nowIso(),
    title,
    description: `${definition.singular} ${action} locally.`,
    status: String(row[definition.statusField ?? "status"] ?? "info"),
    category: definition.route,
    actor: "local user",
    created_at: nowIso()
  });
}
