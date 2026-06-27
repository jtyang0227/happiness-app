import React, { useState } from 'react';

const QUOTE = '“';
const QUOTE_END = '”';

function StarRating({ n = 5 }) {
  return (
    <div style={{ display: 'flex', gap: 2, marginBottom: 12 }}>
      {Array.from({ length: n }).map((_, i) => (
        <span key={i} style={{ color: '#f59e0b', fontSize: 13 }}>★</span>
      ))}
    </div>
  );
}

function TestimonialCard({ item, delay = 0 }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 16,
      padding: '28px 24px',
      minWidth: 280,
      maxWidth: 360,
      flexShrink: 0,
      animation: `fadeSlideUp 0.5s ease ${delay}ms both`,
    }}>
      <StarRating />
      <p style={{
        fontSize: 14,
        lineHeight: 1.8,
        color: 'rgba(255,255,255,0.72)',
        fontStyle: 'italic',
        marginBottom: 20,
        wordBreak: 'keep-all',
      }}>
        {QUOTE}{item.content}{QUOTE_END}
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 40, height: 40, borderRadius: '50%',
          background: 'linear-gradient(135deg, #5b6ef5, #a78bfa)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16, fontWeight: 800, color: '#fff', flexShrink: 0,
        }}>
          {item.clientName?.charAt(0) ?? '?'}
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>
            {item.clientName}
          </div>
          {item.clientRole && (
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{item.clientRole}</div>
          )}
          {item.shootDate && (
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 1 }}>{item.shootDate}</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function TestimonialsSection({ testimonials = [] }) {
  const [expanded, setExpanded] = useState(false);
  if (testimonials.length === 0) return null;

  const visible = expanded ? testimonials : testimonials.slice(0, 4);

  return (
    <section style={{
      padding: '72px 0 56px',
      borderTop: '1px solid rgba(255,255,255,0.05)',
    }}>
      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* 섹션 헤더 */}
      <div style={{ textAlign: 'center', marginBottom: 48, padding: '0 24px' }}>
        <div style={{
          display: 'inline-block',
          padding: '4px 14px', borderRadius: 20,
          background: 'rgba(91,110,245,0.15)',
          border: '1px solid rgba(91,110,245,0.3)',
          fontSize: 11, fontWeight: 700,
          color: '#a0a8ff', letterSpacing: '0.1em',
          textTransform: 'uppercase', marginBottom: 16,
        }}>Client Reviews</div>
        <h2 style={{
          fontSize: 'clamp(22px, 3.5vw, 34px)', fontWeight: 800,
          color: 'rgba(255,255,255,0.88)', letterSpacing: '-0.02em',
          marginBottom: 10,
        }}>고객 추천사</h2>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', lineHeight: 1.7 }}>
          함께한 클라이언트들의 솔직한 이야기
        </p>
      </div>

      {/* 카드 그리드 */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 16,
        padding: '0 24px',
        justifyContent: 'center',
      }}>
        {visible.map((item, i) => (
          <TestimonialCard key={item.id} item={item} delay={i * 80} />
        ))}
      </div>

      {/* 더 보기 */}
      {testimonials.length > 4 && (
        <div style={{ textAlign: 'center', marginTop: 32 }}>
          <button
            onClick={() => setExpanded(v => !v)}
            style={{
              padding: '8px 24px', borderRadius: 20, fontSize: 12, fontWeight: 700,
              border: '1px solid rgba(255,255,255,0.15)',
              background: 'transparent', color: 'rgba(255,255,255,0.4)',
              cursor: 'pointer', transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; }}
          >
            {expanded ? '접기 ↑' : `더 보기 +${testimonials.length - 4}`}
          </button>
        </div>
      )}
    </section>
  );
}
