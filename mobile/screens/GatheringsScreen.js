import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, FlatList, Image, RefreshControl,
  StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { gatheringApi } from '../src/api/gatheringApi';
import { useAuth } from '../store/AuthContext';
import { COLORS } from '../constants/colors';
import { FONT, RADIUS, SPACING } from '../constants/layout';
import { SkeletonGatheringCard } from '../components/SkeletonCard';

const STATUS_STYLE = {
  RECRUITING:           { label: '모집중',    bg: 'rgba(0,196,113,0.12)',  color: '#00C471' },
  RECRUITMENT_CLOSED:   { label: '모집마감',  bg: 'rgba(255,184,0,0.12)',  color: '#E6A800' },
  SCHEDULED:            { label: '진행예정',  bg: 'rgba(49,130,246,0.12)', color: COLORS.primary },
  ONGOING:              { label: '진행중',    bg: 'rgba(168,85,247,0.12)', color: '#A855F7' },
  ENDED:                { label: '종료',      bg: 'rgba(144,144,176,0.15)', color: COLORS.textMuted },
};

function formatDateRange(start, end) {
  if (!start) return '';
  const s = new Date(start);
  const e = end ? new Date(end) : null;
  const pad = (n) => String(n).padStart(2, '0');
  const sStr = `${s.getMonth() + 1}/${s.getDate()} ${pad(s.getHours())}:${pad(s.getMinutes())}`;
  if (!e) return sStr;
  if (s.toDateString() === e.toDateString()) {
    return `${sStr} ~ ${pad(e.getHours())}:${pad(e.getMinutes())}`;
  }
  return `${sStr} ~ ${e.getMonth() + 1}/${e.getDate()} ${pad(e.getHours())}:${pad(e.getMinutes())}`;
}

function GatheringCard({ item, onPress }) {
  const statusStyle = STATUS_STYLE[item.status] || STATUS_STYLE.RECRUITING;
  const full = item.participantCount >= item.maxParticipants;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      {item.thumbnailUrl ? (
        <Image source={{ uri: item.thumbnailUrl }} style={styles.thumbnail} />
      ) : (
        <View style={[styles.thumbnail, styles.thumbnailPlaceholder]}>
          <Text style={styles.thumbnailIcon}>📷</Text>
        </View>
      )}
      <View style={styles.cardBody}>
        <View style={styles.cardTopRow}>
          <View style={[styles.badge, { backgroundColor: statusStyle.bg }]}>
            <Text style={[styles.badgeText, { color: statusStyle.color }]}>{statusStyle.label}</Text>
          </View>
          {item.shootTheme ? (
            <Text style={styles.themeText} numberOfLines={1}>{item.shootTheme}</Text>
          ) : null}
        </View>
        <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.cardLocation} numberOfLines={1}>📍 {item.location}</Text>
        <Text style={styles.cardDate} numberOfLines={1}>
          🗓 {formatDateRange(item.startDateTime, item.endDateTime)}
        </Text>
        <View style={styles.cardFooter}>
          <Text style={[styles.participantText, full && styles.participantFull]}>
            👥 {item.participantCount}/{item.maxParticipants}명
            {item.waitingCount > 0 ? ` (대기 ${item.waitingCount})` : ''}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function SectionHeader({ title }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

export default function GatheringsScreen({ navigation }) {
  const { user } = useAuth();
  const [publicList, setPublicList] = useState([]);
  const [myList, setMyList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMy, setLoadingMy] = useState(false);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    setError(false);
    try {
      const res = await gatheringApi.list('RECRUITING', 0, 30);
      // Spring Page 응답: { content: [...], ... } 또는 배열 직반환 모두 처리
      const items = res?.content || res?.data?.content || (Array.isArray(res) ? res : []);
      setPublicList(items);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadMy = useCallback(async () => {
    if (!user) return;
    setLoadingMy(true);
    try {
      const res = await gatheringApi.getMy();
      const items = Array.isArray(res) ? res : (res?.data || []);
      setMyList(items);
    } catch {
      setMyList([]);
    } finally {
      setLoadingMy(false);
    }
  }, [user]);

  useEffect(() => {
    load();
    loadMy();
  }, [load, loadMy]);

  const handleRefresh = () => {
    setRefreshing(true);
    load(true);
    loadMy();
  };

  const navigateToDetail = (id) => navigation.navigate('GatheringDetail', { gatheringId: id });

  if (loading && !refreshing) {
    return (
      <View style={styles.container}>
        <SkeletonGatheringCard />
        <SkeletonGatheringCard />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyIcon}>😔</Text>
        <Text style={styles.emptyText}>모임 목록을 불러오지 못했어요.</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => load()}>
          <Text style={styles.retryBtnText}>다시 시도</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} />}
      data={publicList}
      keyExtractor={(item) => String(item.id)}
      contentContainerStyle={styles.listContent}
      renderItem={({ item }) => (
        <GatheringCard item={item} onPress={() => navigateToDetail(item.id)} />
      )}
      ListHeaderComponent={
        <>
          {user && myList.length > 0 && (
            <>
              <SectionHeader title="내 모임" />
              {loadingMy ? (
                <ActivityIndicator size="small" color={COLORS.primary} style={styles.myLoader} />
              ) : (
                myList.map((item) => (
                  <GatheringCard key={item.id} item={item} onPress={() => navigateToDetail(item.id)} />
                ))
              )}
              <SectionHeader title="모집중인 모임" />
            </>
          )}
          {!user && <SectionHeader title="모집중인 모임" />}
        </>
      }
      ListEmptyComponent={
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>📷</Text>
          <Text style={styles.emptyText}>모집 중인 모임이 없어요.</Text>
          <Text style={styles.emptySubText}>나중에 다시 확인해 보세요.</Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  listContent: {
    padding: SPACING.md,
    paddingBottom: 100,
    flexGrow: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.bg,
    padding: SPACING.xl,
  },
  sectionHeader: {
    fontSize: FONT.md,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  myLoader: {
    marginVertical: SPACING.md,
  },

  // Card
  card: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.card,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  thumbnail: {
    width: 88,
    height: 88,
  },
  thumbnailPlaceholder: {
    backgroundColor: COLORS.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbnailIcon: {
    fontSize: 28,
  },
  cardBody: {
    flex: 1,
    padding: SPACING.md,
    gap: 3,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  themeText: {
    fontSize: 11,
    color: COLORS.textMuted,
    flex: 1,
  },
  cardTitle: {
    fontSize: FONT.base,
    fontWeight: '700',
    color: COLORS.textPrimary,
    lineHeight: 20,
  },
  cardLocation: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  cardDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  participantText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  participantFull: {
    color: COLORS.danger,
  },

  // Empty / Error
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: FONT.lg,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  emptySubText: {
    fontSize: FONT.sm,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 6,
  },
  retryBtn: {
    marginTop: 14,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  retryBtnText: {
    color: '#fff',
    fontWeight: '700',
  },
});
