import React, { useState } from 'react';
import {
  Alert, Image, KeyboardAvoidingView, Platform,
  ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { photoApi } from '../services/api';
import { useAuth } from '../store/AuthContext';
import { COLORS, MOOD_COLORS } from '../constants/colors';
import { RADIUS, SPACING, FONT } from '../constants/layout';

const MOODS = Object.entries(MOOD_COLORS).map(([key, val]) => ({ key, ...val }));
const EMPTY = { title: '', description: '', gridColSpan: 6, colorMood: '' };

export default function PhotoFormScreen({ navigation, route }) {
  const { mode = 'create', photo } = route?.params || {};
  const { user } = useAuth();

  const [form, setForm] = useState(
    mode === 'edit' && photo
      ? { title: photo.title || '', description: photo.description || '',
          gridColSpan: photo.gridColSpan || 6, colorMood: photo.colorMood || '' }
      : EMPTY
  );
  const [imageUri, setImageUri] = useState(mode === 'edit' ? photo?.imageUrl : null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState(mode === 'edit' ? photo?.imageUrl : null);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('권한 필요', '사진 라이브러리 접근 권한이 필요합니다.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.85,
    });
    if (!result.canceled && result.assets?.length > 0) {
      const asset = result.assets[0];
      setImageUri(asset.uri);
      await uploadImage(asset);
    }
  };

  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('권한 필요', '카메라 접근 권한이 필요합니다.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.85,
    });
    if (!result.canceled && result.assets?.length > 0) {
      const asset = result.assets[0];
      setImageUri(asset.uri);
      await uploadImage(asset);
    }
  };

  const uploadImage = async (asset) => {
    setUploading(true);
    try {
      const formData = new FormData();
      const filename = asset.uri.split('/').pop();
      const ext = filename.split('.').pop()?.toLowerCase() || 'jpg';
      const mimeMap = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
      formData.append('file', { uri: asset.uri, name: filename, type: mimeMap[ext] || 'image/jpeg' });

      const res = await photoApi.uploadFile(formData);
      const url = res.url || res.data?.url;
      if (url) setUploadedUrl(url);
      else Alert.alert('오류', '업로드 URL을 받지 못했습니다.');
    } catch {
      Alert.alert('오류', '이미지 업로드에 실패했습니다.');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!form.title.trim()) { Alert.alert('검증 오류', '제목을 입력해주세요.'); return; }
    if (!uploadedUrl) { Alert.alert('검증 오류', '이미지를 선택해주세요.'); return; }
    if (!user) { Alert.alert('오류', '로그인이 필요합니다.'); return; }

    setSaving(true);
    try {
      const payload = {
        ...form,
        imageUrl: uploadedUrl,
        memberId: user.id,
      };
      if (mode === 'edit' && photo) {
        await photoApi.update(photo.id, payload);
      } else {
        await photoApi.create(payload);
      }
      navigation.goBack();
    } catch {
      Alert.alert('오류', '서버와 연결할 수 없습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.screenTitle}>{mode === 'edit' ? '사진 수정' : '새 사진 등록'}</Text>

        {/* 이미지 선택 */}
        <View style={styles.group}>
          <Text style={styles.label}>이미지</Text>
          {imageUri ? (
            <View style={styles.previewWrap}>
              <Image source={{ uri: imageUri }} style={styles.preview} />
              {uploading && (
                <View style={styles.uploadOverlay}>
                  <ActivityIndicator color="#fff" />
                  <Text style={styles.uploadingText}>업로드 중...</Text>
                </View>
              )}
              {!uploading && uploadedUrl && (
                <View style={styles.uploadDone}>
                  <Text style={styles.uploadDoneText}>✓ 업로드 완료</Text>
                </View>
              )}
              <TouchableOpacity style={styles.changeBtn} onPress={pickImage}>
                <Text style={styles.changeBtnText}>이미지 변경</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.pickerRow}>
              <TouchableOpacity style={styles.pickerBtn} onPress={pickImage}>
                <Text style={styles.pickerIcon}>🖼️</Text>
                <Text style={styles.pickerText}>갤러리</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.pickerBtn} onPress={takePhoto}>
                <Text style={styles.pickerIcon}>📷</Text>
                <Text style={styles.pickerText}>카메라</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* 제목 */}
        <View style={styles.group}>
          <Text style={styles.label}>제목 *</Text>
          <TextInput
            style={styles.input}
            placeholder="제목을 입력하세요"
            placeholderTextColor={COLORS.textHint}
            value={form.title}
            onChangeText={v => set('title', v)}
          />
        </View>

        {/* 설명 */}
        <View style={styles.group}>
          <Text style={styles.label}>설명</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            placeholder="간단한 설명을 입력하세요"
            placeholderTextColor={COLORS.textHint}
            value={form.description}
            onChangeText={v => set('description', v)}
            multiline
          />
        </View>

        {/* 무드 선택 */}
        <View style={styles.group}>
          <Text style={styles.label}>무드</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.moodRow}>
              <TouchableOpacity
                style={[styles.moodChip, !form.colorMood && styles.moodChipActive]}
                onPress={() => set('colorMood', '')}
              >
                <Text style={[styles.moodChipText, !form.colorMood && { color: '#fff' }]}>없음</Text>
              </TouchableOpacity>
              {MOODS.map(m => (
                <TouchableOpacity
                  key={m.key}
                  style={[styles.moodChip, form.colorMood === m.key && { backgroundColor: m.bg, borderColor: m.dot }]}
                  onPress={() => set('colorMood', m.key)}
                >
                  <View style={[styles.moodDot, { backgroundColor: m.dot }]} />
                  <Text style={[styles.moodChipText, form.colorMood === m.key && { color: m.dot }]}>
                    {m.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* 버튼 */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.btn, styles.btnSave, (saving || uploading) && styles.btnDisabled]}
            onPress={handleSave}
            disabled={saving || uploading}
          >
            {saving
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.btnText}>{mode === 'edit' ? '저장' : '등록'}</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, styles.btnCancel]} onPress={() => navigation.goBack()}>
            <Text style={styles.btnText}>취소</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: SPACING.lg, paddingBottom: 40 },
  screenTitle: { fontSize: FONT.hero, fontWeight: '800', marginBottom: SPACING.lg, color: COLORS.textPrimary },
  group: { marginBottom: SPACING.lg },
  label: { fontWeight: '700', marginBottom: SPACING.sm, color: COLORS.textPrimary },
  input: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md,
    paddingHorizontal: 14, paddingVertical: 12, backgroundColor: COLORS.white,
    color: COLORS.textPrimary, fontSize: FONT.base,
  },
  textarea: { height: 100, textAlignVertical: 'top' },

  pickerRow: { flexDirection: 'row', gap: 12 },
  pickerBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 28,
    backgroundColor: COLORS.white, borderRadius: RADIUS.card, borderWidth: 2,
    borderColor: COLORS.border, borderStyle: 'dashed' },
  pickerIcon: { fontSize: 32, marginBottom: 8 },
  pickerText: { color: COLORS.textSecondary, fontWeight: '600', fontSize: FONT.sm },

  previewWrap: { position: 'relative', borderRadius: RADIUS.card, overflow: 'hidden' },
  preview: { width: '100%', height: 220, backgroundColor: '#e0e0e0' },
  uploadOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center', gap: 8 },
  uploadingText: { color: '#fff', fontWeight: '600' },
  uploadDone: { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,200,0,0.8)',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  uploadDoneText: { color: '#fff', fontSize: FONT.xs, fontWeight: '700' },
  changeBtn: { position: 'absolute', bottom: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  changeBtnText: { color: '#fff', fontSize: FONT.xs, fontWeight: '600' },

  moodRow: { flexDirection: 'row', gap: 8 },
  moodChip: { flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.white },
  moodChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  moodChipText: { fontSize: FONT.xs, fontWeight: '600', color: COLORS.textSecondary },
  moodDot: { width: 8, height: 8, borderRadius: 4 },

  actionRow: { flexDirection: 'row', gap: 8 },
  btn: { flex: 1, paddingVertical: 14, borderRadius: RADIUS.lg, alignItems: 'center' },
  btnSave:     { backgroundColor: COLORS.primary },
  btnCancel:   { backgroundColor: COLORS.cancel },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: FONT.base },
});
