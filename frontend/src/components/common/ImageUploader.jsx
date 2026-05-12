import React, { useState, useRef } from 'react';
import { uploadImage } from '../../services/uploadApi';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE_MB = 20;

export default function ImageUploader({ onUploadSuccess, folder = 'photos' }) {
  const [preview, setPreview]   = useState(null);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError]       = useState('');
  const inputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setError('');

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('JPEG, PNG, WebP, GIF 파일만 업로드 가능합니다.');
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`파일 크기는 ${MAX_SIZE_MB}MB 이하여야 합니다.`);
      return;
    }

    // 로컬 미리보기
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target.result);
    reader.readAsDataURL(file);

    handleUpload(file);
  };

  const handleUpload = async (file) => {
    setUploading(true);
    setProgress(0);
    try {
      const url = await uploadImage(file, folder, setProgress);
      setProgress(100);
      onUploadSuccess?.(url);
    } catch (err) {
      setError(err.response?.data?.error || err.message || '업로드 실패');
      setPreview(null);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={styles.container}>
      {/* 클릭 / 드래그 영역 */}
      <div
        style={styles.dropzone}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const file = e.dataTransfer.files[0];
          if (file) {
            inputRef.current.files = e.dataTransfer.files;
            handleFileChange({ target: { files: [file] } });
          }
        }}
      >
        {preview ? (
          <img src={preview} alt="preview" style={styles.preview} />
        ) : (
          <span style={styles.placeholder}>클릭하거나 파일을 드래그하세요</span>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      {/* 진행률 바 */}
      {uploading && (
        <div style={styles.progressBar}>
          <div style={{ ...styles.progressFill, width: `${progress}%` }} />
        </div>
      )}
      {uploading && <p style={styles.progressText}>{progress}% 업로드 중...</p>}

      {/* 에러 */}
      {error && <p style={styles.error}>{error}</p>}
    </div>
  );
}

const styles = {
  container: { display: 'flex', flexDirection: 'column', gap: 8 },
  dropzone: {
    border: '2px dashed #ccc',
    borderRadius: 8,
    padding: 16,
    textAlign: 'center',
    cursor: 'pointer',
    minHeight: 160,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fafafa',
  },
  preview: { maxWidth: '100%', maxHeight: 300, objectFit: 'contain', borderRadius: 6 },
  placeholder: { color: '#888', fontSize: 14 },
  progressBar: { height: 6, backgroundColor: '#eee', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#4f46e5', transition: 'width 0.2s ease' },
  progressText: { fontSize: 12, color: '#666', margin: 0 },
  error: { color: '#e53e3e', fontSize: 13, margin: 0 },
};
