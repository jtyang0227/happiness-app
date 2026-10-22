import React from 'react';

/*
 * 탭 아이콘 — 외부 라이브러리 없이 인라인 SVG(24px 격자, 굵은 선 2.0).
 * 이모지는 기기마다 모양이 달라 활성 색을 줄 수 없어서 하단 탭에만 SVG를 쓴다(DESIGN_PROMPT_bottom-nav-icons.md).
 * 활성(filled)일 때는 면을 채운 모양(Cosmos 하단 바처럼) — 안쪽 선은 바 배경색(cut)으로 그려 구멍처럼 보이게 한다.
 * 새 아이콘은 PATHS에 이름 하나 추가하면 navConfig에서 바로 쓸 수 있다.
 */
const fillIf = (on) => (on ? 'currentColor' : 'none');

const PATHS = {
  explore: (on, cut) => (
    <>
      <circle cx="12" cy="12" r="9" fill={fillIf(on)} />
      <path d="M15.5 8.5l-2 5-5 2 2-5z" fill={on ? cut : 'none'} stroke={on ? cut : 'currentColor'} />
    </>
  ),
  works: (on, cut) => (
    <>
      <rect x="7" y="7" width="13" height="13" rx="2.5" fill={fillIf(on)} />
      <path d="M4 16.5V6.5A2.5 2.5 0 0 1 6.5 4h10" />
      <path d="M7.5 16l3-3 2.5 2.5 2-2 3 3" stroke={on ? cut : 'currentColor'} />
    </>
  ),
  plus: () => <path d="M12 5v14M5 12h14" />,
  workspace: (on, cut) => (
    <>
      <path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7" />
      <rect x="3.5" y="7" width="17" height="12.5" rx="2.5" fill={fillIf(on)} />
      <path d="M3.5 12.5h17" stroke={on ? cut : 'currentColor'} />
    </>
  ),
  profile: (on) => (
    <>
      <circle cx="12" cy="8.5" r="4" fill={fillIf(on)} />
      <path d="M4.5 20c1.2-3.6 4-5.5 7.5-5.5s6.3 1.9 7.5 5.5z" fill={fillIf(on)} />
    </>
  ),
  gatherings: (on) => (
    <>
      <circle cx="9" cy="9" r="3.5" fill={fillIf(on)} />
      <path d="M3 19.5c.8-3 3.1-4.8 6-4.8s5.2 1.8 6 4.8z" fill={fillIf(on)} />
      <circle cx="17" cy="8" r="2.8" fill={fillIf(on)} />
      <path d="M16.5 13.2c2.3.2 4 1.7 4.6 4.3" />
    </>
  ),
  login: () => (
    <>
      <path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" />
      <path d="M10 8l4 4-4 4M14 12H4" />
    </>
  ),
};

export default function NavIcon({ name, size = 24, active = false, color = 'currentColor', cut = '#191F28' }) {
  const draw = PATHS[name] || PATHS.explore;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
      strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {draw(active, cut)}
    </svg>
  );
}
