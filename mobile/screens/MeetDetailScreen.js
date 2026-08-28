import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, FlatList, KeyboardAvoidingView, Platform,
  ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { meetApi } from '../services/api';
import { useAuth } from '../store/AuthContext';
import { COLORS } from '../constants/colors';
import { FONT, RADIUS, SPACING } from '../constants/layout';

const TABS = [
  { key: 'chat', label: '💬 채팅' },
  { key: 'schedule', label: '📅 일정' },
  { key: 'location', label: '📍 장소' },
];

function nextDays(n) {
  const out = [];
  const now = new Date();
  for (let i = 0; i <= n; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

function ChatTab({ meetId, myId, meet }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef(null);
  const pollRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const res = await meetApi.getMessages(meetId);
      setMessages(res || []);
    } catch {
      // 무음 실패 — polling에서 재시도
    } finally {
      setLoading(false);
    }
  }, [meetId]);

  useEffect(() => {
    load();
    pollRef.current = setInterval(load, 30000);
    return () => clearInterval(pollRef.current);
  }, [load]);

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    setSending(true);
    const content = input.trim();
    setInput('');
    try {
      const msg = await meetApi.sendMessage(meetId, content);
      setMessages(prev => [...prev, msg]);
    } catch {
      setInput(content);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return <View style={styles.tabCenter}><ActivityIndicator color={COLORS.primary} /></View>;
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={{ padding: SPACING.md }}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={
          <Text style={styles.emptyHint}>
            첫 메시지를 보내 대화를 시작해보세요.{meet?.initialMessage ? `\n\n"${meet.initialMessage}"` : ''}
          </Text>
        }
        renderItem={({ item }) => {
          const mine = item.senderId === myId;
          return (
            <View style={[styles.bubbleRow, mine && { justifyContent: 'flex-end' }]}>
              <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
                <Text style={[styles.bubbleText, mine && { color: '#fff' }]}>{item.content}</Text>
              </View>
            </View>
          );
        }}
      />
      <View style={styles.inputRow}>
        <TextInput
          style={styles.chatInput}
          value={input}
          onChangeText={setInput}
          placeholder="메시지를 입력하세요..."
          placeholderTextColor={COLORS.textHint}
          multiline
        />
        <TouchableOpacity style={styles.sendBtn} onPress={handleSend} disabled={sending}>
          <Text style={styles.sendBtnIcon}>➤</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

function ScheduleTab({ meetId, myId, meet, onRefresh }) {
  const [availability, setAvailability] = useState(null);
  const [myDates, setMyDates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [confirmDate, setConfirmDate] = useState(null);
  const [confirmTime, setConfirmTime] = useState('14:00');

  const candidateDates = nextDays(14);

  const load = useCallback(async () => {
    try {
      const res = await meetApi.getAvailability(meetId);
      setAvailability(res || {});
      const mine = res?.[String(myId)];
      if (mine?.dates) setMyDates(mine.dates);
    } catch {
      setAvailability({});
    } finally {
      setLoading(false);
    }
  }, [meetId, myId]);

  useEffect(() => { load(); }, [load]);

  const toggleDate = (d) => {
    setMyDates(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);
  };

  const handleSubmitAvailability = async () => {
    setSubmitting(true);
    try {
      await meetApi.submitAvailability(meetId, myDates, []);
      await load();
      onRefresh && onRefresh();
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirm = async () => {
    if (!confirmDate) return;
    setSubmitting(true);
    try {
      await meetApi.confirmDate(meetId, confirmDate, confirmTime);
      onRefresh && onRefresh();
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <View style={styles.tabCenter}><ActivityIndicator color={COLORS.primary} /></View>;
  }

  if (meet.status === 'CONFIRMED' || meet.status === 'COMPLETED') {
    return (
      <ScrollView contentContainerStyle={{ padding: SPACING.md }}>
        <View style={styles.confirmedCard}>
          <Text style={styles.confirmedIcon}>✅</Text>
          <Text style={styles.confirmedTitle}>확정된 날짜</Text>
          <Text style={styles.confirmedDate}>{meet.confirmedDate} {meet.confirmedTime}</Text>
        </View>
      </ScrollView>
    );
  }

  const otherEntries = Object.entries(availability || {}).filter(([id]) => Number(id) !== myId);

  return (
    <ScrollView contentContainerStyle={{ padding: SPACING.md }}>
      <Text style={styles.sectionLabel}>내가 가능한 날 ({myDates.length}일 선택됨)</Text>
      <View style={styles.dateWrap}>
        {candidateDates.map(d => {
          const active = myDates.includes(d);
          return (
            <TouchableOpacity
              key={d}
              style={[styles.dateChip, active && styles.dateChipActive]}
              onPress={() => toggleDate(d)}
            >
              <Text style={[styles.dateChipText, active && styles.dateChipTextActive]}>{d.slice(5)}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <TouchableOpacity
        style={[styles.primaryBtn, submitting && { opacity: 0.6 }]}
        onPress={handleSubmitAvailability}
        disabled={submitting}
      >
        <Text style={styles.primaryBtnText}>가능한 날 저장</Text>
      </TouchableOpacity>

      {otherEntries.length > 0 && (
        <View style={{ marginTop: 20 }}>
          <Text style={styles.sectionLabel}>상대방이 가능한 날</Text>
          <Text style={styles.otherDatesText}>
            {otherEntries[0][1].dates?.length ? otherEntries[0][1].dates.join(', ') : '아직 선택하지 않았어요.'}
          </Text>
        </View>
      )}

      {meet.status === 'NEGOTIATING' && (
        <View style={{ marginTop: 24 }}>
          <Text style={styles.sectionLabel}>날짜 확정하기</Text>
          <View style={styles.dateWrap}>
            {myDates.map(d => (
              <TouchableOpacity
                key={d}
                style={[styles.dateChip, confirmDate === d && styles.dateChipActive]}
                onPress={() => setConfirmDate(d)}
              >
                <Text style={[styles.dateChipText, confirmDate === d && styles.dateChipTextActive]}>{d}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            style={styles.timeInput}
            value={confirmTime}
            onChangeText={setConfirmTime}
            placeholder="14:00"
            placeholderTextColor={COLORS.textHint}
          />
          <TouchableOpacity
            style={[styles.primaryBtn, (!confirmDate || submitting) && { opacity: 0.5 }]}
            onPress={handleConfirm}
            disabled={!confirmDate || submitting}
          >
            <Text style={styles.primaryBtnText}>이 날짜로 확정</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

function LocationTab({ meetId, meet, onRefresh }) {
  const [name, setName] = useState(meet.locationName || '');
  const [address, setAddress] = useState(meet.locationAddress || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await meetApi.updateLocation(meetId, { locationName: name, locationAddress: address });
      onRefresh && onRefresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: SPACING.md }}>
      <Text style={styles.sectionLabel}>장소 이름</Text>
      <TextInput style={styles.textInput} value={name} onChangeText={setName} placeholder="예: 강남역 카페" placeholderTextColor={COLORS.textHint} />
      <Text style={[styles.sectionLabel, { marginTop: 14 }]}>주소</Text>
      <TextInput style={styles.textInput} value={address} onChangeText={setAddress} placeholder="상세 주소" placeholderTextColor={COLORS.textHint} />
      <TouchableOpacity style={[styles.primaryBtn, { marginTop: 20 }, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
        <Text style={styles.primaryBtnText}>{saving ? '저장 중…' : '저장'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

export default function MeetDetailScreen({ route, navigation }) {
  const { meetId } = route.params;
  const { user } = useAuth();
  const [meet, setMeet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('chat');
  const [acting, setActing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await meetApi.getDetail(meetId);
      setMeet(res);
    } catch {
      setMeet(null);
    } finally {
      setLoading(false);
    }
  }, [meetId]);

  useEffect(() => { load(); }, [load]);

  const handleRespond = async (action) => {
    setActing(true);
    try {
      await meetApi.respond(meetId, action);
      await load();
    } finally {
      setActing(false);
    }
  };

  const handleComplete = async () => {
    setActing(true);
    try {
      await meetApi.complete(meetId);
      await load();
    } finally {
      setActing(false);
    }
  };

  if (loading) {
    return <View style={styles.tabCenter}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
  }

  if (!meet) {
    return (
      <View style={styles.tabCenter}>
        <Text style={styles.emptyHint}>약속 정보를 불러오지 못했어요.</Text>
      </View>
    );
  }

  const isReceiver = meet.receiverId === user?.id;
  const otherName = isReceiver ? meet.requesterName : meet.receiverName;

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.backBtn}>←</Text></TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{otherName}</Text>
        <View style={{ width: 24 }} />
      </View>

      {meet.status === 'PENDING' && isReceiver && (
        <View style={styles.pendingBar}>
          <Text style={styles.pendingText}>약속 요청을 받았어요.</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity style={styles.acceptBtn} disabled={acting} onPress={() => handleRespond('accept')}>
              <Text style={styles.acceptBtnText}>수락</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.rejectBtn} disabled={acting} onPress={() => handleRespond('reject')}>
              <Text style={styles.rejectBtnText}>거절</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {meet.status === 'CONFIRMED' && (
        <View style={styles.pendingBar}>
          <Text style={styles.pendingText}>📅 {meet.confirmedDate} {meet.confirmedTime}</Text>
          <TouchableOpacity style={styles.acceptBtn} disabled={acting} onPress={handleComplete}>
            <Text style={styles.acceptBtnText}>완료 처리</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.tabBar}>
        {TABS.map(t => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tabBarItem, tab === t.key && styles.tabBarItemActive]}
            onPress={() => setTab(t.key)}
          >
            <Text style={[styles.tabBarText, tab === t.key && styles.tabBarTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={{ flex: 1 }}>
        {tab === 'chat' && <ChatTab meetId={meetId} myId={user?.id} meet={meet} />}
        {tab === 'schedule' && <ScheduleTab meetId={meetId} myId={user?.id} meet={meet} onRefresh={load} />}
        {tab === 'location' && <LocationTab meetId={meetId} meet={meet} onRefresh={load} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tabCenter: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.bg, padding: SPACING.xl },
  emptyHint: { textAlign: 'center', color: COLORS.textHint, fontSize: FONT.sm, lineHeight: 20 },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, backgroundColor: COLORS.white,
    borderBottomWidth: 1, borderBottomColor: COLORS.border },
  backBtn: { fontSize: 22, color: COLORS.textPrimary, width: 24 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: FONT.md, fontWeight: '700', color: COLORS.textPrimary },

  pendingBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: SPACING.md, backgroundColor: COLORS.tagBg, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  pendingText: { fontSize: FONT.sm, color: COLORS.textPrimary, fontWeight: '600', flex: 1 },
  acceptBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.sm, paddingHorizontal: 16, paddingVertical: 8 },
  acceptBtnText: { color: '#fff', fontWeight: '700', fontSize: FONT.sm },
  rejectBtn: { borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.sm, paddingHorizontal: 16, paddingVertical: 8 },
  rejectBtnText: { color: COLORS.textSecondary, fontWeight: '700', fontSize: FONT.sm },

  tabBar: { flexDirection: 'row', backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tabBarItem: { flex: 1, alignItems: 'center', paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabBarItemActive: { borderBottomColor: COLORS.primary },
  tabBarText: { fontSize: FONT.sm, color: COLORS.textMuted, fontWeight: '600' },
  tabBarTextActive: { color: COLORS.primary },

  bubbleRow: { flexDirection: 'row', marginBottom: 8 },
  bubble: { maxWidth: '75%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16 },
  bubbleMine: { backgroundColor: COLORS.primary, borderBottomRightRadius: 4 },
  bubbleTheirs: { backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: FONT.sm, color: COLORS.textPrimary },

  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, padding: 10,
    backgroundColor: COLORS.white, borderTopWidth: 1, borderTopColor: COLORS.border },
  chatInput: { flex: 1, backgroundColor: COLORS.inputBg, borderRadius: 20, paddingHorizontal: 14,
    paddingVertical: 8, color: COLORS.textPrimary, fontSize: FONT.sm, maxHeight: 100, minHeight: 38 },
  sendBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center' },
  sendBtnIcon: { color: '#fff', fontSize: 16 },

  sectionLabel: { fontSize: FONT.sm, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 8 },
  dateWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  dateChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
    borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.white },
  dateChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  dateChipText: { fontSize: FONT.xs, color: COLORS.textSecondary, fontWeight: '600' },
  dateChipTextActive: { color: '#fff' },
  otherDatesText: { fontSize: FONT.sm, color: COLORS.textSecondary },

  timeInput: { borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md,
    paddingHorizontal: 14, paddingVertical: 10, color: COLORS.textPrimary, fontSize: FONT.sm, marginBottom: 12, width: 100 },
  textInput: { borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md,
    paddingHorizontal: 14, paddingVertical: 10, color: COLORS.textPrimary, fontSize: FONT.sm },

  primaryBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingVertical: 12, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: FONT.sm },

  confirmedCard: { backgroundColor: COLORS.white, borderRadius: RADIUS.card, borderWidth: 1,
    borderColor: COLORS.border, padding: 24, alignItems: 'center' },
  confirmedIcon: { fontSize: 36, marginBottom: 10 },
  confirmedTitle: { fontSize: FONT.sm, color: COLORS.textMuted, marginBottom: 4 },
  confirmedDate: { fontSize: FONT.lg, fontWeight: '700', color: COLORS.textPrimary },
});
