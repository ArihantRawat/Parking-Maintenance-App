import { generateReminders } from "../api/client";
import { useState } from "react";
import { BellRing } from "lucide-react";

export function SettingsPage() {
  const [message, setMessage] = useState("");

  async function runReminderGeneration() {
    const result = await generateReminders();
    setMessage(`Generated ${result.data.length} reminders.`);
  }

  return (
    <div className="page-stack">
      <section className="dashboard-heading">
        <div>
          <h1>Settings</h1>
          <p>Local-first configuration and generated maintenance reminders.</p>
        </div>
      </section>
      <section className="settings-panel">
        <div>
          <h2>Reminder Generation</h2>
          <p>Creates 30 day, 7 day, and 1 day reminders from due dates, schedules, warranty expiry, and sign replacement dates.</p>
        </div>
        <button className="primary-button" onClick={runReminderGeneration}>
          <BellRing size={16} />
          Generate reminders
        </button>
        {message ? <div className="settings-message">{message}</div> : null}
      </section>
    </div>
  );
}
