import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import WorkNotesSection, { FeaturedWorkCard } from '../WorkNotesSection';
import TestimonialsSection from '../TestimonialsSection';
import PricingSection from '../PricingSection';
import PressAwardsSection from '../PressAwardsSection';
import ClientLogoWall from '../ClientLogoWall';
import NewsletterSection from '../NewsletterSection';
import AcceptingBadge from '../../common/AcceptingBadge';

/*
 * "직접 구성" 블록 컴포넌트 — 모두 ({ props, ctx }) 를 받는다.
 * ctx: member · photos · series · profileName · acceptingBookings · trust{…} · t(테마 값) · narrow · 통계 수치
 * 등록·설정 항목은 blockRegistry.js. 여기에는 화면만 둔다.
 */

function Heading({ children, t, style }) {
  if (!children) return null;
  return (
    <h2 style={{
      fontFamily: t.headingFamily, fontSize: 'clamp(22px, 3vw, 30px)', fontWeight: 700, letterSpacing: '-0.02em',
      color: t.text, margin: '0 0 20px', textWrap: 'balance', ...style,
    }}>{children}</h2>
  );
}

function ActionLink({ to, children, t, primary }) {
  return (
    <Link to={to} className="pb-action" style={{
      display: 'inline-flex', alignItems: 'center', height: 44, padding: '0 18px', borderRadius: 10,
      fontSize: 14, fontWeight: 700, textDecoration: 'none',
      background: primary ? t.accent : 'transparent', color: primary ? '#fff' : t.text,
      border: primary ? 'none' : `1px solid ${t.border}`,
    }}>{children}</Link>
  );
}

export function HeroBlock({ props, ctx }) {
  const { member, profileName, t, acceptingBookings, photoCount, followerCount, totalLikes } = ctx;
  const center = props.align === 'center';
  const specialties = (member?.specialties || '').split(',').map(s => s.trim()).filter(Boolean);
  const meta = [member?.location, ...specialties].filter(Boolean).join(' · ');
  const tagline = props.tagline || member?.bio;
  return (
    <div>
      {member?.coverUrl && (
        <img src={member.coverUrl} alt="" style={{ width: '100%', height: ctx.narrow ? 220 : 380, objectFit: 'cover', display: 'block', borderRadius: 16, marginBottom: 32 }} />
      )}
      <div style={{ textAlign: center ? 'center' : 'left', display: 'flex', flexDirection: 'column', alignItems: center ? 'center' : 'flex-start', gap: 12 }}>
        {member?.avatarUrl && (
          <img src={member.avatarUrl} alt={`${member.name} 프로필 사진`} style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover' }} />
        )}
        <h1 style={{ fontFamily: t.headingFamily, fontSize: 'clamp(32px, 6vw, 56px)', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.1, color: t.text, margin: 0, textWrap: 'balance' }}>
          {member?.name || profileName}
        </h1>
        {tagline && <p style={{ fontSize: 17, lineHeight: 1.6, color: t.sub, margin: 0, maxWidth: 620 }}>{tagline}</p>}
        {meta && <div style={{ fontSize: 13, color: t.muted }}>{meta}</div>}
        {acceptingBookings && <AcceptingBadge to={`/booking/${profileName}`} />}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8, justifyContent: center ? 'center' : 'flex-start' }}>
          <ActionLink to={`/inquiry/${profileName}?memberId=${member?.id ?? ''}`} t={t} primary>촬영 문의하기</ActionLink>
          <ActionLink to={`/portfolio/${profileName}/slideshow`} t={t}>슬라이드쇼</ActionLink>
        </div>
        {props.showStats && (
          <div style={{ display: 'flex', gap: 24, marginTop: 12, fontVariantNumeric: 'tabular-nums', justifyContent: center ? 'center' : 'flex-start' }}>
            {[['사진', photoCount], ['팔로워', followerCount], ['좋아요', totalLikes]].map(([label, v]) => (
              <div key={label}>
                <div style={{ fontSize: 20, fontWeight: 800, color: t.text }}>{Number(v || 0).toLocaleString()}</div>
                <div style={{ fontSize: 12, color: t.muted }}>{label}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function FeaturedWorkBlock({ props, ctx }) {
  return (
    <div>
      <Heading t={ctx.t}>{props.title}</Heading>
      <FeaturedWorkCard series={ctx.series} profileName={ctx.profileName} theme={ctx.t.theme} style={{ padding: 0, maxWidth: 'none' }} />
    </div>
  );
}

export function WorksBlock({ props, ctx }) {
  return <WorkNotesSection series={ctx.series} profileName={ctx.profileName} theme={ctx.t.theme} heading={props.title || '작업 노트'} style={{ padding: 0, maxWidth: 'none' }} />;
}

export function photosForBlock(props, photos = []) {
  const list = props.genre ? photos.filter(p => p.genre === props.genre) : photos;
  return list.slice(0, props.limit || 12);
}

export function PhotosBlock({ props, ctx }) {
  const [open, setOpen] = useState(null);
  const list = photosForBlock(props, ctx.photos);
  const cols = ctx.narrow ? Math.min(props.columns || 3, 2) : (props.columns || 3);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <div>
      <Heading t={ctx.t}>{props.title}</Heading>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap: ctx.narrow ? 6 : 10 }}>
        {list.map(p => (
          <button key={p.id} type="button" className="pb-photo" onClick={() => setOpen(p)} aria-label={`${p.title || '사진'} 크게 보기`}
            style={{ padding: 0, border: 'none', background: ctx.t.surface, aspectRatio: '1 / 1', overflow: 'hidden', borderRadius: 8, cursor: 'zoom-in' }}>
            <img src={p.thumbnailUrl || p.imageUrl} alt={p.title || ''} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          </button>
        ))}
      </div>
      {open && (
        <div role="dialog" aria-modal="true" aria-label={open.title || '사진'} onClick={() => setOpen(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, cursor: 'zoom-out' }}>
          <img src={open.imageUrl || open.thumbnailUrl} alt={open.title || ''} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
          <button type="button" onClick={() => setOpen(null)} aria-label="닫기"
            style={{ position: 'absolute', top: 16, right: 16, width: 40, height: 40, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.14)', color: '#fff', fontSize: 20, cursor: 'pointer' }}>✕</button>
        </div>
      )}
    </div>
  );
}

export function TextBlock({ props, ctx }) {
  return (
    <div style={{ maxWidth: 640 }}>
      <Heading t={ctx.t}>{props.title}</Heading>
      <p style={{ fontSize: 16, lineHeight: 1.8, color: ctx.t.sub, whiteSpace: 'pre-line', margin: 0 }}>{props.body}</p>
    </div>
  );
}

export function QuoteBlock({ props, ctx }) {
  return (
    <figure style={{ margin: 0, maxWidth: 720, borderLeft: `3px solid ${ctx.t.accent}`, paddingLeft: 24 }}>
      <blockquote style={{ margin: 0, fontFamily: ctx.t.headingFamily, fontSize: 'clamp(20px, 2.6vw, 28px)', lineHeight: 1.5, color: ctx.t.text, whiteSpace: 'pre-line' }}>
        “{props.text}”
      </blockquote>
      {props.author && <figcaption style={{ marginTop: 12, fontSize: 14, color: ctx.t.muted }}>— {props.author}</figcaption>}
    </figure>
  );
}

export function TestimonialsBlock({ ctx }) {
  return <TestimonialsSection testimonials={ctx.trust.testimonials} theme={ctx.t.theme} />;
}

export function PricingBlock({ ctx }) {
  return <PricingSection pricing={ctx.trust.pricing} profileName={ctx.profileName} />;
}

export function PressBlock({ ctx }) {
  return <PressAwardsSection press={ctx.trust.press} achievements={ctx.trust.achievements} theme={ctx.t.theme} />;
}

export function ClientsBlock({ ctx }) {
  return <ClientLogoWall brands={ctx.trust.brands} theme={ctx.t.theme} />;
}

export function ContactBlock({ props, ctx }) {
  const { t, profileName, member, acceptingBookings } = ctx;
  return (
    <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 16, padding: ctx.narrow ? 24 : 40, textAlign: 'center' }}>
      <Heading t={t} style={{ marginBottom: 10 }}>{props.title || '촬영 문의'}</Heading>
      {props.body && <p style={{ fontSize: 15, lineHeight: 1.7, color: t.sub, margin: '0 auto 20px', maxWidth: 520, whiteSpace: 'pre-line' }}>{props.body}</p>}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
        <ActionLink to={`/inquiry/${profileName}?memberId=${member?.id ?? ''}`} t={t} primary>촬영 문의하기</ActionLink>
        {props.showBooking && acceptingBookings && <ActionLink to={`/booking/${profileName}`} t={t}>예약 날짜 보기</ActionLink>}
      </div>
    </div>
  );
}

export function NewsletterBlock({ ctx }) {
  return <NewsletterSection memberId={ctx.member?.id} memberName={ctx.member?.name} />;
}
