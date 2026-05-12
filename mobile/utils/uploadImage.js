import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

const API_URL = Platform.OS === 'android'
  ? 'http://10.0.2.2:8080'   // Android 에뮬레이터 → 호스트 머신
  : 'http://localhost:8080';  // iOS 시뮬레이터

/**
 * 갤러리에서 이미지를 선택한다.
 * iOS/Android 권한 요청 포함.
 */
export async function pickImage() {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('사진 라이브러리 접근 권한이 필요합니다.');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    quality: 0.85,
  });

  if (result.canceled) return null;
  return result.assets[0]; // { uri, width, height, type, fileName }
}

/**
 * 카메라로 사진을 찍는다.
 */
export async function takePhoto() {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('카메라 접근 권한이 필요합니다.');
  }

  const result = await ImagePicker.launchCameraAsync({
    allowsEditing: true,
    quality: 0.85,
  });

  if (result.canceled) return null;
  return result.assets[0];
}

/**
 * 선택된 이미지 asset을 백엔드 /api/upload/image로 업로드한다.
 * @param {object} asset - pickImage / takePhoto 반환값
 * @param {string} accessToken - JWT 토큰
 * @param {string} folder - 버킷 폴더 (기본: "photos")
 * @param {function} onProgress - 진행률 콜백 (0~1)
 * @returns {Promise<string>} public URL
 */
export async function uploadImageAsset(asset, accessToken, folder = 'photos', onProgress) {
  if (!asset?.uri) throw new Error('유효하지 않은 이미지입니다.');

  const filename = asset.fileName ?? asset.uri.split('/').pop();
  const mimeType = asset.type ?? 'image/jpeg';

  const uploadResult = await FileSystem.uploadAsync(
    `${API_URL}/api/upload/image?folder=${folder}`,
    asset.uri,
    {
      httpMethod: 'POST',
      uploadType: FileSystem.FileSystemUploadType.MULTIPART,
      fieldName: 'file',
      mimeType,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      parameters: { folder },
    }
  );

  if (uploadResult.status < 200 || uploadResult.status >= 300) {
    const body = JSON.parse(uploadResult.body ?? '{}');
    throw new Error(body.error ?? `업로드 실패 (HTTP ${uploadResult.status})`);
  }

  const data = JSON.parse(uploadResult.body);
  return data.url;
}
