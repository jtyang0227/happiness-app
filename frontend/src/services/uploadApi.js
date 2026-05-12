import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL;

/**
 * 이미지를 백엔드 /api/upload/image 엔드포인트로 업로드한다.
 * @param {File} file - 업로드할 파일
 * @param {string} folder - Supabase 버킷 내 폴더 (기본: "photos")
 * @param {function} onProgress - 진행률 콜백 (0~100)
 * @returns {Promise<string>} 업로드된 이미지의 public URL
 */
export async function uploadImage(file, folder = 'photos', onProgress) {
  const token = localStorage.getItem('accessToken');
  if (!token) throw new Error('로그인이 필요합니다.');

  const formData = new FormData();
  formData.append('file', file);
  formData.append('folder', folder);

  const response = await axios.post(`${API_URL}/api/upload/image`, formData, {
    headers: {
      Authorization: `Bearer ${token}`,
      // Content-Type은 axios가 multipart/form-data로 자동 설정
    },
    onUploadProgress: (event) => {
      if (onProgress && event.total) {
        onProgress(Math.round((event.loaded * 100) / event.total));
      }
    },
  });

  return response.data.url;
}
