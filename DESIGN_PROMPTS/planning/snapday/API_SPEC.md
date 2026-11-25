# SNAPDAY 병합 — API (새 API `apps/api`, 2026-11-25)

모임 API와 같은 형식: 성공은 래퍼 없는 JSON, 오류는 `ApiResponse{success:false, code, message}`(400·403·404·409·429·503).
인증은 Bearer JWT. "관리자" = 권한 WM/SA. 날짜는 `YYYY-MM-DD`, 시각은 `LocalDateTime` 문자열(시간대 표시 없음).
이 경로들은 새 API에만 있다(Spring에 없음) — 계약 테스트는 새 API에서만 돈다.

## 공휴일 `/api/outing/holidays`
| 메서드 | 경로 | 권한 | 설명 |
|---|---|---|---|
| GET | `?year=2027` | 공개 | `[{date, name, substitute, source}]` |
| POST | `/import?year=2027` | 관리자 | 공공데이터포털 특일정보(`getRestDeInfo`)에서 그 해 공휴일을 받아 저장(이미 있는 날짜는 이름 갱신). `HOLIDAY_API_KEY` 없으면 503 "공휴일 API 키가 설정되지 않았습니다…" → `{imported, year}` |
| POST | `` | 관리자 | 수동 등록 `{date, name, substitute}` (409 중복) |
| DELETE | `/{date}` | 관리자 | 삭제 |

## 월간 출사 투표 `/api/outing/polls`
| 메서드 | 경로 | 권한 | 설명 |
|---|---|---|---|
| GET | `?year=2027` | 공개 | 그 해 투표 목록 `[{id, year, month, title, status, startsAt, endsAt, voterCount, optionCount, gatheringId, confirmedDate}]` |
| GET | `/{id}` | 공개(로그인 시 내 응답 포함) | 상세: 투표 정보 + `options:[{id, date, dayKind, label, available, unavailable, mine}]`(`mine` = AVAILABLE·UNAVAILABLE·null) + `voterCount` + `recommended:[optionId…]`(가능 인원 최다, 최소 인원 이상) + `myRespondedAt`. 로그인 사용자 정보는 서버가 토큰으로 판단 |
| POST | `` | 관리자 | 생성 `{year, month, title?, description?, region?, startsAt?, endsAt?, minParticipants?, maxParticipants?}` → 그 달 토·일 + 등록된 공휴일을 후보로 자동 추가. 같은 달 409. 기본: 제목 "2027년 3월 출사", 시작 지금, 마감 그 달 1일 0시(이미 지났으면 7일 뒤) |
| PUT | `/{id}` | 관리자 | 제목·설명·지역·마감·인원 수정(확정 후 400) |
| POST | `/{id}/options` | 관리자 | 평일 등 날짜 추가 `{date}` — 그 달 날짜만, 중복 409, 공휴일이면 HOLIDAY |
| DELETE | `/{id}/options/{optionId}` | 관리자 | 후보 삭제(표도 함께) |
| PUT | `/{id}/votes` | 로그인 | 내 응답 저장 `{votes:[{optionId, availability}]}` — 보낸 날짜만 갱신, `availability:null`이면 그 날짜 응답 삭제. 투표 중(OPEN·기간 안)만 |
| POST | `/{id}/close` | 관리자 | 마감(OPEN→CLOSED) |
| POST | `/{id}/reopen` | 관리자 | 다시 열기(CLOSED→OPEN, 마감 시각이 지났으면 400) |
| POST | `/{id}/confirm` | 관리자 | 확정 `{optionId, title?, location, startTime:"10:00", endTime:"17:00", maxParticipants?, description?}` → **모임 생성**(모집 마감 = 출사 전날 18시) + 투표 CONFIRMED + "가능" 응답자에게 알림 → `{pollId, gatheringId}` |
| POST | `/{id}/remind` | 관리자 | 미응답 대상자에게 알림 → `{sent}` |
| DELETE | `/{id}` | 관리자 | 삭제(확정 전만) |

**대상자**(알림·미응답 계산): 최근 6개월 모임에 PARTICIPATING이었던 회원 ∪ 지난 투표 응답자. 투표 생성 시 대상자에게 `POLL_OPENED`, 마감 24시간 전 미응답 대상자에게 `POLL_CLOSING`(배치), 확정 시 가능 응답자에게 `POLL_CONFIRMED`(gathering_id = 새 모임).
**배치**(`BATCH_ENABLED`): 10분마다 — 마감 시각 지난 OPEN → CLOSED, 24시간 안 마감 → 알림 1회.

## 출사 현장 모드
| POST | `/api/gatherings/{id}/start` | 만든 사람·관리자 | RECRUITMENT_CLOSED·SCHEDULED·RECRUITING → ONGOING, 참여자에게 `GATHERING_STARTED` |
| POST | `/api/gatherings/{id}/end` | 만든 사람·관리자 | ONGOING → ENDED(앨범 공개), `GATHERING_ENDED` |

## AI 추천 `/api/gatherings/{id}/ai-recommendations`
| GET | `` | 공개 | 저장된 추천 최신순 `[{id, source, model, question, result, createdAt}]` |
| POST | `` | 만든 사람·참여자(PARTICIPATING·WAITING)·관리자 | 생성 `{question?}` — 모임 날짜·지역·계절·참여자 촬영 취향으로 Gemini 호출(`GEMINI_API_KEY`). 키가 없으면 **`source:"SAMPLE"`** 개발용 결과(계절별 일반 안내, 실제 장소 아님). 회원당 10분 5회(429) |

`result`: `{summary, season, places:[{name, area, reason, bestTime, shootingPoints[], concept, rainAlternative}], foods:[{name, note}], restaurantTip, transport, parking, weatherNote, cautions[]}`.
모델에게 **주소·영업시간·전화번호·확정된 개화/날씨를 만들지 말라**고 지시하고, 화면은 "AI 생성 — 방문 전 확인" + 카카오맵 검색 링크(이름 기준)만 보여 준다. 실제 날씨(기상청)·지도 상세는 연동 준비 상태.
장소 후보 등록은 기존 `PUT /api/gatherings/{id}/place-poll`(만든 사람)을 그대로 쓴다.

## 베스트 포토 `/api/gatherings/{id}/best`
| GET | `` | 공개(로그인 시 내 표) | `{photos:[{photoId, imageUrl, postId, memberName, votes}] 득표순, myVotes:[photoId], maxVotes:3, open}` — `open` = ENDED |
| POST | `/{photoId}` | 참여자 | 투표(ENDED만, 이 모임 사진만, 3표 초과 400, 멱등) |
| DELETE | `/{photoId}` | 참여자 | 취소 |

## 스토리 `/api/gatherings/{id}/stories`
| GET | `` | 공개 | `[{id, memberId, memberName, imageUrl, caption, taggedMembers:[{memberId, name, instagramId}], createdAt}]` |
| POST | `` | 참여자 | `{imageUrl, caption?, taggedMemberIds?}` — 이미지는 기존 `POST /api/upload/image?folder=stories`로 올린 주소 |
| DELETE | `/stories/{storyId}` (`/api/gatherings/stories/{storyId}`) | 작성자·관리자 | |
| GET | `/api/gatherings/stories/mine` | 로그인 | 내 스토리 |

멤버 태그는 기존 `GET /api/gatherings/{id}/instagram-candidates`(참여자 중 인스타그램 ID 등록자)를 쓴다.

## 마이페이지
| GET | `/api/gatherings/my/history` | 로그인 | 참여(PARTICIPATING)한 모임 중 ENDED·ONGOING 최신순 + 참여 횟수 `{count, items:[…]}` |
