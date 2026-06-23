import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import { photoApi } from '../../services/api';

// ─── 목 데이터 (백엔드 신고 API 구현 전까지 사용) ───────────────────────────
// TODO: 백엔드에 GET /api/admin/reports, PUT /api/admin/reports/:id (dismiss/resolve),
//       DELETE /api/admin/reports/:id/photo 엔드포인트 구현 후 아래 mock을 실제 API로 교체
const MOCK_REPORTS = [
  {
    id: 1,
    photo: {
      id: 101,
      title: '도심 야경 시리즈 #3',
      thumbnailUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=80&h=80&fit=crop',
    },
    reason: '저작권 침해',
    reporterName: '김민준',
    reporterEmail: 'kim@example.com',
    reportedAt: '2026-06-22T14:30:00',
    status: 'PENDING',
    detail: '해당 사진이 제 원본 작품과 동일합니다. 출처 표기 없이 무단 사용하고 있습니다.',
  },
  {
    id: 2,
    photo: {
      id: 102,
      title: '포트레이트 스튜디오 #7',
      thumbnailUrl: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=80&h=80&fit=crop',
    },
    reason: '부적절한 콘텐츠',
    reporterName: '이서연',
    reporterEmail: 'lee@example.com',
    reportedAt: '2026-06-21T09:15:00',
    status: 'PENDING',
    detail: '커뮤니티 가이드라인을 위반하는 이미지입니다.',
  },
  {
    id: 3,
    photo: {
      id: 103,
      title: '거리 스냅 컬렉션',
      thumbnailUrl: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=80&h=80&fit=crop',
    },
    reason: '개인정보 침해',
    reporterName: '박지훈',
    reporterEmail: 'park@example.com',
    reportedAt: '2026-06-20T16:45:00',
    status: 'RESOLVED',
    detail: '동의 없이 제 얼굴이 촬영되었습니다.',
  },
  {
    id: 4,
    photo: {
      id: 104,
      title: '풍경 모음집',
      thumbnailUrl: 'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=80&h=80&fit=crop',
    },
    reason: '스팸',
    reporterName: '최수아',
    reporterEmail: 'choi@example.com',
    reportedAt: '2026-06-19T11:20:00',
    status: 'DISMISSED',
    detail: '동일한 사진을 반복 업로드하고 있습니다.',
  },
  {
    id: 5,
    photo: {
      id: 105,
      title: '웨딩 스냅 #12',
      thumbnailUrl: null,
    },
    reason: '저작권 침해',
    reporterName: '정현우',
    reporterEmail: 'jung@example.com',
    reportedAt: '2026-06-18T08:00:00',
    status: 'PENDING',
    detail: '전문 사진작가가 촬영한 이미지를 무단으로 사용 중입니다.',
  },
];

const STATUS_META = {
  PENDING:   { label: '대기중',  color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
  RESOLVED:  { label: '처리완료', color: '#059669', bg: '#ecfdf5', border: '#a7f3d0' },
  DISMISSED: { label: '무시됨',  color: '#9090b0', bg: '#f7f7fb', border: '#e5e5ed' },
};

const FILTER_TABS = [
  { key: 'ALL',       label: '전체' },
  { key: 'PENDING',   label: '대기중' },
  { key: 'RESOLVED',  label: '처리완료' },
  { key: 'DISMISSED', label: '무시됨' },
];

const DANGER_RED = '#e53e3e';

// ─── 이중 확인 다이얼로그 ────────────────────────────────────────────────────
function DeletePhotoDialog({ report, onConfirm, onCancel, processing }) {
  const [secondConfirm, setSecondConfirm] = useState(false);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(10,10,24,0.65)', backdropFilter: 'blur(4px)',
      WebkitBackdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div style={{
        background: '#fff', borderRadius: 16, padding: 28, maxWidth: 420, width: '100%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.22)',
        border: `2px solid ${DANGER_RED}22`,
      }}>
        {/* 위험 헤더 */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14,
          padding: '10px 14px', borderRadius: 8,
          background: '#fff5f5', border: `1px solid #fecaca`,
        }}>
          <span style={{ fontSize: 20 }}>⚠️</span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: DANGER_RED }}>사진 영구 삭제</div>
            <div style={{ fontSize: 11, color: '#9090b0' }}>이 작업은 되돌릴 수 없습니다</div>
          </div>
        </div>

        <div style={{ fontSize: 13, color: '#5c5c7a', marginBottom: 20, lineHeight: 1.7 }}>
          신고된 사진 <strong style={{ color: '#1a1a2e' }}>"{report.photo.title}"</strong>을 삭제하고
          신고를 <strong style={{ color: '#059669' }}>처리완료</strong> 상태로 변경합니다.
        </div>

        {!secondConfirm ? (
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button
              onClick={onCancel}
              style={{
                padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                border: '1.5px solid #e5e5ed', background: '#fff', color: '#5c5c7a', cursor: 'pointer',
              }}
            >취소</button>
            <button
              onClick={() => setSecondConfirm(true)}
              style={{
                padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 700,
                border: `1.5px solid ${DANGER_RED}`,
                background: '#fff5f5', color: DANGER_RED, cursor: 'pointer',
              }}
            >계속하기</button>
          </div>
        ) : (
          <div>
            <div style={{
              padding: '12px 14px', borderRadius: 8,
              background: '#fff5f5', border: `1px solid #fecaca`,
              fontSize: 13, color: DANGER_RED, fontWeight: 600, marginBottom: 14,
            }}>
              정말로 삭제하시겠습니까? 최종 확인입니다.
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={onCancel}
                style={{
                  padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                  border: '1.5px solid #e5e5ed', background: '#fff', color: '#5c5c7a', cursor: 'pointer',
                }}
              >취소</button>
              <button
                onClick={onConfirm}
                disabled={processing}
                style={{
                  padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 700,
                  border: 'none', background: processing ? '#9090b0' : DANGER_RED,
                  color: '#fff', cursor: processing ? 'not-allowed' : 'pointer',
                }}
              >{processing ? '삭제 중...' : '사진 삭제'}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── 신고 카드 행 ────────────────────────────────────────────────────────────
function ReportRow({ report, index, total, onDismiss, onDeletePhoto, actionLoading }) {
  const [hovered, setHovered] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const meta = STATUS_META[report.status] || STATUS_META.PENDING;

  return (
    <>
      <tr
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          borderBottom: !expanded && index < total - 1 ? '1px solid #f0f0f8' : 'none',
          background: hovered ? '#f9f9fd' : '#fff',
          transition: 'background 0.1s',
          cursor: 'default',
        }}
      >
        {/* 썸네일 */}
        <td style={{ padding: '14px 16px', width: 80 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 8, overflow: 'hidden',
            background: '#f0f0f8', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {report.photo.thumbnailUrl ? (
              <img
                src={report.photo.thumbnailUrl}
                alt={report.photo.title}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={e => { e.target.style.display = 'none'; }}
              />
            ) : (
              <span style={{ fontSize: 20 }}>📷</span>
            )}
          </div>
        </td>

        {/* 사진 제목 + 신고 내용 토글 */}
        <td style={{ padding: '14px 12px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a2e', marginBottom: 2 }}>
            {report.photo.title}
          </div>
          <div style={{ fontSize: 11, color: '#9090b0' }}>
            <span style={{
              display: 'inline-block', padding: '1px 6px', borderRadius: 4,
              background: '#f0f0f8', fontSize: 10, fontWeight: 600, color: '#5c5c7a',
              marginRight: 5,
            }}>{report.reason}</span>
            {report.detail.length > 40 ? (
              <>
                {expanded ? report.detail : `${report.detail.slice(0, 40)}...`}
                <button
                  onClick={() => setExpanded(v => !v)}
                  style={{
                    background: 'none', border: 'none', color: '#5b6ef5',
                    cursor: 'pointer', fontSize: 11, padding: '0 2px', fontWeight: 600,
                  }}
                >{expanded ? '접기' : '더보기'}</button>
              </>
            ) : report.detail}
          </div>
        </td>

        {/* 신고자 */}
        <td style={{ padding: '14px 12px' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#1a1a2e' }}>{report.reporterName}</div>
          <div style={{ fontSize: 11, color: '#9090b0' }}>{report.reporterEmail}</div>
        </td>

        {/* 날짜 */}
        <td style={{ padding: '14px 12px', fontSize: 12, color: '#9090b0' }}>
          {new Date(report.reportedAt).toLocaleDateString('ko-KR')}
        </td>

        {/* 상태 배지 */}
        <td style={{ padding: '14px 12px' }}>
          <span style={{
            display: 'inline-block', padding: '3px 8px', borderRadius: 6,
            fontSize: 11, fontWeight: 700,
            background: meta.bg, color: meta.color,
            border: `1px solid ${meta.border}`,
          }}>{meta.label}</span>
        </td>

        {/* 액션 */}
        <td style={{ padding: '14px 16px' }}>
          {report.status === 'PENDING' ? (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'nowrap' }}>
              <button
                onClick={() => onDismiss(report)}
                disabled={actionLoading === report.id}
                style={{
                  padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                  border: '1.5px solid #e5e5ed', background: '#fff',
                  color: '#5c5c7a', cursor: actionLoading === report.id ? 'not-allowed' : 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >무시하기</button>
              <button
                onClick={() => onDeletePhoto(report)}
                disabled={actionLoading === report.id}
                style={{
                  padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                  border: `1.5px solid #fecaca`,
                  background: actionLoading === report.id ? '#f0f0f0' : '#fff5f5',
                  color: DANGER_RED,
                  cursor: actionLoading === report.id ? 'not-allowed' : 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >사진 삭제</button>
            </div>
          ) : (
            <span style={{ fontSize: 11, color: '#9090b0' }}>처리 완료</span>
          )}
        </td>
      </tr>

      {/* 확장된 상세 설명 */}
      {expanded && (
        <tr style={{ borderBottom: index < total - 1 ? '1px solid #f0f0f8' : 'none' }}>
          <td colSpan={6} style={{ padding: '0 16px 12px 88px' }}>
            <div style={{
              padding: '10px 14px', borderRadius: 8, background: '#f7f7fb',
              fontSize: 12, color: '#5c5c7a', lineHeight: 1.6,
              border: '1px solid #e5e5ed',
            }}>
              {report.detail}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ─── 빈 상태 ─────────────────────────────────────────────────────────────────
function EmptyState({ filterTab }) {
  const msgs = {
    ALL:       { emoji: '✅', text: '신고된 콘텐츠가 없습니다' },
    PENDING:   { emoji: '🎉', text: '대기 중인 신고가 없습니다' },
    RESOLVED:  { emoji: '📋', text: '처리된 신고 내역이 없습니다' },
    DISMISSED: { emoji: '🗂️', text: '무시한 신고가 없습니다' },
  };
  const { emoji, text } = msgs[filterTab] || msgs.ALL;

  return (
    <div style={{ padding: '60px 0', textAlign: 'center', color: '#9090b0' }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>{emoji}</div>
      <div style={{ fontSize: 14, fontWeight: 600, color: '#5c5c7a', marginBottom: 4 }}>{text}</div>
      <div style={{ fontSize: 12 }}>신고 건이 접수되면 여기에 표시됩니다</div>
    </div>
  );
}

// ─── 메인 페이지 ─────────────────────────────────────────────────────────────
export default function AdminModerationPage() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState('ALL');
  const [actionLoading, setActionLoading] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteProcessing, setDeleteProcessing] = useState(false);

  useEffect(() => {
    // TODO: 실제 API — GET /api/admin/reports?status=&page=&size= 로 교체
    // apiClient.get('/admin/reports').then(res => setReports(res.data)).catch(() => setReports([])).finally(() => setLoading(false));
    setTimeout(() => {
      setReports(MOCK_REPORTS);
      setLoading(false);
    }, 500);
  }, []);

  const filtered = filterTab === 'ALL'
    ? reports
    : reports.filter(r => r.status === filterTab);

  const counts = {
    ALL:       reports.length,
    PENDING:   reports.filter(r => r.status === 'PENDING').length,
    RESOLVED:  reports.filter(r => r.status === 'RESOLVED').length,
    DISMISSED: reports.filter(r => r.status === 'DISMISSED').length,
  };

  const handleDismiss = async (report) => {
    setActionLoading(report.id);
    try {
      // TODO: 실제 API — PUT /api/admin/reports/:id { status: 'DISMISSED' } 로 교체
      await new Promise(r => setTimeout(r, 300)); // 모의 지연
      setReports(prev => prev.map(r => r.id === report.id ? { ...r, status: 'DISMISSED' } : r));
    } catch {
      alert('처리에 실패했습니다.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeletePhoto = async () => {
    if (!deleteTarget) return;
    setDeleteProcessing(true);
    try {
      // TODO: 실제 API — 순서:
      //   1. DELETE /api/photos/:photoId (사진 삭제)
      //   2. PUT /api/admin/reports/:reportId { status: 'RESOLVED' }
      await photoApi.remove(deleteTarget.photo.id).catch(() => {}); // 없으면 무시
      await new Promise(r => setTimeout(r, 400)); // 모의 지연
      setReports(prev => prev.map(r =>
        r.id === deleteTarget.id ? { ...r, status: 'RESOLVED' } : r
      ));
      setDeleteTarget(null);
    } catch {
      alert('사진 삭제에 실패했습니다.');
    } finally {
      setDeleteProcessing(false);
    }
  };

  return (
    <AdminLayout currentPageTitle="콘텐츠 신고 관리">
      <div style={{ maxWidth: 1100 }}>

        {/* 헤더 */}
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: '#1a1a2e', marginBottom: 4 }}>
            🚨 콘텐츠 신고 관리
          </h1>
          <p style={{ fontSize: 13, color: '#9090b0' }}>
            신고된 콘텐츠를 검토하고 적절한 조치를 취하세요
          </p>
        </div>

        {/* 필터 탭 */}
        <div style={{
          display: 'flex', gap: 4, marginBottom: 20,
          padding: '4px', borderRadius: 12,
          background: '#f0f0f8', width: 'fit-content',
        }}>
          {FILTER_TABS.map(({ key, label }) => {
            const isActive = filterTab === key;
            const count = counts[key];
            const hasPending = key !== 'ALL' && key === 'PENDING' && count > 0;

            return (
              <button
                key={key}
                onClick={() => setFilterTab(key)}
                style={{
                  padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                  border: 'none', cursor: 'pointer',
                  background: isActive ? '#fff' : 'transparent',
                  color: isActive ? '#1a1a2e' : '#9090b0',
                  boxShadow: isActive ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.15s',
                  display: 'flex', alignItems: 'center', gap: 5,
                }}
              >
                {label}
                <span style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  minWidth: 18, height: 18, borderRadius: 9, padding: '0 4px',
                  fontSize: 10, fontWeight: 800,
                  background: hasPending ? DANGER_RED : isActive ? '#e5e5ed' : 'transparent',
                  color: hasPending ? '#fff' : isActive ? '#5c5c7a' : '#9090b0',
                }}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* 테이블 */}
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e5ed', overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: '60px 0', textAlign: 'center', color: '#9090b0' }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%', margin: '0 auto 12px',
                border: '3px solid #e5e5ed', borderTopColor: '#5b6ef5',
                animation: 'spin 0.8s linear infinite',
              }} />
              불러오는 중...
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState filterTab={filterTab} />
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e5e5ed', background: '#f7f7fb' }}>
                  {['사진', '신고 내용', '신고자', '신고일', '상태', '액션'].map((h, i) => (
                    <th key={h} style={{
                      padding: '10px 16px', textAlign: 'left',
                      fontSize: 11, fontWeight: 700, color: '#9090b0',
                      textTransform: 'uppercase', letterSpacing: '0.06em',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((report, i) => (
                  <ReportRow
                    key={report.id}
                    report={report}
                    index={i}
                    total={filtered.length}
                    onDismiss={handleDismiss}
                    onDeletePhoto={(r) => setDeleteTarget(r)}
                    actionLoading={actionLoading}
                  />
                ))}
              </tbody>
            </table>
          )}
        </div>

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>

      {/* 사진 삭제 이중 확인 다이얼로그 */}
      {deleteTarget && (
        <DeletePhotoDialog
          report={deleteTarget}
          onConfirm={handleDeletePhoto}
          onCancel={() => !deleteProcessing && setDeleteTarget(null)}
          processing={deleteProcessing}
        />
      )}
    </AdminLayout>
  );
}
