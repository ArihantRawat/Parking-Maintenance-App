import fs from "node:fs";
import path from "node:path";
import { db } from "../db/database.js";
import { config } from "../config.js";
import { isSmtpConfigured, sendReminderEmail, type ReminderEmailAttachment } from "./mail.js";

type ReminderRow = Record<string, unknown>;

const schedulerStateKey = "__parkingMaintenanceScheduler__";

let processingDueReminders = false;

function nowIso() {
  return new Date().toISOString();
}

function scheduledAt(reminder: ReminderRow) {
  const date = String(reminder.reminder_date ?? "").trim();
  const time = normalizeTime(String(reminder.reminder_time ?? "00:00").trim() || "00:00");
  if (!date) {
    return null;
  }
  const parsed = new Date(`${date}T${time}`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normalizeTime(value: string) {
  const trimmed = value.trim();
  const twelveHour = trimmed.match(/^(\d{1,2}):(\d{2})\s*([AP]M)$/i);
  if (!twelveHour) {
    return trimmed;
  }
  let hours = Number(twelveHour[1]);
  const minutes = twelveHour[2];
  const meridiem = twelveHour[3].toUpperCase();
  if (meridiem === "PM" && hours < 12) {
    hours += 12;
  }
  if (meridiem === "AM" && hours === 12) {
    hours = 0;
  }
  return `${String(hours).padStart(2, "0")}:${minutes}`;
}

function formatTime(value: unknown) {
  const normalized = normalizeTime(String(value ?? "").trim());
  const match = normalized.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) {
    return String(value ?? "");
  }
  const hours = Number(match[1]);
  const meridiem = hours >= 12 ? "PM" : "AM";
  return `${hours % 12 || 12}:${match[2]} ${meridiem}`;
}

function getReminder(id: number) {
  return db.prepare("SELECT * FROM reminders WHERE id = ?").get(id) as ReminderRow | undefined;
}

function updateReminderSystemFields(id: number, values: Record<string, unknown>) {
  const entries = Object.entries({ ...values, updated_at: nowIso() }).filter(([, value]) => value !== undefined);
  const assignments = entries.map(([key]) => `${key} = @${key}`);
  db.prepare(`UPDATE reminders SET ${assignments.join(", ")} WHERE id = @id`).run({ ...Object.fromEntries(entries), id });
  return getReminder(id) as ReminderRow;
}

function claimReminderForDelivery(id: number, manual = false) {
  const allowedStatuses = manual ? "('scheduled', 'failed')" : "('scheduled')";
  const result = db
    .prepare(
      `UPDATE reminders
       SET status = 'sending', updated_at = @updated_at
       WHERE id = @id
         AND archived_at IS NULL
         AND status IN ${allowedStatuses}`
    )
    .run({ id, updated_at: nowIso() });

  if (result.changes === 0) {
    return null;
  }

  return getReminder(id) ?? null;
}

function reminderEmailBody(reminder: ReminderRow, structureName?: string, attachmentCount = 0) {
  const scheduledFor = reminder.reminder_date ? [reminder.reminder_date, formatTime(reminder.reminder_time)].filter(Boolean).join(" at ") : "";
  return [
    "Hello,",
    "",
    "This is a scheduled reminder from the Parking Structure Maintenance App.",
    "",
    "Reminder Details",
    "----------------",
    `Event: ${reminder.title ?? "Scheduled Reminder"}`,
    `Message: ${reminder.message ?? "No message provided."}`,
    `Structure: ${structureName ?? "Not assigned"}`,
    `Scheduled For: ${scheduledFor || "Not specified"}`,
    `Event Type: ${reminder.event_type ?? "general"}`,
    `Reminder Type: ${reminder.reminder_type ?? reminder.entity_type ?? "general"}`,
    `Frequency: ${reminder.frequency ?? "once"}`,
    attachmentCount > 0 ? `Attachments: ${attachmentCount} file${attachmentCount === 1 ? "" : "s"} included with this email` : "",
    "",
    reminder.notes ? `Notes: ${reminder.notes}` : "",
    "",
    "Please review this reminder and take the appropriate action.",
    "",
    "Thank you,",
    "Parking Structure Maintenance App"
  ]
    .filter(Boolean)
    .join("\n");
}

function loadReminderEmailAttachments(reminderId: number): ReminderEmailAttachment[] {
  const rows = db
    .prepare(
      `SELECT file_name, file_path, mime_type
       FROM attachments
       WHERE archived_at IS NULL
         AND entity_id = ?
         AND entity_type IN ('reminders', 'reminder')`
    )
    .all(reminderId) as Array<{ file_name?: string; file_path?: string; mime_type?: string }>;

  return rows.flatMap((row) => {
    const relative = String(row.file_path ?? "").replace(/^\/files\/?/, "");
    if (!relative) {
      return [];
    }
    const diskPath = path.join(config.storageDir, relative);
    if (!fs.existsSync(diskPath)) {
      return [];
    }
    return [
      {
        filename: String(row.file_name ?? path.basename(diskPath)),
        path: diskPath,
        contentType: row.mime_type ? String(row.mime_type) : undefined
      }
    ];
  });
}

type SendReminderOptions = {
  manual?: boolean;
};

type SendReminderResult = {
  sent: boolean;
  emailConfigured: boolean;
  reminder?: ReminderRow;
  message?: string;
};

export async function sendScheduledReminder(
  reminderInput: ReminderRow | number,
  fallbackEmail?: string,
  options: SendReminderOptions = {}
): Promise<SendReminderResult> {
  const id = typeof reminderInput === "number" ? reminderInput : Number(reminderInput.id);
  const existing = typeof reminderInput === "number" ? getReminder(id) : reminderInput;

  if (!existing) {
    return { sent: false, emailConfigured: isSmtpConfigured(), message: "Reminder not found" };
  }

  const currentStatus = String(existing.status ?? "");
  if (currentStatus === "sending") {
    return { sent: false, emailConfigured: isSmtpConfigured(), reminder: existing, message: "This reminder is already being sent" };
  }
  if (currentStatus === "completed") {
    return { sent: false, emailConfigured: isSmtpConfigured(), reminder: existing, message: "This reminder was already sent" };
  }

  const reminder = claimReminderForDelivery(id, options.manual);
  if (!reminder) {
    const latest = getReminder(id);
    return {
      sent: false,
      emailConfigured: isSmtpConfigured(),
      reminder: latest,
      message: latest ? "Unable to send reminder in its current state" : "Reminder not found"
    };
  }

  const to = String(fallbackEmail ?? reminder.email_to ?? "").trim();
  if (!to) {
    const failed = updateReminderSystemFields(id, {
      status: "failed",
      notes: `${reminder.notes ?? ""}\nEmail failed at ${nowIso()}: no recipient email was configured`
    });
    return { sent: false, emailConfigured: isSmtpConfigured(), reminder: failed, message: "No recipient email configured" };
  }

  if (!isSmtpConfigured()) {
    const failed = updateReminderSystemFields(id, {
      status: "failed",
      email_to: to,
      notes: `${reminder.notes ?? ""}\nEmail failed at ${nowIso()}: SMTP is not configured`
    });
    return { sent: false, emailConfigured: false, reminder: failed, message: "SMTP is not configured; reminder remains local-only" };
  }

  const structure = reminder.structure_id
    ? (db.prepare("SELECT name FROM structures WHERE id = ?").get(reminder.structure_id) as { name?: string } | undefined)
    : undefined;

  try {
    const emailAttachments = loadReminderEmailAttachments(id);
    await sendReminderEmail(
      to,
      `Reminder: ${String(reminder.title ?? "Scheduled Reminder")}`,
      reminderEmailBody(reminder, structure?.name, emailAttachments.length),
      emailAttachments
    );
    const attachmentNote =
      emailAttachments.length > 0 ? `\nIncluded ${emailAttachments.length} attachment${emailAttachments.length === 1 ? "" : "s"} in the email` : "";
    const updated = updateReminderSystemFields(id, {
      status: "completed",
      email_to: to,
      notes: `${reminder.notes ?? ""}\nEmail sent successfully at ${nowIso()}${attachmentNote}`
    });
    return { sent: true, emailConfigured: true, reminder: updated };
  } catch (err) {
    const failed = updateReminderSystemFields(id, {
      status: "failed",
      email_to: to,
      notes: `${reminder.notes ?? ""}\nEmail failed at ${nowIso()}: ${err instanceof Error ? err.message : "Unknown email error"}`
    });
    return {
      sent: false,
      emailConfigured: true,
      reminder: failed,
      message: err instanceof Error ? err.message : "Unable to send reminder email"
    };
  }
}

export async function processDueReminders() {
  if (processingDueReminders) {
    return 0;
  }

  processingDueReminders = true;
  try {
    const rows = db
      .prepare("SELECT * FROM reminders WHERE archived_at IS NULL AND status = 'scheduled' AND reminder_date IS NOT NULL AND email_to IS NOT NULL")
      .all() as ReminderRow[];
    const now = new Date();
    const dueRows = rows.filter((row) => {
      const scheduled = scheduledAt(row);
      return scheduled ? scheduled.getTime() <= now.getTime() : false;
    });

    let sentCount = 0;
    for (const reminder of dueRows) {
      const result = await sendScheduledReminder(reminder);
      if (result.sent) {
        sentCount += 1;
      }
    }
    return sentCount;
  } finally {
    processingDueReminders = false;
  }
}

export function startScheduler() {
  db.prepare("UPDATE reminders SET status = 'scheduled', updated_at = ? WHERE status = 'sending' AND archived_at IS NULL").run(nowIso());

  const globalState = globalThis as typeof globalThis & {
    [schedulerStateKey]?: { interval?: ReturnType<typeof setInterval> };
  };

  if (globalState[schedulerStateKey]?.interval) {
    clearInterval(globalState[schedulerStateKey]?.interval);
  }

  const interval = setInterval(() => {
    processDueReminders().catch((error) => {
      console.error("Scheduled reminder processing failed:", error);
    });
  }, 30_000);

  globalState[schedulerStateKey] = { interval };

  return () => {
    clearInterval(interval);
    delete globalState[schedulerStateKey];
  };
}
