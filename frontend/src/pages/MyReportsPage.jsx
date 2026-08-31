import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { COLORS } from '../constants/colors';
import apiClient from '../api/apiClient';

const REASON_LABELS = {
  COPYRIGHT: '저작권 침해',
  INAPPROPRIATE: '부적절한 콘텐츠',
  PRIVACY: '개인정보 침해',
  SPAM: '스팸',
  OTHER: '기타',
};

const STATUS_META = {
  PENDING:   { label: '검토중',  color: COLORS.textMuted,   bg: COLORS.surfaceDim },
  RESOLVED:  { label: '처리완료', color: COLORS.success,     bg: COLORS.successTonal },
  DISMISSED: { label: '반려됨',  color: COLORS.textMuted,   bg: COLORS.surfaceDim },
};

export default function MyReportsPage() {
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    apiClient.get('/photos/reports/mine')
      .then(res => {
        if (cancelled) return;
        const list = res.data?.data ?? res.data ?? [];
        setReports(Array.isArray(list) ? list : []);
        // 처리 완료/반려된 신고 중 아직 확인 안 한 것들을 확인 처리
        list
          .filter(r => r.status !== 'PENDING' && !r.reporterSeen)
          .forEach(r => {
            apiClient.put(`/photos/reports/mine/${r.id}/seen`).catch(() => {});
          });
      })
      .catch(() => setError('신고 내역을 불러오지 못했습니다.'))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: COLORS.bg, paddingBottom: 60 }}>
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '24px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <button
            onClick={() => navigate('/profile')}
            style={{ background: 'none', border: 'none', color: COLORS.textMuted, fontSize: 20, cursor: 'pointer', padding: 4 }}
          >←</button>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 700, color: COLORS.text, margin: 0 }}>내가 신고한 내역</h1>
            <p style={{ fontSize: 12, color: COLORS.textMuted, margin: '2px 0 0' }}>제출한 신고의 처리 상태를 확인하세요</p>
          </div>
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: COLORS.textMuted, fontSize: 13 }}>불러오는 중...</div>
        )}

        {!loading && error && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: COLORS.danger, fontSize: 13 }}>{error}</div>
        )}

        {!loading && !error && reports.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>✅</div>
            <div style={{ color: COLORS.textSecondary, fontSize: 14 }}>제출한 신고가 없습니다</div>
          </div>
        )}

        {!loading && !error && reports.map(r => {
          const meta = STATUS_META[r.status] || STATUS_META.PENDING;
          return (
            <div key={r.id} style={{
              background: COLORS.surface, border: `1px solid ${COLORS.border}`,
              borderRadius: 14, padding: '14px 16px', marginBottom: 10,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.text }}>
                  {REASON_LABELS[r.reason] || r.reason}
                </div>
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 20,
                  color: meta.color, background: meta.bg,
                }}>{meta.label}</span>
              </div>
              {r.detail && (
                <div style={{ fontSize: 12, color: COLORS.textSecondary, marginBottom: 6, lineHeight: 1.6 }}>{r.detail}</div>
              )}
              {r.resolutionNote && (
                <div style={{
                  fontSize: 12, color: COLORS.textSecondary, lineHeight: 1.6,
                  background: COLORS.surfaceDim, borderRadius: 8, padding: '8px 10px', marginBottom: 6,
                }}>
                  💬 {r.resolutionNote}
                </div>
              )}
              <div style={{ fontSize: 11, color: COLORS.textHint }}>
                {r.createdAt && new Date(r.createdAt).toLocaleDateString('ko-KR')}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
