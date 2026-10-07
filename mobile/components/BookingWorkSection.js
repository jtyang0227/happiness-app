import React, { useState } from 'react';
import {
  ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { bookingApi } from '../src/api/bookingApi';
import { COLORS } from '../constants/colors';
import { FONT, RADIUS, SPACING } from '../constants/layout';

// 웹 components/booking/ChecklistAccordion.jsx · PaymentToggle.jsx 와 같은 서버 계약을 사용한다.
// - PUT /booking/{id}/checklist 는 checklistJson 과 deliveryDeadline 을 둘 다 덮어쓰므로 항상 함께 보낸다.
// - PUT /booking/{id}/payment 는 null 필드를 건드리지 않는 부분 업데이트다.

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseChecklist(json) {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

const genId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/** 오늘 기준 0~3일 이내 납품 기한이면 true (웹 isDeliveryDeadlineNear 와 동일 규칙) */
export function isDeliveryDeadlineNear(deadline) {
  if (!deadline) return false;
  const target = new Date(`${deadline}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((target - today) / 86400000);
  return diff >= 0 && diff <= 3;
}

export function ChecklistSection({ booking, onUpdate }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(() => parseChecklist(booking.checklistJson));
  const [deadline, setDeadline] = useState(booking.deliveryDeadline || '');
  const [newText, setNewText] = useState('');
  const [saving, setSaving] = useState(false);

  const persist = async (nextItems, nextDeadline) => {
    const prevItems = items;
    setItems(nextItems);
    setSaving(true);
    try {
      const updated = await bookingApi.updateChecklist(booking.id, {
        checklistJson: JSON.stringify(nextItems),
        deliveryDeadline: nextDeadline || null,
      });
      onUpdate && onUpdate(updated);
    } catch {
      setItems(prevItems);
      Alert.alert('저장 실패', '체크리스트를 저장하지 못했어요. 다시 시도해주세요.');
    } finally {
      setSaving(false);
    }
  };

  const addItem = () => {
    const text = newText.trim();
    if (!text) return;
    setNewText('');
    persist([...items, { id: genId(), text, checked: false }], deadline);
  };

  const toggleItem = (id) =>
    persist(items.map(it => (it.id === id ? { ...it, checked: !it.checked } : it)), deadline);

  const removeItem = (id) => persist(items.filter(it => it.id !== id), deadline);

  const saveDeadline = () => {
    const value = deadline.trim();
    if (value && !DATE_RE.test(value)) {
      Alert.alert('날짜 형식', '납품 기한은 YYYY-MM-DD 형식으로 입력해주세요.');
      return;
    }
    if (value === (booking.deliveryDeadline || '')) return;
    persist(items, value);
  };

  const done = items.filter(it => it.checked).length;

  return (
    <View style={styles.section}>
      <TouchableOpacity
        style={styles.sectionHeader}
        onPress={() => setOpen(o => !o)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
      >
        <Text style={styles.sectionTitle}>📋 촬영 준비 ({done}/{items.length})</Text>
        <View style={styles.headerRight}>
          {saving && <ActivityIndicator size="small" color={COLORS.primary} />}
          <Text style={styles.chevron}>{open ? '▲' : '▼'}</Text>
        </View>
      </TouchableOpacity>

      {open && (
        <View style={styles.sectionBody}>
          {items.map(it => (
            <View key={it.id} style={styles.itemRow}>
              <TouchableOpacity
                style={styles.itemToggle}
                onPress={() => toggleItem(it.id)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: !!it.checked }}
              >
                <View style={[styles.checkbox, it.checked && styles.checkboxOn]}>
                  {it.checked && <Text style={styles.checkMark}>✓</Text>}
                </View>
                <Text style={[styles.itemText, it.checked && styles.itemTextDone]}>{it.text}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => removeItem(it.id)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel={`${it.text} 삭제`}
              >
                <Text style={styles.removeText}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}

          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="준비 항목 추가"
              placeholderTextColor={COLORS.textHint}
              value={newText}
              onChangeText={setNewText}
              onSubmitEditing={addItem}
              returnKeyType="done"
              maxLength={100}
            />
            <TouchableOpacity onPress={addItem} disabled={!newText.trim()}>
              <Text style={[styles.addText, !newText.trim() && { color: COLORS.textHint }]}>추가</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.fieldLabel}>🚚 납품 기한</Text>
          <TextInput
            style={styles.input}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={COLORS.textHint}
            value={deadline}
            onChangeText={setDeadline}
            onEndEditing={saveDeadline}
            keyboardType="numbers-and-punctuation"
            maxLength={10}
          />
        </View>
      )}
    </View>
  );
}

function PaymentRow({ label, status, amount, saving, onToggle, onSaveAmount }) {
  const received = status === 'RECEIVED';
  const [text, setText] = useState(amount != null ? String(amount) : '');

  const commitAmount = () => {
    const digits = text.replace(/[^0-9]/g, '');
    const value = digits ? Number(digits) : null;
    if (value === (amount ?? null)) return;
    if (value == null) return; // 서버 계약상 null은 "변경 없음"이라 금액 삭제는 지원하지 않는다
    onSaveAmount(value);
  };

  return (
    <View style={styles.payRow}>
      <TouchableOpacity
        style={[styles.payToggle, received && styles.payToggleOn]}
        onPress={onToggle}
        disabled={saving}
        accessibilityRole="switch"
        accessibilityState={{ checked: received }}
        accessibilityLabel={`${label} 수령 여부`}
      >
        <Text style={[styles.payToggleText, received && styles.payToggleTextOn]}>
          {label} · {received ? '수령완료' : '미수령'}
        </Text>
      </TouchableOpacity>
      <TextInput
        style={[styles.input, styles.amountInput]}
        placeholder="금액(선택)"
        placeholderTextColor={COLORS.textHint}
        value={text}
        onChangeText={setText}
        onEndEditing={commitAmount}
        keyboardType="number-pad"
        maxLength={10}
      />
    </View>
  );
}

export function PaymentSection({ booking, onUpdate }) {
  const [saving, setSaving] = useState(false);

  const save = async (patch) => {
    setSaving(true);
    try {
      const updated = await bookingApi.updatePayment(booking.id, patch);
      onUpdate && onUpdate(updated);
    } catch {
      Alert.alert('저장 실패', '수금 상태를 저장하지 못했어요. 다시 시도해주세요.');
    } finally {
      setSaving(false);
    }
  };

  const flip = (s) => (s === 'RECEIVED' ? 'PENDING' : 'RECEIVED');

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, styles.paySectionTitle]}>💰 수금 현황</Text>
      <PaymentRow
        label="계약금"
        status={booking.depositStatus}
        amount={booking.depositAmount}
        saving={saving}
        onToggle={() => save({ depositStatus: flip(booking.depositStatus) })}
        onSaveAmount={(v) => save({ depositAmount: v })}
      />
      <PaymentRow
        label="잔금"
        status={booking.balanceStatus}
        amount={booking.balanceAmount}
        saving={saving}
        onToggle={() => save({ balanceStatus: flip(booking.balanceStatus) })}
        onSaveAmount={(v) => save({ balanceAmount: v })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: SPACING.md,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 4,
  },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  sectionTitle: { fontSize: FONT.sm, fontWeight: '700', color: COLORS.textPrimary },
  paySectionTitle: { paddingVertical: 4, marginBottom: SPACING.xs },
  chevron: { fontSize: 11, color: COLORS.textMuted },
  sectionBody: { marginTop: SPACING.sm, gap: SPACING.sm },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  itemToggle: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  checkbox: {
    width: 20, height: 20, borderRadius: 6,
    borderWidth: 1.5, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  checkMark: { color: COLORS.white, fontSize: 12, fontWeight: '800' },
  itemText: { flex: 1, fontSize: FONT.sm, color: COLORS.textPrimary },
  itemTextDone: { color: COLORS.textMuted, textDecorationLine: 'line-through' },
  removeText: { fontSize: 13, color: COLORS.textMuted },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  input: {
    flex: 1,
    fontSize: FONT.sm,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.bg,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  addText: { fontSize: FONT.sm, fontWeight: '700', color: COLORS.primary },
  fieldLabel: { fontSize: FONT.sm - 1, fontWeight: '600', color: COLORS.textSecondary },
  payRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.sm },
  payToggle: {
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: RADIUS.sm, backgroundColor: COLORS.bg,
    borderWidth: 1, borderColor: COLORS.border,
  },
  payToggleOn: { backgroundColor: 'rgba(0,196,113,0.10)', borderColor: COLORS.success },
  payToggleText: { fontSize: FONT.sm - 1, fontWeight: '600', color: COLORS.textSecondary },
  payToggleTextOn: { color: COLORS.success },
  amountInput: { flex: 1 },
});
