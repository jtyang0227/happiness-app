import React, { useEffect, useState, useCallback } from 'react';
import {
  ActivityIndicator, Alert, FlatList, Image, KeyboardAvoidingView, Modal, Platform, Switch,
  ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { seriesApi, photoApi } from '../services/api';
import { useAuth } from '../store/AuthContext';
import { COLORS } from '../constants/colors';
import { FONT, RADIUS, SPACING } from '../constants/layout';
import { SHOOT_TYPES, shootTypeLabel } from '../constants/shootTypes';

const SHOT_ON_RE = /^\d{4}\.(0[1-9]|1[0-2])$/;

/**
 * 작업 노트 편집 — 웹 SeriesPage 모달의 "작업 노트" fieldset과 같은 4개 필드.
 * 빈 문자열은 서버에서 "비우기"로 처리된다 (PUT /series/:id).
 */
function WorkNoteModal({ series, onClose, onSaved }) {
  const [form, setForm] = useState({
    shootType: series.shootType || '',
    clientLabel: series.clientLabel || '',
    shotOn: series.shotOn || '',
    story: series.story || '',
    draft: !!series.draft,
  });
  const [saving, setSaving] = useState(false);
  const shotOnInvalid = form.shotOn.trim() !== '' && !SHOT_ON_RE.test(form.shotOn.trim());

  const save = async () => {
    if (shotOnInvalid || saving) return;
    setSaving(true);
    try {
      const updated = await seriesApi.update(series.id, form);
      onSaved(updated);
    } catch (e) {
      Alert.alert('저장 실패', e?.response?.data?.message || '잠시 후 다시 시도해주세요.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalBackdrop}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle} numberOfLines={1}>작업 노트 · {series.title}</Text>
            <TouchableOpacity onPress={onClose} accessibilityRole="button" accessibilityLabel="닫기" hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: SPACING.lg }}>
            <Text style={styles.modalHint}>
              적어두면 포트폴리오에서 이 시리즈가 작업 사례로 소개되고, 방문자가 같은 유형으로 바로 문의할 수 있어요. 모두 선택 입력이에요.
            </Text>

            <Text style={styles.fieldLabel}>촬영 유형</Text>
            <View style={styles.chipRow}>
              {SHOOT_TYPES.map(t => {
                const active = form.shootType === t.value;
                return (
                  <TouchableOpacity
                    key={t.value}
                    onPress={() => setForm(f => ({ ...f, shootType: active ? '' : t.value }))}
                    style={[styles.chip, active && styles.chipActive]}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: active }}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{t.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.fieldLabel}>클라이언트</Text>
            <TextInput
              style={styles.input} value={form.clientLabel} maxLength={100}
              onChangeText={v => setForm(f => ({ ...f, clientLabel: v }))}
              placeholder="예: OO 브랜드, 개인 의뢰" placeholderTextColor={COLORS.textHint}
            />

            <Text style={styles.fieldLabel}>작업 시기</Text>
            <TextInput
              style={[styles.input, shotOnInvalid && styles.inputError]} value={form.shotOn} maxLength={7}
              onChangeText={v => setForm(f => ({ ...f, shotOn: v }))}
              placeholder="2026.05" placeholderTextColor={COLORS.textHint}
              keyboardType="numbers-and-punctuation"
            />
            {shotOnInvalid && <Text style={styles.errorText}>YYYY.MM 형식으로 입력해주세요</Text>}

            <Text style={styles.fieldLabel}>작업 이야기 <Text style={styles.counter}>{form.story.length}/3000</Text></Text>
            <TextInput
              style={[styles.input, styles.storyInput]} value={form.story} maxLength={3000} multiline
              onChangeText={v => setForm(f => ({ ...f, story: v }))}
              placeholder="누구와, 무엇을, 왜 이렇게 찍었는지 짧게 남겨보세요." placeholderTextColor={COLORS.textHint}
              textAlignVertical="top"
            />

            <View style={styles.draftRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>초안으로 두기</Text>
                <Text style={styles.modalHint}>켜두면 나만 볼 수 있어요. 끄면 포트폴리오와 아카이브에 공개돼요.</Text>
              </View>
              <Switch value={form.draft} onValueChange={v => setForm(f => ({ ...f, draft: v }))}
                trackColor={{ true: COLORS.primary }} accessibilityLabel="초안으로 두기" />
            </View>
          </ScrollView>
          <TouchableOpacity
            style={[styles.saveBtn, (shotOnInvalid || saving) && styles.saveBtnDisabled]}
            onPress={save} disabled={shotOnInvalid || saving} accessibilityRole="button"
          >
            {saving ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.saveBtnText}>저장</Text>}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function SeriesCollage({ previewPhotos, coverUrl, height = 140 }) {
  const photos = (previewPhotos?.length ? previewPhotos : [coverUrl]).filter(Boolean);

  if (photos.length === 0) {
    return (
      <View style={[styles.collage, styles.collageEmpty, { height }]}>
        <Text style={styles.collageEmptyIcon}>📷</Text>
      </View>
    );
  }

  if (photos.length === 1) {
    return <Image source={{ uri: photos[0] }} style={[styles.collage, { height }]} />;
  }

  if (photos.length === 2) {
    return (
      <View style={[styles.collageRow, { height }]}>
        {photos.map((uri, i) => (
          <Image key={i} source={{ uri }} style={[styles.collageHalf, i > 0 && { marginLeft: 1 }]} />
        ))}
      </View>
    );
  }

  // 3장 이상 — 60/40 콜라주
  return (
    <View style={[styles.collageRow, { height }]}>
      <Image source={{ uri: photos[0] }} style={styles.collageMain} />
      <View style={styles.collageSideCol}>
        <Image source={{ uri: photos[1] }} style={styles.collageSide} />
        <Image source={{ uri: photos[2] }} style={[styles.collageSide, { marginTop: 1 }]} />
      </View>
    </View>
  );
}

export default function SeriesScreen({ navigation }) {
  const { user } = useAuth();
  const [series, setSeries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({});
  const [seriesPhotos, setSeriesPhotos] = useState({});
  const [editing, setEditing] = useState(null); // 작업 노트 편집 중인 시리즈

  const load = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await seriesApi.getMine();
      setSeries(res.data || res || []);
    } catch {
      setSeries([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  const handleToggle = async (id) => {
    const next = !expanded[id];
    setExpanded(e => ({ ...e, [id]: next }));
    if (next && !seriesPhotos[id]) {
      try {
        const res = await seriesApi.getOne(id);
        const s = res.data || res;
        setSeriesPhotos(p => ({ ...p, [id]: s.photos || [] }));
      } catch {
        setSeriesPhotos(p => ({ ...p, [id]: [] }));
      }
    }
  };

  // 대표 작업은 작가당 1개 — 서버(PUT /series/:id {pinned})가 나머지를 해제하므로 화면도 같은 규칙으로 갱신
  const handleTogglePin = async (item) => {
    const next = !item.pinned;
    try {
      await seriesApi.update(item.id, { pinned: next });
      setSeries(list => list.map(s => ({ ...s, pinned: s.id === item.id ? next : (next ? false : s.pinned) })));
    } catch (e) {
      Alert.alert('설정 실패', e?.response?.data?.message || '잠시 후 다시 시도해주세요.');
    }
  };

  const renderItem = ({ item }) => {
    const open = expanded[item.id];
    const photos = seriesPhotos[item.id] || [];

    return (
      <View style={styles.card}>
        <TouchableOpacity onPress={() => handleToggle(item.id)} activeOpacity={0.85}>
          <SeriesCollage previewPhotos={item.previewPhotos} coverUrl={item.coverUrl} />
          <View style={styles.cardMeta}>
            <View style={{ flex: 1 }}>
              <Text style={styles.seriesTitle} numberOfLines={1}>
                {item.draft ? <Text style={styles.draftTag}>초안 · </Text> : null}{item.title}
              </Text>
              {item.description ? (
                <Text style={styles.seriesDesc} numberOfLines={1}>{item.description}</Text>
              ) : null}
              <Text style={styles.seriesMeta}>
                {[shootTypeLabel(item.shootType), item.clientLabel, item.shotOn, `${item.photoCount ?? 0}장`].filter(Boolean).join(' · ')}
              </Text>
            </View>
            <Text style={[styles.chevron, open && styles.chevronOpen]}>{open ? '▲' : '▼'}</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.actionRow}>
          <TouchableOpacity style={[styles.noteBtn, { flex: 1 }]} onPress={() => setEditing(item)} accessibilityRole="button">
            <Text style={styles.noteBtnText}>
              ✎ 작업 노트 {item.shootType || item.story || item.clientLabel || item.shotOn ? '수정' : '쓰기'}
            </Text>
          </TouchableOpacity>
          {/* 초안은 공개 포트폴리오에 안 보이므로 대표 작업 토글을 숨긴다(웹 SeriesPage와 동일) */}
          {!item.draft && <TouchableOpacity
            style={[styles.noteBtn, item.pinned && styles.pinBtnActive]}
            onPress={() => handleTogglePin(item)}
            accessibilityRole="button"
            accessibilityState={{ selected: !!item.pinned }}
            accessibilityLabel={item.pinned ? '대표 작업 해제' : '대표 작업으로 고정'}
          >
            <Text style={[styles.noteBtnText, item.pinned && styles.pinBtnTextActive]}>
              📌 {item.pinned ? '대표 작업' : '대표로'}
            </Text>
          </TouchableOpacity>}
        </View>

        {open && (
          <View style={styles.photosGrid}>
            {photos.length === 0 ? (
              <Text style={styles.emptyPhotos}>사진이 없습니다.</Text>
            ) : (
              <View style={styles.gridRow}>
                {photos.map(p => (
                  <TouchableOpacity
                    key={p.id}
                    style={styles.gridItem}
                    onPress={() => navigation.navigate('PhotoDetail', { photo: p })}
                    activeOpacity={0.8}
                  >
                    <Image
                      source={{ uri: p.thumbnailUrl || p.imageUrl }}
                      style={styles.gridImage}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <>
    {editing && (
      <WorkNoteModal
        series={editing}
        onClose={() => setEditing(null)}
        onSaved={(updated) => {
          // 목록 응답의 previewPhotos/photoCount는 유지하고 작업 노트 필드만 갱신
          setSeries(list => list.map(s => (s.id === updated.id
            ? { ...s, shootType: updated.shootType, clientLabel: updated.clientLabel, shotOn: updated.shotOn, story: updated.story, draft: updated.draft }
            : s)));
          setEditing(null);
        }}
      />
    )}
    <FlatList
      data={series}
      keyExtractor={item => String(item.id)}
      contentContainerStyle={styles.list}
      onRefresh={load}
      refreshing={loading}
      renderItem={renderItem}
      ListEmptyComponent={
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>📚</Text>
          <Text style={styles.emptyText}>시리즈가 없습니다.</Text>
          <Text style={styles.emptyHint}>웹에서 시리즈를 만들어보세요.</Text>
        </View>
      }
    />
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: COLORS.bg, paddingTop: 80 },
  list: { padding: SPACING.md, paddingBottom: 24, backgroundColor: COLORS.bg, flexGrow: 1 },

  card: { backgroundColor: COLORS.white, borderRadius: RADIUS.card, marginBottom: 12,
    borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },

  collage: { width: '100%', backgroundColor: '#e0e0e0' },
  collageEmpty: { justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f0f8' },
  collageEmptyIcon: { fontSize: 32 },
  collageRow: { flexDirection: 'row' },
  collageHalf: { flex: 1, height: '100%', backgroundColor: '#e0e0e0' },
  collageMain: { flex: 0.6, height: '100%', backgroundColor: '#e0e0e0' },
  collageSideCol: { flex: 0.4, marginLeft: 1 },
  collageSide: { flex: 1, backgroundColor: '#e0e0e0' },

  cardMeta: { flexDirection: 'row', alignItems: 'center',
    padding: SPACING.md, justifyContent: 'space-between' },

  seriesTitle: { fontSize: FONT.md, fontWeight: '700', color: COLORS.textPrimary },
  seriesDesc:  { fontSize: FONT.xs, color: COLORS.textSecondary, marginTop: 2 },
  seriesMeta:  { fontSize: FONT.xs, color: COLORS.textHint, marginTop: 4 },

  chevron:     { color: COLORS.textMuted, fontSize: 12, paddingLeft: 8 },
  chevronOpen: { color: COLORS.primary },

  photosGrid: { paddingHorizontal: SPACING.md, paddingBottom: SPACING.md },
  gridRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  gridItem: { width: 96, height: 96, borderRadius: RADIUS.md, overflow: 'hidden' },
  gridImage: { width: '100%', height: '100%', backgroundColor: '#e0e0e0' },
  emptyPhotos: { color: COLORS.textHint, textAlign: 'center', paddingVertical: SPACING.md, fontSize: FONT.sm },

  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: FONT.lg, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 8 },
  emptyHint: { color: COLORS.textHint, fontSize: FONT.sm },

  actionRow: { flexDirection: 'row', gap: SPACING.sm, marginHorizontal: SPACING.md, marginBottom: SPACING.md },
  noteBtn: { paddingVertical: 10, paddingHorizontal: 12,
    borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  pinBtnActive: { borderColor: COLORS.primary, backgroundColor: COLORS.tagBg },
  draftTag: { color: COLORS.textMuted, fontWeight: '600' },
  draftRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: SPACING.md },
  pinBtnTextActive: { color: COLORS.primary, fontWeight: '700' },
  noteBtnText: { fontSize: FONT.sm, fontWeight: '600', color: COLORS.textSecondary },

  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: { backgroundColor: COLORS.white, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: SPACING.lg, maxHeight: '88%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.sm },
  modalTitle: { flex: 1, fontSize: FONT.lg, fontWeight: '800', color: COLORS.textPrimary, marginRight: SPACING.sm },
  modalClose: { fontSize: 18, color: COLORS.textMuted },
  modalHint: { fontSize: FONT.sm, color: COLORS.textMuted, lineHeight: 19, marginBottom: SPACING.sm },
  fieldLabel: { fontSize: FONT.sm, fontWeight: '600', color: COLORS.textSecondary, marginTop: SPACING.md, marginBottom: 6 },
  counter: { fontWeight: '400', color: COLORS.textHint },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1.5, borderColor: COLORS.border },
  chipActive: { borderColor: COLORS.primary, backgroundColor: COLORS.tagBg },
  chipText: { fontSize: FONT.sm, color: COLORS.textSecondary },
  chipTextActive: { color: COLORS.primary, fontWeight: '700' },
  input: { fontSize: FONT.md, color: COLORS.textPrimary, backgroundColor: COLORS.bg,
    borderRadius: RADIUS.md, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: 'transparent' },
  inputError: { borderColor: COLORS.danger },
  errorText: { fontSize: FONT.sm - 1, color: COLORS.danger, marginTop: 4 },
  storyInput: { minHeight: 110 },
  saveBtn: { marginTop: SPACING.sm, backgroundColor: COLORS.primary, borderRadius: RADIUS.md,
    paddingVertical: 14, alignItems: 'center' },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: COLORS.white, fontSize: FONT.md, fontWeight: '700' },
});
