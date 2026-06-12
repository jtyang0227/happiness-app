import React, { useEffect, useState, useCallback } from 'react';
import {
  ActivityIndicator, FlatList, Image, StyleSheet,
  Text, TouchableOpacity, View,
} from 'react-native';
import { photoApi } from '../services/api';
import { useAuth } from '../store/AuthContext';
import { COLORS, MOOD_COLORS } from '../constants/colors';
import { FONT, RADIUS, SPACING } from '../constants/layout';

const PAGE_SIZE = 20;

export default function FeedScreen({ navigation }) {
  const { user } = useAuth();
  const [photos, setPhotos] = useState([]);
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
      setPhotos(prev => reset ? items : [...prev, ...items]);
      setHasMore(items.length === PAGE_SIZE);
      setPage(p);
    } catch {
      setPhotos(reset ? [] : photos);
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

  const renderItem = ({ item }) => {
    const mood = item.colorMood && MOOD_COLORS[item.colorMood];
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('PhotoDetail', { photo: item })}
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
            {mood && (
              <View style={[styles.moodBadge, { backgroundColor: mood.bg }]}>
                <View style={[styles.moodDot, { backgroundColor: mood.dot }]} />
                <Text style={[styles.moodLabel, { color: mood.dot }]}>{mood.label}</Text>
              </View>
            )}
            <Text style={styles.likes}>💗 {item.likesCount || 0}</Text>
            <Text style={styles.date}>
              {new Date(item.createdAt).toLocaleDateString('ko-KR')}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (photos.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyIcon}>📸</Text>
        <Text style={styles.emptyTitle}>피드가 비어있습니다</Text>
        <Text style={styles.emptyDesc}>
          팔로우한 작가의 새 사진이 여기에 나타납니다.{'\n'}탐색 탭에서 마음에 드는 작가를 팔로우해보세요.
        </Text>
        <TouchableOpacity style={styles.exploreBtn} onPress={() => navigation.navigate('ExploreTab')}>
          <Text style={styles.exploreBtnText}>탐색하러 가기</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <FlatList
      data={photos}
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: COLORS.bg, padding: SPACING.xl },
  list: { paddingBottom: 24, backgroundColor: COLORS.bg },

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

  emptyIcon:  { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: FONT.xl, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 8 },
  emptyDesc:  { color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  exploreBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 28, paddingVertical: 12,
    borderRadius: RADIUS.lg },
  exploreBtnText: { color: '#fff', fontWeight: '700', fontSize: FONT.base },
});
