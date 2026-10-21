import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { useAuth } from '../store/AuthContext';
import { COLORS } from '../constants/colors';

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('입력 오류', '이메일과 비밀번호를 입력해주세요.');
      return;
    }
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      Alert.alert('로그인 실패', err.message || '이메일 또는 비밀번호를 확인해주세요.');
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

        <Text style={styles.title}>다시 만나서 반가워요</Text>
        <Text style={styles.subtitle}>계정에 로그인하고 포트폴리오를 탐험하세요</Text>

        <View style={styles.card}>
          <Text style={styles.label}>이메일</Text>
          <TextInput
            style={styles.input}
            placeholder="your@email.com"
            placeholderTextColor="#6b7280"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />

          <Text style={styles.label}>비밀번호</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor="#6b7280"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <View style={styles.findRow}>
            <TouchableOpacity onPress={() => navigation.navigate('FindAccount', { tab: 'email' })} hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}>
              <Text style={styles.findText}>아이디 찾기</Text>
            </TouchableOpacity>
            <Text style={styles.findDot}>·</Text>
            <TouchableOpacity onPress={() => navigation.navigate('FindAccount', { tab: 'password' })} hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}>
              <Text style={styles.findText}>비밀번호 찾기</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.btnPrimary} onPress={handleLogin} disabled={loading}>
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnText}>로그인</Text>
            }
          </TouchableOpacity>

          {/* 소셜 로그인 버튼은 모바일에서 아직 동작하지 않아 숨김 — 미완성 기능은 앱 심사 거절 사유(Apple 2.1).
              다시 붙일 때 Apple 로그인도 함께 넣어야 한다(Apple 4.8). PLANNING_app-store-review.md */}
          <TouchableOpacity style={styles.signupLink} onPress={() => navigation.navigate('SignUp')}>
            <Text style={styles.signupLinkText}>
              계정이 없으신가요? <Text style={styles.signupLinkBold}>회원가입</Text>
            </Text>
          </TouchableOpacity>
        </View>

        {/* 법적 고지 */}
        <View style={styles.legalRow}>
          <TouchableOpacity onPress={() => navigation.navigate('Legal', { tab: 'privacy' })}>
            <Text style={styles.legalLink}>개인정보처리방침</Text>
          </TouchableOpacity>
          <Text style={styles.legalSep}>·</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Legal', { tab: 'terms' })}>
            <Text style={styles.legalLink}>이용약관</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a1a' },
  inner: { flexGrow: 1, justifyContent: 'center', padding: 24, paddingBottom: 32 },
  logoWrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  logoIcon: { fontSize: 28, color: '#4E9FFF', marginRight: 8 },
  logoText: { fontSize: 32, fontWeight: '800', color: '#fff', letterSpacing: 2 },
  title: { fontSize: 22, fontWeight: '700', color: '#fff', textAlign: 'center', marginBottom: 6 },
  subtitle: { fontSize: 14, color: '#9ca3af', textAlign: 'center', marginBottom: 28 },
  card: { backgroundColor: '#1a1a2e', borderRadius: 20, padding: 24 },
  label: { color: '#d1d5db', fontWeight: '600', marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: '#0f0f1e',
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#fff',
    marginBottom: 4,
  },
  btnPrimary: {
    backgroundColor: '#3182F6',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  signupLink:      { marginTop: 20, alignItems: 'center' },
  findRow:         { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: -6, marginBottom: 14 },
  findText:        { color: COLORS.textMuted, fontSize: 12.5 },
  findDot:         { color: COLORS.textMuted, fontSize: 12.5, marginHorizontal: 6 },
  signupLinkText:  { color: '#9ca3af', fontSize: 13 },
  signupLinkBold:  { color: '#4E9FFF', fontWeight: '700' },

  legalRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    marginTop: 20, gap: 8 },
  legalLink: { color: '#6b7280', fontSize: 12, textDecorationLine: 'underline' },
  legalSep: { color: '#374151', fontSize: 12 },
});
