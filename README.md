# Parking Maintenance App

A local-first operations dashboard for parking buildings, lots, and garages. The app tracks structures, spaces, signs, orders and purchases, equipment, cleaning logs, elevator cleaning, stripping, barricading, reminders, activity, reports, vendors, and uploaded media.

It is designed for single-user or small local-network workflows. The frontend, API, SQLite database, file uploads, scheduler, and backups all run on your machine.

## What It Does

- Manage parking structures, buildings, garages, and lots.
- Track parking spaces and grouped parking areas without exploding grouped quantities into many rows.
- Add operational entries globally or associate them with a structure only when needed.
- Track signs, equipment, and service orders in one Orders/Purchases workflow.
- Log cleaning, elevator cleaning, stripping, and barricading activity.
- Upload multiple images and videos to entries, then review them from the detail view.
- Schedule reminders manually or create the next cleaning reminder from a cleaning frequency.
- View activity as a timeline or calendar.
- Search across operational records.
- Export reports to Excel or PDF.
- Keep automatic SQLite backups every 2 hours by default.

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | React, TypeScript, Vite, React Router, Lucide icons |
| Backend | Node.js, Express, Zod, Multer, Nodemailer, PDFKit |
| Database | SQLite with `better-sqlite3` |
| Shared schema | npm workspace package at `packages/shared` |
| Monorepo | npm workspaces for `apps/*` and `packages/*` |

## Project Structure

```text
.
├── apps/
│   ├── backend/          # Express API, SQLite schema, seed data, reports, scheduler, backups
│   └── frontend/         # React app, tables, forms, dashboard views, calendar, timeline
├── packages/
│   └── shared/           # Module definitions used by frontend and backend
├── package.json          # Root workspace scripts
└── README.md
```

## Quick Start

### Prerequisites

- Node.js 18 or newer
- npm

### Install

```bash
npm install
```

### Create or update the database

```bash
npm run db:setup
```

### Run the full app

```bash
npm run dev
```

| Service | URL |
| --- | --- |
| Frontend | `http://localhost:5173` |
| Backend API | `http://localhost:4000/api` |
| Health check | `http://localhost:4000/api/health` |

## Commands

```bash
npm run dev            # Run frontend and backend together
npm run dev:backend    # Run only the API
npm run dev:frontend   # Run only the React app
npm run db:setup       # Create or migrate the SQLite database
npm run seed           # Reset and seed sample data
npm run build          # Typecheck backend and frontend, then build frontend assets
npm run start          # Run the backend in production mode
```

## Main Navigation

| Tab | Purpose |
| --- | --- |
| Home | Global operational tables for major modules |
| Search | Cross-module keyword search |
| Calendar | Calendar view for cleaning, elevator cleaning, stripping, and barricading |
| Activity Timeline | Read-only activity timeline and calendar-style activity view |
| Scheduler | Reminder management and email reminder sending |
| Structures | Structure list and structure-specific dashboards |

## Home Modules

The Home dashboard includes these module tabs:

| Module | Purpose |
| --- | --- |
| Structures | Parking buildings, lots, and garages |
| Parking Spaces | Individual spaces or grouped parking areas |
| Signs | Sign inventory and condition tracking |
| Orders/Purchases | Order and purchase tracking for signs, equipment, and services |
| Equipment | Equipment inventory, condition, vendor, warranty, and service data |
| Cleaning Logs | General cleaning activity and scheduled cleaning |
| Elevator Cleaning Logs | Elevator-specific cleaning activity |
| Stripping Logs | Line removal and surface stripping work |
| Barricading Logs | Barricading messages with date and time |

Most operational modules can be created without selecting a structure. If a structure is selected, the record appears in that structure dashboard as well.

## Structure Dashboard

Each structure has its own dashboard with:

| Tab | Purpose |
| --- | --- |
| Overview | Relationship map for records tied to the structure |
| Parking Spaces | Spaces and space groups scoped to the structure |
| Signs | Structure-specific signs |
| Orders/Purchases | Orders and purchases associated with the structure |
| Equipment | Equipment associated with the structure |
| Cleaning | Cleaning logs associated with the structure |
| Elevator Cleaning | Elevator cleaning logs associated with the structure |
| Stripping | Stripping logs and stripping calendar |
| Barricading | Barricading logs associated with the structure |
| Scheduler | Reminders associated with the structure |
| Activity Timeline | Activity for the structure |
| Reports | Reports scoped to the structure |

When viewing a structure dashboard, structure filters are hidden because the structure is already fixed.

## Media Uploads

Entries support multiple image and video uploads. Users can select multiple files at once or add files progressively. Uploaded media is stored locally and can be viewed from the entry detail modal.

Structures also support separate map uploads. Structure maps are kept separate from normal entry attachments.

## Reminders

The Scheduler tab stores reminders with date, time, status, email fields, and message content. Cleaning and elevator cleaning forms can also create the next reminder from the selected frequency.

For cleaning reminders:

- Monthly adds 1 month.
- Quarterly adds 3 months.
- Annual adds 1 year.
- The default reminder time is `09:00`.
- The computed date and time are visible and editable before saving.

If SMTP is configured, due reminders can be sent by email. Without SMTP, reminders are still created and tracked locally.

## Reports

Reports are available from the Reports page and from structure dashboards. Reports can be previewed in the UI or exported as Excel or PDF.

Common report types include:

- Maintenance
- Cleaning
- Elevator cleaning
- Barricading
- Stripping
- Signs
- Equipment
- Legacy purchases
- Structure summary
- Overdue tasks
- Cost summary

The cost summary includes independent records that are not associated with a structure.

## Data And Backups

Default local data paths:

| Path | Contents |
| --- | --- |
| `apps/backend/data/parking-maintenance.sqlite` | SQLite database |
| `apps/backend/data/backups/` | Automatic database backups |
| `apps/backend/storage/attachments/` | Uploaded images and videos |

The backend creates a backup on startup and then every 2 hours by default. Backups use SQLite's backup API, which is safe while WAL mode is enabled.

To restore a backup:

1. Stop the backend.
2. Copy the selected backup file over the active SQLite database.
3. Restart the backend.

## Environment Variables

Create `apps/backend/.env` if you need to override defaults.

```bash
PORT=4000
SQLITE_PATH=
BACKUP_DIR=
BACKUP_INTERVAL_MINUTES=120
BACKUP_RETENTION=72

# Optional SMTP settings for scheduler emails
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=parking-maintenance.local
```

## API Overview

All API routes live under `/api`.

CRUD-style modules:

```text
/structures
/parking-spaces
/parking-space-groups
/signs
/sign-orders
/sign-order-items
/equipment
/maintenance-tickets
/cleaning-logs
/elevator-cleaning-logs
/stripping-logs
/barricading-logs
/inspections
/purchases
/reminders
/attachments
/activity-events
/vendors
```

Specialized endpoints:

| Endpoint | Purpose |
| --- | --- |
| `POST /api/parking-spaces/bulk` | Create parking spaces in bulk |
| `GET /api/search` | Global keyword search |
| `GET /api/timeline` | Activity timeline data |
| `GET /api/relationships/:structureId` | Structure relationship graph |
| `GET /api/reports/:reportType` | Report data and export variants |
| `POST /api/reminders/generate` | Generate reminder records |
| `POST /api/reminders/:id/send` | Send a reminder email |
| `POST /api/inspections/:id/generate-ticket` | Create a maintenance ticket from an inspection |
| `POST /api/attachments/upload` | Upload images and videos |
| `GET /api/health` | Backend health and database information |

## Schema-Driven Design

Module metadata is defined in `packages/shared/src/index.ts`. The shared metadata controls:

- Field names, labels, types, and enum values
- Form fields
- Table columns
- Filter controls
- Search fields
- Relations between modules
- Routes and module labels

The frontend renders generic tables and forms from this metadata, and the backend validates CRUD payloads against the same definitions.

## Development Notes

- SQLite schema migrations run from `apps/backend/src/db/schema.ts`.
- Seed data is managed in `apps/backend/src/db/seed.ts`.
- The frontend dev server proxies API calls to the backend.
- Uploaded files are served from local storage through backend file routes.
- Deleted operational records are removed through the app delete flow after confirmation.

## License

Private project. All rights reserved.
