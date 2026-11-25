import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { gatheringApi } from '../src/api/gatheringApi';
import EmptyState from '../components/EmptyState';
import { COLORS } from '../constants/colors';
import { FONT, RADIUS, SPACING } from '../constants/layout';
import { fmtDate } from './OutingPollsScreen';

/* SNAPDAY 내 출사 기록 — 참여한(진행 중·끝난) 출사와 스토리 수. 디자인: DESIGN_PROMPT_snapday-outing.md 8절 */

export default function OutingHistoryScreen({ navigation }: { navigation?: any }) {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      setData(await gatheringApi.getHistory());
    } catch (e: any) {
      setData({ count: 0, storyCount: 0, items: [] });
      setError(e?.response?.data?.message || '출사 기록을 불러오지 못했어요.');
    } finally {
      setRefreshing(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  if (!data) return <View style={styles.center}><ActivityIndicator color={COLORS.primary} /></View>;

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={data.items}
      keyExtractor={(it) => String(it.id)}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={COLORS.primary} />}
      ListHeaderComponent={
        <View>
          <View style={styles.stats}>
            <View style={styles.stat}><Text style={styles.statNum}>{data.count}</Text><Text style={styles.statLabel}>참여한 출사</Text></View>
            <View style={styles.statDivider} />
            <View style={styles.stat}><Text style={styles.statNum}>{data.storyCount}</Text><Text style={styles.statLabel}>내 스토리</Text></View>
          </View>
          {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}
        </View>
      }
      ListEmptyComponent={
        error ? null : (
          <EmptyState icon="📸" title="아직 참여한 출사가 없어요" description="모임에서 출사에 참여하면 여기에 쌓여요."
            actionLabel="모임 보러 가기" onAction={() => navigation.navigate('Gatherings')} />
        )
      }
      renderItem={({ item }) => (
        <TouchableOpacity style={styles.row} activeOpacity={0.85} onPress={() => navigation.navigate('GatheringDetail', { gatheringId: item.id })}
          accessibilityRole="button" accessibilityLabel={`${item.title}, ${fmtDate(item.startDateTime?.slice(0, 10))}`}>
          {item.thumbnailUrl
            ? <Image source={{ uri: item.thumbnailUrl }} style={styles.thumb} accessibilityIgnoresInvertColors />
            : <View style={[styles.thumb, styles.thumbEmpty]}><Text style={{ fontSize: 22 }}>📷</Text></View>}
          <View style={{ flex: 1 }}>
            <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
            <Text style={styles.meta} numberOfLines={1}>{fmtDate(item.startDateTime?.slice(0, 10))} · 📍 {item.location}</Text>
            <Text style={styles.meta}>{item.status === 'ONGOING' ? '진행 중' : '끝남'} · 내 게시물 {item.myPostCount}</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      )}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.bg },
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: SPACING.lg, paddingBottom: 100, flexGrow: 1 },
  stats: { flexDirection: 'row', backgroundColor: COLORS.card, borderRadius: RADIUS.card, borderWidth: 1, borderColor: COLORS.border, paddingVertical: SPACING.lg, marginBottom: SPACING.lg },
  stat: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: FONT.xxl, fontWeight: '700', color: COLORS.textPrimary },
  statLabel: { fontSize: FONT.sm, color: COLORS.textMuted, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: COLORS.border },
  error: { backgroundColor: '#FDECEE', color: COLORS.danger, fontSize: FONT.md, padding: SPACING.md, borderRadius: RADIUS.sm, marginBottom: SPACING.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, backgroundColor: COLORS.card, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md, marginBottom: SPACING.sm },
  thumb: { width: 56, height: 56, borderRadius: RADIUS.sm, backgroundColor: COLORS.inputBg },
  thumbEmpty: { alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: FONT.base, fontWeight: '600', color: COLORS.textPrimary },
  meta: { fontSize: FONT.xs, color: COLORS.textMuted, marginTop: 2 },
  chevron: { fontSize: FONT.xl, color: COLORS.textHint },
});
