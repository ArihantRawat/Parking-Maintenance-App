# Parking Structure Maintenance App

Parking Structure Maintenance App is a local-first full-stack web app for managing parking structures and all of the records linked to them. It is designed for a single-user or small local-network workflow and runs fully on your machine with a React frontend, an Express API, and SQLite for storage.

The system keeps the parking structure as the root entity and organizes parking spaces, signs, sign orders, equipment, cleaning logs, stripping logs, purchases, reminders, attachments, reports, search, and a relationship tree around that structure.

## What The App Does

The current app includes:

- A home dashboard with large module cards and interactive table views
- Structure dashboards with tabs for operational records
- Search across records with structure context
- Rich tables with sorting, filtering, inline editing, pagination, and CSV export
- Optional image and video attachments added directly from forms
- A structure relationship tree for linked records
- A structure activity timeline with date/status/category filtering
- Local reports with Excel and PDF export
- Reminder generation for due dates, schedules, warranties, and replacement dates

## Tech Stack

### Frontend

- React 18
- TypeScript
- Vite
- React Router
- Lucide React icons

### Backend

- Node.js
- Express
- SQLite via `better-sqlite3`
- Zod validation
- Multer for local file uploads
- PDFKit for PDF report export

### Workspace Layout

```text
.
|- apps/
|  |- backend/   # Express API, SQLite schema, seed data, reports, reminders
|  \- frontend/  # React SPA, dashboards, tables, forms, views
|- packages/
|  \- shared/    # Shared module definitions and schema-driven field metadata
\- package.json  # Workspace scripts
```

## Core Product Areas

### 1. Structures

Structures are the root records in the system. Each structure can store:

- Name
- Location
- Levels or floors
- Status
- Notes and description

Every major operational module is linked back to a structure.

### 2. Parking Spaces

Parking spaces support:

- Structure assignment
- Name or group-style naming
- Bulk generation through the backend bulk endpoint
- Type, condition, status, and level/floor tracking

### 3. Signs And Sign Orders

The app supports:

- Signs assigned to a structure and optionally a space
- Sign type, condition, status, installed date, and replacement date
- Vendor selection
- Links and media references
- Sign order tracking for quantity, cost, ordered/delivered/installed dates, and status

### 4. Equipment

Equipment records support:

- Structure and level/floor assignment
- Vendor tracking
- Purchase and warranty details
- Scheduled start and end dates
- Condition and lifecycle status

### 5. Cleaning And Stripping

Operational maintenance logging includes:

- Cleaning logs with scope, category, type, frequency, and schedule tracking
- Stripping logs with affected area, type, schedule, completion, vendor, and cost
- Timeline-style stripping overview inside the structure dashboard

### 6. Purchases And Reminders

Purchases support:

- Structure-linked purchasing
- Vendor tracking
- Cost, quantity, delivery, installation, and status fields
- Flexible item categories

Reminders support:

- Generated reminders for maintenance, cleaning, stripping, equipment warranty expiry, and sign replacement
- Optional email sending if SMTP is configured
- Local-only reminder workflows when SMTP is not configured

### 7. Search, Timeline, Reports, And Relationship View

The app includes:

- Global search with structure context
- Structure-specific activity timeline
- Relationship tree showing records connected to a structure
- Exportable reports for maintenance, cleaning, stripping, signs, equipment, purchases, overdue tasks, and cost summaries

## Schema-Driven Design

One of the key implementation patterns in this project is the shared schema metadata in `packages/shared/src/index.ts`.

That shared package defines:

- Which modules exist
- Their routes and labels
- Their fields
- Which fields appear in forms
- Which fields appear in tables
- Which filters are available
- Which fields are enums, relations, dates, or numbers

This allows the frontend and backend to stay consistent while keeping most table and form behavior generic.

## Quick Start

### Prerequisites

- Node.js 18+
- npm

### Install

```bash
npm install
```

### Set Up The Database

```bash
npm run db:setup
```

This creates or migrates the local SQLite database and seeds sample data when needed.

### Start The App

```bash
npm run dev
```

Default local URLs:

- Frontend: [http://localhost:5173](http://localhost:5173)
- Backend API: [http://localhost:4000/api](http://localhost:4000/api)

## Useful Commands

```bash
npm run dev            # Start frontend and backend together
npm run dev:backend    # Start only the Express API
npm run dev:frontend   # Start only the Vite frontend
npm run db:setup       # Create/migrate the SQLite database
npm run seed           # Reset and seed local sample data
npm run build          # Typecheck backend and frontend, then build frontend
```

## Local Storage

All primary data stays local.

- SQLite database: `apps/backend/data/parking-maintenance.sqlite`
- Attachments directory: `apps/backend/storage/attachments`
- Static file serving path: `/files/...`

The app is intended to work without cloud services.

## Environment Variables

The app can run with no extra environment variables for normal local use.

Optional backend configuration:

```bash
PORT=4000
SQLITE_PATH=
SMTP_HOST=
SMTP_PORT=25
SMTP_USER=
SMTP_PASS=
SMTP_FROM=parking-maintenance.local
```

### SMTP Notes

SMTP is optional. If it is not configured:

- The app still works normally
- Reminder generation still works
- Email send actions return a local-only status instead of failing the app

## Frontend Routes

The SPA currently exposes these main routes:

- `/` - home dashboard
- `/structures` - all structures
- `/structures/:id` - structure overview
- `/structures/:id/:tab` - structure tabs
- `/search` - global search
- `/reports` - report exports
- `/settings` - reminder tools

## Backend API Overview

REST endpoints are exposed under `/api`.

### Generic CRUD Modules

- `/api/structures`
- `/api/parking-spaces`
- `/api/parking-space-groups`
- `/api/signs`
- `/api/sign-orders`
- `/api/sign-order-items`
- `/api/equipment`
- `/api/maintenance-tickets`
- `/api/cleaning-logs`
- `/api/stripping-logs`
- `/api/inspections`
- `/api/purchases`
- `/api/reminders`
- `/api/attachments`
- `/api/activity-events`
- `/api/vendors`

### Specialized Endpoints

- `/api/parking-spaces/bulk`
- `/api/search`
- `/api/timeline`
- `/api/relationships/:structureId`
- `/api/reports/:reportType`
- `/api/reminders/generate`
- `/api/reminders/:id/send`
- `/api/inspections/:id/generate-ticket`
- `/api/attachments/upload`
- `/api/health`

List endpoints support pagination, search, sorting, filters, and structure scoping.

## Reports

The reports area supports export and preview flows for:

- Maintenance
- Cleaning
- Stripping
- Signs
- Equipment
- Purchases
- Structure summary
- Overdue tasks
- Cost summary

Excel and PDF downloads are generated locally by the backend.

## Attachments

Attachments are uploaded locally and linked to records. The UI supports optional multi-file image or video upload from record forms, and attachments can be previewed in record detail views.

## Development Notes

- The frontend and backend share model metadata through the shared workspace package
- Tables and forms are largely generated from field definitions
- SQLite migrations are handled in code
- Seed data is available for local testing
- The app is optimized for local workflows and simple deployment

## Current Status

This repository contains the current local-first implementation of the Parking Structure Maintenance App, including:

- Shared schema-driven definitions
- Full Express API
- React dashboard UI
- Local reporting
- Search, reminders, and relationship visualization
- Recent UX-focused improvements to filtering, detail views, and the structure relationship map
