import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import React from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";

type Props = {
  onFileSelected: (file: any) => void;
};

export default function RequirementAttachment({ onFileSelected }: Props) {
  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
      });

      if (!result.canceled) {
        onFileSelected(result.assets[0]);
      }
    } catch (err) {
      Alert.alert("Error", "Unable to pick document");
    }
  };

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert("Permission required");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
    });

    if (!result.canceled) {
      onFileSelected(result.assets[0]);
    }
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();

    if (!permission.granted) {
      Alert.alert("Camera permission required");
      return;
    }
    const [attachments, setAttachments] = useState<any[]>([]);
    const [showAttach, setShowAttach] = useState(false);
    const result = await ImagePicker.launchCameraAsync();

    if (!result.canceled) {
      onFileSelected(result.assets[0]);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.option} onPress={pickImage}>
        <Text style={styles.text}>Photo</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.option} onPress={takePhoto}>
        <Text style={styles.text}>Take Photo</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.option} onPress={pickDocument}>
        <Text style={styles.text}>Document / File</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => setShowAttach(true)}
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: "#2563eb",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ color: "white", fontSize: 22 }}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 10,
  },

  option: {
    padding: 12,
  },

  text: {
    fontSize: 16,
  },
});
