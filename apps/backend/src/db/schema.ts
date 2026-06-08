import { db } from "./database.js";

const sql = `
CREATE TABLE IF NOT EXISTS structures (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  location TEXT,
  levels TEXT,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS vendors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS parking_space_groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  structure_id INTEGER NOT NULL REFERENCES structures(id) ON UPDATE CASCADE,
  name TEXT NOT NULL,
  group_type TEXT,
  level TEXT,
  area TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  description TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  archived_at TEXT
);

CREATE TABLE IF NOT EXISTS parking_spaces (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  structure_id INTEGER NOT NULL REFERENCES structures(id) ON UPDATE CASCADE,
  group_id INTEGER REFERENCES parking_space_groups(id) ON UPDATE CASCADE ON DELETE SET NULL,
  space_number TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  label TEXT,
  level TEXT,
  area TEXT,
  type TEXT,
  condition TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  archived_at TEXT
);

CREATE TABLE IF NOT EXISTS signs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  structure_id INTEGER NOT NULL REFERENCES structures(id) ON UPDATE CASCADE,
  space_id INTEGER REFERENCES parking_spaces(id) ON UPDATE CASCADE ON DELETE SET NULL,
  space_group_id INTEGER REFERENCES parking_space_groups(id) ON UPDATE CASCADE ON DELETE SET NULL,
  name TEXT,
  level TEXT,
  sign_type TEXT,
  message TEXT,
  condition TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  installation_date TEXT,
  replacement_date TEXT,
  vendor_id INTEGER REFERENCES vendors(id) ON UPDATE CASCADE ON DELETE SET NULL,
  link_url TEXT,
  media_url TEXT,
  cost REAL DEFAULT 0,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  archived_at TEXT
);

CREATE TABLE IF NOT EXISTS sign_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  structure_id INTEGER NOT NULL REFERENCES structures(id) ON UPDATE CASCADE,
  space_id INTEGER REFERENCES parking_spaces(id) ON UPDATE CASCADE ON DELETE SET NULL,
  space_group_id INTEGER REFERENCES parking_space_groups(id) ON UPDATE CASCADE ON DELETE SET NULL,
  sign_id INTEGER REFERENCES signs(id) ON UPDATE CASCADE ON DELETE SET NULL,
  vendor_id INTEGER REFERENCES vendors(id) ON UPDATE CASCADE ON DELETE SET NULL,
  name TEXT,
  level TEXT,
  sign_type TEXT,
  condition TEXT,
  supplier TEXT,
  quantity INTEGER DEFAULT 1,
  cost REAL DEFAULT 0,
  purchase_date TEXT,
  delivery_date TEXT,
  installation_date TEXT,
  status TEXT NOT NULL DEFAULT 'ordered',
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  archived_at TEXT
);

CREATE TABLE IF NOT EXISTS sign_order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  structure_id INTEGER NOT NULL REFERENCES structures(id) ON UPDATE CASCADE,
  sign_order_id INTEGER NOT NULL REFERENCES sign_orders(id) ON UPDATE CASCADE ON DELETE CASCADE,
  sign_id INTEGER REFERENCES signs(id) ON UPDATE CASCADE ON DELETE SET NULL,
  description TEXT,
  quantity INTEGER DEFAULT 1,
  unit_cost REAL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'ordered',
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  archived_at TEXT
);

CREATE TABLE IF NOT EXISTS equipment (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  structure_id INTEGER NOT NULL REFERENCES structures(id) ON UPDATE CASCADE,
  previous_equipment_id INTEGER REFERENCES equipment(id) ON UPDATE CASCADE ON DELETE SET NULL,
  name TEXT NOT NULL,
  type TEXT,
  level TEXT,
  area TEXT,
  vendor_id INTEGER REFERENCES vendors(id) ON UPDATE CASCADE ON DELETE SET NULL,
  vendor_name TEXT,
  purchase_date TEXT,
  installation_date TEXT,
  warranty_expiry TEXT,
  service_schedule TEXT,
  schedule_start_date TEXT,
  schedule_end_date TEXT,
  cost REAL DEFAULT 0,
  condition TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  archived_at TEXT
);

CREATE TABLE IF NOT EXISTS maintenance_tickets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  structure_id INTEGER NOT NULL REFERENCES structures(id) ON UPDATE CASCADE,
  space_id INTEGER REFERENCES parking_spaces(id) ON UPDATE CASCADE ON DELETE SET NULL,
  sign_id INTEGER REFERENCES signs(id) ON UPDATE CASCADE ON DELETE SET NULL,
  equipment_id INTEGER REFERENCES equipment(id) ON UPDATE CASCADE ON DELETE SET NULL,
  area TEXT,
  issue_type TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'open',
  vendor_id INTEGER REFERENCES vendors(id) ON UPDATE CASCADE ON DELETE SET NULL,
  assigned_to TEXT,
  cost REAL DEFAULT 0,
  scheduled_date TEXT,
  due_date TEXT,
  completed_date TEXT,
  recurrence_rule TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  archived_at TEXT
);

CREATE TABLE IF NOT EXISTS cleaning_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  structure_id INTEGER NOT NULL REFERENCES structures(id) ON UPDATE CASCADE,
  space_id INTEGER REFERENCES parking_spaces(id) ON UPDATE CASCADE ON DELETE SET NULL,
  level TEXT,
  area TEXT,
  cleaning_scope TEXT,
  cleaning_type TEXT,
  category TEXT,
  vendor_id INTEGER REFERENCES vendors(id) ON UPDATE CASCADE ON DELETE SET NULL,
  assigned_to TEXT,
  cost REAL DEFAULT 0,
  scheduled_date TEXT,
  completed_date TEXT,
  frequency TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled',
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  archived_at TEXT
);

CREATE TABLE IF NOT EXISTS stripping_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  structure_id INTEGER NOT NULL REFERENCES structures(id) ON UPDATE CASCADE,
  area TEXT,
  stripping_type TEXT,
  affected_area TEXT,
  vendor_id INTEGER REFERENCES vendors(id) ON UPDATE CASCADE ON DELETE SET NULL,
  cost REAL DEFAULT 0,
  scheduled_date TEXT,
  completed_date TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled',
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  archived_at TEXT
);

CREATE TABLE IF NOT EXISTS inspections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  structure_id INTEGER NOT NULL REFERENCES structures(id) ON UPDATE CASCADE,
  space_id INTEGER REFERENCES parking_spaces(id) ON UPDATE CASCADE ON DELETE SET NULL,
  sign_id INTEGER REFERENCES signs(id) ON UPDATE CASCADE ON DELETE SET NULL,
  equipment_id INTEGER REFERENCES equipment(id) ON UPDATE CASCADE ON DELETE SET NULL,
  cleaning_log_id INTEGER REFERENCES cleaning_logs(id) ON UPDATE CASCADE ON DELETE SET NULL,
  stripping_log_id INTEGER REFERENCES stripping_logs(id) ON UPDATE CASCADE ON DELETE SET NULL,
  inspection_type TEXT NOT NULL,
  inspector TEXT,
  inspection_date TEXT,
  findings TEXT,
  status TEXT,
  recommended_action TEXT,
  generated_ticket_id INTEGER REFERENCES maintenance_tickets(id) ON UPDATE CASCADE ON DELETE SET NULL,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  archived_at TEXT
);

CREATE TABLE IF NOT EXISTS purchases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  structure_id INTEGER REFERENCES structures(id) ON UPDATE CASCADE ON DELETE SET NULL,
  entity_type TEXT,
  entity_id INTEGER,
  vendor_id INTEGER REFERENCES vendors(id) ON UPDATE CASCADE ON DELETE SET NULL,
  item_type TEXT,
  description TEXT,
  cost REAL DEFAULT 0,
  purchase_date TEXT,
  delivery_date TEXT,
  installation_date TEXT,
  quantity INTEGER DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'ordered',
  invoice_number TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  archived_at TEXT
);

CREATE TABLE IF NOT EXISTS reminders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  structure_id INTEGER NOT NULL REFERENCES structures(id) ON UPDATE CASCADE,
  entity_type TEXT,
  entity_id INTEGER,
  title TEXT NOT NULL,
  message TEXT,
  event_type TEXT,
  reminder_type TEXT,
  reminder_date TEXT,
  reminder_time TEXT,
  frequency TEXT,
  email_to TEXT,
  offset_days INTEGER,
  status TEXT NOT NULL DEFAULT 'scheduled',
  source TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  archived_at TEXT
);

CREATE TABLE IF NOT EXISTS attachments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  structure_id INTEGER REFERENCES structures(id) ON UPDATE CASCADE ON DELETE SET NULL,
  entity_type TEXT,
  entity_id INTEGER,
  file_name TEXT NOT NULL,
  file_path TEXT,
  mime_type TEXT,
  attachment_type TEXT,
  before_after TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  archived_at TEXT
);

CREATE TABLE IF NOT EXISTS activity_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  structure_id INTEGER REFERENCES structures(id) ON UPDATE CASCADE ON DELETE SET NULL,
  entity_type TEXT,
  entity_id INTEGER,
  event_type TEXT,
  event_date TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT,
  category TEXT,
  actor TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  structure_id INTEGER REFERENCES structures(id) ON UPDATE CASCADE,
  entity_type TEXT,
  entity_id INTEGER,
  action TEXT NOT NULL,
  change_summary TEXT,
  actor TEXT DEFAULT 'local user',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS app_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT NOT NULL UNIQUE,
  value TEXT,
  is_secret INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_parking_spaces_structure ON parking_spaces(structure_id);
CREATE INDEX IF NOT EXISTS idx_space_groups_structure ON parking_space_groups(structure_id);
CREATE INDEX IF NOT EXISTS idx_signs_structure ON signs(structure_id);
CREATE INDEX IF NOT EXISTS idx_sign_orders_structure ON sign_orders(structure_id);
CREATE INDEX IF NOT EXISTS idx_equipment_structure ON equipment(structure_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_structure ON maintenance_tickets(structure_id);
CREATE INDEX IF NOT EXISTS idx_cleaning_structure ON cleaning_logs(structure_id);
CREATE INDEX IF NOT EXISTS idx_stripping_structure ON stripping_logs(structure_id);
CREATE INDEX IF NOT EXISTS idx_inspections_structure ON inspections(structure_id);
CREATE INDEX IF NOT EXISTS idx_purchases_structure ON purchases(structure_id);
CREATE INDEX IF NOT EXISTS idx_reminders_structure ON reminders(structure_id);
CREATE INDEX IF NOT EXISTS idx_attachments_structure ON attachments(structure_id);
CREATE INDEX IF NOT EXISTS idx_activity_structure ON activity_events(structure_id);
CREATE INDEX IF NOT EXISTS idx_activity_event_date ON activity_events(event_date);
`;

export function migrate() {
  db.exec(sql);
  rebuildTableIfColumnNotNull(
    "purchases",
    "structure_id",
    `CREATE TABLE purchases_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      structure_id INTEGER REFERENCES structures(id) ON UPDATE CASCADE ON DELETE SET NULL,
      entity_type TEXT,
      entity_id INTEGER,
      vendor_id INTEGER REFERENCES vendors(id) ON UPDATE CASCADE ON DELETE SET NULL,
      item_type TEXT,
      description TEXT,
      cost REAL DEFAULT 0,
      purchase_date TEXT,
      delivery_date TEXT,
      installation_date TEXT,
      quantity INTEGER DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'ordered',
      invoice_number TEXT,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      archived_at TEXT
    )`
  );
  rebuildTableIfColumnNotNull(
    "activity_events",
    "structure_id",
    `CREATE TABLE activity_events_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      structure_id INTEGER REFERENCES structures(id) ON UPDATE CASCADE ON DELETE SET NULL,
      entity_type TEXT,
      entity_id INTEGER,
      event_type TEXT,
      event_date TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT,
      category TEXT,
      actor TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`
  );
  rebuildTableIfColumnNotNull(
    "attachments",
    "structure_id",
    `CREATE TABLE attachments_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      structure_id INTEGER REFERENCES structures(id) ON UPDATE CASCADE ON DELETE SET NULL,
      entity_type TEXT,
      entity_id INTEGER,
      file_name TEXT NOT NULL,
      file_path TEXT,
      mime_type TEXT,
      attachment_type TEXT,
      before_after TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      archived_at TEXT
    )`
  );
  db.exec("CREATE INDEX IF NOT EXISTS idx_purchases_structure ON purchases(structure_id)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_attachments_structure ON attachments(structure_id)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_activity_structure ON activity_events(structure_id)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_activity_event_date ON activity_events(event_date)");
  const activityColumns = db.prepare("PRAGMA table_info(activity_events)").all() as Array<{ name: string }>;
  if (!activityColumns.some((column) => column.name === "updated_at")) {
    db.exec("ALTER TABLE activity_events ADD COLUMN updated_at TEXT");
    db.exec("UPDATE activity_events SET updated_at = COALESCE(created_at, datetime('now')) WHERE updated_at IS NULL");
  }
  addColumnIfMissing("signs", "name", "TEXT");
  addColumnIfMissing("signs", "level", "TEXT");
  addColumnIfMissing("signs", "link_url", "TEXT");
  addColumnIfMissing("signs", "media_url", "TEXT");
  addColumnIfMissing("parking_spaces", "quantity", "INTEGER DEFAULT 1");
  addColumnIfMissing("sign_orders", "name", "TEXT");
  addColumnIfMissing("sign_orders", "level", "TEXT");
  addColumnIfMissing("sign_orders", "sign_type", "TEXT");
  addColumnIfMissing("sign_orders", "condition", "TEXT");
  addColumnIfMissing("structures", "levels", "TEXT");
  addColumnIfMissing("equipment", "level", "TEXT");
  addColumnIfMissing("equipment", "vendor_name", "TEXT");
  addColumnIfMissing("equipment", "schedule_start_date", "TEXT");
  addColumnIfMissing("equipment", "schedule_end_date", "TEXT");
  addColumnIfMissing("cleaning_logs", "level", "TEXT");
  addColumnIfMissing("reminders", "message", "TEXT");
  addColumnIfMissing("reminders", "event_type", "TEXT");
  addColumnIfMissing("reminders", "reminder_type", "TEXT");
  addColumnIfMissing("reminders", "reminder_time", "TEXT");
  addColumnIfMissing("reminders", "frequency", "TEXT");
  addColumnIfMissing("reminders", "email_to", "TEXT");
  db.exec("UPDATE reminders SET status = 'scheduled' WHERE status IN ('pending','overdue','dismissed')");
  db.exec("UPDATE reminders SET status = 'completed' WHERE status = 'sent'");
  rebuildTableIfColumnNotNull(
    "signs",
    "sign_type",
    `CREATE TABLE signs_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      structure_id INTEGER NOT NULL REFERENCES structures(id) ON UPDATE CASCADE,
      space_id INTEGER REFERENCES parking_spaces(id) ON UPDATE CASCADE ON DELETE SET NULL,
      space_group_id INTEGER REFERENCES parking_space_groups(id) ON UPDATE CASCADE ON DELETE SET NULL,
      name TEXT,
      level TEXT,
      sign_type TEXT,
      message TEXT,
      condition TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      installation_date TEXT,
      replacement_date TEXT,
      vendor_id INTEGER REFERENCES vendors(id) ON UPDATE CASCADE ON DELETE SET NULL,
      link_url TEXT,
      media_url TEXT,
      cost REAL DEFAULT 0,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      archived_at TEXT
    )`
  );
  db.exec("CREATE INDEX IF NOT EXISTS idx_signs_structure ON signs(structure_id)");
}

function addColumnIfMissing(table: string, column: string, type: string) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  if (!columns.some((item) => item.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
  }
}

function rebuildTableIfColumnNotNull(table: string, column: string, createSql: string) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string; notnull: number }>;
  const target = columns.find((item) => item.name === column);
  if (!target?.notnull) {
    return;
  }

  const columnNames = columns.map((item) => item.name);
  const columnList = columnNames.join(", ");
  db.exec("PRAGMA foreign_keys = OFF");
  try {
    db.exec("BEGIN");
    db.exec(createSql);
    db.exec(`INSERT INTO ${table}_new (${columnList}) SELECT ${columnList} FROM ${table}`);
    db.exec(`DROP TABLE ${table}`);
    db.exec(`ALTER TABLE ${table}_new RENAME TO ${table}`);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  } finally {
    db.exec("PRAGMA foreign_keys = ON");
  }
}
