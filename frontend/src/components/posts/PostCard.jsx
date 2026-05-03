import React from 'react';
import './PostCard.css';

/**
 * 게시물 카드 컴포넌트 (피드 목록용)
 */
const PostCard = ({ post, onPostClick, isAuthenticated }) => {
  const formatDate = (date) => {
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) return `${minutes}분 전`;
    if (hours < 24) return `${hours}시간 전`;
    if (days < 7) return `${days}일 전`;
    return date.toLocaleDateString('ko-KR');
  };

  return (
    <div className="post-card" onClick={() => onPostClick(post)}>
      <div className="post-image-container">
        <img src={post.image} alt={post.title} className="post-image" />
        <div className="post-overlay">
          <div className="post-stats">
            <span className="stat">❤️ {post.likes}</span>
            <span className="stat">💬 {post.comments}</span>
            <span className="stat">👁️ {post.views}</span>
          </div>
        </div>
      </div>

      <div className="post-content">
        <h3 className="post-title">{post.title}</h3>
        <p className="post-description">{post.description}</p>

        <div className="post-tags">
          {post.tags.slice(0, 2).map((tag) => (
            <span key={tag} className="post-tag">
              #{tag}
            </span>
          ))}
        </div>

        <div className="post-footer">
          <div className="post-author">
            <img
              src={post.author.profileImage}
              alt={post.author.name}
              className="author-avatar"
            />
            <div>
              <p className="author-name">{post.author.name}</p>
              <p className="post-time">{formatDate(post.createdAt)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostCard;
