// 웹 전용 스텁 — Instagram Story 공유는 모바일 앱(iOS/Android)에서만 지원된다.
// GatheringInstagramShareScreen이 Platform.OS === 'web' 검사로 실제 호출을 막으므로
// 이 스텁은 번들이 깨지지 않도록 형태만 맞춘 no-op이다.
export const captureRef = () => Promise.reject(new Error('react-native-view-shot: not available on web'));

export const Social = {
  INSTAGRAM_STORIES: 'instagramstories',
  INSTAGRAM: 'instagram',
  FACEBOOK: 'facebook',
  TWITTER: 'twitter',
};

const Share = {
  Social,
  shareSingle: () => Promise.reject(new Error('react-native-share: not available on web')),
  open: () => Promise.reject(new Error('react-native-share: not available on web')),
};

export default Share;
