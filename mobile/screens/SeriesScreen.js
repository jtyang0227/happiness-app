import React, { useEffect, useState, useCallback } from 'react';
import {
  ActivityIndicator, FlatList, Image, StyleSheet,
  Text, TouchableOpacity, View,
} from 'react-native';
import { seriesApi, photoApi } from '../services/api';
import { useAuth } from '../store/AuthContext';
import { COLORS } from '../constants/colors';
import { FONT, RADIUS, SPACING } from '../constants/layout';

function SeriesCollage({ previewPhotos, coverUrl, height = 140 }) {
  const photos = (previewPhotos?.length ? previewPhotos : [coverUrl]).filter(Boolean);

  if (photos.length === 0) {
    return (
      <View style={[styles.collage, styles.collageEmpty, { height }]}>
        <Text style={styles.collageEmptyIcon}>📷</Text>
      </View>
    );
  }

  if (photos.length === 1) {
    return <Image source={{ uri: photos[0] }} style={[styles.collage, { height }]} />;
  }

  if (photos.length === 2) {
    return (
      <View style={[styles.collageRow, { height }]}>
        {photos.map((uri, i) => (
          <Image key={i} source={{ uri }} style={[styles.collageHalf, i > 0 && { marginLeft: 1 }]} />
        ))}
      </View>
    );
  }

  // 3장 이상 — 60/40 콜라주
  return (
    <View style={[styles.collageRow, { height }]}>
      <Image source={{ uri: photos[0] }} style={styles.collageMain} />
      <View style={styles.collageSideCol}>
        <Image source={{ uri: photos[1] }} style={styles.collageSide} />
        <Image source={{ uri: photos[2] }} style={[styles.collageSide, { marginTop: 1 }]} />
      </View>
    </View>
  );
}

export default function SeriesScreen({ navigation }) {
  const { user } = useAuth();
  const [series, setSeries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({});
  const [seriesPhotos, setSeriesPhotos] = useState({});

  const load = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await seriesApi.getByMember(user.id);
      setSeries(res.data || res || []);
    } catch {
      setSeries([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  const handleToggle = async (id) => {
    const next = !expanded[id];
    setExpanded(e => ({ ...e, [id]: next }));
    if (next && !seriesPhotos[id]) {
      try {
        const res = await seriesApi.getOne(id);
        const s = res.data || res;
        setSeriesPhotos(p => ({ ...p, [id]: s.photos || [] }));
      } catch {
        setSeriesPhotos(p => ({ ...p, [id]: [] }));
      }
    }
  };

  const renderItem = ({ item }) => {
    const open = expanded[item.id];
    const photos = seriesPhotos[item.id] || [];

    return (
      <View style={styles.card}>
        <TouchableOpacity onPress={() => handleToggle(item.id)} activeOpacity={0.85}>
          <SeriesCollage previewPhotos={item.previewPhotos} coverUrl={item.coverUrl} />
          <View style={styles.cardMeta}>
            <View style={{ flex: 1 }}>
              <Text style={styles.seriesTitle} numberOfLines={1}>{item.title}</Text>
              {item.description ? (
                <Text style={styles.seriesDesc} numberOfLines={1}>{item.description}</Text>
              ) : null}
              <Text style={styles.seriesMeta}>{item.photoCount ?? 0}장</Text>
            </View>
            <Text style={[styles.chevron, open && styles.chevronOpen]}>{open ? '▲' : '▼'}</Text>
          </View>
        </TouchableOpacity>

        {open && (
          <View style={styles.photosGrid}>
            {photos.length === 0 ? (
              <Text style={styles.emptyPhotos}>사진이 없습니다.</Text>
            ) : (
              <View style={styles.gridRow}>
                {photos.map(p => (
                  <TouchableOpacity
                    key={p.id}
                    style={styles.gridItem}
                    onPress={() => navigation.navigate('PhotoDetail', { photo: p })}
                    activeOpacity={0.8}
                  >
                    <Image
                      source={{ uri: p.thumbnailUrl || p.imageUrl }}
                      style={styles.gridImage}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <FlatList
      data={series}
      keyExtractor={item => String(item.id)}
      contentContainerStyle={styles.list}
      onRefresh={load}
      refreshing={loading}
      renderItem={renderItem}
      ListEmptyComponent={
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>📚</Text>
          <Text style={styles.emptyText}>시리즈가 없습니다.</Text>
          <Text style={styles.emptyHint}>웹에서 시리즈를 만들어보세요.</Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: COLORS.bg, paddingTop: 80 },
  list: { padding: SPACING.md, paddingBottom: 24, backgroundColor: COLORS.bg, flexGrow: 1 },

  card: { backgroundColor: COLORS.white, borderRadius: RADIUS.card, marginBottom: 12,
    borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },

  collage: { width: '100%', backgroundColor: '#e0e0e0' },
  collageEmpty: { justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f0f8' },
  collageEmptyIcon: { fontSize: 32 },
  collageRow: { flexDirection: 'row' },
  collageHalf: { flex: 1, height: '100%', backgroundColor: '#e0e0e0' },
  collageMain: { flex: 0.6, height: '100%', backgroundColor: '#e0e0e0' },
  collageSideCol: { flex: 0.4, marginLeft: 1 },
  collageSide: { flex: 1, backgroundColor: '#e0e0e0' },

  cardMeta: { flexDirection: 'row', alignItems: 'center',
    padding: SPACING.md, justifyContent: 'space-between' },

  seriesTitle: { fontSize: FONT.md, fontWeight: '700', color: COLORS.textPrimary },
  seriesDesc:  { fontSize: FONT.xs, color: COLORS.textSecondary, marginTop: 2 },
  seriesMeta:  { fontSize: FONT.xs, color: COLORS.textHint, marginTop: 4 },

  chevron:     { color: COLORS.textMuted, fontSize: 12, paddingLeft: 8 },
  chevronOpen: { color: COLORS.primary },

  photosGrid: { paddingHorizontal: SPACING.md, paddingBottom: SPACING.md },
  gridRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  gridItem: { width: 96, height: 96, borderRadius: RADIUS.md, overflow: 'hidden' },
  gridImage: { width: '100%', height: '100%', backgroundColor: '#e0e0e0' },
  emptyPhotos: { color: COLORS.textHint, textAlign: 'center', paddingVertical: SPACING.md, fontSize: FONT.sm },

  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: FONT.lg, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 8 },
  emptyHint: { color: COLORS.textHint, fontSize: FONT.sm },
});
