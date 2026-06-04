import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");

export const config = {
  port: Number(process.env.PORT ?? 4000),
  dataDir: path.join(root, "data"),
  storageDir: path.join(root, "storage"),
  dbPath: process.env.SQLITE_PATH ?? path.join(root, "data", "parking-maintenance.sqlite"),
  smtp: {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 25),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.SMTP_FROM ?? "parking-maintenance.local"
  }
};
