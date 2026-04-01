import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import AppHeader from "../src/components/AppHeader";

function asString(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] || "";
  return value || "";
}

export default function ProjectDashboardPage() {
  const params = useLocalSearchParams();

  const projectId = asString(params.projectId);
  const projectName = asString(params.projectName) || "Project Workspace";
  const captureId = asString(params.captureId);
  const captureTitle = asString(params.captureTitle);

  const openGenerators = () => {
    router.push({
      pathname: "/generators",
      params: {
        projectId,
        projectName,
        captureId,
        captureTitle,
      },
    });
  };

  const openExploratory = () => {
    router.push({
      pathname: "/exploratory",
      params: {
        projectId,
        projectName,
        captureId,
        captureTitle,
      },
    });
  };

  const openAnalytics = () => {
    router.push({
      pathname: "/analytics",
      params: {
        projectId,
        projectName,
        captureId,
        captureTitle,
      },
    });
  };

  const openCaptures = () => {
    router.push({
      pathname: "/captures",
      params: {
        projectId,
        projectName,
      },
    });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <AppHeader
        title="Project Workspace"
        current="workspace"
        fallbackRoute="/projects"
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
          <Text style={styles.heroBadge}>WORKSPACE</Text>

          <Text style={styles.heroTitle}>
            Move from inputs to insights faster
          </Text>

          <Text style={styles.heroSubtitle}>
            Open the right workspace for structured QA generation, exploratory
            analysis, and project-wide reporting.
          </Text>

          <View style={styles.heroPills}>
            <View style={styles.heroPill}>
              <Ionicons name="folder-outline" size={18} color="#111827" />
              <Text style={styles.heroPillText}>Project</Text>
            </View>

            <View style={styles.heroPill}>
              <Ionicons name="albums-outline" size={18} color="#111827" />
              <Text style={styles.heroPillText}>Capture</Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionHeading}>Core Workspaces</Text>

        <TouchableOpacity style={styles.workspaceCard} onPress={openGenerators}>
          <View style={[styles.iconBox, styles.iconBlue]}>
            <Ionicons name="checkmark-done-outline" size={28} color="#2563eb" />
          </View>

          <View style={styles.workspaceBody}>
            <Text style={styles.workspaceChip}>SMART QA</Text>
            <Text style={styles.workspaceTitle}>AI Test Creation</Text>
            <Text style={styles.workspaceText}>
              Generate structured test cases, edge cases, API tests, and
              automation-ready outputs from text, files, and screenshots.
            </Text>
          </View>

          <View style={styles.chevronWrap}>
            <Ionicons name="arrow-forward" size={24} color="#0f172a" />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.workspaceCard}
          onPress={openExploratory}
        >
          <View style={[styles.iconBox, styles.iconPurple]}>
            <Ionicons name="search-outline" size={28} color="#7c3aed" />
          </View>

          <View style={styles.workspaceBody}>
            <Text style={styles.workspaceChip}>EXPLORATORY</Text>
            <Text style={styles.workspaceTitle}>Exploratory Studio</Text>
            <Text style={styles.workspaceText}>
              Turn exploratory notes, screenshots, and evidence into session
              reviews, risks, follow-ups, and exploratory test ideas.
            </Text>
          </View>

          <View style={styles.chevronWrap}>
            <Ionicons name="arrow-forward" size={24} color="#0f172a" />
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.workspaceCard} onPress={openAnalytics}>
          <View style={[styles.iconBox, styles.iconGreen]}>
            <Ionicons name="bar-chart-outline" size={28} color="#059669" />
          </View>

          <View style={styles.workspaceBody}>
            <Text style={styles.workspaceChip}>ANALYTICS</Text>
            <Text style={styles.workspaceTitle}>Analytics</Text>
            <Text style={styles.workspaceText}>
              Review approvals, pending outputs, coverage trends, and overall QA
              workspace health for this project.
            </Text>
          </View>

          <View style={styles.chevronWrap}>
            <Ionicons name="arrow-forward" size={24} color="#0f172a" />
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.captureCard} onPress={openCaptures}>
          <View style={styles.captureCardLeft}>
            <Text style={styles.captureTitle}>Open Captures</Text>
            <Text style={styles.captureText}>
              Review requirements, attachments, drafts, and generated output for
              this project.
            </Text>
          </View>

          <View style={styles.captureAction}>
            <Ionicons name="albums-outline" size={24} color="#2563eb" />
          </View>
        </TouchableOpacity>

        <View style={styles.projectMetaCard}>
          <Text style={styles.projectMetaTitle}>Current Project</Text>
          <Text style={styles.projectMetaName}>{projectName}</Text>
          {projectId ? (
            <Text style={styles.projectMetaId}>Project ID: {projectId}</Text>
          ) : null}
        </View>
      </ScrollView>
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
  heroCard: {
    backgroundColor: "#173b89",
    borderRadius: 28,
    padding: 24,
    marginBottom: 22,
  },
  heroBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#facc15",
    color: "#111827",
    fontSize: 14,
    fontWeight: "900",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    overflow: "hidden",
    marginBottom: 22,
  },
  heroTitle: {
    fontSize: 28,
    lineHeight: 40,
    fontWeight: "900",
    color: "#ffffff",
    marginBottom: 16,
  },
  heroSubtitle: {
    fontSize: 16,
    lineHeight: 30,
    color: "#dbeafe",
    marginBottom: 22,
  },
  heroPills: {
    flexDirection: "row",
    gap: 14,
  },
  heroPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  heroPillText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
  },
  sectionHeading: {
    fontSize: 22,
    fontWeight: "900",
    color: "#0f172a",
    marginBottom: 14,
  },
  workspaceCard: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  iconBox: {
    width: 92,
    height: 92,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  iconBlue: {
    backgroundColor: "#eaf1fb",
  },
  iconPurple: {
    backgroundColor: "#efe9fb",
  },
  iconGreen: {
    backgroundColor: "#e7f8f1",
  },
  workspaceBody: {
    flex: 1,
  },
  workspaceChip: {
    alignSelf: "flex-start",
    backgroundColor: "#f4f6fb",
    color: "#64748b",
    fontSize: 12,
    fontWeight: "900",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    overflow: "hidden",
    marginBottom: 12,
  },
  workspaceTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#0f172a",
    marginBottom: 8,
  },
  workspaceText: {
    fontSize: 15,
    lineHeight: 28,
    color: "#64748b",
  },
  chevronWrap: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: "#f8fafc",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 14,
  },
  captureCard: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  captureCardLeft: {
    flex: 1,
  },
  captureTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#0f172a",
    marginBottom: 8,
  },
  captureText: {
    fontSize: 15,
    lineHeight: 26,
    color: "#64748b",
  },
  captureAction: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: "#eff6ff",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 14,
  },
  projectMetaCard: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  projectMetaTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#64748b",
    marginBottom: 8,
  },
  projectMetaName: {
    fontSize: 22,
    fontWeight: "900",
    color: "#0f172a",
    marginBottom: 6,
  },
  projectMetaId: {
    fontSize: 13,
    color: "#94a3b8",
  },
});
