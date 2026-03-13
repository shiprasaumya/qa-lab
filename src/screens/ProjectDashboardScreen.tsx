import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function ProjectDashboardScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={22} color="#111827" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Project Dashboard</Text>

        <TouchableOpacity style={styles.iconButton}>
          <Ionicons name="ellipsis-vertical" size={20} color="#111827" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>Project Dashboard</Text>
          <Text style={styles.heroSubtitle}>
            Open captures, generators, and continue your QA workflow from one
            place.
          </Text>
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.primaryCardButton}
            onPress={() => router.push("/captures")}
          >
            <Ionicons name="albums-outline" size={22} color="#ffffff" />
            <Text style={styles.primaryCardButtonText}>Captures</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.primaryCardButton}
            onPress={() => router.push("/generators")}
          >
            <Ionicons name="sparkles-outline" size={22} color="#ffffff" />
            <Text style={styles.primaryCardButtonText}>Generators</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Quick Access</Text>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.push("/captures")}
          >
            <Ionicons name="folder-open-outline" size={18} color="#2563eb" />
            <Text style={styles.secondaryButtonText}>
              Open Captures Workspace
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.push("/generators")}
          >
            <Ionicons name="document-text-outline" size={18} color="#2563eb" />
            <Text style={styles.secondaryButtonText}>Open Generators</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>About This Project</Text>
          <Text style={styles.sectionBody}>
            Use captures to manage requirements and files. Use generators to
            create test cases, edge cases, API scenarios, screenshot
            validations, and Playwright scripts.
          </Text>
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
  header: {
    minHeight: 68,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
    marginHorizontal: 12,
  },
  content: {
    padding: 18,
    paddingBottom: 40,
  },
  heroCard: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginBottom: 18,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#111827",
  },
  heroSubtitle: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 23,
    color: "#6b7280",
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  primaryCardButton: {
    width: "48%",
    height: 96,
    borderRadius: 22,
    backgroundColor: "#2563eb",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryCardButtonText: {
    marginTop: 8,
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "700",
  },
  sectionCard: {
    backgroundColor: "#ffffff",
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 14,
  },
  secondaryButton: {
    height: 54,
    borderRadius: 16,
    backgroundColor: "#eff6ff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  secondaryButtonText: {
    marginLeft: 8,
    color: "#2563eb",
    fontSize: 16,
    fontWeight: "700",
  },
  sectionBody: {
    fontSize: 15,
    lineHeight: 24,
    color: "#6b7280",
  },
});
