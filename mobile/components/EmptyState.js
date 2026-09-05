import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS } from '../constants/colors';
import { RADIUS, SPACING, FONT } from '../constants/layout';

export default function EmptyState({ icon, title, description, actionLabel, onAction }) {
  return (
    <View style={styles.container}>
      {icon && <Text style={styles.icon}>{icon}</Text>}
      {title && <Text style={styles.title}>{title}</Text>}
      {description && <Text style={styles.description}>{description}</Text>}
      {actionLabel && onAction && (
        <TouchableOpacity style={styles.action} onPress={onAction} activeOpacity={0.75}>
          <Text style={styles.actionText}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl + 8,
    paddingVertical: 60,
  },
  icon: { fontSize: 48, marginBottom: SPACING.lg },
  title: { fontSize: FONT.lg, fontWeight: '600', color: COLORS.textSecondary, textAlign: 'center' },
  description: { fontSize: FONT.md, color: COLORS.textMuted, textAlign: 'center', marginTop: SPACING.sm, lineHeight: 22 },
  action: {
    marginTop: SPACING.xl,
    height: 44,
    paddingHorizontal: SPACING.xl,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionText: { color: COLORS.white, fontSize: FONT.base, fontWeight: '600' },
});
