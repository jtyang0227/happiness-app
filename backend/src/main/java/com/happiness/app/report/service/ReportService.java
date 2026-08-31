package com.happiness.app.report.service;

import com.happiness.app.member.entity.Member;
import com.happiness.app.member.repository.MemberRepository;
import com.happiness.app.photo.entity.Photo;
import com.happiness.app.photo.repository.PhotoRepository;
import com.happiness.app.report.dto.AdminReportResponse;
import com.happiness.app.report.dto.AdminUpdateReportRequest;
import com.happiness.app.report.dto.ReportRequest;
import com.happiness.app.report.dto.ReportResponse;
import com.happiness.app.report.entity.Report;
import com.happiness.app.report.repository.ReportRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Function;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReportService {

    private final ReportRepository reportRepository;
    private final PhotoRepository  photoRepository;
    private final MemberRepository memberRepository;

    /** 허용된 신고 사유 */
    private static final Set<String> VALID_REASONS =
            Set.of("COPYRIGHT", "INAPPROPRIATE", "PRIVACY", "SPAM", "OTHER");

    // ── Rate Limiting ─────────────────────────────────────────────────────────
    // memberId → [count, windowStartEpochSecond], 10분 윈도우에 5건
    private final ConcurrentHashMap<Long, long[]> reportRateMap = new ConcurrentHashMap<>();
    private static final int  REPORT_RATE_LIMIT  = 5;
    private static final long REPORT_WINDOW_SECS = 600; // 10분

    private void checkReportRateLimit(Long memberId) {
        long nowEpoch = System.currentTimeMillis() / 1000;
        long[] state = reportRateMap.compute(memberId, (k, v) -> {
            if (v == null || nowEpoch - v[1] > REPORT_WINDOW_SECS) {
                return new long[]{1, nowEpoch};
            }
            v[0]++;
            return v;
        });
        if (state[0] > REPORT_RATE_LIMIT) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                    "너무 많은 신고를 제출했습니다. 10분 후에 다시 시도해주세요.");
        }
    }

    // ── User-facing ───────────────────────────────────────────────────────────

    /**
     * 사진 신고 생성.
     * - reason 유효성 검사 (400)
     * - reason=OTHER 이면 detail 필수 (400)
     * - 사진 존재 확인 (404)
     * - rate limit (429)
     */
    @Transactional
    public ReportResponse createReport(Long photoId, Long reporterId, ReportRequest req) {
        // 사유 유효성
        if (req.getReason() == null || !VALID_REASONS.contains(req.getReason().toUpperCase())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "reason 은 COPYRIGHT / INAPPROPRIATE / PRIVACY / SPAM / OTHER 중 하나여야 합니다.");
        }
        String reason = req.getReason().toUpperCase();

        // OTHER 이면 detail 필수
        if ("OTHER".equals(reason) && !StringUtils.hasText(req.getDetail())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "reason 이 OTHER 일 때는 detail 을 반드시 입력해야 합니다.");
        }

        // 사진 존재 확인
        if (!photoRepository.existsById(photoId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "사진을 찾을 수 없습니다.");
        }

        // Rate limit
        checkReportRateLimit(reporterId);

        Report saved = reportRepository.save(Report.builder()
                .photoId(photoId)
                .reporterId(reporterId)
                .reason(reason)
                .detail(req.getDetail())
                .evidenceUrl(req.getEvidenceUrl())
                .build());

        log.info("[ADMIN] 신고 접수 — reportId={} photoId={} reporterId={} reason={}",
                saved.getId(), photoId, reporterId, reason);

        return ReportResponse.from(saved);
    }

    /** 본인 신고 목록 */
    @Transactional(readOnly = true)
    public List<ReportResponse> getMyReports(Long reporterId) {
        return reportRepository.findByReporterIdOrderByCreatedAtDesc(reporterId)
                .stream().map(ReportResponse::from).toList();
    }

    /** 본인의 읽지 않은 처리 결과 수 (PENDING 은 제외) */
    @Transactional(readOnly = true)
    public long getMyUnreadCount(Long reporterId) {
        return reportRepository.countByReporterIdAndStatusNotAndReporterSeenFalse(reporterId, "PENDING");
    }

    /** 신고 결과 확인 처리 (IDOR-safe) */
    @Transactional
    public void markSeen(Long reportId, Long reporterId) {
        Report report = reportRepository.findByIdAndReporterId(reportId, reporterId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "신고를 찾을 수 없습니다."));
        report.setReporterSeen(true);
        reportRepository.save(report);
    }

    // ── Admin-facing ──────────────────────────────────────────────────────────

    /**
     * 어드민 신고 목록 (페이징).
     * N+1 방지: photoId / reporterId 를 배치로 한 번씩 조회.
     */
    @Transactional(readOnly = true)
    public Page<AdminReportResponse> getAdminReports(String status, Pageable pageable) {
        Page<Report> page = (status == null || status.isBlank() || "ALL".equalsIgnoreCase(status))
                ? reportRepository.findAllByOrderByCreatedAtDesc(pageable)
                : reportRepository.findByStatusOrderByCreatedAtDesc(status.toUpperCase(), pageable);

        // 배치 조회
        List<Long> photoIds    = page.map(Report::getPhotoId).toList();
        List<Long> reporterIds = page.map(Report::getReporterId).toList();

        Map<Long, Photo>  photoMap  = photoRepository.findAllById(photoIds)
                .stream().collect(Collectors.toMap(Photo::getId, Function.identity()));
        Map<Long, Member> memberMap = memberRepository.findAllById(reporterIds)
                .stream().collect(Collectors.toMap(Member::getId, Function.identity()));

        return page.map(r -> {
            Photo  photo    = photoMap.get(r.getPhotoId());
            Member reporter = memberMap.get(r.getReporterId());

            return AdminReportResponse.builder()
                    .id(r.getId())
                    .photo(AdminReportResponse.PhotoSummary.builder()
                            .id(photo != null ? photo.getId() : r.getPhotoId())
                            .title(photo != null ? photo.getTitle() : "(사진 없음)")
                            .thumbnailUrl(photo != null ? photo.getThumbnailUrl() : null)
                            .build())
                    .reason(r.getReason())
                    .detail(r.getDetail())
                    .evidenceUrl(r.getEvidenceUrl())
                    .reporterName(reporter != null ? reporter.getName() : "(알 수 없음)")
                    .reporterEmail(reporter != null ? reporter.getEmail() : "")
                    .reportedAt(r.getCreatedAt())
                    .status(r.getStatus())
                    .resolutionNote(r.getResolutionNote())
                    .build();
        });
    }

    /**
     * 어드민 — 신고 상태 변경 (RESOLVED / DISMISSED).
     */
    @Transactional
    public AdminReportResponse updateReport(Long reportId, AdminUpdateReportRequest req,
                                            String adminEmail) {
        Report report = reportRepository.findById(reportId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "신고를 찾을 수 없습니다."));

        if (req.getStatus() == null ||
                (!req.getStatus().equals("RESOLVED") && !req.getStatus().equals("DISMISSED"))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "status 는 RESOLVED 또는 DISMISSED 여야 합니다.");
        }

        report.setStatus(req.getStatus());
        report.setResolutionNote(req.getResolutionNote());
        report.setResolvedAt(LocalDateTime.now());
        reportRepository.save(report);

        log.info("[ADMIN] 신고 처리 — reportId={} status={} by {}",
                reportId, req.getStatus(), adminEmail);

        // 단건 응답 구성 (배치 불필요)
        Photo  photo    = photoRepository.findById(report.getPhotoId()).orElse(null);
        Member reporter = memberRepository.findById(report.getReporterId()).orElse(null);

        return AdminReportResponse.builder()
                .id(report.getId())
                .photo(AdminReportResponse.PhotoSummary.builder()
                        .id(photo != null ? photo.getId() : report.getPhotoId())
                        .title(photo != null ? photo.getTitle() : "(사진 없음)")
                        .thumbnailUrl(photo != null ? photo.getThumbnailUrl() : null)
                        .build())
                .reason(report.getReason())
                .detail(report.getDetail())
                .evidenceUrl(report.getEvidenceUrl())
                .reporterName(reporter != null ? reporter.getName() : "(알 수 없음)")
                .reporterEmail(reporter != null ? reporter.getEmail() : "")
                .reportedAt(report.getCreatedAt())
                .status(report.getStatus())
                .resolutionNote(report.getResolutionNote())
                .build();
    }
}
