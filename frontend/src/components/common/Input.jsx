import React, { useState } from 'react';

function fieldStyle({ focused, error, disabled, extra }) {
  let border = '#E5E8EB';
  let boxShadow = 'none';
  let background = '#ffffff';

  if (disabled) {
    background = '#F2F4F6';
  } else if (error) {
    border = '#F04452';
    boxShadow = '0 0 0 3px rgba(240,68,82,0.12)';
  } else if (focused) {
    border = '#3182F6';
    boxShadow = '0 0 0 3px rgba(49,130,246,0.12)';
  }

  return {
    width: '100%',
    border: `1px solid ${border}`,
    borderRadius: 8,
    background,
    color: '#191F28',
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
          style={{ fontSize: 13, fontWeight: 500, color: '#191F28', marginBottom: 6 }}
        >
          {label}
          {required && <span style={{ color: '#F04452', marginLeft: 2 }}>*</span>}
        </label>
      )}
      {children}
      {error ? (
        <span id={`${id}-error`} role="alert" style={{ color: '#F04452', fontSize: 12, marginTop: 4 }}>
          {error}
        </span>
      ) : helperText ? (
        <span id={`${id}-hint`} style={{ color: '#8B95A1', fontSize: 12, marginTop: 4 }}>
          {helperText}
        </span>
      ) : null}
    </div>
  );
}

export default Input;
