import React, { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import AppHeaderMenu from '../components/AppHeaderMenu';

type Props = {
  route: any;
  navigation: any;
};

type UploadedFile = {
  id?: string;
  name: string;
  type: string;
  path: string;
  public_url?: string | null;
  created_at?: string;
};

function getMimeType(fileName: string) {
  const lower = fileName.toLowerCase();

  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.docx'))
    return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  if (lower.endsWith('.xlsx'))
    return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  return 'application/octet-stream';
}

export default function CaptureWorkspaceScreen({ route, navigation }: Props) {
  const { project } = route.params;
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);

  const loadFiles = async () => {
    const { data, error } = await supabase
      .from('project_files')
      .select('*')
      .eq('project_id', project.id)
      .order('created_at', { ascending: false });

    if (error) {
      Alert.alert('Error', error.message);
      return;
    }

    setFiles(data || []);
  };

  useEffect(() => {
    loadFiles();
  }, []);

  const pickAndUploadFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        multiple: false,
        copyToCacheDirectory: true,
        type: [
          'application/pdf',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'image/*',
        ],
      });

      if (result.canceled) return;

      const asset = result.assets[0];
      const uri = asset.uri;
      const fileName = asset.name || `upload_${Date.now()}`;
      const mimeType = asset.mimeType || getMimeType(fileName);

      setUploading(true);

      const response = await fetch(uri);
      const blob = await response.blob();

      const filePath = `${project.id}/${Date.now()}_${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('project-files')
        .upload(filePath, blob, {
          contentType: mimeType,
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data: publicData } = supabase.storage
        .from('project-files')
        .getPublicUrl(filePath);

      const { error: dbError } = await supabase.from('project_files').insert([
        {
          project_id: project.id,
          name: fileName,
          type: mimeType,
          path: filePath,
          public_url: publicData?.publicUrl || null,
        },
      ]);

      if (dbError) {
        throw dbError;
      }

      await loadFiles();
      Alert.alert('Success', 'File uploaded successfully.');
    } catch (error: any) {
      Alert.alert('Upload Error', error?.message || 'Unable to upload file.');
    } finally {
      setUploading(false);
    }
  };

  const removeFile = async (file: UploadedFile) => {
    Alert.alert('Delete File', `Delete ${file.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const { error: storageError } = await supabase.storage
            .from('project-files')
            .remove([file.path]);

          if (storageError) {
            Alert.alert('Error', storageError.message);
            return;
          }

          const { error: dbError } = await supabase
            .from('project_files')
            .delete()
            .eq('project_id', project.id)
            .eq('path', file.path);

          if (dbError) {
            Alert.alert('Error', dbError.message);
            return;
          }

          await loadFiles();
        },
      },
    ]);
  };

  const isImage = (type: string) => type.startsWith('image/');

  return (
    <SafeAreaView style={styles.safe}>
      <AppHeaderMenu
        title="Capture Workspace"
        onGoProjects={() => navigation.navigate('Projects')}
      />

      <View style={styles.content}>
        <View style={styles.projectCard}>
          <Text style={styles.projectLabel}>Current Project</Text>
          <Text style={styles.projectName}>{project.name}</Text>
          {!!project.description && (
            <Text style={styles.projectDescription}>{project.description}</Text>
          )}
        </View>

        <TouchableOpacity
          style={[styles.uploadButton, uploading && styles.uploadButtonDisabled]}
          onPress={pickAndUploadFile}
          disabled={uploading}
        >
          <Ionicons name="cloud-upload-outline" size={18} color="#fff" />
          <Text style={styles.uploadButtonText}>
            {uploading ? 'Uploading...' : 'Upload PDF / DOCX / XLSX / Image'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.generatorButton}
          onPress={() => navigation.navigate('Generators', { project })}
        >
          <Text style={styles.generatorButtonText}>Open Generators</Text>
          <Ionicons name="arrow-forward" size={18} color="#fff" />
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Uploaded Files</Text>

        <FlatList
          data={files}
          keyExtractor={(item, index) => `${item.path}_${index}`}
          contentContainerStyle={{ paddingBottom: 40 }}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Ionicons name="documents-outline" size={30} color="#9ca3af" />
              <Text style={styles.emptyText}>No files