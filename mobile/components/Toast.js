import React from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { COLORS } from '../constants/colors';
import { RADIUS, SPACING } from '../constants/layout';

export default function Toast({ message, anim }) {
  return (
    <Animated.View style={[styles.container, { opacity: anim }]} pointerEvents="none">
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 36,
    left: SPACING.xl,
    right: SPACING.xl,
    backgroundColor: COLORS.dark,
    borderRadius: RADIUS.md,
    padding: 14,
    alignItems: 'center',
    elevation: 10,
  },
  text: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 14,
  },
});
