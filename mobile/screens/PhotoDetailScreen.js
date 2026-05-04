import React from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { photoApi } from '../services/api';
import { COLORS } from '../constants/colors';
import { RADIUS, SPACING, FONT } from '../constants/layout';

export default function PhotoDetailScreen({ photo, onBack, onPhotoUpdated, onPhotoDeleted, showToast }) {
  if (!photo) return null;

  const handleLike = async () => {
    try {
      const json = await photoApi.like(photo.id);
      if (json.data) { onPhotoUpdated(json.data); showToast('좋아요를 눌렀습니다. 💗'); }
    } catch { Alert.alert('오류', '서버와 연결할 수 없습니다.'); }
  };

  const handleFavorite = async () => {
    try {
      const json = await photoApi.favorite(photo.id);
      if (json.data) { onPhotoUpdated(json.data); showToast('찜했습니다. ⭐'); }
    } catch { Alert.alert('오류', '서버와 연결할 수 없습니다.'); }
  };

  const handleDelete = () => {
    Alert.alert('삭제 확인', '이 사진을 삭제하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제', style: 'destructive',
        onPress: async () => {
          try {
            await photoApi.remove(photo.id);
            showToast('사진이 삭제되었습니다.');
            onPhotoDeleted(photo.id);
          } catch { Alert.alert('오류', '서버와 연결할 수 없습니다.'); }
        },
      },
    ]);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TouchableOpacity onPress={onBack} style={styles.backBtn}>
        <Text style={styles.backText}>← 갤러리로</Text>
      </TouchableOpacity>

      <Image source={{ uri: photo.imageUrl }} style={styles.image} />
      <Text style={styles.title}>{photo.title}</Text>
      <Text style={styles.description}>{photo.description || '설명이 없습니다.'}</Text>
      {photo.createdAt && (
        <Text style={styles.meta}>
          등록일: {new Date(photo.createdAt).toLocaleDateString()}
        </Text>
      )}

      <View style={styles.actionRow}>
        <TouchableOpacity style={[styles.btn, styles.btnLike]} onPress={handleLike}>
          <Text style={styles.btnText}>💗 좋아요 {photo.likes || 0}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, styles.btnFav]} onPress={handleFavorite}>
          <Text style={styles.btnText}>⭐ 찜 {photo.favorites || 0}</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.actionRow}>
        <TouchableOpacity style={[styles.btn, styles.btnEdit]} onPress={() => onPhotoUpdated(photo, 'edit')}>
          <Text style={styles.btnText}>수정</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, styles.btnDelete]} onPress={handleDelete}>
          <Text style={styles.btnText}>삭제</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: SPACING.lg, paddingBottom: 40 },
  backBtn: { marginBottom: SPACING.md },
  backText: { color: COLORS.primary, fontWeight: '600', fontSize: FONT.md },
  image: { width: '100%', height: 260, borderRadius: RADIUS.xl, marginBottom: SPACING.lg },
  title: { fontSize: FONT.xxl, fontWeight: '800', marginBottom: SPACING.sm, color: COLORS.textPrimary },
  description: { color: COLORS.textSecondary, lineHeight: 22, marginBottom: SPACING.sm },
  meta: { color: COLORS.textHint, marginBottom: 18 },
  actionRow: { flexDirection: 'row', marginBottom: SPACING.sm },
  btn: { flex: 1, marginHorizontal: 4, paddingVertical: 14, borderRadius: RADIUS.lg, alignItems: 'center' },
  btnLike:   { backgroundColor: COLORS.primary },
  btnFav:    { backgroundColor: COLORS.fav },
  btnEdit:   { backgroundColor: COLORS.success },
  btnDelete: { backgroundColor: COLORS.danger },
  btnText: { color: COLORS.white, fontWeight: '700' },
});
