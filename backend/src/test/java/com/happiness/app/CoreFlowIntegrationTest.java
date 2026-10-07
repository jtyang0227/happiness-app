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
@SpringBootTest
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
}
