import apiClient from './apiClient';

export const commentApi = {
  getComments: (photoId) =>
    apiClient.get(`/photos/${photoId}/comments`).then(r => r.data),

  addComment:  (photoId, memberId, content, parentId = null) =>
    apiClient.post(`/photos/${photoId}/comments`, { memberId, content, parentId }).then(r => r.data),

  deleteComment: (commentId) =>
    apiClient.delete(`/comments/${commentId}`).then(r => r.data),
};
