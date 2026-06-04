import { Router } from "express";
import { moduleDefinitions, type ModuleDefinition } from "@parking/shared";
import { db } from "../db/database.js";
import { asyncHandler, HttpError, sendData } from "../utils/api.js";

const hiddenRelationshipModules = new Set(["parkingSpaceGroups", "maintenanceTickets", "inspections", "attachments"]);

type GraphNode = {
  id: string;
  entityType: string;
  entityId: number;
  label: string;
  status?: string | null;
  group: string;
  level: number;
  data: Record<string, unknown>;
};

type GraphEdge = {
  id: string;
  source: string;
  target: string;
  label: string;
};

function labelFor(definition: ModuleDefinition, row: Record<string, unknown>) {
  return String(
    row.name ??
      row.title ??
      row.label ??
      row.space_number ??
      row.sign_type ??
      row.issue_type ??
      row.cleaning_type ??
      row.stripping_type ??
      row.inspection_type ??
      row.item_type ??
      row.file_name ??
      definition.singular
  );
}

function nodeId(entityType: string, id: unknown) {
  return `${entityType}:${id}`;
}

function addEdge(edges: GraphEdge[], source: string, target: string, label: string) {
  if (!source || !target) {
    return;
  }
  const id = `${source}->${target}:${label}`;
  if (!edges.some((edge) => edge.id === id)) {
    edges.push({ id, source, target, label });
  }
}

export function createRelationshipRouter() {
  const router = Router();

  router.get(
    "/:structureId",
    asyncHandler((req, res) => {
      const structureId = Number(req.params.structureId);
      const structure = db.prepare("SELECT * FROM structures WHERE id = ?").get(structureId) as Record<string, unknown> | undefined;
      if (!structure) {
        throw new HttpError(404, "Structure not found.");
      }

      const filterTypes = String(req.query.types ?? "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);
      const statusFilter = req.query.status ? String(req.query.status) : null;
      const from = req.query.from ? String(req.query.from) : null;
      const to = req.query.to ? String(req.query.to) : null;

      const nodes: GraphNode[] = [
        {
          id: nodeId("structures", structure.id),
          entityType: "structures",
          entityId: Number(structure.id),
          label: String(structure.name),
          status: String(structure.status ?? ""),
          group: "structures",
          level: 0,
          data: structure
        }
      ];
      const edges: GraphEdge[] = [];

      const relevantModules = moduleDefinitions.filter(
        (definition) =>
          definition.supportsStructure &&
          definition.key !== "activityEvents" &&
          !hiddenRelationshipModules.has(definition.key) &&
          (filterTypes.length === 0 || filterTypes.includes(definition.route) || filterTypes.includes(definition.key))
      );

      for (const definition of relevantModules) {
        const where = ["structure_id = ?"];
        const params: unknown[] = [structureId];
        if (!["structures", "vendors", "activityEvents"].includes(definition.key)) {
          where.push("archived_at IS NULL");
        }
        if (statusFilter && definition.statusField) {
          where.push(`${definition.statusField} = ?`);
          params.push(statusFilter);
        }
        if (from && definition.fields.some((field) => field.key === "created_at")) {
          where.push("created_at >= ?");
          params.push(from);
        }
        if (to && definition.fields.some((field) => field.key === "created_at")) {
          where.push("created_at <= ?");
          params.push(to);
        }

        const rows = db.prepare(`SELECT * FROM ${definition.tableName} WHERE ${where.join(" AND ")} ORDER BY id DESC LIMIT 150`).all(...params) as Record<string, unknown>[];
        for (const row of rows) {
          const id = nodeId(definition.route, row.id);
          nodes.push({
            id,
            entityType: definition.route,
            entityId: Number(row.id),
            label: labelFor(definition, row),
            status: definition.statusField ? String(row[definition.statusField] ?? "") : null,
            group: definition.route,
            level: 1,
            data: row
          });
          addEdge(edges, nodeId("structures", structureId), id, definition.label);
        }
      }

      const nodeSet = new Set(nodes.map((node) => node.id));
      const maybeLink = (sourceType: string, sourceId: unknown, targetType: string, targetId: unknown, label: string) => {
        if (!sourceId || !targetId) {
          return;
        }
        const source = nodeId(sourceType, sourceId);
        const target = nodeId(targetType, targetId);
        if (nodeSet.has(source) && nodeSet.has(target)) {
          addEdge(edges, source, target, label);
        }
      };

      for (const node of nodes) {
        const row = node.data;
        if (node.entityType === "signs") {
          maybeLink("signs", row.id, "parking-spaces", row.space_id, "installed at");
          maybeLink("signs", row.id, "parking-space-groups", row.space_group_id, "assigned to group");
        }
        if (node.entityType === "sign-orders") {
          maybeLink("sign-orders", row.id, "signs", row.sign_id, "orders");
          maybeLink("sign-orders", row.id, "parking-spaces", row.space_id, "for space");
          maybeLink("sign-orders", row.id, "parking-space-groups", row.space_group_id, "for group");
        }
        if (node.entityType === "sign-order-items") {
          maybeLink("sign-order-items", row.id, "sign-orders", row.sign_order_id, "line item");
          maybeLink("sign-order-items", row.id, "signs", row.sign_id, "for sign");
        }
        if (node.entityType === "equipment") {
          maybeLink("equipment", row.id, "equipment", row.previous_equipment_id, "replaces");
        }
        if (node.entityType === "maintenance-tickets") {
          maybeLink("maintenance-tickets", row.id, "parking-spaces", row.space_id, "for space");
          maybeLink("maintenance-tickets", row.id, "signs", row.sign_id, "for sign");
          maybeLink("maintenance-tickets", row.id, "equipment", row.equipment_id, "for equipment");
        }
        if (node.entityType === "cleaning-logs") {
          maybeLink("cleaning-logs", row.id, "parking-spaces", row.space_id, "for space");
        }
        if (node.entityType === "inspections") {
          maybeLink("inspections", row.id, "parking-spaces", row.space_id, "inspected space");
          maybeLink("inspections", row.id, "signs", row.sign_id, "inspected sign");
          maybeLink("inspections", row.id, "equipment", row.equipment_id, "inspected equipment");
          maybeLink("inspections", row.id, "cleaning-logs", row.cleaning_log_id, "inspected cleaning");
          maybeLink("inspections", row.id, "stripping-logs", row.stripping_log_id, "inspected stripping");
          maybeLink("inspections", row.id, "maintenance-tickets", row.generated_ticket_id, "generated ticket");
        }
        if (["purchases", "reminders", "attachments"].includes(node.entityType)) {
          maybeLink(node.entityType, row.id, String(row.entity_type), row.entity_id, "linked record");
        }
      }

      sendData(res, { nodes, edges });
    })
  );

  return router;
}
