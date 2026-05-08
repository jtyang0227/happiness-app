import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { useAuth } from '../store/AuthContext';

const EMAIL_REGEX = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
const PROFILE_NAME_REGEX = /^[a-z0-9][a-z0-9\-]{1,28}[a-z0-9]$|^[a-z0-9]{1,2}$/;
const INSTAGRAM_REGEX = /^[a-zA-Z0-9._]{1,30}$/;

function validate(form) {
  if (!form.name.trim())          return '이름을 입력해주세요.';
  if (!form.email.trim())         return '이메일을 입력해주세요.';
  if (!EMAIL_REGEX.test(form.email.trim()))
                                  return '올바른 이메일 형식이 아닙니다. (예: user@example.com)';
  if (form.password.length < 8)   return '비밀번호는 8자 이상이어야 합니다.';
  if (form.password !== form.confirmPassword)
                                  return '비밀번호가 일치하지 않습니다.';
  if (form.profileName && !PROFILE_NAME_REGEX.test(form.profileName.toLowerCase()))
                                  return '프로필 이름은 소문자·숫자·하이픈(3-30자)만 가능합니다.';
  if (form.instagramId && !INSTAGRAM_REGEX.test(form.instagramId.replace(/^@/, '')))
                                  return '인스타그램 아이디 형식이 올바르지 않습니다.';
  if (!form.termsAgreed)          return '이용약관에 동의해야 합니다.';
  return null;
}

export default function SignUpScreen({ onGoLogin }) {
  const { signup } = useAuth();
  const [form, setForm] = useState({
    name: '', email: '', password: '', confirmPassword: '',
    tel: '', profileName: '', instagramId: '', termsAgreed: false,
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const set = (key, val) => {
    setForm(f => ({ ...f, [key]: val }));
    setErrors(e => ({ ...e, [key]: null }));
  };

  const handleSignUp = async () => {
    const msg = validate(form);
    if (msg) { Alert.alert('입력 오류', msg); return; }
    setLoading(true);
    try {
      await signup({
        name:        form.name.trim(),
        email:       form.email.trim().toLowerCase(),
        password:    form.password,
        tel:         form.tel.trim(),
        profileName: form.profileName.trim().toLowerCase() || undefined,
        instagramId: form.instagramId.replace(/^@/, '') || undefined,
        termsAgreed: true,
        privacyAgreed: true,
      });
    } catch (err) {
      Alert.alert('회원가입 실패', err.message || '잠시 후 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        <View style={styles.logoWrap}>
          <Text style={styles.logoIcon}>✦</Text>
          <Text style={styles.logoText}>Happiness</Text>
        </View>

        <Text style={styles.title}>새 계정 만들기</Text>
        <Text style={styles.subtitle}>당신의 포트폴리오 우주를 시작하세요</Text>

        <View style={styles.card}>

          {/* 필수 정보 */}
          <Text style={styles.sectionLabel}>기본 정보</Text>

          <Field label="이름 *" value={form.name}
            placeholder="홍길동"
            onChangeText={v => set('name', v)} />

          <Field label="이메일 *" value={form.email}
            placeholder="your@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            onChangeText={v => set('email', v)} />

          <Field label="비밀번호 * (8자 이상)" value={form.password}
            placeholder="••••••••"
            secureTextEntry
            onChangeText={v => set('password', v)} />

          <Field label="비밀번호 확인 *" value={form.confirmPassword}
            placeholder="••••••••"
            secureTextEntry
            onChangeText={v => set('confirmPassword', v)} />

          <Field label="전화번호 (선택)" value={form.tel}
            placeholder="010-0000-0000"
            keyboardType="phone-pad"
            onChangeText={v => set('tel', v)} />

          {/* 프로필 정보 */}
          <Text style={[styles.sectionLabel, { marginTop: 20 }]}>프로필 (선택)</Text>

          <View style={styles.group}>
            <Text style={styles.label}>포트폴리오 이름</Text>
            <Text style={styles.hint}>소문자·숫자·하이픈, 3-30자 · 서브도메인으로 사용됩니다</Text>
            <View style={styles.profileNameRow}>
              <TextInput
                style={[styles.input, styles.profileNameInput]}
                placeholder="my-portfolio"
                placeholderTextColor="#6b7280"
                value={form.profileName}
                onChangeText={v => set('profileName', v.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Text style={styles.domainSuffix}>.cosmos.app</Text>
            </View>
          </View>

          <View style={styles.group}>
            <Text style={styles.label}>인스타그램 아이디</Text>
            <View style={styles.instagramRow}>
              <Text style={styles.atPrefix}>@</Text>
              <TextInput
                style={[styles.input, { flex: 1, borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }]}
                placeholder="your_instagram"
                placeholderTextColor="#6b7280"
                value={form.instagramId.replace(/^@/, '')}
                onChangeText={v => set('instagramId', v.replace(/^@/, ''))}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          {/* 약관 동의 */}
          <TouchableOpacity
            style={styles.checkRow}
            onPress={() => set('termsAgreed', !form.termsAgreed)}
          >
            <View style={[styles.checkbox, form.termsAgreed && styles.checkboxChecked]}>
              {form.termsAgreed && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.checkLabel}>이용약관 및 개인정보처리방침에 동의합니다 *</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.btnPrimary} onPress={handleSignUp} disabled={loading}>
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnText}>가입하기</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity style={styles.loginLink} onPress={onGoLogin}>
            <Text style={styles.loginLinkText}>
              이미 계정이 있으신가요? <Text style={styles.loginLinkBold}>로그인</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({ label, ...props }) {
  return (
    <View style={styles.group}>
      <Text style={styles.label}>{label}</Text>
      <TextInput style={styles.input} placeholderTextColor="#6b7280" {...props} />
    </View>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#0a0a1a' },
  inner:       { flexGrow: 1, justifyContent: 'center', padding: 24, paddingBottom: 40 },
  logoWrap:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  logoIcon:    { fontSize: 28, color: '#a78bfa', marginRight: 8 },
  logoText:    { fontSize: 32, fontWeight: '800', color: '#fff', letterSpacing: 2 },
  title:       { fontSize: 22, fontWeight: '700', color: '#fff', textAlign: 'center', marginBottom: 6 },
  subtitle:    { fontSize: 14, color: '#9ca3af', textAlign: 'center', marginBottom: 24 },
  card:        { backgroundColor: '#1a1a2e', borderRadius: 20, padding: 24 },
  sectionLabel:{ color: '#a78bfa', fontWeight: '700', fontSize: 12, letterSpacing: 1, marginBottom: 8, marginTop: 4 },
  group:       { marginBottom: 14 },
  label:       { color: '#d1d5db', fontWeight: '600', marginBottom: 4, fontSize: 13 },
  hint:        { color: '#6b7280', fontSize: 11, marginBottom: 6 },
  input: {
    backgroundColor: '#0f0f1e',
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    color: '#fff',
    fontSize: 14,
  },
  profileNameRow:  { flexDirection: 'row', alignItems: 'center' },
  profileNameInput:{ flex: 1, borderTopRightRadius: 0, borderBottomRightRadius: 0, borderRightWidth: 0 },
  domainSuffix:    { backgroundColor: '#0f0f1e', borderWidth: 1, borderColor: '#374151',
                     borderTopRightRadius: 12, borderBottomRightRadius: 12,
                     paddingHorizontal: 10, paddingVertical: 11, color: '#6b7280', fontSize: 13 },
  instagramRow:    { flexDirection: 'row', alignItems: 'center' },
  atPrefix:        { backgroundColor: '#0f0f1e', borderWidth: 1, borderColor: '#374151',
                     borderTopLeftRadius: 12, borderBottomLeftRadius: 12, borderRightWidth: 0,
                     paddingHorizontal: 12, paddingVertical: 11, color: '#a78bfa', fontWeight: '700' },
  checkRow:    { flexDirection: 'row', alignItems: 'center', marginBottom: 20, marginTop: 8 },
  checkbox:    { width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, borderColor: '#374151',
                 marginRight: 10, alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: '#5b6ef5', borderColor: '#5b6ef5' },
  checkmark:   { color: '#fff', fontSize: 12, fontWeight: '700' },
  checkLabel:  { color: '#9ca3af', fontSize: 12, flex: 1 },
  btnPrimary:  { backgroundColor: '#5b6ef5', borderRadius: 12, paddingVertical: 14,
                 alignItems: 'center', marginBottom: 16 },
  btnText:     { color: '#fff', fontWeight: '700', fontSize: 16 },
  loginLink:   { alignItems: 'center' },
  loginLinkText:{ color: '#9ca3af', fontSize: 13 },
  loginLinkBold:{ color: '#a78bfa', fontWeight: '700' },
});
