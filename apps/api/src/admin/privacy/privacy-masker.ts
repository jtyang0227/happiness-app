import { isBlank } from '../../common/json-body.js';

/** java String.split — 끝의 빈 조각은 버린다 */
function javaSplit(s: string, sep: string): string[] {
  const parts = s.split(sep);
  while (parts.length && parts[parts.length - 1] === '') parts.pop();
  return parts;
}

/** Spring 어드민 PrivacyMasker — 화면 기본 노출용(원문은 사유 입력 + 접속기록으로만) */
export const PrivacyMasker = {
  /** user2@test.com → us***@test.com */
  email(email: string | null): string | null {
    if (email === null || isBlank(email)) return email;
    const at = email.indexOf('@');
    if (at <= 0) return '***';
    return email.slice(0, Math.min(2, at)) + '***' + email.slice(at);
  },
  /** 010-1234-0002 → 010-****-0002, 01012340002 → 010****0002 */
  tel(tel: string | null): string | null {
    if (tel === null || isBlank(tel)) return tel;
    const digits = tel.replace(/\D/g, '');
    if (digits.length < 7) return '****';
    if (tel.includes('-')) {
      const parts = javaSplit(tel, '-');
      if (parts.length === 3) return `${parts[0]}-****-${parts[2]}`;
    }
    return digits.slice(0, 3) + '****' + digits.slice(digits.length - 4);
  },
};
