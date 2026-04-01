import { supabase } from "../lib/supabase";

export type RequirementHistoryItem = {
  id: string;
  project_id: string;
  capture_id: string;
  requirement_text: string;
  created_at?: string;
};

export async function saveRequirementHistory(params: {
  projectId: string;
  captureId: string;
  requirementText: string;
}) {
  const { projectId, captureId, requirementText } = params;

  const trimmed = requirementText.trim();
  if (!trimmed) return null;

  const { data, error } = await supabase
    .from("requirement_history")
    .insert([
      {
        project_id: projectId,
        capture_id: captureId,
        requirement_text: trimmed,
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data as RequirementHistoryItem;
}

export async function getRequirementHistory(params: {
  projectId: string;
  captureId: string;
}) {
  const { projectId, captureId } = params;

  const { data, error } = await supabase
    .from("requirement_history")
    .select("*")
    .eq("project_id", projectId)
    .eq("capture_id", captureId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []) as RequirementHistoryItem[];
}
