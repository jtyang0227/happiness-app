import React, { useState } from 'react';
import { newsletterApi } from '../../services/portfolioApi';

export default function NewsletterSection({ memberId, memberName }) {
  const [email, setEmail]       = useState('');
  const [status, setStatus]     = useState('idle'); // idle | loading | success | error
  const [message, setMessage]   = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const val = email.trim().toLowerCase();
    if (!val.match(/^[^@\s]+@[^@\s]+\.[^@\s]+$/)) {
      setStatus('error'); setMessage('올바른 이메일 주소를 입력해주세요.'); return;
    }
    setStatus('loading');
    try {
      const res = await newsletterApi.subscribe(memberId, val);
      if (res.status === 'subscribed' || res.status === 'resubscribed') {
        setStatus('success'); setMessage('구독해 주셔서 감사합니다! 새 작업물이 올라오면 알려드릴게요.');
      } else if (res.status === 'already_subscribed') {
        setStatus('success'); setMessage('이미 구독 중이십니다. 감사합니다!');
      }
    } catch (err) {
      setStatus('error');
      setMessage(err?.response?.data?.error || '구독 처리 중 오류가 발생했습니다.');
    }
  };

  if (!memberId) return null;

  return (
    <section style={{
      padding: '72px 24px 64px',
      borderTop: '1px solid rgba(255,255,255,0.05)',
      textAlign: 'center',
    }}>
      {/* 배경 장식 */}
      <div style={{
        maxWidth: 560, margin: '0 auto',
        background: 'radial-gradient(ellipse at center, rgba(91,110,245,0.08) 0%, transparent 70%)',
        padding: '48px 32px',
        borderRadius: 24,
        border: '1px solid rgba(91,110,245,0.1)',
      }}>
        <div style={{ fontSize: 32, marginBottom: 16 }}>✉</div>
        <h2 style={{
          fontSize: 'clamp(18px, 3vw, 26px)', fontWeight: 800,
          color: 'rgba(255,255,255,0.88)', marginBottom: 10, letterSpacing: '-0.01em',
        }}>
          새 작업물 알림 받기
        </h2>
        <p style={{
          fontSize: 13, color: 'rgba(255,255,255,0.35)', lineHeight: 1.7, marginBottom: 28,
        }}>
          {memberName ? `${memberName}의 ` : ''}새로운 작품과 소식을 이메일로 받아보세요.
        </p>

        {status === 'success' ? (
          <div style={{
            padding: '16px 24px', borderRadius: 12,
            background: 'rgba(52,211,153,0.12)',
            border: '1px solid rgba(52,211,153,0.25)',
            color: '#34d399', fontSize: 14, fontWeight: 600,
          }}>
            ✓ {message}
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
            <input
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); setStatus('idle'); }}
              placeholder="이메일 주소를 입력하세요"
              disabled={status === 'loading'}
              style={{
                flex: '1 1 240px', maxWidth: 320, padding: '12px 18px',
                borderRadius: 12, fontSize: 13, outline: 'none',
                background: 'rgba(255,255,255,0.08)',
                border: status === 'error' ? '1.5px solid #ef4444' : '1.5px solid rgba(255,255,255,0.12)',
                color: '#fff',
                transition: 'border-color 0.2s',
              }}
              onFocus={e => { if (status !== 'error') e.target.style.borderColor = 'rgba(91,110,245,0.6)'; }}
              onBlur={e => { if (status !== 'error') e.target.style.borderColor = 'rgba(255,255,255,0.12)'; }}
            />
            <button
              type="submit"
              disabled={status === 'loading'}
              style={{
                padding: '12px 24px', borderRadius: 12, fontSize: 13, fontWeight: 700,
                border: 'none', background: '#5b6ef5', color: '#fff',
                cursor: status === 'loading' ? 'not-allowed' : 'pointer',
                opacity: status === 'loading' ? 0.7 : 1,
                transition: 'opacity 0.2s, transform 0.2s',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => { if (status !== 'loading') { e.currentTarget.style.opacity = '0.85'; e.currentTarget.style.transform = 'translateY(-1px)'; } }}
              onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              {status === 'loading' ? '처리 중...' : '구독하기'}
            </button>
          </form>
        )}

        {status === 'error' && (
          <div style={{ marginTop: 10, fontSize: 12, color: '#f87171' }}>{message}</div>
        )}

        <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.15)', marginTop: 16 }}>
          언제든지 구독을 취소할 수 있습니다. 스팸 메일은 보내지 않습니다.
        </p>
      </div>
    </section>
  );
}
