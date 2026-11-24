import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { COLORS } from '../constants/colors';
import { moodboardApi } from '../services/moodboardApi';
import Button from '../components/common/Button';
import DotEmptyState from '../components/common/DotEmptyState';

/**
 * 무드보드 상세 (/boards/:id, 본인 전용) — 담긴 사진 그리드, 이름 바꾸기, 사진 빼기, 보드 삭제(이중 확인),
 * 보기 전용 공유 링크(/b/:token) 켜기·복사·끄기(이중 확인). WORK_QUEUE 5 / Behance Moodboard·Cosmos 공개 클러스터 재해석.
 */

function SharePanel({ boardId, token, onChange }) {
  const [busy, setBusy] = useState(false);
  const [confirmOff, setConfirmOff] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const url = token ? `${window.location.origin}/b/${token}` : '';

  const toggle = async (enabled) => {
    setBusy(true);
    setError('');
    try {
      const res = await moodboardApi.setShare(boardId, enabled);
      onChange(res.shareToken ?? null);
      setConfirmOff(false);
    } catch (err) {
      setError(err?.response?.data?.message || (enabled ? '링크를 만들지 못했어요.' : '링크를 끄지 못했어요.'));
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setError('복사하지 못했어요. 링크를 직접 선택해 복사해 주세요.');
    }
  };

  if (!token) {
    return (
      <div style={{ marginBottom: 20 }}>
        <Button size="sm" variant="secondary" loading={busy} onClick={() => toggle(true)}>
          {busy ? '만드는 중' : '🔗 공유 링크 만들기'}
        </Button>
        <span style={{ marginLeft: 10, fontSize: 12, color: COLORS.textMuted }}>링크가 있는 사람은 로그인 없이 볼 수만 있어요.</span>
        {error && <div role="alert" style={{ color: COLORS.danger, fontSize: 13, marginTop: 8 }}>{error}</div>}
      </div>
    );
  }
  return (
    <div style={{ marginBottom: 20, padding: 12, borderRadius: 12, background: COLORS.surface, border: `1px solid ${COLORS.border}` }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.text, marginBottom: 8 }}>🔗 보기 전용 공유 링크</div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <input readOnly value={url} aria-label="공유 링크" onFocus={e => e.target.select()}
          style={{ flex: '1 1 240px', minWidth: 0, fontSize: 13, padding: '8px 10px', borderRadius: 8, border: `1px solid ${COLORS.border}`,
            background: COLORS.bg, color: COLORS.textSecondary, outline: 'none' }} />
        <Button size="sm" onClick={copy}>{copied ? '복사했어요' : '복사'}</Button>
        {confirmOff ? (
          <>
            <Button size="sm" variant="danger" loading={busy} onClick={() => toggle(false)}>{busy ? '끄는 중' : '정말 끄기'}</Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirmOff(false)}>취소</Button>
          </>
        ) : (
          <Button size="sm" variant="ghost" onClick={() => setConfirmOff(true)} style={{ color: COLORS.danger }}>링크 끄기</Button>
        )}
      </div>
      {confirmOff && <p role="alert" style={{ margin: '8px 0 0', fontSize: 12, color: COLORS.danger }}>이전 링크로는 더 이상 볼 수 없어요.</p>}
      {error && <div role="alert" style={{ color: COLORS.danger, fontSize: 13, marginTop: 8 }}>{error}</div>}
    </div>
  );
}
export default function MoodboardPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [board, setBoard] = useState(null);
  const [status, setStatus] = useState('loading');   // loading | ready | notfound | error
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    setStatus('loading');
    moodboardApi.get(id)
      .then(b => { if (alive) { setBoard(b); setName(b.name); setStatus('ready'); } })
      .catch(err => { if (alive) setStatus(err?.response?.status === 404 ? 'notfound' : 'error'); });
    return () => { alive = false; };
  }, [id]);

  const saveName = async (e) => {
    e.preventDefault();
    if (!name.trim() || saving) return;
    setSaving(true);
    setError('');
    try {
      const res = await moodboardApi.rename(id, name.trim());
      setBoard(b => ({ ...b, name: res.name }));
      setEditing(false);
    } catch (err) {
      setError(err?.response?.data?.message || '이름을 바꾸지 못했어요.');
    } finally {
      setSaving(false);
    }
  };

  const removePhoto = async (photoId) => {
    const prev = board.photos;
    setBoard(b => ({ ...b, photos: b.photos.filter(p => p.id !== photoId) }));
    try {
      await moodboardApi.removePhoto(id, photoId);
    } catch {
      setBoard(b => ({ ...b, photos: prev }));
      setError('사진을 빼지 못했어요. 다시 시도해 주세요.');
    }
  };

  const deleteBoard = async () => {
    setDeleting(true);
    try {
      await moodboardApi.remove(id);
      navigate('/profile', { replace: true });
    } catch {
      setDeleting(false);
      setError('보드를 삭제하지 못했어요.');
    }
  };

  const wrap = (children) => (
    <div style={{ minHeight: '100vh', background: COLORS.bg }}>
      <div style={{ maxWidth: 1040, margin: '0 auto', padding: '28px 20px 64px' }}>{children}</div>
    </div>
  );

  if (status === 'loading') {
    return wrap(
      <div aria-hidden="true">
        <div style={{ width: 220, height: 28, borderRadius: 8, background: COLORS.border, marginBottom: 24, animation: 'pulse 1.4s ease-in-out infinite' }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8 }}>
          {Array.from({ length: 8 }).map((_, i) => <div key={i} style={{ aspectRatio: '1', borderRadius: 8, background: COLORS.border, animation: 'pulse 1.4s ease-in-out infinite' }} />)}
        </div>
      </div>
    );
  }
  if (status !== 'ready') {
    return wrap(
      <DotEmptyState icon="📌" theme="light"
        title={status === 'notfound' ? '보드를 찾을 수 없어요' : '보드를 불러오지 못했어요'}
        description={status === 'notfound' ? '삭제됐거나 내 보드가 아니에요.' : '잠시 후 다시 시도해 주세요.'}
        actionLabel="프로필로 돌아가기" onAction={() => navigate('/profile')} />
    );
  }

  return wrap(
    <>
      <style>{`
        .board-photo .board-photo-remove { opacity: 0; transition: opacity 0.15s ease; }
        .board-photo:hover .board-photo-remove, .board-photo-remove:focus-visible { opacity: 1; }
        @media (hover: none) { .board-photo .board-photo-remove { opacity: 1; } }
        .board-photo-remove:focus-visible { outline: 2px solid ${COLORS.primary}; outline-offset: 2px; }
      `}</style>
      <Link to="/profile" style={{ fontSize: 13, color: COLORS.textMuted, textDecoration: 'none' }}>‹ 프로필 · 저장함</Link>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', margin: '12px 0 20px' }}>
        {editing ? (
          <form onSubmit={saveName} style={{ display: 'flex', gap: 8, flex: 1, minWidth: 240 }}>
            <input value={name} onChange={e => setName(e.target.value)} maxLength={50} autoFocus aria-label="보드 이름"
              style={{ flex: 1, fontSize: 20, fontWeight: 800, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: '6px 12px', color: COLORS.text, outline: 'none' }} />
            <Button type="submit" size="sm" loading={saving} disabled={!name.trim()}>{saving ? '저장 중' : '저장'}</Button>
            <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setName(board.name); }}>취소</Button>
          </form>
        ) : (
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: COLORS.text, wordBreak: 'keep-all' }}>
            📌 {board.name} <span style={{ fontSize: 15, fontWeight: 600, color: COLORS.textMuted }}>{board.photos.length}장</span>
          </h1>
        )}
        {!editing && (
          <div style={{ display: 'flex', gap: 8 }}>
            <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>이름 바꾸기</Button>
            {confirmDelete ? (
              <>
                <Button size="sm" variant="danger" loading={deleting} onClick={deleteBoard}>{deleting ? '삭제 중' : '정말 삭제'}</Button>
                <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)}>취소</Button>
              </>
            ) : (
              <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(true)} style={{ color: COLORS.danger }}>보드 삭제</Button>
            )}
          </div>
        )}
      </div>
      {confirmDelete && (
        <p role="alert" style={{ margin: '-8px 0 16px', fontSize: 13, color: COLORS.danger }}>
          보드만 삭제되고 사진은 그대로 남아요. 되돌릴 수 없어요.
        </p>
      )}
      {error && <div role="alert" style={{ color: COLORS.danger, fontSize: 13, marginBottom: 12 }}>{error}</div>}

      <SharePanel boardId={board.id} token={board.shareToken} onChange={t => setBoard(b => ({ ...b, shareToken: t }))} />

      {board.photos.length === 0 ? (
        <DotEmptyState icon="📌" theme="light" title="아직 담은 사진이 없어요"
          description="사진 상세에서 '보드에 담기'를 눌러 이 보드에 모아 보세요."
          actionLabel="사진 둘러보기" onAction={() => navigate('/explore')} />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8 }}>
          {board.photos.map(p => (
            <div key={p.id} className="board-photo" style={{ position: 'relative', aspectRatio: '1', borderRadius: 8, overflow: 'hidden', background: COLORS.border }}>
              <Link to={`/photo/${p.id}`} aria-label={p.title || '사진 보기'}>
                <img src={p.thumbnailUrl || p.imageUrl} alt={p.title || '보드 사진'}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              </Link>
              <button type="button" className="board-photo-remove" onClick={() => removePhoto(p.id)}
                aria-label={`${p.title || '사진'} 보드에서 빼기`}
                style={{ position: 'absolute', top: 6, right: 6, width: 28, height: 28, borderRadius: '50%', border: 'none',
                  background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: 13, cursor: 'pointer' }}>✕</button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
