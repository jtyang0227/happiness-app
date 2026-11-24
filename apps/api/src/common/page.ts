import { AppError } from './app-error.js';

/** Spring PageRequest.of(page, size) 검증 — IllegalArgumentException → 400 C002 + 같은 영문 메시지 */
export function pageRequest(page: number, size: number) {
  if (page < 0) throw AppError.badInput('Page index must not be less than zero');
  if (size < 1) throw AppError.badInput('Page size must not be less than one');
  return { skip: page * size, take: size, page, size };
}

const UNSORTED = () => ({ empty: true, sorted: false, unsorted: true });

/**
 * Spring Data `PageImpl`을 Jackson이 직렬화한 모양 그대로(래퍼 없는 응답에 쓰임).
 * 키 순서까지 맞춘다: content, pageable, totalPages, totalElements, last, size, number, sort, numberOfElements, first, empty
 */
export function springPage<T>(content: T[], page: number, size: number, total: number) {
  const totalPages = Math.ceil(total / size);
  return {
    content,
    pageable: { pageNumber: page, pageSize: size, sort: UNSORTED(), offset: page * size, paged: true, unpaged: false },
    totalPages,
    totalElements: total,
    last: page + 1 >= totalPages,
    size,
    number: page,
    sort: UNSORTED(),
    numberOfElements: content.length,
    first: page === 0,
    empty: content.length === 0,
  };
}
