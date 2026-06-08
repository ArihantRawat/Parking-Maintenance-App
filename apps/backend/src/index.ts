import express from "express";
import cors from "cors";
import path from "node:path";
import { moduleDefinitions } from "@parking/shared";
import { config } from "./config.js";
import { migrate } from "./db/schema.js";
import { seedIfEmpty } from "./db/seed.js";
import { errorMiddleware } from "./utils/api.js";
import { bulkCreateSpaces, createCrudRouter } from "./routes/crud.js";
import { createSearchRouter } from "./routes/search.js";
import { createTimelineRouter } from "./routes/timeline.js";
import { createRelationshipRouter } from "./routes/relationships.js";
import { createReportsRouter } from "./routes/reports.js";
import { createAttachmentRouter } from "./routes/attachments.js";
import { createReminderActionsRouter } from "./routes/reminders.js";
import { createInspectionActionsRouter } from "./routes/inspections.js";
import { startScheduler } from "./services/scheduler.js";

migrate();
seedIfEmpty();
startScheduler();

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use("/files", express.static(path.join(config.storageDir)));

app.get("/api/health", (_req, res) => {
  res.json({ data: { ok: true, mode: "local", database: config.dbPath } });
});

app.post("/api/parking-spaces/bulk", bulkCreateSpaces);
app.use("/api/search", createSearchRouter());
app.use("/api/timeline", createTimelineRouter());
app.use("/api/relationships", createRelationshipRouter());
app.use("/api/reports", createReportsRouter());
app.use("/api/attachments", createAttachmentRouter());
app.use("/api/reminders", createReminderActionsRouter());
app.use("/api/inspections", createInspectionActionsRouter());

for (const definition of moduleDefinitions) {
  app.use(`/api/${definition.route}`, createCrudRouter(definition));
}

app.use(errorMiddleware);

app.listen(config.port, () => {
  console.log(`Parking Maintenance API running at http://localhost:${config.port}/api`);
});
