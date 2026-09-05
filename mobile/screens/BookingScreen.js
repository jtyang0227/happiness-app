import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert, SectionList, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { bookingApi } from '../src/api/bookingApi';
import { COLORS } from '../constants/colors';
import { FONT, RADIUS, SPACING } from '../constants/layout';
import EmptyState from '../components/EmptyState';

const SHOOT_LABELS = {
  WEDDING: '💍 웨딩', SNAP: '📷 스냅', PROFILE: '👤 프로필',
  MATERNITY: '🌸 만삭', NEWBORN: '👶 신생아', COMMERCIAL: '📦 상업', CUSTOM: '✏️ 협의',
};

const SECTION_ORDER = [
  { key: 'REQUESTED', title: '대기 중' },
  { key: 'CONFIRMED', title: '확정됨' },
  { key: 'COMPLETED', title: '완료' },
  { key: 'CANCELLED', title: '취소/거절' },
];

function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

export default function BookingScreen({ navigation }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    bookingApi.getMyBookings()
      .then(data => setBookings(Array.isArray(data) ? data : []))
      .catch(() => setBookings([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleConfirm = (id) => {
    Alert.alert('예약 확정', '이 예약을 확정하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '확정',
        onPress: async () => {
          setActionLoading(id);
          try {
            await bookingApi.confirmBooking(id);
            load();
          } catch {
            Alert.alert('오류', '확정 처리에 실패했습니다.');
          } finally {
            setActionLoading(null);
          }
        },
      },
    ]);
  };

  const handleReject = (id) => {
    Alert.alert('예약 거절', '이 예약을 거절하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '거절', style: 'destructive',
        onPress: async () => {
          setActionLoading(id);
          try {
            await bookingApi.rejectBooking(id);
            load();
          } catch {
            Alert.alert('오류', '거절 처리에 실패했습니다.');
          } finally {
            setActionLoading(null);
          }
        },
      },
    ]);
  };

  const openAvailabilitySettings = () => {
    navigation.navigate && navigation.navigate('AvailabilitySettings');
  };

  const sections = SECTION_ORDER
    .map(s => ({ ...s, data: bookings.filter(b => b.status === s.key) }))
    .filter(s => s.data.length > 0);

  if (!loading && bookings.length === 0) {
    return (
      <View style={{ flex: 1 }}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>예약 관리</Text>
          <TouchableOpacity onPress={openAvailabilitySettings}>
            <Text style={styles.settingsLink}>⚙ 설정</Text>
          </TouchableOpacity>
        </View>
        <EmptyState
          icon="📅"
          title="예약이 없습니다"
          description="가용 시간을 설정해두면 클라이언트가 예약을 요청할 수 있어요"
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>예약 관리</Text>
        <TouchableOpacity onPress={openAvailabilitySettings}>
          <Text style={styles.settingsLink}>⚙ 설정</Text>
        </TouchableOpacity>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={item => String(item.id)}
        refreshing={loading}
        onRefresh={load}
        contentContainerStyle={styles.list}
        renderSectionHeader={({ section }) => (
          <Text style={styles.sectionTitle}>{section.title} ({section.data.length})</Text>
        )}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.shootType}>{SHOOT_LABELS[item.shootType] || item.shootType || '촬영'}</Text>
            <Text style={styles.meta}>📅 {formatDate(item.shootDate)} {item.shootTime ? `· ${item.shootTime}` : ''}</Text>
            <Text style={styles.client}>👤 {item.clientName || '-'}</Text>
            {item.clientPhone ? <Text style={styles.meta}>📞 {item.clientPhone}</Text> : null}
            {item.memo ? <Text style={styles.memo}>{item.memo}</Text> : null}

            {item.status === 'REQUESTED' && (
              <View style={styles.actions}>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.confirmBtn]}
                  disabled={actionLoading === item.id}
                  onPress={() => handleConfirm(item.id)}
                >
                  <Text style={styles.confirmBtnText}>✓ 확인</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.rejectBtn]}
                  disabled={actionLoading === item.id}
                  onPress={() => handleReject(item.id)}
                >
                  <Text style={styles.rejectBtnText}>✗ 거절</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
    backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  headerTitle: { fontSize: FONT.xl, fontWeight: '800', color: COLORS.textPrimary },
  settingsLink: { fontSize: FONT.sm, fontWeight: '600', color: COLORS.primary },
  list: { padding: SPACING.md, paddingBottom: 40 },
  sectionTitle: { fontSize: FONT.sm, fontWeight: '700', color: COLORS.textMuted, marginTop: SPACING.md, marginBottom: SPACING.sm },
  card: {
    backgroundColor: COLORS.white, borderRadius: RADIUS.card,
    padding: SPACING.lg, marginBottom: SPACING.sm,
    borderWidth: 1, borderColor: COLORS.border,
  },
  shootType: { fontSize: FONT.base, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 4 },
  meta: { fontSize: FONT.sm, color: COLORS.textSecondary, marginBottom: 2 },
  client: { fontSize: FONT.sm, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 2 },
  memo: {
    fontSize: FONT.sm - 1, color: COLORS.textMuted, marginTop: SPACING.xs,
    padding: SPACING.sm, backgroundColor: COLORS.bg, borderRadius: RADIUS.sm, lineHeight: 18,
  },
  actions: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.md },
  actionBtn: { flex: 1, paddingVertical: 10, borderRadius: RADIUS.sm, alignItems: 'center' },
  confirmBtn: { backgroundColor: COLORS.success },
  confirmBtnText: { color: '#fff', fontWeight: '700', fontSize: FONT.sm },
  rejectBtn: { borderWidth: 1.5, borderColor: COLORS.danger, backgroundColor: COLORS.white },
  rejectBtnText: { color: COLORS.danger, fontWeight: '700', fontSize: FONT.sm },
});
