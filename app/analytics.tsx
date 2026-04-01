import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import AppHeader from "../src/components/AppHeader";
import { supabase } from "../src/lib/supabase";

type GeneratedOutputRow = {
  id: string;
  project_id: string | null;
  capture_id: string | null;
  requirement_run_id: string | null;
  output_type: string | null;
  result_text: string | null;
  status?: string | null;
  review_status?: string | null;
  created_at?: string | null;
};

type OutputStatus = "pending" | "approved" | "needs_review";

function asString(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] || "";
  return value || "";
}

function getStatusValue(item: GeneratedOutputRow): OutputStatus {
  return (item.review_status || item.status || "pending") as OutputStatus;
}

function toTitleCase(value?: string | null) {
  if (!value) return "Generated Output";
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getRunTitleFromResult(resultText?: string | null) {
  if (!resultText) return "Untitled Folder";
  const match = resultText.match(/^Run Title:\s*(.+)$/im);
  return match?.[1]?.trim() || "Untitled Folder";
}

function formatDateTime(value?: string | null) {
  if (!value) return "Unknown";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function percent(part: number, total: number) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

function countByDay(items: GeneratedOutputRow[], days: number) {
  const now = Date.now();
  const cutoff = now - days * 24 * 60 * 60 * 1000;
  return items.filter((item) => {
    if (!item.created_at) return false;
    const time = new Date(item.created_at).getTime();
    return !Number.isNaN(time) && time >= cutoff;
  }).length;
}

function getCategoryForOutputType(outputType?: string | null) {
  const value = (outputType || "").toLowerCase();

  if (["test_cases", "edge_cases", "api_tests", "playwright"].includes(value)) {
    return "AI Test Creation";
  }

  if (["session_notes", "risks", "automation_ideas"].includes(value)) {
    return "Exploratory Studio";
  }

  return "Other";
}

export default function AnalyticsPage() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const projectId = asString(params.projectId);
  const projectName = asString(params.projectName) || "Project";
  const captureTitle = asString(params.captureTitle) || "All Captures";

  const [outputs, setOutputs] = useState<GeneratedOutputRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOutputs = useCallback(async () => {
    if (!projectId) {
      setOutputs([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const { data, error } = await supabase
      .from("generated_outputs")
      .select(
        "id, project_id, capture_id, requirement_run_id, output_type, result_text, status, review_status, created_at",
      )
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    if (error) {
      setOutputs([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    setOutputs((data as GeneratedOutputRow[]) || []);
    setLoading(false);
    setRefreshing(false);
  }, [projectId]);

  useEffect(() => {
    fetchOutputs();
  }, [fetchOutputs]);

  const totalOutputs = outputs.length;

  const approvedCount = useMemo(
    () => outputs.filter((item) => getStatusValue(item) === "approved").length,
    [outputs],
  );

  const needsReviewCount = useMemo(
    () =>
      outputs.filter((item) => getStatusValue(item) === "needs_review").length,
    [outputs],
  );

  const pendingCount = useMemo(
    () => outputs.filter((item) => getStatusValue(item) === "pending").length,
    [outputs],
  );

  const foldersCount = useMemo(() => {
    const unique = new Set<string>();
    for (const item of outputs) {
      unique.add(item.requirement_run_id || item.id);
    }
    return unique.size;
  }, [outputs]);

  const testCreationOutputs = useMemo(
    () =>
      outputs.filter(
        (item) =>
          getCategoryForOutputType(item.output_type) === "AI Test Creation",
      ).length,
    [outputs],
  );

  const exploratoryOutputs = useMemo(
    () =>
      outputs.filter(
        (item) =>
          getCategoryForOutputType(item.output_type) === "Exploratory Studio",
      ).length,
    [outputs],
  );

  const recent24h = useMemo(() => countByDay(outputs, 1), [outputs]);
  const recent7d = useMemo(() => countByDay(outputs, 7), [outputs]);
  const recent30d = useMemo(() => countByDay(outputs, 30), [outputs]);

  const outputTypeBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};

    for (const item of outputs) {
      const key = item.output_type || "unknown";
      counts[key] = (counts[key] || 0) + 1;
    }

    return Object.entries(counts)
      .map(([outputType, count]) => ({
        outputType,
        count,
      }))
      .sort((a, b) => b.count - a.count);
  }, [outputs]);

  const folderBreakdown = useMemo(() => {
    const grouped: Record<
      string,
      {
        title: string;
        total: number;
        approved: number;
        needsReview: number;
        pending: number;
        latestAt: string | null;
      }
    > = {};

    for (const item of outputs) {
      const key = item.requirement_run_id || item.id;
      if (!grouped[key]) {
        grouped[key] = {
          title: getRunTitleFromResult(item.result_text),
          total: 0,
          approved: 0,
          needsReview: 0,
          pending: 0,
          latestAt: item.created_at || null,
        };
      }

      grouped[key].total += 1;

      const status = getStatusValue(item);
      if (status === "approved") grouped[key].approved += 1;
      if (status === "needs_review") grouped[key].needsReview += 1;
      if (status === "pending") grouped[key].pending += 1;

      if (item.created_at) {
        const existing = grouped[key].latestAt
          ? new Date(grouped[key].latestAt!).getTime()
          : 0;
        const next = new Date(item.created_at).getTime();
        if (next > existing) {
          grouped[key].latestAt = item.created_at;
        }
      }
    }

    return Object.values(grouped)
      .sort((a, b) => {
        const aTime = a.latestAt ? new Date(a.latestAt).getTime() : 0;
        const bTime = b.latestAt ? new Date(b.latestAt).getTime() : 0;
        return bTime - aTime;
      })
      .slice(0, 8);
  }, [outputs]);

  const recentActivity = useMemo(() => outputs.slice(0, 12), [outputs]);

  const healthTone =
    totalOutputs === 0
      ? "No activity yet"
      : approvedCount >= needsReviewCount + pendingCount
        ? "Healthy"
        : approvedCount >= needsReviewCount
          ? "In Progress"
          : "Needs Attention";

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchOutputs();
  };

  return (
    <SafeAreaView style={styles.safe}>
      <AppHeader
        title="Analytics"
        current="analytics"
        fallbackRoute="/project-dashboard"
      />
      {/* <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Analytics</Text>

        <TouchableOpacity style={styles.headerBtn} onPress={onRefresh}>
          <Ionicons name="refresh-outline" size={22} color="#111827" />
        </TouchableOpacity>
      </View> */}

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.heroCard}>
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeText}>ANALYTICS</Text>
          </View>

          <Text style={styles.heroTitle}>
            Track quality output, review health, and recent activity
          </Text>
          <Text style={styles.heroSubtitle}>
            Monitor generated outputs across AI Test Creation and Exploratory
            Studio for {projectName}.
          </Text>

          <View style={styles.heroMetaRow}>
            <View style={styles.heroMetaPill}>
              <Ionicons name="folder-outline" size={16} color="#0f172a" />
              <Text style={styles.heroMetaText}>{projectName}</Text>
            </View>

            <View style={styles.heroMetaPill}>
              <Ionicons name="albums-outline" size={16} color="#0f172a" />
              <Text style={styles.heroMetaText}>{captureTitle}</Text>
            </View>

            <View style={styles.heroMetaPill}>
              <Ionicons name="pulse-outline" size={16} color="#0f172a" />
              <Text style={styles.heroMetaText}>{healthTone}</Text>
            </View>
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color="#2563eb" />
            <Text style={styles.loadingText}>Loading analytics...</Text>
          </View>
        ) : (
          <>
            <Text style={styles.sectionHeading}>Overview</Text>

            <View style={styles.metricsGrid}>
              <View style={styles.metricCard}>
                <Text style={styles.metricValue}>{totalOutputs}</Text>
                <Text style={styles.metricLabel}>Total Outputs</Text>
              </View>

              <View style={styles.metricCard}>
                <Text style={styles.metricValue}>{foldersCount}</Text>
                <Text style={styles.metricLabel}>Folders</Text>
              </View>

              <View style={styles.metricCard}>
                <Text style={styles.metricValue}>{approvedCount}</Text>
                <Text style={styles.metricLabel}>Approved</Text>
              </View>

              <View style={styles.metricCard}>
                <Text style={styles.metricValue}>{needsReviewCount}</Text>
                <Text style={styles.metricLabel}>Needs Review</Text>
              </View>

              <View style={styles.metricCard}>
                <Text style={styles.metricValue}>{pendingCount}</Text>
                <Text style={styles.metricLabel}>Pending</Text>
              </View>

              <View style={styles.metricCard}>
                <Text style={styles.metricValue}>
                  {percent(approvedCount, totalOutputs)}%
                </Text>
                <Text style={styles.metricLabel}>Approval Rate</Text>
              </View>
            </View>

            <Text style={styles.sectionHeading}>Workspace Mix</Text>

            <View style={styles.dualRow}>
              <View style={styles.statCard}>
                <View
                  style={[styles.statIconWrap, { backgroundColor: "#dbeafe" }]}
                >
                  <Ionicons
                    name="checkmark-done-outline"
                    size={20}
                    color="#1d4ed8"
                  />
                </View>
                <Text style={styles.statCardTitle}>AI Test Creation</Text>
                <Text style={styles.statCardValue}>{testCreationOutputs}</Text>
                <Text style={styles.statCardBody}>
                  Test cases, edge cases, API tests, and Playwright-oriented
                  outputs.
                </Text>
              </View>

              <View style={styles.statCard}>
                <View
                  style={[styles.statIconWrap, { backgroundColor: "#ede9fe" }]}
                >
                  <Ionicons name="search-outline" size={20} color="#6d28d9" />
                </View>
                <Text style={styles.statCardTitle}>Exploratory Studio</Text>
                <Text style={styles.statCardValue}>{exploratoryOutputs}</Text>
                <Text style={styles.statCardBody}>
                  Session reviews, risks, follow-ups, and exploratory test
                  outputs.
                </Text>
              </View>
            </View>

            <Text style={styles.sectionHeading}>Review Health</Text>

            <View style={styles.healthCard}>
              <View style={styles.healthRow}>
                <Text style={styles.healthLabel}>Approved</Text>
                <Text style={styles.healthValue}>{approvedCount}</Text>
              </View>
              <View style={styles.healthBarTrack}>
                <View
                  style={[
                    styles.healthBarApproved,
                    { width: `${percent(approvedCount, totalOutputs)}%` },
                  ]}
                />
              </View>

              <View style={styles.healthRow}>
                <Text style={styles.healthLabel}>Needs Review</Text>
                <Text style={styles.healthValue}>{needsReviewCount}</Text>
              </View>
              <View style={styles.healthBarTrack}>
                <View
                  style={[
                    styles.healthBarNeedsReview,
                    { width: `${percent(needsReviewCount, totalOutputs)}%` },
                  ]}
                />
              </View>

              <View style={styles.healthRow}>
                <Text style={styles.healthLabel}>Pending</Text>
                <Text style={styles.healthValue}>{pendingCount}</Text>
              </View>
              <View style={styles.healthBarTrack}>
                <View
                  style={[
                    styles.healthBarPending,
                    { width: `${percent(pendingCount, totalOutputs)}%` },
                  ]}
                />
              </View>
            </View>

            <Text style={styles.sectionHeading}>Recent Activity Windows</Text>

            <View style={styles.metricsGrid}>
              <View style={styles.metricCard}>
                <Text style={styles.metricValue}>{recent24h}</Text>
                <Text style={styles.metricLabel}>Last 24h</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricValue}>{recent7d}</Text>
                <Text style={styles.metricLabel}>Last 7 days</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricValue}>{recent30d}</Text>
                <Text style={styles.metricLabel}>Last 30 days</Text>
              </View>
            </View>

            <Text style={styles.sectionHeading}>Output Type Breakdown</Text>

            {outputTypeBreakdown.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="bar-chart-outline" size={24} color="#94a3b8" />
                <Text style={styles.emptyTitle}>No analytics yet</Text>
                <Text style={styles.emptyBody}>
                  Generate outputs in Test Creation or Exploratory Studio to
                  populate this section.
                </Text>
              </View>
            ) : (
              outputTypeBreakdown.map((item, index) => (
                <View
                  key={`${item.outputType}-${index}`}
                  style={styles.breakdownCard}
                >
                  <View style={styles.breakdownTop}>
                    <Text style={styles.breakdownTitle}>
                      {toTitleCase(item.outputType)}
                    </Text>
                    <Text style={styles.breakdownValue}>{item.count}</Text>
                  </View>
                  <View style={styles.breakdownBarTrack}>
                    <View
                      style={[
                        styles.breakdownBarFill,
                        { width: `${percent(item.count, totalOutputs)}%` },
                      ]}
                    />
                  </View>
                  <Text style={styles.breakdownMeta}>
                    {percent(item.count, totalOutputs)}% of total outputs
                  </Text>
                </View>
              ))
            )}

            <Text style={styles.sectionHeading}>Top Recent Folders</Text>

            {folderBreakdown.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons
                  name="folder-open-outline"
                  size={24}
                  color="#94a3b8"
                />
                <Text style={styles.emptyTitle}>No folders yet</Text>
                <Text style={styles.emptyBody}>
                  Folders appear here once outputs are generated and grouped.
                </Text>
              </View>
            ) : (
              folderBreakdown.map((folder, index) => (
                <View
                  key={`${folder.title}-${index}`}
                  style={styles.folderCard}
                >
                  <Text style={styles.folderTitle}>{folder.title}</Text>
                  <Text style={styles.folderMeta}>
                    {folder.total} outputs • Last activity:{" "}
                    {formatDateTime(folder.latestAt)}
                  </Text>

                  <View style={styles.folderStatsRow}>
                    <View style={styles.folderStatPillApproved}>
                      <Text style={styles.folderStatTextApproved}>
                        Approved {folder.approved}
                      </Text>
                    </View>
                    <View style={styles.folderStatPillReview}>
                      <Text style={styles.folderStatTextReview}>
                        Needs Review {folder.needsReview}
                      </Text>
                    </View>
                    <View style={styles.folderStatPillPending}>
                      <Text style={styles.folderStatTextPending}>
                        Pending {folder.pending}
                      </Text>
                    </View>
                  </View>
                </View>
              ))
            )}

            <Text style={styles.sectionHeading}>Recent Output Activity</Text>

            {recentActivity.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="time-outline" size={24} color="#94a3b8" />
                <Text style={styles.emptyTitle}>No recent activity</Text>
                <Text style={styles.emptyBody}>
                  Recent outputs will appear here after generation.
                </Text>
              </View>
            ) : (
              recentActivity.map((item) => {
                const status = getStatusValue(item);

                return (
                  <View key={item.id} style={styles.activityCard}>
                    <View style={styles.activityTop}>
                      <View style={styles.activityTextWrap}>
                        <Text style={styles.activityTitle}>
                          {toTitleCase(item.output_type)}
                        </Text>
                        <Text style={styles.activitySubtitle}>
                          {getRunTitleFromResult(item.result_text)}
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.activityStatusPill,
                          status === "approved"
                            ? styles.activityStatusApproved
                            : status === "needs_review"
                              ? styles.activityStatusNeedsReview
                              : styles.activityStatusPending,
                        ]}
                      >
                        <Text
                          style={[
                            styles.activityStatusText,
                            status === "approved"
                              ? styles.activityStatusTextApproved
                              : status === "needs_review"
                                ? styles.activityStatusTextNeedsReview
                                : styles.activityStatusTextPending,
                          ]}
                        >
                          {status === "approved"
                            ? "Approved"
                            : status === "needs_review"
                              ? "Needs Review"
                              : "Pending"}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.activityMeta}>
                      {formatDateTime(item.created_at)}
                    </Text>

                    <View style={styles.activityCategoryRow}>
                      <View style={styles.activityCategoryPill}>
                        <Text style={styles.activityCategoryText}>
                          {getCategoryForOutputType(item.output_type)}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#f4f7fb",
  },

  header: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerBtn: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0f172a",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  headerTitle: {
    fontSize: 21,
    fontWeight: "800",
    color: "#0f172a",
  },

  content: {
    padding: 16,
    paddingBottom: 40,
  },

  heroCard: {
    backgroundColor: "#0f3b7a",
    borderRadius: 28,
    padding: 22,
    marginBottom: 18,
  },
  heroBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#facc15",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 16,
  },
  heroBadgeText: {
    color: "#0f172a",
    fontWeight: "800",
    fontSize: 12,
  },
  heroTitle: {
    color: "#ffffff",
    fontSize: 28,
    lineHeight: 38,
    fontWeight: "800",
    marginBottom: 10,
  },
  heroSubtitle: {
    color: "#dbe7ff",
    fontSize: 16,
    lineHeight: 26,
    marginBottom: 18,
  },
  heroMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  heroMetaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#ffffff",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  heroMetaText: {
    color: "#0f172a",
    fontWeight: "700",
    fontSize: 13,
  },

  sectionHeading: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 12,
    marginTop: 4,
  },

  loadingCard: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: "#e6edf5",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 10,
    color: "#64748b",
    fontSize: 15,
    fontWeight: "600",
  },

  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 20,
  },
  metricCard: {
    width: "31%",
    minWidth: 100,
    flexGrow: 1,
    backgroundColor: "#ffffff",
    borderRadius: 22,
    paddingVertical: 18,
    paddingHorizontal: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e6edf5",
  },
  metricValue: {
    fontSize: 30,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 8,
  },
  metricLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#64748b",
    textAlign: "center",
  },

  dualRow: {
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#e6edf5",
    padding: 18,
  },
  statIconWrap: {
    width: 50,
    height: 50,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  statCardTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 8,
  },
  statCardValue: {
    fontSize: 28,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 8,
  },
  statCardBody: {
    fontSize: 14,
    lineHeight: 22,
    color: "#64748b",
  },

  healthCard: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#e6edf5",
    padding: 18,
    marginBottom: 20,
  },
  healthRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
    marginTop: 4,
  },
  healthLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#334155",
  },
  healthValue: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0f172a",
  },
  healthBarTrack: {
    height: 12,
    backgroundColor: "#eef2f7",
    borderRadius: 999,
    overflow: "hidden",
    marginBottom: 12,
  },
  healthBarApproved: {
    height: "100%",
    backgroundColor: "#60a5fa",
    borderRadius: 999,
  },
  healthBarNeedsReview: {
    height: "100%",
    backgroundColor: "#f87171",
    borderRadius: 999,
  },
  healthBarPending: {
    height: "100%",
    backgroundColor: "#fbbf24",
    borderRadius: 999,
  },

  breakdownCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#e6edf5",
    padding: 16,
    marginBottom: 12,
  },
  breakdownTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
    gap: 12,
  },
  breakdownTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "800",
    color: "#0f172a",
  },
  breakdownValue: {
    fontSize: 16,
    fontWeight: "800",
    color: "#2563eb",
  },
  breakdownBarTrack: {
    height: 10,
    backgroundColor: "#eef2f7",
    borderRadius: 999,
    overflow: "hidden",
    marginBottom: 8,
  },
  breakdownBarFill: {
    height: "100%",
    backgroundColor: "#3b82f6",
    borderRadius: 999,
  },
  breakdownMeta: {
    fontSize: 13,
    color: "#64748b",
  },

  folderCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#e6edf5",
    padding: 16,
    marginBottom: 12,
  },
  folderTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 6,
  },
  folderMeta: {
    fontSize: 13,
    color: "#64748b",
    marginBottom: 12,
  },
  folderStatsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  folderStatPillApproved: {
    backgroundColor: "#dbeafe",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  folderStatTextApproved: {
    color: "#2563eb",
    fontWeight: "800",
    fontSize: 12,
  },
  folderStatPillReview: {
    backgroundColor: "#fee2e2",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  folderStatTextReview: {
    color: "#dc2626",
    fontWeight: "800",
    fontSize: 12,
  },
  folderStatPillPending: {
    backgroundColor: "#fef3c7",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  folderStatTextPending: {
    color: "#d97706",
    fontWeight: "800",
    fontSize: 12,
  },

  activityCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#e6edf5",
    padding: 16,
    marginBottom: 12,
  },
  activityTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 10,
  },
  activityTextWrap: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 4,
  },
  activitySubtitle: {
    fontSize: 13,
    color: "#64748b",
  },
  activityStatusPill: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  activityStatusApproved: {
    backgroundColor: "#dbeafe",
  },
  activityStatusNeedsReview: {
    backgroundColor: "#fee2e2",
  },
  activityStatusPending: {
    backgroundColor: "#fef3c7",
  },
  activityStatusText: {
    fontSize: 12,
    fontWeight: "800",
  },
  activityStatusTextApproved: {
    color: "#2563eb",
  },
  activityStatusTextNeedsReview: {
    color: "#dc2626",
  },
  activityStatusTextPending: {
    color: "#d97706",
  },
  activityMeta: {
    fontSize: 13,
    color: "#64748b",
    marginBottom: 10,
  },
  activityCategoryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  activityCategoryPill: {
    backgroundColor: "#eef2f7",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  activityCategoryText: {
    color: "#475569",
    fontSize: 12,
    fontWeight: "800",
  },

  emptyCard: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: "#e6edf5",
    alignItems: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0f172a",
    marginTop: 10,
  },
  emptyBody: {
    textAlign: "center",
    marginTop: 6,
    color: "#64748b",
    lineHeight: 22,
  },
});
