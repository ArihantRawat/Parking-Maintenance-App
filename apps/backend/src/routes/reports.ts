import { Router } from "express";
import PDFDocument from "pdfkit";
import { modulesByKey, type ModuleDefinition } from "@parking/shared";
import { db } from "../db/database.js";
import { asyncHandler, HttpError } from "../utils/api.js";
import { createWorkbookBuffer } from "../utils/xlsx.js";

type ReportRow = Record<string, unknown>;

const reportModules: Record<string, ModuleDefinition> = {
  maintenance: modulesByKey.maintenanceTickets,
  cleaning: modulesByKey.cleaningLogs,
  stripping: modulesByKey.strippingLogs,
  sign: modulesByKey.signs,
  equipment: modulesByKey.equipment,
  purchase: modulesByKey.purchases
};

function moduleReport(definition: ModuleDefinition, query: Record<string, unknown>) {
  const where = ["1 = 1"];
  const params: unknown[] = [];
  if (definition.supportsStructure && query.structure_id) {
    where.push("m.structure_id = ?");
    params.push(Number(query.structure_id));
  }
  if (query.status && definition.statusField) {
    where.push(`m.${definition.statusField} = ?`);
    params.push(String(query.status));
  }
  if (query.type) {
    const typeField = definition.fields.find((field) => ["type", "sign_type", "issue_type", "cleaning_type", "stripping_type", "item_type"].includes(field.key));
    if (typeField) {
      where.push(`m.${typeField.key} = ?`);
      params.push(String(query.type));
    }
  }
  if (query.category && definition.fields.some((field) => field.key === "category")) {
    where.push("m.category = ?");
    params.push(String(query.category));
  }
  if (query.from) {
    const dateField = definition.fields.find((field) => ["scheduled_date", "purchase_date", "installation_date", "inspection_date", "created_at"].includes(field.key));
    if (dateField) {
      where.push(`m.${dateField.key} >= ?`);
      params.push(String(query.from));
    }
  }
  if (query.to) {
    const dateField = definition.fields.find((field) => ["scheduled_date", "purchase_date", "installation_date", "inspection_date", "created_at"].includes(field.key));
    if (dateField) {
      where.push(`m.${dateField.key} <= ?`);
      params.push(String(query.to));
    }
  }
  if (!["structures", "vendors", "activityEvents"].includes(definition.key)) {
    where.push("m.archived_at IS NULL");
  }

  return db
    .prepare(
      `SELECT m.*, s.name AS structure_name
       FROM ${definition.tableName} m
       LEFT JOIN structures s ON s.id = m.structure_id
       WHERE ${where.join(" AND ")}
       ORDER BY m.id DESC
       LIMIT 5000`
    )
    .all(...params) as ReportRow[];
}

function structureSummary(query: Record<string, unknown>) {
  const where = query.structure_id ? "WHERE s.id = ?" : "";
  const params = query.structure_id ? [Number(query.structure_id)] : [];
  return db
    .prepare(
      `SELECT
        s.id,
        s.name,
        s.location,
        s.status,
        (SELECT COUNT(*) FROM parking_spaces p WHERE p.structure_id = s.id AND p.archived_at IS NULL) AS spaces,
        (SELECT COUNT(*) FROM signs sg WHERE sg.structure_id = s.id AND sg.archived_at IS NULL) AS signs,
        (SELECT COUNT(*) FROM equipment e WHERE e.structure_id = s.id AND e.archived_at IS NULL) AS equipment,
        (SELECT COUNT(*) FROM maintenance_tickets m WHERE m.structure_id = s.id AND m.status IN ('open','in progress') AND m.archived_at IS NULL) AS open_issues,
        (SELECT COUNT(*) FROM reminders r WHERE r.structure_id = s.id AND r.status IN ('pending','overdue') AND r.archived_at IS NULL) AS active_reminders,
        (SELECT COALESCE(SUM(cost),0) FROM purchases pu WHERE pu.structure_id = s.id AND pu.archived_at IS NULL) AS purchase_costs,
        (SELECT COALESCE(SUM(cost),0) FROM maintenance_tickets mt WHERE mt.structure_id = s.id AND mt.archived_at IS NULL) AS maintenance_costs
       FROM structures s
       ${where}
       ORDER BY s.name`
    )
    .all(...params) as ReportRow[];
}

function overdueTasks(query: Record<string, unknown>) {
  const params: unknown[] = [];
  const structureClause = query.structure_id ? "AND structure_id = ?" : "";
  if (query.structure_id) {
    params.push(Number(query.structure_id));
  }
  const today = new Date().toISOString().slice(0, 10);
  return db
    .prepare(
      `SELECT 'maintenance' AS module, id, structure_id, issue_type AS title, due_date AS task_date, status, priority, cost
       FROM maintenance_tickets
       WHERE archived_at IS NULL AND status NOT IN ('completed','cancelled') AND due_date < ? ${structureClause}
       UNION ALL
       SELECT 'reminder' AS module, id, structure_id, title, reminder_date AS task_date, status, NULL AS priority, 0 AS cost
       FROM reminders
       WHERE archived_at IS NULL AND status IN ('pending','overdue') AND reminder_date < ? ${structureClause}
       UNION ALL
       SELECT 'cleaning' AS module, id, structure_id, cleaning_type AS title, scheduled_date AS task_date, status, NULL AS priority, cost
       FROM cleaning_logs
       WHERE archived_at IS NULL AND status NOT IN ('completed','cancelled') AND scheduled_date < ? ${structureClause}
       UNION ALL
       SELECT 'stripping' AS module, id, structure_id, stripping_type AS title, scheduled_date AS task_date, status, NULL AS priority, cost
       FROM stripping_logs
       WHERE archived_at IS NULL AND status NOT IN ('completed','cancelled') AND scheduled_date < ? ${structureClause}
       ORDER BY task_date ASC`
    )
    .all(today, ...params, today, ...params, today, ...params, today, ...params) as ReportRow[];
}

function costSummary(query: Record<string, unknown>) {
  const structureWhere = query.structure_id ? "AND structure_id = ?" : "";
  const params = query.structure_id ? [Number(query.structure_id)] : [];
  return db
    .prepare(
      `SELECT s.id AS structure_id, s.name AS structure_name, 'maintenance' AS module, COALESCE(SUM(m.cost),0) AS total_cost, COUNT(m.id) AS records
       FROM structures s LEFT JOIN maintenance_tickets m ON m.structure_id = s.id AND m.archived_at IS NULL
       WHERE 1=1 ${query.structure_id ? "AND s.id = ?" : ""}
       GROUP BY s.id
       UNION ALL
       SELECT s.id, s.name, 'cleaning', COALESCE(SUM(c.cost),0), COUNT(c.id)
       FROM structures s LEFT JOIN cleaning_logs c ON c.structure_id = s.id AND c.archived_at IS NULL
       WHERE 1=1 ${query.structure_id ? "AND s.id = ?" : ""}
       GROUP BY s.id
       UNION ALL
       SELECT s.id, s.name, 'stripping', COALESCE(SUM(st.cost),0), COUNT(st.id)
       FROM structures s LEFT JOIN stripping_logs st ON st.structure_id = s.id AND st.archived_at IS NULL
       WHERE 1=1 ${query.structure_id ? "AND s.id = ?" : ""}
       GROUP BY s.id
       UNION ALL
       SELECT s.id, s.name, 'signs', COALESCE(SUM(si.cost),0), COUNT(si.id)
       FROM structures s LEFT JOIN signs si ON si.structure_id = s.id AND si.archived_at IS NULL
       WHERE 1=1 ${query.structure_id ? "AND s.id = ?" : ""}
       GROUP BY s.id
       UNION ALL
       SELECT s.id, s.name, 'equipment', COALESCE(SUM(e.cost),0), COUNT(e.id)
       FROM structures s LEFT JOIN equipment e ON e.structure_id = s.id AND e.archived_at IS NULL
       WHERE 1=1 ${query.structure_id ? "AND s.id = ?" : ""}
       GROUP BY s.id
       UNION ALL
       SELECT s.id, s.name, 'purchases', COALESCE(SUM(p.cost),0), COUNT(p.id)
       FROM structures s LEFT JOIN purchases p ON p.structure_id = s.id AND p.archived_at IS NULL
       WHERE 1=1 ${query.structure_id ? "AND s.id = ?" : ""}
       GROUP BY s.id`
    )
    .all(...params, ...params, ...params, ...params, ...params, ...params) as ReportRow[];
}

function rowsForReport(type: string, query: Record<string, unknown>) {
  if (type === "structure-summary") {
    return structureSummary(query);
  }
  if (type === "overdue-task") {
    return overdueTasks(query);
  }
  if (type === "cost-summary") {
    return costSummary(query);
  }
  const definition = reportModules[type];
  if (!definition) {
    throw new HttpError(404, "Unknown report type.");
  }
  return moduleReport(definition, query);
}

function sendExcel(res: import("express").Response, rows: ReportRow[], type: string) {
  const buffer = createWorkbookBuffer(rows);
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="${type}-report.xlsx"`);
  res.end(buffer);
}

function sendPdf(res: import("express").Response, rows: ReportRow[], type: string) {
  const doc = new PDFDocument({ margin: 36, size: "LETTER" });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${type}-report.pdf"`);
  doc.pipe(res);
  doc.fontSize(18).text(`${type.replaceAll("-", " ")} report`, { underline: true });
  doc.moveDown();
  if (rows.length === 0) {
    doc.fontSize(10).text("No records match the selected filters.");
    doc.end();
    return;
  }
  for (const row of rows.slice(0, 200)) {
    const text = Object.entries(row)
      .slice(0, 12)
      .map(([key, value]) => `${key}: ${value ?? ""}`)
      .join(" | ");
    doc.fontSize(8).text(text, { lineGap: 3 });
    doc.moveDown(0.35);
  }
  if (rows.length > 200) {
    doc.moveDown().fontSize(9).text(`PDF truncated at 200 rows. Export Excel for the full ${rows.length} rows.`);
  }
  doc.end();
}

export function createReportsRouter() {
  const router = Router();

  router.get(
    "/:type",
    asyncHandler((req, res) => {
      const type = String(req.params.type);
      const format = String(req.query.format ?? "json");
      const rows = rowsForReport(type, req.query);
      if (format === "xlsx" || format === "excel") {
        sendExcel(res, rows, type);
        return;
      }
      if (format === "pdf") {
        sendPdf(res, rows, type);
        return;
      }
      res.json({ data: rows, meta: { total: rows.length, reportType: type } });
    })
  );

  return router;
}
