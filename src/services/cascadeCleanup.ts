import { supabase } from "../lib/supabase";

type AttachmentRow = {
  id: string;
  file_path: string;
};

async function removeStorageFiles(filePaths: string[]) {
  if (!filePaths.length) return;

  const chunkSize = 100;

  for (let i = 0; i < filePaths.length; i += chunkSize) {
    const chunk = filePaths.slice(i, i + chunkSize);
    const { error } = await supabase.storage.from("attachments").remove(chunk);

    if (error) {
      throw error;
    }
  }
}

export async function deleteCaptureCascade(captureId: string) {
  const { data: attachments, error: attachmentsError } = await supabase
    .from("attachments")
    .select("id, file_path")
    .eq("capture_id", captureId);

  if (attachmentsError) {
    throw attachmentsError;
  }

  const filePaths = ((attachments || []) as AttachmentRow[])
    .map((item) => item.file_path)
    .filter(Boolean);

  if (filePaths.length) {
    await removeStorageFiles(filePaths);
  }

  const { error: deleteAttachmentsError } = await supabase
    .from("attachments")
    .delete()
    .eq("capture_id", captureId);

  if (deleteAttachmentsError) {
    throw deleteAttachmentsError;
  }

  const { error: deleteOutputsError } = await supabase
    .from("generated_outputs")
    .delete()
    .eq("capture_id", captureId);

  if (deleteOutputsError) {
    throw deleteOutputsError;
  }

  const { error: deleteCaptureError } = await supabase
    .from("captures")
    .delete()
    .eq("id", captureId);

  if (deleteCaptureError) {
    throw deleteCaptureError;
  }
}

export async function deleteProjectCascade(projectId: string) {
  const { data: projectAttachments, error: attachmentsError } = await supabase
    .from("attachments")
    .select("id, file_path")
    .eq("project_id", projectId);

  if (attachmentsError) {
    throw attachmentsError;
  }

  const filePaths = ((projectAttachments || []) as AttachmentRow[])
    .map((item) => item.file_path)
    .filter(Boolean);

  if (filePaths.length) {
    await removeStorageFiles(filePaths);
  }

  const { error: deleteAttachmentsError } = await supabase
    .from("attachments")
    .delete()
    .eq("project_id", projectId);

  if (deleteAttachmentsError) {
    throw deleteAttachmentsError;
  }

  const { error: deleteOutputsError } = await supabase
    .from("generated_outputs")
    .delete()
    .eq("project_id", projectId);

  if (deleteOutputsError) {
    throw deleteOutputsError;
  }

  const { error: deleteCapturesError } = await supabase
    .from("captures")
    .delete()
    .eq("project_id", projectId);

  if (deleteCapturesError) {
    throw deleteCapturesError;
  }

  const { error: deleteProjectError } = await supabase
    .from("projects")
    .delete()
    .eq("id", projectId);

  if (deleteProjectError) {
    throw deleteProjectError;
  }
}
