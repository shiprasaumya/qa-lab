import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import AppDrawerMenu from "./AppDrawerMenu";

type Props = {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  current?:
    | "projects"
    | "workspace"
    | "generators"
    | "exploratory"
    | "analytics"
    | "support";
  fallbackRoute?: string;
};

export default function AppHeader({
  title,
  subtitle,
  showBack = true,
  current,
  fallbackRoute = "/projects",
}: Props) {
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleBack = () => {
    router.replace(fallbackRoute as any);
  };

  return (
    <>
      <View style={styles.container}>
        <View style={styles.left}>
          <Pressable style={styles.iconBtn} onPress={() => setDrawerOpen(true)}>
            <Ionicons name="menu-outline" size={24} color="#111827" />
          </Pressable>
        </View>

        <View style={styles.center}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>

        <View style={styles.right}>
          {showBack ? (
            <Pressable style={styles.iconBtn} onPress={handleBack}>
              <Ionicons name="arrow-back" size={22} color="#111827" />
            </Pressable>
          ) : (
            <View style={styles.iconPlaceholder} />
          )}
        </View>
      </View>

      <AppDrawerMenu
        visible={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        current={current}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 72,
    paddingHorizontal: 16,
    backgroundColor: "#f4f7fb",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  left: {
    width: 60,
    alignItems: "flex-start",
  },
  right: {
    width: 60,
    alignItems: "flex-end",
  },
  center: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 8,
  },
  iconBtn: {
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
  iconPlaceholder: {
    width: 54,
    height: 54,
  },
  title: {
    fontSize: 20,
    fontWeight: "900",
    color: "#0f172a",
    textAlign: "center",
  },
  subtitle: {
    marginTop: 2,
    fontSize: 12,
    color: "#64748b",
    textAlign: "center",
  },
});
