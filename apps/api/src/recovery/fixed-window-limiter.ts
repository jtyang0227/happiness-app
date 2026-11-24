/** Spring AccountRecoveryService.allow()와 같은 인메모리 고정 창 — key → [count, windowStartSec] */
export class FixedWindowLimiter {
  private readonly map = new Map<string, [number, number]>();

  allow(key: string, limit: number, windowSeconds: number): boolean {
    const now = Math.floor(Date.now() / 1000);
    const v = this.map.get(key);
    if (!v || now - v[1] > windowSeconds) {
      this.map.set(key, [1, now]);
      return 1 <= limit;
    }
    v[0]++;
    return v[0] <= limit;
  }
}
