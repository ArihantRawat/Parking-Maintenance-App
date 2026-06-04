import fs from "node:fs";
import Database from "better-sqlite3";
import { config } from "../config.js";

fs.mkdirSync(config.dataDir, { recursive: true });
fs.mkdirSync(config.storageDir, { recursive: true });

export const db = new Database(config.dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

export function nowIso() {
  return new Date().toISOString();
}

export function transaction<T>(fn: () => T): T {
  return db.transaction(fn)();
}
