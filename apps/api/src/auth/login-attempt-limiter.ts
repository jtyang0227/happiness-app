import { Injectable } from '@nestjs/common';

/** Spring LoginAttemptLimiter와 같은 규칙 — 같은 이메일 5회 연속 실패 시 15분 잠금 (인메모리) */
@Injectable()
export class LoginAttemptLimiter {
  static readonly MAX_FAILURES = 5;
  static readonly LOCK_MS = 15 * 60 * 1000;
  private readonly attempts = new Map<string, { failures: number; lockedUntil: number | null }>();

  private key(email?: string | null) {
    return (email ?? '').trim().toLowerCase();
  }

  /** 잠겨 있으면 남은 밀리초, 아니면 0 */
  remainingLockMs(email: string): number {
    const a = this.attempts.get(this.key(email));
    if (!a?.lockedUntil) return 0;
    const left = a.lockedUntil - Date.now();
    if (left <= 0) { this.attempts.delete(this.key(email)); return 0; }
    return left;
  }

  recordFailure(email: string) {
    const k = this.key(email);
    const failures = (this.attempts.get(k)?.failures ?? 0) + 1;
    this.attempts.set(k, { failures, lockedUntil: failures >= LoginAttemptLimiter.MAX_FAILURES ? Date.now() + LoginAttemptLimiter.LOCK_MS : null });
  }

  recordSuccess(email: string) {
    this.attempts.delete(this.key(email));
  }
}
