import { useState } from "react";
import { UploadCloud } from "lucide-react";
import { uploadAttachment } from "../api/client";

export function AttachmentUploadPanel({ structureId, onUploaded }: { structureId: number; onUploaded: () => void }) {
  const [files, setFiles] = useState<File[]>([]);
  const [entityType, setEntityType] = useState("manual");
  const [entityId, setEntityId] = useState("");
  const [attachmentType, setAttachmentType] = useState("photo");
  const [beforeAfter, setBeforeAfter] = useState("not applicable");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (files.length === 0) {
      setError("Choose at least one file first.");
      return;
    }
    setSaving(true);
    setError(null);
    const form = new FormData();
    files.forEach((file) => form.append("files", file));
    form.append("structure_id", String(structureId));
    form.append("entity_type", entityType);
    if (entityId) {
      form.append("entity_id", entityId);
    }
    form.append("attachment_type", attachmentType);
    form.append("before_after", beforeAfter);
    form.append("notes", notes);
    try {
      await uploadAttachment(form);
      setFiles([]);
      setNotes("");
      onUploaded();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="upload-panel">
      <div className="section-header">
        <div>
          <h2>Upload Attachment</h2>
          <p>Local file storage linked to this structure.</p>
        </div>
      </div>
      <form className="upload-form" onSubmit={submit}>
        <label>
          <span>File</span>
          <input type="file" multiple onChange={(event) => setFiles(Array.from(event.target.files ?? []))} />
        </label>
        <label>
          <span>Related Module</span>
          <input value={entityType} onChange={(event) => setEntityType(event.target.value)} />
        </label>
        <label>
          <span>Related ID</span>
          <input type="number" value={entityId} onChange={(event) => setEntityId(event.target.value)} />
        </label>
        <label>
          <span>Type</span>
          <select value={attachmentType} onChange={(event) => setAttachmentType(event.target.value)}>
            {["photo", "document", "invoice", "before photo", "after photo", "other"].map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Before/After</span>
          <select value={beforeAfter} onChange={(event) => setBeforeAfter(event.target.value)}>
            {["not applicable", "before", "after"].map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label className="form-field-wide">
          <span>Notes</span>
          <textarea rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} />
        </label>
        {error ? <div className="form-error">{error}</div> : null}
        <button className="primary-button" type="submit" disabled={saving}>
          <UploadCloud size={16} />
          {saving ? "Uploading" : "Upload"}
        </button>
      </form>
    </section>
  );
}
