import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS, MOOD_COLORS } from '../constants/colors';
import { RADIUS, SPACING, FONT } from '../constants/layout';

function MoodBadge({ mood }) {
  const m = MOOD_COLORS[mood];
  if (!m) return null;
  return (
    <View style={[styles.badge, { backgroundColor: m.bg }]}>
      <View style={[styles.badgeDot, { backgroundColor: m.dot }]} />
      <Text style={[styles.badgeText, { color: m.dot }]}>{m.label}</Text>
    </View>
  );
}

export default function PhotoCard({ photo, onPress }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.imageWrap}>
        <Image source={{ uri: photo.imageUrl }} style={styles.image} />
        {photo.colorMood && (
          <View style={styles.badgeWrap}>
            <MoodBadge mood={photo.colorMood} />
          </View>
        )}
      </View>
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>{photo.title}</Text>
        <Text style={styles.meta}>
          💗 {photo.likesCount || 0}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    margin: 4,
    borderRadius: RADIUS.card,
    backgroundColor: COLORS.card,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  imageWrap: { position: 'relative' },
  image: { width: '100%', height: 140 },
  badgeWrap: {
    position: 'absolute',
    top: 6,
    right: 6,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 4,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  body: { padding: SPACING.sm + 2 },
  title: {
    fontSize: FONT.base,
    fontWeight: '700',
    marginBottom: 4,
    color: COLORS.textPrimary,
  },
  meta: { color: COLORS.textMuted, fontSize: FONT.sm },
});
