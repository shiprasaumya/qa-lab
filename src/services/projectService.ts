import { supabase } from "../lib/supabase";

export type ProjectItem = {
  id: string;
  name: string;
  created_at: string;
  user_id: string;
};

export async function fetchProjects(userId: string) {
  const { data, error } = await supabase
    .from("projects")
    .select("id, name, created_at, user_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  return { data: (data as ProjectItem[] | null) ?? [], error };
}

export async function createProject(userId: string, name: string) {
  const cleanName = name.trim();

  const { data, error } = await supabase
    .from("projects")
    .insert([{ name: cleanName, user_id: userId }])
    .select("id, name, created_at, user_id")
    .single();

  return { data: data as ProjectItem | null, error };
}
