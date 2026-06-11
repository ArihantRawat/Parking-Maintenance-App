import fs from "node:fs";
import path from "node:path";
import { config } from "../config.js";
import { db } from "../db/database.js";

type BackupState = {
  interval?: NodeJS.Timeout;
  running: boolean;
};

const stateKey = "__parkingMaintenanceBackupState__";

function getBackupState(): BackupState {
  const globalState = globalThis as typeof globalThis & { [stateKey]?: BackupState };
  globalState[stateKey] ??= { running: false };
  return globalState[stateKey];
}

function backupFileName(date = new Date()) {
  const stamp = date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  return `parking-maintenance-${stamp}.sqlite`;
}

function removeBackupFile(filePath: string) {
  fs.rmSync(filePath, { force: true });
  fs.rmSync(`${filePath}-wal`, { force: true });
  fs.rmSync(`${filePath}-shm`, { force: true });
}

function nextBackupPath() {
  const parsed = path.parse(path.join(config.backupDir, backupFileName()));
  let candidate = path.join(parsed.dir, `${parsed.name}${parsed.ext}`);
  let index = 1;

  while (fs.existsSync(candidate)) {
    candidate = path.join(parsed.dir, `${parsed.name}-${index}${parsed.ext}`);
    index += 1;
  }

  return candidate;
}

async function pruneOldBackups() {
  const files = fs
    .readdirSync(config.backupDir)
    .filter((file) => /^parking-maintenance-\d{8}T\d{6}Z(?:-\d+)?\.sqlite$/.test(file))
    .map((file) => ({
      file,
      path: path.join(config.backupDir, file),
      modified: fs.statSync(path.join(config.backupDir, file)).mtimeMs
    }))
    .sort((a, b) => b.modified - a.modified);

  for (const backup of files.slice(config.backupRetention)) {
    removeBackupFile(backup.path);
  }
}

export async function createDatabaseBackup() {
  fs.mkdirSync(config.backupDir, { recursive: true });

  const destination = nextBackupPath();
  await db.backup(destination);
  await pruneOldBackups();

  const stats = fs.statSync(destination);
  return {
    path: destination,
    size: stats.size,
    createdAt: stats.mtime.toISOString()
  };
}

export function startDatabaseBackups() {
  const state = getBackupState();
  if (state.interval || config.backupIntervalMs === 0) {
    return;
  }

  const runBackup = async () => {
    if (state.running) {
      return;
    }

    state.running = true;
    try {
      const backup = await createDatabaseBackup();
      console.log(`Database backup created at ${backup.path}`);
    } catch (error) {
      console.error("Database backup failed", error);
    } finally {
      state.running = false;
    }
  };

  void runBackup();
  state.interval = setInterval(() => {
    void runBackup();
  }, config.backupIntervalMs);
}
