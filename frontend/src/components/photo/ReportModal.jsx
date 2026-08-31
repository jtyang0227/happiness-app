import React, { useState } from 'react';
import { COLORS } from '../../constants/colors';
import apiClient from '../../api/apiClient';
import { uploadImage } from '../../services/uploadApi';

const REASONS = [
  { code: 'COPYRIGHT',     label: '저작권 침해' },
  { code: 'INAPPROPRIATE', label: '부적절한 콘텐츠' },
  { code: 'PRIVACY',       label: '개인정보 침해' },
  { code: 'SPAM',          label: '스팸' },
  { code: 'OTHER',         label: '기타' },
];

export default function ReportModal({ photoId, onClose, onSubmitted }) {
  const [reason, setReason] = useState('');
  const [detail, setDetail] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const requiresDetail = reason === 'OTHER';
  const canSubmit = reason && (!requiresDetail || detail.trim().length > 0) && !submitting && !uploading;

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setUploading(true);
    try {
      const url = await uploadImage(file, 'reports');
      setEvidenceUrl(url);
    } catch {
      setError('증거 이미지 업로드에 실패했습니다.');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError('');
    try {
      await apiClient.post(`/photos/${photoId}/report`, {
        reason,
        detail: detail.trim() || null,
        evidenceUrl: evidenceUrl || null,
      });
      onSubmitted?.();
      onClose();
    } catch (err) {
      const status = err.response?.status;
      if (status === 429) {
        setError('신고 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.');
      } else {
        setError(err.response?.data?.message || '신고 접수에 실패했습니다.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1200, padding: 16,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: COLORS.surface, borderRadius: 16, padding: 24,
          width: '100%', maxWidth: 420, maxHeight: '90vh', overflowY: 'auto',
          border: `1px solid ${COLORS.border}`,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: COLORS.text }}>🚨 사진 신고하기</div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: COLORS.textMuted, fontSize: 18, cursor: 'pointer' }}
          >✕</button>
        </div>

        <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.textSecondary, marginBottom: 8 }}>신고 사유</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
          {REASONS.map(r => {
            const active = reason === r.code;
            return (
              <button
                key={r.code}
                onClick={() => setReason(r.code)}
                style={{
                  padding: '7px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                  border: `1.5px solid ${active ? COLORS.danger : COLORS.border}`,
                  background: active ? COLORS.dangerTonal : COLORS.surface,
                  color: active ? COLORS.danger : COLORS.textSecondary,
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
              >
                {r.label}
              </button>
            );
          })}
        </div>

        <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.textSecondary, marginBottom: 8 }}>
          추가 설명{requiresDetail ? ' (필수)' : ' (선택)'}
        </div>
        <textarea
          value={detail}
          onChange={e => setDetail(e.target.value)}
          placeholder={requiresDetail ? '어떤 문제인지 설명해주세요.' : '자세한 상황을 알려주시면 검토에 도움이 됩니다.'}
          rows={4}
          maxLength={500}
          style={{
            width: '100%', padding: '10px 12px', borderRadius: 10,
            border: `1px solid ${COLORS.border}`, background: COLORS.surfaceDim,
            color: COLORS.text, fontSize: 13, resize: 'none', outline: 'none',
            boxSizing: 'border-box', marginBottom: 16, fontFamily: 'inherit',
          }}
        />

        <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.textSecondary, marginBottom: 8 }}>증거 (선택)</div>
        <div style={{ marginBottom: 16 }}>
          {evidenceUrl ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <img src={evidenceUrl} alt="증거" style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 8, border: `1px solid ${COLORS.border}` }} />
              <button
                onClick={() => setEvidenceUrl('')}
                style={{ fontSize: 12, color: COLORS.danger, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
              >제거</button>
            </div>
          ) : (
            <label style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', borderRadius: 10, fontSize: 12, fontWeight: 600,
              border: `1.5px dashed ${COLORS.border}`, color: COLORS.textSecondary,
              cursor: uploading ? 'not-allowed' : 'pointer',
            }}>
              {uploading ? '업로드 중...' : '📎 스크린샷 첨부'}
              <input type="file" accept="image/*" onChange={handleFileChange} disabled={uploading} style={{ display: 'none' }} />
            </label>
          )}
        </div>

        {error && (
          <div style={{ background: COLORS.dangerTonal, color: COLORS.danger, fontSize: 12, padding: '8px 12px', borderRadius: 8, marginBottom: 14 }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '9px 18px', borderRadius: 10, fontSize: 13, fontWeight: 600,
              border: `1px solid ${COLORS.border}`, background: COLORS.surface,
              color: COLORS.textSecondary, cursor: 'pointer',
            }}
          >취소</button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            style={{
              padding: '9px 20px', borderRadius: 10, fontSize: 13, fontWeight: 700,
              border: 'none', background: canSubmit ? COLORS.danger : COLORS.textHint,
              color: '#fff', cursor: canSubmit ? 'pointer' : 'not-allowed',
            }}
          >{submitting ? '접수 중...' : '신고하기'}</button>
        </div>
      </div>
    </div>
  );
}
