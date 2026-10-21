import { useCallback, useEffect, useState } from 'react';
import { blockApi } from '../src/api/safetyApi';

/**
 * 내가 차단한 회원 id 목록 — 화면마다 따로 부르지 않도록 모듈 단위로 한 번 불러 공유하고,
 * 차단·해제 시 구독 중인 모든 화면(탐색·피드·사진 상세·모임)이 함께 갱신된다.
 * 서버는 공개 응답을 바꾸지 않으므로 숨김은 여기서 한다.
 */
let cache = null;        // Set<number> | null
let loading = null;      // Promise | null
const listeners = new Set();

function emit() { listeners.forEach(fn => fn(cache)); }

async function load(force = false) {
  if (cache && !force) return cache;
  if (!loading) {
    loading = blockApi.list()
      .then(rows => { cache = new Set(rows.map(r => Number(r.memberId))); emit(); return cache; })
      .catch(() => cache || new Set())   // 비로그인·네트워크 오류: 숨김 없이 진행
      .finally(() => { loading = null; });
  }
  return loading;
}

export function resetBlockedMembers() { cache = null; emit(); }

export async function blockMember(memberId) {
  await blockApi.block(memberId);
  cache = new Set(cache || []); cache.add(Number(memberId)); emit();
}

export async function unblockMember(memberId) {
  await blockApi.unblock(memberId);
  cache = new Set(cache || []); cache.delete(Number(memberId)); emit();
}

export default function useBlockedMembers(enabled = true) {
  const [ids, setIds] = useState(cache || new Set());
  useEffect(() => {
    if (!enabled) return undefined;
    const fn = next => setIds(next || new Set());
    listeners.add(fn);
    load();
    return () => { listeners.delete(fn); };
  }, [enabled]);
  const isBlocked = useCallback(memberId => memberId != null && ids.has(Number(memberId)), [ids]);
  return { blockedIds: ids, isBlocked, reload: () => load(true) };
}
