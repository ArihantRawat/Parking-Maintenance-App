import fs from "node:fs";
import path from "node:path";
import { Router } from "express";
import multer from "multer";
import { modulesByKey } from "@parking/shared";
import { config } from "../config.js";
import { asyncHandler, HttpError, sendData } from "../utils/api.js";
import { createRecord } from "./crud.js";

const attachmentRoot = path.join(config.storageDir, "attachments");
fs.mkdirSync(attachmentRoot, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const folder = path.join(attachmentRoot, new Date().toISOString().slice(0, 10));
    fs.mkdirSync(folder, { recursive: true });
    cb(null, folder);
  },
  filename: (_req, file, cb) => {
    const safeBase = path
      .basename(file.originalname)
      .replace(/[^a-zA-Z0-9._-]/g, "-")
      .replace(/-+/g, "-");
    cb(null, `${Date.now()}-${safeBase}`);
  }
});

const upload = multer({ storage });

export function createAttachmentRouter() {
  const router = Router();

  router.post(
    "/upload",
    upload.array("files"),
    asyncHandler((req, res) => {
      const files = req.files as Express.Multer.File[] | undefined;
      if (!files?.length) {
        throw new HttpError(400, "At least one file field named 'files' is required.");
      }
      const structureId = Number(req.body.structure_id);
      if (!structureId) {
        throw new HttpError(400, "Structure is required.");
      }

      const rows = files.map((file) => {
        const relativePath = path.relative(config.storageDir, file.path).replaceAll("\\", "/");
        return createRecord(modulesByKey.attachments, {
          structure_id: structureId,
          entity_type: req.body.entity_type ?? "manual",
          entity_id: req.body.entity_id ? Number(req.body.entity_id) : null,
          file_name: req.body.file_name || file.originalname,
          file_path: `/files/${relativePath}`,
          mime_type: file.mimetype,
          attachment_type: req.body.attachment_type ?? "document",
          before_after: req.body.before_after ?? "not applicable",
          status: "active",
          notes: req.body.notes ?? null
        });
      });

      sendData(res.status(201), rows, { count: rows.length });
    })
  );

  return router;
}
