import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  Alert,
  Linking,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import AppHeader from "../src/components/AppHeader";

const SUPPORT_EMAIL = "support@testmindai.app";

export default function SupportScreen() {
  const openMail = async () => {
    const url = `mailto:${SUPPORT_EMAIL}?subject=TestMind AI Support`;
    const canOpen = await Linking.canOpenURL(url);

    if (!canOpen) {
      Alert.alert("Unable to open mail app", SUPPORT_EMAIL);
      return;
    }

    await Linking.openURL(url);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <AppHeader title="Support" current="support" fallbackRoute="/projects" />

      {/* <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={22} color="#2563eb" />
          <Text style={styles.headerButtonText}>Back</Text>
        </TouchableOpacity>
      </View> */}

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.title}>Support & Contact</Text>
          <Text style={styles.subtitle}>
            Use this page for App Store support information and user help.
          </Text>

          <InfoBlock
            icon="mail-outline"
            title="Support Email"
            value={SUPPORT_EMAIL}
            onPress={openMail}
          />

          <InfoBlock
            icon="help-circle-outline"
            title="What to Include"
            value="App version, device type, steps to reproduce, and screenshot if available."
          />

          <InfoBlock
            icon="shield-checkmark-outline"
            title="Privacy Questions"
            value="Use the same support email for privacy, account, and export-related questions."
          />

          <InfoBlock
            icon="time-outline"
            title="Response Window"
            value="Aim to respond within 2–3 business days."
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoBlock({
  icon,
  title,
  value,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  value: string;
  onPress?: () => void;
}) {
  const content = (
    <View style={styles.infoBlock}>
      <Ionicons name={icon} size={20} color="#2563eb" />
      <View style={styles.infoTextWrap}>
        <Text style={styles.infoTitle}>{title}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
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
  subtitle: {
    marginTop: 8,
    marginBottom: 18,
    fontSize: 15,
    lineHeight: 24,
    color: "#6b7280",
  },
  infoBlock: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  infoTextWrap: {
    flex: 1,
    marginLeft: 12,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 14,
    lineHeight: 22,
    color: "#374151",
  },
});
