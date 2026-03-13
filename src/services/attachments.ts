import { decode } from "base64-arraybuffer";
import * as FileSystem from "expo-file-system";
import { supabase } from "../lib/supabase";

export type AttachmentRecord = {
  id: string;
  project_id: string;
  capture_id?: string | null;
  file_name: string;
  file_type?: string | null;
  file_path: string;
  file_url?: string | null;
  created_at?: string;
};

type UploadAttachmentParams = {
  projectId: string;
  captureId?: string | null;
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

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function uploadWithRetry(
  filePath: string,
  base64: string,
  mimeType: string | null | undefined,
) {
  let lastError: any = null;

  for (let attempt = 0; attempt < 3; attempt++) {
    const { error } = await supabase.storage
      .from("attachments")
      .upload(filePath, decode(base64), {
        contentType: mimeType || "application/octet-stream",
        upsert: false,
      });

    if (!error) {
      return;
    }

    lastError = error;
    if (attempt < 2) {
      await sleep(700 * (attempt + 1));
    }
  }

  throw lastError;
}

export async function uploadAttachment({
  projectId,
  captureId,
  file,
}: UploadAttachmentParams) {
  const safeName = sanitizeFileName(file.name || `file_${Date.now()}`);

  if (typeof file.size === "number" && file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error(
      `File is too large. Max supported size is ${MAX_FILE_SIZE_MB} MB.`,
    );
  }

  const fileInfo = await FileSystem.getInfoAsync(file.uri);
  const fileSize =
    fileInfo.exists && "size" in fileInfo ? Number(fileInfo.size || 0) : 0;

  if (fileSize > MAX_FILE_SIZE_BYTES) {
    throw new Error(
      `File is too large. Max supported size is ${MAX_FILE_SIZE_MB} MB.`,
    );
  }

  const filePath = `${projectId}/${captureId || "no-capture"}/${Date.now()}_${safeName}`;

  const base64 = await FileSystem.readAsStringAsync(file.uri, {
    //encoding: FileSystem.EncodingType.Base64,
  });

  await uploadWithRetry(filePath, base64, file.mimeType);

  const { data: publicUrlData } = supabase.storage
    .from("attachments")
    .getPublicUrl(filePath);

  const { data, error: dbError } = await supabase
    .from("attachments")
    .insert([
      {
        project_id: projectId,
        capture_id: captureId || null,
        file_name: safeName,
        file_type: file.mimeType || null,
        file_path: filePath,
        file_url: publicUrlData.publicUrl,
      },
    ])
    .select()
    .single();

  if (dbError) {
    try {
      await supabase.storage.from("attachments").remove([filePath]);
    } catch {}
    throw dbError;
  }

  return data as AttachmentRecord;
}

export async function getAttachments(params: {
  projectId: string;
  captureId?: string | null;
}) {
  let query = supabase
    .from("attachments")
    .select("*")
    .eq("project_id", params.projectId)
    .order("created_at", { ascending: false });

  if (params.captureId) {
    query = query.eq("capture_id", params.captureId);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data || []) as AttachmentRecord[];
}

export async function deleteAttachment(attachment: AttachmentRecord) {
  const { error: storageError } = await supabase.storage
    .from("attachments")
    .remove([attachment.file_path]);

  if (storageError) {
    throw storageError;
  }

  const { error: dbError } = await supabase
    .from("attachments")
    .delete()
    .eq("id", attachment.id);

  if (dbError) {
    throw dbError;
  }
}
