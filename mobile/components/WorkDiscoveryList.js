import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, Image, Linking, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { seriesApi } from '../services/api';
import { COLORS } from '../constants/colors';
import { FONT, RADIUS, SPACING } from '../constants/layout';
import { SHOOT_TYPES, shootTypeLabel } from '../constants/shootTypes';
import { getPortfolioUrl } from '../src/utils/portfolioUrl';
import { SkeletonGatheringCard } from './SkeletonCard';
import EmptyState from './EmptyState';

/**
 * 작업 탐색 (탐색 탭의 "작업") — 웹 components/discover/WorkDiscovery.jsx와 같은 API(GET /series/discover).
 * 모바일에는 작업 노트 화면이 없어 카드를 누르면 웹 작업 노트 페이지를 시스템 브라우저로 연다.
 */
const PAGE_SIZE = 20;
const CHIPS = [{ value: '', label: '전체' }, ...SHOOT_TYPES];

export default function WorkDiscoveryList() {
  const [shootType, setShootType] = useState('');
  const [locationInput, setLocationInput] = useState('');
  const [location, setLocation] = useState('');
  const [works, setWorks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [page, setPage] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const params = useCallback((p) => ({
    shootType: shootType || undefined, location: location || undefined, page: p, size: PAGE_SIZE,
  }), [shootType, location]);

  const load = useCallback(async () => {
    setError(false);
    try {
      const res = await seriesApi.discover(params(0));
      setWorks(res?.data || []);
      setPage(0);
      setHasNext(Boolean(res?.hasNext));
    } catch {
      setWorks([]);
      setHasNext(false);
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [params]);

  useEffect(() => { setLoading(true); load(); }, [load]);

  const handleLoadMore = async () => {
    if (!hasNext || loadingMore || loading || refreshing) return;
    setLoadingMore(true);
    try {
      const next = page + 1;
      const res = await seriesApi.discover(params(next));
      setWorks(prev => {
        const seen = new Set(prev.map(w => w.id));
        return [...prev, ...(res?.data || []).filter(w => !seen.has(w.id))];
      });
      setPage(next);
      setHasNext(Boolean(res?.hasNext));
    } catch {
      // 다음 스크롤 끝 도달 시 다시 시도된다
    } finally {
      setLoadingMore(false);
    }
  };

  const openWork = async (work) => {
    const base = getPortfolioUrl(work.memberProfileName);
    if (!base) return;
    try {
      await Linking.openURL(`${base}/work/${work.id}`);
    } catch {
      Alert.alert('알림', '작업 페이지를 열 수 없습니다.');
    }
  };

  const renderWork = ({ item }) => {
    const meta = [shootTypeLabel(item.shootType), item.clientLabel, item.shotOn].filter(Boolean).join(' · ');
    const author = item.memberName || item.memberProfileName || '';
    return (
      <TouchableOpacity style={styles.card} onPress={() => openWork(item)} activeOpacity={0.85}
        accessibilityRole="link" accessibilityLabel={`${item.title}, ${author} 작가 작업 열기`}>
        <View>
          {item.coverImageUrl
            ? <Image source={{ uri: item.coverImageUrl }} style={styles.cover} />
            : <View style={styles.cover} />}
          <View style={styles.countChip}><Text style={styles.countText}>{item.photoCount}장</Text></View>
        </View>
        <View style={styles.body}>
          <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
          {!!meta && <Text style={styles.meta}>{meta}</Text>}
          <Text style={styles.meta}>👏 {item.appreciationCount ?? 0} · 👁 {item.viewCount ?? 0}</Text>
        </View>
        <View style={styles.authorRow}>
          {item.memberAvatarUrl
            ? <Image source={{ uri: item.memberAvatarUrl }} style={styles.avatar} />
            : <View style={[styles.avatar, styles.avatarFallback]}><Text style={styles.avatarText}>{author.slice(0, 1) || '?'}</Text></View>}
          <Text style={styles.author} numberOfLines={1}>
            {author}{item.memberLocation ? <Text style={styles.location}> · {item.memberLocation}</Text> : null}
          </Text>
          {item.acceptingBookings && (
            <View style={styles.badge}>
              <View style={styles.badgeDot} />
              <Text style={styles.badgeText}>예약 받는 중</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const header = (
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {CHIPS.map(c => {
          const active = shootType === c.value;
          return (
            <TouchableOpacity key={c.value || 'all'} style={[styles.chip, active && styles.chipActive]}
              onPress={() => setShootType(c.value)} accessibilityRole="radio" accessibilityState={{ selected: active }}>
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{c.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      <View style={styles.locationRow}>
        <Text style={styles.pin}>📍</Text>
        <TextInput
          style={styles.locationInput}
          placeholder="지역 (예: 서울)"
          placeholderTextColor={COLORS.textHint}
          value={locationInput}
          maxLength={50}
          onChangeText={setLocationInput}
          onSubmitEditing={() => setLocation(locationInput.trim())}
          returnKeyType="search"
        />
        {!!locationInput && (
          <TouchableOpacity onPress={() => { setLocationInput(''); setLocation(''); }} accessibilityLabel="지역 지우기">
            <Text style={styles.clear}>✕</Text>
          </TouchableOpacity>
        )}
      </View>
      {!loading && !error && (
        <Text style={styles.resultCount}>작업 {works.length}{hasNext ? '+' : ''}건</Text>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.skeletons}>
        {header}
        {[1, 2, 3].map(i => <SkeletonGatheringCard key={i} />)}
      </View>
    );
  }

  const filtered = Boolean(shootType || location);
  return (
    <FlatList
      data={works}
      keyExtractor={item => String(item.id)}
      renderItem={renderWork}
      ListHeaderComponent={header}
      contentContainerStyle={styles.listContent}
      onRefresh={() => { setRefreshing(true); load(); }}
      refreshing={refreshing}
      onEndReached={handleLoadMore}
      onEndReachedThreshold={0.4}
      keyboardShouldPersistTaps="handled"
      ListFooterComponent={loadingMore ? <ActivityIndicator style={styles.footer} color={COLORS.primary} /> : null}
      ListEmptyComponent={
        error ? (
          <EmptyState icon="⚠️" title="작업을 불러오지 못했어요" description="아래로 당겨 다시 시도해 주세요" />
        ) : filtered ? (
          <EmptyState icon="📁" title="조건에 맞는 작업이 없어요" description="촬영 유형이나 지역 조건을 줄여 보세요" />
        ) : (
          <EmptyState icon="📁" title="아직 공개된 작업이 없어요" />
        )
      }
    />
  );
}

const styles = StyleSheet.create({
  listContent: { paddingBottom: 24 },
  skeletons: { flex: 1, backgroundColor: COLORS.bg },
  footer: { paddingVertical: SPACING.lg },

  chips: { paddingHorizontal: SPACING.md, gap: 6, paddingBottom: SPACING.sm },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.white },
  chipActive: { backgroundColor: COLORS.textPrimary, borderColor: COLORS.textPrimary },
  chipText: { fontSize: FONT.sm, fontWeight: '500', color: COLORS.textSecondary },
  chipTextActive: { color: COLORS.white, fontWeight: '700' },

  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginHorizontal: SPACING.md,
    marginBottom: SPACING.sm, paddingHorizontal: 12, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: RADIUS.sm, backgroundColor: COLORS.white },
  pin: { fontSize: FONT.sm },
  locationInput: { flex: 1, paddingVertical: 10, fontSize: FONT.md, color: COLORS.textPrimary },
  clear: { color: COLORS.textMuted, fontSize: FONT.sm, padding: 4 },
  resultCount: { color: COLORS.textMuted, fontSize: FONT.sm - 1, marginHorizontal: SPACING.md, marginBottom: SPACING.sm },

  card: { marginHorizontal: SPACING.md, marginBottom: SPACING.md, backgroundColor: COLORS.white,
    borderRadius: RADIUS.card, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },
  cover: { width: '100%', aspectRatio: 4 / 3, backgroundColor: COLORS.inputBg },
  countChip: { position: 'absolute', top: 10, right: 10, paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.6)' },
  countText: { color: '#fff', fontSize: FONT.sm - 2, fontWeight: '600' },
  body: { paddingHorizontal: 16, paddingTop: 14 },
  title: { fontSize: FONT.lg, fontWeight: '700', color: COLORS.textPrimary, lineHeight: 22 },
  meta: { fontSize: FONT.sm - 1, color: COLORS.textMuted, marginTop: 4 },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginTop: 14,
    paddingVertical: 12, borderTopWidth: 1, borderTopColor: COLORS.border },
  avatar: { width: 24, height: 24, borderRadius: 12 },
  avatarFallback: { backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: FONT.sm - 2, fontWeight: '700' },
  author: { flex: 1, fontSize: FONT.sm, fontWeight: '600', color: COLORS.textPrimary },
  location: { fontWeight: '400', color: COLORS.textMuted },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 999, backgroundColor: COLORS.successTonal },
  badgeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.success },
  badgeText: { color: COLORS.successText, fontSize: FONT.sm - 2, fontWeight: '700' },
});
