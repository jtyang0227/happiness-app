package com.happiness.app.booking.controller;

import com.happiness.app.booking.dto.*;
import com.happiness.app.booking.service.BookingService;
import com.happiness.app.common.SecurityUtil;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/booking")
@RequiredArgsConstructor
public class BookingController {

    private final BookingService bookingService;

    /**
     * GET /api/booking/{profileName}/availability — 월별 예약 가능일 (공개)
     */
    @GetMapping("/{profileName}/availability")
    public ResponseEntity<AvailabilityCalendarDto> getAvailability(
            @PathVariable String profileName,
            @RequestParam(defaultValue = "#{T(java.time.LocalDate).now().getYear()}") int year,
            @RequestParam(defaultValue = "#{T(java.time.LocalDate).now().getMonthValue()}") int month) {
        return ResponseEntity.ok(bookingService.getCalendarAvailability(profileName, year, month));
    }

    /**
     * POST /api/booking/{profileName} — 예약 생성 (공개, IP 기준 rate limit)
     */
    @PostMapping("/{profileName}")
    public ResponseEntity<BookingResponse> createBooking(
            @PathVariable String profileName,
            @RequestBody BookingRequest req,
            HttpServletRequest httpRequest) {
        String clientIp = extractClientIp(httpRequest);
        BookingResponse response = bookingService.createBooking(profileName, req, clientIp);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * GET /api/booking — 내 예약 목록 (인증 필요)
     */
    @GetMapping
    public ResponseEntity<List<BookingResponse>> getMyBookings(
            @RequestParam(required = false) String status) {
        Long memberId = SecurityUtil.getCurrentMemberId();
        return ResponseEntity.ok(bookingService.getBookingsForMember(memberId, status));
    }

    /**
     * PUT /api/booking/{id}/confirm — 예약 확정 (인증 필요)
     */
    @PutMapping("/{id}/confirm")
    public ResponseEntity<BookingResponse> confirm(@PathVariable Long id) {
        Long memberId = SecurityUtil.getCurrentMemberId();
        return ResponseEntity.ok(bookingService.confirmBooking(id, memberId));
    }

    /**
     * PUT /api/booking/{id}/reject — 예약 거절 (인증 필요)
     */
    @PutMapping("/{id}/reject")
    public ResponseEntity<BookingResponse> reject(
            @PathVariable Long id,
            @RequestBody(required = false) RejectBookingRequest req) {
        Long memberId = SecurityUtil.getCurrentMemberId();
        String reason = req != null ? req.getReason() : null;
        return ResponseEntity.ok(bookingService.rejectBooking(id, reason, memberId));
    }

    /**
     * PUT /api/booking/{id}/cancel — 예약 취소 (인증 필요)
     */
    @PutMapping("/{id}/cancel")
    public ResponseEntity<BookingResponse> cancel(@PathVariable Long id) {
        Long memberId = SecurityUtil.getCurrentMemberId();
        return ResponseEntity.ok(bookingService.cancelBooking(id, memberId));
    }

    /**
     * GET /api/booking/availability-settings — 내 예약 설정 조회 (인증 필요)
     */
    @GetMapping("/availability-settings")
    public ResponseEntity<AvailabilitySettingsDto> getSettings() {
        Long memberId = SecurityUtil.getCurrentMemberId();
        return ResponseEntity.ok(bookingService.getAvailabilitySettings(memberId));
    }

    /**
     * PUT /api/booking/availability-settings — 내 예약 설정 저장 (인증 필요)
     */
    @PutMapping("/availability-settings")
    public ResponseEntity<AvailabilitySettingsDto> saveSettings(
            @RequestBody AvailabilitySettingsDto dto) {
        Long memberId = SecurityUtil.getCurrentMemberId();
        return ResponseEntity.ok(bookingService.saveAvailabilitySettings(memberId, dto));
    }

    /**
     * POST /api/booking/blocked-dates — 차단 날짜 추가 (인증 필요)
     */
    @PostMapping("/blocked-dates")
    public ResponseEntity<Void> addBlockedDate(@RequestBody AddBlockedDateRequest req) {
        Long memberId = SecurityUtil.getCurrentMemberId();
        bookingService.addBlockedDate(memberId, req);
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    /**
     * DELETE /api/booking/blocked-dates/{id} — 차단 날짜 삭제 (인증 필요, IDOR 검사)
     */
    @DeleteMapping("/blocked-dates/{id}")
    public ResponseEntity<Void> deleteBlockedDate(@PathVariable Long id) {
        Long memberId = SecurityUtil.getCurrentMemberId();
        bookingService.deleteBlockedDate(memberId, id);
        return ResponseEntity.noContent().build();
    }

    // ── HELPER ────────────────────────────────────────────────────────────────

    private String extractClientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            String firstIp = forwarded.split(",")[0].trim();
            // Reject private/reserved ranges — fall back to REMOTE_ADDR
            if (!isPrivateIp(firstIp)) {
                return firstIp;
            }
        }
        return request.getRemoteAddr();
    }

    private boolean isPrivateIp(String ip) {
        return ip.startsWith("10.") || ip.startsWith("192.168.") || ip.startsWith("172.")
                || ip.equals("127.0.0.1") || ip.equals("0:0:0:0:0:0:0:1") || ip.equals("::1");
    }
}
