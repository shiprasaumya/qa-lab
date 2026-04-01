import { decode } from "base64-arraybuffer";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { supabase } from "../lib/supabase";

export type AttachmentRecord = {
  id: string;
  project_id: string;
  capture_id: string | null;
  requirement_run_id?: string | null;
  file_name: string;
  file_type?: string | null;
  file_path: string;
  file_url?: string | null;
  created_at?: string;
};

type UploadAttachmentParams = {
  projectId: string;
  captureId: string | null;
  requirementRunId?: string | null;
  file: {
    name: string;
    uri: string;
    mimeType?: string | null;
    size?: number | null;
  };
};

const MAX_FILE_SIZE_MB = 8;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

function sanitizeFileName(name: string) {
  return name.replace(/[^\w.\-]/g, "_");
}

function buildStoragePath(
  projectId: string,
  captureId: string | null,
  fileName: string,
) {
  const safeName = sanitizeFileName(fileName);
  const capturePart = captureId || "no_capture";
  return `${projectId}/${capturePart}/${Date.now()}_${safeName}`;
}

export async function pickUniversalFiles() {
  const result = await DocumentPicker.getDocumentAsync({
    multiple: true,
    copyToCacheDirectory: true,
    type: [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
      "application/json",
      "text/csv",
      "application/xml",
      "text/xml",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "image/*",
      "*/*",
    ],
  });

  if (result.canceled) return [];

  return result.assets.map((asset) => ({
    name: asset.name,
    uri: asset.uri,
    mimeType: asset.mimeType ?? null,
    size: asset.size ?? null,
  }));
}

export async function uploadAttachment({
  projectId,
  captureId,
  requirementRunId,
  file,
}: UploadAttachmentParams): Promise<AttachmentRecord> {
  if (!file.uri) {
    throw new Error("Selected file has no URI.");
  }

  if (file.size && file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error(
      `File too large. Max allowed size is ${MAX_FILE_SIZE_MB} MB.`,
    );
  }

  const base64 = await FileSystem.readAsStringAsync(file.uri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const arrayBuffer = decode(base64);
  const filePath = buildStoragePath(projectId, captureId, file.name);

  const storage = await supabase.storage
    .from("attachments")
    .upload(filePath, arrayBuffer, {
      contentType: file.mimeType || "application/octet-stream",
      upsert: false,
    });

  if (storage.error) {
    throw new Error(storage.error.message || "Unable to upload attachment.");
  }

  const publicUrlResult = supabase.storage
    .from("attachments")
    .getPublicUrl(filePath);
  const fileUrl = publicUrlResult.data?.publicUrl || null;

  const insert = await supabase
    .from("attachments")
    .insert({
      project_id: projectId,
      capture_id: captureId,
      requirement_run_id: requirementRunId || null,
      file_name: file.name,
      file_type: file.mimeType || "application/octet-stream",
      file_path: filePath,
      file_url: fileUrl,
    })
    .select(
      "id, project_id, capture_id, requirement_run_id, file_name, file_type, file_path, file_url, created_at",
    )
    .single();

  if (insert.error) {
    throw new Error(
      insert.error.message || "Unable to save attachment metadata.",
    );
  }

  return insert.data as AttachmentRecord;
}

export async function listAttachmentsForCapture(
  projectId: string,
  captureId: string,
): Promise<AttachmentRecord[]> {
  const res = await supabase
    .from("attachments")
    .select(
      "id, project_id, capture_id, requirement_run_id, file_name, file_type, file_path, file_url, created_at",
    )
    .eq("project_id", projectId)
    .eq("capture_id", captureId)
    .order("created_at", { ascending: false });

  if (res.error) {
    throw new Error(res.error.message || "Unable to load attachments.");
  }

  return (res.data || []) as AttachmentRecord[];
}

export async function linkAttachmentsToRequirementRun(
  projectId: string,
  captureId: string,
  requirementRunId: string,
) {
  const res = await supabase
    .from("attachments")
    .update({ requirement_run_id: requirementRunId })
    .eq("project_id", projectId)
    .eq("capture_id", captureId)
    .is("requirement_run_id", null);

  if (res.error) {
    throw new Error(
      res.error.message || "Unable to link attachments to requirement run.",
    );
  }
}

export async function deleteAttachment(id: string, filePath?: string | null) {
  if (filePath) {
    await supabase.storage.from("attachments").remove([filePath]);
  }

  const res = await supabase.from("attachments").delete().eq("id", id);

  if (res.error) {
    throw new Error(res.error.message || "Unable to delete attachment.");
  }
}
