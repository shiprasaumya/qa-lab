import React from "react";
import { StyleSheet, Text, View } from "react-native";

type Props = {
  subtitle?: string;
};

export default function LogoHeader({
  subtitle = "Generate QA tests with AI",
}: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.logoCircle}>
        <Text style={styles.logoText}>TM</Text>
      </View>

      <View style={styles.textWrap}>
        <Text style={styles.title}>TestMind AI</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 20,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  logoCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#2563eb",
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: {
    color: "#ffffff",
    fontSize: 24,
    fontWeight: "800",
  },
  textWrap: {
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0f172a",
  },
  subtitle: {
    marginTop: 4,
    fontSize: 15,
    color: "#64748b",
  },
});
