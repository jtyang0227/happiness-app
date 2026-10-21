import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import PhotoCard from '../components/PhotoCard';
import { SkeletonPhotoCard } from '../components/SkeletonCard';
import EmptyState from '../components/EmptyState';
import { photoApi } from '../services/api';
import { useAuth } from '../store/AuthContext';
import { COLORS } from '../constants/colors';

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

  return (
    <FlatList
      // 사진 수가 홀수면 빈 칸을 하나 붙여 마지막 카드가 한 줄 전체로 늘어나지 않게
      data={photos.length % 2 ? [...photos, { id: '__spacer' }] : photos}
      keyExtractor={item => String(item.id)}
      numColumns={2}
      contentContainerStyle={styles.listContent}
      columnWrapperStyle={styles.row}
      refreshing={refreshing}
      onRefresh={handleRefresh}
      renderItem={({ item }) => item.id === '__spacer' ? <View style={styles.spacer} /> : (
        <PhotoCard photo={item} onPress={() => navigation.navigate('PhotoDetail', { photo: item })} />
      )}
      ListEmptyComponent={
        <EmptyState
          icon="🖼"
          title="아직 사진이 없어요"
          description="포트폴리오를 채울 첫 사진을 올려보세요"
          actionLabel="+ 사진 등록하기"
          onAction={() => navigation.navigate('PhotoFormTab')}
        />
      }
    />
  );
}

const styles = StyleSheet.create({
  listContent: { padding: 4, flexGrow: 1, backgroundColor: COLORS.bg },
  row: { marginHorizontal: 4 },
  spacer: { flex: 1, margin: 4 },   // PhotoCard와 같은 폭
  skeletonGrid: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', padding: 4, backgroundColor: COLORS.bg },
  skeletonCol: { width: '50%' },
});
