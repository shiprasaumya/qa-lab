import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import AppHeader from "../src/components/AppHeader";
import { supabase } from "../src/lib/supabase";
import { deleteProjectCascade } from "../src/services/cascadeCleanup";

type Project = {
  id: string;
  name: string;
  created_at?: string;
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectName, setProjectName] = useState("");
  const [searchText, setSearchText] = useState("");

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(
    null,
  );

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editProjectName, setEditProjectName] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("projects")
        .select("id, name, created_at")
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

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProjects();
    setRefreshing(false);
  };

  const createProject = async () => {
    if (!projectName.trim()) {
      Alert.alert("Validation", "Please enter a project name.");
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
            name: projectName.trim(),
            user_id: user?.id,
          },
        ])
        .select()
        .single();

      if (error) {
        Alert.alert("Error", error.message);
        return;
      }

      setProjectName("");
      await loadProjects();

      if (data?.id) {
        router.push({
          pathname: "/project-dashboard",
          params: {
            projectId: data.id,
            projectName: data.name,
          },
        });
      }
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Unable to create project.");
    } finally {
      setCreating(false);
    }
  };

  const openProject = (project: Project) => {
    router.push({
      pathname: "/project-dashboard",
      params: {
        projectId: project.id,
        projectName: project.name,
      },
    });
  };

  const openEditProject = (project: Project) => {
    setEditingProject(project);
    setEditProjectName(project.name);
    setEditModalVisible(true);
  };

  const saveProjectEdit = async () => {
    if (!editingProject) return;

    if (!editProjectName.trim()) {
      Alert.alert("Validation", "Project name cannot be empty.");
      return;
    }

    try {
      setSavingEdit(true);

      const { error } = await supabase
        .from("projects")
        .update({
          name: editProjectName.trim(),
        })
        .eq("id", editingProject.id);

      if (error) {
        Alert.alert("Error", error.message);
        return;
      }

      setProjects((prev) =>
        prev.map((item) =>
          item.id === editingProject.id
            ? { ...item, name: editProjectName.trim() }
            : item,
        ),
      );

      setEditModalVisible(false);
      setEditingProject(null);
      setEditProjectName("");
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Unable to update project.");
    } finally {
      setSavingEdit(false);
    }
  };

  const confirmDeleteProject = (project: Project) => {
    Alert.alert(
      "Delete Project",
      `Delete "${project.name}" and all related captures, outputs, attachments, and drafts? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Everything",
          style: "destructive",
          onPress: async () => {
            try {
              setDeletingProjectId(project.id);
              await deleteProjectCascade(project.id);
              setProjects((prev) =>
                prev.filter((item) => item.id !== project.id),
              );
            } catch (error: any) {
              Alert.alert(
                "Delete Error",
                error?.message || "Unable to delete project completely.",
              );
            } finally {
              setDeletingProjectId(null);
            }
          },
        },
      ],
    );
  };

  const filteredProjects = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter((project) => project.name.toLowerCase().includes(q));
  }, [projects, searchText]);

  const renderProject = ({ item }: { item: Project }) => {
    const isDeleting = deletingProjectId === item.id;

    return (
      <TouchableOpacity
        style={styles.projectCard}
        onPress={() => openProject(item)}
        activeOpacity={0.85}
      >
        <View style={styles.logoSmall}>
          <Text style={styles.logoSmallText}>TM</Text>
        </View>

        <View style={styles.projectInfo}>
          <Text style={styles.projectName}>{item.name}</Text>
          <Text style={styles.projectMeta}>
            {item.created_at ? new Date(item.created_at).toLocaleString() : ""}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.iconAction}
          onPress={() => openEditProject(item)}
          disabled={isDeleting}
        >
          <Ionicons name="create-outline" size={18} color="#2563eb" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.iconAction}
          onPress={() => confirmDeleteProject(item)}
          disabled={isDeleting}
        >
          {isDeleting ? (
            <ActivityIndicator size="small" color="#dc2626" />
          ) : (
            <Ionicons name="trash-outline" size={18} color="#dc2626" />
          )}
        </TouchableOpacity>

        <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <AppHeader title="Projects" showBack={false} current="projects" />

      <FlatList
        data={filteredProjects}
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

              <View style={styles.brandTextWrap}>
                <Text style={styles.brandTitle}>TestMind AI</Text>
                <Text style={styles.brandSubtitle}>
                  Manage your QA projects
                </Text>
              </View>
            </View>

            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Create Project</Text>

              <TextInput
                value={searchText}
                onChangeText={setSearchText}
                placeholder="Search projects"
                placeholderTextColor="#9ca3af"
                style={styles.searchInput}
              />

              <View style={styles.row}>
                <TextInput
                  value={projectName}
                  onChangeText={setProjectName}
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
          </>
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.emptyWrap}>
              <ActivityIndicator size="large" color="#1677f2" />
              <Text style={styles.emptyText}>Loading projects...</Text>
            </View>
          ) : (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyText}>
                {searchText.trim()
                  ? "No matching projects found."
                  : "No projects yet."}
              </Text>
            </View>
          )
        }
      />

      <Modal
        visible={editModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Edit Project Name</Text>

            <TextInput
              value={editProjectName}
              onChangeText={setEditProjectName}
              placeholder="Project name"
              placeholderTextColor="#9ca3af"
              style={styles.modalInput}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalSecondaryButton}
                onPress={() => {
                  setEditModalVisible(false);
                  setEditingProject(null);
                  setEditProjectName("");
                }}
              >
                <Text style={styles.modalSecondaryText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalPrimaryButton}
                onPress={saveProjectEdit}
                disabled={savingEdit}
              >
                {savingEdit ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.modalPrimaryText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#eef2f5",
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  brandCard: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
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
  brandTextWrap: {
    flex: 1,
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
  sectionCard: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 14,
  },
  searchInput: {
    height: 56,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 16,
    paddingHorizontal: 16,
    backgroundColor: "#ffffff",
    fontSize: 16,
    color: "#111827",
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  input: {
    flex: 1,
    height: 56,
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
    minWidth: 58,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  addButtonText: {
    color: "#1677f2",
    fontSize: 18,
    fontWeight: "700",
  },
  projectCard: {
    backgroundColor: "#ffffff",
    borderRadius: 22,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    flexDirection: "row",
    alignItems: "center",
  },
  logoSmall: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#e8f0fe",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  logoSmallText: {
    color: "#1d4ed8",
    fontSize: 20,
    fontWeight: "800",
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
  iconAction: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#eff6ff",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  emptyWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  emptyText: {
    marginTop: 10,
    fontSize: 15,
    color: "#6b7280",
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.24)",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  modalCard: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 14,
  },
  modalInput: {
    height: 56,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 16,
    paddingHorizontal: 16,
    backgroundColor: "#ffffff",
    fontSize: 16,
    color: "#111827",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 16,
  },
  modalSecondaryButton: {
    height: 46,
    paddingHorizontal: 18,
    borderRadius: 14,
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    marginRight: 10,
  },
  modalSecondaryText: {
    color: "#111827",
    fontSize: 15,
    fontWeight: "700",
  },
  modalPrimaryButton: {
    height: 46,
    paddingHorizontal: 18,
    borderRadius: 14,
    backgroundColor: "#1677f2",
    justifyContent: "center",
    alignItems: "center",
    minWidth: 82,
  },
  modalPrimaryText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },
});
