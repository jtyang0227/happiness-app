import { WORKSPACE_PATHS } from '../workspace/WorkspaceTabs';

/*
 * 메뉴 설정 한 곳 — 상단(PC) 메뉴와 하단(모바일) 탭이 모두 여기서 읽는다.
 * 항목: { to, label, icon, auth(로그인 필요), guestOnly(비로그인만), match(하위 경로도 활성), badge(badges 객체의 키), isCenter }
 * 탭을 늘리거나 바꿀 때는 이 배열만 고치면 된다. 아이콘 이름은 NavIcon의 PATHS 키.
 *
 * 메뉴 통합 (PLANNING_nav-consolidation.md) — 예전 10개를 목적별 4개로: 둘러보기 · 내 작업 · 업무(문의·예약·일정·약속·납품 허브) · 모임.
 * 올리기는 메뉴가 아니라 행동이라 오른쪽 버튼(모바일은 가운데 원)으로, 프로필은 아바타 메뉴로.
 */
export const NAV_ITEMS = [
  { to: '/explore',    label: '둘러보기' },
  { to: '/series',     label: '내 작업', auth: true },
  { to: '/workspace',  label: '업무', badge: 'workspace', match: WORKSPACE_PATHS, auth: true },
  { to: '/gatherings', label: '모임', badge: 'gatherings' },
];

export const BOTTOM_NAV_ITEMS = [
  { to: '/explore',    label: '둘러보기', icon: 'explore' },
  { to: '/series',     label: '내 작업',  icon: 'works', auth: true },
  { to: '/gatherings', label: '모임',     icon: 'gatherings', badge: 'gatherings', guestOnly: true },
  { to: '/photo/new',  label: '사진 올리기', icon: 'plus', isCenter: true, auth: true },
  { to: '/workspace',  label: '업무',     icon: 'workspace', match: WORKSPACE_PATHS, badge: 'workspace', auth: true },
  { to: '/profile',    label: '프로필',   icon: 'profile', auth: true },
  { to: '/login',      label: '로그인',   icon: 'login', guestOnly: true },
];

/** 로그인 여부에 맞는 항목만 */
export function visibleItems(items, loggedIn) {
  return items.filter(i => (i.auth ? loggedIn : true) && (i.guestOnly ? !loggedIn : true));
}

/** 업무처럼 여러 화면을 한 메뉴로 묶은 경우, 하위 경로 어디에 있어도 활성으로 */
export function isMenuActive(item, pathname, isActive) {
  if (!item.match) return isActive;
  return item.match.some(p => pathname === p || pathname.startsWith(`${p}/`));
}
