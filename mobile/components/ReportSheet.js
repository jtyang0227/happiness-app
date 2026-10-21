import React, { useState } from 'react';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { reportApi } from '../src/api/safetyApi';
import { blockMember } from '../hooks/useBlockedMembers';
import { COLORS } from '../constants/colors';
import { FONT, RADIUS, SPACING } from '../constants/layout';

// 서버 ReportService.VALID_REASONS와 같은 코드
const REASONS = [
  { code: 'INAPPROPRIATE', label: '음란·폭력·혐오 등 부적절한 내용' },
  { code: 'SPAM',          label: '스팸·광고' },
  { code: 'COPYRIGHT',     label: '저작권 침해(남의 사진 도용)' },
  { code: 'PRIVACY',       label: '개인정보 노출' },
  { code: 'OTHER',         label: '기타' },
];

/**
 * 신고·차단 하단 시트 — 사진과 댓글 공용 (앱 심사 Apple 1.2: 신고 수단 + 사용자 차단).
 * target: { kind: 'photo' | 'comment', id, authorId, authorName }
 * onBlocked(authorId): 차단 후 호출 — 호출한 화면이 그 회원 콘텐츠를 즉시 숨긴다.
 */
export default function ReportSheet({ target, onClose, onBlocked }) {
  const [reason, setReason] = useState(null);
  const [detail, setDetail] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const what = target.kind === 'comment' ? '댓글' : '사진';
  const needDetail = reason === 'OTHER';
  const canSend = !!reason && (!needDetail || detail.trim()) && !sending;

  const submit = async () => {
    if (!canSend) return;
    setSending(true);
    setError('');
    try {
      if (target.kind === 'comment') await reportApi.reportComment(target.id, reason, detail.trim() || undefined);
      else await reportApi.reportPhoto(target.id, reason, detail.trim() || undefined);
      onClose();
      Alert.alert('신고가 접수됐어요', '운영팀이 24시간 안에 확인하고, 운영 정책 위반이면 콘텐츠를 삭제하고 작성자의 이용을 제한합니다.');
    } catch (err) {
      setError(err.response?.data?.message || '신고를 보내지 못했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setSending(false);
    }
  };

  const confirmBlock = () => {
    Alert.alert(`${target.authorName || '이 회원'}님을 차단할까요?`,
      '차단하면 이 회원의 사진과 댓글이 더 이상 보이지 않아요. 프로필 > 차단한 사용자에서 언제든 해제할 수 있어요.', [
        { text: '취소', style: 'cancel' },
        {
          text: '차단', style: 'destructive',
          onPress: async () => {
            try {
              await blockMember(target.authorId);
              onClose();
              onBlocked?.(target.authorId);
            } catch (err) {
              Alert.alert('차단하지 못했어요', err.response?.data?.message || '잠시 후 다시 시도해 주세요.');
            }
          },
        },
      ]);
  };

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.backdrop}>
        <TouchableOpacity style={{ flex: 1 }} onPress={onClose} accessibilityLabel="닫기" />
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>{what} 신고</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button" accessibilityLabel="닫기">
              <Text style={styles.close}>✕</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.hint}>신고 사유를 골라 주세요. 신고한 사실은 작성자에게 알려지지 않아요.</Text>

          {REASONS.map(r => (
            <TouchableOpacity key={r.code} style={styles.row} onPress={() => setReason(r.code)}
              accessibilityRole="radio" accessibilityState={{ checked: reason === r.code }}>
              <View style={[styles.radio, reason === r.code && styles.radioOn]}>
                {reason === r.code ? <View style={styles.radioDot} /> : null}
              </View>
              <Text style={styles.reasonText}>{r.label}</Text>
            </TouchableOpacity>
          ))}

          {!!reason && (
            <TextInput style={styles.input} value={detail} onChangeText={setDetail} maxLength={500} multiline
              placeholder={needDetail ? '어떤 문제인지 적어 주세요 (필수)' : '자세한 내용 (선택)'}
              placeholderTextColor={COLORS.textHint} />
          )}
          {!!error && <Text style={styles.error}>{error}</Text>}

          <TouchableOpacity style={[styles.submit, !canSend && styles.submitOff]} onPress={submit} disabled={!canSend}
            accessibilityRole="button">
            {sending ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.submitText}>신고하기</Text>}
          </TouchableOpacity>

          {target.authorId != null && (
            <TouchableOpacity style={styles.blockRow} onPress={confirmBlock} accessibilityRole="button">
              <Text style={styles.blockText}>🚫 {target.authorName || '작성자'}님 차단하기</Text>
            </TouchableOpacity>
          )}
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
  hint: { color: COLORS.textMuted, fontSize: FONT.sm, lineHeight: 20, marginBottom: SPACING.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderColor: COLORS.primary },
  radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: COLORS.primary },
  reasonText: { fontSize: FONT.md, color: COLORS.textPrimary },
  input: { borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.sm, marginTop: SPACING.sm,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: FONT.md, color: COLORS.textPrimary,
    minHeight: 64, maxHeight: 120, textAlignVertical: 'top' },
  error: { color: COLORS.danger, fontSize: FONT.sm, marginTop: SPACING.sm },
  submit: { backgroundColor: COLORS.danger, borderRadius: RADIUS.md, paddingVertical: 14,
    alignItems: 'center', marginTop: SPACING.md },
  submitOff: { backgroundColor: COLORS.textHint },
  submitText: { color: COLORS.white, fontWeight: '800', fontSize: FONT.md },
  blockRow: { alignItems: 'center', paddingVertical: 14, marginTop: SPACING.sm,
    borderTopWidth: 1, borderTopColor: COLORS.border },
  blockText: { color: COLORS.textSecondary, fontWeight: '700', fontSize: FONT.md },
});
