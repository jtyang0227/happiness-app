import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { photoApi } from '../services/api';
import { COLORS } from '../constants/colors';
import { RADIUS, SPACING, FONT } from '../constants/layout';

/**
 * 비슷한 사진 가로 줄 (웹 SimilarPhotos와 같은 API, PLANNING_inside-menus-upgrade.md P0-A 모바일 후속).
 * 결과가 없거나 불러오지 못하면 섹션째 숨긴다(부가 정보). 고르면 onSelect(photo).
 */
export default function SimilarPhotos({ photoId, onSelect }) {
  const [photos, setPhotos] = useState(null);   // null = 불러오는 중

  useEffect(() => {
    let alive = true;
    setPhotos(null);
    photoApi.getSimilar(photoId)
      .then(res => { if (alive) setPhotos(res?.data ?? []); })
      .catch(() => { if (alive) setPhotos([]); });
    return () => { alive = false; };
  }, [photoId]);

  if (photos && photos.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>비슷한 사진</Text>
      <Text style={styles.sub}>장르·색감이 비슷한 다른 작가의 사진</Text>
      {photos === null ? (
        <View style={styles.row}>
          {[0, 1, 2].map(i => <View key={i} style={[styles.cell, styles.skeleton]} />)}
        </View>
      ) : (
        <FlatList
          horizontal
          data={photos}
          keyExtractor={p => String(p.id)}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: SPACING.sm }}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => onSelect?.(item)}
              accessibilityRole="button"
              accessibilityLabel={`${item.title || '사진'}${item.memberName ? `, ${item.memberName}` : ''}`}
            >
              <Image source={{ uri: item.thumbnailUrl || item.imageUrl }} style={styles.cell} />
              {!!item.memberName && <Text style={styles.author} numberOfLines={1}>{item.memberName}</Text>}
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const CELL = 108;
const styles = StyleSheet.create({
  wrap: { marginTop: SPACING.xl, marginBottom: SPACING.sm },
  title: { fontSize: FONT.lg, fontWeight: '700', color: COLORS.textPrimary },
  sub: { fontSize: FONT.sm, color: COLORS.textMuted, marginTop: 2, marginBottom: SPACING.md },
  row: { flexDirection: 'row', gap: SPACING.sm },
  cell: { width: CELL, height: CELL, borderRadius: RADIUS.sm, backgroundColor: COLORS.border },
  skeleton: { opacity: 0.6 },
  author: { width: CELL, fontSize: 12, color: COLORS.textMuted, marginTop: 4 },
});
