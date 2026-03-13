import { supabase } from "../lib/supabase";

export async function uploadAttachment(
  file: any,
  projectId: string,
  captureId: string,
) {
  const fileName = `${Date.now()}-${file.name}`;

  const response = await fetch(file.uri);
  const blob = await response.blob();

  const { data, error } = await supabase.storage
    .from("attachments")
    .upload(fileName, blob);

  if (error) {
    throw error;
  }

  const { data: publicUrl } = supabase.storage
    .from("attachments")
    .getPublicUrl(fileName);

  const { error: dbError } = await supabase.from("attachments").insert({
    project_id: projectId,
    capture_id: captureId,
    file_name: file.name,
    file_type: file.mimeType,
    file_url: publicUrl.publicUrl,
  });

  if (dbError) {
    throw dbError;
  }

  return publicUrl.publicUrl;
}
