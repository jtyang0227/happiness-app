import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

export interface UploadedFileLike { buffer: Buffer; size: number; mimetype: string; originalname: string }

/** Spring StorageException — 전역 핸들러가 없어 Spring에선 500 C001로 나간다(그대로 맞춤) */
export class StorageError extends Error {}

/** Spring SupabaseStorageService 1:1 — SUPABASE_URL·SUPABASE_SERVICE_ROLE_KEY·SUPABASE_BUCKET(기본 images) */
@Injectable()
export class StorageService {
  private readonly log = new Logger('StorageService');

  private get url() { return process.env.SUPABASE_URL ?? ''; }
  private get bucket() { return process.env.SUPABASE_BUCKET || 'images'; }
  private get publicBase() { return `${this.url}/storage/v1/object/public`; }

  async uploadImage(file: UploadedFileLike | undefined, folder: string): Promise<string> {
    if (!file || file.size === 0) throw new StorageError('파일이 비어있습니다.');
    if (file.size > MAX_FILE_SIZE) throw new StorageError('파일 크기는 20MB를 초과할 수 없습니다.');
    if (!ALLOWED_TYPES.has(file.mimetype)) throw new StorageError('허용되지 않는 파일 형식입니다. (JPEG, PNG, WebP, GIF만 허용)');
    const name = file.originalname;
    const ext = name && name.includes('.') ? name.slice(name.lastIndexOf('.') + 1).toLowerCase() : 'jpg';
    return this.uploadBytes(file.buffer, `${folder}/${randomUUID()}.${ext}`, file.mimetype);
  }

  async uploadBytes(bytes: Buffer, objectKey: string, contentType: string): Promise<string> {
    // Spring WebClient uri 템플릿처럼 변수 값을 인코딩한다(키의 `/` → %2F) — 운영 Supabase가 받는 요청을 그대로 유지
    const r = await fetch(`${this.url}/storage/v1/object/${encodeURIComponent(this.bucket)}/${encodeURIComponent(objectKey)}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''}`, 'Content-Type': contentType, 'x-upsert': 'true' },
      body: new Uint8Array(bytes),
    });
    if (!r.ok) throw new StorageError(`Supabase 업로드 실패: ${await r.text()}`);
    const publicUrl = `${this.publicBase}/${this.bucket}/${objectKey}`;
    this.log.log(`Supabase upload success: ${publicUrl}`);
    return publicUrl;
  }

  async deleteImage(objectKey: string): Promise<void> {
    const r = await fetch(`${this.url}/storage/v1/object/${this.bucket}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prefixes: [objectKey] }),
    });
    if (!r.ok) throw new StorageError(`Supabase 삭제 실패: ${await r.text()}`);
    this.log.log(`Supabase delete success: ${objectKey}`);
  }

  /** 이 서비스가 만든 `_1024.` 주소면 4단계 변형을 모두 지운다. 레거시 주소는 건너뛰고, 개별 실패는 무시 */
  async deletePhotoVariants(imageUrl1024: string | null): Promise<void> {
    const prefix = `${this.publicBase}/${this.bucket}/`;
    if (!imageUrl1024 || !imageUrl1024.startsWith(prefix)) return;
    const key1024 = imageUrl1024.slice(prefix.length);
    if (!key1024.includes('_1024.')) return;
    for (const size of [1024, 512, 256, 128]) {
      const key = key1024.replace('_1024.', `_${size}.`);
      try { await this.deleteImage(key); } catch (e) { this.log.warn(`사진 변형 삭제 실패(무시하고 계속): ${key} - ${(e as Error).message}`); }
    }
  }
}
