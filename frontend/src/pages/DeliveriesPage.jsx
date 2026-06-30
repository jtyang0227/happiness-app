import React, { useState, useEffect } from 'react';
import { COLORS } from '../constants/colors';
import { deliveryApi } from '../services/deliveryApi';
import DeliveryCreateModal from '../components/delivery/DeliveryCreateModal';

const STATUS_META = {
  PENDING:  { label: '대기 중', color: COLORS.textMuted,     bg: COLORS.surfaceDim },
  REVIEWED: { label: '열람됨',  color: '#2563eb',            bg: '#eff6ff' },
  APPROVED: { label: '승인됨',  color: COLORS.success,       bg: '#f0fff4' },
  REJECTED: { label: '거절됨',  color: COLORS.danger,        bg: '#fff0f0' },
};

function SelectionPanel({ deliveryId }) {
  const [photos, setPhotos] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    deliveryApi.getSelections(deliveryId)
      .then(data => setPhotos(Array.isArray(data) ? data : []))
      .catch(() => setPhotos([]))
      .finally(() => setLoading(false));
  }, [deliveryId]);

  if (loading) {
    return (
      <div style={{ padding: '12px 0', display: 'flex', gap: 6 }}>
        {[1, 2, 3].map(i => (
          <div key={i} style={{ width: 64, height: 64, borderRadius: 8, background: COLORS.surfaceDim, animation: 'pulse 1.5s ease-in-out infinite' }} />
        ))}
      </div>
    );
  }

  if (!photos || photos.length === 0) {
    return (
      <div style={{ padding: '10px 0', fontSize: 12, color: COLORS.textMuted }}>
        클라이언트가 선택한 사진이 없습니다.
      </div>
    );
  }

  return (
    <div style={{ paddingTop: 10 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {photos.map(photo => (
          <div key={photo.id} style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', width: 64, height: 64, background: COLORS.surfaceDim, flexShrink: 0 }}>
            <img
              src={photo.thumbnailUrl || photo.imageUrl}
              alt={photo.title || ''}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              onError={e => { e.target.style.display = 'none'; }}
            />
          </div>
        ))}
      </div>
      <div style={{ marginTop: 8, fontSize: 11, color: COLORS.textMuted }}>총 {photos.length}장 선택됨</div>
    </div>
  );
}

function DeliveryCard({ d, onDelete, onCopy, copiedId }) {
  const [showSelections, setShowSelections] = useState(false);
  const meta = STATUS_META[d.status] || STATUS_META.PENDING;
  const isApproved = d.status === 'APPROVED';

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const dt = new Date(dateStr);
    return `${dt.getFullYear()}.${String(dt.getMonth() + 1).padStart(2, '0')}.${String(dt.getDate()).padStart(2, '0')}`;
  };

  return (
    <div style={{ background: COLORS.surface, border: `1px solid ${isApproved ? '#86efac' : COLORS.border}`, borderRadius: 16, padding: '18px 20px', transition: 'border-color 0.2s' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: COLORS.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {d.title || '제목 없음'}
            </span>
            <span style={{ fontSize: 11, fontWeight: 700, color: meta.color, background: meta.bg, padding: '2px 8px', borderRadius: 20, flexShrink: 0 }}>
              {meta.label}
            </span>
          </div>
          {d.clientName && (
            <div style={{ fontSize: 12, color: COLORS.textSecondary, marginBottom: 2 }}>👤 {d.clientName}</div>
          )}
          <div style={{ fontSize: 12, color: COLORS.textMuted, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <span>📷 {d.photoCount ?? 0}장</span>
            {d.expiresAt && <span>⏱ {formatDate(d.expiresAt)} 만료</span>}
            {d.viewedAt && <span>👁 {formatDate(d.viewedAt)} 열람</span>}
          </div>
        </div>
        <button
          onClick={() => onDelete(d.id)}
          style={{ background: 'none', border: 'none', color: COLORS.textMuted, cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: '0 0 0 8px', flexShrink: 0 }}
          aria-label="삭제"
        >×</button>
      </div>

      {/* 클라이언트 피드백 */}
      {isApproved && d.feedback && (
        <div style={{ background: '#f0fff4', border: '1px solid #86efac', borderRadius: 10, padding: '10px 14px', marginBottom: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#16a34a', marginBottom: 4 }}>클라이언트 피드백</div>
          <div style={{ fontSize: 13, color: COLORS.text, lineHeight: 1.6 }}>{d.feedback}</div>
        </div>
      )}

      {/* 선택 사진 */}
      {isApproved && d.likedCount > 0 && (
        <div style={{ borderTop: `1px solid ${COLORS.border}`, paddingTop: 10, marginBottom: 10 }}>
          <button
            onClick={() => setShowSelections(v => !v)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#16a34a' }}
          >
            <span>♥</span>
            <span>클라이언트 선택 {d.likedCount}장</span>
            <span style={{ fontSize: 11, color: COLORS.textMuted }}>{showSelections ? '▲' : '▼'}</span>
          </button>
          {showSelections && <SelectionPanel deliveryId={d.id} />}
        </div>
      )}

      <button
        onClick={() => onCopy(d.token)}
        style={{
          width: '100%', padding: '9px 0', borderRadius: 10,
          border: `1.5px solid ${copiedId === d.token ? COLORS.success : COLORS.border}`,
          background: copiedId === d.token ? '#f0fff4' : COLORS.bg,
          color: copiedId === d.token ? COLORS.success : COLORS.textSecondary,
          fontSize: 12, fontWeight: 600, cursor: 'pointer',
          transition: 'all 0.2s',
        }}
      >
        {copiedId === d.token ? '✓ 링크 복사됨' : '🔗 납품 링크 복사'}
      </button>
    </div>
  );
}

export default function DeliveriesPage() {
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    deliveryApi.getMyList()
      .then(data => setDeliveries(Array.isArray(data) ? data : []))
      .catch(() => setError('목록을 불러오는데 실패했습니다.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleCopyLink = (token) => {
    const url = `${window.location.origin}/proof/${token}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(token);
      setTimeout(() => setCopiedId(null), 2000);
    }).catch(() => {});
  };

  const handleDelete = async (id) => {
    if (!window.confirm('이 납품 세트를 삭제하시겠습니까?')) return;
    try {
      await deliveryApi.delete(id);
      setDeliveries(prev => prev.filter(d => d.id !== id));
    } catch {
      alert('삭제에 실패했습니다.');
    }
  };

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px' }}>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }`}</style>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: COLORS.text, margin: 0 }}>납품 관리</h1>
        <button
          onClick={() => setShowCreate(true)}
          style={{ padding: '10px 20px', borderRadius: 12, border: 'none', background: COLORS.primary, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <span>+</span> 새 납품 세트
        </button>
      </div>

      {error && (
        <div style={{ background: '#fff0f0', border: `1px solid ${COLORS.danger}`, borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: COLORS.danger }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ height: 100, borderRadius: 16, background: COLORS.surfaceDim, animation: 'pulse 1.5s ease-in-out infinite' }} />
          ))}
        </div>
      ) : deliveries.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: COLORS.textMuted }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📦</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.text, marginBottom: 6 }}>납품 세트가 없습니다</div>
          <div style={{ fontSize: 13 }}>새 납품 세트를 만들어 고객에게 사진을 납품해보세요.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {deliveries.map(d => (
            <DeliveryCard
              key={d.id}
              d={d}
              onDelete={handleDelete}
              onCopy={handleCopyLink}
              copiedId={copiedId}
            />
          ))}
        </div>
      )}

      {showCreate && (
        <DeliveryCreateModal
          onClose={() => setShowCreate(false)}
          onCreated={load}
        />
      )}
    </div>
  );
}
