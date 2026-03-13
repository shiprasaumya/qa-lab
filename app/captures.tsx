import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { useAuth } from "../src/context/AuthContext";
import { supabase } from "../src/lib/supabase";

type Project = {
  id: string;
  name: string;
  created_at?: string;
};

export default function ProjectsPage() {
  const { signOut } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        Alert.alert("Error", error.message);
        return;
      }

      setProjects(data || []);
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Unable to load projects.");
    } finally {
      setLoading(false);
    }
  };

  const createProject = async () => {
    if (!name.trim()) {
      Alert.alert("Validation", "Please enter project name.");
      return;
    }

    try {
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

      if (error) {
        Alert.alert("Create Error", error.message);
        return;
      }

      setName("");
      await loadProjects();

      if (data?.id) {
        router.push({
          pathname: "/captures",
          params: {
            projectId: data.id,
            projectName: data.name,
          },
        });
      }
    } catch (error: any) {
      Alert.alert(
        "Create Error",
        error?.message || "Unable to create project.",
      );
    } finally {
      setCreating(false);
    }
  };

  const openProject = (project: Project) => {
    router.push({
      pathname: "/captures",
      params: {
        projectId: project.id,
        projectName: project.name,
      },
    });
  };

  const handleSignOut = async () => {
    await signOut();
    router.replace("/");
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Projects</Text>

        <TouchableOpacity style={styles.headerButton} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={20} color="#111827" />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.brandCard}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>TM</Text>
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.brandTitle}>TestMind AI</Text>
            <Text style={styles.brandSubtitle}>Manage your QA projects</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Create Project</Text>

          <View style={styles.inlineRow}>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Enter project name"
              placeholderTextColor="#9ca3af"
              style={styles.input}
            />

            <TouchableOpacity
              style={styles.addButton}
              onPress={createProject}
              disabled={creating}
            >
              {creating ? (
                <ActivityIndicator color="#1677f2" />
              ) : (
                <Text style={styles.addButtonText}>Add</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {loading ? (
          <View style={styles.centerWrap}>
            <ActivityIndicator size="large" color="#1677f2" />
          </View>
        ) : (
          <FlatList
            data={projects}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingBottom: 40 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.projectCard}
                onPress={() => openProject(item)}
              >
                <View style={styles.projectIcon}>
                  <Text style={styles.projectIconText}>TM</Text>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.projectName}>{item.name}</Text>
                  <Text style={styles.projectMeta}>
                    {item.created_at
                      ? new Date(item.created_at).toLocaleString()
                      : ""}
                  </Text>
                </View>

                <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <Text style={styles.emptyText}>No projects yet.</Text>
              </View>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#eef2f5",
  },
  header: {
    minHeight: 68,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#111827",
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  brandCard: {
    backgroundColor: "#ffffff",
    borderRadius: 22,
    paddingHorizontal: 20,
    paddingVertical: 18,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginBottom: 16,
  },
  logoCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#1d4ed8",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  logoText: {
    color: "#ffffff",
    fontSize: 24,
    fontWeight: "800",
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0f172a",
  },
  brandSubtitle: {
    marginTop: 4,
    fontSize: 14,
    color: "#6b7280",
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
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
    borderRadius: 16,
    paddingHorizontal: 16,
    backgroundColor: "#ffffff",
    fontSize: 16,
    color: "#111827",
  },
  addButton: {
    marginLeft: 12,
    paddingHorizontal: 8,
    height: 54,
    justifyContent: "center",
    alignItems: "center",
  },
  addButtonText: {
    color: "#1677f2",
    fontSize: 17,
    fontWeight: "700",
  },
  centerWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  projectCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  projectIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#e8f0ff",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  projectIconText: {
    color: "#1677f2",
    fontSize: 20,
    fontWeight: "800",
  },
  projectName: {
    fontSize: 17,
    fontWeight: "800",
    color: "#111827",
  },
  projectMeta: {
    marginTop: 4,
    fontSize: 13,
    color: "#6b7280",
  },
  emptyWrap: {
    paddingVertical: 30,
    alignItems: "center",
  },
  emptyText: {
    color: "#6b7280",
    fontSize: 14,
  },
});
