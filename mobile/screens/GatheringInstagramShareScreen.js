/**
 * GatheringInstagramShareScreen
 *
 * Instagram Story 공유 흐름:
 * 1. 게시물 사진을 미리보기로 표시
 * 2. 템플릿 선택 (사진 중심 / 사진+참여자 / 사진+글)
 * 3. 참여자 핸들(@handle) 텍스트로 이미지에 합성 (실제 Instagram 멘션 아님)
 * 4. react-native-view-shot으로 합성 이미지 캡처
 * 5. react-native-share로 Instagram Stories 딥링크 호출
 *
 * ⚠️ 네이티브 전용 모듈 (react-native-view-shot, react-native-share):
 *    실제 Instagram 공유는 iOS/Android 실기기 + EAS 빌드에서만 동작합니다.
 *    웹 번들에는 포함되지만 공유 버튼은 Platform.OS 검사로 실행이 차단됩니다.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, Dimensions, Image, Platform,
  ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { gatheringApi } from '../src/api/gatheringApi';
import { COLORS } from '../constants/colors';
import { FONT, RADIUS, SPACING } from '../constants/layout';

// react-native-view-shot / react-native-share 는 네이티브 전용 모듈.
// 웹에서는 Metro의 플랫폼별 확장자 해석으로 instagramShare.web.js(no-op 스텁)가 대신
// 로드되므로 번들은 성공하고, 실제 실행은 아래 Platform.OS 검사로 차단됩니다.
// iOS/Android 실기기 + EAS 빌드에서만 실제 공유가 동작합니다.
import { captureRef, default as RNShare } from '../src/utils/instagramShare';

const TEMPLATES = [
  { key: 'PHOTO_ONLY',         label: '사진 중심',       desc: '사진만 공유' },
  { key: 'PHOTO_PARTICIPANTS', label: '사진+참여자',     desc: '사진 + 핸들 텍스트' },
  { key: 'PHOTO_TEXT',         label: '사진+글',         desc: '사진 + 글 텍스트' },
];

const { width: SCREEN_W } = Dimensions.get('window');
const PREVIEW_PADDING = SPACING.lg * 2;
const PREVIEW_W = SCREEN_W - PREVIEW_PADDING;
// 16:9 스토리 비율로 하면 너무 길어지므로 4:5(인스타그램 피드 비율)로 미리보기 표시
const PREVIEW_H = Math.round(PREVIEW_W * (5 / 4));

export default function GatheringInstagramShareScreen({ route, navigation }) {
  const { gatheringId, photoUrl, postId } = route.params;

  const previewRef = useRef(null);

  const [candidates, setCandidates] = useState([]);
  const [candidatesLoading, setCandidatesLoading] = useState(true);
  const [candidatesError, setCandidatesError] = useState(null);

  const [selectedTemplate, setSelectedTemplate] = useState('PHOTO_PARTICIPANTS');
  const [checkedIds, setCheckedIds] = useState(new Set());
  const [captionText, setCaptionText] = useState('');
  const [sharing, setSharing] = useState(false);

  // 참여자 후보 목록 불러오기
  const loadCandidates = useCallback(async () => {
    setCandidatesLoading(true);
    setCandidatesError(null);
    try {
      const res = await gatheringApi.getInstagramCandidates(gatheringId);
      const list = Array.isArray(res) ? res : (res?.data || []);
      setCandidates(list);
      // 기본값: 전체 체크
      setCheckedIds(new Set(list.map(c => c.memberId)));
    } catch (e) {
      const status = e?.response?.status;
      if (status === 403) {
        setCandidatesError('이 모임의 참여자만 Instagram 공유를 할 수 있어요.');
      } else {
        setCandidatesError('참여자 목록을 불러오지 못했어요.');
      }
    } finally {
      setCandidatesLoading(false);
    }
  }, [gatheringId]);

  useEffect(() => { loadCandidates(); }, [loadCandidates]);

  const toggleCandidate = (memberId) => {
    setCheckedIds(prev => {
      const next = new Set(prev);
      if (next.has(memberId)) next.delete(memberId);
      else next.add(memberId);
      return next;
    });
  };

  // 미리보기에 표시할 텍스트 (체크된 참여자의 @handle)
  const overlayHandles = candidates
    .filter(c => checkedIds.has(c.memberId) && c.instagramId)
    .map(c => `@${c.instagramId}`)
    .join('  ');

  const handleShare = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('알림', 'Instagram 공유는 모바일 앱에서만 지원됩니다.');
      return;
    }
    setSharing(true);
    try {
      // 1. 미리보기 뷰를 이미지로 캡처
      const uri = await captureRef(previewRef, { format: 'png', quality: 0.9 });
      const fileUri = uri.startsWith('file://') ? uri : 'file://' + uri;

      // 2. 서버에 공유 이력 로그 (fire-and-forget — 실패해도 공유는 진행)
      gatheringApi.shareToInstagram(gatheringId, {
        gatheringPostId: postId || undefined,
        template: selectedTemplate,
        captionText: captionText.trim() || undefined,
        taggedMemberIds: Array.from(checkedIds),
      }).catch(() => {});

      // 3. Instagram Stories 딥링크 호출
      await RNShare.shareSingle({
        social: RNShare.Social.INSTAGRAM_STORIES,
        backgroundImage: fileUri,
        // Android는 Facebook App ID가 필요할 수 있습니다.
        // appId: 'YOUR_FACEBOOK_APP_ID',
      });
    } catch (err) {
      // Instagram 미설치, 사용자 취소, 권한 거부 등 모든 오류 처리
      Alert.alert(
        'Instagram 공유 실패',
        'Instagram 앱이 설치되어 있지 않습니다. 사진을 저장 후 Instagram에서 직접 공유해보세요.',
        [{ text: '확인' }]
      );
    } finally {
      setSharing(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">

      {/* ── 미리보기 ───────────────────────────────────────────────── */}
      <Text style={styles.sectionLabel}>미리보기</Text>
      <View
        ref={previewRef}
        style={styles.previewContainer}
        collapsable={false}
      >
        <Image
          source={{ uri: photoUrl }}
          style={styles.previewImage}
          resizeMode="cover"
        />

        {/* PHOTO_PARTICIPANTS 오버레이: 참여자 핸들 */}
        {selectedTemplate === 'PHOTO_PARTICIPANTS' && overlayHandles.length > 0 && (
          <View style={styles.overlayBottom}>
            <Text style={styles.overlayHandlesText}>{overlayHandles}</Text>
          </View>
        )}

        {/* PHOTO_TEXT 오버레이: 글 텍스트 */}
        {selectedTemplate === 'PHOTO_TEXT' && captionText.trim().length > 0 && (
          <View style={styles.overlayBottom}>
            <Text style={styles.overlayCaptionText}>{captionText}</Text>
          </View>
        )}
      </View>

      {/* ── 템플릿 선택 ─────────────────────────────────────────────── */}
      <Text style={styles.sectionLabel}>템플릿</Text>
      <View style={styles.templateRow}>
        {TEMPLATES.map(t => (
          <TouchableOpacity
            key={t.key}
            style={[styles.templateCard, selectedTemplate === t.key && styles.templateCardActive]}
            onPress={() => setSelectedTemplate(t.key)}
            activeOpacity={0.8}
          >
            <Text style={[styles.templateLabel, selectedTemplate === t.key && styles.templateLabelActive]}>
              {t.label}
            </Text>
            <Text style={[styles.templateDesc, selectedTemplate === t.key && styles.templateDescActive]}>
              {t.desc}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── 참여자 태그 (PHOTO_PARTICIPANTS만 표시) ───────────────── */}
      {selectedTemplate === 'PHOTO_PARTICIPANTS' && (
        <>
          <Text style={styles.sectionLabel}>참여자 태그</Text>
          <View style={styles.mentionNotice}>
            <Text style={styles.mentionNoticeText}>
              ⚠️ 이 핸들은 사진 위에 텍스트로 합성됩니다. 실제 Instagram 멘션(@태그)이 아니에요 — 공유 후 Instagram 앱에서 직접 멘션을 추가하세요.
            </Text>
          </View>

          {candidatesLoading ? (
            <ActivityIndicator size="small" color={COLORS.primary} style={styles.loader} />
          ) : candidatesError ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorBoxText}>{candidatesError}</Text>
              {!candidatesError.includes('참여자만') && (
                <TouchableOpacity onPress={loadCandidates} style={styles.retrySmallBtn}>
                  <Text style={styles.retrySmallText}>다시 시도</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : candidates.length === 0 ? (
            <Text style={styles.emptyCandidates}>
              인스타그램 아이디를 등록한 참여자가 없어요.
            </Text>
          ) : (
            <View style={styles.candidateList}>
              {candidates.map(c => (
                <TouchableOpacity
                  key={c.memberId}
                  style={styles.candidateRow}
                  onPress={() => toggleCandidate(c.memberId)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.checkbox, checkedIds.has(c.memberId) && styles.checkboxChecked]}>
                    {checkedIds.has(c.memberId) && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <View style={styles.candidateAvatar}>
                    {c.avatarUrl ? (
                      <Image source={{ uri: c.avatarUrl }} style={styles.candidateAvatarImg} />
                    ) : (
                      <Text style={styles.candidateAvatarText}>{(c.name || '?').charAt(0)}</Text>
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.candidateName}>{c.name}</Text>
                    <Text style={styles.candidateHandle}>@{c.instagramId}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </>
      )}

      {/* ── 글 내용 (PHOTO_TEXT만 표시) ─────────────────────────── */}
      {selectedTemplate === 'PHOTO_TEXT' && (
        <>
          <Text style={styles.sectionLabel}>글 내용</Text>
          <TextInput
            style={styles.captionInput}
            value={captionText}
            onChangeText={setCaptionText}
            placeholder="이미지에 표시할 글을 입력하세요..."
            placeholderTextColor={COLORS.textHint}
            multiline
            maxLength={200}
          />
          <Text style={styles.captionCounter}>{captionText.length}/200</Text>
        </>
      )}

      {/* ── 안내 문구 ────────────────────────────────────────────── */}
      <View style={styles.tipBox}>
        <Text style={styles.tipText}>
          💡 공유 후 Instagram 앱에서 실제 멘션·음악을 추가할 수 있어요.
        </Text>
      </View>

      {/* ── 공유 버튼 ────────────────────────────────────────────── */}
      <TouchableOpacity
        style={[styles.shareBtn, sharing && styles.shareBtnDisabled]}
        onPress={handleShare}
        disabled={sharing}
        activeOpacity={0.85}
      >
        {sharing ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.shareBtnText}>Instagram Story 공유 📤</Text>
        )}
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  scrollContent: {
    padding: SPACING.lg,
  },
  sectionLabel: {
    fontSize: FONT.sm,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  loader: {
    marginVertical: SPACING.md,
  },

  // Preview
  previewContainer: {
    width: PREVIEW_W,
    height: PREVIEW_H,
    borderRadius: RADIUS.card,
    overflow: 'hidden',
    backgroundColor: '#000',
    alignSelf: 'center',
  },
  previewImage: {
    width: PREVIEW_W,
    height: PREVIEW_H,
  },
  overlayBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: SPACING.md,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  overlayHandlesText: {
    color: '#fff',
    fontSize: FONT.sm,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  overlayCaptionText: {
    color: '#fff',
    fontSize: FONT.base,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 22,
  },

  // Template
  templateRow: {
    flexDirection: 'row',
    gap: 8,
  },
  templateCard: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    alignItems: 'center',
    backgroundColor: COLORS.white,
  },
  templateCardActive: {
    borderColor: '#A855F7',
    backgroundColor: 'rgba(168,85,247,0.06)',
  },
  templateLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  templateLabelActive: {
    color: '#A855F7',
  },
  templateDesc: {
    fontSize: 10,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 2,
  },
  templateDescActive: {
    color: 'rgba(168,85,247,0.75)',
  },

  // Mention Notice
  mentionNotice: {
    backgroundColor: 'rgba(255,184,0,0.08)',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(255,184,0,0.25)',
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  mentionNoticeText: {
    fontSize: 12,
    color: '#B07D00',
    lineHeight: 18,
  },

  // Candidates
  candidateList: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  candidateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 10,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
  },
  checkboxChecked: {
    backgroundColor: '#A855F7',
    borderColor: '#A855F7',
  },
  checkmark: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  candidateAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  candidateAvatarImg: {
    width: 34,
    height: 34,
  },
  candidateAvatarText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  candidateName: {
    fontSize: FONT.sm,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  candidateHandle: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  emptyCandidates: {
    fontSize: FONT.sm,
    color: COLORS.textMuted,
    textAlign: 'center',
    paddingVertical: SPACING.md,
  },
  errorBox: {
    backgroundColor: 'rgba(240,68,82,0.06)',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(240,68,82,0.20)',
    padding: SPACING.md,
    alignItems: 'center',
    gap: 8,
  },
  errorBoxText: {
    fontSize: FONT.sm,
    color: COLORS.danger,
    textAlign: 'center',
  },
  retrySmallBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.primary,
  },
  retrySmallText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },

  // Caption
  captionInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    minHeight: 90,
    textAlignVertical: 'top',
    color: COLORS.textPrimary,
    fontSize: FONT.sm,
    backgroundColor: COLORS.white,
  },
  captionCounter: {
    fontSize: 11,
    color: COLORS.textMuted,
    textAlign: 'right',
    marginTop: 4,
  },

  // Tip
  tipBox: {
    backgroundColor: 'rgba(49,130,246,0.06)',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(49,130,246,0.18)',
    padding: SPACING.md,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  tipText: {
    fontSize: 12,
    color: COLORS.primary,
    lineHeight: 18,
  },

  // Share Button
  shareBtn: {
    backgroundColor: '#A855F7',
    borderRadius: RADIUS.card,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: SPACING.md,
    shadowColor: '#A855F7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  shareBtnDisabled: {
    opacity: 0.65,
  },
  shareBtnText: {
    color: '#fff',
    fontSize: FONT.base,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
