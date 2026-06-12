import apiClient from './apiClient';

export const followApi = {
  follow:      (followerId, followingId) =>
    apiClient.post('/follows', null, { params: { followerId, followingId } }).then(r => r.data),

  unfollow:    (followerId, followingId) =>
    apiClient.delete('/follows', { params: { followerId, followingId } }).then(r => r.data),

  isFollowing: (followerId, followingId) =>
    apiClient.get('/follows/check', { params: { followerId, followingId } }).then(r => r.data),

  getCount:    (memberId) =>
    apiClient.get('/follows/count', { params: { memberId } }).then(r => r.data),

  getFollowers:  (memberId) =>
    apiClient.get('/follows/followers', { params: { memberId } }).then(r => r.data),

  getFollowing:  (memberId) =>
    apiClient.get('/follows/following', { params: { memberId } }).then(r => r.data),
};
