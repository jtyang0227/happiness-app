import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS } from '../constants/colors';
import { RADIUS, SPACING, FONT } from '../constants/layout';

export default function PhotoCard({ photo, onPress }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <Image source={{ uri: photo.imageUrl }} style={styles.image} />
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>{photo.title}</Text>
        <Text style={styles.meta}>
          💗 {photo.likes || 0}  ⭐ {photo.favorites || 0}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    margin: 6,
    borderRadius: RADIUS.card,
    backgroundColor: COLORS.card,
    overflow: 'hidden',
    elevation: 2,
  },
  image: { width: '100%', height: 140 },
  body: { padding: SPACING.sm + 2 },
  title: {
    fontSize: FONT.base,
    fontWeight: '700',
    marginBottom: 4,
    color: COLORS.textPrimary,
  },
  meta: { color: COLORS.textMuted, fontSize: FONT.sm },
});
