import apiClient from '../api/apiClient';

/**
 * 이미지를 백엔드 /api/upload/image 엔드포인트로 업로드한다.
 * @param {File|Blob} file - 업로드할 파일
 * @param {string} folder - Supabase 버킷 내 폴더 (기본: "photos")
 * @param {function} onProgress - 진행률 콜백 (0~100)
 * @returns {Promise<string>} 업로드된 이미지의 public URL
 *
 * 공용 apiClient를 쓴다 — 토큰 첨부·401 재발급·baseURL(`.../api`)을 다른 API와 똑같이 처리한다.
 * (예전 구현은 앱이 저장하지 않는 localStorage 토큰을 읽고 주소에 `/api`를 한 번 더 붙여 항상 실패했다.)
 */
const MAX_EDGE = 2048;
const RESIZABLE = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * 긴 변이 2048px를 넘는 사진은 보내기 전에 브라우저에서 줄인다(JPEG·WebP 품질 0.85).
 * 무료 Storage 용량과 업로드 시간을 아끼고, 서버 메모리(512MB)에 큰 원본을 올리지 않으려는 것.
 * 서버(SupabaseStorageService)도 같은 기준으로 한 번 더 줄이므로, 여기서 실패하면 원본을 그대로 보낸다.
 */
async function shrinkForUpload(file) {
  if (!file || !RESIZABLE.includes(file.type) || typeof createImageBitmap !== 'function') return file;
  try {
    const bitmap = await createImageBitmap(file);
    const longEdge = Math.max(bitmap.width, bitmap.height);
    if (longEdge <= MAX_EDGE) { bitmap.close?.(); return file; }
    const k = MAX_EDGE / longEdge;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * k);
    canvas.height = Math.round(bitmap.height * k);
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();
    const blob = await new Promise(resolve => canvas.toBlob(resolve, file.type, 0.85));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name || 'image', { type: file.type });
  } catch {
    return file;
  }
}

export async function uploadImage(file, folder = 'photos', onProgress) {
  const formData = new FormData();
  formData.append('file', await shrinkForUpload(file));
  formData.append('folder', folder);

  const response = await apiClient.post('/upload/image', formData, {
    // 기본 Content-Type(JSON)이면 axios가 FormData를 JSON으로 바꿔 버린다 — multipart로 지정하면
    // 브라우저가 boundary를 붙여 보낸다.
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120000,   // 최대 20MB 업로드 — 기본 15초로는 느린 회선에서 끊긴다
    onUploadProgress: (event) => {
      if (onProgress && event.total) {
        onProgress(Math.round((event.loaded * 100) / event.total));
      }
    },
  });

  return response.data.url;
}
