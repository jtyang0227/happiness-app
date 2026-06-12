import React, { useEffect, useState, useCallback } from 'react';
import {
  ActivityIndicator, FlatList, Image, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { photoApi } from '../services/api';
import { COLORS, MOOD_COLORS } from '../constants/colors';
import { FONT, RADIUS, SPACING } from '../constants/layout';

const MOODS = Object.entries(MOOD_COLORS).map(([key, val]) => ({ key, ...val }));

export default function ExploreScreen({ navigation }) {
  const [photos, setPhotos] = useState([]);
  const [keyword, setKeyword] = useState('');
  const [moodFilter, setMoodFilter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (kw = keyword, mood = moodFilter) => {
    try {
      const params = {};
      if (kw.trim()) params.keyword = kw.trim();
      if (mood) params.colorMood = mood;
      const res = await photoApi.getAll(params);
      setPhotos(res.data || res || []);
    } catch {
      setPhotos([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [keyword, moodFilter]);

  useEffect(() => { load(); }, []);

  const handleSearch = () => load(keyword, moodFilter);
  const handleMood = (key) => {
    const next = moodFilter === key ? null : key;
    setMoodFilter(next);
    load(keyword, next);
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
          {moodFilter || keyword.trim() ? `검색 결과 ${photos.length}건` : `사진 ${photos.length}장`}
        </Text>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

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
        <Text style={styles.empty}>
          {keyword.trim() || moodFilter ? '검색 결과가 없습니다.' : '아직 등록된 사진이 없습니다.'}
        </Text>
      }
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.bg },
  listContent: { paddingBottom: 24 },
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

  empty: { textAlign: 'center', color: COLORS.textHint, marginTop: 60, fontSize: FONT.base },
});
