import { supabase } from "../lib/supabase";

export async function deleteCaptureCascade(captureId: string) {
  const { data: captureRow, error: captureError } = await supabase
    .from("captures")
    .select("id, project_id")
    .eq("id", captureId)
    .single();

  if (captureError) {
    throw captureError;
  }

  const projectId = captureRow.project_id as string;

  const { error: attachmentsError } = await supabase
    .from("attachments")
    .delete()
    .eq("project_id", projectId)
    .eq("capture_id", captureId);

  if (attachmentsError) {
    throw attachmentsError;
  }

  const { error: outputsError } = await supabase
    .from("generated_outputs")
    .delete()
    .eq("project_id", projectId)
    .eq("capture_id", captureId);

  if (outputsError) {
    throw outputsError;
  }

  const { error: draftsError } = await supabase
    .from("requirement_drafts")
    .delete()
    .eq("project_id", projectId)
    .eq("capture_id", captureId);

  if (draftsError) {
    throw draftsError;
  }

  const { error: captureDeleteError } = await supabase
    .from("captures")
    .delete()
    .eq("id", captureId);

  if (captureDeleteError) {
    throw captureDeleteError;
  }
}

export async function deleteProjectCascade(projectId: string) {
  const { error: attachmentsError } = await supabase
    .from("attachments")
    .delete()
    .eq("project_id", projectId);

  if (attachmentsError) {
    throw attachmentsError;
  }

  const { error: outputsError } = await supabase
    .from("generated_outputs")
    .delete()
    .eq("project_id", projectId);

  if (outputsError) {
    throw outputsError;
  }

  const { error: draftsError } = await supabase
    .from("requirement_drafts")
    .delete()
    .eq("project_id", projectId);

  if (draftsError) {
    throw draftsError;
  }

  const { error: capturesError } = await supabase
    .from("captures")
    .delete()
    .eq("project_id", projectId);

  if (capturesError) {
    throw capturesError;
  }

  const { error: projectDeleteError } = await supabase
    .from("projects")
    .delete()
    .eq("id", projectId);

  if (projectDeleteError) {
    throw projectDeleteError;
  }
}
