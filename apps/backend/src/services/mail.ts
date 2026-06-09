import fs from "node:fs";
import nodemailer from "nodemailer";
import type { Attachment } from "nodemailer/lib/mailer";
import { config } from "../config.js";

export function isSmtpConfigured() {
  return Boolean(config.smtp.host);
}

export type ReminderEmailAttachment = {
  filename: string;
  path: string;
  contentType?: string;
};

export async function sendReminderEmail(
  to: string,
  subject: string,
  text: string,
  attachments: ReminderEmailAttachment[] = []
) {
  if (!isSmtpConfigured()) {
    return { sent: false, skipped: true, reason: "SMTP is not configured" };
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

  const mailAttachments: Attachment[] = attachments
    .filter((attachment) => fs.existsSync(attachment.path))
    .map((attachment) => ({
      filename: attachment.filename,
      path: attachment.path,
      contentType: attachment.contentType
    }));

  await transporter.sendMail({
    from: config.smtp.from,
    to,
    subject,
    text,
    attachments: mailAttachments
  });

  return { sent: true, skipped: false, attachmentCount: mailAttachments.length };
}
