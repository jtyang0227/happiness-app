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
export async function uploadImage(file, folder = 'photos', onProgress) {
  const formData = new FormData();
  formData.append('file', file);
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
