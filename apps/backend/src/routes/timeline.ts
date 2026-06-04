import { Router } from "express";
import { db } from "../db/database.js";
import { asyncHandler, sendData } from "../utils/api.js";

const hiddenTimelineTypes = ["parking-space-groups", "maintenance-tickets", "inspections", "attachments"];

export function createTimelineRouter() {
  const router = Router();

  router.get(
    "/",
    asyncHandler((req, res) => {
      const where: string[] = [];
      const params: unknown[] = [];
      where.push(`e.entity_type NOT IN (${hiddenTimelineTypes.map(() => "?").join(", ")})`);
      params.push(...hiddenTimelineTypes);

      if (req.query.structure_id) {
        where.push("e.structure_id = ?");
        params.push(Number(req.query.structure_id));
      }
      if (req.query.module) {
        where.push("e.entity_type = ?");
        params.push(String(req.query.module));
      }
      if (req.query.status) {
        where.push("e.status = ?");
        params.push(String(req.query.status));
      }
      if (req.query.category) {
        where.push("e.category = ?");
        params.push(String(req.query.category));
      }
      if (req.query.from) {
        where.push("e.event_date >= ?");
        params.push(String(req.query.from));
      }
      if (req.query.to) {
        where.push("e.event_date <= ?");
        params.push(String(req.query.to));
      }

      const page = Math.max(1, Number(req.query.page ?? 1));
      const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize ?? 50)));
      const offset = (page - 1) * pageSize;
      const clause = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";

      const total = (
        db.prepare(`SELECT COUNT(*) AS count FROM activity_events e ${clause}`).get(...params) as {
          count: number;
        }
      ).count;
      const rows = db
        .prepare(
          `SELECT e.*, s.name AS structure_name
           FROM activity_events e
           LEFT JOIN structures s ON s.id = e.structure_id
           ${clause}
           ORDER BY e.event_date DESC, e.id DESC
           LIMIT ? OFFSET ?`
        )
        .all(...params, pageSize, offset);

      sendData(res, rows, {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize))
      });
    })
  );

  return router;
}
