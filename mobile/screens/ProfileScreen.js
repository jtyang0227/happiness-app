import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { useAuth } from '../store/AuthContext';
import { COLORS } from '../constants/colors';
import { FONT, RADIUS, SPACING } from '../constants/layout';

const PROFILE_NAME_REGEX = /^[a-z0-9][a-z0-9\-]{1,28}[a-z0-9]$|^[a-z0-9]{1,2}$/;
const INSTAGRAM_REGEX = /^[a-zA-Z0-9._]{1,30}$/;

export default function ProfileScreen() {
  const { user, updateProfile, logout } = useAuth();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name:        user?.name        || '',
    tel:         user?.tel         || '',
    profileName: user?.profileName || '',
    instagramId: user?.instagramId || '',
  });

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const initials = (user?.name || '?')
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const handleSave = async () => {
    if (!form.name.trim()) { Alert.alert('오류', '이름은 필수입니다.'); return; }
    if (form.profileName && !PROFILE_NAME_REGEX.test(form.profileName.toLowerCase())) {
      Alert.alert('오류', '포트폴리오 이름은 소문자·숫자·하이픈(3-30자)만 사용 가능합니다.'); return;
    }
    const instagram = form.instagramId.replace(/^@/, '');
    if (instagram && !INSTAGRAM_REGEX.test(instagram)) {
      Alert.alert('오류', '인스타그램 아이디 형식이 올바르지 않습니다.'); return;
    }
    setSaving(true);
    try {
      await updateProfile({
        name:        form.name.trim(),
        tel:         form.tel.trim(),
        profileName: form.profileName.trim().toLowerCase() || undefined,
        instagramId: instagram || undefined,
      });
      setEditing(false);
      Alert.alert('완료', '프로필이 저장되었습니다.');
    } catch (err) {
      Alert.alert('오류', err.message || '저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('로그아웃', '정말 로그아웃 하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      { text: '로그아웃', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* 아바타 */}
      <View style={styles.avatarWrap}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        {user?.profileName && (
          <View style={styles.subdomainBadge}>
            <Text style={styles.subdomainText}>✦ {user.profileName}.cosmos.app</Text>
          </View>
        )}
      </View>

      {/* 이메일 (읽기 전용) */}
      <View style={styles.emailRow}>
        <Text style={styles.emailLabel}>이메일</Text>
        <Text style={styles.emailValue}>{user?.email}</Text>
      </View>

      {/* 프로필 필드 */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>프로필 정보</Text>
          {!editing && (
            <TouchableOpacity onPress={() => setEditing(true)}>
              <Text style={styles.editBtn}>편집</Text>
            </TouchableOpacity>
          )}
        </View>

        <InfoRow label="이름" editing={editing}
          value={form.name}
          onChangeText={v => set('name', v)}
          placeholder="홍길동" />

        <InfoRow label="전화번호" editing={editing}
          value={form.tel}
          onChangeText={v => set('tel', v)}
          placeholder="010-0000-0000"
          keyboardType="phone-pad" />

        {/* 포트폴리오 이름 */}
        <View style={styles.group}>
          <Text style={styles.fieldLabel}>포트폴리오 이름</Text>
          {editing ? (
            <View>
              <Text style={styles.fieldHint}>소문자·숫자·하이픈, 3-30자 · 서브도메인으로 사용</Text>
              <View style={styles.profileNameRow}>
                <TextInput
                  style={[styles.input, styles.profileNameInput]}
                  value={form.profileName}
                  onChangeText={v => set('profileName', v.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  placeholder="my-portfolio"
                  placeholderTextColor={COLORS.textHint}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <Text style={styles.domainSuffix}>.cosmos.app</Text>
              </View>
            </View>
          ) : (
            <Text style={styles.fieldValue}>
              {user?.profileName
                ? `${user.profileName}.cosmos.app`
                : <Text style={styles.fieldEmpty}>미설정</Text>}
            </Text>
          )}
        </View>

        {/* 인스타그램 */}
        <View style={styles.group}>
          <Text style={styles.fieldLabel}>인스타그램</Text>
          {editing ? (
            <View style={styles.instagramRow}>
              <Text style={styles.atPrefix}>@</Text>
              <TextInput
                style={[styles.input, { flex: 1, borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }]}
                value={form.instagramId.replace(/^@/, '')}
                onChangeText={v => set('instagramId', v.replace(/^@/, ''))}
                placeholder="your_instagram"
                placeholderTextColor={COLORS.textHint}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          ) : (
            <Text style={styles.fieldValue}>
              {user?.instagramId
                ? `@${user.instagramId}`
                : <Text style={styles.fieldEmpty}>미설정</Text>}
            </Text>
          )}
        </View>

        {editing && (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.btn, styles.btnSave]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.btnText}>저장</Text>}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, styles.btnCancel]}
              onPress={() => {
                setForm({
                  name:        user?.name        || '',
                  tel:         user?.tel         || '',
                  profileName: user?.profileName || '',
                  instagramId: user?.instagramId || '',
                });
                setEditing(false);
              }}
            >
              <Text style={styles.btnText}>취소</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>로그아웃</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function InfoRow({ label, value, editing, onChangeText, placeholder, keyboardType }) {
  return (
    <View style={styles.group}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {editing ? (
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={COLORS.textHint}
          keyboardType={keyboardType}
        />
      ) : (
        <Text style={styles.fieldValue}>{value || <Text style={styles.fieldEmpty}>미설정</Text>}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:  { padding: SPACING.lg, paddingBottom: 40, backgroundColor: COLORS.bg, flexGrow: 1 },

  avatarWrap: { alignItems: 'center', marginBottom: SPACING.lg },
  avatar:     { width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.primary,
                alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.sm },
  avatarText: { color: '#fff', fontSize: 28, fontWeight: '800' },
  subdomainBadge: { backgroundColor: '#eef0fd', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
  subdomainText:  { color: COLORS.primary, fontSize: FONT.sm, fontWeight: '600' },

  emailRow:   { backgroundColor: COLORS.white, borderRadius: RADIUS.card, padding: SPACING.md,
                marginBottom: SPACING.md, flexDirection: 'row', justifyContent: 'space-between',
                alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  emailLabel: { color: COLORS.textMuted, fontSize: FONT.sm, fontWeight: '600' },
  emailValue: { color: COLORS.textPrimary, fontSize: FONT.sm, fontWeight: '500' },

  card:       { backgroundColor: COLORS.white, borderRadius: RADIUS.card, padding: SPACING.lg,
                marginBottom: SPACING.lg, borderWidth: 1, borderColor: COLORS.border },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  cardTitle:  { fontSize: FONT.lg, fontWeight: '700', color: COLORS.textPrimary },
  editBtn:    { color: COLORS.primary, fontWeight: '700', fontSize: FONT.sm },

  group:      { marginBottom: SPACING.md },
  fieldLabel: { color: COLORS.textMuted, fontSize: FONT.sm, fontWeight: '600', marginBottom: 4 },
  fieldHint:  { color: COLORS.textHint, fontSize: 11, marginBottom: 6 },
  fieldValue: { color: COLORS.textPrimary, fontSize: FONT.base, fontWeight: '500' },
  fieldEmpty: { color: COLORS.textHint, fontStyle: 'italic' },
  input: {
    borderWidth: 1, borderColor: COLORS.borderLight, borderRadius: RADIUS.md,
    paddingHorizontal: 12, paddingVertical: 10, color: COLORS.textPrimary,
    backgroundColor: COLORS.bg, fontSize: FONT.base,
  },
  profileNameRow:  { flexDirection: 'row', alignItems: 'center' },
  profileNameInput:{ flex: 1, borderTopRightRadius: 0, borderBottomRightRadius: 0, borderRightWidth: 0 },
  domainSuffix:    { borderWidth: 1, borderColor: COLORS.borderLight,
                     borderTopRightRadius: RADIUS.md, borderBottomRightRadius: RADIUS.md,
                     paddingHorizontal: 10, paddingVertical: 10,
                     color: COLORS.textMuted, fontSize: FONT.sm, backgroundColor: COLORS.bg },
  instagramRow:    { flexDirection: 'row', alignItems: 'center' },
  atPrefix:        { borderWidth: 1, borderColor: COLORS.borderLight,
                     borderTopLeftRadius: RADIUS.md, borderBottomLeftRadius: RADIUS.md,
                     borderRightWidth: 0, paddingHorizontal: 12, paddingVertical: 10,
                     color: COLORS.primary, fontWeight: '700', backgroundColor: COLORS.bg },

  actionRow:  { flexDirection: 'row', gap: 8, marginTop: 8 },
  btn:        { flex: 1, paddingVertical: 12, borderRadius: RADIUS.md, alignItems: 'center' },
  btnSave:    { backgroundColor: COLORS.primary },
  btnCancel:  { backgroundColor: COLORS.cancel },
  btnText:    { color: '#fff', fontWeight: '700' },

  logoutBtn:  { backgroundColor: '#fff', borderRadius: RADIUS.md, paddingVertical: 14,
                alignItems: 'center', borderWidth: 1, borderColor: '#ff3b30' },
  logoutText: { color: '#ff3b30', fontWeight: '700', fontSize: FONT.base },
});
