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

export default function PrivacyPolicyScreen() {
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

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.title}>Privacy Policy</Text>
          <Text style={styles.updated}>
            Last updated: {new Date().toLocaleDateString()}
          </Text>

          <Section
            title="1. Information We Use"
            body="TestMind AI stores project details, captures, requirement text, generated QA outputs, and account-related data needed to provide the app experience."
          />

          <Section
            title="2. How Data Is Used"
            body="Your data is used to generate QA artifacts such as test cases, edge cases, API scenarios, Playwright scripts, visual QA checks, and dashboard summaries."
          />

          <Section
            title="3. AI Processing"
            body="Requirement text and related inputs may be processed by AI services to generate outputs. Sensitive production data should not be entered unless you are authorized to share it."
          />

          <Section
            title="4. Data Storage"
            body="Project and output data may be stored in cloud services used by the app backend and database. Access should be restricted to the authenticated user and authorized systems."
          />

          <Section
            title="5. Data Sharing"
            body="The app does not intentionally sell user data. Shared exports and generated files are only created when you choose to export or share them."
          />

          <Section
            title="6. Security"
            body="Reasonable efforts should be used to protect stored data, API keys, and access controls. Users should also protect their own devices and credentials."
          />

          <Section
            title="7. Contact"
            body="For privacy-related questions, contact the support email configured for your app release."
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, body }: { title: string; body: string }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionBody}>{body}</Text>
    </View>
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
  updated: {
    marginTop: 6,
    marginBottom: 18,
    fontSize: 13,
    color: "#6b7280",
  },
  section: {
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 8,
  },
  sectionBody: {
    fontSize: 15,
    lineHeight: 24,
    color: "#374151",
  },
});
