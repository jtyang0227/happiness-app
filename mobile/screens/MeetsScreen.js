import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator, FlatList, Modal, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { meetApi } from '../services/api';
import { useAuth } from '../store/AuthContext';
import { COLORS } from '../constants/colors';
import { FONT, RADIUS, SPACING } from '../constants/layout';

const STATUS_STYLE = {
  PENDING:     { label: '대기중', bg: 'rgba(49,130,246,0.12)', color: COLORS.primary },
  NEGOTIATING: { label: '날짜조율', bg: 'rgba(6,182,212,0.12)', color: '#0891b2' },
  CONFIRMED:   { label: '확정', bg: 'rgba(46,164,79,0.12)', color: '#2ea44f' },
  COMPLETED:   { label: '완료', bg: 'rgba(144,144,176,0.15)', color: COLORS.textMuted },
  CANCELLED:   { label: '취소', bg: 'rgba(229,62,62,0.10)', color: COLORS.danger },
};

const TABS = [
  { key: 'ALL', label: '전체' },
  { key: 'PENDING', label: '대기중' },
  { key: 'NEGOTIATING', label: '조율중' },
  { key: 'CONFIRMED', label: '확정' },
  { key: 'COMPLETED', label: '완료' },
];

function relativeTime(dateStr) {
  if (!dateStr) return '';
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60) return '방금';
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)}일 전`;
  return new Date(dateStr).toLocaleDateString('ko-KR');
}

function nextDays(n) {
  const out = [];
  const now = new Date();
  for (let i = 1; i <= n; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

function MeetCard({ meet, myId, onPress }) {
  const isRequester = meet.requesterId === myId;
  const otherName = isRequester ? meet.receiverName : meet.requesterName;
  const otherProfileName = isRequester ? meet.receiverProfileName : meet.requesterProfileName;
  const otherAvatar = isRequester ? meet.receiverAvatarUrl : meet.requesterAvatarUrl;
  const statusStyle = STATUS_STYLE[meet.status] || STATUS_STYLE.PENDING;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{(otherName || '?').charAt(0)}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.cardTop}>
          <Text style={styles.cardName} numberOfLines={1}>{otherName || '알 수 없음'}</Text>
          <Text style={styles.cardTime}>{relativeTime(meet.updatedAt || meet.createdAt)}</Text>
        </View>
        {otherProfileName && <Text style={styles.cardHandle}>@{otherProfileName}</Text>}
        <View style={styles.cardMetaRow}>
          <View style={[styles.badge, { backgroundColor: statusStyle.bg }]}>
            <Text style={[styles.badgeText, { color: statusStyle.color }]}>{statusStyle.label}</Text>
          </View>
          {meet.confirmedDate && (
            <Text style={styles.confirmedText}>📅 {meet.confirmedDate} {meet.confirmedTime || ''}</Text>
          )}
          <Text style={styles.msgCount}>💬 {meet.messageCount ?? 0}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function NewMeetModal({ visible, onClose, onCreated }) {
  const [step, setStep] = useState('search'); // 'search' | 'compose'
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [target, setTarget] = useState(null);
  const [dates, setDates] = useState([]);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const candidateDates = useMemo(() => nextDays(14), []);

  const reset = () => {
    setStep('search'); setQuery(''); setResults([]); setTarget(null);
    setDates([]); setMessage(''); setError('');
  };

  const handleClose = () => { reset(); onClose(); };

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const res = await meetApi.searchMembers(query.trim(), 10);
      setResults(res || []);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const toggleDate = (d) => {
    setDates(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);
  };

  const handleSubmit = async () => {
    if (!target) return;
    setSubmitting(true); setError('');
    try {
      const meet = await meetApi.create({
        receiverId: target.id,
        proposedDates: dates,
        initialMessage: message,
      });
      onCreated && onCreated(meet);
      handleClose();
    } catch (e) {
      setError(e.response?.data?.message || '약속 요청에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {step === 'search' ? '누구에게 약속을 요청할까요?' : `→ ${target?.name}`}
            </Text>
            <TouchableOpacity onPress={handleClose}><Text style={styles.modalClose}>✕</Text></TouchableOpacity>
          </View>

          {step === 'search' ? (
            <>
              <View style={styles.searchRow}>
                <TextInput
                  style={styles.searchInput}
                  placeholder="이름 또는 @프로필명"
                  placeholderTextColor={COLORS.textHint}
                  value={query}
                  onChangeText={setQuery}
                  onSubmitEditing={handleSearch}
                  returnKeyType="search"
                />
                <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
                  {searching ? <ActivityIndicator size="small" color="#fff" /> : <Text style={{ fontSize: 16 }}>🔍</Text>}
                </TouchableOpacity>
              </View>
              <FlatList
                data={results}
                keyExtractor={item => String(item.id)}
                style={{ maxHeight: 260 }}
                ListEmptyComponent={<Text style={styles.emptyHint}>검색 결과가 없습니다.</Text>}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.resultRow}
                    onPress={() => { setTarget(item); setStep('compose'); }}
                  >
                    <View style={styles.resultAvatar}><Text style={styles.avatarText}>{item.name?.charAt(0)}</Text></View>
                    <View>
                      <Text style={styles.cardName}>{item.name}</Text>
                      {item.profileName && <Text style={styles.cardHandle}>@{item.profileName}</Text>}
                    </View>
                  </TouchableOpacity>
                )}
              />
            </>
          ) : (
            <ScrollView>
              <Text style={styles.sectionLabel}>만날 수 있는 날 ({dates.length}일 선택됨)</Text>
              <View style={styles.dateWrap}>
                {candidateDates.map(d => {
                  const active = dates.includes(d);
                  return (
                    <TouchableOpacity
                      key={d}
                      style={[styles.dateChip, active && styles.dateChipActive]}
                      onPress={() => toggleDate(d)}
                    >
                      <Text style={[styles.dateChipText, active && styles.dateChipTextActive]}>
                        {d.slice(5)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.sectionLabel}>첫 메시지</Text>
              <TextInput
                style={styles.messageInput}
                value={message}
                onChangeText={setMessage}
                placeholder={`안녕하세요 ${target?.name}님, 약속을 제안드립니다!`}
                placeholderTextColor={COLORS.textHint}
                multiline
                maxLength={500}
              />

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <View style={styles.modalFooter}>
                <TouchableOpacity style={styles.secondaryBtn} onPress={() => setStep('search')}>
                  <Text style={styles.secondaryBtnText}>이전</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.primaryBtn, submitting && { opacity: 0.6 }]}
                  onPress={handleSubmit}
                  disabled={submitting}
                >
                  <Text style={styles.primaryBtnText}>{submitting ? '전송 중…' : '요청 보내기 💌'}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

export default function MeetsScreen({ navigation }) {
  const { user } = useAuth();
  const [meets, setMeets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [tab, setTab] = useState('ALL');
  const [modalVisible, setModalVisible] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(false);
    try {
      const res = await meetApi.list();
      setMeets(res || []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = tab === 'ALL' ? meets : meets.filter(m => m.status === tab);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>약속 목록을 불러오지 못했어요.</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={load}>
          <Text style={styles.retryBtnText}>다시 시도</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll} contentContainerStyle={styles.tabScrollContent}>
        {TABS.map(t => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tabChip, tab === t.key && styles.tabChipActive]}
            onPress={() => setTab(t.key)}
          >
            <Text style={[styles.tabChipText, tab === t.key && styles.tabChipTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={filtered}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={styles.list}
        onRefresh={load}
        refreshing={loading}
        renderItem={({ item }) => (
          <MeetCard
            meet={item}
            myId={user?.id}
            onPress={() => navigation.navigate('MeetDetail', { meetId: item.id })}
          />
        )}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyIcon}>🤝</Text>
            <Text style={styles.emptyText}>아직 약속이 없어요.</Text>
          </View>
        }
      />

      <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)} activeOpacity={0.85}>
        <Text style={styles.fabIcon}>＋</Text>
      </TouchableOpacity>

      <NewMeetModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onCreated={() => load()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.bg, padding: SPACING.xl },
  list: { padding: SPACING.md, paddingBottom: 100, flexGrow: 1 },

  tabScroll: { backgroundColor: COLORS.bg, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tabScrollContent: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, gap: 6 },
  tabChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.white },
  tabChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  tabChipText: { fontSize: FONT.xs, fontWeight: '600', color: COLORS.textSecondary },
  tabChipTextActive: { color: '#fff' },

  card: { backgroundColor: COLORS.white, borderRadius: RADIUS.card, marginBottom: 10,
    borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md,
    flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardName: { fontSize: FONT.md, fontWeight: '700', color: COLORS.textPrimary, flex: 1 },
  cardTime: { fontSize: FONT.xs, color: COLORS.textHint, marginLeft: 8 },
  cardHandle: { fontSize: FONT.xs, color: COLORS.textMuted, marginTop: 1 },
  cardMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  confirmedText: { fontSize: FONT.xs, color: COLORS.textSecondary },
  msgCount: { fontSize: FONT.xs, color: COLORS.textMuted, marginLeft: 'auto' },

  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: FONT.lg, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'center' },
  retryBtn: { marginTop: 14, backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingHorizontal: 20, paddingVertical: 10 },
  retryBtnText: { color: '#fff', fontWeight: '700' },

  fab: { position: 'absolute', right: 20, bottom: 24, width: 56, height: 56, borderRadius: 28,
    backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center',
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 8 },
  fabIcon: { color: '#fff', fontSize: 28, fontWeight: '300', lineHeight: 30 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: COLORS.white, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: SPACING.lg, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: FONT.md, fontWeight: '700', color: COLORS.textPrimary, flex: 1 },
  modalClose: { fontSize: 20, color: COLORS.textMuted, paddingLeft: 12 },

  searchRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  searchInput: { flex: 1, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md,
    paddingHorizontal: 14, paddingVertical: 10, color: COLORS.textPrimary, fontSize: FONT.base },
  searchBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 16, borderRadius: RADIUS.md,
    justifyContent: 'center', alignItems: 'center' },
  emptyHint: { textAlign: 'center', color: COLORS.textHint, paddingVertical: 20, fontSize: FONT.sm },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: COLORS.border },
  resultAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.primaryDark,
    alignItems: 'center', justifyContent: 'center' },

  sectionLabel: { fontSize: FONT.sm, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 8, marginTop: 4 },
  dateWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16 },
  dateChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
    borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.white },
  dateChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  dateChipText: { fontSize: FONT.xs, color: COLORS.textSecondary, fontWeight: '600' },
  dateChipTextActive: { color: '#fff' },

  messageInput: { borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md,
    padding: 12, minHeight: 90, textAlignVertical: 'top', color: COLORS.textPrimary, fontSize: FONT.sm },
  errorText: { color: COLORS.danger, fontSize: FONT.xs, marginTop: 8 },

  modalFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20, gap: 10 },
  secondaryBtn: { flex: 1, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md,
    paddingVertical: 12, alignItems: 'center' },
  secondaryBtnText: { color: COLORS.textSecondary, fontWeight: '600' },
  primaryBtn: { flex: 2, backgroundColor: COLORS.primary, borderRadius: RADIUS.md,
    paddingVertical: 12, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontWeight: '700' },
});
