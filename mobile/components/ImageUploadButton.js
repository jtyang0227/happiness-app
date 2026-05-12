import React, { useState } from 'react';
import {
  View, Image, TouchableOpacity, Text,
  ActivityIndicator, StyleSheet, Alert,
} from 'react-native';
import { pickImage, uploadImageAsset } from '../utils/uploadImage';
import { useAuth } from '../store/AuthContext'; // 프로젝트 AuthContext 경로

export default function ImageUploadButton({ onUploadSuccess, folder = 'photos' }) {
  const { accessToken } = useAuth();
  const [preview, setPreview]   = useState(null);
  const [uploading, setUploading] = useState(false);

  const handlePick = async () => {
    try {
      const asset = await pickImage();
      if (!asset) return;

      setPreview(asset.uri);
      setUploading(true);

      const url = await uploadImageAsset(asset, accessToken, folder);
      onUploadSuccess?.(url);
    } catch (err) {
      Alert.alert('업로드 오류', err.message);
      setPreview(null);
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.button} onPress={handlePick} disabled={uploading}>
        <Text style={styles.buttonText}>사진 선택</Text>
      </TouchableOpacity>

      {preview && (
        <Image source={{ uri: preview }} style={styles.preview} resizeMode="cover" />
      )}

      {uploading && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color="#4f46e5" />
          <Text style={styles.uploadingText}>업로드 중...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: 12 },
  button: {
    backgroundColor: '#4f46e5',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  preview: { width: '100%', height: 220, borderRadius: 8 },
  overlay: { alignItems: 'center', gap: 8 },
  uploadingText: { color: '#4f46e5', fontSize: 13 },
});
