import React, { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import { photoApi, reportApi } from '../../services/api';

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
  const [hovered, setHovered]         = useState(false);
  const [expanded, setExpanded]       = useState(false);
  const [dismissNote, setDismissNote] = useState('');
  const [showDismiss, setShowDismiss] = useState(false);
  const meta = STATUS_META[report.status] || STATUS_META.PENDING;

  const detail = report.detail || '';

  return (
    <>
      <tr
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          borderBottom: !expanded && !showDismiss && index < total - 1 ? '1px solid #f0f0f8' : 'none',
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
            }}>{REASON_LABEL[report.reason] || report.reason}</span>
            {detail.length > 40 ? (
              <>
                {expanded ? detail : `${detail.slice(0, 40)}...`}
                <button
                  onClick={() => setExpanded(v => !v)}
                  style={{
                    background: 'none', border: 'none', color: '#3182F6',
                    cursor: 'pointer', fontSize: 11, padding: '0 2px', fontWeight: 600,
                  }}
                >{expanded ? '접기' : '더보기'}</button>
              </>
            ) : detail}
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
                onClick={() => setShowDismiss(v => !v)}
                disabled={actionLoading === report.id}
                style={{
                  padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                  border: '1.5px solid #e5e5ed', background: showDismiss ? '#f0f0f8' : '#fff',
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

      {/* 무시 메모 입력 (인라인 확장) */}
      {showDismiss && (
        <tr style={{ background: '#fafafa', borderBottom: '1px solid #f0f0f8' }}>
          <td colSpan={6} style={{ padding: '0 16px 14px 88px' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontSize: 11, color: '#9090b0', marginBottom: 4 }}>
                  무시 사유 메모 (선택, 신고자에게 표시됩니다)
                </div>
                <input
                  value={dismissNote}
                  onChange={e => setDismissNote(e.target.value)}
                  placeholder="예: 커뮤니티 가이드라인 위반에 해당하지 않습니다."
                  maxLength={300}
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    padding: '7px 10px', borderRadius: 6, fontSize: 12,
                    border: '1.5px solid #e5e5ed', outline: 'none', color: '#1a1a2e',
                  }}
                />
              </div>
              <button
                onClick={() => {
                  onDismiss(report, dismissNote);
                  setShowDismiss(false);
                  setDismissNote('');
                }}
                disabled={actionLoading === report.id}
                style={{
                  padding: '7px 16px', borderRadius: 6, fontSize: 12, fontWeight: 700,
                  border: '1.5px solid #e5e5ed', background: '#fff', color: '#5c5c7a',
                  cursor: actionLoading === report.id ? 'not-allowed' : 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >확인 — 무시</button>
              <button
                onClick={() => { setShowDismiss(false); setDismissNote(''); }}
                style={{
                  padding: '7px 12px', borderRadius: 6, fontSize: 12,
                  border: '1.5px solid #e5e5ed', background: '#fff', color: '#9090b0',
                  cursor: 'pointer',
                }}
              >취소</button>
            </div>
          </td>
        </tr>
      )}

      {/* 확장된 상세 + 증거 URL + 처리 메모 */}
      {expanded && (
        <tr style={{ borderBottom: index < total - 1 ? '1px solid #f0f0f8' : 'none' }}>
          <td colSpan={6} style={{ padding: '0 16px 12px 88px' }}>
            <div style={{
              padding: '10px 14px', borderRadius: 8, background: '#f7f7fb',
              fontSize: 12, color: '#5c5c7a', lineHeight: 1.6,
              border: '1px solid #e5e5ed', display: 'flex', flexDirection: 'column', gap: 8,
            }}>
              {detail && (
                <div>
                  <span style={{ fontWeight: 700, color: '#1a1a2e' }}>신고 내용: </span>
                  {detail}
                </div>
              )}
              {report.evidenceUrl && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontWeight: 700, color: '#1a1a2e' }}>증거:</span>
                  <a
                    href={report.evidenceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#3182F6', textDecoration: 'none', fontWeight: 600 }}
                  >증거 보기 ↗</a>
                </div>
              )}
              {report.resolutionNote && (
                <div style={{
                  padding: '6px 10px', borderRadius: 6,
                  background: STATUS_META[report.status]?.bg || '#f7f7fb',
                  border: `1px solid ${STATUS_META[report.status]?.border || '#e5e5ed'}`,
                }}>
                  <span style={{ fontWeight: 700, color: '#1a1a2e' }}>처리 메모: </span>
                  {report.resolutionNote}
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

/** 백엔드 reason 코드 → 한국어 표시 */
const REASON_LABEL = {
  COPYRIGHT:    '저작권 침해',
  INAPPROPRIATE:'부적절한 콘텐츠',
  PRIVACY:      '개인정보 침해',
  SPAM:         '스팸',
  OTHER:        '기타',
};

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
  const [reports,          setReports]          = useState([]);
  const [loading,          setLoading]          = useState(true);
  const [filterTab,        setFilterTab]        = useState('ALL');
  const [actionLoading,    setActionLoading]    = useState(null);
  const [deleteTarget,     setDeleteTarget]     = useState(null);
  const [deleteProcessing, setDeleteProcessing] = useState(false);
  const [error,            setError]            = useState(null);

  const loadReports = useCallback(async (tab) => {
    setLoading(true);
    setError(null);
    try {
      const data = await reportApi.list({ status: tab === 'ALL' ? undefined : tab, page: 0, size: 100 });
      // Spring Page 응답: data.content
      setReports(data.content || []);
    } catch (e) {
      setError('신고 목록을 불러오는 데 실패했습니다.');
      setReports([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReports(filterTab);
  }, [filterTab, loadReports]);

  const counts = {
    ALL:       reports.length,
    PENDING:   reports.filter(r => r.status === 'PENDING').length,
    RESOLVED:  reports.filter(r => r.status === 'RESOLVED').length,
    DISMISSED: reports.filter(r => r.status === 'DISMISSED').length,
  };

  // filtered: 로컬 상태에서 탭 기준 필터 (서버가 이미 필터했지만, 탭 전환 전 캐시 보호)
  const filtered = filterTab === 'ALL'
    ? reports
    : reports.filter(r => r.status === filterTab);

  const handleDismiss = async (report, resolutionNote) => {
    setActionLoading(report.id);
    try {
      await reportApi.update(report.id, { status: 'DISMISSED', resolutionNote: resolutionNote || undefined });
      setReports(prev => prev.map(r =>
        r.id === report.id ? { ...r, status: 'DISMISSED', resolutionNote: resolutionNote || r.resolutionNote } : r
      ));
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
      // 1. 사진 삭제 (존재하지 않으면 무시)
      await photoApi.remove(deleteTarget.photo.id).catch(() => {});
      // 2. 신고 RESOLVED 처리
      await reportApi.update(deleteTarget.id, { status: 'RESOLVED' });
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
            const hasPending = key === 'PENDING' && count > 0;

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

        {/* 에러 배너 */}
        {error && (
          <div style={{
            padding: '12px 16px', borderRadius: 8, marginBottom: 16,
            background: '#fff5f5', border: '1px solid #fecaca',
            fontSize: 13, color: DANGER_RED, fontWeight: 600,
          }}>
            ⚠️ {error}
            <button
              onClick={() => loadReports(filterTab)}
              style={{
                marginLeft: 12, fontSize: 12, color: '#3182F6',
                background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600,
              }}
            >다시 시도</button>
          </div>
        )}

        {/* 테이블 */}
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e5ed', overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: '60px 0', textAlign: 'center', color: '#9090b0' }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%', margin: '0 auto 12px',
                border: '3px solid #e5e5ed', borderTopColor: '#3182F6',
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
                  {['사진', '신고 내용', '신고자', '신고일', '상태', '액션'].map((h) => (
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
