import React, { useEffect, useState } from "react";
import {
  Alert,
  Button,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { supabase } from "../lib/supabase";

type Project = { id: string; name: string; created_at: string };

export default function ProjectsScreen({
  onOpenProject,
  onSignOut,
}: {
  onOpenProject: (p: Project) => void;
  onSignOut: () => void;
}) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [name, setName] = useState("");

  const loadProjects = async () => {
    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr) return Alert.alert("Auth error", authErr.message);

    const userId = authData?.user?.id;
    if (!userId) return Alert.alert("Not signed in", "Please sign in again.");

    const { data, error } = await supabase
      .from("projects")
      .select("id,name,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) return Alert.alert("Error", error.message);
    setProjects((data ?? []) as Project[]);
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const createProject = async () => {
    const projectName = name.trim();
    if (!projectName) return;

    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr) return Alert.alert("Auth error", authErr.message);

    const userId = authData?.user?.id;
    if (!userId) return Alert.alert("Not signed in", "Please sign in again.");

    const { data, error } = await supabase
      .from("projects")
      .insert([{ user_id: userId, name: projectName }])
      .select("id,name,created_at")
      .single();

    if (error) return Alert.alert("Create failed", error.message);

    setName("");
    Keyboard.dismiss();

    if (data) setProjects((prev) => [data as Project, ...prev]);
  };

  // DO NOT swallow taps
  const dismissOnTouch = () => {
    Keyboard.dismiss();
    return false;
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View
        style={styles.container}
        onStartShouldSetResponder={dismissOnTouch}
        onResponderRelease={Keyboard.dismiss}
      >
        <Text style={styles.title}>Projects</Text>

        <View style={styles.row}>
          <TextInput
            style={styles.input}
            placeholder="New project name"
            value={name}
            onChangeText={setName}
          />
          <Button title="Add" onPress={createProject} />
        </View>

        <FlatList
          data={projects}
          keyExtractor={(i) => i.id}
          keyboardShouldPersistTaps="always"
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          renderItem={({ item }) => (
            <Pressable
              style={styles.item}
              onPress={() => {
                // if you still think tap not working, keep this line for 1 minute:
                // Alert.alert("Tapped", item.name);

                Keyboard.dismiss();
                onOpenProject(item);
              }}
            >
              <Text style={styles.itemTitle}>{item.name}</Text>
              <Text style={styles.itemSub}>
                {new Date(item.created_at).toLocaleString()}
              </Text>
            </Pressable>
          )}
        />

        <Pressable onPress={onSignOut} style={{ marginTop: 24 }}>
          <Text style={{ color: "#007AFF", fontSize: 18, fontWeight: "600" }}>
            Sign Out
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, paddingTop: 60 },
  title: { fontSize: 28, fontWeight: "800", marginBottom: 12 },
  row: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    marginBottom: 14,
  },
  input: { flex: 1, borderWidth: 1, borderRadius: 10, padding: 12 },
  item: { borderWidth: 1, borderRadius: 12, padding: 14 },
  itemTitle: { fontSize: 18, fontWeight: "700" },
  itemSub: { marginTop: 6, opacity: 0.7 },
});
