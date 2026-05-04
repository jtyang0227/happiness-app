import React from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS } from '../constants/colors';
import { RADIUS, SPACING, FONT } from '../constants/layout';

export default function ListScreen({ photos, onPhotoPress }) {
  if (photos.length === 0) {
    return <Text style={styles.message}>등록된 사진이 없습니다.</Text>;
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {photos.map(photo => (
        <TouchableOpacity
          key={photo.id}
          style={styles.item}
          onPress={() => onPhotoPress(photo)}
        >
          <Image source={{ uri: photo.imageUrl }} style={styles.image} />
          <View style={styles.info}>
            <Text style={styles.title}>{photo.title}</Text>
            <Text style={styles.description} numberOfLines={2}>
              {photo.description || '설명 없음'}
            </Text>
            <Text style={styles.meta}>
              💗 {photo.likes || 0}  ⭐ {photo.favorites || 0}
            </Text>
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: SPACING.md },
  message: { marginTop: 48, textAlign: 'center', color: COLORS.textHint, fontSize: 15 },
  item: {
    flexDirection: 'row',
    marginBottom: SPACING.md,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.card,
    overflow: 'hidden',
    elevation: 2,
  },
  image: { width: 110, height: 110 },
  info: { flex: 1, padding: SPACING.sm + 2, justifyContent: 'space-between' },
  title: { fontSize: FONT.lg, fontWeight: '700', color: COLORS.textPrimary },
  description: { color: COLORS.textMuted, marginVertical: 4, fontSize: FONT.sm },
  meta: { color: COLORS.textHint, fontSize: FONT.sm },
});
