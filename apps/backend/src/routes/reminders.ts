import { Router } from "express";
import { modulesByKey } from "@parking/shared";
import { db, transaction } from "../db/database.js";
import { asyncHandler, HttpError, sendData } from "../utils/api.js";
import { createRecord, getRecord } from "./crud.js";
import { sendScheduledReminder } from "../services/scheduler.js";

const offsets = [30, 7, 1];

function dateMinusDays(date: string, days: number) {
  const parsed = new Date(`${date}T12:00:00.000Z`);
  parsed.setUTCDate(parsed.getUTCDate() - days);
  return parsed.toISOString().slice(0, 10);
}

function exists(entityType: string, entityId: number, offsetDays: number) {
  return Boolean(
    db
      .prepare("SELECT id FROM reminders WHERE entity_type = ? AND entity_id = ? AND offset_days = ? AND archived_at IS NULL")
      .get(entityType, entityId, offsetDays)
  );
}

function generateForRows(entityType: string, rows: Array<Record<string, unknown>>, dateField: string, titlePrefix: string) {
  const created: Record<string, unknown>[] = [];
  for (const row of rows) {
    const targetDate = row[dateField];
    if (!targetDate) {
      continue;
    }
    for (const offset of offsets) {
      if (exists(entityType, Number(row.id), offset)) {
        continue;
      }
      created.push(
        createRecord(modulesByKey.reminders, {
          structure_id: row.structure_id,
          entity_type: entityType,
          entity_id: row.id,
          title: `${titlePrefix}: ${row.title ?? row.name ?? row.issue_type ?? row.cleaning_type ?? row.stripping_type ?? row.sign_type ?? "record"}`,
          message: `Generated reminder for ${titlePrefix.toLowerCase()}.`,
          event_type: "service due",
          reminder_type: entityType.replaceAll("-", " "),
          reminder_date: dateMinusDays(String(targetDate).slice(0, 10), offset),
          reminder_time: "09:00",
          frequency: "once",
          offset_days: offset,
          status: "scheduled",
          source: `${entityType}.${dateField}`,
          notes: `Generated ${offset} days before ${targetDate}.`
        })
      );
    }
  }
  return created;
}

export function createReminderActionsRouter() {
  const router = Router();

  router.post(
    "/generate",
    asyncHandler((_req, res) => {
      const created = transaction(() => {
        const rows: Record<string, unknown>[] = [];
        rows.push(
          ...generateForRows(
            "maintenance-tickets",
            db.prepare("SELECT id, structure_id, issue_type, due_date FROM maintenance_tickets WHERE due_date IS NOT NULL AND status NOT IN ('completed','cancelled') AND archived_at IS NULL").all() as Array<Record<string, unknown>>,
            "due_date",
            "Maintenance due"
          )
        );
        rows.push(
          ...generateForRows(
            "cleaning-logs",
            db.prepare("SELECT id, structure_id, cleaning_type, scheduled_date FROM cleaning_logs WHERE scheduled_date IS NOT NULL AND status NOT IN ('completed','cancelled') AND archived_at IS NULL").all() as Array<Record<string, unknown>>,
            "scheduled_date",
            "Cleaning scheduled"
          )
        );
        rows.push(
          ...generateForRows(
            "stripping-logs",
            db.prepare("SELECT id, structure_id, stripping_type, scheduled_date FROM stripping_logs WHERE scheduled_date IS NOT NULL AND status NOT IN ('completed','cancelled') AND archived_at IS NULL").all() as Array<Record<string, unknown>>,
            "scheduled_date",
            "Stripping scheduled"
          )
        );
        rows.push(
          ...generateForRows(
            "equipment",
            db.prepare("SELECT id, structure_id, name, warranty_expiry FROM equipment WHERE warranty_expiry IS NOT NULL AND status IN ('active','under repair') AND archived_at IS NULL").all() as Array<Record<string, unknown>>,
            "warranty_expiry",
            "Warranty expiry"
          )
        );
        rows.push(
          ...generateForRows(
            "signs",
            db.prepare("SELECT id, structure_id, sign_type, replacement_date FROM signs WHERE replacement_date IS NOT NULL AND status IN ('active','damaged','needs repair') AND archived_at IS NULL").all() as Array<Record<string, unknown>>,
            "replacement_date",
            "Sign replacement"
          )
        );
        return rows;
      });

      sendData(res.status(201), created, { count: created.length });
    })
  );

  router.post(
    "/:id/send",
    asyncHandler(async (req, res) => {
      const reminder = getRecord(modulesByKey.reminders, Number(req.params.id));
      const to = String(req.body.to ?? reminder.email_to ?? "");
      if (!to) {
        throw new HttpError(400, "Recipient email is required when sending a reminder. Add Email To on the reminder or enter one before sending.");
      }

      sendData(res, await sendScheduledReminder(reminder, to));
    })
  );

  return router;
}
