import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { COLORS } from '../../constants/colors';
import Button from '../common/Button';
import gatheringApi from '../../services/gatheringApi';

/** SNAPDAY 출사 스토리 모음(9:16 썸네일 가로 줄) + 스토리 만들기 진입 */
export default function StoryStrip({ gatheringId, user, canCreate }: { gatheringId: any; user: any; canCreate: boolean }) {
  const navigate = useNavigate();
  const [stories, setStories] = useState<any[] | null>(null);
  const [open, setOpen] = useState<any>(null);

  useEffect(() => {
    let alive = true;
    gatheringApi.getStories(gatheringId).then((s) => alive && setStories(s)).catch(() => alive && setStories([]));
    return () => { alive = false; };
  }, [gatheringId]);

  if (stories == null || (!canCreate && stories.length === 0)) return null;

  const remove = async (s: any) => {
    if (!window.confirm('이 스토리를 삭제할까요?')) return;
    try { await gatheringApi.deleteStory(s.id); setStories(stories.filter((x) => x.id !== s.id)); setOpen(null); } catch (e: any) { window.alert(e?.response?.data?.message || '삭제하지 못했어요.'); }
  };

  return (
    <section aria-labelledby="story-title" style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: 20, marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 12 }}>
        <h2 id="story-title" style={{ margin: 0, fontSize: 15, fontWeight: 700, color: COLORS.text }}>📱 출사 스토리 {stories.length ? stories.length : ''}</h2>
        {canCreate && <Button size="sm" onClick={() => navigate(`/gatherings/${gatheringId}/story`)}>스토리 만들기</Button>}
      </div>
      {stories.length === 0 ? (
        <p style={{ margin: 0, fontSize: 13, color: COLORS.textMuted }}>첫 스토리를 만들어 인스타그램에 공유해 보세요.</p>
      ) : (
        <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
          {stories.map((s) => (
            <button key={s.id} type="button" onClick={() => setOpen(s)} aria-label={`${s.memberName ?? '회원'}의 스토리`}
              style={{ flex: '0 0 auto', width: 90, padding: 0, border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left' }}>
              <img src={s.imageUrl} alt="" style={{ width: 90, height: 160, objectFit: 'cover', borderRadius: 12, background: COLORS.surfaceDim, display: 'block' }} />
              <span style={{ display: 'block', fontSize: 12, color: COLORS.textSecondary, marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.memberName}</span>
            </button>
          ))}
        </div>
      )}
      {open && (
        <div role="dialog" aria-modal="true" aria-label="스토리 보기" onClick={() => setOpen(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: 360, width: '100%' }}>
            <img src={open.imageUrl} alt={open.caption || '출사 스토리'} style={{ width: '100%', aspectRatio: '9 / 16', objectFit: 'contain', borderRadius: 16, background: COLORS.darkBg }} />
            <div style={{ color: '#fff', fontSize: 13, marginTop: 8 }}>
              {open.memberName}{open.caption ? ` · ${open.caption}` : ''}
              {open.taggedMembers?.length > 0 && <div style={{ color: COLORS.darkTextSub, marginTop: 4 }}>{open.taggedMembers.map((t: any) => (t.instagramId ? `@${t.instagramId}` : t.name)).join(' ')}</div>}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <Button size="sm" variant="secondary" onClick={() => setOpen(null)}>닫기</Button>
              {user && (user.id === open.memberId || user.authority === 'WM' || user.authority === 'SA') && <Button size="sm" variant="danger" onClick={() => remove(open)}>삭제</Button>}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
