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
import AppHeaderMenu from "../components/AppHeaderMenu";
import { supabase } from "../lib/supabase";

type Props = {
  route: any;
  navigation: any;
};

type Capture = {
  id: string;
  title: string;
  created_at?: string;
  project_id: string;
};

export default function CapturesScreen({ route, navigation }: Props) {
  const { project } = route.params;
  const [captures, setCaptures] = useState<Capture[]>([]);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadCaptures = useCallback(async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("captures")
      .select("*")
      .eq("project_id", project.id)
      .order("created_at", { ascending: false });

    if (error) {
      Alert.alert("Error", error.message);
    } else {
      setCaptures(data || []);
    }

    setLoading(false);
  }, [project.id]);

  useEffect(() => {
    loadCaptures();
  }, [loadCaptures]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadCaptures();
    setRefreshing(false);
  }, [loadCaptures]);

  const addCapture = async () => {
    if (!title.trim()) {
      Alert.alert("Validation", "Capture title is required.");
      return;
    }

    setAdding(true);

    const { data, error } = await supabase
      .from("captures")
      .insert([
        {
          title: title.trim(),
          project_id: project.id,
        },
      ])
      .select()
      .single();

    setAdding(false);

    if (error) {
      Alert.alert("Error", error.message);
      return;
    }

    setTitle("");
    await loadCaptures();

    if (data?.id) {
      navigation.navigate("CaptureWorkspace", {
        project,
        capture: data,
      });
    }
  };

  const deleteCapture = async (capture: Capture) => {
    Alert.alert(
      "Delete Capture",
      `Are you sure you want to delete "${capture.title}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const { error } = await supabase
              .from("captures")
              .delete()
              .eq("id", capture.id);

            if (error) {
              Alert.alert("Error", error.message);
              return;
            }

            setCaptures((prev) =>
              prev.filter((item) => item.id !== capture.id),
            );
          },
        },
      ],
    );
  };

  const renderCapture = ({ item }: { item: Capture }) => {
    return (
      <TouchableOpacity
        style={styles.captureCard}
        activeOpacity={0.85}
        onPress={() =>
          navigation.navigate("CaptureWorkspace", {
            project,
            capture: item,
          })
        }
      >
        <View style={styles.captureInfo}>
          <Text style={styles.captureTitle}>{item.title}</Text>
          <Text style={styles.captureMeta}>
            {item.created_at ? new Date(item.created_at).toLocaleString() : ""}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => deleteCapture(item)}
        >
          <Ionicons name="trash-outline" size={18} color="#dc2626" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <AppHeaderMenu
        title="Captures"
        showBack
        onBack={() => navigation.goBack()}
        onGoProjects={() => navigation.navigate("Projects")}
      />

      <FlatList
        data={captures}
        keyExtractor={(item) => item.id}
        renderItem={renderCapture}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <>
            <View style={styles.projectCard}>
              <View style={styles.logoCircle}>
                <Text style={styles.logoText}>TM</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.projectName}>{project.name}</Text>
                <Text style={styles.projectSub}>
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

              <View style={styles.inlineRow}>
                <TextInput
                  value={title}
                  onChangeText={setTitle}
                  placeholder="New capture title"
                  placeholderTextColor="#9ca3af"
                  style={styles.input}
                />
                <TouchableOpacity
                  style={styles.addBtn}
                  onPress={addCapture}
                  disabled={adding}
                >
                  {adding ? (
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
              <Text style={styles.emptyText}>Loading captures...</Text>
            </View>
          ) : (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyText}>No captures yet</Text>
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
  projectCard: {
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
  projectName: {
    fontSize: 19,
    fontWeight: "800",
    color: "#111827",
  },
  projectSub: {
    marginTop: 4,
    fontSize: 14,
    lineHeight: 20,
    color: "#6b7280",
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
  captureCard: {
    backgroundColor: "#ffffff",
    borderRadius: 22,
    padding: 18,
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
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
