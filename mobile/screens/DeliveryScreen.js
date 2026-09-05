import React, { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { deliveryApi } from '../src/api/deliveryApi';
import { COLORS } from '../constants/colors';
import { FONT, RADIUS, SPACING } from '../constants/layout';
import EmptyState from '../components/EmptyState';

const STATUS_META = {
  PENDING:  { label: '대기 중', color: COLORS.textMuted, bg: COLORS.bg },
  REVIEWED: { label: '열람됨',  color: '#2563eb',         bg: '#eff6ff' },
  APPROVED: { label: '승인됨',  color: COLORS.success,    bg: '#f0fff4' },
  REJECTED: { label: '거절됨',  color: COLORS.danger,     bg: '#fff0f0' },
};

const WEB_ORIGIN = __DEV__ ? 'http://localhost:3000' : 'https://app.example.com';

function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

export default function DeliveryScreen() {
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    deliveryApi.getMyList()
      .then(data => setDeliveries(Array.isArray(data) ? data : []))
      .catch(() => setDeliveries([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCopyLink = async (token) => {
    const url = `${WEB_ORIGIN}/proof/${token}`;
    await Clipboard.setStringAsync(url);
    Alert.alert('복사 완료', '납품 링크가 클립보드에 복사되었습니다.');
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>납품 관리</Text>
      </View>

      <FlatList
        data={deliveries}
        keyExtractor={item => String(item.id)}
        refreshing={loading}
        onRefresh={load}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          !loading ? (
            <EmptyState
              icon="📦"
              title="납품 세트가 없습니다"
              description="웹에서 사진을 선택해 새 납품 세트를 만들어보세요"
            />
          ) : null
        }
        renderItem={({ item }) => {
          const meta = STATUS_META[item.status] || STATUS_META.PENDING;
          return (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
                <View style={[styles.badge, { backgroundColor: meta.bg }]}>
                  <Text style={[styles.badgeText, { color: meta.color }]}>{meta.label}</Text>
                </View>
              </View>
              <Text style={styles.meta}>👤 {item.clientName || '클라이언트 미지정'}</Text>
              <Text style={styles.meta}>📷 사진 {item.photoCount}장 · ❤️ {item.likedCount}장 선택</Text>
              <Text style={styles.date}>생성일 {formatDate(item.createdAt)}</Text>

              <TouchableOpacity style={styles.copyBtn} onPress={() => handleCopyLink(item.token)}>
                <Text style={styles.copyBtnText}>🔗 링크 복사</Text>
              </TouchableOpacity>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
    backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  headerTitle: { fontSize: FONT.xl, fontWeight: '800', color: COLORS.textPrimary },
  list: { padding: SPACING.md, paddingBottom: 40, flexGrow: 1 },
  card: {
    backgroundColor: COLORS.white, borderRadius: RADIUS.card,
    padding: SPACING.lg, marginBottom: SPACING.sm,
    borderWidth: 1, borderColor: COLORS.border,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.sm },
  title: { flex: 1, fontSize: FONT.base, fontWeight: '700', color: COLORS.textPrimary, marginRight: SPACING.sm },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  badgeText: { fontSize: FONT.sm - 1, fontWeight: '700' },
  meta: { fontSize: FONT.sm, color: COLORS.textSecondary, marginBottom: 2 },
  date: { fontSize: FONT.sm - 1, color: COLORS.textHint, marginBottom: SPACING.sm },
  copyBtn: {
    marginTop: SPACING.xs, paddingVertical: 10, borderRadius: RADIUS.sm,
    borderWidth: 1, borderColor: COLORS.border, alignItems: 'center',
  },
  copyBtnText: { fontSize: FONT.sm, fontWeight: '600', color: COLORS.primary },
});
