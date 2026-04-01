import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import AppHeaderMenu from "../components/AppHeaderMenu";
import { supabase } from "../lib/supabase";

type Props = {
  route: any;
  navigation: any;
};

type OutputRow = {
  id: string;
  project_id?: string | null;
  capture_id?: string | null;
  status?: string | null;
  approved?: boolean | null;
  created_at?: string | null;
  output_type?: string | null;
};

export default function ProjectDashboardScreen({ route, navigation }: Props) {
  const { project } = route.params;
  const [loading, setLoading] = useState(true);
  const [outputs, setOutputs] = useState<OutputRow[]>([]);
  const [capturesCount, setCapturesCount] = useState(0);

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);

      const { count: captureCount, error: capturesError } = await supabase
        .from("captures")
        .select("*", { count: "exact", head: true })
        .eq("project_id", project.id);

      if (capturesError) throw capturesError;

      setCapturesCount(captureCount || 0);

      const { data: outputsData, error: outputsError } = await supabase
        .from("generated_outputs")
        .select(
          "id, project_id, capture_id, status, approved, created_at, output_type",
        )
        .eq("project_id", project.id)
        .order("created_at", { ascending: false });

      if (outputsError) {
        // fallback in case project_id is not stored in generated_outputs
        const { data: captureRows } = await supabase
          .from("captures")
          .select("id")
          .eq("project_id", project.id);

        const captureIds = (captureRows || []).map((c: any) => c.id);

        if (captureIds.length > 0) {
          const { data: fallbackData, error: fallbackError } = await supabase
            .from("generated_outputs")
            .select(
              "id, project_id, capture_id, status, approved, created_at, output_type",
            )
            .in("capture_id", captureIds)
            .order("created_at", { ascending: false });

          if (fallbackError) throw fallbackError;
          setOutputs(fallbackData || []);
        } else {
          setOutputs([]);
        }
      } else {
        setOutputs(outputsData || []);
      }
    } catch (error: any) {
      Alert.alert(
        "Dashboard Error",
        error?.message || "Unable to load dashboard.",
      );
    } finally {
      setLoading(false);
    }
  }, [project.id]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const stats = useMemo(() => {
    const approved = outputs.filter(
      (item) => item.approved === true || item.status === "approved",
    ).length;

    const needsReview = outputs.filter(
      (item) => item.status === "needs_review",
    ).length;

    const pending = outputs.filter(
      (item) =>
        item.status === "pending" ||
        item.status === "processing" ||
        (!item.status && item.approved !== true),
    ).length;

    return {
      approved,
      needsReview,
      pending,
      total: outputs.length,
    };
  }, [outputs]);

  const qualityText =
    stats.total === 0
      ? "Getting Started"
      : stats.approved > 0
        ? "Improving"
        : "In Progress";

  const riskText =
    stats.total === 0
      ? "No Output Yet"
      : stats.needsReview > 0
        ? "Needs Review"
        : "Stable";

  const trendText =
    stats.total === 0 ? "Stable" : stats.total >= 3 ? "Growing" : "Stable";

  return (
    <SafeAreaView style={styles.safe}>
      <AppHeaderMenu
        title="Project Dashboard"
        showBack
        onBack={() => navigation.goBack()}
        onGoProjects={() => navigation.navigate("Projects")}
      />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.projectCard}>
          <Text style={styles.projectName}>
            {project?.name || "Untitled Project"}
          </Text>
          <Text style={styles.projectId}>Project ID: {project?.id}</Text>
          <Text style={styles.projectSub}>
            Analytics, activity summary, generated output trends, and recent
            work.
          </Text>
        </View>

        <View style={styles.primaryRow}>
          <TouchableOpacity
            style={styles.primaryTile}
            onPress={() => navigation.navigate("Captures", { project })}
          >
            <Ionicons name="folder-open-outline" size={28} color="#ffffff" />
            <Text style={styles.primaryTileText}>Captures</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.primaryTile}
            onPress={() => navigation.navigate("CaptureWorkspace", { project })}
          >
            <Ionicons name="sparkles-outline" size={28} color="#ffffff" />
            <Text style={styles.primaryTileText}>Workspace</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator />
            <Text style={styles.loadingText}>Loading dashboard...</Text>
          </View>
        ) : (
          <>
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{stats.approved}</Text>
                <Text style={styles.statLabel}>Approved</Text>
              </View>

              <View style={styles.statCard}>
                <Text style={styles.statValue}>{stats.needsReview}</Text>
                <Text style={styles.statLabel}>Needs Review</Text>
              </View>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{stats.pending}</Text>
                <Text style={styles.statLabel}>Pending</Text>
              </View>

              <View style={styles.statCard}>
                <Text style={styles.statValue}>{capturesCount}</Text>
                <Text style={styles.statLabel}>Captures</Text>
              </View>
            </View>

            <View style={styles.healthCard}>
              <Text style={styles.healthTitle}>Project Health</Text>

              <View style={styles.healthRow}>
                <View style={styles.healthBox}>
                  <Text style={styles.healthBoxLabel}>Quality</Text>
                  <Text style={styles.healthBoxValue}>{qualityText}</Text>
                </View>

                <View style={styles.healthBox}>
                  <Text style={styles.healthBoxLabel}>Risk</Text>
                  <Text style={styles.healthBoxValue}>{riskText}</Text>
                </View>

                <View style={styles.healthBox}>
                  <Text style={styles.healthBoxLabel}>Trend</Text>
                  <Text style={styles.healthBoxValue}>{trendText}</Text>
                </View>
              </View>

              <Text style={styles.footerText}>
                Total outputs: {stats.total} • Pending: {stats.pending} • Recent
                activity: {stats.total}
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#eef2f5" },
  content: { padding: 16, paddingBottom: 40 },
  projectCard: {
    backgroundColor: "#ffffff",
    borderRadius: 22,
    padding: 20,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  projectName: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 8,
  },
  projectId: {
    fontSize: 14,
    fontWeight: "700",
    color: "#2563eb",
    marginBottom: 18,
  },
  projectSub: {
    fontSize: 15,
    lineHeight: 24,
    color: "#6b7280",
  },
  primaryRow: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 18,
  },
  primaryTile: {
    flex: 1,
    backgroundColor: "#2454c3",
    borderRadius: 24,
    minHeight: 140,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryTileText: {
    marginTop: 12,
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
  },
  loadingWrap: {
    paddingVertical: 30,
    alignItems: "center",
  },
  loadingText: {
    marginTop: 8,
    color: "#6b7280",
  },
  statsRow: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderRadius: 22,
    paddingVertical: 26,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  statValue: {
    fontSize: 34,
    fontWeight: "800",
    color: "#111827",
  },
  statLabel: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: "700",
    color: "#6b7280",
  },
  healthCard: {
    backgroundColor: "#ffffff",
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  healthTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 16,
  },
  healthRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  healthBox: {
    flex: 1,
    minHeight: 112,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#d1d5db",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  healthBoxLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#6b7280",
    marginBottom: 8,
  },
  healthBoxValue: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
    textAlign: "center",
  },
  footerText: {
    fontSize: 15,
    color: "#6b7280",
  },
});
