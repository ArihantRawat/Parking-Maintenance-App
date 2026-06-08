import { db } from "../db/database.js";
import { isSmtpConfigured, sendReminderEmail } from "./mail.js";

type ReminderRow = Record<string, unknown>;

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

function updateReminderSystemFields(id: number, values: Record<string, unknown>) {
  const entries = Object.entries({ ...values, updated_at: nowIso() }).filter(([, value]) => value !== undefined);
  const assignments = entries.map(([key]) => `${key} = @${key}`);
  db.prepare(`UPDATE reminders SET ${assignments.join(", ")} WHERE id = @id`).run({ ...Object.fromEntries(entries), id });
  return db.prepare("SELECT * FROM reminders WHERE id = ?").get(id) as ReminderRow;
}

function reminderEmailBody(reminder: ReminderRow, structureName?: string) {
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
    "",
    reminder.notes ? `Notes: ${reminder.notes}` : "",
    "",
    "Please review this reminder and take the appropriate action.",
    "",
    "Thank you,",
    "Parking Structure Maintenance App"
  ].join("\n");
}

export async function sendScheduledReminder(reminder: ReminderRow, fallbackEmail?: string) {
  const to = String(fallbackEmail ?? reminder.email_to ?? "").trim();
  if (!to) {
    const failed = updateReminderSystemFields(Number(reminder.id), {
      status: "failed",
      notes: `${reminder.notes ?? ""}\nEmail failed at ${nowIso()}: no recipient email was configured.`
    });
    return { sent: false, emailConfigured: isSmtpConfigured(), reminder: failed, message: "No recipient email configured." };
  }

  if (!isSmtpConfigured()) {
    const failed = updateReminderSystemFields(Number(reminder.id), {
      status: "failed",
      email_to: to,
      notes: `${reminder.notes ?? ""}\nEmail failed at ${nowIso()}: SMTP is not configured.`
    });
    return { sent: false, emailConfigured: false, reminder: failed, message: "SMTP is not configured; reminder remains local-only." };
  }

  const structure = reminder.structure_id ? (db.prepare("SELECT name FROM structures WHERE id = ?").get(reminder.structure_id) as { name?: string } | undefined) : undefined;
  try {
    await sendReminderEmail(to, `Reminder: ${String(reminder.title ?? "Scheduled Reminder")}`, reminderEmailBody(reminder, structure?.name));
    const updated = updateReminderSystemFields(Number(reminder.id), {
      status: "completed",
      email_to: to,
      notes: `${reminder.notes ?? ""}\nEmail sent successfully at ${nowIso()}.`
    });
    return { sent: true, emailConfigured: true, reminder: updated };
  } catch (err) {
    const failed = updateReminderSystemFields(Number(reminder.id), {
      status: "failed",
      email_to: to,
      notes: `${reminder.notes ?? ""}\nEmail failed at ${nowIso()}: ${err instanceof Error ? err.message : "Unknown email error"}`
    });
    return { sent: false, emailConfigured: true, reminder: failed, message: err instanceof Error ? err.message : "Unable to send reminder email." };
  }
}

export async function processDueReminders() {
  const rows = db
    .prepare("SELECT * FROM reminders WHERE archived_at IS NULL AND status = 'scheduled' AND reminder_date IS NOT NULL AND email_to IS NOT NULL")
    .all() as ReminderRow[];
  const now = new Date();
  const dueRows = rows.filter((row) => {
    const scheduled = scheduledAt(row);
    return scheduled ? scheduled.getTime() <= now.getTime() : false;
  });

  for (const reminder of dueRows) {
    await sendScheduledReminder(reminder);
  }
  return dueRows.length;
}

export function startScheduler() {
  const interval = windowlessSetInterval(() => {
    processDueReminders().catch((error) => {
      console.error("Scheduled reminder processing failed:", error);
    });
  }, 5_000);
  return () => clearInterval(interval);
}

function windowlessSetInterval(callback: () => void, ms: number) {
  return setInterval(callback, ms);
}
