// 앱 전역에서 재사용되는 최소 keyframes (로딩 스피너, 스켈레톤 펄스).
// Toss 플랫 디자인 원칙상 blur/glow/orb 애니메이션은 쓰지 않는다.
export const GLOBAL_KEYFRAMES = `
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.55; }
  }
`;

export const SPRING   = 'cubic-bezier(0.34, 1.56, 0.64, 1)';
export const EASE_OUT = 'cubic-bezier(0.16, 1, 0.3, 1)';
export const EASE     = 'cubic-bezier(0.4, 0, 0.2, 1)';
