import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import React from "react";
import {
    Alert,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

export type PickedAttachment = {
  name: string;
  uri: string;
  mimeType?: string | null;
  size?: number | null;
  kind: "image" | "document" | "camera";
};

type Props = {
  visible: boolean;
  onClose: () => void;
  onPick: (file: PickedAttachment) => void;
};

export default function AttachmentPickerSheet({
  visible,
  onClose,
  onPick,
}: Props) {
  const pickFromLibrary = async () => {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert("Permission needed", "Please allow photo library access.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: false,
        quality: 1,
      });

      if (result.canceled) return;

      const asset = result.assets[0];

      onPick({
        name: asset.fileName || `image_${Date.now()}.jpg`,
        uri: asset.uri,
        mimeType: asset.mimeType || "image/jpeg",
        size: asset.fileSize ?? null,
        kind: "image",
      });

      onClose();
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Unable to open photo library.");
    }
  };

  const takePhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();

      if (!permission.granted) {
        Alert.alert("Permission needed", "Please allow camera access.");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        quality: 1,
      });

      if (result.canceled) return;

      const asset = result.assets[0];

      onPick({
        name: asset.fileName || `camera_${Date.now()}.jpg`,
        uri: asset.uri,
        mimeType: asset.mimeType || "image/jpeg",
        size: asset.fileSize ?? null,
        kind: "camera",
      });

      onClose();
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Unable to open camera.");
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        multiple: false,
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const asset = result.assets[0];

      onPick({
        name: asset.name || `file_${Date.now()}`,
        uri: asset.uri,
        mimeType: asset.mimeType || "application/octet-stream",
        size: asset.size ?? null,
        kind: "document",
      });

      onClose();
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Unable to pick file.");
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.handle} />

          <Text style={styles.title}>Attach requirement</Text>
          <Text style={styles.subtitle}>
            Add image, photo, PDF, Word, Excel, or any file
          </Text>

          <TouchableOpacity style={styles.option} onPress={pickFromLibrary}>
            <View style={styles.iconCircle}>
              <Ionicons name="images-outline" size={20} color="#2563eb" />
            </View>
            <View style={styles.optionTextWrap}>
              <Text style={styles.optionTitle}>Photo Library</Text>
              <Text style={styles.optionSubtext}>
                Choose image from gallery
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.option} onPress={takePhoto}>
            <View style={styles.iconCircle}>
              <Ionicons name="camera-outline" size={20} color="#2563eb" />
            </View>
            <View style={styles.optionTextWrap}>
              <Text style={styles.optionTitle}>Take Photo</Text>
              <Text style={styles.optionSubtext}>
                Capture image with camera
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.option} onPress={pickDocument}>
            <View style={styles.iconCircle}>
              <Ionicons
                name="document-attach-outline"
                size={20}
                color="#2563eb"
              />
            </View>
            <View style={styles.optionTextWrap}>
              <Text style={styles.optionTitle}>Document / Any File</Text>
              <Text style={styles.optionSubtext}>
                PDF, DOCX, XLSX, TXT, ZIP and more
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.28)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 28,
  },
  handle: {
    alignSelf: "center",
    width: 52,
    height: 5,
    borderRadius: 999,
    backgroundColor: "#d1d5db",
    marginBottom: 14,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
  },
  subtitle: {
    marginTop: 6,
    marginBottom: 18,
    fontSize: 14,
    lineHeight: 20,
    color: "#6b7280",
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#eff6ff",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  optionTextWrap: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  optionSubtext: {
    marginTop: 4,
    fontSize: 13,
    color: "#6b7280",
  },
  cancelButton: {
    marginTop: 12,
    height: 50,
    borderRadius: 14,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
});
