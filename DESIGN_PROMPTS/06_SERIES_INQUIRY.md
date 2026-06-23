# 06 — 시리즈 & 문의 (SeriesPage · InquiryFormPage · InquiryInboxPage)

> P1: InquiryInboxPage 카드 UX / P2: SeriesPage PhotoPickerModal

---

## 저장 경로

```
frontend/src/
  pages/SeriesPage.jsx           (수정)
  pages/InquiryFormPage.jsx      (수정)
  pages/InquiryInboxPage.jsx     (수정)
  components/series/SeriesCard.jsx     (신규)
  components/series/PhotoPickerModal.jsx (신규)
  components/inquiry/InquiryCard.jsx   (신규)
```

---

## [1] SeriesPage — CRUD + PhotoPickerModal

### 현재 문제

`SeriesPage`에 시리즈 생성/수정/삭제 기능이 있지만 사진 추가 UI(`PhotoPickerModal`)가
없어 `seriesApi.addPhoto(seriesId, photoId)` API를 호출할 수 없음.

### claude.ai 아티팩트 프롬프트

```
[시스템 컨텍스트]
앱 이름: Happiness — 포트폴리오 사진 갤러리 앱
기술 스택: React 18 SPA, inline style (CSS-in-JS 없음)
아이콘: 이모지 또는 유니코드 기호 (외부 라이브러리 없음)
컬러: primary '#5b6ef5' primaryDark '#4458e0' primaryLight '#eef0ff' accent '#a78bfa'
      bg '#f7f7fb' surface '#fff' surfaceDim '#ededf4' border '#e5e5ed'
      text '#0f0f1a' textSecondary '#5555aa' textMuted '#8888bb' danger '#e53e3e'
규칙: export default 함수형 컴포넌트 1개, style은 inline object, 외부 라이브러리 없음, 한국어 UI

두 가지를 만들어주세요.

1. SeriesCard (components/series/SeriesCard.jsx)

Props:
- series: { id, title, description, coverUrl, photoCount, displayOrder }
- onEdit: () => void
- onDelete: () => void
- onManagePhotos: () => void

카드 디자인 (width 100%, radius 12px, overflow hidden, surface bg, shadow sm):
  커버: height 160px, bg '#1a1a2e', object-fit cover (coverUrl 없으면 🖼️ 이모지 중앙)
       우상단 사진 수 배지 (bg 'rgba(0,0,0,0.6)' white 12px bold)
  본문 (padding 16px):
    제목 16px 600 + description 13px textMuted (2줄 ellipsis)
    하단 버튼 row (flex, gap 8px, margin-top 12px):
      [📷 사진 관리] primary sm
      [✏️ 수정] secondary sm
      [🗑️ 삭제] ghost sm danger hover

hover: translateY(-2px), shadow md, transition 0.2s

2. PhotoPickerModal (components/series/PhotoPickerModal.jsx)

Props:
- isOpen: boolean
- onClose: () => void
- seriesId: number
- currentPhotoIds: number[]  (이미 시리즈에 있는 사진)
- onConfirm: (selectedIds: number[]) => void

기능:
  isOpen=false → null 반환
  오버레이: position fixed inset 0 bg 'rgba(0,0,0,0.88)' z-index 1000
  모달 패널: position fixed top '50%' left '50%' transform 'translate(-50%,-50%)'
    width min(640px, 90vw), max-height 80vh, bg surface, radius 16px, overflow hidden

  헤더: "시리즈에 사진 추가" + × 닫기
  검색 input (🔍 prefix, placeholder '사진 제목 검색')

  사진 그리드 (overflow-y auto, max-height 400px):
    3컬럼 (모바일 2컬럼), gap 8px, padding 16px
    각 카드: aspect-ratio 1/1, object-fit cover, radius 8px, cursor pointer
      이미 시리즈에 있음: 녹색 ✓ 오버레이 ('rgba(34,197,94,0.3)')
      선택됨: border '3px solid primary' + 우상단 체크박스 ✓
      미선택: border '3px solid transparent'
    목 사진 12개

  푸터 (border-top, padding 16px, flex justify-between align-items center):
    좌: "{N}개 선택됨" 13px textMuted
    우: [취소] ghost + [추가하기] primary (선택 없으면 disabled)
    Escape 키 닫기

데모: 시리즈 2개 카드, 사진 관리 클릭 → PhotoPickerModal 열기, 사진 선택, 확인
```

### 통합 방법

```jsx
// SeriesPage.jsx
const [pickerOpen, setPickerOpen] = useState(false)
const [activeSeries, setActiveSeries] = useState(null)

const handleManagePhotos = (series) => {
  setActiveSeries(series)
  setPickerOpen(true)
}
const handleAddPhotos = async (selectedIds) => {
  for (const photoId of selectedIds) {
    await seriesApi.addPhoto(activeSeries.id, photoId)
  }
  showToast(`${selectedIds.length}개 사진 추가됨`, 'success')
  setPickerOpen(false)
  fetchSeries()
}
```

---

## [2] InquiryFormPage — 7종 촬영 유형 + 성공 상태

### 현재 문제

`InquiryFormPage`에 문의 폼이 있으나 촬영 유형 선택 UI가 텍스트 input으로만 되어 있고
성공 후 상태 UI(감사 화면)가 없음.

### claude.ai 아티팩트 프롬프트

```
[시스템 컨텍스트]
앱 이름: Happiness — 포트폴리오 사진 갤러리 앱
기술 스택: React 18 SPA, React Router v6, inline style (CSS-in-JS 없음)
아이콘: 이모지 또는 유니코드 기호 (외부 라이브러리 없음)
컬러: primary '#5b6ef5' primaryDark '#4458e0' primaryLight '#eef0ff' accent '#a78bfa'
      darkBg '#090909' darkSurface '#0f0f0f' darkBorder 'rgba(255,255,255,0.07)'
      darkText '#e8e8f0' darkTextSub '#8080b0' success '#22c55e'
규칙: export default 함수형 컴포넌트 1개, style은 inline object, react+react-router-dom만 허용, 한국어 UI

InquiryFormPage 컴포넌트를 만들어주세요 (헤더 없는 standalone, 다크 테마).

useParams로 profileName 수신. 목 작가 데이터 사용.

== 문의 폼 상태 ==

레이아웃: min-height 100vh, bg darkBg, padding 40px 24px
카드: max-width 520px, margin auto, bg darkSurface, border darkBorder, radius 16px, padding 32px

헤더:
  작가 아바타(48px) + "김작가님에게 촬영 문의" 20px 700 darkText
  "답변은 이메일로 받으실 수 있습니다" 13px darkTextSub

폼 필드 (flex column gap 16px):
  이름 input (placeholder '성함을 입력하세요')
  이메일 input (type=email, placeholder 'answer@example.com')

  촬영 유형 선택 (라벨 "촬영 유형"):
    7개 칩 flex-wrap:
    웨딩 💍 / 인물 👤 / 풍경 🏔️ / 제품 📦 / 음식 🍽️ / 건축 🏛️ / 기타 💬
    선택됨: bg primary color white border primary
    미선택: border darkBorder color darkTextSub

  희망 날짜 input (type=date 또는 text, placeholder 'YYYY-MM-DD 또는 미정')
  예산 input (placeholder '예: 30만원, 협의 가능')
  메시지 textarea (5줄, placeholder '문의 내용을 자유롭게 작성해주세요 (필수)')

  [문의 보내기] primary 버튼 width 100% height 48px
    로딩: 스피너 + "전송 중..."
    유효성: 이름/이메일/메시지 필수, 이메일 형식 검사

== 성공 상태 (전송 완료 후) ==

동일 카드, 내용 교체:
  중앙 ✅ 아이콘 (64px, success 색상)
  "문의가 전송되었습니다!" 22px 700 darkText
  "김작가님이 확인 후 {입력한 이메일}로 답변드립니다." 14px darkTextSub
  예상 응답 시간: "보통 1~3 영업일 내 답변드립니다" 13px darkTextSub
  [작가 포트폴리오 보기] ghost 버튼 → /portfolio/:profileName

데모: 폼 상태 / 성공 상태 2가지 탭으로 전환
```

### 통합 방법

```jsx
// InquiryFormPage.jsx
const [submitted, setSubmitted] = useState(false)
const handleSubmit = async () => {
  await inquiryApi.send({
    receiverProfileName: profileName,
    senderName, senderEmail, shootType, shootDate, budget, message
  })
  setSubmitted(true)
}
```

---

## [3] InquiryInboxPage — 카드 UX (읽음/미읽음 · 펼치기)

### 현재 문제

`InquiryInboxPage`에 문의 목록이 있지만 카드 형태 없이 단순 리스트이며
읽음/미읽음 시각적 구분, 펼치기/접기, 메일 답변 버튼이 없음.

### claude.ai 아티팩트 프롬프트

```
[시스템 컨텍스트]
앱 이름: Happiness — 포트폴리오 사진 갤러리 앱
기술 스택: React 18 SPA, inline style (CSS-in-JS 없음)
아이콘: 이모지 또는 유니코드 기호 (외부 라이브러리 없음)
컬러: primary '#5b6ef5' primaryLight '#eef0ff' accent '#a78bfa'
      bg '#f7f7fb' surface '#fff' surfaceDim '#ededf4' border '#e5e5ed'
      text '#0f0f1a' textSecondary '#5555aa' textMuted '#8888bb' danger '#e53e3e'
      success '#22c55e'
규칙: export default 함수형 컴포넌트 1개, style은 inline object, 외부 라이브러리 없음, 한국어 UI

InquiryInboxPage 컴포넌트를 만들어주세요. 더미 데이터 사용.

== 페이지 구조 ==

max-width 720px, margin auto, padding 32px 24px

헤더:
  "📨 문의 수신함" 22px 700 + 미읽음 배지 (N개 미읽음, bg danger, white)
  우측 탭: [전체] [미읽음] — 활성 primary, 비활성 textMuted

== InquiryCard ==

각 문의를 카드로 표시:

미읽음 카드: bg surface, border-left '3px solid primary', box-shadow shadow-sm
읽은 카드: bg '#f7f7fb', border-left '3px solid #e5e5ed', opacity 0.85

카드 헤더 (padding 16px, cursor pointer, onClick 펼치기/접기):
  flex row:
  좌: 미읽음 파란 점(8px) 또는 읽음 회색 점(8px)
  중:
    "홍길동님의 웨딩 문의" (이름 + 촬영유형) 14px 600
    발신자 이메일 13px textMuted
    희망 날짜/예산 태그 (있을 때, 11px chip, bg surfaceDim)
  우:
    시간 상대값 (n분 전/n시간 전/n일 전) 12px textMuted
    ▾/▸ 토글 아이콘

카드 본문 (접힌 상태: display none / 열린 상태 부드럽게 펼쳐짐):
  메시지 본문 (14px lh 1.7, padding 0 16px 16px, border-top '#e5e5ed')
  하단 액션 버튼 row (margin-top 12px, flex gap 8px):
    [✉️ 이메일로 답변] primary sm → window.open('mailto:{email}?subject=...')
    [✓ 읽음 표시] secondary sm (미읽음 카드만)
    [🗑️ 삭제] ghost sm danger hover → 확인 후 삭제

== 빈 상태 ==

전체 탭: "아직 받은 문의가 없습니다" + 작은 안내 텍스트
미읽음 탭: "모든 문의를 읽었습니다 ✓" success 색상

목 데이터: 문의 5개 (미읽음 2개, 읽음 3개, 다양한 촬영 유형)

데모: 전체/미읽음 탭 전환, 카드 펼치기/접기, 읽음 표시, 삭제
```

### 통합 방법

```jsx
// InquiryInboxPage.jsx
const handleMarkRead = async (inquiryId) => {
  await inquiryApi.markRead(inquiryId)
  setInquiries(prev => prev.map(i => i.id === inquiryId ? { ...i, isRead: true } : i))
}
const handleDelete = async (inquiryId) => {
  if (!window.confirm('삭제하시겠습니까?')) return
  await inquiryApi.remove(inquiryId)
  setInquiries(prev => prev.filter(i => i.id !== inquiryId))
}
const handleReply = (email, senderName) => {
  window.open(`mailto:${email}?subject=촬영 문의 답변&body=안녕하세요 ${senderName}님,`)
}
```

---

## 완료 체크리스트

- [ ] SeriesCard.jsx 생성 (커버/제목/설명/버튼 row)
- [ ] PhotoPickerModal.jsx 생성 (체크박스 3컬럼 그리드)
- [ ] SeriesPage에 SeriesCard + PhotoPickerModal 연결
- [ ] seriesApi.addPhoto / removePhoto 연동 확인
- [ ] InquiryFormPage 촬영 유형 7개 칩 UI 추가
- [ ] InquiryFormPage 성공 상태 화면 구현
- [ ] 성공 후 [포트폴리오 보기] 버튼 → /portfolio/:profileName 이동
- [ ] InquiryCard.jsx 생성 (펼치기/접기, 읽음/미읽음)
- [ ] InquiryInboxPage 전체/미읽음 탭 필터 추가
- [ ] [이메일로 답변] mailto: 링크 연결
- [ ] [읽음 표시] inquiryApi.markRead 연동
- [ ] [삭제] inquiryApi.remove 연동
- [ ] 미읽음 배지 실시간 갱신 확인
