import React, { useState } from 'react';
import {
  Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { COLORS } from '../constants/colors';
import { RADIUS, SPACING, FONT } from '../constants/layout';

export default function PostDetailScreen({ post, liked, onBack, onLike, onShare, onCommentSubmit }) {
  const [comment, setComment] = useState('');

  if (!post) return null;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TouchableOpacity onPress={onBack} style={styles.backBtn}>
        <Text style={styles.backText}>← 탐색으로</Text>
      </TouchableOpacity>

      <Image source={{ uri: post.image }} style={styles.image} />

      <View style={styles.authorRow}>
        <Image source={{ uri: post.author.profileImage }} style={styles.avatar} />
        <View>
          <Text style={styles.authorName}>{post.author.name}</Text>
          <Text style={styles.authorId}>@{post.author.id}</Text>
        </View>
      </View>

      <Text style={styles.title}>{post.title}</Text>
      <Text style={styles.description}>{post.description}</Text>

      <View style={styles.tagRow}>
        {post.tags.map(tag => (
          <Text key={tag} style={styles.tag}>#{tag}</Text>
        ))}
      </View>

      <View style={styles.statsRow}>
        {[
          { num: post.likes,    label: '좋아요' },
          { num: post.comments, label: '댓글' },
          { num: post.views,    label: '조회' },
        ].map(({ num, label }) => (
          <View key={label} style={styles.stat}>
            <Text style={styles.statNumber}>{num.toLocaleString()}</Text>
            <Text style={styles.statLabel}>{label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.btn, liked ? styles.btnLiked : styles.btnPrimary]}
          onPress={onLike}
        >
          <Text style={styles.btnText}>{liked ? '💗 좋아요 취소' : '♡ 좋아요'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, styles.btnShare]} onPress={onShare}>
          <Text style={styles.btnText}>↗ 공유</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.commentSection}>
        <Text style={styles.commentTitle}>댓글</Text>
        <TextInput
          style={styles.commentInput}
          placeholder="댓글을 입력하세요..."
          placeholderTextColor={COLORS.textHint}
          value={comment}
          onChangeText={setComment}
          multiline
        />
        <TouchableOpacity
          style={[styles.btn, styles.btnPrimary, styles.btnFull]}
          onPress={() => { onCommentSubmit(comment); setComment(''); }}
        >
          <Text style={styles.btnText}>댓글 작성</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: SPACING.lg, paddingBottom: 40 },
  backBtn: { marginBottom: SPACING.md },
  backText: { color: COLORS.primary, fontWeight: '600', fontSize: FONT.md },
  image: { width: '100%', height: 260, borderRadius: RADIUS.xl, marginBottom: SPACING.lg },

  authorRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  avatar: { width: 40, height: 40, borderRadius: 20, marginRight: SPACING.sm + 2 },
  authorName: { fontWeight: '700', fontSize: FONT.base, color: COLORS.textPrimary },
  authorId: { color: COLORS.textHint, fontSize: FONT.sm },

  title: { fontSize: FONT.xxl, fontWeight: '800', marginBottom: SPACING.sm, color: COLORS.textPrimary },
  description: { color: COLORS.textSecondary, lineHeight: 22, marginBottom: SPACING.sm },

  tagRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: SPACING.lg },
  tag: {
    backgroundColor: COLORS.tagBg, color: COLORS.tagText,
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 20, marginRight: 6, marginBottom: 6, fontSize: FONT.sm,
  },

  statsRow: {
    flexDirection: 'row', justifyContent: 'space-around',
    backgroundColor: COLORS.statsBg, borderRadius: RADIUS.lg,
    padding: 14, marginBottom: SPACING.lg,
  },
  stat: { alignItems: 'center' },
  statNumber: { fontSize: FONT.xl, fontWeight: '800', color: COLORS.textPrimary },
  statLabel: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },

  actionRow: { flexDirection: 'row', marginBottom: SPACING.sm },
  btn: { flex: 1, marginHorizontal: 4, paddingVertical: 14, borderRadius: RADIUS.lg, alignItems: 'center' },
  btnFull: { flex: 0, marginHorizontal: 0 },
  btnPrimary: { backgroundColor: COLORS.primary },
  btnLiked: { backgroundColor: COLORS.liked },
  btnShare: { backgroundColor: COLORS.share },
  btnText: { color: COLORS.white, fontWeight: '700' },

  commentSection: { marginTop: SPACING.lg },
  commentTitle: { fontSize: FONT.lg, fontWeight: '700', marginBottom: SPACING.sm, color: COLORS.textPrimary },
  commentInput: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md,
    padding: SPACING.md, color: COLORS.textPrimary, backgroundColor: COLORS.statsBg,
    height: 80, textAlignVertical: 'top', marginBottom: SPACING.sm,
  },
});
