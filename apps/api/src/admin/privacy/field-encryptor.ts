import { Injectable, Logger } from '@nestjs/common';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';
import { AdminServerError } from '../common/admin-errors.js';

const PREFIX = 'enc:v1:';
const IV_BYTES = 12;
const TAG_BYTES = 16;
const DEV_KEY_SEED = 'happiness-admin-dev-only-privacy-key';

/**
 * Spring 어드민 FieldEncryptor — 어드민 소유 자유서술 필드(정지 사유·운영 메모 등) AES-256-GCM.
 * 저장 형식 "enc:v1:" + Base64(IV 12 ‖ 암호문 ‖ 태그 16). 접두어 없는 값은 이관 전 평문으로 보고 그대로.
 * 키는 PRIVACY_ENCRYPTION_KEY(Base64 32바이트) — 같은 키여야 Spring이 쓴 암호문을 읽는다.
 */
@Injectable()
export class FieldEncryptor {
  private readonly log = new Logger('FieldEncryptor');
  private readonly key: Buffer;

  constructor() {
    const b64 = process.env.PRIVACY_ENCRYPTION_KEY;
    if (!b64 || b64.trim() === '') {
      if ((process.env.NODE_ENV ?? '') === 'production') {
        throw new Error('PRIVACY_ENCRYPTION_KEY(Base64 32바이트)가 설정되지 않았습니다 — 운영에서는 필수입니다.');
      }
      this.log.warn('[PRIVACY] PRIVACY_ENCRYPTION_KEY 미설정 — 개발용 고정 키를 사용합니다. 운영에서는 반드시 설정하세요.');
      this.key = createHash('sha256').update(DEV_KEY_SEED, 'utf8').digest();
    } else {
      this.key = Buffer.from(b64.trim(), 'base64');
      if (this.key.length !== 32) throw new Error('PRIVACY_ENCRYPTION_KEY는 Base64로 인코딩한 32바이트(AES-256)여야 합니다.');
    }
  }

  encrypt(plain: string | null): string | null {
    if (plain === null || plain.startsWith(PREFIX)) return plain;
    const iv = randomBytes(IV_BYTES);
    const c = createCipheriv('aes-256-gcm', this.key, iv);
    const ct = Buffer.concat([c.update(plain, 'utf8'), c.final(), c.getAuthTag()]);
    return PREFIX + Buffer.concat([iv, ct]).toString('base64');
  }

  decrypt(stored: string | null): string | null {
    if (stored === null || !stored.startsWith(PREFIX)) return stored;
    try {
      const all = Buffer.from(stored.slice(PREFIX.length), 'base64');
      const d = createDecipheriv('aes-256-gcm', this.key, all.subarray(0, IV_BYTES));
      d.setAuthTag(all.subarray(all.length - TAG_BYTES));
      return Buffer.concat([d.update(all.subarray(IV_BYTES, all.length - TAG_BYTES)), d.final()]).toString('utf8');
    } catch {
      // Spring: IllegalStateException → 처리 안 된 예외 500
      throw new AdminServerError('복호화에 실패했습니다 — 키가 다르거나 데이터가 변조되었습니다.');
    }
  }
}
