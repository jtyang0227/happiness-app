import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import PhotoCard from '../components/PhotoCard';
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

export default function GalleryScreen({ photos, loading, onPhotoPress }) {
  if (loading && photos.length === 0) {
    return <Text style={styles.message}>로딩 중...</Text>;
  }
  if (photos.length === 0) {
    return <Text style={styles.message}>등록된 사진이 없습니다.{'\n'}등록 탭에서 새 사진을 추가해보세요.</Text>;
  }

  const rows = packRows(photos);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {rows.map((row, ri) => (
        <View key={ri} style={styles.row}>
          {row.map(photo => (
            <View key={photo.id} style={{ flex: photo.gridColSpan || 6 }}>
              <PhotoCard photo={photo} onPress={() => onPhotoPress(photo)} />
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
  message: { marginTop: 48, textAlign: 'center', color: COLORS.textHint, fontSize: 15, lineHeight: 24 },
});
