//import { decode as atob } from "base-64";
//import * as FileSystem from "expo-file-system";
import { supabase } from "./supabase";

export type UploadAttachmentInput = {
  projectId?: string | null;
  captureId?: string | null;
  exploratorySessionId?: string | null;
  requirementRunId?: string | null;
  uri: string;
  fileName: string;
  mimeType?: string | null;
  fileSize?: number | null;
  kind: "file" | "image";
  sourceType?: string | null;
};

export type StoredAttachment = {
  id: string;
  project_id: string | null;
  capture_id: string | null;
  exploratory_session_id: string | null;
  requirement_run_id: string | null;
  file_name: string;
  original_name: string | null;
  mime_type: string | null;
  file_size: number | null;
  storage_bucket: string;
  storage_path: string;
  public_url: string | null;
  attachment_kind: "file" | "image";
  source_type: string | null;
  uploaded_by: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

const STORAGE_BUCKET = "testmind-attachments";

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^\w.\-]+/g, "_");
}

function buildStoragePath(input: UploadAttachmentInput) {
  const safeName = sanitizeFileName(input.fileName);
  const uniquePrefix = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  if (input.exploratorySessionId) {
    return `projects/${input.projectId || "unknown"}/exploratory/${input.exploratorySessionId}/${uniquePrefix}_${safeName}`;
  }

  if (input.requirementRunId) {
    return `projects/${input.projectId || "unknown"}/runs/${input.requirementRunId}/${uniquePrefix}_${safeName}`;
  }

  if (input.captureId) {
    return `projects/${input.projectId || "unknown"}/captures/${input.captureId}/${uniquePrefix}_${safeName}`;
  }

  return `projects/${input.projectId || "unknown"}/misc/${uniquePrefix}_${safeName}`;
}

// function base64ToArrayBuffer(base64: string): ArrayBuffer {
//   const binaryString = atob(base64);
//   const len = binaryString.length;
//   const bytes = new Uint8Array(len);

//   for (let i = 0; i < len; i += 1) {
//     bytes[i] = binaryString.charCodeAt(i);
//   }

//   return bytes.buffer;
// }

async function readFileAsArrayBuffer(uri: string): Promise<ArrayBuffer> {
  const response = await fetch(uri);
  return await response.arrayBuffer();
}

export async function uploadAndRegisterAttachment(
  input: UploadAttachmentInput,
): Promise<StoredAttachment> {
  const storagePath = buildStoragePath(input);
  const fileBody = await readFileAsArrayBuffer(input.uri);

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, fileBody, {
      contentType: input.mimeType || "application/octet-stream",
      upsert: false,
    });

  if (uploadError) {
    throw new Error(uploadError.message || "Unable to upload file to storage.");
  }

  const { data: signedData, error: signedError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(storagePath, 60 * 60);

  const signedUrl = signedError ? null : signedData?.signedUrl || null;

  const insertPayload = {
    project_id: input.projectId || null,
    capture_id: input.captureId || null,
    exploratory_session_id: input.exploratorySessionId || null,
    requirement_run_id: input.requirementRunId || null,
    file_name: sanitizeFileName(input.fileName),
    original_name: input.fileName || null,
    mime_type: input.mimeType || null,
    file_size: input.fileSize ?? null,
    storage_bucket: STORAGE_BUCKET,
    storage_path: storagePath,
    public_url: signedUrl,
    attachment_kind: input.kind,
    source_type: input.sourceType || null,
    uploaded_by: null,
  };

  const { data, error: insertError } = await supabase
    .from("attachments")
    .insert(insertPayload)
    .select(
      "id, project_id, capture_id, exploratory_session_id, requirement_run_id, file_name, original_name, mime_type, file_size, storage_bucket, storage_path, public_url, attachment_kind, source_type, uploaded_by, created_at, updated_at",
    )
    .single();

  if (insertError) {
    await supabase.storage.from(STORAGE_BUCKET).remove([storagePath]);
    throw new Error(
      insertError.message || "Unable to save attachment metadata.",
    );
  }

  return data as StoredAttachment;
}

export async function deleteAttachmentCompletely(attachment: {
  id: string;
  storage_bucket?: string | null;
  storage_path: string;
}) {
  const bucket = attachment.storage_bucket || STORAGE_BUCKET;

  const { error: storageError } = await supabase.storage
    .from(bucket)
    .remove([attachment.storage_path]);

  if (storageError) {
    throw new Error(
      storageError.message || "Unable to delete file from storage.",
    );
  }

  const { error: dbError } = await supabase
    .from("attachments")
    .delete()
    .eq("id", attachment.id);

  if (dbError) {
    throw new Error(dbError.message || "Unable to delete attachment record.");
  }
}

export async function getAttachmentsForRequirementRun(
  requirementRunId: string,
) {
  const { data, error } = await supabase
    .from("attachments")
    .select(
      "id, project_id, capture_id, exploratory_session_id, requirement_run_id, file_name, original_name, mime_type, file_size, storage_bucket, storage_path, public_url, attachment_kind, source_type, uploaded_by, created_at, updated_at",
    )
    .eq("requirement_run_id", requirementRunId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message || "Unable to load attachments.");
  }

  return (data || []) as StoredAttachment[];
}

export async function createSignedUrlForAttachment(
  bucket: string,
  path: string,
  expiresInSeconds = 60 * 60,
) {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresInSeconds);

  if (error) {
    throw new Error(error.message || "Unable to create signed URL.");
  }

  return data?.signedUrl || null;
}
