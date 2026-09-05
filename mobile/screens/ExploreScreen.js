import React, { useEffect, useState, useCallback } from 'react';
import {
  FlatList, Image, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { photoApi } from '../services/api';
import { COLORS, MOOD_COLORS, GENRE_LIST } from '../constants/colors';
import { FONT, RADIUS, SPACING } from '../constants/layout';
import { SkeletonPhotoCard } from '../components/SkeletonCard';
import EmptyState from '../components/EmptyState';

const MOODS = Object.entries(MOOD_COLORS).map(([key, val]) => ({ key, ...val }));
const GENRES = [{ code: null, label: '전체', emoji: '✦' }, ...GENRE_LIST];

export default function ExploreScreen({ navigation }) {
  const [photos, setPhotos] = useState([]);
  const [keyword, setKeyword] = useState('');
  const [moodFilter, setMoodFilter] = useState(null);
  const [genre, setGenre] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (kw = keyword, mood = moodFilter, g = genre) => {
    try {
      const params = {};
      if (kw.trim()) params.keyword = kw.trim();
      if (mood) params.colorMood = mood;
      if (g) params.genre = g;
      const res = await photoApi.getAll(params);
      setPhotos(res.data || res || []);
    } catch {
      setPhotos([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [keyword, moodFilter, genre]);

  useEffect(() => { load(); }, []);

  const handleSearch = () => load(keyword, moodFilter, genre);
  const handleGenre = (code) => {
    setGenre(code);
    load(keyword, moodFilter, code);
  };
  const handleMood = (key) => {
    const next = moodFilter === key ? null : key;
    setMoodFilter(next);
    load(keyword, next, genre);
  };
  const handleRefresh = () => { setRefreshing(true); load(); };

  const renderPhoto = ({ item, index }) => {
    const isLeft = index % 2 === 0;
    return (
      <TouchableOpacity
        style={[styles.photoCard, isLeft ? { marginRight: 4 } : { marginLeft: 4 }]}
        onPress={() => navigation.navigate('PhotoDetail', { photo: item })}
        activeOpacity={0.85}
      >
        <Image source={{ uri: item.thumbnailUrl || item.imageUrl }} style={styles.photoImage} />
        <View style={styles.photoInfo}>
          <Text style={styles.photoTitle} numberOfLines={1}>{item.title}</Text>
          {item.colorMood && MOOD_COLORS[item.colorMood] && (
            <View style={[styles.moodBadge, { backgroundColor: MOOD_COLORS[item.colorMood].bg }]}>
              <View style={[styles.moodDot, { backgroundColor: MOOD_COLORS[item.colorMood].dot }]} />
              <Text style={[styles.moodText, { color: MOOD_COLORS[item.colorMood].dot }]}>
                {MOOD_COLORS[item.colorMood].label}
              </Text>
            </View>
          )}
          <Text style={styles.likeText}>💗 {item.likesCount || 0}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const ListHeader = (
    <View>
      {/* 검색바 */}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="사진 검색..."
          placeholderTextColor={COLORS.textHint}
          value={keyword}
          onChangeText={setKeyword}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
          <Text style={styles.searchBtnText}>🔍</Text>
        </TouchableOpacity>
      </View>

      {/* 장르 필터 */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.genreScroll}
        contentContainerStyle={styles.genreScrollContent}
      >
        {GENRES.map(g => {
          const active = genre === g.code;
          return (
            <TouchableOpacity
              key={g.code ?? 'all'}
              style={[styles.genreChip, active && styles.genreChipActive]}
              onPress={() => handleGenre(g.code)}
            >
              <Text style={styles.genreEmoji}>{g.emoji}</Text>
              <Text style={[styles.genreChipText, active && styles.genreChipTextActive]}>
                {g.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* 무드 필터 */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.moodScroll}
        contentContainerStyle={styles.moodScrollContent}
      >
        <TouchableOpacity
          style={[styles.moodChip, !moodFilter && styles.moodChipActive]}
          onPress={() => handleMood(null)}
        >
          <Text style={[styles.moodChipText, !moodFilter && styles.moodChipTextActive]}>전체</Text>
        </TouchableOpacity>
        {MOODS.map(m => (
          <TouchableOpacity
            key={m.key}
            style={[styles.moodChip, moodFilter === m.key && { backgroundColor: m.bg, borderColor: m.dot }]}
            onPress={() => handleMood(m.key)}
          >
            <View style={[styles.moodDot, { backgroundColor: m.dot }]} />
            <Text style={[styles.moodChipText, moodFilter === m.key && { color: m.dot }]}>
              {m.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {!loading && (
        <Text style={styles.resultCount}>
          {moodFilter || genre || keyword.trim() ? `검색 결과 ${photos.length}건` : `사진 ${photos.length}장`}
        </Text>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.skeletonGrid}>
        {[1, 2, 3, 4, 5, 6].map(i => (
          <View key={i} style={styles.skeletonCol}>
            <SkeletonPhotoCard />
          </View>
        ))}
      </View>
    );
  }

  const isSearching = !!(keyword.trim() || moodFilter || genre);

  return (
    <FlatList
      data={photos}
      keyExtractor={item => String(item.id)}
      numColumns={2}
      contentContainerStyle={styles.listContent}
      columnWrapperStyle={styles.row}
      ListHeaderComponent={ListHeader}
      renderItem={renderPhoto}
      onRefresh={handleRefresh}
      refreshing={refreshing}
      ListEmptyComponent={
        isSearching ? (
          <EmptyState
            icon="🔍"
            title="검색 결과가 없습니다"
            description="다른 키워드나 필터로 다시 검색해보세요"
          />
        ) : (
          <EmptyState icon="🖼" title="아직 등록된 사진이 없습니다" />
        )
      }
    />
  );
}

const styles = StyleSheet.create({
  listContent: { paddingBottom: 24 },
  skeletonGrid: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', padding: 4, backgroundColor: COLORS.bg },
  skeletonCol: { width: '50%' },
  row: { marginHorizontal: SPACING.md, marginBottom: 8 },

  searchRow: { flexDirection: 'row', margin: SPACING.md, marginBottom: SPACING.sm, gap: 8 },
  searchInput: {
    flex: 1, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md,
    paddingHorizontal: 14, paddingVertical: 10, backgroundColor: COLORS.white,
    color: COLORS.textPrimary, fontSize: FONT.base,
  },
  searchBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 16, borderRadius: RADIUS.md,
    justifyContent: 'center', alignItems: 'center' },
  searchBtnText: { fontSize: 18 },

  genreScroll: { marginBottom: SPACING.sm },
  genreScrollContent: { paddingHorizontal: SPACING.md, gap: 6 },
  genreChip: { flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.white },
  genreChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  genreEmoji: { fontSize: 12 },
  genreChipText: { fontSize: FONT.xs, fontWeight: '600', color: COLORS.textSecondary },
  genreChipTextActive: { color: '#fff' },

  moodScroll: { marginBottom: SPACING.sm },
  moodScrollContent: { paddingHorizontal: SPACING.md, gap: 6 },
  moodChip: { flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.white },
  moodChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  moodChipText: { fontSize: FONT.xs, fontWeight: '600', color: COLORS.textSecondary },
  moodChipTextActive: { color: '#fff' },
  moodDot: { width: 8, height: 8, borderRadius: 4 },
  moodText: { fontSize: FONT.xs, fontWeight: '600' },

  resultCount: { color: COLORS.textMuted, fontSize: FONT.xs, marginHorizontal: SPACING.md,
    marginBottom: SPACING.sm },

  photoCard: { flex: 1, backgroundColor: COLORS.white, borderRadius: RADIUS.card,
    overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border },
  photoImage: { width: '100%', height: 160, backgroundColor: '#e0e0e0' },
  photoInfo: { padding: 10 },
  photoTitle: { fontWeight: '700', color: COLORS.textPrimary, fontSize: FONT.sm, marginBottom: 4 },
  moodBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, marginBottom: 4, gap: 4 },
  likeText: { color: COLORS.textMuted, fontSize: FONT.xs },
});
