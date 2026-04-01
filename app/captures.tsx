import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
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
import AppMenu from "../src/components/AppMenu";
import { supabase } from "../src/lib/supabase";
import { deleteCaptureCascade } from "../src/services/cascadeCleanup";

type Capture = {
  id: string;
  title: string;
  created_at?: string;
  project_id: string;
  user_id?: string;
};

export default function CapturesPage() {
  const { projectId, projectName } = useLocalSearchParams<{
    projectId?: string;
    projectName?: string;
  }>();

  const safeProjectId = typeof projectId === "string" ? projectId : "";
  const safeProjectName =
    typeof projectName === "string" && projectName.trim()
      ? projectName
      : "Project";

  const [title, setTitle] = useState("");
  const [searchText, setSearchText] = useState("");
  const [captures, setCaptures] = useState<Capture[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingCapture, setEditingCapture] = useState<Capture | null>(null);
  const [editCaptureTitle, setEditCaptureTitle] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const [deletingCaptureId, setDeletingCaptureId] = useState<string | null>(
    null,
  );
  const [duplicatingCaptureId, setDuplicatingCaptureId] = useState<
    string | null
  >(null);

  useEffect(() => {
    if (safeProjectId) {
      loadCaptures();
    }
  }, [safeProjectId]);

  const loadCaptures = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("captures")
        .select("*")
        .eq("project_id", safeProjectId)
        .order("created_at", { ascending: false });

      if (error) {
        Alert.alert("Error", error.message);
        return;
      }

      setCaptures(data || []);
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Unable to load captures.");
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCaptures();
    setRefreshing(false);
  };

  const addCapture = async () => {
    if (!safeProjectId) {
      Alert.alert("Error", "Project ID is missing.");
      return;
    }

    const newTitle = title.trim() || "New Capture";

    try {
      setAdding(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.id) {
        Alert.alert(
          "Auth Error",
          "User session not found. Please sign in again.",
        );
        return;
      }

      const { data, error } = await supabase
        .from("captures")
        .insert([
          {
            title: newTitle,
            project_id: safeProjectId,
            user_id: user.id,
          },
        ])
        .select()
        .single();

      if (error) {
        Alert.alert("Error", error.message);
        return;
      }

      setTitle("");
      await loadCaptures();

      if (data?.id) {
        openCapture(data);
      }
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Unable to add capture.");
    } finally {
      setAdding(false);
    }
  };

  const openCapture = (capture: Capture) => {
    router.push({
      pathname: "/generators",
      params: {
        projectId: safeProjectId,
        projectName: safeProjectName,
        captureId: capture.id,
        captureTitle: capture.title,
      },
    });
  };

  const openEditCapture = (capture: Capture) => {
    setEditingCapture(capture);
    setEditCaptureTitle(capture.title);
    setEditModalVisible(true);
  };

  const saveCaptureEdit = async () => {
    if (!editingCapture) return;

    if (!editCaptureTitle.trim()) {
      Alert.alert("Validation", "Capture title cannot be empty.");
      return;
    }

    try {
      setSavingEdit(true);

      const { error } = await supabase
        .from("captures")
        .update({
          title: editCaptureTitle.trim(),
        })
        .eq("id", editingCapture.id);

      if (error) {
        Alert.alert("Error", error.message);
        return;
      }

      setCaptures((prev) =>
        prev.map((item) =>
          item.id === editingCapture.id
            ? { ...item, title: editCaptureTitle.trim() }
            : item,
        ),
      );

      setEditModalVisible(false);
      setEditingCapture(null);
      setEditCaptureTitle("");
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Unable to update capture.");
    } finally {
      setSavingEdit(false);
    }
  };

  const duplicateCapture = async (capture: Capture) => {
    try {
      setDuplicatingCaptureId(capture.id);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      const userId = capture.user_id || user?.id;

      if (!userId) {
        Alert.alert(
          "Auth Error",
          "User session not found. Please sign in again.",
        );
        return;
      }

      const { data, error } = await supabase
        .from("captures")
        .insert([
          {
            title: `${capture.title} Copy`,
            project_id: capture.project_id,
            user_id: userId,
          },
        ])
        .select()
        .single();

      if (error) {
        Alert.alert("Duplicate Error", error.message);
        return;
      }

      setCaptures((prev) => [data, ...prev]);
      Alert.alert("Success", "Capture duplicated successfully.");
    } catch (error: any) {
      Alert.alert(
        "Duplicate Error",
        error?.message || "Unable to duplicate capture.",
      );
    } finally {
      setDuplicatingCaptureId(null);
    }
  };

  const confirmDeleteCapture = (capture: Capture) => {
    Alert.alert(
      "Delete Capture",
      `Delete "${capture.title}" and all related outputs, attachments, and drafts?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Everything",
          style: "destructive",
          onPress: async () => {
            try {
              setDeletingCaptureId(capture.id);
              await deleteCaptureCascade(capture.id);
              setCaptures((prev) =>
                prev.filter((item) => item.id !== capture.id),
              );
            } catch (error: any) {
              Alert.alert(
                "Delete Error",
                error?.message || "Unable to delete capture completely.",
              );
            } finally {
              setDeletingCaptureId(null);
            }
          },
        },
      ],
    );
  };

  const filteredCaptures = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return captures;
    return captures.filter((capture) =>
      capture.title.toLowerCase().includes(q),
    );
  }, [captures, searchText]);

  const renderCapture = ({ item }: { item: Capture }) => {
    const isDeleting = deletingCaptureId === item.id;
    const isDuplicating = duplicatingCaptureId === item.id;

    return (
      <TouchableOpacity
        style={styles.captureCard}
        onPress={() => openCapture(item)}
        activeOpacity={0.85}
      >
        <View style={styles.captureInfo}>
          <Text style={styles.captureTitle}>{item.title}</Text>
          <Text style={styles.captureMeta}>
            {item.created_at ? new Date(item.created_at).toLocaleString() : ""}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.iconAction}
          onPress={() => openEditCapture(item)}
          disabled={isDeleting || isDuplicating}
        >
          <Ionicons name="create-outline" size={18} color="#2563eb" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.iconAction}
          onPress={() => duplicateCapture(item)}
          disabled={isDeleting || isDuplicating}
        >
          {isDuplicating ? (
            <ActivityIndicator size="small" color="#16a34a" />
          ) : (
            <Ionicons name="copy-outline" size={18} color="#16a34a" />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.iconAction}
          onPress={() => confirmDeleteCapture(item)}
          disabled={isDeleting || isDuplicating}
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
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={22} color="#2563eb" />
          <Text style={styles.headerButtonText}>Back</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.moreButton}
          onPress={() => setMenuVisible(true)}
        >
          <Ionicons name="ellipsis-horizontal" size={22} color="#2563eb" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredCaptures}
        keyExtractor={(item) => item.id}
        renderItem={renderCapture}
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
                <Text style={styles.brandTitle}>{safeProjectName}</Text>
                <Text style={styles.brandSubtitle}>
                  Capture screens, requirements, and AI-generated outputs
                </Text>
              </View>
            </View>

            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Captures</Text>
              <Text style={styles.sectionSubtitle}>
                Each capture can include a screenshot, requirement text,
                testcase, and Playwright script.
              </Text>

              <TextInput
                value={searchText}
                onChangeText={setSearchText}
                placeholder="Search captures"
                placeholderTextColor="#9ca3af"
                style={styles.searchInput}
              />

              <View style={styles.row}>
                <TextInput
                  value={title}
                  onChangeText={setTitle}
                  placeholder="New capture title"
                  placeholderTextColor="#9ca3af"
                  style={styles.input}
                />

                <TouchableOpacity
                  style={styles.addButton}
                  onPress={addCapture}
                  disabled={adding}
                >
                  {adding ? (
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
              <Text style={styles.emptyText}>Loading captures...</Text>
            </View>
          ) : (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyText}>
                {searchText.trim()
                  ? "No matching captures found."
                  : "No captures yet."}
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
            <Text style={styles.modalTitle}>Edit Capture Title</Text>

            <TextInput
              value={editCaptureTitle}
              onChangeText={setEditCaptureTitle}
              placeholder="Capture title"
              placeholderTextColor="#9ca3af"
              style={styles.modalInput}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalSecondaryButton}
                onPress={() => {
                  setEditModalVisible(false);
                  setEditingCapture(null);
                  setEditCaptureTitle("");
                }}
              >
                <Text style={styles.modalSecondaryText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalPrimaryButton}
                onPress={saveCaptureEdit}
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

      <AppMenu
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        projectId={safeProjectId}
        projectName={safeProjectName}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#eef2f5",
  },
  header: {
    minHeight: 70,
    paddingHorizontal: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerButtonText: {
    marginLeft: 6,
    fontSize: 18,
    fontWeight: "600",
    color: "#2563eb",
  },
  moreButton: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
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
    backgroundColor: "#2563eb",
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
    color: "#111827",
  },
  brandSubtitle: {
    marginTop: 4,
    fontSize: 14,
    lineHeight: 21,
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
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    lineHeight: 22,
    color: "#6b7280",
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
  captureCard: {
    backgroundColor: "#ffffff",
    borderRadius: 22,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    flexDirection: "row",
    alignItems: "center",
  },
  captureInfo: {
    flex: 1,
  },
  captureTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 6,
  },
  captureMeta: {
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
