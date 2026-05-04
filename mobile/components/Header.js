import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../store/AuthContext';
import { COLORS } from '../constants/colors';
import { SPACING, FONT } from '../constants/layout';

export default function Header({ onLogoPress }) {
  const { user, logout } = useAuth();

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={onLogoPress}>
        <Text style={styles.logo}>
          <Text style={styles.logoAccent}>✦ </Text>Cosmos
        </Text>
      </TouchableOpacity>
      <View style={styles.right}>
        <Text style={styles.userName}>{user?.name}</Text>
        <TouchableOpacity onPress={logout}>
          <Text style={styles.logoutBtn}>로그아웃</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: 14,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  logo: {
    fontSize: FONT.xl,
    fontWeight: '800',
    color: COLORS.dark,
  },
  logoAccent: {
    color: COLORS.primary,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userName: {
    fontSize: FONT.md,
    color: COLORS.textMuted,
    fontWeight: '500',
    marginRight: 12,
  },
  logoutBtn: {
    fontSize: FONT.sm,
    color: COLORS.primary,
    fontWeight: '600',
  },
});
