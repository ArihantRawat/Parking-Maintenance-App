# Parking Maintenance App

A local-first full-stack web app for managing parking structures and the operational records tied to them — spaces, signs, equipment, cleaning, stripping, purchases, reminders, attachments, and reports.

Built for single-user or small local-network workflows. Everything runs on your machine: React frontend, Express API, and SQLite storage. No cloud services required.

## Features

- **Home dashboard** — tabbed module views with sortable, filterable tables, inline editing, pagination, and CSV export
- **Structure dashboards** — per-structure tabs for parking spaces, signs, orders, equipment, cleaning, stripping, purchases, scheduler, activity timeline, relationship map, and reports
- **Global views** — search, cleaning/stripping calendar, activity timeline, and email scheduler
- **Schema-driven UI** — forms, tables, filters, and detail drawers generated from shared field definitions
- **Relationship map** — interactive tree of records linked to a structure
- **Reports** — preview and export maintenance, cleaning, stripping, sign, equipment, purchase, overdue, and cost reports as Excel or PDF
- **Scheduler** — create email reminders with date/time; automatic send when due (optional SMTP)
- **Attachments** — local photo and video uploads linked to records
- **Audit trail** — activity events tracked for timeline views

## Tech Stack

| Layer | Technologies |
| --- | --- |
| Frontend | React 18, TypeScript, Vite, React Router, Lucide icons |
| Backend | Node.js, Express, Zod, Multer, PDFKit, Nodemailer |
| Database | SQLite via `better-sqlite3` |
| Monorepo | npm workspaces (`apps/*`, `packages/*`) |

## Project Structure

```text
.
├── apps/
│   ├── backend/          # Express API, SQLite schema/migrations, seed, reports, scheduler
│   └── frontend/         # React SPA — dashboards, tables, forms, calendar, timeline
├── packages/
│   └── shared/           # Module definitions and schema-driven field metadata
└── package.json          # Root workspace scripts
```

## Quick Start

### Prerequisites

- Node.js 18+
- npm

### Install and run

```bash
npm install
npm run db:setup
npm run dev
```

| Service | URL |
| --- | --- |
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:4000/api |
| Health check | http://localhost:4000/api/health |

The database is created and seeded automatically on first setup.

### Useful commands

```bash
npm run dev            # Start frontend and backend together
npm run dev:backend    # Backend only
npm run dev:frontend   # Frontend only
npm run db:setup       # Create or migrate SQLite database
npm run seed           # Reset and re-seed sample data
npm run build          # Typecheck and build for production
npm run start          # Run backend in production mode
```

## Navigation

| Route | Description |
| --- | --- |
| `/` | Home dashboard with module tabs |
| `/structures` | All structures |
| `/structures/:id` | Structure overview (relationship map) |
| `/structures/:id/:tab` | Structure tab — spaces, signs, cleaning, stripping, etc. |
| `/search` | Keyword search across modules |
| `/calendar` | Cleaning and stripping calendar (month, quarter, fiscal year, annual) |
| `/activity-timeline` | Global activity timeline and calendar |
| `/scheduler` | Email reminder scheduler |
| `/reports` | Report preview and export |

Structure tabs: Overview, Parking Spaces, Signs, Sign Orders, Equipment, Cleaning, Stripping, Purchases, Scheduler, Activity Timeline, Reports.

## Data Modules

Each module is linked to a **structure** (building, garage, or lot) unless noted.

| Module | Purpose |
| --- | --- |
| Structures | Root records — name, location, type, levels, status |
| Parking Spaces | Individual spaces or named groups with type, condition, and level |
| Space Groups | Logical groupings (ADA banks, EV rows, visitor zones) |
| Signs | Installed signage with condition, vendor, and replacement tracking |
| Sign Orders | Order lifecycle — quantity, cost, delivery, installation |
| Equipment | Assets with warranty, vendor, schedule, and condition |
| Maintenance Tickets | Work orders with priority and status |
| Cleaning Logs | Scheduled and completed cleaning by type, scope, and level |
| Stripping Logs | Line removal and surface stripping tasks |
| Inspections | Inspection results with ticket generation |
| Purchases | Structure-linked procurement |
| Reminders | Scheduled email reminders (used by Scheduler) |
| Attachments | Photos, documents, and invoices |
| Vendors | Vendor directory |
| Activity Events | Audit log for timeline views |

## Schema-Driven Design

Module metadata lives in `packages/shared/src/index.ts`. Each module defines:

- Fields, types, and enum values
- Which fields appear in tables, forms, and filters
- Relations (e.g. structure, vendor)
- Routes, labels, and search fields

The frontend renders generic tables and forms from this metadata. The backend validates CRUD against the same definitions. Adding a field in one place keeps both sides in sync.

## Environment Variables

Copy `apps/backend/.env.example` to `apps/backend/.env`. All variables are optional for local use.

```bash
PORT=4000
SQLITE_PATH=                          # Defaults to apps/backend/data/parking-maintenance.sqlite

# Optional — required only for sending scheduler emails
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=parking-maintenance.local
```

Without SMTP, the app works normally. Reminders are created and tracked locally; send actions report a local-only status instead of delivering email.

The backend polls every 5 seconds and sends due reminders automatically when SMTP is configured.

## Local Storage

| Path | Contents |
| --- | --- |
| `apps/backend/data/parking-maintenance.sqlite` | SQLite database |
| `apps/backend/storage/attachments/` | Uploaded files |
| `/files/...` | Static file serving URL for attachments |

## API Overview

REST endpoints are under `/api`.

**CRUD modules** (list, get, create, update, delete with pagination, search, sort, and filters):

`/structures`, `/parking-spaces`, `/parking-space-groups`, `/signs`, `/sign-orders`, `/sign-order-items`, `/equipment`, `/maintenance-tickets`, `/cleaning-logs`, `/stripping-logs`, `/inspections`, `/purchases`, `/reminders`, `/attachments`, `/activity-events`, `/vendors`

**Specialized endpoints:**

| Endpoint | Purpose |
| --- | --- |
| `POST /api/parking-spaces/bulk` | Bulk-create parking spaces |
| `GET /api/search` | Cross-module keyword search |
| `GET /api/timeline` | Activity timeline events |
| `GET /api/relationships/:structureId` | Relationship graph for a structure |
| `GET /api/reports/:reportType` | Report data (xlsx/pdf download variants) |
| `POST /api/reminders/generate` | Generate reminders from due dates |
| `POST /api/reminders/:id/send` | Manually send a reminder email |
| `POST /api/inspections/:id/generate-ticket` | Create maintenance ticket from inspection |
| `POST /api/attachments/upload` | Upload attachment files |
| `GET /api/health` | Health and database path |

## Reports

Available report types: maintenance, cleaning, stripping, sign, equipment, purchase, structure-summary, overdue-task, cost-summary.

Preview in the UI or download as Excel (`.xlsx`) or PDF. Reports can be scoped to a structure or run globally.

## Development Notes

- Migrations run in code on startup (`apps/backend/src/db/schema.ts`)
- Sample data is seeded when the database is empty
- Frontend dev server proxies API requests to the backend
- Enum and status values are stored lowercase in the database; the UI capitalizes display labels

## License

Private project — all rights reserved.
