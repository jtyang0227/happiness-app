import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { bookingApi } from '../src/api/bookingApi';
import { COLORS } from '../constants/colors';
import { FONT, RADIUS, SPACING } from '../constants/layout';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']; // index: 0=일 ... 6=토 (백엔드는 1=월..7=일)
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** 화면 표시용 인덱스(0=일..6=토) <-> 백엔드 weekdays 값(1=월..7=일) 변환 */
function uiIndexToBackend(idx) {
  return idx === 0 ? 7 : idx;
}
function backendToUiIndex(val) {
  return val === 7 ? 0 : val;
}

export default function AvailabilitySettingsScreen({ navigation }) {
  const [enabledDays, setEnabledDays] = useState(new Set([1, 2, 3, 4, 5])); // 백엔드 값 기준, 기본 월-금
  const [slots, setSlots] = useState(['10:00', '14:00']);
  const [newSlot, setNewSlot] = useState('');
  const [bufferHours, setBufferHours] = useState('0');
  const [bookingNote, setBookingNote] = useState('');
  const [blockedDates, setBlockedDates] = useState([]);
  const [newBlockedDate, setNewBlockedDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    Promise.allSettled([
      bookingApi.getAvailabilitySettings(),
      bookingApi.getBlockedDates(),
    ]).then(([settingsResult, blockedResult]) => {
      if (settingsResult.status === 'fulfilled' && settingsResult.value) {
        const data = settingsResult.value;
        if (data.weekdays) {
          setEnabledDays(new Set(data.weekdays.split(',').map(Number).filter(n => !Number.isNaN(n))));
        }
        if (data.timeSlots) {
          setSlots(data.timeSlots.split(',').filter(Boolean));
        }
        setBufferHours(String(data.bufferHours ?? 0));
        setBookingNote(data.bookingNote || '');
      }
      if (blockedResult.status === 'fulfilled') {
        setBlockedDates(Array.isArray(blockedResult.value) ? blockedResult.value : []);
      }
      setLoading(false);
    });
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleDay = (uiIdx) => {
    const backendVal = uiIndexToBackend(uiIdx);
    setEnabledDays(prev => {
      const next = new Set(prev);
      if (next.has(backendVal)) next.delete(backendVal);
      else next.add(backendVal);
      return next;
    });
  };

  const addSlot = () => {
    const v = newSlot.trim();
    if (!v) return;
    if (!TIME_RE.test(v)) {
      Alert.alert('형식 오류', 'HH:MM 형식으로 입력해주세요 (예: 14:00)');
      return;
    }
    if (slots.includes(v)) { setNewSlot(''); return; }
    setSlots(prev => [...prev, v].sort());
    setNewSlot('');
  };

  const removeSlot = (s) => setSlots(prev => prev.filter(x => x !== s));

  const handleSave = async () => {
    setSaving(true);
    try {
      await bookingApi.saveAvailabilitySettings({
        weekdays: Array.from(enabledDays).sort().join(','),
        timeSlots: slots.join(','),
        bufferHours: parseInt(bufferHours, 10) || 0,
        bookingNote,
        isActive: true,
      });
      Alert.alert('저장 완료', '가용 시간 설정이 저장되었습니다.');
    } catch {
      Alert.alert('오류', '저장에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setSaving(false);
    }
  };

  const addBlockedDate = async () => {
    const d = newBlockedDate.trim();
    if (!d) return;
    if (!DATE_RE.test(d)) {
      Alert.alert('형식 오류', 'YYYY-MM-DD 형식으로 입력해주세요 (예: 2026-09-20)');
      return;
    }
    if (blockedDates.find(b => b.date === d)) { setNewBlockedDate(''); return; }
    try {
      const result = await bookingApi.addBlockedDate({ date: d });
      setBlockedDates(prev => [...prev, result]);
      setNewBlockedDate('');
    } catch {
      Alert.alert('오류', '이미 차단된 날짜이거나 추가에 실패했습니다.');
    }
  };

  const removeBlockedDate = (id) => {
    Alert.alert('차단 해제', '이 날짜의 차단을 해제하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '해제', style: 'destructive',
        onPress: async () => {
          try {
            await bookingApi.deleteBlockedDate(id);
          } catch { /* 실패해도 로컬에서는 제거해 UX 상 응답성 유지 */ }
          setBlockedDates(prev => prev.filter(b => b.id !== id));
        },
      },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>가용 시간 설정</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} refreshControl={undefined}>
        {/* 예약 가능 요일 */}
        <Text style={styles.sectionTitle}>예약 가능 요일</Text>
        <View style={styles.weekdayRow}>
          {WEEKDAYS.map((w, uiIdx) => {
            const active = enabledDays.has(uiIndexToBackend(uiIdx));
            return (
              <TouchableOpacity
                key={w}
                onPress={() => toggleDay(uiIdx)}
                style={[styles.weekdayChip, active && styles.weekdayChipActive]}
              >
                <Text style={[styles.weekdayChipText, active && styles.weekdayChipTextActive]}>{w}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* 시간 슬롯 */}
        <Text style={styles.sectionTitle}>시간 슬롯</Text>
        <View style={styles.chipWrap}>
          {slots.map(s => (
            <View key={s} style={styles.slotChip}>
              <Text style={styles.slotChipText}>{s}</Text>
              <TouchableOpacity onPress={() => removeSlot(s)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                <Text style={styles.slotChipRemove}>×</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="HH:MM (예: 14:00)"
            placeholderTextColor={COLORS.textHint}
            value={newSlot}
            onChangeText={setNewSlot}
            keyboardType="numbers-and-punctuation"
          />
          <TouchableOpacity style={styles.addBtn} onPress={addSlot}>
            <Text style={styles.addBtnText}>+ 추가</Text>
          </TouchableOpacity>
        </View>

        {/* 버퍼 시간 */}
        <Text style={styles.sectionTitle}>버퍼 시간 (시간 단위)</Text>
        <TextInput
          style={[styles.input, { marginBottom: SPACING.lg }]}
          placeholder="0"
          placeholderTextColor={COLORS.textHint}
          value={bufferHours}
          onChangeText={setBufferHours}
          keyboardType="number-pad"
        />

        {/* 예약 메모 */}
        <Text style={styles.sectionTitle}>예약 메모</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="클라이언트에게 보여줄 안내 메모 (선택)"
          placeholderTextColor={COLORS.textHint}
          value={bookingNote}
          onChangeText={setBookingNote}
          multiline
        />

        {/* 차단 날짜 */}
        <Text style={styles.sectionTitle}>차단 날짜</Text>
        {blockedDates.length > 0 && (
          <View style={styles.chipWrap}>
            {blockedDates.map(b => (
              <View key={b.id} style={styles.blockedChip}>
                <Text style={styles.blockedChipText}>{b.date}</Text>
                <TouchableOpacity onPress={() => removeBlockedDate(b.id)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                  <Text style={styles.blockedChipRemove}>×</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={COLORS.textHint}
            value={newBlockedDate}
            onChangeText={setNewBlockedDate}
            keyboardType="numbers-and-punctuation"
          />
          <TouchableOpacity style={[styles.addBtn, styles.addBtnDanger]} onPress={addBlockedDate}>
            <Text style={styles.addBtnText}>추가</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, (saving || loading) && styles.saveBtnDisabled]}
          disabled={saving || loading}
          onPress={handleSave}
        >
          <Text style={styles.saveBtnText}>{saving ? '저장 중...' : '저장'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
    backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  backIcon: { fontSize: 26, color: COLORS.textPrimary, lineHeight: 26 },
  headerTitle: { fontSize: FONT.lg, fontWeight: '800', color: COLORS.textPrimary },
  content: { padding: SPACING.lg, paddingBottom: 60 },
  sectionTitle: { fontSize: FONT.sm, fontWeight: '700', color: COLORS.textPrimary, marginTop: SPACING.lg, marginBottom: SPACING.sm },
  weekdayRow: { flexDirection: 'row', gap: SPACING.sm, flexWrap: 'wrap' },
  weekdayChip: {
    width: 40, height: 40, borderRadius: 20,
    borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.white,
    alignItems: 'center', justifyContent: 'center',
  },
  weekdayChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  weekdayChipText: { fontSize: FONT.sm, color: COLORS.textSecondary },
  weekdayChipTextActive: { color: '#fff', fontWeight: '700' },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.sm },
  slotChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
    backgroundColor: COLORS.bg, borderWidth: 1, borderColor: COLORS.border,
  },
  slotChipText: { fontSize: FONT.sm, color: COLORS.textPrimary },
  slotChipRemove: { fontSize: FONT.base, color: COLORS.textMuted, marginLeft: 2 },
  blockedChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
    backgroundColor: '#FFF0F0', borderWidth: 1, borderColor: '#FECACA',
  },
  blockedChipText: { fontSize: FONT.sm, color: COLORS.danger },
  blockedChipRemove: { fontSize: FONT.base, color: COLORS.danger, marginLeft: 2 },
  inputRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.sm },
  input: {
    flex: 1, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.sm,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: FONT.sm, color: COLORS.textPrimary,
    backgroundColor: COLORS.white,
  },
  textArea: { minHeight: 72, textAlignVertical: 'top' },
  addBtn: {
    paddingHorizontal: 16, borderRadius: RADIUS.sm, backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  addBtnDanger: { backgroundColor: COLORS.danger },
  addBtnText: { color: '#fff', fontSize: FONT.sm, fontWeight: '700' },
  saveBtn: {
    marginTop: SPACING.xl, paddingVertical: 14, borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary, alignItems: 'center',
  },
  saveBtnDisabled: { backgroundColor: COLORS.border },
  saveBtnText: { color: '#fff', fontSize: FONT.base, fontWeight: '700' },
});
