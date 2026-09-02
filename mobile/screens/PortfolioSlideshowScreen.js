import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, Image, FlatList, TouchableOpacity, StyleSheet,
  Dimensions, ActivityIndicator, useWindowDimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { photoApi } from '../services/api';
import { COLORS } from '../constants/colors';
import { FONT, RADIUS, SPACING } from '../constants/layout';

const MOOD_LABELS = {
  WARM: '따뜻함', COOL: '시원함', DRAMATIC: '드라마틱',
  NATURAL: '자연스러움', ROMANTIC: '로맨틱', SERENE: '평온함',
  ENERGETIC: '에너지', DARK: '어두움',
};

/**
 * 상단 스펙큘러 하이라이트(유리 상단 모서리 반사광)를 근사하는 얇은 흰색 라인.
 * 웹 PortfolioSlideshowPage.jsx의 `boxShadow: inset 0 1px 0 rgba(255,255,255,0.25)`에 대응.
 */
function GlassHighlight() {
  return <View style={styles.glassHighlight} pointerEvents="none" />;
}

export default function PortfolioSlideshowScreen({ navigation, route }) {
  const { profileName } = route.params;
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [index, setIndex]     = useState(0);
  const [playing, setPlaying] = useState(true);

  const listRef      = useRef(null);
  const intervalRef  = useRef(null);
  const indexRef     = useRef(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await photoApi.getPortfolio(profileName);
        if (!cancelled) setData(res);
      } catch {
        if (!cancelled) setError('포트폴리오를 불러올 수 없습니다.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [profileName]);

  const member = data?.member ?? {};
  const photos = data?.photos ?? [];
  const slides = [{ type: 'cover' }, ...photos.map(p => ({ type: 'photo', photo: p }))];
  const total  = slides.length;

  const scrollToIndex = useCallback((i) => {
    const next = Math.max(0, Math.min(i, total - 1));
    listRef.current?.scrollToIndex({ index: next, animated: true });
    setIndex(next);
    indexRef.current = next;
  }, [total]);

  // 자동재생
  useEffect(() => {
    clearInterval(intervalRef.current);
    if (playing && total > 1) {
      intervalRef.current = setInterval(() => {
        const next = (indexRef.current + 1) % total;
        listRef.current?.scrollToIndex({ index: next, animated: true });
        setIndex(next);
        indexRef.current = next;
      }, 3000);
    }
    return () => clearInterval(intervalRef.current);
  }, [playing, total]);

  const onMomentumScrollEnd = (e) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / screenWidth);
    setIndex(i);
    indexRef.current = i;
  };

  const currentPhoto = index === 0 ? null : photos[index - 1];
  const dots = Math.min(total, 7);
  const dotOffset = total <= 7 ? 0 : Math.max(0, Math.min(index - 3, total - 7));

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.errorBtn}>
          <Text style={styles.errorBtnText}>돌아가기</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <FlatList
        ref={listRef}
        data={slides}
        keyExtractor={(_, i) => String(i)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumScrollEnd}
        getItemLayout={(_, i) => ({ length: screenWidth, offset: screenWidth * i, index: i })}
        renderItem={({ item }) => (
          <View style={{ width: screenWidth, height: screenHeight, alignItems: 'center', justifyContent: 'center' }}>
            {item.type === 'cover' ? (
              <View style={styles.coverWrap}>
                <Text style={styles.coverName}>{member.name ?? profileName}</Text>
                <Text style={styles.coverHandle}>@{profileName}</Text>
                {!!member.bio && <Text style={styles.coverBio} numberOfLines={4}>{member.bio}</Text>}
              </View>
            ) : (
              <Image
                source={{ uri: item.photo.imageUrl }}
                style={{ width: screenWidth, height: screenHeight * 0.88 }}
                resizeMode="contain"
              />
            )}
          </View>
        )}
      />

      {/* ── 상단 바 (글라스) ── */}
      <View style={[styles.topBar, { top: insets.top + 12 }]}>
        <BlurView intensity={40} tint="dark" style={styles.glassSurface}>
          <GlassHighlight />
          <View style={styles.topBarInner}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.pillBtn}>
              <Text style={styles.pillBtnText}>← 닫기</Text>
            </TouchableOpacity>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={styles.artistName}>{member.name ?? profileName}</Text>
              <Text style={styles.artistHandle}>@{profileName}</Text>
            </View>
            <Text style={styles.pageCount}>{index + 1} / {total}</Text>
          </View>
        </BlurView>
      </View>

      {/* ── 하단 바 (글라스) ── */}
      <View style={[styles.bottomBar, { bottom: insets.bottom + 12 }]}>
        <BlurView intensity={40} tint="dark" style={styles.glassSurface}>
          <GlassHighlight />
          <View style={styles.bottomBarInner}>
            <View style={{ flex: 1 }}>
              {!!currentPhoto?.title && <Text style={styles.photoTitle} numberOfLines={1}>{currentPhoto.title}</Text>}
              {!!currentPhoto?.colorMood && (
                <Text style={styles.photoMood}>{MOOD_LABELS[currentPhoto.colorMood] ?? currentPhoto.colorMood}</Text>
              )}
            </View>

            <View style={styles.dotsWrap}>
              {Array.from({ length: dots }, (_, i) => i + dotOffset).map(i => (
                <TouchableOpacity key={i} onPress={() => scrollToIndex(i)}>
                  <View style={[styles.dot, i === index && styles.dotActive]} />
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity onPress={() => setPlaying(p => !p)} style={styles.playBtn}>
              <Text style={styles.playBtnText}>{playing ? '⏸' : '▶'}</Text>
            </TouchableOpacity>
          </View>
        </BlurView>
      </View>
    </View>
  );
}

const { width: SCREEN_W } = Dimensions.get('window');

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', gap: SPACING.lg },
  errorText: { color: COLORS.textHint, fontSize: FONT.base },
  errorBtn: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: RADIUS.sm, backgroundColor: COLORS.primary },
  errorBtnText: { color: '#fff', fontWeight: '700' },

  coverWrap: { width: SCREEN_W * 0.8, alignItems: 'center' },
  coverName: { color: '#fff', fontSize: FONT.hero + 4, fontWeight: '800', textAlign: 'center' },
  coverHandle: { color: 'rgba(255,255,255,0.55)', fontSize: FONT.md, marginTop: 6 },
  coverBio: { color: 'rgba(255,255,255,0.75)', fontSize: FONT.base, marginTop: 16, textAlign: 'center', lineHeight: 22 },

  // ── 글라스 공통 ──
  glassSurface: {
    borderRadius: RADIUS.xxl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  glassHighlight: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 1,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },

  topBar: { position: 'absolute', left: 16, right: 16, zIndex: 10 },
  topBarInner: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, height: 56, gap: 12 },
  pillBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.sm, backgroundColor: 'rgba(255,255,255,0.12)' },
  pillBtnText: { color: 'rgba(255,255,255,0.9)', fontSize: FONT.sm },
  artistName: { color: '#fff', fontSize: FONT.base, fontWeight: '700' },
  artistHandle: { color: 'rgba(255,255,255,0.6)', fontSize: FONT.sm },
  pageCount: { color: 'rgba(255,255,255,0.6)', fontSize: FONT.sm, minWidth: 46, textAlign: 'right' },

  bottomBar: { position: 'absolute', left: 16, right: 16, zIndex: 10 },
  bottomBarInner: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, height: 64, gap: 12 },
  photoTitle: { color: '#fff', fontSize: FONT.sm, fontWeight: '700' },
  photoMood: { color: 'rgba(255,255,255,0.5)', fontSize: FONT.xs ?? 11, marginTop: 2 },
  dotsWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.35)' },
  dotActive: { width: 18, backgroundColor: '#fff' },
  playBtn: {
    width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  playBtnText: { color: '#fff', fontSize: FONT.md },
});
