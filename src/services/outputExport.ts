import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";

type ExportResultParams = {
  fileName: string;
  content: string;
};

function sanitizeFileName(name: string) {
  return name.replace(/[^\w.\-]/g, "_");
}

export async function exportTextResult({
  fileName,
  content,
}: ExportResultParams) {
  const baseDir = FileSystem.documentDirectory || FileSystem.cacheDirectory;

  if (!baseDir) {
    throw new Error("No local directory available for export.");
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
    const mimeType = safeName.endsWith(".ts")
      ? "text/typescript"
      : "text/plain";

    await Sharing.shareAsync(fileUri, {
      mimeType,
      dialogTitle: "Export Result",
    });
  }

  return fileUri;
}

export function getExportFileName(outputType: string) {
  if (outputType === "playwright") return "generated.spec.ts";
  if (outputType === "fullSuite") return "generated-full-qa-suite.md";
  if (outputType === "testCases") return "generated-test-cases.txt";
  if (outputType === "edgeCases") return "generated-edge-cases.txt";
  if (outputType === "apiTests") return "generated-api-tests.txt";
  if (outputType === "screenshot") return "generated-screenshot-steps.txt";
  return "generated-output.txt";
}
