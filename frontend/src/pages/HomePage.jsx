import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { showToast } from '../components/common/Toast';
import PostCard from '../components/posts/PostCard';
import Modal from '../components/common/Modal';
import Button from '../components/common/Button';
import { mockPosts } from '../data/mockData';
import './HomePage.css';

const HomePage = () => {
  const { isAuthenticated } = useAuth();
  const [posts, setPosts] = useState(mockPosts);
  const [selectedPost, setSelectedPost] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [likedPosts, setLikedPosts] = useState(new Set());

  const handlePostClick = (post) => {
    setSelectedPost(post);
    setShowDetailModal(true);
  };

  const handleLike = (e) => {
    e.stopPropagation();
    
    if (!isAuthenticated) {
      showToast('좋아요를 누르려면 로그인이 필요합니다.', 'warning');
      return;
    }

    if (likedPosts.has(selectedPost.id)) {
      likedPosts.delete(selectedPost.id);
      showToast('좋아요를 취소했습니다.', 'info');
    } else {
      likedPosts.add(selectedPost.id);
      showToast('좋아요를 눌렀습니다.', 'success');
    }

    setLikedPosts(new Set(likedPosts));
  };

  const handleShare = () => {
    showToast(`"${selectedPost.title}" 공유했습니다!`, 'success');
  };

  return (
    <div className="home-page">
      <div className="home-hero">
        <div className="home-hero-content">
          <h1 className="home-title">PhotoShare</h1>
          <p className="home-subtitle">
            세상의 아름다움을 사진으로 공유하세요
          </p>
        </div>
      </div>

      <div className="home-container">
        <h2 className="home-section-title">인기 게시물</h2>
        
        <div className="posts-grid">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onPostClick={handlePostClick}
              isAuthenticated={isAuthenticated}
            />
          ))}
        </div>
      </div>

      {/* 게시물 상세 모달 */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        size="lg"
        closeButton
      >
        {selectedPost && (
          <div className="post-detail">
            <img src={selectedPost.image} alt={selectedPost.title} className="detail-image" />

            <div className="detail-content">
              <h2 className="detail-title">{selectedPost.title}</h2>

              <div className="detail-author">
                <img
                  src={selectedPost.author.profileImage}
                  alt={selectedPost.author.name}
                  className="detail-author-avatar"
                />
                <div>
                  <p className="detail-author-name">{selectedPost.author.name}</p>
                  <p className="detail-author-info">@{selectedPost.author.id}</p>
                </div>
              </div>

              <p className="detail-description">{selectedPost.description}</p>

              <div className="detail-tags">
                {selectedPost.tags.map((tag) => (
                  <span key={tag} className="detail-tag">
                    #{tag}
                  </span>
                ))}
              </div>

              <div className="detail-stats">
                <div className="detail-stat">
                  <span className="stat-number">{selectedPost.likes}</span>
                  <span className="stat-label">좋아요</span>
                </div>
                <div className="detail-stat">
                  <span className="stat-number">{selectedPost.comments}</span>
                  <span className="stat-label">댓글</span>
                </div>
                <div className="detail-stat">
                  <span className="stat-number">{selectedPost.views}</span>
                  <span className="stat-label">조회</span>
                </div>
              </div>

              <div className="detail-actions">
                <Button
                  variant="primary"
                  onClick={handleLike}
                  className="action-btn"
                >
                  {likedPosts.has(selectedPost.id) ? '❤️ 좋아요 취소' : '🤍 좋아요'}
                </Button>
                <Button
                  variant="secondary"
                  onClick={handleShare}
                  className="action-btn"
                >
                  🔗 공유
                </Button>
              </div>

              {isAuthenticated && (
                <div className="detail-comment-section">
                  <h3 className="comment-title">댓글</h3>
                  <textarea
                    className="comment-input"
                    placeholder="댓글을 입력하세요..."
                  />
                  <Button variant="primary" fullWidth>
                    댓글 작성
                  </Button>
                </div>
              )}

              {!isAuthenticated && (
                <div className="detail-login-prompt">
                  <p>댓글을 작성하려면 로그인이 필요합니다.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default HomePage;
