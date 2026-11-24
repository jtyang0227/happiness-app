import React, { useState } from 'react';
import { COLORS } from '../../constants/colors';

export default function DeliveryApproveModal({ selectedCount, onCancel, onApprove }) {
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleApprove = async () => {
    setSubmitting(true);
    try {
      await onApprove(feedback);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      onClick={onCancel}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9000,
        padding: '16px',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: COLORS.surface,
          borderRadius: 20,
          border: `1px solid ${COLORS.border}`,
          padding: '32px 28px',
          width: '100%',
          maxWidth: 440,
          boxShadow: '0 16px 60px rgba(0,0,0,0.2)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
          <span style={{ fontSize: 24 }}>✓</span>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: COLORS.text, margin: 0 }}>
            최종 승인
          </h2>
        </div>

        <div style={{
          background: COLORS.bg,
          borderRadius: 12,
          padding: '14px 16px',
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}>
          <span style={{ fontSize: 20 }}>📷</span>
          <div>
            <div style={{ fontSize: 13, color: COLORS.textMuted }}>선택한 사진</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: COLORS.primary }}>
              {selectedCount}장
            </div>
          </div>
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: COLORS.text, display: 'block', marginBottom: 8 }}>
            피드백 (선택)
          </label>
          <textarea
            value={feedback}
            onChange={e => setFeedback(e.target.value)}
            placeholder="작가에게 전달할 메시지를 남겨주세요."
            rows={4}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '12px 14px',
              borderRadius: 12,
              border: `1.5px solid ${COLORS.border}`,
              fontSize: 14,
              color: COLORS.text,
              background: COLORS.surface,
              resize: 'vertical',
              outline: 'none',
              fontFamily: 'inherit',
              lineHeight: 1.6,
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onCancel}
            disabled={submitting}
            style={{
              flex: 1,
              padding: '13px 0',
              borderRadius: 12,
              border: `1.5px solid ${COLORS.border}`,
              background: COLORS.surface,
              color: COLORS.text,
              fontSize: 14,
              fontWeight: 600,
              cursor: submitting ? 'not-allowed' : 'pointer',
            }}
          >
            취소
          </button>
          <button
            onClick={handleApprove}
            disabled={submitting}
            style={{
              flex: 2,
              padding: '13px 0',
              borderRadius: 12,
              border: 'none',
              background: submitting ? COLORS.border : COLORS.primary,
              color: submitting ? COLORS.textMuted : '#fff',
              fontSize: 14,
              fontWeight: 700,
              cursor: submitting ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s',
            }}
          >
            {submitting ? '처리 중...' : '승인 완료'}
          </button>
        </div>
      </div>
    </div>
  );
}
