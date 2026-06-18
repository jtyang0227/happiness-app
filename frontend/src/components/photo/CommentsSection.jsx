import React, { useState, useEffect } from 'react';
import { commentApi } from '../../services/api';
import { COLORS } from '../../constants/colors';

function formatTime(dateStr) {
  if (!dateStr) return '';
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60) return '방금';
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  return new Date(dateStr).toLocaleDateString('ko-KR');
}

function Avatar({ name, url, size = 28, theme }) {
  const isDark = theme === 'dark';
  if (url) {
    return (
      <img
        src={url}
        alt={name}
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
      />
    );
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: isDark ? '#3a3a6a' : COLORS.primary,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontSize: size * 0.42, fontWeight: 700,
    }}>
      {(name || '?').charAt(0).toUpperCase()}
    </div>
  );
}

export default function CommentsSection({ photoId, currentUser, theme = 'light' }) {
  const isDark = theme === 'dark';
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const c = isDark ? {
    text: '#e8e8f0',
    textSub: '#9090cc',
    textMuted: '#5555aa',
    border: 'rgba(255,255,255,0.08)',
    inputBg: 'rgba(255,255,255,0.06)',
    inputBorder: 'rgba(255,255,255,0.12)',
    surface: 'transparent',
  } : {
    text: COLORS.text,
    textSub: COLORS.textSecondary,
    textMuted: COLORS.textMuted,
    border: COLORS.border,
    inputBg: COLORS.bg,
    inputBorder: COLORS.border,
    surface: 'transparent',
  };

  const totalCount = comments.reduce((acc, cm) => acc + 1 + (cm.replies?.length ?? 0), 0);

  useEffect(() => {
    if (!photoId) return;
    commentApi.getComments(photoId)
      .then(res => setComments(res?.data ?? []))
      .catch(() => {});
  }, [photoId]);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    const text = commentText.trim();
    if (!text || !currentUser?.id) return;
    setSubmitting(true);
    try {
      const payload = {
        memberId: currentUser.id,
        memberName: currentUser.name || currentUser.email,
        memberAvatarUrl: currentUser.avatarUrl || null,
        content: text,
        parentId: replyTo?.id ?? null,
      };
      const res = await commentApi.addComment(photoId, payload);
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
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId, parentId) => {
    if (!window.confirm('댓글을 삭제하시겠습니까?')) return;
    try {
      await commentApi.deleteComment(commentId, currentUser.id);
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

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div>
      {/* 섹션 헤더 */}
      <div style={{ fontSize: 13, fontWeight: 700, color: c.textMuted, marginBottom: 14, letterSpacing: '0.02em' }}>
        댓글 {totalCount > 0 ? totalCount : 0}
      </div>

      {/* 빈 상태 */}
      {comments.length === 0 && (
        <div style={{ color: c.textMuted, fontSize: 13, textAlign: 'center', padding: '16px 0 20px' }}>
          아직 댓글이 없습니다. 첫 댓글을 남겨보세요! ✍️
        </div>
      )}

      {/* 댓글 목록 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 16 }}>
        {comments.map(comment => (
          <div key={comment.id}>
            {/* 댓글 */}
            <div style={{ display: 'flex', gap: 10 }}>
              <Avatar name={comment.memberName} url={comment.memberAvatarUrl} size={32} theme={theme} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: c.text }}>{comment.memberName}</span>
                  <span style={{ fontSize: 11, color: c.textMuted }}>{formatTime(comment.createdAt)}</span>
                  {currentUser?.id === comment.memberId && (
                    <button
                      onClick={() => handleDelete(comment.id, null)}
                      style={{ marginLeft: 'auto', fontSize: 11, color: COLORS.danger, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                    >
                      삭제
                    </button>
                  )}
                </div>
                <p style={{ fontSize: 14, color: c.textSub, margin: 0, lineHeight: 1.55 }}>{comment.content}</p>
                <button
                  onClick={() => setReplyTo(replyTo?.id === comment.id ? null : { id: comment.id, memberName: comment.memberName })}
                  style={{ fontSize: 11, color: COLORS.primary, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0 0', fontWeight: 600 }}
                >
                  {replyTo?.id === comment.id ? '취소' : '↩ 답글'}
                </button>
              </div>
            </div>

            {/* 대댓글 */}
            {(comment.replies || []).map(reply => (
              <div key={reply.id} style={{ display: 'flex', gap: 10, marginLeft: 42, marginTop: 10 }}>
                <Avatar name={reply.memberName} url={reply.memberAvatarUrl} size={24} theme={theme} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: c.text }}>{reply.memberName}</span>
                    <span style={{ fontSize: 11, color: c.textMuted }}>{formatTime(reply.createdAt)}</span>
                    {currentUser?.id === reply.memberId && (
                      <button
                        onClick={() => handleDelete(reply.id, comment.id)}
                        style={{ marginLeft: 'auto', fontSize: 11, color: COLORS.danger, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                      >
                        삭제
                      </button>
                    )}
                  </div>
                  <p style={{ fontSize: 13, color: c.textSub, margin: 0, lineHeight: 1.5 }}>{reply.content}</p>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* 답글 대상 표시 */}
      {replyTo && (
        <div style={{ fontSize: 12, color: COLORS.primary, marginBottom: 8, fontWeight: 600 }}>
          @{replyTo.memberName}에게 답글 작성 중 —{' '}
          <button
            onClick={() => setReplyTo(null)}
            style={{ background: 'none', border: 'none', color: c.textMuted, cursor: 'pointer', fontSize: 12 }}
          >
            취소
          </button>
        </div>
      )}

      {/* 댓글 입력 */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
        {currentUser && (
          <Avatar name={currentUser.name} url={currentUser.avatarUrl} size={32} theme={theme} />
        )}
        <textarea
          value={commentText}
          onChange={e => setCommentText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={currentUser ? (replyTo ? `@${replyTo.memberName}에게 답글...` : '댓글을 입력하세요...') : '로그인 후 댓글을 작성할 수 있습니다.'}
          disabled={!currentUser || submitting}
          rows={1}
          style={{
            flex: 1, padding: '9px 14px', borderRadius: 10,
            border: `1.5px solid ${c.inputBorder}`,
            background: c.inputBg, color: c.text,
            fontSize: 13, outline: 'none', resize: 'none',
            minHeight: 38, fontFamily: 'inherit', lineHeight: 1.5,
          }}
        />
        <button
          onClick={handleSubmit}
          disabled={!currentUser || !commentText.trim() || submitting}
          style={{
            padding: '9px 16px', borderRadius: 10,
            background: COLORS.primary, color: '#fff',
            border: 'none', fontWeight: 700, cursor: 'pointer',
            fontSize: 13, opacity: (!currentUser || !commentText.trim() || submitting) ? 0.5 : 1,
            flexShrink: 0, height: 38,
          }}
        >
          {submitting ? '...' : '등록'}
        </button>
      </div>
    </div>
  );
}
