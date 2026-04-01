import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { supabase } from "../lib/supabase";

type Props = {
  visible: boolean;
  onClose: () => void;
  current?: string;
};

type DrawerItem = {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  route?: string;
  destructive?: boolean;
  action?: () => Promise<void> | void;
};

export default function AppDrawerMenu({ visible, onClose, current }: Props) {
  const router = useRouter();

  const items: DrawerItem[] = [
    {
      key: "projects",
      label: "Projects",
      icon: "folder-outline",
      route: "/projects",
    },
    {
      key: "workspace",
      label: "Project Workspace",
      icon: "grid-outline",
      route: "/project-dashboard",
    },
    {
      key: "generators",
      label: "AI Test Creation",
      icon: "sparkles-outline",
      route: "/generators",
    },
    {
      key: "exploratory",
      label: "Exploratory Studio",
      icon: "search-outline",
      route: "/exploratory",
    },
    {
      key: "analytics",
      label: "Analytics",
      icon: "bar-chart-outline",
      route: "/analytics",
    },
    {
      key: "support",
      label: "Support",
      icon: "help-circle-outline",
      route: "/support",
    },
    {
      key: "signout",
      label: "Sign Out",
      icon: "log-out-outline",
      destructive: true,
      action: async () => {
        await supabase.auth.signOut();
        router.replace("/login");
      },
    },
  ];

  const handleItemPress = async (item: DrawerItem) => {
    onClose();

    if (item.action) {
      await item.action();
      return;
    }

    if (item.route) {
      router.replace(item.route as any);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        <View style={styles.drawer}>
          <View style={styles.topRow}>
            <View>
              <Text style={styles.brand}>TestMind AI</Text>
              <Text style={styles.subBrand}>QA workspace navigation</Text>
            </View>

            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={22} color="#111827" />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.menuContent}
          >
            {items.map((item) => {
              const active = current === item.key;

              return (
                <TouchableOpacity
                  key={item.key}
                  style={[
                    styles.menuItem,
                    active && styles.menuItemActive,
                    item.destructive && styles.menuItemDanger,
                  ]}
                  activeOpacity={0.85}
                  onPress={() => handleItemPress(item)}
                  disabled={active && !item.destructive}
                >
                  <View
                    style={[
                      styles.iconWrap,
                      active
                        ? styles.iconWrapActive
                        : item.destructive
                          ? styles.iconWrapDanger
                          : styles.iconWrapNormal,
                    ]}
                  >
                    <Ionicons
                      name={item.icon}
                      size={20}
                      color={
                        item.destructive
                          ? "#dc2626"
                          : active
                            ? "#1d4ed8"
                            : "#12306f"
                      }
                    />
                  </View>

                  <View style={styles.textWrap}>
                    <Text
                      style={[
                        styles.menuText,
                        active && styles.menuTextActive,
                        item.destructive && styles.menuTextDanger,
                      ]}
                    >
                      {item.label}
                    </Text>
                    {active ? (
                      <Text style={styles.activeHint}>Current page</Text>
                    ) : null}
                  </View>

                  {!active ? (
                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color="#94a3b8"
                    />
                  ) : (
                    <Ionicons name="checkmark" size={18} color="#1d4ed8" />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <Pressable style={styles.backdrop} onPress={onClose} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: "row",
  },
  drawer: {
    width: 310,
    backgroundColor: "#ffffff",
    paddingTop: 56,
    paddingHorizontal: 16,
    borderRightWidth: 1,
    borderRightColor: "#e5e7eb",
    shadowColor: "#0f172a",
    shadowOpacity: 0.14,
    shadowRadius: 18,
    shadowOffset: { width: 4, height: 0 },
    elevation: 12,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.28)",
  },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  brand: {
    fontSize: 24,
    fontWeight: "900",
    color: "#0f172a",
  },
  subBrand: {
    marginTop: 4,
    fontSize: 13,
    color: "#64748b",
  },
  closeBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#f8fafc",
    alignItems: "center",
    justifyContent: "center",
  },
  menuContent: {
    paddingBottom: 32,
  },
  menuItem: {
    minHeight: 68,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    backgroundColor: "#ffffff",
  },
  menuItemActive: {
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  menuItemDanger: {
    backgroundColor: "#fffafa",
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  iconWrapNormal: {
    backgroundColor: "#eff6ff",
  },
  iconWrapActive: {
    backgroundColor: "#dbeafe",
  },
  iconWrapDanger: {
    backgroundColor: "#fef2f2",
  },
  textWrap: {
    flex: 1,
  },
  menuText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0f172a",
  },
  menuTextActive: {
    color: "#1d4ed8",
  },
  menuTextDanger: {
    color: "#dc2626",
  },
  activeHint: {
    marginTop: 2,
    fontSize: 12,
    color: "#64748b",
  },
});
