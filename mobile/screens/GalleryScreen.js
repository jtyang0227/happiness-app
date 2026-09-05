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
      data={photos}
      keyExtractor={item => String(item.id)}
      numColumns={2}
      contentContainerStyle={styles.listContent}
      columnWrapperStyle={styles.row}
      refreshing={refreshing}
      onRefresh={handleRefresh}
      renderItem={({ item }) => (
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
  skeletonGrid: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', padding: 4, backgroundColor: COLORS.bg },
  skeletonCol: { width: '50%' },
});
