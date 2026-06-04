import { Router } from "express";
import { modulesByKey } from "@parking/shared";
import { asyncHandler, sendData } from "../utils/api.js";
import { createRecord, getRecord, updateRecord } from "./crud.js";

export function createInspectionActionsRouter() {
  const router = Router();

  router.post(
    "/:id/generate-ticket",
    asyncHandler((req, res) => {
      const inspection = getRecord(modulesByKey.inspections, Number(req.params.id));
      if (inspection.generated_ticket_id) {
        sendData(res, getRecord(modulesByKey.maintenanceTickets, Number(inspection.generated_ticket_id)));
        return;
      }

      const ticket = createRecord(modulesByKey.maintenanceTickets, {
        structure_id: inspection.structure_id,
        space_id: inspection.space_id ?? null,
        sign_id: inspection.sign_id ?? null,
        equipment_id: inspection.equipment_id ?? null,
        area: req.body.area ?? null,
        issue_type: req.body.issue_type ?? `Inspection follow-up: ${inspection.inspection_type}`,
        priority: req.body.priority ?? "medium",
        status: "open",
        assigned_to: req.body.assigned_to ?? null,
        scheduled_date: req.body.scheduled_date ?? null,
        due_date: req.body.due_date ?? null,
        cost: req.body.cost ?? 0,
        notes: req.body.notes ?? `Generated from inspection #${inspection.id}. Findings: ${inspection.findings ?? ""}`
      });
      updateRecord(modulesByKey.inspections, Number(req.params.id), { generated_ticket_id: ticket.id });
      sendData(res.status(201), ticket);
    })
  );

  return router;
}
