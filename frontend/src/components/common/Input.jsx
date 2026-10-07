import React, { useState } from 'react';
import { COLORS } from '../../constants/colors';

function fieldStyle({ focused, error, disabled, extra }) {
  let border = COLORS.border;
  let boxShadow = 'none';
  let background = COLORS.surface;

  if (disabled) {
    background = COLORS.bg;
  } else if (error) {
    border = COLORS.danger;
    boxShadow = '0 0 0 3px rgba(240,68,82,0.12)';
  } else if (focused) {
    border = COLORS.primary;
    boxShadow = '0 0 0 3px rgba(49,130,246,0.12)';
  }

  return {
    width: '100%',
    border: `1px solid ${border}`,
    borderRadius: 8,
    background,
    color: COLORS.text,
    fontSize: 14,
    fontWeight: 400,
    fontFamily: 'inherit',
    boxShadow,
    outline: 'none',
    opacity: disabled ? 0.6 : 1,
    cursor: disabled ? 'default' : 'text',
    transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
    ...extra,
  };
}

export function Input({ id, error, disabled, style, helperText, onFocus, onBlur, ...rest }) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      id={id}
      disabled={disabled}
      aria-invalid={!!error}
      aria-describedby={error ? `${id}-error` : helperText ? `${id}-hint` : undefined}
      onFocus={(e) => { setFocused(true); onFocus?.(e); }}
      onBlur={(e) => { setFocused(false); onBlur?.(e); }}
      style={fieldStyle({ focused, error, disabled, extra: { height: 40, padding: '0 12px', ...style } })}
      {...rest}
    />
  );
}

export function Textarea({ id, error, disabled, style, helperText, onFocus, onBlur, ...rest }) {
  const [focused, setFocused] = useState(false);
  return (
    <textarea
      id={id}
      disabled={disabled}
      aria-invalid={!!error}
      aria-describedby={error ? `${id}-error` : helperText ? `${id}-hint` : undefined}
      onFocus={(e) => { setFocused(true); onFocus?.(e); }}
      onBlur={(e) => { setFocused(false); onBlur?.(e); }}
      style={fieldStyle({
        focused, error, disabled,
        extra: { minHeight: 80, padding: '10px 12px', lineHeight: 1.5, resize: 'vertical', ...style },
      })}
      {...rest}
    />
  );
}

export function FormField({ id, label, required, error, helperText, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 16 }}>
      {label && (
        <label
          htmlFor={id}
          style={{ fontSize: 13, fontWeight: 500, color: COLORS.text, marginBottom: 6 }}
        >
          {label}
          {required && <span style={{ color: COLORS.danger, marginLeft: 2 }}>*</span>}
        </label>
      )}
      {children}
      {error ? (
        <span id={`${id}-error`} role="alert" style={{ color: COLORS.danger, fontSize: 12, marginTop: 4 }}>
          {error}
        </span>
      ) : helperText ? (
        <span id={`${id}-hint`} style={{ color: COLORS.textMuted, fontSize: 12, marginTop: 4 }}>
          {helperText}
        </span>
      ) : null}
    </div>
  );
}

export default Input;
