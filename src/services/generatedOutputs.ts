import { supabase } from "../lib/supabase";

export type ReviewStatus = "pending" | "approved" | "needs_review";

export type GeneratedOutputRecord = {
  id: string;
  project_id: string;
  capture_id?: string | null;
  output_type: string;
  requirement_text?: string | null;
  result_text: string;
  created_at?: string;
  is_favorite?: boolean;
  review_status?: ReviewStatus;
  version_no?: number;
};

export async function saveGeneratedOutput(params: {
  projectId: string;
  captureId?: string | null;
  outputType: string;
  requirementText?: string;
  resultText: string;
}) {
  const { data: latest } = await supabase
    .from("generated_outputs")
    .select("version_no")
    .eq("project_id", params.projectId)
    .eq("output_type", params.outputType)
    .eq("capture_id", params.captureId || null)
    .order("version_no", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextVersion = (latest?.version_no || 0) + 1;

  const { error, data } = await supabase
    .from("generated_outputs")
    .insert([
      {
        project_id: params.projectId,
        capture_id: params.captureId || null,
        output_type: params.outputType,
        requirement_text: params.requirementText || null,
        result_text: params.resultText,
        version_no: nextVersion,
        is_favorite: false,
        review_status: "pending",
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data as GeneratedOutputRecord;
}

export async function getGeneratedOutputs(params: {
  projectId: string;
  captureId?: string | null;
}) {
  let query = supabase
    .from("generated_outputs")
    .select("*")
    .eq("project_id", params.projectId)
    .order("created_at", { ascending: false });

  if (params.captureId) {
    query = query.eq("capture_id", params.captureId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as GeneratedOutputRecord[];
}

export async function getRequirementHistory(params: {
  projectId: string;
  captureId?: string | null;
}) {
  let query = supabase
    .from("generated_outputs")
    .select("id, requirement_text, created_at, version_no, output_type")
    .eq("project_id", params.projectId)
    .not("requirement_text", "is", null)
    .order("created_at", { ascending: false });

  if (params.captureId) {
    query = query.eq("capture_id", params.captureId);
  }

  const { data, error } = await query;
  if (error) throw error;

  const uniqueMap = new Map<string, any>();

  for (const item of data || []) {
    const key = `${item.requirement_text || ""}`;
    if (!uniqueMap.has(key)) {
      uniqueMap.set(key, item);
    }
  }

  return Array.from(uniqueMap.values());
}

export async function updateGeneratedOutput(params: {
  id: string;
  is_favorite?: boolean;
  review_status?: ReviewStatus;
}) {
  const patch: Record<string, any> = {};

  if (typeof params.is_favorite === "boolean") {
    patch.is_favorite = params.is_favorite;
  }

  if (params.review_status) {
    patch.review_status = params.review_status;
  }

  const { data, error } = await supabase
    .from("generated_outputs")
    .update(patch)
    .eq("id", params.id)
    .select()
    .single();

  if (error) throw error;
  return data as GeneratedOutputRecord;
}

export async function deleteGeneratedOutput(id: string) {
  const { error } = await supabase
    .from("generated_outputs")
    .delete()
    .eq("id", id);

  if (error) throw error;
}
