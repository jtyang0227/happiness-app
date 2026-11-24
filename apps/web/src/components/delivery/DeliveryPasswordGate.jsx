import React, { useState } from 'react';
import { COLORS } from '../../constants/colors';

export default function DeliveryPasswordGate({ clientName, onSubmit, error }) {
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit(password);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: COLORS.bg,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
    }}>
      <div style={{
        background: COLORS.surface,
        borderRadius: 20,
        border: `1px solid ${COLORS.border}`,
        padding: '40px 32px',
        width: '100%',
        maxWidth: 360,
        textAlign: 'center',
        boxShadow: '0 8px 40px rgba(0,0,0,0.08)',
      }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>🔒</div>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: COLORS.text, margin: '0 0 8px' }}>
          납품 사진 확인
        </h2>
        {clientName && (
          <p style={{ fontSize: 14, color: COLORS.textSecondary, margin: '0 0 24px' }}>
            {clientName} 고객님의 납품 세트입니다.
          </p>
        )}
        {!clientName && (
          <p style={{ fontSize: 14, color: COLORS.textSecondary, margin: '0 0 24px' }}>
            비밀번호를 입력해주세요.
          </p>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ position: 'relative', marginBottom: 12 }}>
            <input
              type={showPw ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="비밀번호"
              autoFocus
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '12px 44px 12px 16px',
                borderRadius: 12,
                border: `1.5px solid ${error ? COLORS.danger : COLORS.border}`,
                fontSize: 15,
                color: COLORS.text,
                background: COLORS.surface,
                outline: 'none',
              }}
            />
            <button
              type="button"
              onClick={() => setShowPw(v => !v)}
              style={{
                position: 'absolute',
                right: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: 18,
                color: COLORS.textMuted,
                padding: 0,
                lineHeight: 1,
              }}
              aria-label={showPw ? '비밀번호 숨기기' : '비밀번호 보기'}
            >
              {showPw ? '🙈' : '👁'}
            </button>
          </div>

          {error && (
            <div style={{
              fontSize: 13,
              color: COLORS.danger,
              marginBottom: 12,
              textAlign: 'left',
            }}>
              비밀번호가 틀렸습니다.
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || !password.trim()}
            style={{
              width: '100%',
              padding: '13px 0',
              borderRadius: 12,
              border: 'none',
              background: submitting || !password.trim() ? COLORS.border : COLORS.primary,
              color: submitting || !password.trim() ? COLORS.textMuted : '#fff',
              fontSize: 15,
              fontWeight: 700,
              cursor: submitting || !password.trim() ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s',
            }}
          >
            {submitting ? '확인 중...' : '확인'}
          </button>
        </form>
      </div>
    </div>
  );
}
