import { GENRE_LIST } from '../../../constants/colors';
import {
  HeroBlock, FeaturedWorkBlock, WorksBlock, PhotosBlock, photosForBlock, TextBlock, QuoteBlock,
  TestimonialsBlock, PricingBlock, PressBlock, ClientsBlock, ContactBlock, NewsletterBlock,
} from './PortfolioBlocks';

/*
 * 블록 레지스트리 — 새 블록은 ① 여기 한 항목 ② 서버 PortfolioLayoutValidator.BLOCK_PROPS 한 줄이면 끝난다.
 * fields: 편집 화면 입력란(kind: text·textarea·select·segment·number·checkbox). 서버 길이·범위와 맞춘다.
 * isEmpty(props, ctx): 데이터가 없으면 공개 페이지에서 빼고, 편집 미리보기에서만 emptyHint를 보인다.
 */
const GENRE_OPTIONS = [{ value: '', label: '전체 장르' }, ...GENRE_LIST.map(g => ({ value: g.code, label: `${g.emoji} ${g.label}` }))];

export const BLOCK_REGISTRY = {
  hero: {
    label: '첫 화면', emoji: '👋', desc: '이름·소개·문의 버튼', Component: HeroBlock,
    defaults: { align: 'left', showStats: false },
    fields: [
      { key: 'tagline', label: '한 줄 소개', kind: 'text', max: 80, placeholder: '비워 두면 프로필 소개를 써요' },
      { key: 'align', label: '정렬', kind: 'segment', options: [{ value: 'left', label: '왼쪽' }, { value: 'center', label: '가운데' }] },
      { key: 'showStats', label: '사진·팔로워·좋아요 수 보이기', kind: 'checkbox' },
    ],
    summary: p => (p.align === 'center' ? '가운데 정렬' : '왼쪽 정렬'),
  },
  featuredWork: {
    label: '대표 작업', emoji: '📌', desc: '📌 고정한 작업 1건을 크게', Component: FeaturedWorkBlock,
    defaults: {},
    fields: [{ key: 'title', label: '제목', kind: 'text', max: 40, placeholder: '예: 대표 작업' }],
    isEmpty: (p, ctx) => !ctx.series.some(s => s.pinned),
    emptyHint: '고정한 작업이 없어요 — 내 작업에서 📌 대표로 지정하세요',
  },
  works: {
    label: '작업 노트', emoji: '📁', desc: '작업 사례 카드 목록', Component: WorksBlock,
    defaults: { title: '작업 노트' },
    fields: [{ key: 'title', label: '제목', kind: 'text', max: 40 }],
    isEmpty: (p, ctx) => ctx.series.length === 0,
    emptyHint: '공개된 작업이 없어요 — 내 작업에서 시리즈를 만들어 보세요',
  },
  photos: {
    label: '사진 그리드', emoji: '🖼', desc: '장르별로 골라 여러 번 넣을 수 있어요', Component: PhotosBlock,
    defaults: { columns: 3, limit: 12, genre: '' },
    fields: [
      { key: 'title', label: '제목', kind: 'text', max: 40, placeholder: '예: 웨딩' },
      { key: 'columns', label: '열 수', kind: 'segment', options: [{ value: 2, label: '2열' }, { value: 3, label: '3열' }, { value: 4, label: '4열' }] },
      { key: 'limit', label: '최대 장 수', kind: 'number', min: 3, max: 60 },
      { key: 'genre', label: '장르', kind: 'select', options: GENRE_OPTIONS },
    ],
    summary: p => `${p.columns || 3}열 · ${p.limit || 12}장${p.genre ? ` · ${GENRE_LIST.find(g => g.code === p.genre)?.label || p.genre}` : ''}`,
    isEmpty: (p, ctx) => photosForBlock(p, ctx.photos).length === 0,
    emptyHint: '조건에 맞는 공개 사진이 없어요',
  },
  text: {
    label: '글', emoji: '✍️', desc: '작업 방식·소개 같은 긴 글', Component: TextBlock,
    defaults: { title: '', body: '' },
    fields: [
      { key: 'title', label: '제목', kind: 'text', max: 60 },
      { key: 'body', label: '본문', kind: 'textarea', max: 2000 },
    ],
    summary: p => p.title || (p.body ? p.body.slice(0, 20) : '내용 없음'),
    isEmpty: p => !p.title && !p.body,
    emptyHint: '제목이나 본문을 입력하세요',
  },
  quote: {
    label: '인용', emoji: '❝', desc: '고객 한마디·작업 철학', Component: QuoteBlock,
    defaults: { text: '', author: '' },
    fields: [
      { key: 'text', label: '인용문', kind: 'textarea', max: 300 },
      { key: 'author', label: '말한 사람', kind: 'text', max: 40 },
    ],
    summary: p => (p.text ? p.text.slice(0, 20) : '내용 없음'),
    isEmpty: p => !p.text,
    emptyHint: '인용문을 입력하세요',
  },
  testimonials: {
    label: '고객 후기', emoji: '⭐', desc: '등록한 추천사', Component: TestimonialsBlock, defaults: {}, fields: [],
    isEmpty: (p, ctx) => ctx.trust.testimonials.length === 0,
    emptyHint: '아직 고객 후기가 없어요 — 프로필 › 설정 › 포트폴리오 콘텐츠에서 추가',
  },
  pricing: {
    label: '촬영 패키지', emoji: '💰', desc: '가격·구성', Component: PricingBlock, defaults: {}, fields: [],
    isEmpty: (p, ctx) => ctx.trust.pricing.length === 0,
    emptyHint: '등록한 패키지가 없어요 — 프로필 › 설정에서 추가',
  },
  press: {
    label: '언론·수상', emoji: '🏆', desc: '기사·수상·전시', Component: PressBlock, defaults: {}, fields: [],
    isEmpty: (p, ctx) => ctx.trust.press.length === 0 && ctx.trust.achievements.length === 0,
    emptyHint: '등록한 언론·수상 기록이 없어요',
  },
  clients: {
    label: '함께한 브랜드', emoji: '🤝', desc: '클라이언트 로고', Component: ClientsBlock, defaults: {}, fields: [],
    isEmpty: (p, ctx) => ctx.trust.brands.length === 0,
    emptyHint: '등록한 브랜드가 없어요',
  },
  contact: {
    label: '문의·예약', emoji: '📮', desc: '문의 버튼과 예약 링크', Component: ContactBlock,
    defaults: { title: '촬영 문의', showBooking: true },
    fields: [
      { key: 'title', label: '제목', kind: 'text', max: 40 },
      { key: 'body', label: '설명', kind: 'textarea', max: 300 },
      { key: 'showBooking', label: '예약 받는 중이면 "예약 날짜 보기" 보이기', kind: 'checkbox' },
    ],
    summary: p => p.title || '촬영 문의',
  },
  newsletter: {
    label: '소식 받기', emoji: '✉️', desc: '이메일 구독', Component: NewsletterBlock, defaults: {}, fields: [],
  },
};

export const BLOCK_TYPES = Object.keys(BLOCK_REGISTRY);
