import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { photoApi, commentApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { MOOD_COLORS, COLORS } from '../constants/colors';

// 보정값 요약 헬퍼
function buildAdjSummary(adj, effects) {
  const items = [];
  if (!adj && !effects) return items;
  const a = adj || {};
  const e = effects || {};
  const fmt = (v) => (v > 0 ? `+${v}` : `${v}`);
  if (a.exposure)   items.push(`노출 ${fmt(Number(a.exposure).toFixed(2))}`);
  if (a.contrast)   items.push(`대비 ${fmt(a.contrast)}`);
  if (a.highlights) items.push(`밝은영역 ${fmt(a.highlights)}`);
  if (a.shadows)    items.push(`어두운영역 ${fmt(a.shadows)}`);
  if (e.vignette)   items.push(`비네팅 ${fmt(e.vignette)}`);
  if (e.grainAmount) items.push(`그레인 ${e.grainAmount}`);
  if (e.clarity)    items.push(`부분대비 ${fmt(e.clarity)}`);
  return items;
}

export default function PhotoDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [photo, setPhoto] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [saved, setSaved] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [replyTo, setReplyTo] = useState(null); // { id, memberName }
  const [submittingComment, setSubmittingComment] = useState(false);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true); setError('');
      try {
        const res = await photoApi.getOne(id);
        if (!cancelled) {
          const found = res?.data ?? res;
          if (found) {
            setPhoto(found);
            setLikeCount(found.likeCount ?? 0);
          } else {
            setError('사진을 찾을 수 없습니다.');
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err?.response?.status === 404
            ? '사진을 찾을 수 없습니다.'
            : '사진을 불러오는데 실패했습니다.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  const handleLike = () => {
    const next = !liked;
    setLiked(next);
    setLikeCount(c => c + (next ? 1 : -1));
    if (user?.id) {
      if (next) photoApi.likePhoto(id, user.id).catch(() => {});
      else photoApi.unlikePhoto(id, user.id).catch(() => {});
    }
  };

  const handleSave = () => {
    const next = !saved;
    setSaved(next);
    if (user?.id) {
      if (next) photoApi.savePhoto(id, user.id).catch(() => {});
      else photoApi.unsavePhoto(id, user.id).catch(() => {});
    }
  };

  useEffect(() => {
    if (!id) return;
    commentApi.getComments(id).then(res => setComments(res?.data ?? [])).catch(() => {});
  }, [id]);

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!commentText.trim() || !user?.id) return;
    setSubmittingComment(true);
    try {
      const payload = {
        memberId: user.id,
        memberName: user.name || user.email,
        memberAvatarUrl: user.avatarUrl || null,
        content: commentText.trim(),
        parentId: replyTo?.id ?? null,
      };
      const res = await commentApi.addComment(id, payload);
      const newComment = res?.data ?? res;
      if (replyTo) {
        setComments(prev => prev.map(c =>
          c.id === replyTo.id
            ? { ...c, replies: [...(c.replies || []), newComment] }
            : c
        ));
      } else {
        setComments(prev => [...prev, { ...newComment, replies: [] }]);
      }
      setCommentText('');
      setReplyTo(null);
    } catch {
      // silently fail
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId, parentId) => {
    if (!window.confirm('댓글을 삭제하시겠습니까?')) return;
    try {
      await commentApi.deleteComment(commentId, user.id);
      if (parentId) {
        setComments(prev => prev.map(c =>
          c.id === parentId
            ? { ...c, replies: (c.replies || []).filter(r => r.id !== commentId) }
            : c
        ));
      } else {
        setComments(prev => prev.filter(c => c.id !== commentId));
      }
    } catch {
      // silently fail
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('이 사진을 삭제하시겠습니까?')) return;
    setDeleting(true);
    try {
      await photoApi.remove(id);
      navigate('/');
    } catch {
      alert('삭제에 실패했습니다.');
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div style={centerStyle}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          border: `3px solid ${COLORS.border}`,
          borderTopColor: COLORS.primary,
          animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error || !photo) {
    return (
      <div style={{ ...centerStyle, flexDirection: 'column', gap: 12 }}>
        <div style={{ color: COLORS.danger, fontSize: 16 }}>{error || '사진을 찾을 수 없습니다.'}</div>
        <button onClick={() => navigate('/')} style={primaryBtn}>갤러리로 돌아가기</button>
      </div>
    );
  }

  const mood = photo.colorMood && MOOD_COLORS[photo.colorMood];
  const authorName = photo.memberName || photo.member?.name || '익명';
  const createdAt = photo.createdAt ? new Date(photo.createdAt).toLocaleDateString('ko-KR') : '';
  const adjSummary = buildAdjSummary(photo.adjustments, photo.effects);
  const isOwner = user?.id && (photo.memberId === user.id || photo.member?.id === user.id);

  const imageSection = (
    <div style={{
      flex: isMobile ? 'none' : '0 0 58%',
      background: '#0e0e0e',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: isMobile ? 280 : '100%',
    }}>
      <img
        src={photo.imageUrl || photo.image}
        alt={photo.title}
        style={{
          maxWidth: '100%', maxHeight: isMobile ? 400 : '90vh',
          objectFit: 'contain', display: 'block',
        }}
      />
    </div>
  );

  const infoSection = (
    <div style={{
      flex: 1, padding: isMobile ? '20px 20px 32px' : '28px 28px',
      overflowY: 'auto', background: COLORS.surface,
    }}>
      {/* Author row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
          background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.accent})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontSize: 13, fontWeight: 700,
        }}>
          {authorName.charAt(0)}
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.text }}>{authorName}</div>
          {createdAt && <div style={{ fontSize: 12, color: COLORS.textMuted }}>{createdAt}</div>}
        </div>
        {isOwner && (
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
            <button onClick={() => navigate(`/photo/${id}/edit`)} style={miniBtn}>수정</button>
            <button onClick={handleDelete} disabled={deleting} style={{ ...miniBtn, color: COLORS.danger }}>
              {deleting ? '...' : '삭제'}
            </button>
          </div>
        )}
      </div>

      {/* Title */}
      <h1 style={{ fontSize: 20, fontWeight: 800, color: COLORS.text, marginBottom: 8, lineHeight: 1.3 }}>
        {photo.title || '제목 없음'}
      </h1>

      {/* Mood badge */}
      {mood && (
        <div style={{ marginBottom: 12 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            background: mood.bg, padding: '4px 12px', borderRadius: 20,
            fontSize: 12, fontWeight: 700,
          }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: mood.dot, display: 'inline-block' }} />
            {mood.label}
          </span>
        </div>
      )}

      {/* Description */}
      {photo.description && (
        <p style={{ fontSize: 14, color: COLORS.textSecondary, lineHeight: 1.7, marginBottom: 18 }}>
          {photo.description}
        </p>
      )}

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button onClick={handleLike} style={{
          flex: 1, padding: '10px', borderRadius: 10,
          border: `1.5px solid ${liked ? COLORS.danger : COLORS.border}`,
          background: liked ? '#fff0f0' : COLORS.surface,
          color: liked ? COLORS.danger : COLORS.textSecondary,
          cursor: 'pointer', fontWeight: 700, fontSize: 13,
          transition: 'all 0.15s',
        }}>
          {liked ? '♥' : '♡'} 좋아요 {likeCount > 0 && likeCount}
        </button>
        <button onClick={handleSave} style={{
          flex: 1, padding: '10px', borderRadius: 10,
          border: `1.5px solid ${saved ? COLORS.primary : COLORS.border}`,
          background: saved ? COLORS.primaryLight : COLORS.surface,
          color: saved ? COLORS.primary : COLORS.textSecondary,
          cursor: 'pointer', fontWeight: 700, fontSize: 13,
          transition: 'all 0.15s',
        }}>
          {saved ? '★' : '☆'} 저장 {photo.saveCount > 0 && photo.saveCount}
        </button>
      </div>

      {/* Tags */}
      {photo.tags && photo.tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 18 }}>
          {photo.tags.map(tag => (
            <span key={tag.id ?? tag} style={{
              padding: '3px 10px', borderRadius: 20,
              background: COLORS.bg, border: `1px solid ${COLORS.border}`,
              fontSize: 12, color: COLORS.textSecondary, fontWeight: 500,
            }}>
              #{tag.name ?? tag}
            </span>
          ))}
        </div>
      )}

      {/* Adjustment summary */}
      {adjSummary.length > 0 && (
        <div style={{
          background: '#12122a', borderRadius: 10, padding: '12px 14px',
          border: '1px solid #1e1e3a', marginBottom: 20,
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#6060a0', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
            보정 설정
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {adjSummary.map((item, i) => (
              <span key={i} style={{
                padding: '2px 8px', borderRadius: 6,
                background: '#1e1e3a', color: '#9090cc',
                fontSize: 11, fontWeight: 600,
              }}>
                {item}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 댓글 섹션 */}
      <div style={{ borderTop: `1px solid ${COLORS.border}`, paddingTop: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.textSecondary, marginBottom: 14 }}>
          댓글 {comments.length > 0 ? comments.reduce((acc, c) => acc + 1 + (c.replies?.length ?? 0), 0) : 0}
        </div>

        {/* 댓글 목록 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
          {comments.map(comment => (
            <div key={comment.id}>
              {/* 댓글 */}
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                  background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.accent})`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700, color: '#fff',
                }}>
                  {(comment.memberName || '?').charAt(0)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: COLORS.text }}>{comment.memberName}</span>
                    <span style={{ fontSize: 11, color: COLORS.textMuted }}>
                      {comment.createdAt ? new Date(comment.createdAt).toLocaleDateString('ko-KR') : ''}
                    </span>
                    {user?.id === comment.memberId && (
                      <button
                        onClick={() => handleDeleteComment(comment.id, null)}
                        style={{ marginLeft: 'auto', fontSize: 11, color: COLORS.danger, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                      >
                        삭제
                      </button>
                    )}
                  </div>
                  <p style={{ fontSize: 13, color: COLORS.textSecondary, margin: 0, lineHeight: 1.5 }}>{comment.content}</p>
                  <button
                    onClick={() => setReplyTo(replyTo?.id === comment.id ? null : { id: comment.id, memberName: comment.memberName })}
                    style={{ fontSize: 11, color: COLORS.primary, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0 0', fontWeight: 600 }}
                  >
                    {replyTo?.id === comment.id ? '취소' : '답글'}
                  </button>
                </div>
              </div>

              {/* 대댓글 */}
              {(comment.replies || []).map(reply => (
                <div key={reply.id} style={{ display: 'flex', gap: 10, marginLeft: 38, marginTop: 8 }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                    background: COLORS.border,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontWeight: 700, color: COLORS.textSecondary,
                  }}>
                    {(reply.memberName || '?').charAt(0)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: COLORS.text }}>{reply.memberName}</span>
                      <span style={{ fontSize: 11, color: COLORS.textMuted }}>
                        {reply.createdAt ? new Date(reply.createdAt).toLocaleDateString('ko-KR') : ''}
                      </span>
                      {user?.id === reply.memberId && (
                        <button
                          onClick={() => handleDeleteComment(reply.id, comment.id)}
                          style={{ marginLeft: 'auto', fontSize: 11, color: COLORS.danger, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                        >
                          삭제
                        </button>
                      )}
                    </div>
                    <p style={{ fontSize: 12, color: COLORS.textSecondary, margin: 0, lineHeight: 1.5 }}>{reply.content}</p>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* 댓글 입력 */}
        {replyTo && (
          <div style={{ fontSize: 12, color: COLORS.primary, marginBottom: 6, fontWeight: 600 }}>
            @{replyTo.memberName}에게 답글 작성 중 —{' '}
            <button onClick={() => setReplyTo(null)} style={{ background: 'none', border: 'none', color: COLORS.textMuted, cursor: 'pointer', fontSize: 12 }}>취소</button>
          </div>
        )}
        <form onSubmit={handleCommentSubmit} style={{ display: 'flex', gap: 8 }}>
          <input
            value={commentText}
            onChange={e => setCommentText(e.target.value)}
            placeholder={user ? '댓글을 입력하세요...' : '로그인 후 댓글을 작성할 수 있습니다.'}
            disabled={!user || submittingComment}
            style={{
              flex: 1, padding: '9px 14px', borderRadius: 10,
              border: `1.5px solid ${COLORS.border}`,
              background: COLORS.bg, color: COLORS.text,
              fontSize: 13, outline: 'none',
            }}
          />
          <button
            type="submit"
            disabled={!user || !commentText.trim() || submittingComment}
            style={{
              padding: '9px 16px', borderRadius: 10,
              background: COLORS.primary, color: '#fff',
              border: 'none', fontWeight: 700, cursor: 'pointer',
              fontSize: 13, opacity: (!user || !commentText.trim()) ? 0.5 : 1,
              flexShrink: 0,
            }}
          >
            등록
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: isMobile ? COLORS.bg : '#0e0e0e' }}>
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        style={{
          position: 'fixed', top: isMobile ? 12 : 18, left: 16, zIndex: 100,
          background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(8px)',
          border: 'none', borderRadius: 20, padding: '7px 14px',
          color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 5,
        }}
      >
        ← 뒤로가기
      </button>

      {isMobile ? (
        /* 모바일: 세로 스택 */
        <div style={{ paddingTop: 0 }}>
          {imageSection}
          {infoSection}
        </div>
      ) : (
        /* 데스크탑: 가로 분할 */
        <div style={{ display: 'flex', height: 'calc(100vh - 60px)', maxHeight: '92vh', marginTop: 60 }}>
          {imageSection}
          {infoSection}
        </div>
      )}
    </div>
  );
}

const centerStyle = {
  display: 'flex', justifyContent: 'center', alignItems: 'center',
  minHeight: '70vh',
};

const primaryBtn = {
  padding: '10px 20px', background: COLORS.primary, color: '#fff',
  border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600,
};

const miniBtn = {
  padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
  border: `1px solid ${COLORS.border}`, background: COLORS.surface,
  color: COLORS.textSecondary, cursor: 'pointer',
};
