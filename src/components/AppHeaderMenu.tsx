import { useRouter } from "expo-router";
import React from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function AppHeaderMenu({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const router = useRouter();

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.menu}>
          <TouchableOpacity
            onPress={() => {
              onClose();
              //navigation?.navigate?.("Analytics");
              router.replace("/analytics");
            }}
          >
            <Text style={styles.item}>Analytics</Text>
          </TouchableOpacity>

          {/* <TouchableOpacity
            onPress={() => {
              onClose();
              router.replace("/analytics");
            }}
          >
            <Text style={styles.item}>Analytics</Text>
          </TouchableOpacity> */}

          <TouchableOpacity
            onPress={() => {
              onClose();
              router.replace("/login");
            }}
          >
            <Text style={styles.item}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-start",
    alignItems: "flex-end",
    paddingTop: 70,
    paddingRight: 16,
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  menu: {
    width: 180,
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 10,
  },
  item: {
    padding: 12,
    fontWeight: "600",
  },
});
