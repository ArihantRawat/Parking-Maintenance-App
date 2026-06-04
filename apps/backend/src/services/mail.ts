import nodemailer from "nodemailer";
import { config } from "../config.js";

export function isSmtpConfigured() {
  return Boolean(config.smtp.host);
}

export async function sendReminderEmail(to: string, subject: string, text: string) {
  if (!isSmtpConfigured()) {
    return { sent: false, skipped: true, reason: "SMTP is not configured." };
  }

  const transporter = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.port === 465,
    auth: config.smtp.user
      ? {
          user: config.smtp.user,
          pass: config.smtp.pass
        }
      : undefined
  });

  await transporter.sendMail({
    from: config.smtp.from,
    to,
    subject,
    text
  });

  return { sent: true, skipped: false };
}
