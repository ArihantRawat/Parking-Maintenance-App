import { Router } from "express";
import { moduleDefinitions, type ModuleDefinition } from "@parking/shared";
import { db } from "../db/database.js";
import { asyncHandler, sendData } from "../utils/api.js";

const hiddenSearchModules = new Set(["parkingSpaceGroups", "maintenanceTickets", "inspections", "attachments", "purchases"]);

function titleFor(definition: ModuleDefinition, row: Record<string, unknown>) {
  return String(
    row.name ??
      row.title ??
      row.label ??
      row.space_number ??
      row.sign_type ??
      row.issue_type ??
      row.cleaning_type ??
      row.elevator_name ??
      row.stripping_type ??
      row.message ??
      row.inspection_type ??
      row.item_type ??
      row.file_name ??
      definition.singular
  );
}

function searchableColumns(definition: ModuleDefinition) {
  const columns = new Set(definition.fields.map((field) => field.key));
  return definition.searchFields.filter((field) => columns.has(field));
}

export function createSearchRouter() {
  const router = Router();

  router.get(
    "/",
    asyncHandler((req, res) => {
      const q = String(req.query.q ?? req.query.search ?? "").trim();
      const limit = Math.min(25, Math.max(1, Number(req.query.limit ?? 8)));
      if (!q) {
        sendData(res, []);
        return;
      }

      const grouped = moduleDefinitions
        .filter((definition) => definition.key !== "activityEvents" && !hiddenSearchModules.has(definition.key))
        .map((definition) => {
          const columns = searchableColumns(definition);
          if (columns.length === 0) {
            return null;
          }

          const where = columns.map((column) => `CAST(m.${column} AS TEXT) LIKE ?`).join(" OR ");
          const params = columns.map(() => `%${q}%`);
          const archiveClause = ["structures", "vendors"].includes(definition.key) ? "" : "AND m.archived_at IS NULL";
          const structureJoin = definition.supportsStructure
            ? "LEFT JOIN structures s ON s.id = m.structure_id"
            : definition.key === "structures"
              ? "LEFT JOIN structures s ON s.id = m.id"
              : "";
          const sql = `
            SELECT m.*, ${definition.supportsStructure || definition.key === "structures" ? "s.name" : "'Global'"} AS structure_name
            FROM ${definition.tableName} m
            ${structureJoin}
            WHERE (${where}) ${archiveClause}
            ORDER BY m.id DESC
            LIMIT ?
          `;

          const records = db.prepare(sql).all(...params, limit) as Record<string, unknown>[];
          return {
            moduleKey: definition.key,
            route: definition.route,
            label: definition.label,
            singular: definition.singular,
            records: records.map((record) => ({
              id: record.id,
              title: titleFor(definition, record),
              subtitle: String(record.notes ?? record.description ?? record.status ?? ""),
              status: record[definition.statusField ?? "status"] ?? null,
              structure_id: definition.key === "structures" ? record.id : record.structure_id ?? null,
              structure_name: record.structure_name ?? "Global",
              record
            }))
          };
        })
        .filter((group) => group && group.records.length > 0);

      sendData(res, grouped);
    })
  );

  return router;
}
