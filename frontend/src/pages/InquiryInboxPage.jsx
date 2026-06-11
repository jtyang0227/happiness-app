import React, { useState, useEffect, useCallback } from 'react';
import { inquiryApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { COLORS } from '../constants/colors';

const SHOOT_TYPE_LABELS = {
  '결혼식': '💒 결혼식', '제품촬영': '📦 제품', '인물/프로필': '👤 인물',
  '풍경': '🌄 풍경', '행사/이벤트': '🎉 행사', '가족': '👨‍👩‍👧 가족', '기타': '📷 기타',
};

function InquiryCard({ inquiry, onRead, onDelete }) {
  const [expanded, setExpanded] = useState(false);

  const handleExpand = () => {
    setExpanded(p => !p);
    if (!inquiry.isRead) onRead(inquiry.id);
  };

  return (
    <div style={{
      background: COLORS.surface, borderRadius: 14,
      border: `1.5px solid ${inquiry.isRead ? COLORS.border : COLORS.primary}`,
      boxShadow: inquiry.isRead ? 'none' : '0 2px 12px rgba(91,110,245,0.12)',
      marginBottom: 12, overflow: 'hidden', transition: 'border-color 0.2s',
    }}>
      {/* 헤더 */}
      <div
        onClick={handleExpand}
        style={{
          padding: '16px 20px', cursor: 'pointer', display: 'flex',
          alignItems: 'center', gap: 12, userSelect: 'none',
        }}
      >
        {!inquiry.isRead && (
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: COLORS.primary, flexShrink: 0,
          }} />
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
            <span style={{ fontSize: 14, fontWeight: inquiry.isRead ? 600 : 800, color: COLORS.text }}>
              {inquiry.senderName}
            </span>
            <span style={{ fontSize: 12, color: COLORS.textMuted }}>{inquiry.senderEmail}</span>
            {inquiry.shootType && (
              <span style={{
                fontSize: 11, fontWeight: 700,
                padding: '2px 8px', borderRadius: 8,
                background: COLORS.primaryLight, color: COLORS.primary,
              }}>
                {SHOOT_TYPE_LABELS[inquiry.shootType] || inquiry.shootType}
              </span>
            )}
          </div>
          <div style={{
            fontSize: 13, color: COLORS.textSecondary,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {inquiry.message}
          </div>
        </div>
        <div style={{ fontSize: 11, color: COLORS.textMuted, flexShrink: 0 }}>
          {inquiry.createdAt ? new Date(inquiry.createdAt).toLocaleDateString('ko-KR') : ''}
        </div>
        <span style={{ color: COLORS.textMuted, fontSize: 14 }}>{expanded ? '▲' : '▼'}</span>
      </div>

      {/* 본문 */}
      {expanded && (
        <div style={{
          padding: '0 20px 20px', borderTop: `1px solid ${COLORS.border}`, paddingTop: 16,
        }}>
          {(inquiry.shootDate || inquiry.budget) && (
            <div style={{ display: 'flex', gap: 24, marginBottom: 12 }}>
              {inquiry.shootDate && (
                <div>
                  <span style={{ fontSize: 11, color: COLORS.textMuted, fontWeight: 600 }}>희망 날짜</span>
                  <p style={{ fontSize: 13, color: COLORS.text, marginTop: 2 }}>{inquiry.shootDate}</p>
                </div>
              )}
              {inquiry.budget && (
                <div>
                  <span style={{ fontSize: 11, color: COLORS.textMuted, fontWeight: 600 }}>예산</span>
                  <p style={{ fontSize: 13, color: COLORS.text, marginTop: 2 }}>{inquiry.budget}</p>
                </div>
              )}
            </div>
          )}
          <div style={{
            background: COLORS.bg, borderRadius: 10, padding: '14px 16px',
            fontSize: 14, color: COLORS.text, lineHeight: 1.7, whiteSpace: 'pre-wrap',
            marginBottom: 14,
          }}>
            {inquiry.message}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <a
              href={`mailto:${inquiry.senderEmail}`}
              style={{
                padding: '8px 18px', borderRadius: 10, fontSize: 13, fontWeight: 700,
                background: COLORS.primary, color: '#fff', textDecoration: 'none',
                display: 'inline-block',
              }}
            >
              ✉ 답장하기
            </a>
            <button
              onClick={() => onDelete(inquiry.id)}
              style={{
                padding: '8px 18px', borderRadius: 10, fontSize: 13, fontWeight: 600,
                border: `1px solid ${COLORS.border}`, background: '#fff',
                color: COLORS.textSecondary, cursor: 'pointer',
              }}
            >
              삭제
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function InquiryInboxPage() {
  const { user } = useAuth();
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all' | 'unread'

  const fetchInbox = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const data = await inquiryApi.getInbox(user.id);
      setInquiries(Array.isArray(data) ? data : []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { fetchInbox(); }, [fetchInbox]);

  const handleRead = async (id) => {
    try {
      await inquiryApi.markRead(id);
      setInquiries(prev => prev.map(i => i.id === id ? { ...i, isRead: true } : i));
    } catch {}
  };

  const handleDelete = async (id) => {
    if (!window.confirm('이 문의를 삭제하시겠습니까?')) return;
    try {
      await inquiryApi.remove(id);
      setInquiries(prev => prev.filter(i => i.id !== id));
    } catch {
      alert('삭제에 실패했습니다.');
    }
  };

  const filtered = filter === 'unread' ? inquiries.filter(i => !i.isRead) : inquiries;
  const unreadCount = inquiries.filter(i => !i.isRead).length;

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 20px 60px' }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: COLORS.text, marginBottom: 4 }}>
            문의 수신함
          </h1>
          <p style={{ color: COLORS.textSecondary, fontSize: 14 }}>
            총 {inquiries.length}건 {unreadCount > 0 && (
              <span style={{ color: COLORS.primary, fontWeight: 700 }}>/ 읽지 않음 {unreadCount}건</span>
            )}
          </p>
        </div>
      </div>

      {/* 필터 탭 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {[
          { key: 'all', label: `전체 ${inquiries.length}` },
          { key: 'unread', label: `읽지 않음 ${unreadCount}` },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            style={{
              padding: '7px 16px', borderRadius: 20, fontSize: 13, fontWeight: 600,
              border: 'none', cursor: 'pointer',
              background: filter === tab.key ? COLORS.primary : COLORS.border,
              color: filter === tab.key ? '#fff' : COLORS.textSecondary,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 목록 */}
      {loading ? (
        <div style={{ textAlign: 'center', color: COLORS.textMuted, padding: '60px 0' }}>
          불러오는 중...
        </div>
      ) : filtered.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '80px 0',
          border: `2px dashed ${COLORS.border}`, borderRadius: 20,
        }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>✉</div>
          <p style={{ color: COLORS.textSecondary, fontSize: 15 }}>
            {filter === 'unread' ? '읽지 않은 문의가 없습니다.' : '아직 받은 문의가 없습니다.'}
          </p>
        </div>
      ) : (
        filtered.map(inquiry => (
          <InquiryCard
            key={inquiry.id}
            inquiry={inquiry}
            onRead={handleRead}
            onDelete={handleDelete}
          />
        ))
      )}
    </div>
  );
}
