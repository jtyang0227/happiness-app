# SNAPDAY 병합 — 결과·TODO (2026-11-25)

진행 기록은 `DESIGN_PROMPTS/planning/WORK_QUEUE.md` "SNAPDAY 출사 기능 병합"(커밋 해시 포함). 여기는 지시서 PART 19 보고 항목 정리.

## 구현 완료 (TS 전환본 — 새 API `apps/api` + 웹 `apps/web`)
- 월간 출사 투표: 연간 목록(`/gatherings/polls`), 달력 투표(`/gatherings/polls/:id`) — 토·일·공휴일 자동 후보, 평일 추가, 날짜별 가능/불가/지우기, 서버 집계(모두 같은 값), 최소 인원 반영 추천, 마감·다시 열기·리마인드, 운영자 확정 → 모임 생성 + 가능 응답자 알림, 자동 마감·마감 24시간 전 알림 배치
- 공휴일: 관리자 수동 등록·삭제, 공공데이터포털 가져오기(키 있을 때)
- 출사 시작·종료(현장 모드), 진행 중 배너
- AI 계절 추천: Gemini 구조화 결과(주소·영업시간·상호 생성 금지 지시), 출처 배지, 추가 질문, 장소 투표 후보 등록, 키 없으면 SAMPLE
- 베스트 포토: 1인 3표, 인기/최신·회원 필터, 메달
- 스토리: 9:16 편집기(사진 1~3장 레이아웃·배경·텍스트 드래그·스티커·멤버 태그 복사·이미지에 넣기), PNG 저장·Web Share·등록, 스토리 모음, 태그 알림
- 마이페이지: 프로필 "출사 기록"(참여 횟수·참여한 출사·내 스토리)
- 이미 있던 것 재사용: 회원가입·소셜 로그인·프로필(취향·지역·인스타그램 ID), 참가 신청·대기자, 현장 피드·좋아요·댓글, 앨범, 사진 ↔ 스팟, 앱 내 알림, 신고·차단, 관리자 권한

## 미구현 (다음 단계)
- [ ] 모바일(Expo) 화면 — 투표 달력·AI 추천·스토리·베스트 포토 (웹은 반응형으로 모바일 브라우저에서 동작)
- [x] 월간·연말 베스트 포토 집계 화면 — `/gatherings/best`, API `GET /api/gatherings/best/ranking`(2026-11-25)
- [ ] AI 장소 비교 화면, 추천·투표 결과 공유 이미지
- [x] 일정 변경 알림 — 모임 수정에서 시작 시각·장소가 바뀌면 참여자·대기자에게 `SCHEDULE_CHANGED`(2026-11-25)
- [ ] 운영 웹 반영 — 지금 운영은 `frontend/`(CRA)·Spring. 컷오버(`PROMPT_ts-cutover.md`) 후에 보인다

## 외부 연동이 필요한 기능
| 기능 | 상태 | 필요한 것 |
|---|---|---|
| AI 추천(실제) | 구조 완료, 키 없으면 SAMPLE | 서버 `GEMINI_API_KEY` |
| 공휴일 자동 가져오기 | 구조 완료(응답 파서 단위 테스트), 실제 호출 미확인 | 서버 `HOLIDAY_API_KEY`(공공데이터포털 "한국천문연구원_특일 정보") |
| 날씨·강수·일출일몰 | 미연동 | 기상청 단기예보 API |
| 푸시 알림 | 미연동(앱 내 알림만) | FCM |

## 환경 변수 (새 API 서버)
`GEMINI_API_KEY`, `GEMINI_MODEL`(선택), `HOLIDAY_API_KEY`, `HOLIDAY_API_URL`(선택, 기본 공공데이터포털 주소), `BATCH_ENABLED`(투표 자동 마감 배치 — Spring 운영 중엔 false). `.env.example`·`render.yaml`에 반영.

## 실행
`apps/api/scripts/dev-env.sh up` → `cd apps/web && REACT_APP_API_URL=http://localhost:8090/api npm run dev`. 관리자 기능은 회원 권한 WM/SA. 배치 즉시 실행: `cd apps/api && node scripts/run-batch.mjs outing-polls`.

## 테스트 결과 (2026-11-25)
- 계약 테스트: 새 API 95 통과(SNAPDAY 4 포함), Spring 91 통과·SNAPDAY 4 건너뜀(새 API 전용) / 단위 5(공휴일 응답 파서·AI 결과 정리) / 백엔드 62
- 웹: typecheck 0, 테스트 13, 빌드 성공
- Playwright(로컬 H2 아님 — PostgreSQL + 새 API): 공휴일 등록 → 투표 생성 → 회원 가능/불가(새로고침 유지) → 관리자 같은 집계 → 확정 → 모임·알림 → 출사 시작 → AI(SAMPLE) → 스토리 드래그·PNG 1080×1920 저장·등록 → 종료 → 베스트 포토 → 출사 기록. 390/1280 가로 넘침 0, 페이지 오류 0

## 다음 개발 우선순위
1. 컷오버(사용자 대시보드) — 그래야 운영에 보인다
2. `GEMINI_API_KEY`·`HOLIDAY_API_KEY` 설정 후 실제 결과 확인
3. 모바일 화면(투표 달력·스토리)
4. 기상청 날씨 연동, FCM 푸시
