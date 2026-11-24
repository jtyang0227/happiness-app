import { Injectable } from '@nestjs/common';

const MOOD_TAGS: Record<string, string[]> = {
  WARM: ['따뜻한', '황금빛', '노을', '여름', '일몰'],
  COOL: ['청량한', '시원한', '겨울', '블루', '새벽'],
  NATURAL: ['자연', '초록', '숲', '자연광', '맑은'],
  VIBRANT: ['활기찬', '생동감', '컬러풀', '선명한'],
  MUTED: ['차분한', '파스텔', '소프트', '은은한'],
  ROMANTIC: ['로맨틱', '핑크', '감성', '봄', '따뜻한'],
  DRAMATIC: ['강렬한', '대비', '어두운', '무거운'],
  ENERGETIC: ['역동적인', '생동감', '선명한', '스포티'],
  SERENE: ['고요한', '평화로운', '미니멀', '여백'],
  CLEAN: ['깔끔한', '화이트', '밝은', '심플'],
  MONOCHROME: ['흑백', '모노크롬', '클래식', '필름'],
};

const STOP_WORDS = new Set([
  '의', '가', '이', '은', '는', '을', '를', '에', '에서', '로', '으로', '과', '와', '도', '만', '까지', '부터', '한', '하다', '이다', '있다',
  '없다', '그', '저', '것', '수', '들', 'a', 'the', 'an', 'is', 'are', 'was', 'were', 'in', 'on', 'at', 'to', 'for', 'of', 'and', 'or', 'it',
  'this', 'that', 'with',
]);

/** Spring AutoTagService 1:1 — 제목·설명 키워드(최대 6) + 색 분위기 태그, 앞에 Google Vision 라벨(GOOGLE_VISION_API_KEY 있을 때) */
@Injectable()
export class AutoTagService {
  suggest(title: string | null, description: string | null, colorMood: string | null): string[] {
    const result = new Set<string>();
    const text = `${title ?? ''} ${description ?? ''}`;
    for (const token of javaSplit(text, /[\s,.!?;:()/[\]]+/)) {
      const w = token.trim();
      if (w.length >= 2 && !STOP_WORDS.has(w.toLowerCase())) result.add(w);
      if (result.size >= 6) break;
    }
    if (colorMood != null) for (const t of MOOD_TAGS[colorMood.toUpperCase()] ?? []) result.add(t);
    return [...result].slice(0, 10);
  }

  async analyzeWithVision(imageUrl: string | null): Promise<string[]> {
    const key = process.env.GOOGLE_VISION_API_KEY;
    if (!key || key.trim() === '' || !imageUrl || imageUrl.trim() === '') return [];
    try {
      const r = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requests: [{ image: { source: { imageUri: imageUrl } }, features: [{ type: 'LABEL_DETECTION', maxResults: 8 }, { type: 'IMAGE_PROPERTIES', maxResults: 3 }] }] }),
      });
      if (!r.ok) return [];
      const labels: { score?: unknown; description?: unknown }[] = ((await r.json()) as { responses?: { labelAnnotations?: [] }[] })?.responses?.[0]?.labelAnnotations ?? [];
      return labels.filter((l) => typeof l.score === 'number' && l.score >= 0.75).map((l) => l.description).filter((d): d is string => typeof d === 'string').slice(0, 8);
    } catch {
      return [];
    }
  }

  async suggestWithVision(title: string | null, description: string | null, colorMood: string | null, imageUrl: string | null) {
    const result = new Set<string>(await this.analyzeWithVision(imageUrl));
    for (const t of this.suggest(title, description, colorMood)) result.add(t);
    return [...result].slice(0, 10);
  }
}

/** Java String.split — 끝의 빈 문자열은 버리고 앞의 빈 문자열은 남긴다 */
function javaSplit(s: string, re: RegExp): string[] {
  const parts = s.split(re);
  while (parts.length > 0 && parts[parts.length - 1] === '') parts.pop();
  return parts;
}
