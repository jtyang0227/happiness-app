import React from 'react';
import { FlatList, StyleSheet, Text } from 'react-native';
import PhotoCard from '../components/PhotoCard';
import { COLORS } from '../constants/colors';

export default function GalleryScreen({ photos, loading, onPhotoPress }) {
  if (loading && photos.length === 0) {
    return <Text style={styles.message}>로딩 중...</Text>;
  }
  if (photos.length === 0) {
    return <Text style={styles.message}>등록된 사진이 없습니다.{'\n'}등록 탭에서 새 사진을 추가해보세요.</Text>;
  }

  return (
    <FlatList
      data={photos}
      keyExtractor={item => item.id.toString()}
      numColumns={2}
      contentContainerStyle={styles.container}
      renderItem={({ item }) => (
        <PhotoCard photo={item} onPress={() => onPhotoPress(item)} />
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { padding: 12 },
  message: { marginTop: 48, textAlign: 'center', color: COLORS.textHint, fontSize: 15, lineHeight: 24 },
});
