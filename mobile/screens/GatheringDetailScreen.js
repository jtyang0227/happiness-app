import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, Image, Platform,
  ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { gatheringApi } from '../src/api/gatheringApi';
import { useAuth } from '../store/AuthContext';
import { COLORS } from '../constants/colors';
import { FONT, RADIUS, SPACING } from '../constants/layout';

const STATUS_STYLE = {
  RECRUITING:         { label: '모집중',    bg: 'rgba(0,196,113,0.12)',  color: '#00C471' },
  RECRUITMENT_CLOSED: { label: '모집마감',  bg: 'rgba(255,184,0,0.12)',  color: '#E6A800' },
  SCHEDULED:          { label: '진행예정',  bg: 'rgba(49,130,246,0.12)', color: COLORS.primary },
  ONGOING:            { label: '진행중',    bg: 'rgba(168,85,247,0.12)', color: '#A855F7' },
  ENDED:              { label: '종료',      bg: 'rgba(144,144,176,0.15)', color: COLORS.textMuted },
};

function pad(n) { return String(n).padStart(2, '0'); }
function formatDateTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function relativeTime(dateStr) {
  if (!dateStr) return '';
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60) return '방금';
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  return `${Math.floor(diff / 86400)}일 전`;
}

// ── 모임 정보 카드 ────────────────────────────────────────────────────
function GatheringInfoCard({ gathering }) {
  const statusStyle = STATUS_STYLE[gathering.status] || STATUS_STYLE.RECRUITING;
  return (
    <View style={styles.infoCard}>
      {gathering.thumbnailUrl ? (
        <Image source={{ uri: gathering.thumbnailUrl }} style={styles.coverImage} />
      ) : (
        <View style={[styles.coverImage, styles.coverPlaceholder]}>
          <Text style={styles.coverIcon}>📷</Text>
        </View>
      )}
      <View style={styles.infoBody}>
        <View style={styles.infoTopRow}>
          <View style={[styles.badge, { backgroundColor: statusStyle.bg }]}>
            <Text style={[styles.badgeText, { color: statusStyle.color }]}>{statusStyle.label}</Text>
          </View>
        </View>
        <Text style={styles.infoTitle}>{gathering.title}</Text>
        {gathering.description ? (
          <Text style={styles.infoDesc} numberOfLines={3}>{gathering.description}</Text>
        ) : null}
        <View style={styles.infoMetaList}>
          <Text style={styles.infoMeta}>📍 {gathering.location}</Text>
          <Text style={styles.infoMeta}>🗓 {formatDateTime(gathering.startDateTime)}</Text>
          {gathering.endDateTime && (
            <Text style={styles.infoMeta}>    ~ {formatDateTime(gathering.endDateTime)}</Text>
          )}
          <Text style={styles.infoMeta}>
            👥 참여자 {gathering.participantCount}/{gathering.maxParticipants}명
            {gathering.waitingCount > 0 ? ` (대기 ${gathering.waitingCount}명)` : ''}
          </Text>
          {gathering.fee && <Text style={styles.infoMeta}>💰 {gathering.fee}</Text>}
          {gathering.hashtags && (
            <Text style={styles.infoHashtags}>{gathering.hashtags}</Text>
          )}
        </View>
      </View>
    </View>
  );
}

// ── 참여 버튼 (RECRUITING) ────────────────────────────────────────────
function ParticipationBar({ gatheringId, myStatus, onStatusChange }) {
  const [loading, setLoading] = useState(false);
  const isParticipating = myStatus === 'PARTICIPATING' || myStatus === 'WAITING';

  const handleRespond = async (status) => {
    const confirmMsg = status === 'PARTICIPATING'
      ? '이 모임에 참여 신청할까요?'
      : '참여 신청을 취소할까요?';
    Alert.alert(
      status === 'PARTICIPATING' ? '참여 신청' : '참여 취소',
      confirmMsg,
      [
        { text: '아니오', style: 'cancel' },
        {
          text: '예',
          onPress: async () => {
            setLoading(true);
            try {
              if (status === 'NOT_PARTICIPATING') {
                await gatheringApi.cancelParticipation(gatheringId);
                onStatusChange('CANCELLED');
              } else {
                const res = await gatheringApi.respond(gatheringId, status);
                // 정원 초과 시 서버가 WAITING 반환
                const resultStatus = res?.status || status;
                if (resultStatus === 'WAITING') {
                  Alert.alert('대기자 등록', '정원이 꽉 찼어요. 대기자로 등록되었습니다. 자리가 생기면 자동으로 참여 확정돼요.');
                }
                onStatusChange(resultStatus);
              }
            } catch (e) {
              Alert.alert('오류', e.response?.data?.message || '요청에 실패했습니다. 다시 시도해주세요.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  if (myStatus === 'CANCELLED' || myStatus === null) {
    return (
      <View style={styles.participationBar}>
        <TouchableOpacity
          style={[styles.participateBtn, loading && styles.btnDisabled]}
          onPress={() => handleRespond('PARTICIPATING')}
          disabled={loading}
        >
          {loading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.participateBtnText}>참여 신청하기 ✓</Text>}
        </TouchableOpacity>
      </View>
    );
  }

  if (isParticipating) {
    return (
      <View style={styles.participationBar}>
        <View style={styles.participatingLabel}>
          <Text style={styles.participatingText}>
            {myStatus === 'WAITING' ? '⏳ 대기자로 등록되어 있어요.' : '✓ 참여 신청 완료'}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.cancelBtn, loading && styles.btnDisabled]}
          onPress={() => handleRespond('NOT_PARTICIPATING')}
          disabled={loading}
        >
          <Text style={styles.cancelBtnText}>취소</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return null;
}

// ── 피드 게시물 카드 ──────────────────────────────────────────────────
function PostCard({ post, gatheringId, myStatus, navigation }) {
  const hasPhotos = post.photos && post.photos.length > 0;
  const canShare = hasPhotos && (myStatus === 'PARTICIPATING' || myStatus === 'WAITING');

  return (
    <View style={styles.postCard}>
      {/* 작성자 정보 */}
      <View style={styles.postAuthorRow}>
        <View style={styles.postAvatar}>
          {post.memberAvatarUrl ? (
            <Image source={{ uri: post.memberAvatarUrl }} style={styles.postAvatarImg} />
          ) : (
            <Text style={styles.postAvatarText}>{(post.memberName || '?').charAt(0)}</Text>
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.postAuthorName}>{post.memberName}</Text>
          <Text style={styles.postTime}>{relativeTime(post.createdAt)}</Text>
        </View>
        {canShare && (
          <TouchableOpacity
            style={styles.igShareBtn}
            onPress={() => navigation.navigate('GatheringInstagramShare', {
              gatheringId: gatheringId,
              photoUrl: post.photos[0].imageUrl,
              postId: post.id,
            })}
          >
            <Text style={styles.igShareBtnText}>📷 공유</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* 내용 */}
      {post.content ? <Text style={styles.postContent}>{post.content}</Text> : null}
      {post.hashtags ? <Text style={styles.postHashtags}>{post.hashtags}</Text> : null}

      {/* 사진들 (가로 스크롤) */}
      {hasPhotos && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.photoScrollWrap}
          contentContainerStyle={styles.photoScrollContent}
        >
          {post.photos.map((photo) => (
            <Image key={photo.id} source={{ uri: photo.imageUrl }} style={styles.postPhoto} />
          ))}
        </ScrollView>
      )}

      {/* 좋아요 / 댓글 수 (읽기 전용) */}
      <View style={styles.postMetaRow}>
        <Text style={styles.postMetaText}>❤️ {post.likeCount || 0}</Text>
        <Text style={styles.postMetaText}>💬 {post.commentCount || 0}</Text>
      </View>
    </View>
  );
}

// ── 마감/예정 상태 배너 ────────────────────────────────────────────────
function StatusBanner({ status }) {
  if (status === 'RECRUITMENT_CLOSED') {
    return (
      <View style={[styles.statusBanner, { backgroundColor: 'rgba(255,184,0,0.10)' }]}>
        <Text style={[styles.statusBannerText, { color: '#E6A800' }]}>
          모집이 마감되었어요. 모임 시작을 기다려주세요.
        </Text>
      </View>
    );
  }
  if (status === 'SCHEDULED') {
    return (
      <View style={[styles.statusBanner, { backgroundColor: 'rgba(49,130,246,0.10)' }]}>
        <Text style={[styles.statusBannerText, { color: COLORS.primary }]}>
          모집이 완료됐어요! 모임 날짜를 기다려주세요.
        </Text>
      </View>
    );
  }
  return null;
}

// ── 메인 스크린 ───────────────────────────────────────────────────────
export default function GatheringDetailScreen({ route, navigation }) {
  const { gatheringId } = route.params;
  const { user } = useAuth();

  const [gathering, setGathering] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [feed, setFeed] = useState([]);
  const [feedLoading, setFeedLoading] = useState(false);
  const [feedPage, setFeedPage] = useState(0);
  const [feedHasMore, setFeedHasMore] = useState(true);

  // 내 참여 상태를 로컬 state로 추적 (별도 조회 엔드포인트 없음)
  const [myStatus, setMyStatus] = useState(null); // null = unknown

  const load = useCallback(async () => {
    setLoading(true); setError(false);
    try {
      const res = await gatheringApi.getDetail(gatheringId);
      const g = res?.data || res;
      setGathering(g);

      if (g.status === 'ONGOING' || g.status === 'ENDED') {
        loadFeed(g, 0, true);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [gatheringId]);

  const loadFeed = useCallback(async (g, page, reset = false) => {
    if (!g && !gathering) return;
    setFeedLoading(true);
    try {
      const res = await gatheringApi.getFeed(gatheringId, page, 20);
      const items = res?.content || res?.data?.content || (Array.isArray(res) ? res : []);
      setFeed(prev => reset ? items : [...prev, ...items]);
      setFeedHasMore(items.length === 20);
      setFeedPage(page);
    } catch {
      // 400: 아직 ONGOING/ENDED가 아닌 경우 — 무음 처리
    } finally {
      setFeedLoading(false);
    }
  }, [gatheringId, gathering]);

  useEffect(() => { load(); }, [load]);

  const handleLoadMoreFeed = () => {
    if (feedLoading || !feedHasMore || !gathering) return;
    loadFeed(gathering, feedPage + 1);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (error || !gathering) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>모임 정보를 불러오지 못했어요.</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={load}>
          <Text style={styles.retryBtnText}>다시 시도</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isOngoingOrEnded = gathering.status === 'ONGOING' || gathering.status === 'ENDED';
  const isRecruiting = gathering.status === 'RECRUITING';

  const renderFeedItem = ({ item }) => (
    <PostCard
      post={item}
      gatheringId={gatheringId}
      myStatus={myStatus}
      navigation={navigation}
    />
  );

  return (
    <FlatList
      style={styles.container}
      data={isOngoingOrEnded ? feed : []}
      keyExtractor={(item) => String(item.id)}
      renderItem={renderFeedItem}
      onEndReached={handleLoadMoreFeed}
      onEndReachedThreshold={0.3}
      contentContainerStyle={styles.listContent}
      ListHeaderComponent={
        <>
          {/* 모임 정보 카드 */}
          <GatheringInfoCard gathering={gathering} />

          {/* 참여 신청 바 (모집중) */}
          {isRecruiting && user && (
            <ParticipationBar
              gatheringId={gatheringId}
              myStatus={myStatus}
              onStatusChange={setMyStatus}
            />
          )}

          {/* 마감/예정 배너 */}
          <StatusBanner status={gathering.status} />

          {/* 피드 섹션 헤더 */}
          {isOngoingOrEnded && (
            <View style={styles.feedHeader}>
              <Text style={styles.feedHeaderTitle}>
                {gathering.status === 'ENDED' ? '📸 모임 피드' : '📸 실시간 피드'}
              </Text>
              {!user && (
                <Text style={styles.feedLoginHint}>공유하려면 로그인하세요.</Text>
              )}
            </View>
          )}

          {feedLoading && feed.length === 0 && (
            <View style={styles.feedLoadingWrap}>
              <ActivityIndicator size="small" color={COLORS.primary} />
            </View>
          )}
        </>
      }
      ListEmptyComponent={
        isOngoingOrEnded && !feedLoading ? (
          <View style={styles.feedEmpty}>
            <Text style={styles.feedEmptyIcon}>🌅</Text>
            <Text style={styles.feedEmptyText}>아직 게시물이 없어요.</Text>
          </View>
        ) : null
      }
      ListFooterComponent={
        feedLoading && feed.length > 0 ? (
          <ActivityIndicator size="small" color={COLORS.primary} style={styles.footerLoader} />
        ) : null
      }
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  listContent: {
    paddingBottom: 80,
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.bg,
    gap: 12,
  },
  errorText: {
    fontSize: FONT.base,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: 8,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  retryBtnText: {
    color: '#fff',
    fontWeight: '700',
  },

  // Info Card
  infoCard: {
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginBottom: SPACING.md,
  },
  coverImage: {
    width: '100%',
    height: 200,
  },
  coverPlaceholder: {
    backgroundColor: COLORS.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverIcon: {
    fontSize: 52,
  },
  infoBody: {
    padding: SPACING.lg,
  },
  infoTopRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  infoTitle: {
    fontSize: FONT.xl,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  infoDesc: {
    fontSize: FONT.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  infoMetaList: {
    gap: 5,
  },
  infoMeta: {
    fontSize: FONT.sm,
    color: COLORS.textSecondary,
  },
  infoHashtags: {
    fontSize: FONT.sm,
    color: COLORS.primary,
    marginTop: 4,
  },

  // Participation Bar
  participationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    borderRadius: RADIUS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    gap: 10,
  },
  participateBtn: {
    flex: 1,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: 12,
    alignItems: 'center',
  },
  participateBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: FONT.base,
  },
  participatingLabel: {
    flex: 1,
  },
  participatingText: {
    fontSize: FONT.sm,
    color: '#00C471',
    fontWeight: '600',
  },
  cancelBtn: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  cancelBtnText: {
    fontSize: FONT.sm,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  btnDisabled: {
    opacity: 0.6,
  },

  // Status Banner
  statusBanner: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
  },
  statusBannerText: {
    fontSize: FONT.sm,
    fontWeight: '600',
    textAlign: 'center',
  },

  // Feed
  feedHeader: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.bg,
  },
  feedHeaderTitle: {
    fontSize: FONT.md,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  feedLoginHint: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  feedLoadingWrap: {
    padding: SPACING.xl,
    alignItems: 'center',
  },
  feedEmpty: {
    padding: SPACING.xl,
    alignItems: 'center',
  },
  feedEmptyIcon: {
    fontSize: 40,
    marginBottom: 10,
  },
  feedEmptyText: {
    fontSize: FONT.md,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  footerLoader: {
    padding: SPACING.lg,
  },

  // Post Card
  postCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: SPACING.md,
    marginBottom: 10,
    borderRadius: RADIUS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  postAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    gap: 10,
  },
  postAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  postAvatarImg: {
    width: 36,
    height: 36,
  },
  postAvatarText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  postAuthorName: {
    fontSize: FONT.sm,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  postTime: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  igShareBtn: {
    backgroundColor: 'rgba(168,85,247,0.10)',
    borderRadius: RADIUS.sm,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.25)',
  },
  igShareBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#A855F7',
  },
  postContent: {
    fontSize: FONT.sm,
    color: COLORS.textPrimary,
    lineHeight: 20,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  postHashtags: {
    fontSize: 12,
    color: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  photoScrollWrap: {
    marginBottom: SPACING.sm,
  },
  photoScrollContent: {
    paddingHorizontal: SPACING.md,
    gap: 8,
  },
  postPhoto: {
    width: 200,
    height: 200,
    borderRadius: RADIUS.md,
  },
  postMetaRow: {
    flexDirection: 'row',
    gap: 16,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  postMetaText: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
});
