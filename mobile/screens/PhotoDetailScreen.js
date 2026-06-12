import React, { useEffect, useState, useCallback } from 'react';
import {
  Alert, Image, KeyboardAvoidingView, Platform, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View, ActivityIndicator,
} from 'react-native';
import { photoApi, commentApi } from '../services/api';
import { useAuth } from '../store/AuthContext';
import { COLORS, MOOD_COLORS } from '../constants/colors';
import { RADIUS, SPACING, FONT } from '../constants/layout';

export default function PhotoDetailScreen({ navigation, route }) {
  const { photo: initialPhoto } = route.params;
  const { user } = useAuth();
  const [photo, setPhoto] = useState(initialPhoto);
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [loadingComments, setLoadingComments] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const loadComments = useCallback(async () => {
    try {
      const res = await commentApi.getComments(photo.id);
      setComments(res.data || res || []);
    } catch {
      // 댓글 로딩 실패는 조용히 무시
    } finally {
      setLoadingComments(false);
    }
  }, [photo.id]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  const handleLike = async () => {
    if (!user) { Alert.alert('알림', '로그인이 필요합니다.'); return; }
    try {
      if (liked) {
        await photoApi.unlikePhoto(photo.id, user.id);
        setPhoto(p => ({ ...p, likesCount: (p.likesCount || 1) - 1 }));
      } else {
        await photoApi.likePhoto(photo.id, user.id);
        setPhoto(p => ({ ...p, likesCount: (p.likesCount || 0) + 1 }));
      }
      setLiked(v => !v);
    } catch { Alert.alert('오류', '서버와 연결할 수 없습니다.'); }
  };

  const handleSave = async () => {
    if (!user) { Alert.alert('알림', '로그인이 필요합니다.'); return; }
    try {
      if (saved) {
        await photoApi.unsavePhoto(photo.id, user.id);
      } else {
        await photoApi.savePhoto(photo.id, user.id);
      }
      setSaved(v => !v);
    } catch { Alert.alert('오류', '서버와 연결할 수 없습니다.'); }
  };

  const handleDelete = () => {
    Alert.alert('삭제 확인', '이 사진을 삭제하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제', style: 'destructive',
        onPress: async () => {
          try {
            await photoApi.remove(photo.id);
            navigation.goBack();
          } catch { Alert.alert('오류', '서버와 연결할 수 없습니다.'); }
        },
      },
    ]);
  };

  const handleSubmitComment = async () => {
    if (!commentText.trim()) return;
    if (!user) { Alert.alert('알림', '로그인이 필요합니다.'); return; }
    setSubmitting(true);
    try {
      await commentApi.addComment(photo.id, user.id, commentText.trim(), replyTo?.id || null);
      setCommentText('');
      setReplyTo(null);
      await loadComments();
    } catch { Alert.alert('오류', '댓글 등록에 실패했습니다.'); }
    finally { setSubmitting(false); }
  };

  const handleDeleteComment = (commentId) => {
    Alert.alert('삭제', '댓글을 삭제하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제', style: 'destructive',
        onPress: async () => {
          try {
            await commentApi.deleteComment(commentId);
            await loadComments();
          } catch { Alert.alert('오류', '댓글 삭제에 실패했습니다.'); }
        },
      },
    ]);
  };

  const isOwner = user && photo.memberId === user.id;
  const mood = photo.colorMood && MOOD_COLORS[photo.colorMood];

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* 뒤로가기 */}
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← 뒤로</Text>
        </TouchableOpacity>

        {/* 이미지 */}
        <Image source={{ uri: photo.imageUrl }} style={styles.image} resizeMode="cover" />

        {/* 무드 뱃지 */}
        {mood && (
          <View style={[styles.moodBadge, { backgroundColor: mood.bg }]}>
            <View style={[styles.moodDot, { backgroundColor: mood.dot }]} />
            <Text style={[styles.moodLabel, { color: mood.dot }]}>{mood.label}</Text>
          </View>
        )}

        <Text style={styles.title}>{photo.title}</Text>
        {photo.description ? (
          <Text style={styles.description}>{photo.description}</Text>
        ) : null}
        {photo.createdAt && (
          <Text style={styles.meta}>{new Date(photo.createdAt).toLocaleDateString('ko-KR')}</Text>
        )}

        {/* EXIF 정보 */}
        {(photo.cameraModel || photo.aperture || photo.shutterSpeed || photo.iso) && (
          <View style={styles.exifRow}>
            {photo.cameraModel && <Text style={styles.exifItem}>📷 {photo.cameraModel}</Text>}
            {photo.aperture && <Text style={styles.exifItem}>f/{photo.aperture}</Text>}
            {photo.shutterSpeed && <Text style={styles.exifItem}>{photo.shutterSpeed}s</Text>}
            {photo.iso && <Text style={styles.exifItem}>ISO {photo.iso}</Text>}
          </View>
        )}

        {/* 태그 */}
        {photo.tags && photo.tags.length > 0 && (
          <View style={styles.tagRow}>
            {photo.tags.map(t => (
              <View key={t.tag} style={styles.tag}>
                <Text style={styles.tagText}>#{t.tag}</Text>
              </View>
            ))}
          </View>
        )}

        {/* 액션 버튼 */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={[styles.btn, liked ? styles.btnLiked : styles.btnLike]} onPress={handleLike}>
            <Text style={styles.btnText}>{liked ? '💗' : '🤍'} {photo.likesCount || 0}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, saved ? styles.btnSaved : styles.btnSave]} onPress={handleSave}>
            <Text style={styles.btnText}>{saved ? '⭐' : '☆'} 저장</Text>
          </TouchableOpacity>
        </View>

        {isOwner && (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.btn, styles.btnEdit]}
              onPress={() => navigation.navigate('PhotoForm', { mode: 'edit', photo })}
            >
              <Text style={styles.btnText}>✏️ 수정</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.btnDelete]} onPress={handleDelete}>
              <Text style={styles.btnText}>🗑 삭제</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 댓글 섹션 */}
        <Text style={styles.commentTitle}>댓글 {comments.length > 0 ? `(${comments.length})` : ''}</Text>

        {loadingComments ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 16 }} />
        ) : comments.length === 0 ? (
          <Text style={styles.emptyComment}>첫 번째 댓글을 남겨보세요.</Text>
        ) : (
          comments.map(c => (
            <View key={c.id} style={styles.commentItem}>
              <View style={styles.commentHeader}>
                <View style={styles.commentAvatar}>
                  <Text style={styles.commentAvatarText}>
                    {(c.memberName || '?')[0].toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.commentName}>{c.memberName}</Text>
                  <Text style={styles.commentDate}>
                    {new Date(c.createdAt).toLocaleDateString('ko-KR')}
                  </Text>
                </View>
                {user && c.memberId === user.id && (
                  <TouchableOpacity onPress={() => handleDeleteComment(c.id)}>
                    <Text style={styles.deleteBtn}>삭제</Text>
                  </TouchableOpacity>
                )}
              </View>
              <Text style={styles.commentContent}>{c.content}</Text>
              <TouchableOpacity onPress={() => setReplyTo(c)}>
                <Text style={styles.replyBtn}>답글</Text>
              </TouchableOpacity>

              {/* 대댓글 */}
              {c.replies && c.replies.map(r => (
                <View key={r.id} style={styles.replyItem}>
                  <View style={styles.commentAvatar}>
                    <Text style={styles.commentAvatarText}>{(r.memberName || '?')[0].toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.commentName}>{r.memberName}</Text>
                    <Text style={styles.commentContent}>{r.content}</Text>
                  </View>
                  {user && r.memberId === user.id && (
                    <TouchableOpacity onPress={() => handleDeleteComment(r.id)}>
                      <Text style={styles.deleteBtn}>삭제</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>
          ))
        )}

        {/* 댓글 입력 */}
        {replyTo && (
          <View style={styles.replyIndicator}>
            <Text style={styles.replyIndicatorText}>↩ {replyTo.memberName}에게 답글 중</Text>
            <TouchableOpacity onPress={() => setReplyTo(null)}>
              <Text style={styles.cancelReply}>✕</Text>
            </TouchableOpacity>
          </View>
        )}
        <View style={styles.commentInput}>
          <TextInput
            style={styles.input}
            placeholder={replyTo ? '답글을 입력하세요...' : '댓글을 입력하세요...'}
            placeholderTextColor={COLORS.textHint}
            value={commentText}
            onChangeText={setCommentText}
            multiline
          />
          <TouchableOpacity
            style={[styles.submitBtn, (!commentText.trim() || submitting) && styles.submitBtnDisabled]}
            onPress={handleSubmitComment}
            disabled={!commentText.trim() || submitting}
          >
            {submitting
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={styles.submitText}>등록</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  backBtn: { padding: SPACING.md },
  backText: { color: COLORS.primary, fontWeight: '600', fontSize: FONT.md },
  image: { width: '100%', height: 300, backgroundColor: '#000' },
  moodBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
    marginHorizontal: SPACING.lg, marginTop: SPACING.md,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  moodDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  moodLabel: { fontSize: FONT.xs, fontWeight: '700' },
  title: { fontSize: FONT.xxl, fontWeight: '800', color: COLORS.textPrimary,
    marginHorizontal: SPACING.lg, marginTop: SPACING.md },
  description: { color: COLORS.textSecondary, lineHeight: 22,
    marginHorizontal: SPACING.lg, marginTop: SPACING.sm },
  meta: { color: COLORS.textHint, marginHorizontal: SPACING.lg, marginTop: 4, fontSize: FONT.sm },
  exifRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8,
    marginHorizontal: SPACING.lg, marginTop: SPACING.md },
  exifItem: { backgroundColor: '#f0f0f8', paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 8, fontSize: FONT.xs, color: COLORS.textSecondary },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6,
    marginHorizontal: SPACING.lg, marginTop: SPACING.sm },
  tag: { backgroundColor: COLORS.tagBg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  tagText: { color: COLORS.tagText, fontSize: FONT.xs, fontWeight: '600' },
  actionRow: { flexDirection: 'row', marginHorizontal: SPACING.lg, marginTop: SPACING.md, gap: 8 },
  btn: { flex: 1, paddingVertical: 12, borderRadius: RADIUS.lg, alignItems: 'center' },
  btnLike:   { backgroundColor: '#f5f5ff', borderWidth: 1, borderColor: COLORS.border },
  btnLiked:  { backgroundColor: '#fce4f3' },
  btnSave:   { backgroundColor: '#f5f5ff', borderWidth: 1, borderColor: COLORS.border },
  btnSaved:  { backgroundColor: '#fff8e0' },
  btnEdit:   { backgroundColor: COLORS.primary },
  btnDelete: { backgroundColor: COLORS.danger },
  btnText: { fontWeight: '700', color: COLORS.textPrimary },
  commentTitle: { fontSize: FONT.lg, fontWeight: '700', color: COLORS.textPrimary,
    marginHorizontal: SPACING.lg, marginTop: 28, marginBottom: SPACING.md },
  emptyComment: { color: COLORS.textHint, textAlign: 'center', marginVertical: 16, fontSize: FONT.sm },
  commentItem: { marginHorizontal: SPACING.lg, marginBottom: SPACING.md,
    backgroundColor: COLORS.white, borderRadius: RADIUS.card, padding: SPACING.md,
    borderWidth: 1, borderColor: COLORS.border },
  commentHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 },
  commentAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  commentAvatarText: { color: '#fff', fontWeight: '700', fontSize: FONT.sm },
  commentName: { fontWeight: '700', color: COLORS.textPrimary, fontSize: FONT.sm },
  commentDate: { color: COLORS.textHint, fontSize: 11 },
  commentContent: { color: COLORS.textSecondary, lineHeight: 20, marginTop: 4 },
  replyBtn: { color: COLORS.primary, fontSize: FONT.xs, fontWeight: '600', marginTop: 6 },
  deleteBtn: { color: COLORS.danger, fontSize: FONT.xs, fontWeight: '600' },
  replyItem: { flexDirection: 'row', marginTop: SPACING.sm, paddingLeft: SPACING.md,
    borderLeftWidth: 2, borderLeftColor: COLORS.border },
  replyIndicator: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginHorizontal: SPACING.lg, marginTop: SPACING.sm,
    backgroundColor: '#eef0ff', borderRadius: RADIUS.md, padding: SPACING.sm },
  replyIndicatorText: { color: COLORS.primary, fontSize: FONT.sm, fontWeight: '600' },
  cancelReply: { color: COLORS.textMuted, fontWeight: '700', paddingHorizontal: 8 },
  commentInput: { flexDirection: 'row', alignItems: 'flex-end',
    marginHorizontal: SPACING.lg, marginTop: SPACING.md, gap: 8 },
  input: { flex: 1, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md,
    padding: SPACING.sm, backgroundColor: COLORS.white, color: COLORS.textPrimary,
    maxHeight: 100, fontSize: FONT.base },
  submitBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: RADIUS.md, minWidth: 52, alignItems: 'center' },
  submitBtnDisabled: { backgroundColor: COLORS.textHint },
  submitText: { color: '#fff', fontWeight: '700', fontSize: FONT.sm },
});
