import React, { useState } from 'react';

const SIZE = {
  sm: { height: 32, padding: '0 12px', fontSize: 13, fontWeight: 500, borderRadius: 8, letterSpacing: 0 },
  md: { height: 40, padding: '0 16px', fontSize: 14, fontWeight: 600, borderRadius: 8, letterSpacing: 0 },
  lg: { height: 48, padding: '0 20px', fontSize: 15, fontWeight: 600, borderRadius: 10, letterSpacing: '0.01em' },
};

const VARIANT = {
  primary:   { bg: '#3182F6',     color: '#ffffff', border: 'none',                hoverBg: '#1B64DA', hoverBorder: 'none' },
  secondary: { bg: '#ffffff',     color: '#3182F6', border: '1px solid #3182F6',   hoverBg: '#E8F3FF', hoverBorder: '1px solid #1B64DA' },
  ghost:     { bg: 'transparent', color: '#4E5968', border: 'none',                hoverBg: '#F2F4F6', hoverBorder: 'none' },
  danger:    { bg: '#F04452',     color: '#ffffff', border: 'none',                hoverBg: '#D03040', hoverBorder: 'none' },
};

const DOT_KEYFRAMES = `@keyframes button-dot-pulse { 0%, 80%, 100% { opacity: 0.2; } 40% { opacity: 1; } }`;

function LoadingDots() {
  return (
    <>
      <style>{DOT_KEYFRAMES}</style>
      <span style={{ display: 'inline-flex', gap: 2, marginLeft: 2 }}>
        {[0, 0.2, 0.4].map((delay) => (
          <span
            key={delay}
            style={{
              width: 3, height: 3, borderRadius: '50%',
              background: 'currentColor',
              animation: 'button-dot-pulse 1.2s ease-in-out infinite',
              animationDelay: `${delay}s`,
            }}
          />
        ))}
      </span>
    </>
  );
}

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  children,
  style,
  onClick,
  type = 'button',
  ...rest
}) {
  const [hovered, setHovered] = useState(false);
  const [active, setActive] = useState(false);

  const sizeStyle = SIZE[size] || SIZE.md;
  const v = VARIANT[variant] || VARIANT.primary;
  const isDisabled = disabled || loading;

  const bg = hovered && !isDisabled ? v.hoverBg : v.bg;
  const border = hovered && !isDisabled ? v.hoverBorder : v.border;
  const focusRingColor = variant === 'danger' ? 'rgba(240,68,82,0.25)' : 'rgba(49,130,246,0.25)';

  return (
    <button
      type={type}
      disabled={isDisabled}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setActive(false); }}
      onMouseDown={() => setActive(true)}
      onMouseUp={() => setActive(false)}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: fullWidth ? '100%' : 'auto',
        height: sizeStyle.height,
        padding: sizeStyle.padding,
        fontSize: sizeStyle.fontSize,
        fontWeight: sizeStyle.fontWeight,
        letterSpacing: sizeStyle.letterSpacing,
        borderRadius: sizeStyle.borderRadius,
        background: bg,
        color: v.color,
        border,
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : loading ? 0.7 : 1,
        pointerEvents: isDisabled ? 'none' : 'auto',
        transform: active && !isDisabled ? 'scale(0.98)' : 'scale(1)',
        transition: 'background-color 0.15s ease, border-color 0.15s ease, transform 0.15s ease, opacity 0.15s ease',
        boxShadow: 'none',
        ...style,
      }}
      onFocus={(e) => { e.target.style.boxShadow = `0 0 0 3px ${focusRingColor}`; }}
      onBlur={(e) => { e.target.style.boxShadow = 'none'; }}
      {...rest}
    >
      {children}
      {loading && <LoadingDots />}
    </button>
  );
}
