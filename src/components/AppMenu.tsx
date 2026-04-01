import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../lib/supabase";

type AppMenuProps = {
  visible: boolean;
  onClose: () => void;
  projectId?: string;
  projectName?: string;
  captureId?: string;
  captureTitle?: string;
};

export default function AppMenu({
  visible,
  onClose,
  projectId,
  projectName,
  captureId,
  captureTitle,
}: AppMenuProps) {
  const goToProjects = () => {
    onClose();
    router.replace("/projects");
  };

  const goToDashboard = () => {
    if (!projectId) return;
    onClose();
    router.push({
      pathname: "/project-dashboard",
      params: {
        projectId,
        projectName: projectName || "Project",
      },
    });
  };

  const goToCaptures = () => {
    if (!projectId) return;
    onClose();
    router.push({
      pathname: "/captures",
      params: {
        projectId,
        projectName: projectName || "Project",
      },
    });
  };

  const goToGenerators = () => {
    if (!projectId || !captureId) return;
    onClose();
    router.push({
      pathname: "/generators",
      params: {
        projectId,
        projectName: projectName || "Project",
        captureId,
        captureTitle: captureTitle || "Capture",
      },
    });
  };

  const handleSignOut = async () => {
    onClose();
    await supabase.auth.signOut();
    router.replace("/login");
  };

  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.menuCard}>
          <Text style={styles.menuTitle}>Quick Actions</Text>

          <MenuItem
            icon="home-outline"
            label="Projects"
            onPress={goToProjects}
          />

          {projectId ? (
            <MenuItem
              icon="grid-outline"
              label="Project Dashboard"
              onPress={goToDashboard}
            />
          ) : null}

          {projectId ? (
            <MenuItem
              icon="albums-outline"
              label="Captures Workspace"
              onPress={goToCaptures}
            />
          ) : null}

          {projectId && captureId ? (
            <MenuItem
              icon="sparkles-outline"
              label="Generator Workspace"
              onPress={goToGenerators}
            />
          ) : null}

          <View style={styles.divider} />

          <MenuItem
            icon="log-out-outline"
            label="Sign Out"
            danger
            onPress={handleSignOut}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function MenuItem({
  icon,
  label,
  onPress,
  danger = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <Ionicons name={icon} size={20} color={danger ? "#dc2626" : "#111827"} />
      <Text style={[styles.menuText, danger ? styles.dangerText : null]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.18)",
    justifyContent: "flex-start",
    alignItems: "flex-end",
    paddingTop: 100,
    paddingRight: 24,
  },
  menuCard: {
    width: 250,
    backgroundColor: "#ffffff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    paddingVertical: 10,
    shadowColor: "#000000",
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  menuItem: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  menuText: {
    marginLeft: 12,
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  dangerText: {
    color: "#dc2626",
  },
  divider: {
    height: 1,
    backgroundColor: "#eef2f7",
    marginVertical: 6,
  },
});
