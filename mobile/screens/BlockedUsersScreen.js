import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, Image, RefreshControl,
  StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { blockApi } from '../src/api/safetyApi';
import { unblockMember } from '../hooks/useBlockedMembers';
import { COLORS } from '../constants/colors';
import { FONT, RADIUS, SPACING } from '../constants/layout';
import EmptyState from '../components/EmptyState';

/** 차단한 사용자 목록 + 해제 (프로필 › 차단한 사용자). 차단은 사진 상세·댓글·모임 게시물의 "신고"에서 한다. */
export default function BlockedUsersScreen() {
  const [rows, setRows] = useState(null);   // null = 불러오는 중
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    try {
      setRows(await blockApi.list());
      setError(false);
    } catch {
      setError(true);
      setRows(prev => prev || []);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const confirmUnblock = (row) => {
    Alert.alert(`${row.name}님 차단을 해제할까요?`, '이 회원의 사진과 댓글이 다시 보여요.', [
      { text: '취소', style: 'cancel' },
      {
        text: '해제',
        onPress: async () => {
          setBusyId(row.memberId);
          try {
            await unblockMember(row.memberId);
            setRows(prev => prev.filter(r => r.memberId !== row.memberId));
          } catch (err) {
            Alert.alert('해제하지 못했어요', err.response?.data?.message || '잠시 후 다시 시도해 주세요.');
          } finally {
            setBusyId(null);
          }
        },
      },
    ]);
  };

  if (rows === null) {
    return <View style={styles.center}><ActivityIndicator color={COLORS.primary} /></View>;
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={{ padding: SPACING.lg, flexGrow: 1 }}
      data={rows}
      keyExtractor={r => String(r.memberId)}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      ListHeaderComponent={error ? (
        <Text style={styles.error}>목록을 불러오지 못했어요. 아래로 당겨 다시 시도해 주세요.</Text>
      ) : null}
      ListEmptyComponent={error ? null : (
        <EmptyState icon="🚫" title="차단한 사용자가 없어요"
          description="사진이나 댓글의 '신고'에서 회원을 차단하면 여기에 표시돼요." />
      )}
      renderItem={({ item }) => (
        <View style={styles.row}>
          {item.avatarUrl
            ? <Image source={{ uri: item.avatarUrl }} style={styles.avatar} />
            : <View style={styles.avatar}><Text style={styles.avatarText}>{(item.name || '?').charAt(0)}</Text></View>}
          <View style={{ flex: 1 }}>
            <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
            {item.profileName ? <Text style={styles.sub}>@{item.profileName}</Text> : null}
          </View>
          <TouchableOpacity style={styles.unblockBtn} onPress={() => confirmUnblock(item)}
            disabled={busyId === item.memberId} accessibilityRole="button" accessibilityLabel={`${item.name} 차단 해제`}>
            {busyId === item.memberId
              ? <ActivityIndicator size="small" color={COLORS.primary} />
              : <Text style={styles.unblockText}>해제</Text>}
          </TouchableOpacity>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.bg },
  error: { color: COLORS.danger, fontSize: FONT.sm, marginBottom: SPACING.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.white,
    borderRadius: RADIUS.card, borderWidth: 1, borderColor: COLORS.border,
    padding: SPACING.md, marginBottom: SPACING.sm },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: COLORS.textSecondary, fontWeight: '700' },
  name: { fontSize: FONT.md, fontWeight: '700', color: COLORS.textPrimary },
  sub: { fontSize: FONT.sm, color: COLORS.textMuted, marginTop: 2 },
  unblockBtn: { borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.sm,
    paddingHorizontal: 14, paddingVertical: 8, minWidth: 56, alignItems: 'center' },
  unblockText: { color: COLORS.textPrimary, fontWeight: '700', fontSize: FONT.sm },
});
