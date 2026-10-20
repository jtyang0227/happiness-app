package com.happiness.app;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 핵심 경로 통합 테스트 (MASTER_PLAN v2 AC-T1).
 * dev 프로필(H2 in-memory)로 실제 Spring 컨텍스트 + JWT 필터를 그대로 태운다.
 * 테스트끼리 같은 DB를 공유하므로 회원 이메일·프로필명은 매번 랜덤으로 만든다.
 */
// 전역 IP rate limit(기본 100req/60s)은 이 테스트의 검증 대상이 아니다. 모든 요청이 같은 127.0.0.1에서 나가므로
// 테스트가 늘면 무작위 테스트가 429로 깨진다 — 이 클래스에서만 한도를 크게 올린다(운영 설정은 그대로).
@SpringBootTest(properties = {
        "security.rate-limit.capacity=100000",
        "security.rate-limit.refill-tokens=100000"
})
@AutoConfigureMockMvc
@ActiveProfiles("dev")
class CoreFlowIntegrationTest {

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper om;

    private record User(long id, String email, String profileName, String token) {}

    private User signupAndLogin() throws Exception {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        String email = "it-" + suffix + "@test.com";
        String profileName = "it" + suffix;
        String password = "Passw0rd!!";

        mvc.perform(post("/api/auth/signup").contentType(MediaType.APPLICATION_JSON)
                        .content(om.writeValueAsString(Map.of(
                                "email", email, "password", password, "name", "테스터",
                                "profileName", profileName, "termsAgreed", true, "privacyAgreed", true))))
                .andExpect(status().isCreated());

        MvcResult login = mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content(om.writeValueAsString(Map.of("email", email, "password", password))))
                .andExpect(status().isOk())
                .andReturn();
        String body = login.getResponse().getContentAsString();
        String token = JsonPath.read(body, "$.data.accessToken");
        Number id = JsonPath.read(body, "$.data.member.id");
        return new User(id.longValue(), email, profileName, token);
    }

    private static String bearer(User u) {
        return "Bearer " + u.token();
    }

    // ── 인증 ──────────────────────────────────────────────────────────

    @Test
    void 로그인은_이메일_대소문자와_무관하다() throws Exception {
        User u = signupAndLogin();
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content(om.writeValueAsString(Map.of(
                                "email", u.email().toUpperCase(), "password", "Passw0rd!!"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.accessToken").isNotEmpty());
    }

    @Test
    void 틀린_비밀번호는_로그인_실패() throws Exception {
        User u = signupAndLogin();
        MvcResult r = mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content(om.writeValueAsString(Map.of("email", u.email(), "password", "wrong-pass-1!"))))
                .andReturn();
        assertThat(r.getResponse().getStatus()).isGreaterThanOrEqualTo(400);
    }

    @Test
    void 인증이_필요한_API는_토큰_없이_401() throws Exception {
        mvc.perform(get("/api/booking")).andExpect(status().isUnauthorized());
    }

    // ── 사진 ──────────────────────────────────────────────────────────

    private long createPhoto(User owner) throws Exception {
        MvcResult r = mvc.perform(post("/api/photos").header("Authorization", bearer(owner))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(om.writeValueAsString(Map.of(
                                "memberId", owner.id(), "title", "테스트 사진",
                                "imageUrl", "https://example.com/a.jpg"))))
                .andExpect(status().isCreated())
                .andReturn();
        Number id = JsonPath.read(r.getResponse().getContentAsString(), "$.data.id");
        return id.longValue();
    }

    @Test
    void 사진_등록_후_공개_조회된다() throws Exception {
        User u = signupAndLogin();
        long photoId = createPhoto(u);

        mvc.perform(get("/api/photos/" + photoId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.title").value("테스트 사진"));
        mvc.perform(get("/api/photos").param("memberId", String.valueOf(u.id())))
                .andExpect(status().isOk());
    }

    @Test
    void 사진_목록은_page_파라미터가_있으면_페이지_단위로_응답한다() throws Exception {
        User u = signupAndLogin();
        for (int i = 0; i < 5; i++) createPhoto(u);
        String member = String.valueOf(u.id());

        mvc.perform(get("/api/photos").param("memberId", member).param("page", "0").param("size", "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(2))
                .andExpect(jsonPath("$.page").value(0))
                .andExpect(jsonPath("$.size").value(2))
                .andExpect(jsonPath("$.hasNext").value(true));
        mvc.perform(get("/api/photos").param("memberId", member).param("page", "2").param("size", "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.hasNext").value(false));

        // 키워드 검색 경로(메모리 페이지 자르기)도 같은 응답 형태
        mvc.perform(get("/api/photos").param("memberId", member).param("keyword", "테스트")
                        .param("page", "0").param("size", "3"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(3))
                .andExpect(jsonPath("$.hasNext").value(true));

        // page 미지정 시 기존처럼 전체 배열, 페이지 메타 없음
        mvc.perform(get("/api/photos").param("memberId", member))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(5))
                .andExpect(jsonPath("$.hasNext").doesNotExist());
    }

    // ── IDOR: 남의 리소스는 건드릴 수 없다 ─────────────────────────────

    @Test
    void 다른_회원_명의로_사진을_등록할_수_없다() throws Exception {
        User owner = signupAndLogin();
        User attacker = signupAndLogin();
        mvc.perform(post("/api/photos").header("Authorization", bearer(attacker))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(om.writeValueAsString(Map.of(
                                "memberId", owner.id(), "title", "사칭", "imageUrl", "https://example.com/x.jpg"))))
                .andExpect(status().isForbidden());
    }

    @Test
    void 다른_회원의_사진은_수정_삭제할_수_없다() throws Exception {
        User owner = signupAndLogin();
        User attacker = signupAndLogin();
        long photoId = createPhoto(owner);

        mvc.perform(put("/api/photos/" + photoId).header("Authorization", bearer(attacker))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(om.writeValueAsString(Map.of("title", "탈취"))))
                .andExpect(status().isForbidden());
        mvc.perform(delete("/api/photos/" + photoId).header("Authorization", bearer(attacker)))
                .andExpect(status().isForbidden());

        // 원본은 그대로 남아 있어야 한다
        mvc.perform(get("/api/photos/" + photoId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.title").value("테스트 사진"));
    }

    @Test
    void 본인_사진은_수정_삭제할_수_있다() throws Exception {
        User owner = signupAndLogin();
        long photoId = createPhoto(owner);

        mvc.perform(put("/api/photos/" + photoId).header("Authorization", bearer(owner))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(om.writeValueAsString(Map.of("title", "수정됨"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.title").value("수정됨"));
        mvc.perform(delete("/api/photos/" + photoId).header("Authorization", bearer(owner)))
                .andExpect(status().isOk());
    }

    @Test
    void 다른_회원의_프로필은_수정할_수_없다() throws Exception {
        User owner = signupAndLogin();
        User attacker = signupAndLogin();
        mvc.perform(put("/api/auth/member/" + owner.id() + "/profile").header("Authorization", bearer(attacker))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(om.writeValueAsString(Map.of("name", "탈취된이름"))))
                .andExpect(status().isForbidden());

        mvc.perform(put("/api/auth/member/" + owner.id() + "/profile").header("Authorization", bearer(owner))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(om.writeValueAsString(Map.of("name", "새이름"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.name").value("새이름"));
    }

    @Test
    void 다른_회원의_계정은_삭제할_수_없다() throws Exception {
        User owner = signupAndLogin();
        User attacker = signupAndLogin();
        mvc.perform(delete("/api/auth/member/" + owner.id()).header("Authorization", bearer(attacker)))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/auth/member/" + owner.id()).header("Authorization", bearer(owner)))
                .andExpect(status().isOk());
    }

    // ── 예약 ──────────────────────────────────────────────────────────

    private void openAllDays(User u) throws Exception {
        // Feature 39 회귀 재현: 프론트는 JSON 키 "active"로 보낸다(Lombok boolean isActive → active).
        mvc.perform(put("/api/booking/availability-settings").header("Authorization", bearer(u))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(om.writeValueAsString(Map.of(
                                "weekdays", "1,2,3,4,5,6,7", "timeSlots", "10:00,14:00",
                                "bufferHours", 0, "active", true))))
                .andExpect(status().is2xxSuccessful());
    }

    @Test
    void 가용시간_저장_후에도_예약_가능일이_남아있다() throws Exception {
        User u = signupAndLogin();
        openAllDays(u);

        LocalDate next = LocalDate.now().plusMonths(1);
        MvcResult r = mvc.perform(get("/api/booking/" + u.profileName() + "/availability")
                        .param("year", String.valueOf(next.getYear()))
                        .param("month", String.valueOf(next.getMonthValue())))
                .andExpect(status().isOk())
                .andReturn();
        List<String> dates = JsonPath.read(r.getResponse().getContentAsString(), "$.availableDates");
        assertThat(dates).isNotEmpty();
    }

    @Test
    void 예약_생성_확정_흐름과_타인_확정_차단() throws Exception {
        User photographer = signupAndLogin();
        User stranger = signupAndLogin();
        openAllDays(photographer);

        String shootDate = LocalDate.now().plusDays(7).toString();
        MvcResult created = mvc.perform(post("/api/booking/" + photographer.profileName())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(om.writeValueAsString(Map.of(
                                "shootDate", shootDate, "shootTime", "10:00", "shootType", "PROFILE",
                                "clientName", "의뢰인", "clientPhone", "010-0000-0000",
                                "clientEmail", "client@test.com"))))
                .andExpect(status().isCreated())
                .andReturn();
        Number bookingId = JsonPath.read(created.getResponse().getContentAsString(), "$.id");

        // 같은 슬롯 중복 예약 → 409
        mvc.perform(post("/api/booking/" + photographer.profileName())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(om.writeValueAsString(Map.of(
                                "shootDate", shootDate, "shootTime", "10:00", "shootType", "PROFILE",
                                "clientName", "다른의뢰인", "clientPhone", "010-1111-1111",
                                "clientEmail", "other@test.com"))))
                .andExpect(status().isConflict());

        // 타인은 확정할 수 없다
        MvcResult hijack = mvc.perform(put("/api/booking/" + bookingId + "/confirm")
                        .header("Authorization", bearer(stranger)))
                .andReturn();
        assertThat(hijack.getResponse().getStatus()).isIn(403, 404);

        // 작가 본인은 확정할 수 있다
        mvc.perform(put("/api/booking/" + bookingId + "/confirm").header("Authorization", bearer(photographer)))
                .andExpect(status().is2xxSuccessful());
        mvc.perform(get("/api/booking").param("status", "CONFIRMED").header("Authorization", bearer(photographer)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(bookingId.longValue()));
    }
    // ── 작업 노트 (PLANNING_portfolio-work-notes-concept.md) ────────────

    @Test
    void 시리즈_작업노트_필드를_저장하고_공개_조회한다() throws Exception {
        User owner = signupAndLogin();
        MvcResult created = mvc.perform(post("/api/series").header("Authorization", bearer(owner))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(om.writeValueAsString(Map.of(
                                "memberId", owner.id(), "title", "봄 스몰웨딩",
                                "shootType", "결혼식", "clientLabel", "개인 의뢰",
                                "shotOn", "2026.05", "story", "<b>자연광</b>만 사용했다."))))
                .andExpect(status().isCreated())
                .andReturn();
        Number seriesId = JsonPath.read(created.getResponse().getContentAsString(), "$.id");

        mvc.perform(get("/api/series/" + seriesId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.shootType").value("결혼식"))
                .andExpect(jsonPath("$.clientLabel").value("개인 의뢰"))
                .andExpect(jsonPath("$.shotOn").value("2026.05"))
                .andExpect(jsonPath("$.story").value("자연광만 사용했다."));

        // 빈 문자열은 비우기, 생략(null)은 유지
        mvc.perform(put("/api/series/" + seriesId).header("Authorization", bearer(owner))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(om.writeValueAsString(Map.of("clientLabel", ""))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.clientLabel").doesNotExist())
                .andExpect(jsonPath("$.shootType").value("결혼식"));
    }

    @Test
    void 시리즈_작업노트_잘못된_값은_400() throws Exception {
        User owner = signupAndLogin();
        mvc.perform(post("/api/series").header("Authorization", bearer(owner))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(om.writeValueAsString(Map.of(
                                "memberId", owner.id(), "title", "x", "shootType", "WEDDING"))))
                .andExpect(status().isBadRequest());
        mvc.perform(post("/api/series").header("Authorization", bearer(owner))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(om.writeValueAsString(Map.of(
                                "memberId", owner.id(), "title", "x", "shotOn", "2026-05"))))
                .andExpect(status().isBadRequest());
    }

    @Test
    void 다른_회원_명의로_시리즈를_만들_수_없다() throws Exception {
        User owner = signupAndLogin();
        User attacker = signupAndLogin();
        mvc.perform(post("/api/series").header("Authorization", bearer(attacker))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(om.writeValueAsString(Map.of("memberId", owner.id(), "title", "사칭"))))
                .andExpect(status().isForbidden());
    }
    // ── 문의 (출처 작업 + 수신함 소유권) ─────────────────────────────

    private long createSeries(User owner, String title) throws Exception {
        MvcResult r = mvc.perform(post("/api/series").header("Authorization", bearer(owner))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(om.writeValueAsString(Map.of("memberId", owner.id(), "title", title))))
                .andExpect(status().isCreated()).andReturn();
        return ((Number) JsonPath.read(r.getResponse().getContentAsString(), "$.id")).longValue();
    }

    private void sendInquiry(User receiver, Long sourceSeriesId) throws Exception {
        Map<String, Object> body = new java.util.HashMap<>(Map.of(
                "receiverMemberId", receiver.id(), "senderName", "고객", "senderEmail", "c@test.com",
                "shootType", "결혼식", "message", "문의드립니다"));
        if (sourceSeriesId != null) body.put("sourceSeriesId", sourceSeriesId);
        mvc.perform(post("/api/inquiry").contentType(MediaType.APPLICATION_JSON)
                        .content(om.writeValueAsString(body)))
                .andExpect(status().isCreated());
    }

    @Test
    void 작업페이지에서_온_문의는_출처_작업이_수신함에_표시된다() throws Exception {
        User owner = signupAndLogin();
        User other = signupAndLogin();
        long mine = createSeries(owner, "봄 스몰웨딩");
        long others = createSeries(other, "남의 작업");

        sendInquiry(owner, mine);
        sendInquiry(owner, others);   // 수신 작가의 작업이 아니면 출처는 버려진다

        mvc.perform(get("/api/inquiry/inbox").param("memberId", String.valueOf(owner.id()))
                        .header("Authorization", bearer(owner)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[?(@.sourceSeriesId == " + mine + ")].sourceSeriesTitle").value("봄 스몰웨딩"))
                .andExpect(jsonPath("$[?(@.sourceSeriesId == " + others + ")]").isEmpty());
    }

    @Test
    void 다른_회원의_문의함은_조회_수정_삭제할_수_없다() throws Exception {
        User owner = signupAndLogin();
        User attacker = signupAndLogin();
        sendInquiry(owner, null);
        MvcResult inbox = mvc.perform(get("/api/inquiry/inbox").param("memberId", String.valueOf(owner.id()))
                        .header("Authorization", bearer(owner)))
                .andExpect(status().isOk()).andReturn();
        Number inquiryId = JsonPath.read(inbox.getResponse().getContentAsString(), "$[0].id");

        mvc.perform(get("/api/inquiry/inbox").param("memberId", String.valueOf(owner.id()))
                        .header("Authorization", bearer(attacker)))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/inquiry/inbox/unread-count").param("memberId", String.valueOf(owner.id()))
                        .header("Authorization", bearer(attacker)))
                .andExpect(status().isForbidden());
        mvc.perform(put("/api/inquiry/" + inquiryId + "/read").header("Authorization", bearer(attacker)))
                .andExpect(status().isForbidden());
        mvc.perform(delete("/api/inquiry/" + inquiryId).header("Authorization", bearer(attacker)))
                .andExpect(status().isForbidden());

        // 본인은 그대로 가능
        mvc.perform(put("/api/inquiry/" + inquiryId + "/read").header("Authorization", bearer(owner)))
                .andExpect(status().isOk());
        mvc.perform(delete("/api/inquiry/" + inquiryId).header("Authorization", bearer(owner)))
                .andExpect(status().isNoContent());
    }
    // ── 작업 노트 P2 ────────────────────────────────────────────────────

    @Test
    void 추천사는_본인_작업에만_연결할_수_있다() throws Exception {
        User owner = signupAndLogin();
        User other = signupAndLogin();
        long mine = createSeries(owner, "내 작업");
        long others = createSeries(other, "남의 작업");

        mvc.perform(post("/api/testimonials").header("Authorization", bearer(owner))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(om.writeValueAsString(Map.of("clientName", "고객", "content", "좋았어요", "seriesId", mine))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.seriesId").value(mine));
        mvc.perform(post("/api/testimonials").header("Authorization", bearer(owner))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(om.writeValueAsString(Map.of("clientName", "고객", "content", "x", "seriesId", others))))
                .andExpect(status().isBadRequest());
        mvc.perform(get("/api/testimonials/member/" + owner.id()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].seriesId").value(mine));
    }

    @Test
    void 대표_작업은_작가당_하나만_고정된다() throws Exception {
        User owner = signupAndLogin();
        long a = createSeries(owner, "A");
        long b = createSeries(owner, "B");
        for (long id : new long[]{a, b}) {
            mvc.perform(put("/api/series/" + id).header("Authorization", bearer(owner))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(om.writeValueAsString(Map.of("pinned", true))))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.pinned").value(true));
        }
        mvc.perform(get("/api/series/" + a)).andExpect(jsonPath("$.pinned").value(false));
        mvc.perform(get("/api/series/" + b)).andExpect(jsonPath("$.pinned").value(true));
    }

    private void track(long memberId, long seriesId) throws Exception {
        mvc.perform(post("/api/analytics/track").contentType(MediaType.APPLICATION_JSON)
                        .content(om.writeValueAsString(Map.of(
                                "eventType", "WORK_VIEW", "targetType", "SERIES",
                                "targetId", seriesId, "memberId", memberId,
                                "visitorToken", UUID.randomUUID().toString().replace("-", "")))))
                .andExpect(status().isOk());
    }

    @Test
    void 많이_본_작업은_조회수와_작업별_문의수를_보여준다() throws Exception {
        User owner = signupAndLogin();
        User other = signupAndLogin();
        long work = createSeries(owner, "봄 스몰웨딩");
        long othersWork = createSeries(other, "남의 작업");

        track(owner.id(), work);
        track(owner.id(), work);
        track(owner.id(), othersWork);       // 소유자가 다른 작업 → 기록되지 않아야 한다
        sendInquiry(owner, work);

        mvc.perform(get("/api/analytics/top-works").param("memberId", String.valueOf(owner.id()))
                        .header("Authorization", bearer(owner)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].seriesId").value(work))
                .andExpect(jsonPath("$[0].views").value(2))
                .andExpect(jsonPath("$[0].inquiries").value(1));

        // 문의는 서버가 INQUIRY_SENT로 직접 기록 → KPI에 반영
        mvc.perform(get("/api/analytics/summary").param("memberId", String.valueOf(owner.id()))
                        .header("Authorization", bearer(owner)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.inquiryCount").value(1));

        mvc.perform(get("/api/analytics/top-works").param("memberId", String.valueOf(owner.id()))
                        .header("Authorization", bearer(other)))
                .andExpect(status().isForbidden());
    }
    // ── 사진 좋아요 IDOR + 인기 사진/사진 조회 분석 ───────────────────────

    @Test
    void 남의_이름으로_좋아요_저장할_수_없다() throws Exception {
        User owner = signupAndLogin();
        User fan = signupAndLogin();
        long photoId = createPhoto(owner);

        mvc.perform(post("/api/photos/" + photoId + "/likes").param("memberId", String.valueOf(owner.id()))
                        .header("Authorization", bearer(fan)))
                .andExpect(status().isForbidden());
        mvc.perform(post("/api/photos/" + photoId + "/saves").param("memberId", String.valueOf(owner.id()))
                        .header("Authorization", bearer(fan)))
                .andExpect(status().isForbidden());
        mvc.perform(post("/api/photos/" + photoId + "/likes").param("memberId", String.valueOf(fan.id()))
                        .header("Authorization", bearer(fan)))
                .andExpect(status().isCreated());
    }

    @Test
    void 인기_사진은_카운터와_조회_이벤트로_집계된다() throws Exception {
        User owner = signupAndLogin();
        User fan = signupAndLogin();
        long liked = createPhoto(owner);
        long viewed = createPhoto(owner);
        long othersPhoto = createPhoto(fan);

        mvc.perform(post("/api/photos/" + liked + "/likes").param("memberId", String.valueOf(fan.id()))
                        .header("Authorization", bearer(fan)))
                .andExpect(status().isCreated());

        for (long target : new long[]{viewed, viewed, othersPhoto}) {   // 남의 사진은 기록되지 않아야 한다
            mvc.perform(post("/api/analytics/track").contentType(MediaType.APPLICATION_JSON)
                            .content(om.writeValueAsString(Map.of(
                                    "eventType", "PHOTO_VIEW", "targetType", "PHOTO", "targetId", target,
                                    "memberId", owner.id(), "visitorToken", UUID.randomUUID().toString().replace("-", "")))))
                    .andExpect(status().isOk());
        }

        mvc.perform(get("/api/analytics/top-photos").param("memberId", String.valueOf(owner.id()))
                        .param("metric", "likes").header("Authorization", bearer(owner)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].photoId").value(liked))
                .andExpect(jsonPath("$[0].count").value(1));

        mvc.perform(get("/api/analytics/top-photos").param("memberId", String.valueOf(owner.id()))
                        .param("metric", "views").header("Authorization", bearer(owner)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].photoId").value(viewed))
                .andExpect(jsonPath("$[0].count").value(2));

        mvc.perform(get("/api/analytics/summary").param("memberId", String.valueOf(owner.id()))
                        .header("Authorization", bearer(owner)))
                .andExpect(jsonPath("$.photoViews").value(2));
    }

    // ── 작업 탐색 (PLANNING_work-discovery.md) ─────────────────────────

    private void updateProfile(User u, Map<String, Object> fields) throws Exception {
        mvc.perform(put("/api/auth/member/" + u.id() + "/profile").header("Authorization", bearer(u))
                        .contentType(MediaType.APPLICATION_JSON).content(om.writeValueAsString(fields)))
                .andExpect(status().isOk());
    }

    /** 유형을 붙이고 사진을 photoCount장 넣은 작업 */
    private long createWork(User owner, String title, String shootType, int photoCount) throws Exception {
        long id = createSeries(owner, title);
        mvc.perform(put("/api/series/" + id).header("Authorization", bearer(owner))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(om.writeValueAsString(Map.of("title", title, "shootType", shootType))))
                .andExpect(status().isOk());
        for (int i = 0; i < photoCount; i++) {
            long photoId = createPhoto(owner);
            mvc.perform(post("/api/series/" + id + "/photos").header("Authorization", bearer(owner))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(om.writeValueAsString(Map.of("photoId", photoId))))
                    .andExpect(status().is2xxSuccessful());
        }
        return id;
    }

    private List<Number> discoverIds(String... params) throws Exception {
        var req = get("/api/series/discover");
        for (int i = 0; i < params.length; i += 2) req = req.param(params[i], params[i + 1]);
        String body = mvc.perform(req).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return JsonPath.read(body, "$.data[*].id");
    }

    @Test
    void 작업_탐색은_공개_작가의_사진이_있는_작업만_필터대로_보여준다() throws Exception {
        // 테스트끼리 DB를 공유하므로 지역 문자열에 고유 태그를 넣어 이 테스트의 작업만 걸러낸다
        String tag = "t" + UUID.randomUUID().toString().substring(0, 8);
        User seoul = signupAndLogin();
        User busan = signupAndLogin();
        User hidden = signupAndLogin();
        updateProfile(seoul, Map.of("location", "서울 " + tag));
        updateProfile(busan, Map.of("location", "부산 " + tag));
        updateProfile(hidden, Map.of("location", "서울 " + tag, "publicProfile", false));

        long wedding = createWork(seoul, "한옥 스몰웨딩", "결혼식", 2);
        long emptyWork = createWork(seoul, "사진 없는 작업", "가족", 0);
        long busanWedding = createWork(busan, "해운대 웨딩", "결혼식", 1);
        long privateWork = createWork(hidden, "비공개 작가 작업", "결혼식", 1);

        assertThat(discoverIds("location", tag))
                .extracting(Number::longValue)
                .contains(wedding, busanWedding)
                .doesNotContain(emptyWork, privateWork);
        assertThat(discoverIds("location", "서울 " + tag.toUpperCase()))  // 대소문자 무시
                .extracting(Number::longValue).containsExactly(wedding);
        assertThat(discoverIds("location", tag, "shootType", "가족")).isEmpty();
        // 모르는 유형은 400이 아니라 전체로 처리
        assertThat(discoverIds("location", tag, "shootType", "없는유형"))
                .extracting(Number::longValue).containsExactlyInAnyOrder(wedding, busanWedding);

        String page0 = mvc.perform(get("/api/series/discover").param("location", tag).param("size", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.hasNext").value(true))
                .andReturn().getResponse().getContentAsString();
        assertThat((Number) JsonPath.read(page0, "$.data[0].photoCount")).isNotNull();
    }

    @Test
    void 예약_받는_중은_가용_설정을_켠_작가에게만_표시된다() throws Exception {
        String tag = "t" + UUID.randomUUID().toString().substring(0, 8);
        User open = signupAndLogin();
        User notSet = signupAndLogin();
        updateProfile(open, Map.of("location", tag));
        updateProfile(notSet, Map.of("location", tag));
        long openWork = createWork(open, "예약 받는 작가", "인물/프로필", 1);
        createWork(notSet, "설정 안 한 작가", "인물/프로필", 1);
        openAllDays(open);

        String body = mvc.perform(get("/api/series/discover").param("location", tag))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        List<Map<String, Object>> works = JsonPath.read(body, "$.data");
        assertThat(works).hasSize(2);
        for (Map<String, Object> w : works) {
            boolean isOpen = ((Number) w.get("id")).longValue() == openWork;
            assertThat(w.get("acceptingBookings")).as(body).isEqualTo(isOpen);
            if (isOpen) assertThat(w.get("memberProfileName")).isEqualTo(open.profileName());
        }
        mvc.perform(get("/api/portfolio/" + open.profileName()))
                .andExpect(jsonPath("$.acceptingBookings").value(true));
        mvc.perform(get("/api/portfolio/" + notSet.profileName()))
                .andExpect(jsonPath("$.acceptingBookings").value(false));

        // 설정을 끄면 배지도 내려간다
        mvc.perform(put("/api/booking/availability-settings").header("Authorization", bearer(open))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(om.writeValueAsString(Map.of(
                                "weekdays", "1,2,3,4,5", "timeSlots", "10:00", "bufferHours", 0, "active", false))))
                .andExpect(status().is2xxSuccessful());
        mvc.perform(get("/api/portfolio/" + open.profileName()))
                .andExpect(jsonPath("$.acceptingBookings").value(false));
    }

    // ── 작업 감상 + 공개 조회수 (WORK_QUEUE 3) ─────────────────────────

    @Test
    void 작업_감상은_회원당_한번이고_본인_작업에는_할_수_없다() throws Exception {
        String tag = "t" + UUID.randomUUID().toString().substring(0, 8);
        User owner = signupAndLogin();
        User fan = signupAndLogin();
        updateProfile(owner, Map.of("location", tag));
        long work = createWork(owner, "감상 테스트 작업", "결혼식", 1);

        mvc.perform(post("/api/series/" + work + "/appreciation"))
                .andExpect(status().isUnauthorized());
        mvc.perform(post("/api/series/" + work + "/appreciation").header("Authorization", bearer(owner)))
                .andExpect(status().isBadRequest());
        for (int i = 0; i < 2; i++) {   // 두 번 눌러도 1
            mvc.perform(post("/api/series/" + work + "/appreciation").header("Authorization", bearer(fan)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.appreciationCount").value(1))
                    .andExpect(jsonPath("$.appreciatedByMe").value(true));
        }
        mvc.perform(get("/api/series/" + work).header("Authorization", bearer(fan)))
                .andExpect(jsonPath("$.appreciationCount").value(1))
                .andExpect(jsonPath("$.appreciatedByMe").value(true));
        mvc.perform(get("/api/series/" + work))
                .andExpect(jsonPath("$.appreciatedByMe").value(false));
        // 인증 경로 — 토큰 없으면 401(웹은 이걸로 토큰 재발급을 탄다), 있으면 정확한 값
        mvc.perform(get("/api/series/" + work + "/appreciation")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/series/" + work + "/appreciation").header("Authorization", bearer(fan)))
                .andExpect(jsonPath("$.appreciatedByMe").value(true));

        track(owner.id(), work);
        track(owner.id(), work);
        mvc.perform(get("/api/series/discover").param("location", tag))
                .andExpect(jsonPath("$.data[0].appreciationCount").value(1))
                .andExpect(jsonPath("$.data[0].viewCount").value(2));
        mvc.perform(get("/api/series/" + work)).andExpect(jsonPath("$.viewCount").value(2));

        mvc.perform(delete("/api/series/" + work + "/appreciation").header("Authorization", bearer(fan)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.appreciationCount").value(0));

        // 감상이 남은 작업도 삭제할 수 있다(연관 행 정리)
        mvc.perform(post("/api/series/" + work + "/appreciation").header("Authorization", bearer(fan)))
                .andExpect(status().isOk());
        mvc.perform(delete("/api/series/" + work).header("Authorization", bearer(owner)))
                .andExpect(status().isNoContent());
    }
}
