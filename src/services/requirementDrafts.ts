import { supabase } from "../lib/supabase";

export type RequirementDraft = {
  id: string;
  project_id: string;
  capture_id?: string | null;
  draft_text: string;
  updated_at?: string;
};

export async function getRequirementDraft(params: {
  projectId: string;
  captureId?: string | null;
}) {
  let query = supabase
    .from("requirement_drafts")
    .select("*")
    .eq("project_id", params.projectId)
    .order("updated_at", { ascending: false })
    .limit(1);

  if (params.captureId) {
    query = query.eq("capture_id", params.captureId);
  } else {
    query = query.is("capture_id", null);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    throw error;
  }

  return (data || null) as RequirementDraft | null;
}

export async function saveRequirementDraft(params: {
  projectId: string;
  captureId?: string | null;
  draftText: string;
}) {
  const existing = await getRequirementDraft({
    projectId: params.projectId,
    captureId: params.captureId,
  });

  if (existing?.id) {
    const { data, error } = await supabase
      .from("requirement_drafts")
      .update({
        draft_text: params.draftText,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data as RequirementDraft;
  }

  const { data, error } = await supabase
    .from("requirement_drafts")
    .insert([
      {
        project_id: params.projectId,
        capture_id: params.captureId || null,
        draft_text: params.draftText,
      },
    ])
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as RequirementDraft;
}

export async function deleteRequirementDraft(params: {
  projectId: string;
  captureId?: string | null;
}) {
  let query = supabase
    .from("requirement_drafts")
    .delete()
    .eq("project_id", params.projectId);

  if (params.captureId) {
    query = query.eq("capture_id", params.captureId);
  } else {
    query = query.is("capture_id", null);
  }

  const { error } = await query;

  if (error) {
    throw error;
  }
}
