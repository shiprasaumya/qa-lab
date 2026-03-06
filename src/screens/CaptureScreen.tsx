import React, { useEffect, useState } from "react";
import {
    Alert,
    Button,
    FlatList,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { supabase } from "../lib/supabase";

type Project = { id: string; name: string };
type Capture = { id: string; title: string; created_at: string };

export default function CaptureScreen({
  project,
  onOpenCapture,
  onBack,
}: {
  project: Project;
  onOpenCapture: (capture: Capture) => void;
  onBack: () => void;
}) {
  const [captures, setCaptures] = useState<Capture[]>([]);
  const [title, setTitle] = useState("");

  const getUserId = async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error) return null;
    return data?.user?.id ?? null;
  };

  const loadCaptures = async () => {
    const userId = await getUserId();
    if (!userId) return Alert.alert("Not signed in", "Please sign in again.");

    const { data, error } = await supabase
      .from("captures")
      .select("id,title,created_at")
      .eq("project_id", project.id)
      .order("created_at", { ascending: false });

    if (error) return Alert.alert("Error", error.message);
    setCaptures((data ?? []) as Capture[]);
  };

  useEffect(() => {
    loadCaptures();
  }, []);

  const createCapture = async () => {
    const trimmed = title.trim() || "New Capture";

    const userId = await getUserId();
    if (!userId) return Alert.alert("Not signed in", "Please sign in again.");

    const { data, error } = await supabase
      .from("captures")
      .insert([{ user_id: userId, project_id: project.id, title: trimmed }])
      .select("id,title,created_at")
      .single();

    if (error) return Alert.alert("Create failed", error.message);

    setTitle("");

    if (data) {
      // Create an empty testcase row for this capture (so editor always has something)
      const { error: tcErr } = await supabase
        .from("testcases")
        .insert([{ user_id: userId, capture_id: data.id, content: "" }]);

      if (tcErr) return Alert.alert("Testcase create failed", tcErr.message);

      await loadCaptures();
      onOpenCapture(data as Capture);
    }
  };

  return (
    <View style={styles.container}>
      <Pressable onPress={onBack} style={styles.back}>
        <Text>{"← Back"}</Text>
      </Pressable>

      <Text style={styles.title}>{project.name}</Text>
      <Text style={styles.subtitle}>Captures</Text>

      <View style={styles.row}>
        <TextInput
          style={styles.input}
          placeholder="New capture title"
          value={title}
          onChangeText={setTitle}
        />
        <Button title="Add" onPress={createCapture} />
      </View>

      <FlatList
        data={captures}
        keyExtractor={(i) => i.id}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        renderItem={({ item }) => (
          <Pressable onPress={() => onOpenCapture(item)} style={styles.item}>
            <Text style={styles.itemTitle}>{item.title}</Text>
            <Text style={styles.itemSub}>
              {new Date(item.created_at).toLocaleString()}
            </Text>
          </Pressable>
        )}
        ListEmptyComponent={
          <Text style={{ opacity: 0.7 }}>
            No captures yet. Create one above.
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, paddingTop: 60 },
  back: { marginBottom: 10 },
  title: { fontSize: 22, fontWeight: "700" },
  subtitle: { marginTop: 6, marginBottom: 10, opacity: 0.7 },
  row: { flexDirection: "row", gap: 8, alignItems: "center", marginBottom: 12 },
  input: { flex: 1, borderWidth: 1, borderRadius: 8, padding: 10 },
  item: { borderWidth: 1, borderRadius: 10, padding: 12 },
  itemTitle: { fontSize: 16, fontWeight: "600" },
  itemSub: { marginTop: 4, opacity: 0.7 },
});
