import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

export default function AppHeader({
  title = "TestMind AI",
  subtitle = "Generate QA tests with AI",
  showBack = false,
  onBack,
  rightText,
  onRightPress,
}: {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightText?: string;
  onRightPress?: () => void;
}) {
  return (
    <View style={styles.wrapper}>
      <View style={styles.topRow}>
        {showBack ? (
          <Pressable onPress={onBack} style={styles.navBtn}>
            <Text style={styles.link}>← Back</Text>
          </Pressable>
        ) : (
          <View style={styles.navBtn} />
        )}

        {rightText ? (
          <Pressable onPress={onRightPress} style={styles.navBtn}>
            <Text style={styles.link}>{rightText}</Text>
          </Pressable>
        ) : (
          <View style={styles.navBtn} />
        )}
      </View>

      <View style={styles.brandCard}>
        <View style={styles.logoCircle}>
          <Text style={styles.logoText}>TM</Text>
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 16,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  navBtn: {
    minWidth: 64,
  },
  brandCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 18,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  logoCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "800",
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#111827",
  },
  subtitle: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 2,
  },
  link: {
    color: "#2563EB",
    fontSize: 16,
    fontWeight: "700",
  },
});
