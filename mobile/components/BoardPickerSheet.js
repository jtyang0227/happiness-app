import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator, FlatList, Image, KeyboardAvoidingView, Modal, Platform,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { moodboardApi } from '../services/api';
import { COLORS } from '../constants/colors';
import { FONT, RADIUS, SPACING } from '../constants/layout';

/**
 * 보드에 담기 하단 시트 — 웹 components/moodboard/BoardPickerModal.jsx와 같은 동작.
 * 체크 즉시 서버 반영(낙관적, 실패 시 롤백), 새 보드를 만들면 바로 담는다. 보드 관리(이름 변경·삭제)는 웹에서.
 */
export default function BoardPickerSheet({ photoId, onClose }) {
  const [boards, setBoards] = useState(null);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let alive = true;
    moodboardApi.list(photoId)
      .then(list => { if (alive) setBoards(list || []); })
      .catch(() => { if (alive) { setBoards([]); setError('보드를 불러오지 못했어요.'); } });
    return () => { alive = false; };
  }, [photoId]);

  const toggle = async (board) => {
    if (busyId) return;
    const next = !board.containsPhoto;
    setBusyId(board.id);
    setError('');
    setBoards(bs => bs.map(b => (b.id === board.id ? { ...b, containsPhoto: next, itemCount: b.itemCount + (next ? 1 : -1) } : b)));
    try {
      if (next) await moodboardApi.addPhoto(board.id, photoId);
      else await moodboardApi.removePhoto(board.id, photoId);
    } catch (e) {
      setBoards(bs => bs.map(b => (b.id === board.id ? board : b)));
      setError(e?.response?.data?.message || '저장하지 못했어요. 다시 시도해 주세요.');
    } finally {
      setBusyId(null);
    }
  };

  const createAndAdd = async () => {
    const n = name.trim();
    if (!n || creating) return;
    setCreating(true);
    setError('');
    try {
      const created = await moodboardApi.create(n);
      await moodboardApi.addPhoto(created.id, photoId);
      setBoards(bs => [{ id: created.id, name: created.name, itemCount: 1, containsPhoto: true, previewPhotos: [] }, ...(bs || [])]);
      setName('');
    } catch (e) {
      setError(e?.response?.data?.message || '보드를 만들지 못했어요.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.backdrop}>
        <TouchableOpacity style={{ flex: 1 }} onPress={onClose} accessibilityLabel="닫기" />
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>보드에 담기</Text>
            <TouchableOpacity onPress={onClose} accessibilityRole="button" accessibilityLabel="닫기"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.close}>✕</Text>
            </TouchableOpacity>
          </View>
          {boards === null ? (
            <ActivityIndicator style={{ marginVertical: SPACING.xl }} color={COLORS.primary} />
          ) : (
            <FlatList
              data={boards}
              keyExtractor={b => String(b.id)}
              style={{ maxHeight: 320 }}
              ListEmptyComponent={<Text style={styles.empty}>아직 보드가 없어요. 아래에서 첫 보드를 만들어 보세요.</Text>}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.row} onPress={() => toggle(item)} disabled={busyId === item.id}
                  accessibilityRole="checkbox" accessibilityState={{ checked: !!item.containsPhoto }}>
                  {item.previewPhotos?.[0]
                    ? <Image source={{ uri: item.previewPhotos[0] }} style={styles.thumb} />
                    : <View style={styles.thumb} />}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.count}>{item.itemCount}장</Text>
                  </View>
                  <View style={[styles.check, item.containsPhoto && styles.checkOn]}>
                    {item.containsPhoto ? <Text style={styles.checkMark}>✓</Text> : null}
                  </View>
                </TouchableOpacity>
              )}
            />
          )}
          {!!error && <Text style={styles.error}>{error}</Text>}
          <View style={styles.createRow}>
            <TextInput style={styles.input} value={name} onChangeText={setName} maxLength={50}
              placeholder="새 보드 이름" placeholderTextColor={COLORS.textHint}
              onSubmitEditing={createAndAdd} returnKeyType="done" />
            <TouchableOpacity style={[styles.createBtn, (!name.trim() || creating) && styles.createBtnOff]}
              onPress={createAndAdd} disabled={!name.trim() || creating} accessibilityRole="button">
              {creating ? <ActivityIndicator color={COLORS.white} size="small" /> : <Text style={styles.createText}>만들고 담기</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: { backgroundColor: COLORS.white, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl,
    paddingHorizontal: SPACING.lg, paddingTop: SPACING.lg, paddingBottom: SPACING.xl },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.sm },
  title: { fontSize: FONT.lg, fontWeight: '800', color: COLORS.textPrimary },
  close: { fontSize: FONT.lg, color: COLORS.textMuted },
  empty: { color: COLORS.textMuted, fontSize: FONT.sm, paddingVertical: SPACING.md, lineHeight: 20 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  thumb: { width: 44, height: 44, borderRadius: 8, backgroundColor: COLORS.border },
  name: { fontSize: FONT.md, fontWeight: '700', color: COLORS.textPrimary },
  count: { fontSize: FONT.sm - 1, color: COLORS.textMuted, marginTop: 2 },
  check: { width: 24, height: 24, borderRadius: 6, borderWidth: 1.5, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center' },
  checkOn: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  checkMark: { color: COLORS.white, fontWeight: '800' },
  error: { color: COLORS.danger, fontSize: FONT.sm, marginTop: SPACING.sm },
  createRow: { flexDirection: 'row', gap: 8, marginTop: SPACING.md, paddingTop: SPACING.md,
    borderTopWidth: 1, borderTopColor: COLORS.border },
  input: { flex: 1, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.sm,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: FONT.md, color: COLORS.textPrimary },
  createBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.sm, paddingHorizontal: 14, justifyContent: 'center' },
  createBtnOff: { backgroundColor: COLORS.textHint },
  createText: { color: COLORS.white, fontWeight: '700', fontSize: FONT.sm },
});
