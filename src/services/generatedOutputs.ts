import { supabase } from "../lib/supabase";

export type OutputType =
  | "test_cases"
  | "edge_cases"
  | "api_tests"
  | "playwright"
  | "screenshot";

export type ReviewStatus = "pending" | "approved" | "needs_review";

export type SavedOutput = {
  id: string;
  project_id: string;
  capture_id: string;
  output_type: OutputType;
  content: string;
  is_favorite?: boolean;
  version_no?: number;
  review_status?: ReviewStatus;
  created_at?: string;
};

export async function getLatestOutput(params: {
  projectId: string;
  captureId: string;
  outputType: OutputType;
}) {
  const { projectId, captureId, outputType } = params;

  const { data, error } = await supabase
    .from("generated_outputs")
    .select("*")
    .eq("project_id", projectId)
    .eq("capture_id", captureId)
    .eq("output_type", outputType)
    .order("version_no", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return (data || null) as SavedOutput | null;
}

export async function getOutputHistory(params: {
  projectId: string;
  captureId: string;
  outputType: OutputType;
}) {
  const { projectId, captureId, outputType } = params;

  const { data, error } = await supabase
    .from("generated_outputs")
    .select("*")
    .eq("project_id", projectId)
    .eq("capture_id", captureId)
    .eq("output_type", outputType)
    .order("version_no", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []) as SavedOutput[];
}

export async function getPreviousOutput(params: {
  projectId: string;
  captureId: string;
  outputType: OutputType;
}) {
  const history = await getOutputHistory(params);
  return history.length > 1 ? history[1] : null;
}

export async function saveGeneratedOutput(params: {
  projectId: string;
  captureId: string;
  outputType: OutputType;
  content: string;
}) {
  const { projectId, captureId, outputType, content } = params;

  const latest = await getLatestOutput({
    projectId,
    captureId,
    outputType,
  });

  const nextVersion = ((latest?.version_no as number | undefined) || 0) + 1;

  const { data, error } = await supabase
    .from("generated_outputs")
    .insert([
      {
        project_id: projectId,
        capture_id: captureId,
        output_type: outputType,
        content,
        is_favorite: false,
        version_no: nextVersion,
        review_status: "pending",
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data as SavedOutput;
}

export async function toggleFavoriteOutput(params: {
  outputId: string;
  nextValue: boolean;
}) {
  const { outputId, nextValue } = params;

  const { data, error } = await supabase
    .from("generated_outputs")
    .update({
      is_favorite: nextValue,
    })
    .eq("id", outputId)
    .select()
    .single();

  if (error) throw error;
  return data as SavedOutput;
}

export async function updateReviewStatus(params: {
  outputId: string;
  reviewStatus: ReviewStatus;
}) {
  const { outputId, reviewStatus } = params;

  const { data, error } = await supabase
    .from("generated_outputs")
    .update({
      review_status: reviewStatus,
    })
    .eq("id", outputId)
    .select()
    .single();

  if (error) throw error;
  return data as SavedOutput;
}

export function formatApiTestsStructured(text: string) {
  if (!text?.trim()) return [];

  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const cleaned = line.replace(/^\d+[\).\-\s]*/, "");

      return {
        id: `${index + 1}`,
        title: cleaned,
        method: guessMethod(cleaned),
        priority: guessPriority(cleaned),
        scenarioType: guessScenarioType(cleaned),
      };
    });
}

function guessMethod(text: string) {
  const value = text.toLowerCase();

  if (value.includes("create") || value.includes("post")) return "POST";
  if (value.includes("update") || value.includes("put")) return "PUT";
  if (value.includes("delete") || value.includes("remove")) return "DELETE";
  if (value.includes("patch")) return "PATCH";
  return "GET";
}

function guessPriority(text: string) {
  const value = text.toLowerCase();

  if (
    value.includes("unauthorized") ||
    value.includes("validation") ||
    value.includes("required") ||
    value.includes("schema")
  ) {
    return "High";
  }

  if (
    value.includes("timeout") ||
    value.includes("duplicate") ||
    value.includes("boundary")
  ) {
    return "Medium";
  }

  return "Normal";
}

function guessScenarioType(text: string) {
  const value = text.toLowerCase();

  if (
    value.includes("invalid") ||
    value.includes("unauthorized") ||
    value.includes("missing") ||
    value.includes("error")
  ) {
    return "Negative";
  }

  if (value.includes("boundary") || value.includes("limit")) {
    return "Boundary";
  }

  return "Positive";
}

export function buildVersionComparison(current?: string, previous?: string) {
  const currentLines = (current || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const previousLines = (previous || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const added = currentLines.filter((line) => !previousLines.includes(line));
  const removed = previousLines.filter((line) => !currentLines.includes(line));

  return {
    added,
    removed,
    hasChanges: added.length > 0 || removed.length > 0,
  };
}
