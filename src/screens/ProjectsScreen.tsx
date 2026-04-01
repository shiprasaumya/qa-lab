import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import AppHeader from "../components/AppHeader";
import { supabase } from "../lib/supabase";

<AppHeader title="Projects" showBack={false} current="projects" />;

type Project = {
  id: string;
  name: string;
  description?: string | null;
  created_at?: string;
};

type Props = {
  navigation: any;
};

export default function ProjectsScreen({ navigation }: Props) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadProjects = useCallback(async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      Alert.alert("Error", error.message);
    } else {
      setProjects(data || []);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadProjects();
    setRefreshing(false);
  }, [loadProjects]);

  const createProject = async () => {
    if (!name.trim()) {
      Alert.alert("Validation", "Project name is required.");
      return;
    }

    setCreating(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("projects")
      .insert([
        {
          name: name.trim(),
          user_id: user?.id,
        },
      ])
      .select()
      .single();

    setCreating(false);

    if (error) {
      Alert.alert("Error", error.message);
      return;
    }

    setName("");
    await loadProjects();

    if (data?.id) {
      navigation.navigate("Captures", { project: data });
    }
  };

  const deleteProject = async (project: Project) => {
    Alert.alert(
      "Delete Project",
      `Are you sure you want to delete "${project.name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const { error } = await supabase
              .from("projects")
              .delete()
              .eq("id", project.id);

            if (error) {
              Alert.alert("Error", error.message);
              return;
            }

            setProjects((prev) =>
              prev.filter((item) => item.id !== project.id),
            );
          },
        },
      ],
    );
  };

  const renderProject = ({ item }: { item: Project }) => {
    return (
      <TouchableOpacity
        style={styles.projectCard}
        activeOpacity={0.85}
        onPress={() => navigation.navigate("Captures", { project: item })}
      >
        <View style={styles.projectLeftIcon}>
          <Text style={styles.projectLeftIconText}>TM</Text>
        </View>

        <View style={styles.projectInfo}>
          <Text style={styles.projectName}>{item.name}</Text>
          <Text style={styles.projectMeta}>
            Created{" "}
            {item.created_at ? new Date(item.created_at).toLocaleString() : ""}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => deleteProject(item)}
        >
          <Ionicons name="trash-outline" size={18} color="#dc2626" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <AppHeader title="Projects" showBack={false} current="projects" />

      <FlatList
        data={projects}
        keyExtractor={(item) => item.id}
        renderItem={renderProject}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <>
            <View style={styles.brandCard}>
              <View style={styles.logoCircle}>
                <Text style={styles.logoText}>TM</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.brandTitle}>TestMind AI</Text>
                <Text style={styles.brandSubtitle}>Visual QA Assistant</Text>
              </View>
            </View>

            <View style={styles.welcomeCard}>
              <Text style={styles.welcomeTitle}>Welcome to TestMind AI</Text>
              <Text style={styles.welcomeText}>
                Create projects, generate structured test cases, add edge cases,
                and build AI-ready QA datasets.
              </Text>
            </View>

            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Projects</Text>
              <Text style={styles.sectionSubtitle}>
                Organize your product areas, requirements, screens, and
                generated test assets.
              </Text>

              <View style={styles.inlineRow}>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Enter new project name"
                  placeholderTextColor="#9ca3af"
                  style={styles.input}
                />
                <TouchableOpacity
                  style={styles.addBtn}
                  onPress={createProject}
                  disabled={creating}
                >
                  {creating ? (
                    <ActivityIndicator color="#2563eb" />
                  ) : (
                    <Text style={styles.addBtnText}>Add</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </>
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.emptyWrap}>
              <ActivityIndicator />
              <Text style={styles.emptyText}>Loading projects...</Text>
            </View>
          ) : (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyText}>No projects yet</Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#eef2f5",
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },

  brandCard: {
    backgroundColor: "#ffffff",
    borderRadius: 22,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  logoCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#2563eb",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  logoText: {
    color: "#ffffff",
    fontSize: 24,
    fontWeight: "700",
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0f172a",
  },
  brandSubtitle: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 4,
  },
  welcomeCard: {
    backgroundColor: "#1f86f2",
    borderRadius: 24,
    padding: 22,
    marginBottom: 16,
  },
  welcomeTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#ffffff",
    marginBottom: 10,
  },
  welcomeText: {
    fontSize: 15,
    lineHeight: 24,
    color: "#eaf3ff",
  },
  sectionCard: {
    backgroundColor: "#ffffff",
    borderRadius: 22,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    lineHeight: 22,
    color: "#6b7280",
    marginBottom: 14,
  },
  inlineRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  input: {
    flex: 1,
    height: 54,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 15,
    color: "#111827",
    backgroundColor: "#ffffff",
  },
  addBtn: {
    marginLeft: 12,
    paddingHorizontal: 10,
    height: 54,
    justifyContent: "center",
    alignItems: "center",
  },
  addBtnText: {
    color: "#2583ea",
    fontSize: 17,
    fontWeight: "600",
  },
  projectCard: {
    backgroundColor: "#ffffff",
    borderRadius: 22,
    padding: 18,
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  projectLeftIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#eaf1fb",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  projectLeftIconText: {
    color: "#2196f3",
    fontSize: 22,
    fontWeight: "700",
  },
  projectInfo: {
    flex: 1,
  },
  projectName: {
    fontSize: 17,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 4,
  },
  projectMeta: {
    fontSize: 14,
    color: "#6b7280",
  },
  deleteButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#fef2f2",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyWrap: {
    alignItems: "center",
    paddingVertical: 30,
  },
  emptyText: {
    color: "#6b7280",
    fontSize: 14,
  },
});
