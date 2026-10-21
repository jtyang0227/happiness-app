import React, { useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { useAuth } from '../store/AuthContext';
import { authMobileApi } from '../src/api/authMobileApi';
import { COLORS } from '../constants/colors';
import {
  PROFILE_NAME_HINT, SIGNUP_FIELDS,
  normalizeOnChange, normalizeOnBlur, validateField, validateAll,
} from '../utils/signupValidation';

// 기획: DESIGN_PROMPTS/planning/QA_signup-validation.md — 입력란을 벗어날 때 검사하고, 그 뒤엔 고치는 즉시 재검사.
// 휴대폰 키보드의 자동 대문자·자동 수정을 끄는 공통 속성
const NO_AUTO_FIX = { autoCapitalize: 'none', autoCorrect: false, spellCheck: false };

const LABELS = { email: '이메일', profileName: '포트폴리오 주소' };

export default function SignUpScreen({ navigation }) {
  const { signup } = useAuth();
  const [form, setForm] = useState({
    name: '', email: '', password: '', confirmPassword: '',
    tel: '', profileName: '', instagramId: '', termsAgreed: false,
  });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [success, setSuccess] = useState({});
  const [checking, setChecking] = useState({});
  const [loading, setLoading] = useState(false);
  const formRef = useRef(form);
  formRef.current = form;

  const handleChange = (name, value) => {
    const nextForm = { ...formRef.current, [name]: normalizeOnChange(name, value) };
    setForm(nextForm);
    setErrors(p => {
      const next = { ...p, [name]: touched[name] ? validateField(name, nextForm) : '' };
      if (name === 'password' && touched.confirmPassword) next.confirmPassword = validateField('confirmPassword', nextForm);
      return next;
    });
    setSuccess(p => ({ ...p, [name]: '' }));
  };

  const handleBlur = (name) => {
    const raw = formRef.current[name];
    const value = normalizeOnBlur(name, raw);
    const nextForm = value === raw ? formRef.current : { ...formRef.current, [name]: value };
    if (value !== raw) setForm(nextForm);
    setTouched(p => ({ ...p, [name]: true }));
    const msg = validateField(name, nextForm);
    setErrors(p => ({ ...p, [name]: msg }));
    if (!msg && value && (name === 'email' || name === 'profileName')) checkDuplicate(name, value);
  };

  const checkDuplicate = async (name, value) => {
    setChecking(p => ({ ...p, [name]: true }));
    try {
      const res = name === 'email'
        ? await authMobileApi.checkEmail(value)
        : await authMobileApi.checkProfileName(value);
      if (formRef.current[name].trim() !== value) return;  // 그 사이 값이 바뀌었으면 버린다
      const available = res?.data?.data?.available;       // axios 응답 → ApiResponse → { available }
      if (available === false) {
        setErrors(p => ({ ...p, [name]: `이미 사용 중인 ${LABELS[name]}입니다.` }));
        setSuccess(p => ({ ...p, [name]: '' }));
      } else if (available === true) {
        setSuccess(p => ({ ...p, [name]: `사용 가능한 ${LABELS[name]}입니다.` }));
      }
    } catch { /* 확인 실패는 가입 요청 때 서버가 다시 검사한다 */ }
    finally { setChecking(p => ({ ...p, [name]: false })); }
  };

  const handleSignUp = async () => {
    const cleaned = { ...form };
    SIGNUP_FIELDS.forEach(f => { cleaned[f] = normalizeOnBlur(f, cleaned[f]); });
    setForm(cleaned);
    setTouched(Object.fromEntries(SIGNUP_FIELDS.map(f => [f, true])));
    const errs = { ...validateAll(cleaned) };
    ['email', 'profileName'].forEach(f => { if (!errs[f] && errors[f]) errs[f] = errors[f]; });
    if (Object.keys(errs).length) {
      setErrors(errs);
      Alert.alert('입력 오류', errs[SIGNUP_FIELDS.find(f => errs[f])]);
      return;
    }
    setLoading(true);
    try {
      await signup({
        name:          cleaned.name,
        email:         cleaned.email.toLowerCase(),
        password:      cleaned.password,
        tel:           cleaned.tel,
        profileName:   cleaned.profileName || undefined,
        instagramId:   cleaned.instagramId || undefined,
        termsAgreed:   true,
        privacyAgreed: true,
      });
    } catch (err) {
      // axios 기본 문구("Request failed with status code 400") 대신 서버가 보낸 사유를 보여 준다
      Alert.alert('회원가입 실패', err.response?.data?.message || err.message || '잠시 후 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  // 입력란 공통 속성 — 값·이벤트 연결
  const bind = (name) => ({
    value: form[name],
    onChangeText: v => handleChange(name, v),
    onBlur: () => handleBlur(name),
    error: errors[name],
    success: success[name],
    checking: checking[name],
  });

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
        <Text style={styles.subtitle}>당신의 포트폴리오를 세상에 선보이세요</Text>

        <View style={styles.card}>
          {/* 필수 정보 */}
          <Text style={styles.sectionLabel}>기본 정보</Text>

          <Field label="이름 *" placeholder="홍길동"
            autoCapitalize="words" textContentType="name" autoComplete="name"
            {...bind('name')} />

          <Field label="이메일 *" placeholder="your@email.com"
            keyboardType="email-address" textContentType="emailAddress" autoComplete="email"
            {...NO_AUTO_FIX} {...bind('email')} />

          <Field label="비밀번호 * (8자 이상)" placeholder="••••••••"
            secureTextEntry textContentType="newPassword" autoComplete="password-new"
            {...NO_AUTO_FIX} {...bind('password')} />

          <Field label="비밀번호 확인 *" placeholder="••••••••"
            secureTextEntry textContentType="newPassword" autoComplete="password-new"
            {...NO_AUTO_FIX} {...bind('confirmPassword')} />

          <Field label="전화번호 (선택)" placeholder="010-0000-0000"
            keyboardType="phone-pad" textContentType="telephoneNumber" autoComplete="tel"
            maxLength={13} {...bind('tel')} />

          {/* 프로필 정보 */}
          <Text style={[styles.sectionLabel, { marginTop: 20 }]}>프로필 (선택)</Text>

          <Field label="포트폴리오 이름" hint={PROFILE_NAME_HINT}
            placeholder="my-portfolio" maxLength={30}
            {...NO_AUTO_FIX} {...bind('profileName')} />

          <Field label="인스타그램 아이디" prefix="@" placeholder="your_instagram" maxLength={31}
            {...NO_AUTO_FIX} {...bind('instagramId')} />

          {/* 약관 동의 */}
          <TouchableOpacity
            style={styles.checkRow}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: form.termsAgreed }}
            onPress={() => {
              setForm(f => ({ ...f, termsAgreed: !f.termsAgreed }));
              setErrors(p => ({ ...p, termsAgreed: '' }));
            }}
          >
            <View style={[styles.checkbox, form.termsAgreed && styles.checkboxChecked]}>
              {form.termsAgreed && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.checkLabel}>
              {'(필수) '}
              <Text style={styles.checkLinkText} onPress={() => navigation.navigate('Legal', { tab: 'terms' })}>
                이용약관
              </Text>
              {' 및 '}
              <Text style={styles.checkLinkText} onPress={() => navigation.navigate('Legal', { tab: 'privacy' })}>
                개인정보처리방침
              </Text>
              {'에 동의합니다.'}
            </Text>
          </TouchableOpacity>
          {!!errors.termsAgreed && <Text style={[styles.errorText, { marginTop: -14, marginBottom: 14 }]}>⚠ {errors.termsAgreed}</Text>}

          <TouchableOpacity style={styles.btnPrimary} onPress={handleSignUp} disabled={loading}>
            {loading
              ? <ActivityIndicator color={COLORS.white} />
              : <Text style={styles.btnText}>가입하기</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity style={styles.loginLink} onPress={() => navigation.navigate('Login')}>
            <Text style={styles.loginLinkText}>
              이미 계정이 있으신가요? <Text style={styles.loginLinkBold}>로그인</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/** 입력란 + 아래 상태 문구(오류 ⚠ / 확인됨 ✓ / 힌트). 오류일 때 테두리 danger. */
function Field({ label, hint, prefix, error, success, checking, ...props }) {
  return (
    <View style={styles.group}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputRow}>
        {prefix && <Text style={[styles.prefix, error && styles.inputError]}>{prefix}</Text>}
        <TextInput
          style={[styles.input, prefix && styles.inputWithPrefix, error && styles.inputError]}
          placeholderTextColor={COLORS.textMuted}
          accessibilityLabel={label}
          accessibilityHint={error || undefined}
          {...props}
        />
        {checking && <Text style={styles.checking}>확인 중…</Text>}
      </View>
      {error
        ? <Text style={styles.errorText} accessibilityLiveRegion="polite">⚠ {error}</Text>
        : success
          ? <Text style={styles.successText} accessibilityLiveRegion="polite">✓ {success}</Text>
          : hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: COLORS.darkDeep },
  inner:       { flexGrow: 1, justifyContent: 'center', padding: 24, paddingBottom: 40 },
  logoWrap:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  logoIcon:    { fontSize: 28, color: COLORS.accent, marginRight: 8 },
  logoText:    { fontSize: 32, fontWeight: '800', color: COLORS.white, letterSpacing: 2 },
  title:       { fontSize: 22, fontWeight: '700', color: COLORS.white, textAlign: 'center', marginBottom: 6 },
  subtitle:    { fontSize: 14, color: COLORS.textMuted, textAlign: 'center', marginBottom: 24 },
  card:        { backgroundColor: COLORS.dark, borderRadius: 20, padding: 24 },
  sectionLabel:{ color: COLORS.accent, fontWeight: '700', fontSize: 12, letterSpacing: 1, marginBottom: 8, marginTop: 4 },
  group:       { marginBottom: 14 },
  label:       { color: COLORS.textLight, fontWeight: '600', marginBottom: 6, fontSize: 13 },
  hint:        { color: COLORS.textMuted, fontSize: 11, marginTop: 4 },
  errorText:   { color: COLORS.danger, fontSize: 11, marginTop: 4 },
  successText: { color: COLORS.success, fontSize: 11, marginTop: 4 },
  inputRow:    { flexDirection: 'row', alignItems: 'center' },
  input: {
    flex: 1,
    backgroundColor: COLORS.darkAlt,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    color: COLORS.white,
    fontSize: 14,
  },
  inputWithPrefix: { borderTopLeftRadius: 0, borderBottomLeftRadius: 0 },
  inputError:  { borderColor: COLORS.danger },
  prefix:      { backgroundColor: COLORS.darkAlt, borderWidth: 1, borderColor: COLORS.borderDark,
                 borderTopLeftRadius: 12, borderBottomLeftRadius: 12, borderRightWidth: 0,
                 paddingHorizontal: 12, paddingVertical: 11, color: COLORS.accent, fontWeight: '700' },
  checking:    { position: 'absolute', right: 12, color: COLORS.textMuted, fontSize: 11 },
  checkRow:    { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 20, marginTop: 8 },
  checkbox:    { width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, borderColor: COLORS.borderDark,
                 marginRight: 10, marginTop: 1, alignItems: 'center', justifyContent: 'center',
                 flexShrink: 0 },
  checkboxChecked: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  checkmark:   { color: COLORS.white, fontSize: 12, fontWeight: '700' },
  checkLabel:  { color: COLORS.textMuted, fontSize: 12, flex: 1, lineHeight: 20 },
  checkLinkText: { color: COLORS.accent, textDecorationLine: 'underline' },
  btnPrimary:  { backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 14,
                 alignItems: 'center', marginBottom: 16 },
  btnText:     { color: COLORS.white, fontWeight: '700', fontSize: 16 },
  loginLink:   { alignItems: 'center' },
  loginLinkText:{ color: COLORS.textMuted, fontSize: 13 },
  loginLinkBold:{ color: COLORS.accent, fontWeight: '700' },
});
