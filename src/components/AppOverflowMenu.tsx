import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../lib/supabase";

type Props = {
  projectId?: string;
  projectName?: string;
  captureId?: string;
  captureTitle?: string;
};

type MenuItem = {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  action: () => void | Promise<void>;
  destructive?: boolean;
};

export default function AppOverflowMenu({
  projectId,
  projectName,
  captureId,
  captureTitle,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const commonParams = {
    projectId: projectId || "",
    projectName: projectName || "",
    captureId: captureId || "",
    captureTitle: captureTitle || "",
  };

  const items = useMemo<MenuItem[]>(
    () => [
      // {
      //   key: "analytics",
      //   label: "Analytics",
      //   icon: "bar-chart-outline",
      //   action: () => {
      //     setOpen(false);
      //     router.push({
      //       pathname: "/analytics",
      //       params: commonParams,
      //     });
      //   },
      // },
      {
        key: "captures",
        label: "Captures",
        icon: "albums-outline",
        action: () => {
          setOpen(false);
          router.push({
            pathname: "/captures",
            params: {
              projectId: projectId || "",
              projectName: projectName || "",
            },
          });
        },
      },
      {
        key: "workspace",
        label: "Project Workspace",
        icon: "grid-outline",
        action: () => {
          setOpen(false);
          router.push({
            pathname: "/project-dashboard",
            params: commonParams,
          });
        },
      },
      {
        key: "generator",
        label: "AI Test Creation",
        icon: "sparkles-outline",
        action: () => {
          setOpen(false);
          router.push({
            pathname: "/generators",
            params: commonParams,
          });
        },
      },
      {
        key: "exploratory",
        label: "Exploratory Studio",
        icon: "search-outline",
        action: () => {
          setOpen(false);
          router.push({
            pathname: "/exploratory",
            params: commonParams,
          });
        },
      },
      {
        key: "analytics",
        label: "Analytics",
        icon: "bar-chart-outline",
        action: () => {
          setOpen(false);
          router.push({
            pathname: "/analytics",
            params: commonParams,
          });
        },
      },
      {
        key: "support",
        label: "Support",
        icon: "help-circle-outline",
        action: () => {
          setOpen(false);
          router.push("/support");
        },
      },
      {
        key: "signout",
        label: "Sign Out",
        icon: "log-out-outline",
        destructive: true,
        action: async () => {
          setOpen(false);
          try {
            await supabase.auth.signOut();
            router.replace("/login");
          } catch (error: any) {
            Alert.alert(
              "Sign Out Error",
              error?.message || "Unable to sign out.",
            );
          }
        },
      },
    ],
    [router, projectId, projectName, captureId, captureTitle],
  );

  return (
    <>
      <TouchableOpacity style={styles.headerBtn} onPress={() => setOpen(true)}>
        <Ionicons name="ellipsis-vertical" size={22} color="#111827" />
      </TouchableOpacity>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetTop}>
              <Text style={styles.sheetTitle}>Quick Actions</Text>
              <TouchableOpacity
                onPress={() => setOpen(false)}
                style={styles.closeBtn}
              >
                <Ionicons name="close" size={18} color="#111827" />
              </TouchableOpacity>
            </View>

            {items.map((item) => (
              <TouchableOpacity
                key={item.key}
                style={styles.menuRow}
                onPress={item.action}
                activeOpacity={0.85}
              >
                <View
                  style={[
                    styles.iconWrap,
                    item.destructive
                      ? styles.iconWrapDanger
                      : styles.iconWrapNormal,
                  ]}
                >
                  <Ionicons
                    name={item.icon}
                    size={18}
                    color={item.destructive ? "#dc2626" : "#12306f"}
                  />
                </View>

                <Text
                  style={[
                    styles.menuText,
                    item.destructive && styles.menuTextDanger,
                  ]}
                >
                  {item.label}
                </Text>

                <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
              </TouchableOpacity>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
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
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.32)",
    justifyContent: "flex-start",
    alignItems: "flex-end",
    paddingTop: 100,
    paddingRight: 16,
  },
  sheet: {
    width: 290,
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e6edf5",
  },
  sheetTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0f172a",
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f8fafc",
    alignItems: "center",
    justifyContent: "center",
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 16,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  iconWrapNormal: {
    backgroundColor: "#eff6ff",
  },
  iconWrapDanger: {
    backgroundColor: "#fef2f2",
  },
  menuText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: "#0f172a",
  },
  menuTextDanger: {
    color: "#dc2626",
  },
});
