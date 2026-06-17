import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { useAuth } from '../store/AuthContext';

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

          <TouchableOpacity style={styles.btnPrimary} onPress={handleLogin} disabled={loading}>
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnText}>로그인</Text>
            }
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>또는</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity style={styles.btnKakao} onPress={() => Alert.alert('준비 중', '카카오 로그인은 준비 중입니다.')}>
            <Text style={styles.btnKakaoText}>💬  카카오로 계속하기</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnNaver} onPress={() => Alert.alert('준비 중', '네이버 로그인은 준비 중입니다.')}>
            <Text style={styles.btnNaverText}>N  네이버로 계속하기</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnGoogle} onPress={() => Alert.alert('준비 중', 'Google 로그인은 준비 중입니다.')}>
            <Text style={styles.btnGoogleText}>G  Google로 계속하기</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnApple} onPress={() => Alert.alert('준비 중', 'Apple 로그인은 준비 중입니다.')}>
            <Text style={styles.btnAppleText}> Apple로 계속하기</Text>
          </TouchableOpacity>

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
  logoIcon: { fontSize: 28, color: '#a78bfa', marginRight: 8 },
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
    backgroundColor: '#5b6ef5',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 16 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#374151' },
  dividerText: { color: '#6b7280', marginHorizontal: 12, fontSize: 13 },
  btnKakao: {
    backgroundColor: '#FEE500',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 8,
  },
  btnKakaoText: { color: '#3C1E1E', fontWeight: '700', fontSize: 15 },
  btnNaver: {
    backgroundColor: '#03C75A',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 8,
  },
  btnNaverText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  btnGoogle: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: '#dadce0',
  },
  btnGoogleText: { color: '#3c4043', fontWeight: '700', fontSize: 15 },
  btnApple: {
    backgroundColor: '#000',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnAppleText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  signupLink:      { marginTop: 20, alignItems: 'center' },
  signupLinkText:  { color: '#9ca3af', fontSize: 13 },
  signupLinkBold:  { color: '#a78bfa', fontWeight: '700' },

  legalRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    marginTop: 20, gap: 8 },
  legalLink: { color: '#6b7280', fontSize: 12, textDecorationLine: 'underline' },
  legalSep: { color: '#374151', fontSize: 12 },
});
