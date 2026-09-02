import React, { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { COLORS } from '../../constants/colors';
import { assistantApi } from '../../services/assistantApi';

const GREETING = {
  portfolio: '안녕하세요! 촬영 문의나 예약 절차가 궁금하시면 편하게 물어보세요 😊',
  workspace: '안녕하세요! Happiness 사용법이 궁금하시면 편하게 물어보세요 😊',
};

/**
 * 플로팅 AI 어시스턴트 위젯 (Gemini 연동, 시스템 프롬프트만 사용 — DB 조회 없음).
 * - 로그인 상태면 "workspace" 모드(회원 전용 앱 사용법 안내, 인증 엔드포인트)
 * - 비로그인 + /portfolio/:profileName 페이지면 "portfolio" 모드(방문객 상담, 공개 엔드포인트)
 * - 그 외에는 렌더링하지 않음
 */
export default function ChatWidget() {
  const { user } = useAuth();
  const location = useLocation();

  const isPortfolioPage = /^\/portfolio\/[^/]+$/.test(location.pathname);
  const mode = user ? 'workspace' : (isPortfolioPage ? 'portfolio' : null);

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const listRef = useRef(null);

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{ role: 'model', content: GREETING[mode], local: true }]);
    }
    // eslint-disable-next-line
  }, [open]);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, loading]);

  // 라우트/로그인 상태가 바뀌어 모드가 바뀌면 대화를 초기화한다.
  useEffect(() => {
    setMessages([]);
    setOpen(false);
  }, [mode]);

  if (!mode) return null;

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const nextMessages = [...messages, { role: 'user', content: text }];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);

    const history = nextMessages
      .filter(m => !m.local)
      .map(m => ({ role: m.role, content: m.content }));

    try {
      const call = mode === 'workspace' ? assistantApi.chatWorkspace : assistantApi.chatPublic;
      const res = await call(text, history.slice(0, -1));
      setMessages(prev => [...prev, { role: 'model', content: res.reply }]);
    } catch (err) {
      const errMsg = err?.response?.data?.error || 'AI 어시스턴트에 연결하지 못했어요. 잠시 후 다시 시도해주세요.';
      setMessages(prev => [...prev, { role: 'model', content: errMsg, error: true }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      <style>{`
        @keyframes assistant-fade-in {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .assistant-fab {
          bottom: 24px;
        }
        .assistant-panel {
          bottom: 88px;
        }
        @media (max-width: 767px) {
          .assistant-fab   { bottom: calc(76px + env(safe-area-inset-bottom)); }
          .assistant-panel { bottom: calc(140px + env(safe-area-inset-bottom)); }
        }
      `}</style>

      {/* 채팅 패널 */}
      {open && (
        <div className="assistant-panel" style={{
          position: 'fixed',
          right: 20,
          width: 340,
          maxWidth: 'calc(100vw - 40px)',
          height: 460,
          maxHeight: 'calc(100vh - 160px)',
          background: COLORS.surface,
          border: `1px solid ${COLORS.border}`,
          borderRadius: 16,
          boxShadow: '0 8px 28px rgba(0,0,0,0.12)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 1000,
          animation: 'assistant-fade-in 0.2s ease both',
        }}>
          {/* 헤더 */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 16px', borderBottom: `1px solid ${COLORS.border}`,
          }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.text }}>
              💬 {mode === 'workspace' ? '사용법 도우미' : '상담 도우미'}
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="닫기"
              style={{
                border: 'none', background: 'transparent', cursor: 'pointer',
                fontSize: 18, color: COLORS.textMuted, lineHeight: 1, padding: 4,
              }}
            >×</button>
          </div>

          {/* 메시지 목록 */}
          <div ref={listRef} style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {messages.map((m, i) => (
              <div key={i} style={{
                alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '85%',
                background: m.role === 'user' ? COLORS.primary : (m.error ? COLORS.dangerTonal : COLORS.surfaceDim),
                color: m.role === 'user' ? '#fff' : (m.error ? COLORS.danger : COLORS.text),
                borderRadius: 14,
                padding: '9px 13px',
                fontSize: 13,
                lineHeight: 1.5,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}>
                {m.content}
              </div>
            ))}
            {loading && (
              <div style={{
                alignSelf: 'flex-start', background: COLORS.surfaceDim, color: COLORS.textMuted,
                borderRadius: 14, padding: '9px 13px', fontSize: 13,
              }}>
                입력 중...
              </div>
            )}
          </div>

          {/* 입력창 */}
          <div style={{ display: 'flex', gap: 8, padding: 12, borderTop: `1px solid ${COLORS.border}` }}>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="메시지를 입력하세요..."
              rows={1}
              style={{
                flex: 1, resize: 'none', border: `1px solid ${COLORS.border}`,
                borderRadius: 10, padding: '9px 11px', fontSize: 13,
                color: COLORS.text, outline: 'none', fontFamily: 'inherit',
                background: COLORS.surfaceDim,
              }}
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              aria-label="전송"
              style={{
                border: 'none', borderRadius: 10, padding: '0 16px',
                background: (loading || !input.trim()) ? COLORS.textHint : COLORS.primary,
                color: '#fff', fontSize: 13, fontWeight: 700,
                cursor: (loading || !input.trim()) ? 'not-allowed' : 'pointer',
              }}
            >
              전송
            </button>
          </div>
        </div>
      )}

      {/* 플로팅 버튼 */}
      <button
        className="assistant-fab"
        onClick={() => setOpen(o => !o)}
        aria-label={open ? '어시스턴트 닫기' : '어시스턴트 열기'}
        style={{
          position: 'fixed', right: 20,
          width: 52, height: 52, borderRadius: '50%',
          border: 'none', background: COLORS.primary, color: '#fff',
          fontSize: 22, cursor: 'pointer',
          boxShadow: '0 4px 14px rgba(0,0,0,0.16)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000,
          transition: 'background 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = COLORS.primaryDark; }}
        onMouseLeave={e => { e.currentTarget.style.background = COLORS.primary; }}
      >
        {open ? '×' : '💬'}
      </button>
    </>
  );
}
