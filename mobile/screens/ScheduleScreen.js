import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, SectionList, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { bookingApi } from '../src/api/bookingApi';
import { meetApi, gatheringApi } from '../services/api';
import { useAuth } from '../store/AuthContext';
import { COLORS } from '../constants/colors';
import { FONT, RADIUS, SPACING } from '../constants/layout';
import EmptyState from '../components/EmptyState';

// 웹 IntegratedCalendarPage(/calendar)와 같은 규칙:
// 예약 CONFIRMED · 약속 CONFIRMED · 모임 SCHEDULED/ONGOING 을 Promise.allSettled 로 모아 날짜별로 병합한다.
// 모바일은 달력 그리드 대신 "오늘 / 이번 주 / 이후" 일정 목록으로 보여준다 (지난 일정은 제외).

const TYPE_META = {
  booking:   { label: '예약', color: COLORS.primary },
  meet:      { label: '약속', color: COLORS.success },
  gathering: { label: '모임', color: '#B45309' },
};

const SHOOT_LABELS = {
  PROFILE: '프로필', WEDDING: '웨딩', COMMERCIAL: '상업', EVENT: '행사',
  FAMILY: '가족', PRODUCT: '제품', OTHER: '기타',
};

const pad = (n) => String(n).padStart(2, '0');
const localKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const dateKeyOf = (v) => (typeof v === 'string' && v.length >= 10 ? v.slice(0, 10) : null);
const shortTime = (t) => (t ? String(t).slice(0, 5) : '');

function formatDayLabel(key, todayKey) {
  if (key === todayKey) return '오늘';
  const d = new Date(`${key}T00:00:00`);
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${days[d.getDay()]})`;
}

export default function ScheduleScreen({ navigation }) {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [partialError, setPartialError] = useState('');

  const load = useCallback(async () => {
    const [bookingRes, meetRes, gatheringRes] = await Promise.allSettled([
      bookingApi.getMyBookings('CONFIRMED'),
      meetApi.list(),
      gatheringApi.getMy(),
    ]);
    const failed = [];
    const merged = [];

    if (bookingRes.status === 'fulfilled') {
      const list = Array.isArray(bookingRes.value) ? bookingRes.value : [];
      list.forEach(b => {
        const key = dateKeyOf(b.shootDate);
        if (!key) return;
        merged.push({
          id: `booking-${b.id}`, type: 'booking', dateKey: key,
          time: shortTime(b.shootTime),
          title: b.clientName ? `${b.clientName} 촬영` : '촬영 예약',
          subtitle: SHOOT_LABELS[b.shootType] || null,
          onPress: () => navigation.navigate('Booking'),
        });
      });
    } else failed.push('예약');

    if (meetRes.status === 'fulfilled') {
      const raw = meetRes.value;
      const list = Array.isArray(raw) ? raw : raw?.data || [];
      list.forEach(m => {
        if (m.status !== 'CONFIRMED') return;
        const key = dateKeyOf(m.confirmedDate);
        if (!key) return;
        const other = m.requesterId === user?.id ? m.receiverName : m.requesterName;
        merged.push({
          id: `meet-${m.id}`, type: 'meet', dateKey: key,
          time: shortTime(m.confirmedTime),
          title: other ? `${other}님과 약속` : '약속',
          subtitle: m.locationName || null,
          onPress: () => navigation.navigate('MeetDetail', { meetId: m.id }),
        });
      });
    } else failed.push('약속');

    if (gatheringRes.status === 'fulfilled') {
      const raw = gatheringRes.value;
      const list = Array.isArray(raw) ? raw : raw?.data || [];
      list.forEach(g => {
        if (g.status !== 'SCHEDULED' && g.status !== 'ONGOING') return;
        const key = dateKeyOf(g.startDateTime);
        if (!key) return;
        merged.push({
          id: `gathering-${g.id}`, type: 'gathering', dateKey: key,
          time: shortTime(String(g.startDateTime).slice(11)),
          title: g.title,
          subtitle: g.participantCount != null ? `참여자 ${g.participantCount}명` : null,
          onPress: () => navigation.navigate('GatheringDetail', { gatheringId: g.id }),
        });
      });
    } else failed.push('모임');

    merged.sort((a, b) => (a.dateKey + a.time).localeCompare(b.dateKey + b.time));
    setEvents(merged);
    setPartialError(failed.length
      ? `${failed.join('·')} 일정을 불러오지 못했어요. 나머지 일정은 정상 표시됩니다.`
      : '');
    setLoading(false);
    setRefreshing(false);
  }, [navigation, user?.id]);

  useEffect(() => { load(); }, [load]);

  const today = new Date();
  const todayKey = localKey(today);
  const weekEnd = new Date(today);
  weekEnd.setDate(today.getDate() + 6);
  const weekEndKey = localKey(weekEnd);

  const upcoming = events.filter(e => e.dateKey >= todayKey);
  const sections = [
    { key: 'today', title: '오늘', data: upcoming.filter(e => e.dateKey === todayKey) },
    { key: 'week', title: '이번 주', data: upcoming.filter(e => e.dateKey > todayKey && e.dateKey <= weekEndKey) },
    { key: 'later', title: '이후', data: upcoming.filter(e => e.dateKey > weekEndKey) },
  ].filter(s => s.data.length > 0);

  const header = (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="뒤로">
        <Text style={styles.back}>‹</Text>
      </TouchableOpacity>
      <Text style={styles.headerTitle}>통합 일정</Text>
      <View style={{ width: 24 }} />
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        {header}
        <ActivityIndicator style={{ marginTop: 48 }} size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {header}
      <View style={styles.legend}>
        {Object.values(TYPE_META).map(m => (
          <View key={m.label} style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: m.color }]} />
            <Text style={styles.legendText}>{m.label}</Text>
          </View>
        ))}
      </View>
      {partialError ? <Text style={styles.partialError}>{partialError}</Text> : null}

      <SectionList
        sections={sections}
        keyExtractor={item => item.id}
        refreshing={refreshing}
        onRefresh={() => { setRefreshing(true); load(); }}
        contentContainerStyle={styles.list}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }) => (
          <Text style={styles.sectionTitle}>{section.title} ({section.data.length})</Text>
        )}
        renderItem={({ item }) => {
          const meta = TYPE_META[item.type];
          return (
            <TouchableOpacity
              style={styles.card}
              onPress={item.onPress}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={`${meta.label} ${item.title}`}
            >
              <View style={[styles.stripe, { backgroundColor: meta.color }]} />
              <View style={styles.cardBody}>
                <Text style={styles.when}>
                  {formatDayLabel(item.dateKey, todayKey)}{item.time ? ` · ${item.time}` : ''}
                </Text>
                <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
                {item.subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{item.subtitle}</Text> : null}
              </View>
              <Text style={[styles.typeBadge, { color: meta.color }]}>{meta.label}</Text>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <EmptyState
            icon="📅"
            title="다가오는 일정이 없어요"
            description="확정된 예약·약속과 예정된 모임이 여기에 모입니다"
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
    backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  back: { fontSize: 28, color: COLORS.textPrimary, width: 24, lineHeight: 30 },
  headerTitle: { fontSize: FONT.xl, fontWeight: '800', color: COLORS.textPrimary },
  legend: { flexDirection: 'row', gap: SPACING.md, paddingHorizontal: SPACING.lg, paddingTop: SPACING.md },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: FONT.sm - 1, color: COLORS.textSecondary },
  partialError: {
    marginHorizontal: SPACING.md, marginTop: SPACING.sm, padding: SPACING.sm,
    fontSize: FONT.sm - 1, color: '#B45309',
    backgroundColor: 'rgba(180,83,9,0.08)', borderRadius: RADIUS.sm,
  },
  list: { padding: SPACING.md, paddingBottom: 40, flexGrow: 1 },
  sectionTitle: {
    fontSize: FONT.sm, fontWeight: '700', color: COLORS.textMuted,
    marginTop: SPACING.md, marginBottom: SPACING.sm,
  },
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.white, borderRadius: RADIUS.card,
    borderWidth: 1, borderColor: COLORS.border,
    marginBottom: SPACING.sm, overflow: 'hidden',
  },
  stripe: { width: 4, alignSelf: 'stretch' },
  cardBody: { flex: 1, paddingVertical: SPACING.md, paddingHorizontal: SPACING.md },
  when: { fontSize: FONT.sm - 1, color: COLORS.textSecondary, marginBottom: 2 },
  title: { fontSize: FONT.base, fontWeight: '700', color: COLORS.textPrimary },
  subtitle: { fontSize: FONT.sm - 1, color: COLORS.textMuted, marginTop: 2 },
  typeBadge: { fontSize: FONT.sm - 1, fontWeight: '700', paddingHorizontal: SPACING.md },
});
