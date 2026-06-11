import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");
const defaultDbPath = path.join(root, "data", "parking-maintenance.sqlite");
const defaultBackupDir = path.join(root, "data", "backups");

function numberEnv(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const config = {
  port: numberEnv(process.env.PORT, 4000),
  dataDir: path.join(root, "data"),
  storageDir: path.join(root, "storage"),
  dbPath: process.env.SQLITE_PATH || defaultDbPath,
  backupDir: process.env.BACKUP_DIR || defaultBackupDir,
  backupIntervalMs: Math.max(0, numberEnv(process.env.BACKUP_INTERVAL_MINUTES, 120)) * 60 * 1000,
  backupRetention: Math.max(1, numberEnv(process.env.BACKUP_RETENTION, 72)),
  smtp: {
    host: process.env.SMTP_HOST,
    port: numberEnv(process.env.SMTP_PORT, 25),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.SMTP_FROM || "parking-maintenance.local"
  }
};
