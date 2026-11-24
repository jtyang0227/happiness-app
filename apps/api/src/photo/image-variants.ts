import sharp from 'sharp';
import { analyzeColors, ColorResult } from './color-analysis.js';

export const SIZES = [1024, 512, 256, 128] as const;
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

/** Spring ImageVariantUtil.prepare 입력 검사·실패 문구와 같은 오류 */
export class VariantInputError extends Error {}

export interface VariantPrep extends ColorResult { variants: Map<number, Buffer>; ext: string; contentType: string }

/**
 * 1024/512/256/128 상자에 비율 유지로 맞춘 변형(작은 사진은 키움 — Thumbnailator size()와 같음).
 * 출력 형식: png→png, gif→gif(첫 프레임), 그 외(jpeg·webp)→jpg 품질 75(ImageIO 기본값). 색 분석은 256 변형으로.
 */
export async function prepareVariants(buffer: Buffer, size: number, mimetype: string): Promise<VariantPrep> {
  if (size === 0) throw new VariantInputError('파일이 비어있습니다.');
  if (size > 20 * 1024 * 1024) throw new VariantInputError('파일 크기가 20MB를 초과합니다.');
  if (!ALLOWED.has(mimetype)) throw new VariantInputError('지원하지 않는 이미지 형식입니다. (JPEG, PNG, WebP, GIF 허용)');
  try {
    await sharp(buffer).metadata();
  } catch {
    throw new VariantInputError('이미지를 읽을 수 없습니다.');
  }
  const format = mimetype === 'image/png' ? 'png' : mimetype === 'image/gif' ? 'gif' : 'jpg';
  const variants = new Map<number, Buffer>();
  let color: ColorResult | null = null;
  for (const s of SIZES) {
    const base = sharp(buffer, { animated: false }).resize({ width: s, height: s, fit: 'inside' });
    const out = format === 'png' ? base.png() : format === 'gif' ? base.gif() : base.flatten({ background: '#000000' }).jpeg({ quality: 75 });
    variants.set(s, await out.toBuffer());
    if (s === 256) {
      const { data, info } = await sharp(buffer, { animated: false }).resize({ width: s, height: s, fit: 'inside' }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      color = analyzeColors(new Uint8Array(data), info.width, info.height);
    }
  }
  return { variants, ext: format, contentType: format === 'jpg' ? 'image/jpeg' : `image/${format}`, ...color! };
}
