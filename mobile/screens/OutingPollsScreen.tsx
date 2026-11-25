import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { outingApi } from '../src/api/outingApi';
import { COLORS } from '../constants/colors';
import { FONT, RADIUS, SPACING } from '../constants/layout';

/* SNAPDAY 월간 출사 투표 목록 — 디자인: DESIGN_PROMPT_snapday-outing.md 8절. 투표 만들기·공휴일 관리는 웹 관리자 */

const STATUS = {
  OPEN:      { label: '투표 중', bg: COLORS.tagBg,        color: COLORS.primary },
  CLOSED:    { label: '마감',    bg: COLORS.inputBg,      color: COLORS.textSecondary },
  CONFIRMED: { label: '확정',    bg: COLORS.successTonal, color: COLORS.successText },
};

export function fmtDate(d?: string | null) {
  if (!d) return '';
  const [, m, day] = d.split('-').map(Number);
  const wd = ['일', '월', '화', '수', '목', '금', '토'][new Date(`${d}T00:00:00Z`).getUTCDay()];
  return `${m}/${day}(${wd})`;
}

export default function OutingPollsScreen({ navigation }: { navigation?: any }) {
  const [year, setYear] = useState(new Date().getFullYear());
  const [polls, setPolls] = useState<any[] | null>(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      setPolls(await outingApi.listPolls(year));
    } catch (e: any) {
      setPolls([]);
      setError(e?.response?.data?.message || '투표 목록을 불러오지 못했어요.');
    } finally {
      setRefreshing(false);
    }
  }, [year]);

  useEffect(() => { setPolls(null); load(); }, [load]);

  const byMonth = new Map((polls ?? []).map((p) => [p.month, p]));
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={polls == null ? [] : months}
      keyExtractor={(m) => String(m)}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={COLORS.primary} />}
      ListHeaderComponent={
        <View>
          <Text style={styles.sub}>달마다 함께 갈 수 있는 날짜를 모아 출사 날짜를 정해요</Text>
          <View style={styles.yearRow}>
            <TouchableOpacity accessibilityLabel="이전 해" onPress={() => setYear(year - 1)} style={styles.yearBtn}><Text style={styles.yearBtnText}>‹</Text></TouchableOpacity>
            <Text style={styles.year}>{year}년</Text>
            <TouchableOpacity accessibilityLabel="다음 해" onPress={() => setYear(year + 1)} style={styles.yearBtn}><Text style={styles.yearBtnText}>›</Text></TouchableOpacity>
          </View>
          {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}
          {polls == null ? <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} /> : null}
        </View>
      }
      renderItem={({ item: m }) => {
        const p = byMonth.get(m);
        if (!p) {
          return (
            <View style={[styles.card, styles.cardEmpty]}>
              <Text style={styles.monthMuted}>{m}월</Text>
              <Text style={styles.meta}>투표 없음</Text>
            </View>
          );
        }
        const st = STATUS[p.status] || STATUS.CLOSED;
        return (
          <TouchableOpacity style={styles.card} activeOpacity={0.85} onPress={() => navigation.navigate('OutingPoll', { pollId: p.id })}
            accessibilityRole="button" accessibilityLabel={`${m}월 ${p.title}, ${st.label}`}>
            <View style={styles.cardTop}>
              <Text style={styles.month}>{m}월</Text>
              <View style={[styles.badge, { backgroundColor: st.bg }]}>
                <Text style={[styles.badgeText, { color: st.color }]}>{p.status === 'OPEN' && !p.votingOpen ? '시작 전·마감 지남' : st.label}</Text>
              </View>
            </View>
            <Text style={styles.title} numberOfLines={1}>{p.title}</Text>
            <Text style={styles.meta}>
              {p.status === 'CONFIRMED' ? `📅 ${fmtDate(p.confirmedDate)}` : `응답 ${p.voterCount}명 · 후보 ${p.optionCount}일`}
            </Text>
          </TouchableOpacity>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: SPACING.lg, paddingBottom: 100 },
  sub: { fontSize: FONT.sm, color: COLORS.textMuted, marginBottom: SPACING.md },
  yearRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.md, marginBottom: SPACING.lg },
  yearBtn: { width: 40, height: 40, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.card, alignItems: 'center', justifyContent: 'center' },
  yearBtnText: { fontSize: FONT.xl, color: COLORS.textSecondary },
  year: { fontSize: FONT.lg, fontWeight: '700', color: COLORS.textPrimary, minWidth: 72, textAlign: 'center' },
  error: { backgroundColor: '#FDECEE', color: COLORS.danger, fontSize: FONT.md, padding: SPACING.md, borderRadius: RADIUS.sm, marginBottom: SPACING.md },
  card: { backgroundColor: COLORS.card, borderRadius: RADIUS.card, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.lg, marginBottom: SPACING.sm },
  cardEmpty: { backgroundColor: 'transparent', borderStyle: 'dashed' },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  month: { fontSize: FONT.xl, fontWeight: '700', color: COLORS.textPrimary },
  monthMuted: { fontSize: FONT.xl, fontWeight: '700', color: COLORS.textSecondary },
  badge: { borderRadius: 999, paddingHorizontal: SPACING.sm, paddingVertical: 2 },
  badgeText: { fontSize: FONT.xs, fontWeight: '600' },
  title: { fontSize: FONT.md, color: COLORS.textSecondary, marginTop: SPACING.sm },
  meta: { fontSize: FONT.xs, color: COLORS.textMuted, marginTop: SPACING.xs },
});
