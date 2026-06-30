package com.happiness.app.delivery.controller;

import com.happiness.app.common.SecurityUtil;
import com.happiness.app.delivery.dto.*;
import com.happiness.app.delivery.service.DeliverySetService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/delivery")
@RequiredArgsConstructor
public class DeliverySetController {

    private final DeliverySetService deliverySetService;

    /** POST /api/delivery — 클라이언트 배달 세트 생성 (인증 필요) */
    @PostMapping
    public ResponseEntity<DeliverySetResponse> create(@RequestBody CreateDeliveryRequest req) {
        Long memberId = SecurityUtil.getCurrentMemberId();
        DeliverySetResponse response = deliverySetService.create(memberId, req);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /** GET /api/delivery — 내 배달 세트 목록 (인증 필요) */
    @GetMapping
    public ResponseEntity<List<DeliverySetResponse>> list() {
        Long memberId = SecurityUtil.getCurrentMemberId();
        return ResponseEntity.ok(deliverySetService.getSummariesForMember(memberId));
    }

    /**
     * GET /api/delivery/{token} — 클라이언트 배달 세트 상세 (공개, 비밀번호 없는 경우)
     */
    @GetMapping("/{token}")
    public ResponseEntity<DeliverySetDetail> getDetail(@PathVariable String token) {
        return ResponseEntity.ok(deliverySetService.getDetailForClient(token, null));
    }

    /**
     * POST /api/delivery/{token} — 클라이언트 배달 세트 상세 (공개, 비밀번호 바디로 전달)
     * 비밀번호는 절대 쿼리 파라미터로 받지 않음 (서버 로그 노출 방지)
     */
    @PostMapping("/{token}")
    public ResponseEntity<DeliverySetDetail> getDetailWithPassword(
            @PathVariable String token,
            @RequestBody(required = false) ClientActionRequest req) {
        String password = req != null ? req.getPassword() : null;
        return ResponseEntity.ok(deliverySetService.getDetailForClient(token, password));
    }

    /** PUT /api/delivery/{token}/view — 조회 표시 (공개) */
    @PutMapping("/{token}/view")
    public ResponseEntity<Void> markViewed(@PathVariable String token) {
        deliverySetService.markViewed(token);
        return ResponseEntity.noContent().build();
    }

    /** PUT /api/delivery/{token}/approve — 클라이언트 승인 (공개) */
    @PutMapping("/{token}/approve")
    public ResponseEntity<Void> approve(
            @PathVariable String token,
            @RequestBody(required = false) ClientActionRequest req) {
        deliverySetService.approve(token, req != null ? req : new ClientActionRequest());
        return ResponseEntity.noContent().build();
    }

    /** PUT /api/delivery/{token}/reject — 클라이언트 거절 (공개) */
    @PutMapping("/{token}/reject")
    public ResponseEntity<Void> reject(
            @PathVariable String token,
            @RequestBody(required = false) ClientActionRequest req) {
        deliverySetService.reject(token, req != null ? req : new ClientActionRequest());
        return ResponseEntity.noContent().build();
    }

    /** GET /api/delivery/{id}/selections — 클라이언트가 선택(좋아요)한 사진 목록 (인증 필요, 소유자만) */
    @GetMapping("/{id}/selections")
    public ResponseEntity<List<Map<String, Object>>> getSelections(@PathVariable Long id) {
        Long memberId = SecurityUtil.getCurrentMemberId();
        return ResponseEntity.ok(deliverySetService.getLikedPhotosForOwner(memberId, id));
    }

    /** DELETE /api/delivery/{id} — 배달 세트 삭제 (인증 필요, IDOR 검사) */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        Long memberId = SecurityUtil.getCurrentMemberId();
        deliverySetService.deleteSet(memberId, id);
        return ResponseEntity.noContent().build();
    }
}
