import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { outingApi } from '../src/api/outingApi';
import { useAuth } from '../store/AuthContext';
import { COLORS } from '../constants/colors';
import { FONT, RADIUS, SPACING } from '../constants/layout';
import { fmtDate } from './OutingPollsScreen';

/* SNAPDAY 월간 출사 투표 — 날짜마다 가능/불가, 바꾼 것만 모아 저장. 디자인: DESIGN_PROMPT_snapday-outing.md 8절 */

const DAY_KIND = { SAT: '토요일', SUN: '일요일', HOLIDAY: '공휴일', WEEKDAY: '평일' };

export default function OutingPollScreen({ route, navigation }: { route?: any; navigation?: any }) {
  const pollId = route?.params?.pollId;
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [poll, setPoll] = useState<any>(null);
  const [error, setError] = useState('');
  const [changes, setChanges] = useState<Record<number, string | null>>({});
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      setPoll(await outingApi.getPoll(pollId));
    } catch (e: any) {
      setError(e?.response?.data?.message || '투표를 불러오지 못했어요.');
    }
  }, [pollId]);
  useEffect(() => { load(); }, [load]);

  if (error && !poll) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retry} onPress={load}><Text style={styles.retryText}>다시 시도</Text></TouchableOpacity>
      </View>
    );
  }
  if (!poll) return <View style={styles.center}><ActivityIndicator color={COLORS.primary} /></View>;

  const canVote = !!user && poll.votingOpen;
  const recommended = new Set<number>(poll.recommended || []);
  const confirmed = poll.options.find((o) => o.id === poll.confirmedOptionId);
  const pending = Object.keys(changes).length;
  const current = (o) => (o.id in changes ? changes[o.id] : o.mine);

  const pick = (o, value: string) => {
    const next = current(o) === value ? null : value;
    setChanges((c) => {
      const copy = { ...c };
      if (next === o.mine) delete copy[o.id]; else copy[o.id] = next;
      return copy;
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      const votes = Object.entries(changes).map(([optionId, availability]) => ({ optionId: Number(optionId), availability }));
      setPoll(await outingApi.vote(pollId, votes));
      setChanges({});
    } catch (e: any) {
      Alert.alert('저장하지 못했어요', e?.response?.data?.message || '잠시 후 다시 시도해 주세요.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: pending ? 120 + insets.bottom : 40 }]}>
        <Text style={styles.title}>{poll.title}</Text>
        <Text style={styles.meta}>
          {poll.votingOpen ? `투표 중 · ${poll.endsAt?.slice(5, 16).replace('-', '/').replace('T', ' ')} 마감` : poll.status === 'CONFIRMED' ? '날짜 확정' : '투표 기간이 아니에요'}
          {` · 응답 ${poll.voterCount}명`}{poll.minParticipants ? ` · 최소 ${poll.minParticipants}명` : ''}
        </Text>
        {poll.description ? <Text style={styles.desc}>{poll.description}</Text> : null}

        {confirmed ? (
          <View style={styles.confirmed}>
            <Text style={styles.confirmedLabel}>📅 확정된 날짜</Text>
            <Text style={styles.confirmedDate}>{fmtDate(confirmed.date)}{confirmed.label ? ` · ${confirmed.label}` : ''}</Text>
            {poll.gatheringId ? (
              <TouchableOpacity style={styles.gatheringBtn} onPress={() => navigation.navigate('GatheringDetail', { gatheringId: poll.gatheringId })}>
                <Text style={styles.gatheringBtnText}>모임 보기 ›</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}

        {!user ? <Text style={styles.hint}>로그인하면 날짜마다 가능·불가를 남길 수 있어요.</Text> : null}

        {poll.options.map((o) => {
          const mine = current(o);
          return (
            <View key={o.id} style={[styles.row, recommended.has(o.id) && styles.rowRecommended]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.date}>
                  {fmtDate(o.date)}{o.label ? ` · ${o.label}` : ''}
                  {recommended.has(o.id) ? <Text style={styles.recommend}>  추천</Text> : null}
                </Text>
                <Text style={styles.counts}>{DAY_KIND[o.dayKind] || ''} · 가능 {o.available} · 불가 {o.unavailable}</Text>
              </View>
              {[['AVAILABLE', '가능'], ['UNAVAILABLE', '불가']].map(([value, label]) => {
                const on = mine === value;
                return (
                  <TouchableOpacity key={value} disabled={!canVote} onPress={() => pick(o, value)}
                    accessibilityRole="button" accessibilityState={{ selected: on, disabled: !canVote }}
                    accessibilityLabel={`${fmtDate(o.date)} ${label}`}
                    style={[styles.chip, on && (value === 'AVAILABLE' ? styles.chipYes : styles.chipNo), !canVote && { opacity: 0.5 }]}>
                    <Text style={[styles.chipText, on && { color: COLORS.white }]}>{label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          );
        })}
      </ScrollView>
      {pending > 0 ? (
        <View style={[styles.bar, { paddingBottom: SPACING.md + insets.bottom }]}>
          <TouchableOpacity style={styles.save} onPress={save} disabled={saving} accessibilityRole="button">
            {saving ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.saveText}>응답 저장 ({pending})</Text>}
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.bg, padding: SPACING.xl },
  errorText: { fontSize: FONT.md, color: COLORS.textSecondary, textAlign: 'center' },
  retry: { marginTop: SPACING.md, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm, borderRadius: RADIUS.sm, backgroundColor: COLORS.primary },
  retryText: { color: COLORS.white, fontWeight: '600' },
  content: { padding: SPACING.lg },
  title: { fontSize: FONT.xxl, fontWeight: '700', color: COLORS.textPrimary },
  meta: { fontSize: FONT.sm, color: COLORS.textMuted, marginTop: SPACING.xs },
  desc: { fontSize: FONT.md, color: COLORS.textSecondary, marginTop: SPACING.md, lineHeight: 21 },
  hint: { fontSize: FONT.sm, color: COLORS.textSecondary, backgroundColor: COLORS.tagBg, padding: SPACING.md, borderRadius: RADIUS.sm, marginTop: SPACING.lg },
  confirmed: { backgroundColor: COLORS.successTonal, borderRadius: RADIUS.card, padding: SPACING.lg, marginTop: SPACING.lg },
  confirmedLabel: { fontSize: FONT.sm, color: COLORS.successText, fontWeight: '600' },
  confirmedDate: { fontSize: FONT.xl, color: COLORS.textPrimary, fontWeight: '700', marginTop: SPACING.xs },
  gatheringBtn: { marginTop: SPACING.sm, alignSelf: 'flex-start' },
  gatheringBtnText: { color: COLORS.successText, fontWeight: '700', fontSize: FONT.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, backgroundColor: COLORS.card, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md, marginTop: SPACING.sm },
  rowRecommended: { borderColor: COLORS.primary },
  date: { fontSize: FONT.base, fontWeight: '600', color: COLORS.textPrimary },
  recommend: { fontSize: FONT.xs, color: COLORS.primary, fontWeight: '700' },
  counts: { fontSize: FONT.xs, color: COLORS.textMuted, marginTop: 2 },
  chip: { minWidth: 52, minHeight: 36, borderRadius: 999, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center', paddingHorizontal: SPACING.md },
  chipYes: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipNo: { backgroundColor: COLORS.textSecondary, borderColor: COLORS.textSecondary },
  chipText: { fontSize: FONT.sm, fontWeight: '600', color: COLORS.textSecondary },
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: COLORS.card, borderTopWidth: 1, borderTopColor: COLORS.border, paddingHorizontal: SPACING.lg, paddingTop: SPACING.md },
  save: { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, height: 50, alignItems: 'center', justifyContent: 'center' },
  saveText: { color: COLORS.white, fontSize: FONT.lg, fontWeight: '700' },
});
