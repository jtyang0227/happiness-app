import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import apiClient from '../api/apiClient';
import { seriesApi } from '../services/api';
import { COLORS } from '../constants/colors';
import { shootTypeLabel } from '../constants/shootTypes';
import { applyPageMeta } from '../utils/pageMeta';
import Button from '../components/common/Button';
import DotEmptyState from '../components/common/DotEmptyState';

/**
 * 작업 노트 페이지 — 시리즈 1건을 "작업 사례"로 보여준다.
 * 기획: DESIGN_PROMPTS/planning/PLANNING_portfolio-work-notes-concept.md (P0)
 * 디자인: DESIGN_PROMPTS/design/DESIGN_PROMPT_portfolio-work-notes.md
 *
 * 데이터는 이미 공개된 두 API 조합 — 작가/작업 목록(GET /portfolio/:profileName) + 작업 상세(GET /series/:id).
 * 시리즈가 이 작가의 것이 아니면 not-found로 처리해, 남의 작업을 다른 작가 주소로 노출하지 않는다.
 */

const CSS = `
  .work-photos { display: flex; flex-direction: column; gap: 40px; }
  .work-cover  { height: min(64vh, 560px); }
  .work-title  { font-size: 36px; }
  @media (max-width: 767px) {
    .work-photos { gap: 20px; }
    .work-photos figure { margin-left: -24px !important; margin-right: -24px !important; }
    .work-photos figcaption { padding: 0 24px !important; }
    .work-cover  { height: 46vh; }
    .work-title  { font-size: 28px; }
  }
  .work-other-card { transition: transform 0.2s ease, box-shadow 0.2s ease; }
  .work-other-card:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,0.08); }
  .work-other-card:focus-visible, .work-link-btn:focus-visible { outline: 2px solid ${COLORS.primary}; outline-offset: 2px; }
  @keyframes work-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
  @media (prefers-reduced-motion: reduce) {
    .work-other-card, .work-other-card:hover { transition: none; transform: none; }
  }
`;

const COLUMN = { maxWidth: 1040, margin: '0 auto', padding: '0 24px' };
const TEXT_COLUMN = { maxWidth: 640, margin: '0 auto', padding: '0 24px' };

function SkeletonBar({ width, height = 14, style }) {
  return <div style={{ width, height, borderRadius: 6, background: COLORS.border, animation: 'work-pulse 1.4s ease-in-out infinite', ...style }} />;
}

function OtherWorkCard({ work, onOpen }) {
  const cover = work.coverImageUrl || work.previewPhotos?.[0];
  const label = shootTypeLabel(work.shootType);
  return (
    <button
      type="button"
      className="work-other-card"
      onClick={onOpen}
      style={{
        flexShrink: 0, width: 220, textAlign: 'left', padding: 0, cursor: 'pointer',
        background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, overflow: 'hidden',
      }}
    >
      <div style={{ aspectRatio: '4 / 3', background: COLORS.surfaceDim }}>
        {cover && <img src={cover} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
      </div>
      <div style={{ padding: '10px 12px 12px' }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {work.title}
        </div>
        <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 4 }}>
          {[label, `${work.photoCount ?? 0}장`].filter(Boolean).join(' · ')}
        </div>
      </div>
    </button>
  );
}

export default function WorkCasePage() {
  const { profileName, seriesId } = useParams();
  const navigate = useNavigate();
  const [member, setMember] = useState(null);
  const [work, setWork] = useState(null);
  const [others, setOthers] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | notfound | error
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    window.scrollTo(0, 0);
    (async () => {
      try {
        const [portfolioRes, workRes] = await Promise.all([
          apiClient.get(`/portfolio/${profileName}`),
          seriesApi.getOne(seriesId),
        ]);
        if (cancelled) return;
        const owner = portfolioRes.data?.member;
        const detail = workRes?.data ?? workRes;
        if (!owner || !detail || detail.memberId !== owner.id) {
          setStatus('notfound');
          return;
        }
        setMember(owner);
        setWork(detail);
        setOthers((portfolioRes.data?.series || []).filter(s => String(s.id) !== String(seriesId)));
        setStatus('ready');
      } catch (err) {
        if (cancelled) return;
        const code = err?.response?.status;
        setStatus(code === 404 || code === 403 ? 'notfound' : 'error');
      }
    })();
    return () => { cancelled = true; };
  }, [profileName, seriesId]);

  useEffect(() => {
    if (status !== 'ready' || !work) return;
    const artist = member?.name || profileName;
    const summary = (work.story || work.description || '').replace(/\s+/g, ' ').trim();
    return applyPageMeta({
      title: `${work.title} — ${artist} | Happiness`,
      description: summary ? summary.slice(0, 120) : `${artist} 작가의 작업 노트`,
      image: work.coverImageUrl || work.photos?.[0]?.imageUrl,
      url: window.location.href,
      type: 'article',
    });
  }, [status, work, member, profileName]);

  const portfolioPath = `/portfolio/${profileName}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('아래 주소를 복사하세요', window.location.href);
    }
  };

  const handleInquiry = () => {
    const params = new URLSearchParams({ memberId: String(member.id) });
    if (work.shootType) params.set('shootType', work.shootType);
    params.set('seriesId', String(work.id)); // 수신함에 "어떤 작업을 보고 왔는지" 표시
    navigate(`/inquiry/${profileName}?${params.toString()}`);
  };

  const topBar = (
    <div style={{ position: 'sticky', top: 0, zIndex: 10, background: COLORS.surface, borderBottom: `1px solid ${COLORS.border}` }}>
      <div style={{ ...COLUMN, height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <button
          type="button" className="work-link-btn" onClick={() => navigate(portfolioPath)}
          style={{ background: 'none', border: 'none', padding: '6px 0', cursor: 'pointer', fontSize: 14, fontWeight: 600, color: COLORS.textSecondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
        >
          ‹ {member?.name || profileName} 포트폴리오
        </button>
        {status === 'ready' && (
          <Button variant="ghost" size="sm" onClick={handleCopy} aria-live="polite">
            {copied ? '✓ 복사했어요' : '🔗 링크 복사'}
          </Button>
        )}
      </div>
    </div>
  );

  if (status === 'loading') {
    return (
      <div style={{ minHeight: '100vh', background: COLORS.surface }}>
        <style>{CSS}</style>
        {topBar}
        <div className="work-cover" style={{ background: COLORS.border, animation: 'work-pulse 1.4s ease-in-out infinite' }} />
        <div style={{ ...TEXT_COLUMN, paddingTop: 32, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <SkeletonBar width={90} height={11} />
          <SkeletonBar width="70%" height={32} />
          <SkeletonBar width="45%" />
        </div>
      </div>
    );
  }

  if (status === 'notfound' || status === 'error') {
    return (
      <div style={{ minHeight: '100vh', background: COLORS.bg }}>
        <style>{CSS}</style>
        {topBar}
        <DotEmptyState
          theme="light"
          icon={status === 'notfound' ? '📁' : '⚠️'}
          title={status === 'notfound' ? '작업을 찾을 수 없어요' : '작업을 불러오지 못했어요'}
          description={status === 'notfound' ? '삭제되었거나 주소가 잘못되었을 수 있어요.' : '잠시 후 다시 시도해주세요.'}
          actionLabel="포트폴리오로 돌아가기"
          onAction={() => navigate(portfolioPath)}
          style={{ paddingTop: 96 }}
        />
      </div>
    );
  }

  const photos = work.photos || [];
  const cover = work.coverImageUrl || photos[0]?.imageUrl;
  const typeLabel = shootTypeLabel(work.shootType);
  const meta = [typeLabel, work.clientLabel, work.shotOn, `${photos.length}장`].filter(Boolean);
  const artistName = member.name || profileName;

  return (
    <div style={{ minHeight: '100vh', background: COLORS.surface, color: COLORS.text }}>
      <style>{CSS}</style>
      {topBar}

      {/* 커버 — 이미지 위에 글을 얹지 않는다 */}
      {cover && (
        <div className="work-cover" style={{ background: COLORS.galleryBg }}>
          <img src={cover} alt={work.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        </div>
      )}

      <header style={{ ...TEXT_COLUMN, paddingTop: 36, paddingBottom: 8 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', color: COLORS.textMuted, marginBottom: 10 }}>
          WORK NOTE
        </div>
        <h1 className="work-title" style={{ fontWeight: 800, lineHeight: 1.25, margin: 0, textWrap: 'balance', wordBreak: 'keep-all' }}>
          {work.title}
        </h1>
        <p style={{ fontSize: 14, color: COLORS.textSecondary, margin: '12px 0 0', fontVariantNumeric: 'tabular-nums' }}>
          {meta.join(' · ')}
        </p>
        {work.description && (
          <p style={{ fontSize: 15, color: COLORS.textSecondary, lineHeight: 1.7, margin: '16px 0 0', wordBreak: 'keep-all' }}>
            {work.description}
          </p>
        )}
      </header>

      {work.story && (
        <section aria-labelledby="work-story-heading" style={{ ...TEXT_COLUMN, paddingTop: 28 }}>
          <h2 id="work-story-heading" style={{ fontSize: 13, fontWeight: 700, color: COLORS.textMuted, margin: '0 0 10px' }}>
            작업 노트
          </h2>
          <p style={{ fontSize: 17, lineHeight: 1.85, margin: 0, whiteSpace: 'pre-line', wordBreak: 'keep-all' }}>
            {work.story}
          </p>
        </section>
      )}

      <section aria-label="작업 사진" style={{ ...COLUMN, paddingTop: 48 }}>
        {photos.length === 0 ? (
          <p style={{ textAlign: 'center', fontSize: 14, color: COLORS.textMuted, padding: '48px 0', background: COLORS.bg, borderRadius: 12, margin: 0 }}>
            아직 이 작업에 사진이 없어요
          </p>
        ) : (
          <div className="work-photos">
            {photos.map((p, i) => (
              <figure key={p.id} style={{ margin: 0 }}>
                <img
                  src={p.imageUrl || p.thumbnailUrl}
                  alt={p.title || `작업 사진 ${i + 1}`}
                  loading={i < 2 ? 'eager' : 'lazy'}
                  style={{ width: '100%', height: 'auto', display: 'block', background: COLORS.surfaceDim }}
                />
                {p.title && (
                  <figcaption style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 8, padding: '0 24px 0 0' }}>
                    {p.title}
                  </figcaption>
                )}
              </figure>
            ))}
          </div>
        )}
      </section>

      {/* 이어지는 의뢰 */}
      <section style={{ ...TEXT_COLUMN, paddingTop: 64 }}>
        <div style={{ border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: 32 }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0, wordBreak: 'keep-all' }}>이런 촬영이 필요하신가요?</h2>
          <p style={{ fontSize: 15, color: COLORS.textSecondary, lineHeight: 1.6, margin: '8px 0 20px', wordBreak: 'keep-all' }}>
            {typeLabel
              ? `${artistName} 작가에게 ${typeLabel} 촬영을 문의해 보세요.`
              : `${artistName} 작가에게 촬영을 문의해 보세요.`}
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Button size="lg" onClick={handleInquiry}>이런 촬영 문의하기</Button>
            <Button size="lg" variant="ghost" onClick={() => navigate(portfolioPath)}>포트폴리오 전체 보기</Button>
          </div>
        </div>
      </section>

      {others.length > 0 && (
        <section aria-labelledby="work-others-heading" style={{ ...COLUMN, paddingTop: 56, paddingBottom: 80 }}>
          <h2 id="work-others-heading" style={{ fontSize: 17, fontWeight: 800, margin: '0 0 14px' }}>다른 작업</h2>
          <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8 }}>
            {others.map(o => (
              <OtherWorkCard key={o.id} work={o} onOpen={() => navigate(`/portfolio/${profileName}/work/${o.id}`)} />
            ))}
          </div>
        </section>
      )}
      {others.length === 0 && <div style={{ height: 80 }} />}
    </div>
  );
}
