package com.happiness.app;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.happiness.app.member.entity.Authority;
import com.happiness.app.member.repository.MemberRepository;
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
import java.util.HashMap;
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
    @Autowired MemberRepository memberRepository;

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
    void 회원가입_입력_오류는_500이_아니라_400과_사유() throws Exception {
        User u = signupAndLogin();
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        // 대소문자만 다른 중복 이메일 — 예전엔 중복 검사를 통과한 뒤 DB 유니크 제약에서 500
        mvc.perform(post("/api/auth/signup").contentType(MediaType.APPLICATION_JSON)
                        .content(om.writeValueAsString(Map.of(
                                "email", u.email().toUpperCase(), "password", "Passw0rd!!", "name", "테스터",
                                "profileName", "dup" + suffix, "termsAgreed", true))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("이미 등록된 이메일입니다."));
        // 하이픈으로 끝나는 프로필 주소 — 서버 형식 검증 실패
        mvc.perform(post("/api/auth/signup").contentType(MediaType.APPLICATION_JSON)
                        .content(om.writeValueAsString(Map.of(
                                "email", "new-" + suffix + "@test.com", "password", "Passw0rd!!", "name", "테스터",
                                "profileName", "bad-" + suffix + "-", "termsAgreed", true))))
                .andExpect(status().isBadRequest());
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

    // ── 탐색 정렬 (WORK_QUEUE 4) ──────────────────────────────────────

    private void trackPhotoView(long ownerId, long photoId) throws Exception {
        mvc.perform(post("/api/analytics/track").contentType(MediaType.APPLICATION_JSON)
                        .content(om.writeValueAsString(Map.of(
                                "eventType", "PHOTO_VIEW", "targetType", "PHOTO", "targetId", photoId,
                                "memberId", ownerId, "visitorToken", UUID.randomUUID().toString().replace("-", "")))))
                .andExpect(status().isOk());
    }

    @Test
    void 작업_탐색은_감상순_조회순으로_정렬된다() throws Exception {
        String tag = "t" + UUID.randomUUID().toString().substring(0, 8);
        User owner = signupAndLogin();
        User fan1 = signupAndLogin();
        User fan2 = signupAndLogin();
        updateProfile(owner, Map.of("location", tag));
        long w1 = createWork(owner, "정렬 1", "가족", 1);
        long w2 = createWork(owner, "정렬 2", "가족", 1);
        long w3 = createWork(owner, "정렬 3", "가족", 1);
        for (User f : List.of(fan1, fan2)) {
            mvc.perform(post("/api/series/" + w2 + "/appreciation").header("Authorization", bearer(f))).andExpect(status().isOk());
        }
        mvc.perform(post("/api/series/" + w3 + "/appreciation").header("Authorization", bearer(fan1))).andExpect(status().isOk());
        for (int i = 0; i < 3; i++) track(owner.id(), w3);
        track(owner.id(), w1);

        assertThat(discoverIds("location", tag, "sort", "appreciated"))
                .extracting(Number::longValue).containsExactly(w2, w3, w1);
        assertThat(discoverIds("location", tag, "sort", "viewed"))
                .extracting(Number::longValue).containsExactly(w3, w1, w2);
        assertThat(discoverIds("location", tag, "sort", "모르는값"))   // 최근 수정순으로 처리
                .extracting(Number::longValue).hasSize(3);
    }

    @Test
    void 사진은_조회순으로_정렬된다() throws Exception {
        User owner = signupAndLogin();
        long p0 = createPhoto(owner);
        long p1 = createPhoto(owner);
        long p2 = createPhoto(owner);
        trackPhotoView(owner.id(), p2);
        trackPhotoView(owner.id(), p2);
        trackPhotoView(owner.id(), p0);

        for (boolean paged : List.of(true, false)) {   // DB 서브쿼리 경로 / 메모리 정렬 경로
            var req = get("/api/photos").param("memberId", String.valueOf(owner.id())).param("sortBy", "views");
            if (paged) req = req.param("page", "0");
            String body = mvc.perform(req).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
            List<Number> ids = JsonPath.read(body, "$.data[*].id");
            assertThat(ids).as(paged ? "paged" : "unpaged").extracting(Number::longValue).containsExactly(p2, p0, p1);
        }
    }

    // ── 무드보드 (WORK_QUEUE 5) ──────────────────────────────────────

    @Test
    void 무드보드는_본인만_보고_사진을_담고_뺄_수_있다() throws Exception {
        User me = signupAndLogin();
        User other = signupAndLogin();
        User artist = signupAndLogin();
        long photo = createPhoto(artist);

        mvc.perform(get("/api/moodboards")).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/moodboards").header("Authorization", bearer(me))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"  \"}"))
                .andExpect(status().isBadRequest());
        String created = mvc.perform(post("/api/moodboards").header("Authorization", bearer(me))
                        .contentType(MediaType.APPLICATION_JSON).content(om.writeValueAsString(Map.of("name", "봄 웨딩 레퍼런스"))))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        long board = ((Number) JsonPath.read(created, "$.id")).longValue();

        for (int i = 0; i < 2; i++) {   // 두 번 담아도 1장
            mvc.perform(post("/api/moodboards/" + board + "/photos").header("Authorization", bearer(me))
                            .contentType(MediaType.APPLICATION_JSON).content(om.writeValueAsString(Map.of("photoId", photo))))
                    .andExpect(status().isOk());
        }
        mvc.perform(get("/api/moodboards").param("photoId", String.valueOf(photo)).header("Authorization", bearer(me)))
                .andExpect(jsonPath("$[0].itemCount").value(1))
                .andExpect(jsonPath("$[0].containsPhoto").value(true));
        mvc.perform(get("/api/moodboards/" + board).header("Authorization", bearer(me)))
                .andExpect(jsonPath("$.photos.length()").value(1));

        // 남의 보드는 보이지도, 고칠 수도 없다
        mvc.perform(get("/api/moodboards/" + board).header("Authorization", bearer(other))).andExpect(status().isNotFound());
        mvc.perform(post("/api/moodboards/" + board + "/photos").header("Authorization", bearer(other))
                        .contentType(MediaType.APPLICATION_JSON).content(om.writeValueAsString(Map.of("photoId", photo))))
                .andExpect(status().isNotFound());
        mvc.perform(delete("/api/moodboards/" + board).header("Authorization", bearer(other))).andExpect(status().isNotFound());
        mvc.perform(get("/api/moodboards").header("Authorization", bearer(other))).andExpect(jsonPath("$.length()").value(0));

        mvc.perform(put("/api/moodboards/" + board).header("Authorization", bearer(me))
                        .contentType(MediaType.APPLICATION_JSON).content(om.writeValueAsString(Map.of("name", "가을 웨딩"))))
                .andExpect(jsonPath("$.name").value("가을 웨딩"));

        // 작가가 사진을 지우면 보드에서도 빠진다
        mvc.perform(delete("/api/photos/" + photo).header("Authorization", bearer(artist))).andExpect(status().is2xxSuccessful());
        mvc.perform(get("/api/moodboards/" + board).header("Authorization", bearer(me)))
                .andExpect(jsonPath("$.photos.length()").value(0));
        mvc.perform(get("/api/moodboards").header("Authorization", bearer(me)))
                .andExpect(jsonPath("$[0].itemCount").value(0));

        mvc.perform(delete("/api/moodboards/" + board).header("Authorization", bearer(me))).andExpect(status().isNoContent());
        mvc.perform(get("/api/moodboards/" + board).header("Authorization", bearer(me))).andExpect(status().isNotFound());
    }

    // ── 공동 작업자 크레딧 (WORK_QUEUE 6) ───────────────────────────────

    @Test
    void 작업_크레딧은_저장되고_공개_회원만_링크된다() throws Exception {
        User owner = signupAndLogin();
        User makeup = signupAndLogin();
        long work = createSeries(owner, "크레딧 테스트");

        mvc.perform(put("/api/series/" + work).header("Authorization", bearer(owner))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(om.writeValueAsString(Map.of("title", "크레딧 테스트", "credits", List.of(
                                Map.of("role", "메이크업", "name", "이수아", "profileName", "@" + makeup.profileName()),
                                Map.of("role", "헤어", "name", "<b>박민</b>", "profileName", "nobody_here"),
                                Map.of("role", "", "name", "", "profileName", ""))))))   // 빈 줄은 무시
                .andExpect(status().isOk());
        mvc.perform(get("/api/series/" + work))
                .andExpect(jsonPath("$.credits.length()").value(2))
                .andExpect(jsonPath("$.credits[0].profileName").value(makeup.profileName()))
                .andExpect(jsonPath("$.credits[0].linked").value(true))
                .andExpect(jsonPath("$.credits[1].name").value("박민"))          // 태그 제거
                .andExpect(jsonPath("$.credits[1].linked").value(false));
        mvc.perform(get("/api/series").param("memberId", String.valueOf(owner.id())))
                .andExpect(jsonPath("$[0].credits.length()").value(2));

        mvc.perform(put("/api/series/" + work).header("Authorization", bearer(owner))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(om.writeValueAsString(Map.of("title", "크레딧 테스트",
                                "credits", List.of(Map.of("role", "모델", "name", ""))))))
                .andExpect(status().isBadRequest());

        mvc.perform(put("/api/series/" + work).header("Authorization", bearer(owner))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(om.writeValueAsString(Map.of("title", "크레딧 테스트", "credits", List.of()))))
                .andExpect(status().isOk());
        mvc.perform(get("/api/series/" + work)).andExpect(jsonPath("$.credits.length()").value(0));
    }

    // ── 작업 초안 (WORK_QUEUE 7) ─────────────────────────────────────

    private void setDraft(User owner, long work, boolean draft) throws Exception {
        mvc.perform(put("/api/series/" + work).header("Authorization", bearer(owner))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(om.writeValueAsString(Map.of("title", "초안 테스트", "draft", draft))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.draft").value(draft));
    }

    @Test
    void 초안_작업은_작가_본인만_본다() throws Exception {
        String tag = "t" + UUID.randomUUID().toString().substring(0, 8);
        User owner = signupAndLogin();
        User other = signupAndLogin();
        updateProfile(owner, Map.of("location", tag));
        long work = createWork(owner, "초안 테스트", "가족", 1);
        setDraft(owner, work, true);

        assertThat(discoverIds("location", tag)).isEmpty();
        mvc.perform(get("/api/series").param("memberId", String.valueOf(owner.id())))
                .andExpect(jsonPath("$.length()").value(0));
        mvc.perform(get("/api/portfolio/" + owner.profileName()))
                .andExpect(jsonPath("$.series.length()").value(0));
        mvc.perform(get("/api/series/" + work)).andExpect(status().isNotFound());
        mvc.perform(get("/api/series/" + work).header("Authorization", bearer(other))).andExpect(status().isNotFound());
        mvc.perform(post("/api/series/" + work + "/appreciation").header("Authorization", bearer(other)))
                .andExpect(status().isNotFound());
        mvc.perform(get("/api/series/" + work).header("Authorization", bearer(owner)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.draft").value(true));

        mvc.perform(get("/api/series/mine")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/series/mine").header("Authorization", bearer(owner)))
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].draft").value(true));

        setDraft(owner, work, false);
        assertThat(discoverIds("location", tag)).extracting(Number::longValue).containsExactly(work);
        mvc.perform(get("/api/series/" + work)).andExpect(status().isOk());
    }

    // ── 운영자 큐레이션 (WORK_QUEUE 8) ─────────────────────────────────

    /** 회원을 관리자(WM)로 올리고 새 토큰으로 다시 로그인 */
    private User promoteToAdmin(User u) throws Exception {
        var m = memberRepository.findById(u.id()).orElseThrow();
        m.setAuthority(Authority.WM);
        memberRepository.save(m);
        MvcResult login = mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content(om.writeValueAsString(Map.of("email", u.email(), "password", "Passw0rd!!"))))
                .andExpect(status().isOk()).andReturn();
        return new User(u.id(), u.email(), u.profileName(), JsonPath.read(login.getResponse().getContentAsString(), "$.data.accessToken"));
    }

    @Test
    void 관리자만_작업을_에디터_추천으로_올린다() throws Exception {
        String tag = "t" + UUID.randomUUID().toString().substring(0, 8);
        User owner = signupAndLogin();
        User admin = promoteToAdmin(signupAndLogin());
        updateProfile(owner, Map.of("location", tag));
        long w1 = createWork(owner, "추천 1", "가족", 1);
        long w2 = createWork(owner, "추천 2", "가족", 1);
        List<Number> recentBefore = discoverIds("location", tag);

        String on = "{\"featured\":true}";
        mvc.perform(put("/api/admin/series/" + w1 + "/featured").header("Authorization", bearer(owner))
                        .contentType(MediaType.APPLICATION_JSON).content(on))
                .andExpect(status().isForbidden());
        mvc.perform(put("/api/admin/series/" + w1 + "/featured").header("Authorization", bearer(admin))
                        .contentType(MediaType.APPLICATION_JSON).content(on))
                .andExpect(status().isOk());

        String featured = mvc.perform(get("/api/series/discover").param("featured", "true").param("size", "60"))
                .andReturn().getResponse().getContentAsString();
        List<Number> featuredIds = JsonPath.read(featured, "$.data[*].id");
        assertThat(featuredIds).extracting(Number::longValue).contains(w1).doesNotContain(w2);
        mvc.perform(get("/api/series/discover").param("location", tag))
                .andExpect(jsonPath("$.data[?(@.id == " + w1 + ")].featured").value(true));
        // 추천해도 "최근 수정순"은 그대로 (updatedAt을 건드리지 않음)
        assertThat(discoverIds("location", tag)).isEqualTo(recentBefore);

        // 초안은 추천 불가
        mvc.perform(put("/api/series/" + w2).header("Authorization", bearer(owner))
                        .contentType(MediaType.APPLICATION_JSON).content(om.writeValueAsString(Map.of("title", "추천 2", "draft", true))))
                .andExpect(status().isOk());
        mvc.perform(put("/api/admin/series/" + w2 + "/featured").header("Authorization", bearer(admin))
                        .contentType(MediaType.APPLICATION_JSON).content(on))
                .andExpect(status().isBadRequest());

        mvc.perform(put("/api/admin/series/" + w1 + "/featured").header("Authorization", bearer(admin))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"featured\":false}"))
                .andExpect(status().isOk());
        String after = mvc.perform(get("/api/series/discover").param("featured", "true").param("size", "60"))
                .andReturn().getResponse().getContentAsString();
        List<Number> afterIds = JsonPath.read(after, "$.data[*].id");
        assertThat(afterIds).extracting(Number::longValue).doesNotContain(w1);
    }

    // ── 공개 탐색 사진 모달 (메뉴 통합) ───────────────────────────────

    @Test
    void 사진_댓글은_비로그인도_읽고_작성은_로그인이_필요하다() throws Exception {
        User owner = signupAndLogin();
        long photo = createPhoto(owner);
        mvc.perform(get("/api/photos/" + photo + "/comments")).andExpect(status().isOk());
        mvc.perform(post("/api/photos/" + photo + "/comments").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\":\"안녕하세요\"}"))
                .andExpect(status().isUnauthorized());
    }
    // ── 4개 메뉴 내부 고도화 (Cosmos·SCRL 대조) ─────────────────────

    private long createPhotoWith(User owner, String genre, String mood) throws Exception {
        Map<String, Object> body = new HashMap<>(Map.of("memberId", owner.id(), "title", "유사 테스트",
                "imageUrl", "https://example.com/s.jpg"));
        if (genre != null) body.put("genre", genre);
        if (mood != null) body.put("colorMood", mood);
        MvcResult r = mvc.perform(post("/api/photos").header("Authorization", bearer(owner))
                        .contentType(MediaType.APPLICATION_JSON).content(om.writeValueAsString(body)))
                .andExpect(status().isCreated()).andReturn();
        return ((Number) JsonPath.read(r.getResponse().getContentAsString(), "$.data.id")).longValue();
    }

    @Test
    void 비슷한_사진은_장르가_같은_사진을_먼저_보여주고_같은_작가는_4장까지다() throws Exception {
        // 테스트끼리 DB를 공유하므로 이 테스트만의 장르·색 분위기 값을 쓴다
        String genre = "G" + UUID.randomUUID().toString().substring(0, 8);
        String mood = "M" + UUID.randomUUID().toString().substring(0, 8);
        User a = signupAndLogin();
        User b = signupAndLogin();
        User c = signupAndLogin();
        long base = createPhotoWith(a, genre, mood);
        for (int i = 0; i < 5; i++) createPhotoWith(a, genre, null);
        long bPhoto = createPhotoWith(b, genre, mood);
        long cMoodOnly = createPhotoWith(c, null, mood);
        long unrelated = createPhotoWith(c, null, null);

        String body = mvc.perform(get("/api/photos/" + base + "/similar"))   // 비로그인 공개
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        List<Number> ids = JsonPath.read(body, "$.data[*].id");
        List<Number> authors = JsonPath.read(body, "$.data[*].memberId");
        assertThat(ids).extracting(Number::longValue).doesNotContain(base, unrelated);
        assertThat(ids.get(0).longValue()).isEqualTo(bPhoto);                      // 장르+색 분위기 둘 다 일치
        assertThat(ids.get(ids.size() - 1).longValue()).isEqualTo(cMoodOnly);      // 색 분위기만 일치 → 맨 뒤
        assertThat(authors.stream().filter(m -> m.longValue() == a.id()).count()).isEqualTo(4);
        mvc.perform(get("/api/photos/999999999/similar")).andExpect(status().isNotFound());
    }

    @Test
    void 무드보드_공유_링크는_주인만_켜고_끄며_끄면_이전_링크가_막힌다() throws Exception {
        User me = signupAndLogin();
        User other = signupAndLogin();
        long photo = createPhoto(other);
        String created = mvc.perform(post("/api/moodboards").header("Authorization", bearer(me))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"레퍼런스\"}"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        long board = ((Number) JsonPath.read(created, "$.id")).longValue();
        mvc.perform(post("/api/moodboards/" + board + "/photos").header("Authorization", bearer(me))
                .contentType(MediaType.APPLICATION_JSON).content("{\"photoId\":" + photo + "}")).andExpect(status().isOk());

        String on = "{\"enabled\":true}";
        mvc.perform(put("/api/moodboards/" + board + "/share").header("Authorization", bearer(other))
                .contentType(MediaType.APPLICATION_JSON).content(on)).andExpect(status().isNotFound());
        String shared = mvc.perform(put("/api/moodboards/" + board + "/share").header("Authorization", bearer(me))
                        .contentType(MediaType.APPLICATION_JSON).content(on))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        String token = JsonPath.read(shared, "$.shareToken");
        assertThat(token).hasSize(32);

        mvc.perform(get("/api/moodboards/shared/" + token))   // 비로그인
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("레퍼런스"))
                .andExpect(jsonPath("$.photos[0].id").value(photo))
                .andExpect(jsonPath("$.memberId").doesNotExist());

        mvc.perform(put("/api/moodboards/" + board + "/share").header("Authorization", bearer(me))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"enabled\":false}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.shareToken").doesNotExist());
        mvc.perform(get("/api/moodboards/shared/" + token)).andExpect(status().isNotFound());
        mvc.perform(get("/api/moodboards/" + board)).andExpect(status().isUnauthorized());
    }
}
