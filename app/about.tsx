import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import {
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

export default function AboutScreen() {
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
      </View>

      <View style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.title}>About TestMind AI</Text>
          <Text style={styles.subtitle}>
            AI-powered QA workspace for requirement analysis, test case
            generation, edge coverage, API scenarios, Playwright scripting, and
            visual QA support.
          </Text>

          <MenuItem
            label="Privacy Policy"
            onPress={() => router.push("/privacy-policy")}
          />

          <MenuItem
            label="Support & Contact"
            onPress={() => router.push("/support")}
          />

          <View style={styles.metaBox}>
            <Text style={styles.metaLabel}>Version</Text>
            <Text style={styles.metaValue}>1.0.0</Text>

            <Text style={styles.metaLabel}>Release</Text>
            <Text style={styles.metaValue}>Production Candidate</Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

function MenuItem({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <Text style={styles.menuText}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
    </TouchableOpacity>
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
    justifyContent: "center",
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
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#111827",
  },
  subtitle: {
    marginTop: 8,
    marginBottom: 18,
    fontSize: 15,
    lineHeight: 24,
    color: "#6b7280",
  },
  menuItem: {
    minHeight: 54,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  menuText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  metaBox: {
    marginTop: 18,
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  metaLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6b7280",
    marginTop: 6,
  },
  metaValue: {
    fontSize: 15,
    color: "#111827",
    marginTop: 2,
  },
});
