import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView,
} from 'react-native';
import { authMobileApi } from '../src/api/authMobileApi';
import { COLORS } from '../constants/colors';
import { EMAIL_RE, formatPhone, validateField } from '../utils/signupValidation';

// 계정 찾기 — 아이디(이메일) 찾기 · 비밀번호 재설정 메일 요청. 웹 FindAccountPage와 같은 API·문구.
// 재설정 링크는 메일에서 웹(/reset-password)으로 열린다(모바일 딥링크는 범위 밖). 기획: PLANNING_account-recovery.md
const PROVIDER_LABEL = { local: '이메일', kakao: '카카오', google: 'Google', naver: '네이버', apple: 'Apple' };
const NO_AUTO_FIX = { autoCapitalize: 'none', autoCorrect: false, spellCheck: false };

export default function FindAccountScreen({ navigation, route }) {
  const [tab, setTab] = useState(route?.params?.tab === 'password' ? 'password' : 'email');
  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back} accessibilityRole="button" accessibilityLabel="뒤로">
          <Text style={styles.backText}>‹ 로그인</Text>
        </TouchableOpacity>
        <Text style={styles.title}>계정 찾기</Text>

        <View style={styles.card}>
          <View style={styles.tabs} accessibilityRole="tablist">
            {[['email', '아이디 찾기'], ['password', '비밀번호 찾기']].map(([key, label]) => (
              <TouchableOpacity key={key} style={[styles.tab, tab === key && styles.tabActive]}
                onPress={() => setTab(key)} accessibilityRole="tab" accessibilityState={{ selected: tab === key }}>
                <Text style={[styles.tabText, tab === key && styles.tabTextActive]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {tab === 'email'
            ? <FindEmail onLogin={() => navigation.navigate('Login')} onGoPassword={() => setTab('password')} />
            : <ResetRequest />}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function FindEmail({ onLogin, onGoPassword }) {
  const [name, setName] = useState('');
  const [tel, setTel] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [apiErr, setApiErr] = useState('');
  const [accounts, setAccounts] = useState(null);

  const check = (field, value) => {
    if (field === 'name') return value.trim() ? '' : '이름을 입력해주세요.';
    if (!value) return '휴대폰 번호를 입력해주세요.';
    return validateField('tel', { tel: value });
  };

  const submit = async () => {
    const errs = { name: check('name', name), tel: check('tel', tel) };
    setErrors(errs);
    if (errs.name || errs.tel) return;
    setLoading(true); setApiErr('');
    try {
      const res = await authMobileApi.findEmail(name.trim(), tel);
      setAccounts(res?.data?.data?.accounts || []);
    } catch (err) {
      setApiErr(err.response?.data?.message || '잠시 후 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  if (accounts) {
    return (
      <View accessibilityLiveRegion="polite">
        <Text style={styles.resultTitle}>{accounts.length ? '가입된 계정을 찾았어요' : '일치하는 계정이 없어요'}</Text>
        {accounts.length ? accounts.map((a, i) => (
          <View key={i} style={styles.account}>
            <View style={{ flex: 1 }}>
              <Text style={styles.accountEmail}>{a.maskedEmail}</Text>
              {!!a.joinedAt && <Text style={styles.accountMeta}>{a.joinedAt} 가입</Text>}
            </View>
            <Text style={styles.badge}>{PROVIDER_LABEL[a.provider] || a.provider} 가입</Text>
          </View>
        )) : (
          <Text style={styles.desc}>
            이름과 휴대폰 번호를 다시 확인해 주세요. 가입할 때 휴대폰 번호를 넣지 않았다면 찾을 수 없어요 — 쓰셨을 만한 이메일로 비밀번호 찾기를 해 보세요.
          </Text>
        )}
        <Btn label={accounts.length ? '로그인하러 가기' : '다시 찾기'} onPress={accounts.length ? onLogin : () => setAccounts(null)} />
        <Btn label="비밀번호 찾기" secondary onPress={onGoPassword} />
      </View>
    );
  }

  return (
    <View>
      <Text style={styles.desc}>가입할 때 넣은 이름과 휴대폰 번호로 가입 이메일을 찾아요.</Text>
      {!!apiErr && <Text style={styles.banner}>{apiErr}</Text>}
      <Field label="이름" value={name} error={errors.name} placeholder="홍길동"
        textContentType="name" autoComplete="name"
        onChangeText={v => { setName(v); if (errors.name) setErrors(p => ({ ...p, name: check('name', v) })); }}
        onBlur={() => setErrors(p => ({ ...p, name: check('name', name) }))} />
      <Field label="휴대폰 번호" value={tel} error={errors.tel} placeholder="010-0000-0000"
        keyboardType="phone-pad" textContentType="telephoneNumber" autoComplete="tel" maxLength={13}
        onChangeText={v => { const f = formatPhone(v); setTel(f); if (errors.tel) setErrors(p => ({ ...p, tel: check('tel', f) })); }}
        onBlur={() => setErrors(p => ({ ...p, tel: check('tel', tel) }))} />
      <Btn label="아이디 찾기" loading={loading} onPress={submit} />
    </View>
  );
}

function ResetRequest() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [apiErr, setApiErr] = useState('');
  const [sentTo, setSentTo] = useState('');

  const check = v => (!v.trim() ? '이메일을 입력해주세요.'
    : EMAIL_RE.test(v.trim()) ? '' : '올바른 이메일 형식이 아닙니다. (예: user@example.com)');

  const send = async () => {
    const value = email.trim();
    setEmail(value);
    const msg = check(value);
    setError(msg);
    if (msg) return;
    setLoading(true); setApiErr('');
    try {
      await authMobileApi.requestPasswordReset(value.toLowerCase());
      setSentTo(value);
    } catch (err) {
      setApiErr(err.response?.data?.message || '잠시 후 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  if (sentTo) {
    return (
      <View accessibilityLiveRegion="polite" style={{ alignItems: 'center' }}>
        <Text style={{ fontSize: 34, marginBottom: 8 }}>✉️</Text>
        <Text style={styles.resultTitle}>메일을 확인해 주세요</Text>
        <Text style={[styles.desc, { textAlign: 'center' }]}>
          {sentTo}이(가) 가입된 이메일이면 30분 동안 쓸 수 있는 재설정 링크를 보냈어요. 메일의 링크는 웹 브라우저에서 열려요. 메일이 안 보이면 스팸함도 확인해 주세요.
        </Text>
        {!!apiErr && <Text style={styles.banner}>{apiErr}</Text>}
        <Btn label="다시 보내기" secondary loading={loading} onPress={send} />
        <Btn label="다른 이메일 입력" ghost onPress={() => setSentTo('')} />
      </View>
    );
  }

  return (
    <View>
      <Text style={styles.desc}>가입한 이메일을 입력하면 새 비밀번호를 정할 수 있는 링크를 보내 드려요.</Text>
      {!!apiErr && <Text style={styles.banner}>{apiErr}</Text>}
      <Field label="이메일" value={email} error={error} placeholder="your@email.com"
        keyboardType="email-address" textContentType="emailAddress" autoComplete="email" {...NO_AUTO_FIX}
        onChangeText={v => { setEmail(v); if (error) setError(check(v)); }}
        onBlur={() => { const v = email.trim(); setEmail(v); setError(check(v)); }} />
      <Btn label="재설정 메일 받기" loading={loading} onPress={send} />
    </View>
  );
}

function Field({ label, error, ...props }) {
  return (
    <View style={styles.group}>
      <Text style={styles.label}>{label}</Text>
      <TextInput style={[styles.input, error && styles.inputError]} placeholderTextColor={COLORS.textMuted}
        accessibilityLabel={label} accessibilityHint={error || undefined} {...props} />
      {!!error && <Text style={styles.errorText} accessibilityLiveRegion="polite">⚠ {error}</Text>}
    </View>
  );
}

function Btn({ label, onPress, loading, secondary, ghost }) {
  return (
    <TouchableOpacity onPress={onPress} disabled={loading} accessibilityRole="button"
      style={[styles.btn, secondary && styles.btnSecondary, ghost && styles.btnGhost]}>
      {loading
        ? <ActivityIndicator color={secondary || ghost ? COLORS.primary : COLORS.white} />
        : <Text style={[styles.btnText, (secondary || ghost) && styles.btnTextAlt]}>{label}</Text>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: COLORS.darkDeep },
  inner:        { flexGrow: 1, justifyContent: 'center', padding: 24, paddingBottom: 40 },
  back:         { alignSelf: 'flex-start', paddingVertical: 6, marginBottom: 8 },
  backText:     { color: COLORS.accent, fontSize: 14, fontWeight: '600' },
  title:        { fontSize: 22, fontWeight: '700', color: COLORS.white, textAlign: 'center', marginBottom: 20 },
  card:         { backgroundColor: COLORS.dark, borderRadius: 20, padding: 20 },
  tabs:         { flexDirection: 'row', backgroundColor: COLORS.darkDeep, borderRadius: 12, padding: 4, marginBottom: 18 },
  tab:          { flex: 1, height: 40, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  tabActive:    { backgroundColor: COLORS.darkAlt },
  tabText:      { color: COLORS.textMuted, fontSize: 14, fontWeight: '500' },
  tabTextActive:{ color: COLORS.white, fontWeight: '700' },
  desc:         { color: COLORS.textMuted, fontSize: 13, lineHeight: 20, marginBottom: 16 },
  banner:       { color: COLORS.danger, fontSize: 13, marginBottom: 12 },
  group:        { marginBottom: 14 },
  label:        { color: COLORS.textLight, fontWeight: '600', marginBottom: 6, fontSize: 13 },
  input:        { backgroundColor: COLORS.darkAlt, borderWidth: 1, borderColor: COLORS.borderDark, borderRadius: 12,
                  paddingHorizontal: 14, paddingVertical: 11, color: COLORS.white, fontSize: 14 },
  inputError:   { borderColor: COLORS.danger },
  errorText:    { color: COLORS.danger, fontSize: 11, marginTop: 4 },
  resultTitle:  { color: COLORS.white, fontSize: 16, fontWeight: '700', marginBottom: 12 },
  account:      { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.darkAlt, borderRadius: 12,
                  padding: 14, marginBottom: 8 },
  accountEmail: { color: COLORS.white, fontSize: 15, fontWeight: '700' },
  accountMeta:  { color: COLORS.textMuted, fontSize: 12, marginTop: 3 },
  badge:        { color: COLORS.accent, fontSize: 11, fontWeight: '700', marginLeft: 8 },
  btn:          { backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 8, alignSelf: 'stretch' },
  btnSecondary: { backgroundColor: 'transparent', borderWidth: 1, borderColor: COLORS.borderDark },
  btnGhost:     { backgroundColor: 'transparent' },
  btnText:      { color: COLORS.white, fontWeight: '700', fontSize: 15 },
  btnTextAlt:   { color: COLORS.accent },
});
