// 네이티브(iOS/Android) 전용 구현.
// 웹 번들에서는 Metro의 플랫폼별 확장자 해석(instagramShare.web.js)이 이 파일 대신 사용된다.
import { captureRef } from 'react-native-view-shot';
import Share from 'react-native-share';

export { captureRef };
export const Social = Share.Social;
export default Share;
