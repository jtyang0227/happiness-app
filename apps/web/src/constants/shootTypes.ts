/**
 * 촬영 유형 어휘 — 문의 폼(InquiryFormPage)과 작업 노트(Series.shootType)가 공유한다.
 * value는 백엔드 SeriesController.SHOOT_TYPES와 반드시 같아야 한다(작업 페이지 → 문의 폼 프리필).
 * 예약(BookingPage)의 영문 코드(WEDDING 등)와는 별개 어휘다.
 */
export const SHOOT_TYPES = [
  { value: '결혼식', label: '결혼식' },
  { value: '제품촬영', label: '제품 촬영' },
  { value: '인물/프로필', label: '인물 / 프로필' },
  { value: '풍경', label: '풍경 / 여행' },
  { value: '행사/이벤트', label: '행사 / 이벤트' },
  { value: '가족', label: '가족' },
  { value: '기타', label: '기타' },
];

/**
 * 작업 노트 유형 → 예약 위저드(BookingPage, components/booking/ShootTypeSelector) 코드.
 * 뜻이 명확히 같은 3개만 매핑한다. 나머지(풍경·행사·가족·기타)는 예약 코드와 1:1로 맞지 않아
 * 프리셋 없이 예약 위저드 첫 단계에서 고르게 한다.
 */
export const BOOKING_CODE_BY_SHOOT_TYPE = {
  '결혼식': 'WEDDING',
  '인물/프로필': 'PROFILE',
  '제품촬영': 'COMMERCIAL',
};

export const shootTypeLabel = (value) =>
  SHOOT_TYPES.find(t => t.value === value)?.label || null;
