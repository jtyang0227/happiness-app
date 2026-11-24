/**
 * 회원가입 입력 규칙 — 서버(MemberService)와 같아야 한다. 다르면 화면은 통과시키고 서버가 400을 낸다.
 * 기획: DESIGN_PROMPTS/planning/QA_signup-validation.md
 */
export const EMAIL_RE = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
// 서버 PROFILE_NAME_PATTERN 그대로 — 1~30자, 하이픈으로 시작·끝 불가
export const PROFILE_NAME_RE = /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$|^[a-z0-9]{1,2}$/;
export const INSTAGRAM_RE = /^[a-zA-Z0-9._]{1,30}$/;
// 서버 normalizeTel과 같은 기준(숫자만 보고 01x + 7~8자리)
const TEL_DIGITS_RE = /^01[0-9]\d{7,8}$/;

export const PROFILE_NAME_HINT = '영문 소문자·숫자·하이픈 30자 이하 · 하이픈으로 시작·끝 불가';

export function formatPhone(value) {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length < 4) return digits;
  if (digits.length < 8) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  if (digits.length === 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 11)}`;
}

/** 입력 중 바로 바꿔도 되는 정규화(한글 조합을 깨지 않는 것만 — 글자를 지우지 않는다). */
export function normalizeOnChange(name, value) {
  if (name === 'tel') return formatPhone(value);
  if (name === 'profileName') return value.toLowerCase();
  return value;
}

/** 벗어날 때·제출할 때 하는 정규화 — 휴대폰 키보드가 붙이는 앞뒤 공백, 인스타그램 앞 @. */
export function normalizeOnBlur(name, value) {
  if (typeof value !== 'string') return value;
  if (name === 'email' || name === 'profileName' || name === 'name') return value.trim();
  if (name === 'instagramId') return value.trim().replace(/^@/, '');
  return value;
}

/** 필드 하나를 검사해 오류 문구(없으면 '')를 돌려준다. form 전체를 받아 비밀번호 확인도 계산한다. */
export function validateField(name, form) {
  const v = form[name];
  switch (name) {
    case 'name':
      return v.trim() ? '' : '이름을 입력해주세요.';
    case 'email':
      if (!v.trim()) return '이메일을 입력해주세요.';
      return EMAIL_RE.test(v.trim()) ? '' : '올바른 이메일 형식이 아닙니다. (예: user@example.com)';
    case 'password':
      if (!v) return '비밀번호를 입력해주세요.';
      return v.length >= 8 ? '' : '최소 8자 이상 입력해주세요.';
    case 'confirmPassword':
      if (!v) return '비밀번호를 한 번 더 입력해주세요.';
      return v === form.password ? '' : '비밀번호가 일치하지 않습니다.';
    case 'profileName':
      if (!v.trim()) return '포트폴리오 주소를 입력해주세요.';
      return PROFILE_NAME_RE.test(v.trim()) ? '' : '영문 소문자·숫자·하이픈 30자 이하로, 하이픈으로 시작하거나 끝날 수 없습니다.';
    case 'tel':
      if (!v) return '';
      return TEL_DIGITS_RE.test(v.replace(/\D/g, '')) ? '' : '올바른 휴대폰 번호 형식이 아닙니다.';
    case 'instagramId': {
      const id = v.trim().replace(/^@/, '');
      if (!id) return '';
      return INSTAGRAM_RE.test(id) ? '' : '영문·숫자·점(.)·밑줄(_) 30자 이하만 가능합니다.';
    }
    case 'termsAgreed':
      return v ? '' : '이용약관 및 개인정보처리방침에 동의해주세요.';
    default:
      return '';
  }
}

export const SIGNUP_FIELDS = ['name', 'email', 'password', 'confirmPassword', 'profileName', 'tel', 'instagramId', 'termsAgreed'];

export function validateAll(form) {
  const errors = {};
  SIGNUP_FIELDS.forEach((f) => {
    const msg = validateField(f, form);
    if (msg) errors[f] = msg;
  });
  return errors;
}
