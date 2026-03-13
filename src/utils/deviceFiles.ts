import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";

function sanitizeFileName(name: string) {
  return name.replace(/[^\w.-]/g, "_");
}

export async function exportTextFile(fileName: string, content: string) {
  const baseDir =
    FileSystem.documentDirectory || FileSystem.cacheDirectory || null;

  if (!baseDir) {
    throw new Error("No local directory available");
  }

  const exportDir = `${baseDir}exports/`;
  const safeName = sanitizeFileName(fileName);
  const fileUri = `${exportDir}${safeName}`;

  const dirInfo = await FileSystem.getInfoAsync(exportDir);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(exportDir, { intermediates: true });
  }

  await FileSystem.writeAsStringAsync(fileUri, content, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  const canShare = await Sharing.isAvailableAsync();

  if (canShare) {
    await Sharing.shareAsync(fileUri, {
      mimeType: fileName.endsWith(".ts") ? "text/typescript" : "text/plain",
      dialogTitle: "Export Playwright Script",
      UTI: Platform.OS === "ios" ? "public.plain-text" : undefined,
    });
  }

  return fileUri;
}
