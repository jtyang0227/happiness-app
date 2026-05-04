import React, { useState } from 'react';
import {
  Alert, KeyboardAvoidingView, Platform,
  ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { photoApi } from '../services/api';
import { COLORS } from '../constants/colors';
import { RADIUS, SPACING, FONT } from '../constants/layout';
import GridSpanPicker from '../components/GridSpanPicker';

const EMPTY = { title: '', imageUrl: '', description: '', gridColSpan: 6 };

export default function PhotoFormScreen({ mode, photo, onSaved, onCancel, showToast }) {
  const [form, setForm] = useState(
    mode === 'edit' && photo
      ? { title: photo.title, imageUrl: photo.imageUrl, description: photo.description || '', gridColSpan: photo.gridColSpan || 6 }
      : EMPTY
  );

  const handleSave = async () => {
    if (!form.title.trim()) {
      Alert.alert('검증 오류', '제목을 입력해주세요.');
      return;
    }
    if (!form.imageUrl.trim()) {
      Alert.alert('검증 오류', '이미지 URL을 입력해주세요.');
      return;
    }
    try {
      const json = mode === 'edit' && photo
        ? await photoApi.update(photo.id, form)
        : await photoApi.create(form);
      if (json.data || json.success) {
        showToast(mode === 'edit' ? '사진이 수정되었습니다.' : '사진이 등록되었습니다.');
        onSaved();
      } else {
        Alert.alert('오류', json.message || '저장 중 오류가 발생했습니다.');
      }
    } catch {
      Alert.alert('오류', '서버와 연결할 수 없습니다.');
    }
  };

  const fields = [
    { label: '제목',      key: 'title',       placeholder: '제목을 입력하세요' },
    { label: '이미지 URL', key: 'imageUrl',    placeholder: 'https://...' },
  ];

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>{mode === 'edit' ? '사진 수정' : '새 사진 등록'}</Text>

        {fields.map(({ label, key, placeholder }) => (
          <View key={key} style={styles.group}>
            <Text style={styles.label}>{label}</Text>
            <TextInput
              style={styles.input}
              placeholder={placeholder}
              value={form[key]}
              onChangeText={text => setForm({ ...form, [key]: text })}
              autoCapitalize="none"
            />
          </View>
        ))}

        <View style={styles.group}>
          <Text style={styles.label}>설명</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            placeholder="간단한 설명을 입력하세요"
            value={form.description}
            onChangeText={text => setForm({ ...form, description: text })}
            multiline
          />
        </View>

        <View style={styles.group}>
          <Text style={styles.label}>갤러리 표시 너비</Text>
          <GridSpanPicker
            value={form.gridColSpan}
            onChange={v => setForm({ ...form, gridColSpan: v })}
          />
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity style={[styles.btn, styles.btnSave]} onPress={handleSave}>
            <Text style={styles.btnText}>{mode === 'edit' ? '저장' : '등록'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, styles.btnCancel]} onPress={onCancel}>
            <Text style={styles.btnText}>취소</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: SPACING.lg, paddingBottom: 40 },
  title: { fontSize: FONT.hero, fontWeight: '800', marginBottom: SPACING.lg, color: COLORS.textPrimary },
  group: { marginBottom: SPACING.lg },
  label: { fontWeight: '700', marginBottom: SPACING.sm, color: COLORS.textPrimary },
  input: {
    borderWidth: 1, borderColor: COLORS.borderLight, borderRadius: RADIUS.md,
    paddingHorizontal: 14, paddingVertical: 12, backgroundColor: COLORS.white,
    color: COLORS.textPrimary,
  },
  textarea: { height: 120, textAlignVertical: 'top' },
  actionRow: { flexDirection: 'row' },
  btn: { flex: 1, marginHorizontal: 4, paddingVertical: 14, borderRadius: RADIUS.lg, alignItems: 'center' },
  btnSave:   { backgroundColor: COLORS.primary },
  btnCancel: { backgroundColor: COLORS.cancel },
  btnText: { color: COLORS.white, fontWeight: '700' },
});
