import React, { memo, useEffect, useMemo, useState, useCallback } from 'react';
import {
  ActivityIndicator, FlatList, Image, StyleSheet,
  Text, TouchableOpacity, View,
} from 'react-native';
import { photoApi } from '../services/api';
import { useAuth } from '../store/AuthContext';
import { COLORS, MOOD_COLORS } from '../constants/colors';
import { FONT, SPACING } from '../constants/layout';
import { SkeletonFeedCard } from '../components/SkeletonCard';
import EmptyState from '../components/EmptyState';
import useBlockedMembers from '../hooks/useBlockedMembers';

const PAGE_SIZE = 20;

// 행 컴포넌트를 memo로 — 더 불러오기·새로고침으로 목록 state가 바뀌어도 이미 그려진 카드는 다시 그리지 않는다
const FeedCard = memo(function FeedCard({ item, onPress }) {
  const mood = item.colorMood && MOOD_COLORS[item.colorMood];
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(item)}
      activeOpacity={0.9}
    >
      <Image
        source={{ uri: item.thumbnailUrl || item.imageUrl }}
        style={styles.image}
        resizeMode="cover"
      />
      <View style={styles.info}>
        <View style={styles.authorRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(item.memberName || '?')[0].toUpperCase()}
            </Text>
          </View>
          <Text style={styles.authorName}>{item.memberName || '작가'}</Text>
        </View>
        <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
        {item.description ? (
          <Text style={styles.desc} numberOfLines={2}>{item.description}</Text>
        ) : null}
        <View style={styles.meta}>
          {mood ? (
            <View style={[styles.moodBadge, { backgroundColor: mood.bg }]}>
              <View style={[styles.moodDot, { backgroundColor: mood.dot }]} />
              <Text style={[styles.moodLabel, { color: mood.dot }]}>{mood.label}</Text>
            </View>
          ) : null}
          <Text style={styles.likes}>💗 {item.likesCount || 0}</Text>
          <Text style={styles.date}>
            {new Date(item.createdAt).toLocaleDateString('ko-KR')}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
});

export default function FeedScreen({ navigation }) {
  const { user } = useAuth();
  const [photos, setPhotos] = useState([]);
  const { isBlocked } = useBlockedMembers();   // 차단한 회원의 사진은 숨김
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadPage = useCallback(async (p = 0, reset = false) => {
    if (!user?.id) { setLoading(false); return; }
    try {
      const res = await photoApi.getFeed(user.id, p, PAGE_SIZE);
      const items = res.data?.content || res.content || res.data || res || [];
      // 페이지 사이에 새 사진이 올라오면 같은 사진이 다음 페이지에 또 온다 — id로 걸러 중복 key를 막는다
      setPhotos(prev => {
        if (reset) return items;
        const seen = new Set(prev.map(x => x.id));
        return [...prev, ...items.filter(x => !seen.has(x.id))];
      });
      setHasMore(items.length === PAGE_SIZE);
      setPage(p);
    } catch {
      // 더 불러오기 실패는 이미 불러온 목록을 그대로 둔다 (예전엔 처음 렌더의 빈 배열로 덮어써 피드가 통째로 사라졌다)
      if (reset) setPhotos([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => { loadPage(0, true); }, []);

  const handleLoadMore = () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    loadPage(page + 1, false);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadPage(0, true);
  };

  const openPhoto = useCallback((photo) => navigation.navigate('PhotoDetail', { photo }), [navigation]);
  const renderItem = useCallback(({ item }) => <FeedCard item={item} onPress={openPhoto} />, [openPhoto]);
  const visiblePhotos = useMemo(() => photos.filter(p => !isBlocked(p.memberId)), [photos, isBlocked]);

  if (loading) {
    return (
      <View style={styles.skeletonList}>
        {[1, 2, 3].map(i => <SkeletonFeedCard key={i} />)}
      </View>
    );
  }

  if (photos.length === 0) {
    return (
      <EmptyState
        icon="📡"
        title="팔로우한 작가가 없어요"
        description="둘러보기에서 마음에 드는 작가를 팔로우해보세요"
        actionLabel="둘러보러 가기"
        onAction={() => navigation.navigate('ExploreTab')}
      />
    );
  }

  return (
    <FlatList
      data={visiblePhotos}
      keyExtractor={item => String(item.id)}
      contentContainerStyle={styles.list}
      renderItem={renderItem}
      onRefresh={handleRefresh}
      refreshing={refreshing}
      onEndReached={handleLoadMore}
      onEndReachedThreshold={0.4}
      ListFooterComponent={
        loadingMore ? (
          <ActivityIndicator color={COLORS.primary} style={{ paddingVertical: 20 }} />
        ) : !hasMore && photos.length > 0 ? (
          <Text style={styles.noMore}>모든 피드를 불러왔습니다.</Text>
        ) : null
      }
    />
  );
}

const styles = StyleSheet.create({
  list: { paddingBottom: 24, backgroundColor: COLORS.bg },
  skeletonList: { backgroundColor: COLORS.bg, paddingTop: SPACING.md },

  card: { backgroundColor: COLORS.white, marginBottom: 12, overflow: 'hidden' },
  image: { width: '100%', height: 320, backgroundColor: '#e0e0e0' },
  info: { padding: SPACING.md },

  authorRow: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm, gap: 8 },
  avatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: FONT.sm },
  authorName: { fontWeight: '700', color: COLORS.textPrimary, fontSize: FONT.sm },

  title: { fontSize: FONT.lg, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 4 },
  desc: { color: COLORS.textSecondary, lineHeight: 20, fontSize: FONT.sm, marginBottom: SPACING.sm },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },

  moodBadge: { flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  moodDot: { width: 6, height: 6, borderRadius: 3 },
  moodLabel: { fontSize: FONT.xs, fontWeight: '600' },
  likes: { color: COLORS.textMuted, fontSize: FONT.xs },
  date: { color: COLORS.textHint, fontSize: FONT.xs, marginLeft: 'auto' },

  noMore: { textAlign: 'center', color: COLORS.textHint, padding: SPACING.lg, fontSize: FONT.sm },
});
