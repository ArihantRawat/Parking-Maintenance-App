import { useEffect, useState } from "react";
import { BellRing, MailCheck, RefreshCw } from "lucide-react";
import { modulesByKey, type ApiRecord } from "@parking/shared";
import { generateReminders, listModule, sendReminderEmail } from "../api/client";
import { formatDate, recordTitle } from "../utils/format";

export function SettingsPage() {
  const [message, setMessage] = useState("");
  const [reminders, setReminders] = useState<ApiRecord[]>([]);
  const [selectedReminderId, setSelectedReminderId] = useState("");
  const [recipient, setRecipient] = useState("");
  const [sendingMessage, setSendingMessage] = useState("");

  async function loadReminders() {
    const result = await listModule(modulesByKey.reminders, {
      pageSize: 50,
      sortBy: "reminder_date",
      sortDir: "asc",
      filters: { status: { value: "scheduled" } }
    });
    setReminders(result.data);
    setSelectedReminderId((current) => current || String(result.data[0]?.id ?? ""));
  }

  useEffect(() => {
    loadReminders().catch(() => setReminders([]));
  }, []);

  async function runReminderGeneration() {
    const result = await generateReminders();
    setMessage(`Generated ${result.data.length} reminders.`);
    await loadReminders();
  }

  async function sendSelectedReminder() {
    if (!selectedReminderId) {
      setSendingMessage("Select a reminder first.");
      return;
    }
    const reminder = reminders.find((item) => String(item.id) === selectedReminderId);
    const email = recipient.trim() || String(reminder?.email_to ?? "").trim();
    if (!email) {
      setSendingMessage("Enter an email address or add Email To on the reminder.");
      return;
    }
    try {
      const result = await sendReminderEmail(Number(selectedReminderId), email);
      const payload = result.data as ApiRecord & { sent?: boolean; emailConfigured?: boolean; message?: string };
      setSendingMessage(payload.sent ? "Scheduler email sent and marked completed." : `Scheduler email failed: ${String(payload.message ?? "No email was sent.")}`);
      await loadReminders();
    } catch (err) {
      setSendingMessage(err instanceof Error ? err.message : "Unable to send reminder email.");
    }
  }

  return (
    <div className="page-stack">
      <section className="dashboard-heading">
        <div>
          <h1>Settings</h1>
          <p>Local-first configuration and scheduler email checks.</p>
        </div>
      </section>
      <section className="settings-panel">
        <div>
          <h2>Scheduler Generation</h2>
          <p>Creates scheduled 30 day, 7 day, and 1 day email reminders from due dates, schedules, warranty expiry, and sign replacement dates.</p>
        </div>
        <button className="primary-button" onClick={runReminderGeneration}>
          <BellRing size={16} />
          Generate scheduler items
        </button>
        {message ? <div className="settings-message">{message}</div> : null}
      </section>

      <section className="settings-panel settings-panel-form">
        <div>
          <h2>Scheduler Email Check</h2>
          <p>Send one scheduled item to confirm your local SMTP settings and email delivery.</p>
        </div>
        <button className="icon-text-button" type="button" onClick={loadReminders}>
          <RefreshCw size={16} />
          Refresh
        </button>
        <label>
          <span>Scheduled Item</span>
          <select value={selectedReminderId} onChange={(event) => setSelectedReminderId(event.target.value)}>
            <option value="">Select scheduled item</option>
            {reminders.map((reminder) => (
              <option key={String(reminder.id)} value={String(reminder.id)}>
                {recordTitle(reminder)} / {formatDate(reminder.reminder_date)}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Email To</span>
          <input value={recipient} onChange={(event) => setRecipient(event.target.value)} placeholder="name@example.com" />
        </label>
        <button className="primary-button" type="button" onClick={sendSelectedReminder}>
          <MailCheck size={16} />
          Send test email
        </button>
        {sendingMessage ? <div className="settings-message">{sendingMessage}</div> : null}
      </section>
    </div>
  );
}
