import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { COLORS } from '../constants/colors';
import { RADIUS, SPACING } from '../constants/layout';

function usePulse() {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 600, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 600, easing: Easing.linear, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return opacity;
}

function Block({ style, opacity }) {
  return <Animated.View style={[styles.block, style, { opacity }]} />;
}

export function SkeletonPhotoCard() {
  const opacity = usePulse();
  return (
    <View style={styles.photoCard}>
      <Block style={styles.photoImage} opacity={opacity} />
      <Block style={styles.photoLine1} opacity={opacity} />
      <Block style={styles.photoLine2} opacity={opacity} />
    </View>
  );
}

export function SkeletonFeedCard() {
  const opacity = usePulse();
  return (
    <View style={styles.feedCard}>
      <View style={styles.feedHeader}>
        <Block style={styles.feedAvatar} opacity={opacity} />
        <View>
          <Block style={styles.feedHeaderLine1} opacity={opacity} />
          <Block style={styles.feedHeaderLine2} opacity={opacity} />
        </View>
      </View>
      <Block style={styles.feedImage} opacity={opacity} />
      <View style={styles.feedTextArea}>
        <Block style={styles.feedTextLine1} opacity={opacity} />
        <Block style={styles.feedTextLine2} opacity={opacity} />
      </View>
    </View>
  );
}

export function SkeletonGatheringCard() {
  const opacity = usePulse();
  return (
    <View style={styles.gatheringCard}>
      <Block style={styles.gatheringImage} opacity={opacity} />
      <View style={styles.gatheringBody}>
        <Block style={styles.gatheringTitle} opacity={opacity} />
        <Block style={styles.gatheringDate} opacity={opacity} />
        <Block style={styles.gatheringBadge} opacity={opacity} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    backgroundColor: COLORS.border,
    borderRadius: 4,
  },

  /* SkeletonPhotoCard */
  photoCard: { flex: 1, margin: 4, paddingBottom: SPACING.md, backgroundColor: COLORS.white },
  photoImage: { width: '100%', height: 150, borderRadius: RADIUS.sm },
  photoLine1: { width: '80%', height: 12, marginTop: SPACING.sm },
  photoLine2: { width: '60%', height: 10, marginTop: 4 },

  /* SkeletonFeedCard */
  feedCard: { width: '100%', backgroundColor: COLORS.white, borderRadius: RADIUS.card, marginBottom: SPACING.md, overflow: 'hidden' },
  feedHeader: { flexDirection: 'row', alignItems: 'center', padding: SPACING.md, paddingHorizontal: SPACING.lg },
  feedAvatar: { width: 32, height: 32, borderRadius: 16 },
  feedHeaderLine1: { width: 100, height: 12, marginLeft: 10 },
  feedHeaderLine2: { width: 60, height: 10, marginTop: 4, marginLeft: 10 },
  feedImage: { width: '100%', height: 240 },
  feedTextArea: { padding: SPACING.md, paddingHorizontal: SPACING.lg },
  feedTextLine1: { width: '70%', height: 14 },
  feedTextLine2: { width: '90%', height: 12, marginTop: 6 },

  /* SkeletonGatheringCard */
  gatheringCard: { width: '100%', backgroundColor: COLORS.white, borderRadius: RADIUS.card, marginBottom: SPACING.md, overflow: 'hidden' },
  gatheringImage: { width: '100%', height: 180, borderRadius: 0 },
  gatheringBody: { padding: SPACING.md, paddingHorizontal: SPACING.lg },
  gatheringTitle: { width: '60%', height: 16 },
  gatheringDate: { width: '40%', height: 12, marginTop: SPACING.sm },
  gatheringBadge: { width: 120, height: 22, borderRadius: 11, marginTop: SPACING.md },
});
