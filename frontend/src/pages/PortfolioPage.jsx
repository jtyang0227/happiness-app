import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../api/apiClient';
import { followApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

import TemplateEditorial from '../components/portfolio/templates/TemplateEditorial';
import TemplateMinimal   from '../components/portfolio/templates/TemplateMinimal';
import TemplateScrl      from '../components/portfolio/templates/TemplateScrl';
import TemplateDarkRoom  from '../components/portfolio/templates/TemplateDarkRoom';

/* ── Follow List Modal ────────────────────────────── */
function FollowListModal({ title, members, loading, onClose }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#12122a', borderRadius: 16, padding: 20, width: '90%', maxWidth: 360, maxHeight: '70vh', overflow: 'auto', border: '1px solid #2a2a50' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#eeeeff' }}>{title}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#9090cc', cursor: 'pointer', fontSize: 20, lineHeight: 1 }}>×</button>
        </div>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: '#5555aa', fontSize: 13 }}>불러오는 중...</div>
        ) : members.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#5555aa', padding: '24px 0', fontSize: 13 }}>목록이 없습니다.</div>
        ) : members.map(m => (
          <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid #1e1e3a' }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg, #5b6ef5, #a78bfa)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#fff', overflow: 'hidden' }}>
              {m.avatarUrl ? <img src={m.avatarUrl} alt={m.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : m.name?.charAt(0)}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#d0d0f0' }}>{m.name}</div>
              {m.profileName && <div style={{ fontSize: 11, color: '#6060a0' }}>@{m.profileName}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Fallback for FILM/SPLIT/MOSAIC (준비 중) ──────── */
function TemplateComingSoon({ template, member, photos, profileName }) {
  const navigate = useNavigate();
  const pName = member?.profileName || profileName || '';
  return (
    <div style={{ minHeight: '100vh', background: '#0e0e0e', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
      <div style={{ fontSize: 40 }}>✦</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: '#eeeeff' }}>{template} 템플릿</div>
      <div style={{ fontSize: 14, color: '#6060a0' }}>이 템플릿은 현재 준비 중입니다.</div>
      <div style={{ fontSize: 13, color: '#4040a0', marginTop: 4 }}>잠시 에디토리얼 레이아웃으로 표시합니다.</div>
      <TemplateEditorial
        member={member}
        photos={photos}
        series={[]}
        profileName={pName}
      />
    </div>
  );
}

/* ── Main Page ──────────────────────────────────────── */
export default function PortfolioPage() {
  const { profileName } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [data, setData]           = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [isPrivate, setIsPrivate] = useState(false);

  const [template, setTemplate]   = useState('EDITORIAL');
  const [configLoaded, setConfigLoaded] = useState(false);

  const [following, setFollowing]         = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followLoading, setFollowLoading] = useState(false);

  const [followModal, setFollowModal]               = useState(null);
  const [followModalMembers, setFollowModalMembers] = useState([]);
  const [loadingModal, setLoadingModal]             = useState(false);

  /* ── 포트폴리오 데이터 + config 동시 로드 ── */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true); setError(''); setIsPrivate(false);
      try {
        const [portfolioRes, configRes] = await Promise.allSettled([
          apiClient.get(`/portfolio/${profileName}`),
          apiClient.get(`/portfolio/${profileName}/config`),
        ]);

        if (cancelled) return;

        if (portfolioRes.status === 'fulfilled') {
          setData(portfolioRes.value.data);
          setFollowerCount(portfolioRes.value.data.followerCount ?? 0);
        } else {
          const err = portfolioRes.reason;
          if (err?.response?.status === 403) setIsPrivate(true);
          else if (err?.response?.status === 404) setError('포트폴리오를 찾을 수 없습니다.');
          else setError('불러오는데 실패했습니다.');
        }

        if (configRes.status === 'fulfilled') {
          const cfg = configRes.value.data;
          setTemplate(cfg?.template || 'EDITORIAL');
        }
        setConfigLoaded(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [profileName]);

  /* ── SEO 메타태그 동적 주입 ── */
  useEffect(() => {
    if (!data?.member) return;
    const member = data.member;
    const name = member.name || profileName;
    const specialties = member.specialties
      ? member.specialties.split(',').map(s => s.trim()).filter(Boolean)
      : [];
    const specialtyText = specialties.length > 0 ? ` · ${specialties.join(' · ')}` : '';
    const title = `${name} — 포트폴리오${specialtyText} | Happiness`;
    const description = member.bio
      ? member.bio.slice(0, 120)
      : `${name}의 사진 포트폴리오${specialtyText}`;
    const ogImage = member.coverUrl || (data.photos?.[0]?.thumbnailUrl) || '';
    const ogUrl = window.location.href;

    const prev = {
      title: document.title,
      desc:  document.querySelector('meta[name="description"]')?.getAttribute('content') || '',
    };

    document.title = title;
    const setMeta = (sel, attr, val) => {
      let el = document.querySelector(sel);
      if (!el) { el = document.createElement('meta'); document.head.appendChild(el); }
      el.setAttribute(attr, val);
    };

    setMeta('meta[name="description"]',         'content', description);
    setMeta('meta[property="og:title"]',         'content', title);
    setMeta('meta[property="og:description"]',   'content', description);
    setMeta('meta[property="og:url"]',           'content', ogUrl);
    if (ogImage) setMeta('meta[property="og:image"]', 'content', ogImage);
    setMeta('meta[property="og:type"]',          'content', 'profile');

    return () => {
      document.title = prev.title || 'Happiness';
      const descEl = document.querySelector('meta[name="description"]');
      if (descEl) descEl.setAttribute('content', prev.desc);
    };
  }, [data, profileName]);

  /* ── 팔로우 여부 ── */
  useEffect(() => {
    if (!data?.member?.id || !user?.id || user.id === data.member.id) return;
    followApi.isFollowing(user.id, data.member.id)
      .then(res => setFollowing(res?.data?.following ?? res?.following ?? false))
      .catch(() => {});
  }, [data?.member?.id, user?.id]);

  const handleFollow = async () => {
    if (!user?.id || !data?.member?.id) return;
    const memberId = data.member.id;
    setFollowLoading(true);
    const prev = following;
    setFollowing(!prev);
    setFollowerCount(c => c + (prev ? -1 : 1));
    try {
      if (prev) await followApi.unfollow(user.id, memberId);
      else await followApi.follow(user.id, memberId);
    } catch {
      setFollowing(prev);
      setFollowerCount(c => c + (prev ? 1 : -1));
    } finally { setFollowLoading(false); }
  };

  const handleOpenFollowModal = async (type) => {
    if (!data?.member?.id) return;
    setFollowModal(type); setFollowModalMembers([]); setLoadingModal(true);
    try {
      const res = type === 'followers'
        ? await followApi.getFollowers(data.member.id)
        : await followApi.getFollowing(data.member.id);
      const list = res?.data ?? res ?? [];
      setFollowModalMembers(Array.isArray(list) ? list : []);
    } catch { setFollowModalMembers([]); }
    finally { setLoadingModal(false); }
  };

  /* ── 로딩 ── */
  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0e0e0e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid #1e1e3a', borderTopColor: '#5b6ef5', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (isPrivate) return (
    <div style={{ minHeight: '100vh', background: '#0e0e0e', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <div style={{ fontSize: 48 }}>🔒</div>
      <div style={{ color: '#eeeeff', fontSize: 18, fontWeight: 700 }}>비공개 포트폴리오</div>
      <div style={{ color: '#6060a0', fontSize: 14 }}>이 작가의 포트폴리오는 비공개 상태입니다.</div>
      <button onClick={() => navigate(-1)} style={{ padding: '10px 24px', borderRadius: 10, border: 'none', background: '#5b6ef5', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>돌아가기</button>
    </div>
  );

  if (error) return (
    <div style={{ minHeight: '100vh', background: '#0e0e0e', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <div style={{ fontSize: 48 }}>✦</div>
      <div style={{ color: '#9090b0', fontSize: 16 }}>{error}</div>
      <button onClick={() => navigate('/login')} style={{ padding: '10px 24px', borderRadius: 10, border: 'none', background: '#5b6ef5', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>로그인하기</button>
    </div>
  );

  const {
    member, photos = [], photoCount = 0, series = [],
    followingCount = 0, totalLikes = 0,
  } = data || {};

  const isOwnPage = user?.id === member?.id;

  /* ── 공통 props ── */
  const sharedProps = {
    member,
    photos,
    series,
    profileName: member?.profileName || profileName,
    isOwnPage,
  };

  /* ── 템플릿 분기 렌더링 ── */
  const renderTemplate = () => {
    switch (template) {
      case 'SCRL':
        return <TemplateScrl {...sharedProps} />;

      case 'MINIMAL':
        return <TemplateMinimal {...sharedProps} />;

      case 'DARK_ROOM':
        return <TemplateDarkRoom {...sharedProps} />;

      case 'FILM':
      case 'SPLIT':
      case 'MOSAIC':
      case 'MAGAZINE':
        // 준비 중 — 에디토리얼로 표시 + 안내
        return (
          <div>
            <div style={{
              background: '#1a1a2e', borderBottom: '1px solid rgba(255,255,255,0.08)',
              padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.08em' }}>
                {template} 템플릿은 준비 중입니다. 에디토리얼 레이아웃으로 표시합니다.
              </div>
            </div>
            <TemplateEditorial
              {...sharedProps}
              photoCount={photoCount}
              followerCount={followerCount}
              followingCount={followingCount}
              totalLikes={totalLikes}
              following={!isOwnPage && user?.id ? following : undefined}
              followLoading={followLoading}
              onFollow={!isOwnPage && user?.id ? handleFollow : null}
              onOpenFollowModal={handleOpenFollowModal}
            />
          </div>
        );

      case 'EDITORIAL':
      default:
        return (
          <TemplateEditorial
            {...sharedProps}
            photoCount={photoCount}
            followerCount={followerCount}
            followingCount={followingCount}
            totalLikes={totalLikes}
            following={!isOwnPage && user?.id ? following : undefined}
            followLoading={followLoading}
            onFollow={!isOwnPage && user?.id ? handleFollow : null}
            onOpenFollowModal={handleOpenFollowModal}
          />
        );
    }
  };

  return (
    <>
      {renderTemplate()}

      {/* 팔로워/팔로잉 모달 */}
      {followModal && (
        <FollowListModal
          title={followModal === 'followers' ? `팔로워 ${followerCount}명` : `팔로잉 ${followingCount}명`}
          members={followModalMembers}
          loading={loadingModal}
          onClose={() => setFollowModal(null)}
        />
      )}
    </>
  );
}
