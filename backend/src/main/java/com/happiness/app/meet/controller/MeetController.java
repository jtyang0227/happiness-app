package com.happiness.app.meet.controller;

import com.happiness.app.common.SecurityUtil;
import com.happiness.app.meet.dto.CreateMeetRequest;
import com.happiness.app.meet.dto.MeetResponse;
import com.happiness.app.meet.service.MeetService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/meets")
@RequiredArgsConstructor
public class MeetController {

    private final MeetService meetService;

    /** POST /api/meets — 약속 요청 */
    @PostMapping
    public ResponseEntity<MeetResponse> create(@RequestBody CreateMeetRequest req) {
        Long memberId = SecurityUtil.getCurrentMemberId();
        return ResponseEntity.status(HttpStatus.CREATED).body(meetService.create(memberId, req));
    }

    /** GET /api/meets — 내 약속 목록 */
    @GetMapping
    public ResponseEntity<List<MeetResponse>> list() {
        Long memberId = SecurityUtil.getCurrentMemberId();
        return ResponseEntity.ok(meetService.listForMember(memberId));
    }

    /** GET /api/meets/pending-count — 대기중 약속 수 */
    @GetMapping("/pending-count")
    public ResponseEntity<Map<String, Long>> pendingCount() {
        Long memberId = SecurityUtil.getCurrentMemberId();
        return ResponseEntity.ok(Map.of("count", meetService.getPendingCount(memberId)));
    }

    /** GET /api/meets/{id} — 약속 상세 */
    @GetMapping("/{id}")
    public ResponseEntity<MeetResponse> detail(@PathVariable Long id) {
        Long memberId = SecurityUtil.getCurrentMemberId();
        return ResponseEntity.ok(meetService.getDetail(id, memberId));
    }

    /** PUT /api/meets/{id}/respond — 수락/거절 (action: accept | reject) */
    @PutMapping("/{id}/respond")
    public ResponseEntity<Void> respond(@PathVariable Long id, @RequestBody Map<String, String> body) {
        Long memberId = SecurityUtil.getCurrentMemberId();
        meetService.respond(id, memberId, body.get("action"));
        return ResponseEntity.noContent().build();
    }

    /** POST /api/meets/{id}/availability — 가능 날짜 제출 */
    @PostMapping("/{id}/availability")
    public ResponseEntity<Void> submitAvailability(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body) {
        Long memberId = SecurityUtil.getCurrentMemberId();
        @SuppressWarnings("unchecked")
        List<String> dates = (List<String>) body.get("dates");
        @SuppressWarnings("unchecked")
        List<String> times = (List<String>) body.get("times");
        meetService.submitAvailability(id, memberId, dates, times);
        return ResponseEntity.noContent().build();
    }

    /** GET /api/meets/{id}/availability — 양측 가능 날짜 조회 */
    @GetMapping("/{id}/availability")
    public ResponseEntity<Map<String, Object>> getAvailability(@PathVariable Long id) {
        Long memberId = SecurityUtil.getCurrentMemberId();
        return ResponseEntity.ok(meetService.getAvailability(id, memberId));
    }

    /** PUT /api/meets/{id}/confirm — 날짜 최종 확정 */
    @PutMapping("/{id}/confirm")
    public ResponseEntity<Void> confirm(@PathVariable Long id, @RequestBody Map<String, String> body) {
        Long memberId = SecurityUtil.getCurrentMemberId();
        meetService.confirmDate(id, memberId, body.get("date"), body.get("time"));
        return ResponseEntity.noContent().build();
    }

    /** PUT /api/meets/{id}/location — 장소 수정 */
    @PutMapping("/{id}/location")
    public ResponseEntity<Void> updateLocation(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        Long memberId = SecurityUtil.getCurrentMemberId();
        meetService.updateLocation(id, memberId,
                (String) body.get("locationName"),
                (String) body.get("locationAddress"),
                body.get("locationLat") != null ? ((Number) body.get("locationLat")).doubleValue() : null,
                body.get("locationLng") != null ? ((Number) body.get("locationLng")).doubleValue() : null);
        return ResponseEntity.noContent().build();
    }

    /** PUT /api/meets/{id}/cancel — 취소 */
    @PutMapping("/{id}/cancel")
    public ResponseEntity<Void> cancel(@PathVariable Long id) {
        Long memberId = SecurityUtil.getCurrentMemberId();
        meetService.cancel(id, memberId);
        return ResponseEntity.noContent().build();
    }

    /** PUT /api/meets/{id}/complete — 완료 처리 */
    @PutMapping("/{id}/complete")
    public ResponseEntity<Void> complete(@PathVariable Long id) {
        Long memberId = SecurityUtil.getCurrentMemberId();
        meetService.complete(id, memberId);
        return ResponseEntity.noContent().build();
    }

    /** GET /api/meets/{id}/messages — 메시지 목록 */
    @GetMapping("/{id}/messages")
    public ResponseEntity<List<Map<String, Object>>> getMessages(@PathVariable Long id) {
        Long memberId = SecurityUtil.getCurrentMemberId();
        return ResponseEntity.ok(meetService.getMessages(id, memberId));
    }

    /** POST /api/meets/{id}/messages — 메시지 전송 */
    @PostMapping("/{id}/messages")
    public ResponseEntity<Map<String, Object>> sendMessage(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        Long memberId = SecurityUtil.getCurrentMemberId();
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(meetService.sendMessage(id, memberId, body.get("content")));
    }
}
