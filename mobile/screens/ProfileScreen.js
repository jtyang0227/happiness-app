import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../store/AuthContext';
import { photoApi } from '../services/api';
import { COLORS } from '../constants/colors';
import { FONT, RADIUS, SPACING } from '../constants/layout';

const PROFILE_NAME_REGEX = /^[a-z0-9][a-z0-9\-]{1,28}[a-z0-9]$|^[a-z0-9]{1,2}$/;
const SPECIALTIES_OPTIONS = ['웨딩', '포트레이트', '풍경', '제품', '음식', '건축', '스트릿', '패션', '스포츠', '반려동물'];

export default function ProfileScreen({ navigation }) {
  const { user, updateProfile, logout } = useAuth();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [stats, setStats] = useState(null);
  const [form, setForm] = useState({
    name:        user?.name        || '',
    tel:         user?.tel         || '',
    profileName: user?.profileName || '',
    instagramId: user?.instagramId || '',
    bio:         user?.bio         || '',
    websiteUrl:  user?.websiteUrl  || '',
    location:    user?.location    || '',
    specialties: user?.specialties ? user.specialties.split(',').map(s => s.trim()).filter(Boolean) : [],
  });
  const [avatarUri, setAvatarUri] = useState(user?.avatarUrl || null);

  useEffect(() => {
    if (user?.id) {
      fetch(`/api/auth/member/${user.id}/stats`)
        .then(r => r.json())
        .then(res => setStats(res.data || res))
        .catch(() => {});
    }
  }, [user?.id]);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const toggleSpecialty = (s) => {
    setForm(f => {
      const cur = f.specialties || [];
      return { ...f, specialties: cur.includes(s) ? cur.filter(x => x !== s) : [...cur, s] };
    });
  };

  const initials = (user?.name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  const handleAvatarPick = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('권한 필요', '사진 라이브러리 접근 권한이 필요합니다.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [1, 1], quality: 0.8,
    });
    if (!result.canceled && result.assets?.length > 0) {
      const asset = result.assets[0];
      setAvatarUri(asset.uri);
      setAvatarUploading(true);
      try {
        const formData = new FormData();
        const filename = asset.uri.split('/').pop();
        formData.append('file', { uri: asset.uri, name: filename, type: 'image/jpeg' });
        const res = await photoApi.uploadFile(formData);
        const url = res.url || res.data?.url;
        if (url) {
          await updateProfile({ avatarUrl: url });
        }
      } catch { Alert.alert('오류', '아바타 업로드에 실패했습니다.'); }
      finally { setAvatarUploading(false); }
    }
  };

  const handleSave = async () => {
    if (!form.name.trim()) { Alert.alert('오류', '이름은 필수입니다.'); return; }
    if (form.profileName && !PROFILE_NAME_REGEX.test(form.profileName.toLowerCase())) {
      Alert.alert('오류', '포트폴리오 이름은 소문자·숫자·하이픈(3-30자)만 사용 가능합니다.'); return;
    }
    const instagram = form.instagramId.replace(/^@/, '');
    setSaving(true);
    try {
      await updateProfile({
        name:        form.name.trim(),
        tel:         form.tel.trim(),
        profileName: form.profileName.trim().toLowerCase() || undefined,
        instagramId: instagram || undefined,
        bio:         form.bio.trim() || undefined,
        websiteUrl:  form.websiteUrl.trim() || undefined,
        location:    form.location.trim() || undefined,
        specialties: form.specialties.join(',') || undefined,
      });
      setEditing(false);
      Alert.alert('완료', '프로필이 저장되었습니다.');
    } catch (err) {
      Alert.alert('오류', err.message || '저장 중 오류가 발생했습니다.');
    } finally { setSaving(false); }
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
      <View style={styles.avatarSection}>
        <TouchableOpacity onPress={editing ? handleAvatarPick : undefined} style={styles.avatarWrap}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatarImg} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
          )}
          {avatarUploading && (
            <View style={styles.avatarOverlay}>
              <ActivityIndicator color="#fff" />
            </View>
          )}
          {editing && !avatarUploading && (
            <View style={styles.avatarEditBadge}>
              <Text style={styles.avatarEditIcon}>📷</Text>
            </View>
          )}
        </TouchableOpacity>
        <Text style={styles.userName}>{user?.name}</Text>
        {user?.profileName && (
          <View style={styles.subdomainBadge}>
            <Text style={styles.subdomainText}>✦ {user.profileName}.happiness.app</Text>
          </View>
        )}
      </View>

      {/* 통계 */}
      {stats && (
        <View style={styles.statsRow}>
          <StatItem label="작품" value={stats.photoCount ?? 0} />
          <StatItem label="좋아요" value={stats.totalLikes ?? 0} />
          <StatItem label="저장" value={stats.totalSaves ?? 0} />
          <StatItem label="문의" value={stats.inquiryCount ?? 0} />
        </View>
      )}

      {/* 이메일 */}
      <View style={styles.emailRow}>
        <Text style={styles.emailLabel}>이메일</Text>
        <Text style={styles.emailValue}>{user?.email}</Text>
      </View>

      {/* 프로필 카드 */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>프로필 정보</Text>
          {!editing && (
            <TouchableOpacity onPress={() => setEditing(true)}>
              <Text style={styles.editBtn}>편집</Text>
            </TouchableOpacity>
          )}
        </View>

        <InfoRow label="이름 *" editing={editing} value={form.name} onChangeText={v => set('name', v)} placeholder="홍길동" />
        <InfoRow label="전화번호" editing={editing} value={form.tel} onChangeText={v => set('tel', v)}
          placeholder="010-0000-0000" keyboardType="phone-pad" />

        {/* 포트폴리오 이름 */}
        <View style={styles.group}>
          <Text style={styles.fieldLabel}>포트폴리오 이름</Text>
          {editing ? (
            <>
              <Text style={styles.fieldHint}>소문자·숫자·하이픈, 3-30자</Text>
              <View style={styles.profileNameRow}>
                <TextInput
                  style={[styles.input, styles.profileNameInput]}
                  value={form.profileName}
                  onChangeText={v => set('profileName', v.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  placeholder="my-portfolio"
                  placeholderTextColor={COLORS.textHint}
                  autoCapitalize="none" autoCorrect={false}
                />
                <Text style={styles.domainSuffix}>.happiness.app</Text>
              </View>
            </>
          ) : (
            <Text style={styles.fieldValue}>
              {user?.profileName ? `${user.profileName}.happiness.app` : '미설정'}
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
                autoCapitalize="none" autoCorrect={false}
              />
            </View>
          ) : (
            <Text style={styles.fieldValue}>
              {user?.instagramId ? `@${user.instagramId}` : '미설정'}
            </Text>
          )}
        </View>

        {/* 소개 */}
        <View style={styles.group}>
          <Text style={styles.fieldLabel}>소개</Text>
          {editing ? (
            <TextInput
              style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
              value={form.bio}
              onChangeText={v => set('bio', v)}
              placeholder="간단한 소개를 입력하세요"
              placeholderTextColor={COLORS.textHint}
              multiline
            />
          ) : (
            <Text style={styles.fieldValue}>{form.bio || '미설정'}</Text>
          )}
        </View>

        {/* 웹사이트 */}
        <InfoRow label="웹사이트" editing={editing} value={form.websiteUrl}
          onChangeText={v => set('websiteUrl', v)} placeholder="https://..." keyboardType="url" />

        {/* 위치 */}
        <InfoRow label="위치" editing={editing} value={form.location}
          onChangeText={v => set('location', v)} placeholder="서울, 대한민국" />

        {/* 전문 분야 */}
        {editing && (
          <View style={styles.group}>
            <Text style={styles.fieldLabel}>전문 분야</Text>
            <View style={styles.specialtyWrap}>
              {SPECIALTIES_OPTIONS.map(s => (
                <TouchableOpacity
                  key={s}
                  style={[styles.specialtyChip, form.specialties.includes(s) && styles.specialtyChipActive]}
                  onPress={() => toggleSpecialty(s)}
                >
                  <Text style={[styles.specialtyText, form.specialties.includes(s) && styles.specialtyTextActive]}>
                    {s}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {!editing && form.specialties.length > 0 && (
          <View style={styles.group}>
            <Text style={styles.fieldLabel}>전문 분야</Text>
            <View style={styles.specialtyWrap}>
              {form.specialties.map(s => (
                <View key={s} style={styles.specialtyChipActive}>
                  <Text style={styles.specialtyTextActive}>{s}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {editing && (
          <View style={styles.actionRow}>
            <TouchableOpacity style={[styles.btn, styles.btnSave]} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.btnText}>저장</Text>}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, styles.btnCancel]}
              onPress={() => {
                setForm({
                  name:        user?.name        || '',
                  tel:         user?.tel         || '',
                  profileName: user?.profileName || '',
                  instagramId: user?.instagramId || '',
                  bio:         user?.bio         || '',
                  websiteUrl:  user?.websiteUrl  || '',
                  location:    user?.location    || '',
                  specialties: user?.specialties ? user.specialties.split(',').map(s => s.trim()).filter(Boolean) : [],
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
        <Text style={styles.fieldValue}>{value || '미설정'}</Text>
      )}
    </View>
  );
}

function StatItem({ label, value }) {
  return (
    <View style={styles.statItem}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: SPACING.lg, paddingBottom: 40, backgroundColor: COLORS.bg, flexGrow: 1 },

  avatarSection: { alignItems: 'center', marginBottom: SPACING.lg },
  avatarWrap: { position: 'relative', marginBottom: SPACING.sm },
  avatarImg:  { width: 88, height: 88, borderRadius: 44 },
  avatarFallback: { width: 88, height: 88, borderRadius: 44, backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 30, fontWeight: '800' },
  avatarOverlay: { ...StyleSheet.absoluteFillObject, borderRadius: 44,
    backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  avatarEditBadge: { position: 'absolute', bottom: 0, right: 0, width: 26, height: 26,
    borderRadius: 13, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#fff' },
  avatarEditIcon: { fontSize: 12 },
  userName: { fontSize: FONT.xl, fontWeight: '800', color: COLORS.textPrimary },
  subdomainBadge: { backgroundColor: '#eef0fd', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4, marginTop: 4 },
  subdomainText: { color: COLORS.primary, fontSize: FONT.sm, fontWeight: '600' },

  statsRow: { flexDirection: 'row', backgroundColor: COLORS.white, borderRadius: RADIUS.card,
    marginBottom: SPACING.md, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },
  statItem: { flex: 1, alignItems: 'center', paddingVertical: 14,
    borderRightWidth: 1, borderRightColor: COLORS.border },
  statValue: { fontSize: FONT.xl, fontWeight: '800', color: COLORS.textPrimary },
  statLabel: { fontSize: FONT.xs, color: COLORS.textMuted, marginTop: 2 },

  emailRow: { backgroundColor: COLORS.white, borderRadius: RADIUS.card, padding: SPACING.md,
    marginBottom: SPACING.md, flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  emailLabel: { color: COLORS.textMuted, fontSize: FONT.sm, fontWeight: '600' },
  emailValue: { color: COLORS.textPrimary, fontSize: FONT.sm, fontWeight: '500' },

  card: { backgroundColor: COLORS.white, borderRadius: RADIUS.card, padding: SPACING.lg,
    marginBottom: SPACING.lg, borderWidth: 1, borderColor: COLORS.border },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  cardTitle: { fontSize: FONT.lg, fontWeight: '700', color: COLORS.textPrimary },
  editBtn: { color: COLORS.primary, fontWeight: '700', fontSize: FONT.sm },

  group: { marginBottom: SPACING.md },
  fieldLabel: { color: COLORS.textMuted, fontSize: FONT.sm, fontWeight: '600', marginBottom: 4 },
  fieldHint:  { color: COLORS.textHint, fontSize: 11, marginBottom: 6 },
  fieldValue: { color: COLORS.textPrimary, fontSize: FONT.base, fontWeight: '500' },
  input: {
    borderWidth: 1, borderColor: COLORS.borderLight, borderRadius: RADIUS.md,
    paddingHorizontal: 12, paddingVertical: 10, color: COLORS.textPrimary,
    backgroundColor: COLORS.bg, fontSize: FONT.base,
  },
  profileNameRow: { flexDirection: 'row', alignItems: 'center' },
  profileNameInput: { flex: 1, borderTopRightRadius: 0, borderBottomRightRadius: 0, borderRightWidth: 0 },
  domainSuffix: { borderWidth: 1, borderColor: COLORS.borderLight,
    borderTopRightRadius: RADIUS.md, borderBottomRightRadius: RADIUS.md,
    paddingHorizontal: 10, paddingVertical: 10,
    color: COLORS.textMuted, fontSize: FONT.sm, backgroundColor: COLORS.bg },
  instagramRow: { flexDirection: 'row', alignItems: 'center' },
  atPrefix: { borderWidth: 1, borderColor: COLORS.borderLight,
    borderTopLeftRadius: RADIUS.md, borderBottomLeftRadius: RADIUS.md,
    borderRightWidth: 0, paddingHorizontal: 12, paddingVertical: 10,
    color: COLORS.primary, fontWeight: '700', backgroundColor: COLORS.bg },

  specialtyWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  specialtyChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.white },
  specialtyChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  specialtyText: { color: COLORS.textSecondary, fontSize: FONT.xs, fontWeight: '600' },
  specialtyTextActive: { color: '#fff', fontSize: FONT.xs, fontWeight: '600' },

  actionRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  btn: { flex: 1, paddingVertical: 12, borderRadius: RADIUS.md, alignItems: 'center' },
  btnSave:   { backgroundColor: COLORS.primary },
  btnCancel: { backgroundColor: COLORS.cancel },
  btnText:   { color: '#fff', fontWeight: '700' },

  logoutBtn: { backgroundColor: '#fff', borderRadius: RADIUS.md, paddingVertical: 14,
    alignItems: 'center', borderWidth: 1, borderColor: '#ff3b30' },
  logoutText: { color: '#ff3b30', fontWeight: '700', fontSize: FONT.base },
});
