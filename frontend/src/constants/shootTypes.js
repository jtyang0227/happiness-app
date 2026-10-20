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

export const shootTypeLabel = (value) =>
  SHOOT_TYPES.find(t => t.value === value)?.label || null;
