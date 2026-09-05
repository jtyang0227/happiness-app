import React, { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import PhotoCard from '../components/PhotoCard';
import { SkeletonPhotoCard } from '../components/SkeletonCard';
import EmptyState from '../components/EmptyState';
import { photoApi } from '../services/api';
import { useAuth } from '../store/AuthContext';
import { COLORS } from '../constants/colors';

function packRows(photos) {
  const rows = [];
  let row = [];
  let used = 0;
  for (const photo of photos) {
    const span = photo.gridColSpan || 6;
    if (used + span > 12 && row.length > 0) {
      rows.push(row);
      row = [];
      used = 0;
    }
    row.push(photo);
    used += span;
  }
  if (row.length > 0) rows.push(row);
  return rows;
}

export default function GalleryScreen({ navigation }) {
  const { user } = useAuth();
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) { setLoading(false); return; }
    try {
      const res = await photoApi.getByMember(user.id);
      setPhotos(res.data || res || []);
    } catch {
      setPhotos([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  const handleRefresh = () => {
    setRefreshing(true);
    load();
  };

  if (loading) {
    return (
      <View style={styles.skeletonGrid}>
        {[1, 2, 3, 4].map(i => (
          <View key={i} style={styles.skeletonCol}>
            <SkeletonPhotoCard />
          </View>
        ))}
      </View>
    );
  }

  if (photos.length === 0) {
    return (
      <EmptyState
        icon="🖼"
        title="아직 사진이 없어요"
        description="포트폴리오를 채울 첫 사진을 올려보세요"
        actionLabel="+ 사진 등록하기"
        onAction={() => navigation.navigate('PhotoFormTab')}
      />
    );
  }

  const rows = packRows(photos);

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} />
      }
    >
      {rows.map((row, ri) => (
        <View key={ri} style={styles.row}>
          {row.map(photo => (
            <View key={photo.id} style={{ flex: photo.gridColSpan || 6 }}>
              <PhotoCard photo={photo} onPress={() => navigation.navigate('PhotoDetail', { photo })} />
            </View>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 8 },
  row: { flexDirection: 'row', alignItems: 'stretch' },
  skeletonGrid: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', padding: 4, backgroundColor: COLORS.bg },
  skeletonCol: { width: '50%' },
});
