import { supabase } from "../lib/supabase";

type SaveDraftParams = {
  projectId: string;
  captureId: string;
  draftText: string;
};

export async function loadRequirementDraft(params: {
  projectId: string;
  captureId: string;
}) {
  const { projectId, captureId } = params;

  const { data, error } = await supabase
    .from("requirement_drafts")
    .select("id, draft_text, updated_at")
    .eq("project_id", projectId)
    .eq("capture_id", captureId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function saveRequirementDraft(params: SaveDraftParams) {
  const { projectId, captureId, draftText } = params;

  const existing = await loadRequirementDraft({ projectId, captureId });

  if (existing?.id) {
    const { data, error } = await supabase
      .from("requirement_drafts")
      .update({
        draft_text: draftText,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  const { data, error } = await supabase
    .from("requirement_drafts")
    .insert([
      {
        project_id: projectId,
        capture_id: captureId,
        draft_text: draftText,
        updated_at: new Date().toISOString(),
      },
    ])
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}
