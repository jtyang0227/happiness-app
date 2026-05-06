import React, { useState } from 'react';
import { mockPosts } from '../services/mockData';
import { COLORS } from '../constants/colors';

function PostCard({ post }) {
  const [liked, setLiked] = useState(false);

  return (
    <div
      style={{
        background: COLORS.white,
        borderRadius: 16,
        overflow: 'hidden',
        boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
        transition: 'transform 0.2s, box-shadow 0.2s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 6px 24px rgba(0,0,0,0.12)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.07)';
      }}
    >
      {/* Image */}
      <div style={{ position: 'relative', aspectRatio: '4/3', overflow: 'hidden' }}>
        <img
          src={post.image}
          alt={post.title}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div style={{ position: 'absolute', bottom: 8, left: 8, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {post.tags.map(tag => (
              <span
                key={tag}
                style={{
                  background: 'rgba(0,0,0,0.55)',
                  color: '#fff',
                  fontSize: 10,
                  fontWeight: 600,
                  padding: '2px 7px',
                  borderRadius: 10,
                }}
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ padding: 14 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: COLORS.text, marginBottom: 6, lineHeight: 1.4 }}>
          {post.title}
        </h3>
        <p style={{ fontSize: 12, color: COLORS.textSecondary, lineHeight: 1.5, marginBottom: 10 }}>
          {post.description}
        </p>

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: `linear-gradient(135deg, ${COLORS.primary}, #a78bfa)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              {post.author.name.charAt(0)}
            </div>
            <span style={{ fontSize: 12, color: COLORS.textSecondary, fontWeight: 500 }}>
              {post.author.name}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={() => setLiked(prev => !prev)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                color: liked ? '#e53e3e' : COLORS.textMuted,
                fontSize: 12,
                fontWeight: 600,
                padding: 0,
                transition: 'color 0.15s',
              }}
            >
              {liked ? '♥' : '♡'} {post.likes + (liked ? 1 : 0)}
            </button>
            <span style={{ fontSize: 12, color: COLORS.textMuted }}>
              💬 {post.comments}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ExplorePage() {
  const [search, setSearch] = useState('');

  const filtered = mockPosts.filter(post =>
    !search.trim() ||
    post.title.includes(search) ||
    post.description.includes(search) ||
    post.tags.some(t => t.includes(search)) ||
    post.author.name.includes(search)
  );

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 20px' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: COLORS.text, marginBottom: 4 }}>탐색</h1>
        <p style={{ color: COLORS.textSecondary, fontSize: 14 }}>다양한 사진들을 둘러보세요</p>
      </div>

      {/* Search */}
      <div style={{ marginBottom: 24 }}>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="제목, 태그, 작가 검색..."
          style={{
            width: '100%',
            padding: '12px 16px',
            borderRadius: 12,
            border: `1.5px solid ${COLORS.border}`,
            background: COLORS.white,
            fontSize: 14,
            color: COLORS.text,
            outline: 'none',
            boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
          }}
        />
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', color: COLORS.textMuted, padding: '60px 0', fontSize: 15 }}>
          검색 결과가 없습니다.
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 16,
          }}
        >
          {filtered.map(post => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  );
}
