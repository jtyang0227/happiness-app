package com.happiness.app.meet.service;

import com.happiness.app.meet.dto.CreateMeetRequest;
import com.happiness.app.meet.dto.MeetResponse;
import com.happiness.app.meet.entity.Meet;
import com.happiness.app.meet.entity.MeetAvailability;
import com.happiness.app.meet.entity.MeetMessage;
import com.happiness.app.meet.repository.MeetAvailabilityRepository;
import com.happiness.app.meet.repository.MeetMessageRepository;
import com.happiness.app.meet.repository.MeetRepository;
import com.happiness.app.member.entity.Member;
import com.happiness.app.member.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MeetService {

    private final MeetRepository meetRepository;
    private final MeetAvailabilityRepository availabilityRepository;
    private final MeetMessageRepository messageRepository;
    private final MemberRepository memberRepository;

    // ── CREATE ───────────────────────────────────────────────────────────────

    @Transactional
    public MeetResponse create(Long requesterId, CreateMeetRequest req) {
        if (requesterId.equals(req.getReceiverId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "자기 자신에게 약속을 요청할 수 없습니다.");
        }
        memberRepository.findById(req.getReceiverId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "상대방을 찾을 수 없습니다."));

        Meet meet = Meet.builder()
                .requesterId(requesterId)
                .receiverId(req.getReceiverId())
                .status("PENDING")
                .locationName(sanitize(req.getLocationName()))
                .locationAddress(sanitize(req.getLocationAddress()))
                .locationLat(validLat(req.getLocationLat()))
                .locationLng(validLng(req.getLocationLng()))
                .initialMessage(sanitize(req.getInitialMessage()))
                .build();
        meet = meetRepository.save(meet);

        // Save requester's proposed dates as initial availability
        if (req.getProposedDates() != null && !req.getProposedDates().isEmpty()) {
            String dates = String.join(",", req.getProposedDates());
            MeetAvailability avail = MeetAvailability.builder()
                    .meetId(meet.getId())
                    .memberId(requesterId)
                    .availableDates(dates)
                    .build();
            availabilityRepository.save(avail);
        }

        return toResponse(meet);
    }

    // ── LIST ─────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<MeetResponse> listForMember(Long memberId) {
        return meetRepository.findByMemberIdOrderByUpdatedAtDesc(memberId)
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    // ── DETAIL ───────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public MeetResponse getDetail(Long id, Long memberId) {
        Meet meet = findAndCheckAccess(id, memberId);
        return toResponse(meet);
    }

    // ── RESPOND (수락/거절) ───────────────────────────────────────────────────

    @Transactional
    public void respond(Long id, Long memberId, String action) {
        Meet meet = findAndCheckAccess(id, memberId);
        if (!"PENDING".equals(meet.getStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "이미 처리된 요청입니다.");
        }
        if (!meet.getReceiverId().equals(memberId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "수신자만 응답할 수 있습니다.");
        }
        if ("accept".equals(action)) {
            meet.setStatus("NEGOTIATING");
        } else if ("reject".equals(action)) {
            meet.setStatus("CANCELLED");
        } else {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "action은 accept 또는 reject여야 합니다.");
        }
        meetRepository.save(meet);
    }

    // ── SUBMIT AVAILABILITY ───────────────────────────────────────────────────

    @Transactional
    public void submitAvailability(Long id, Long memberId, List<String> dates, List<String> times) {
        Meet meet = findAndCheckAccess(id, memberId);
        if ("CANCELLED".equals(meet.getStatus()) || "COMPLETED".equals(meet.getStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "이미 종료된 약속입니다.");
        }
        MeetAvailability avail = availabilityRepository
                .findByMeetIdAndMemberId(id, memberId)
                .orElse(MeetAvailability.builder().meetId(id).memberId(memberId).build());
        avail.setAvailableDates(dates != null ? String.join(",", dates) : "");
        avail.setAvailableTimes(times != null ? String.join(",", times) : "");
        availabilityRepository.save(avail);

        if ("PENDING".equals(meet.getStatus()) && meet.getReceiverId().equals(memberId)) {
            meet.setStatus("NEGOTIATING");
            meetRepository.save(meet);
        }
    }

    // ── GET AVAILABILITY ──────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public Map<String, Object> getAvailability(Long id, Long memberId) {
        findAndCheckAccess(id, memberId);
        List<MeetAvailability> list = availabilityRepository.findByMeetId(id);

        Map<String, Object> result = new LinkedHashMap<>();
        for (MeetAvailability a : list) {
            List<String> dates = a.getAvailableDates() != null && !a.getAvailableDates().isBlank()
                    ? Arrays.asList(a.getAvailableDates().split(","))
                    : Collections.emptyList();
            List<String> times = a.getAvailableTimes() != null && !a.getAvailableTimes().isBlank()
                    ? Arrays.asList(a.getAvailableTimes().split(","))
                    : Collections.emptyList();
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("memberId", a.getMemberId());
            entry.put("dates", dates);
            entry.put("times", times);
            entry.put("updatedAt", a.getUpdatedAt());
            result.put(String.valueOf(a.getMemberId()), entry);
        }
        return result;
    }

    // ── CONFIRM DATE ──────────────────────────────────────────────────────────

    @Transactional
    public void confirmDate(Long id, Long memberId, String date, String time) {
        Meet meet = findAndCheckAccess(id, memberId);
        if (!"NEGOTIATING".equals(meet.getStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "날짜 조율 중인 약속만 확정할 수 있습니다.");
        }
        meet.setConfirmedDate(LocalDate.parse(date));
        meet.setConfirmedTime(time);
        meet.setStatus("CONFIRMED");
        meetRepository.save(meet);
    }

    // ── UPDATE LOCATION ───────────────────────────────────────────────────────

    @Transactional
    public void updateLocation(Long id, Long memberId, String name, String address, Double lat, Double lng) {
        Meet meet = findAndCheckAccess(id, memberId);
        if ("CANCELLED".equals(meet.getStatus()) || "COMPLETED".equals(meet.getStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "이미 종료된 약속입니다.");
        }
        meet.setLocationName(sanitize(name));
        meet.setLocationAddress(sanitize(address));
        meet.setLocationLat(validLat(lat));
        meet.setLocationLng(validLng(lng));
        meetRepository.save(meet);
    }

    // ── CANCEL ───────────────────────────────────────────────────────────────

    @Transactional
    public void cancel(Long id, Long memberId) {
        Meet meet = findAndCheckAccess(id, memberId);
        if ("COMPLETED".equals(meet.getStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "완료된 약속은 취소할 수 없습니다.");
        }
        meet.setStatus("CANCELLED");
        meetRepository.save(meet);
    }

    // ── COMPLETE ──────────────────────────────────────────────────────────────

    @Transactional
    public void complete(Long id, Long memberId) {
        Meet meet = findAndCheckAccess(id, memberId);
        if (!"CONFIRMED".equals(meet.getStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "확정된 약속만 완료 처리할 수 있습니다.");
        }
        meet.setStatus("COMPLETED");
        meetRepository.save(meet);
    }

    // ── MESSAGES ──────────────────────────────────────────────────────────────

    @Transactional
    public Map<String, Object> sendMessage(Long meetId, Long senderId, String content) {
        Meet meet = findAndCheckAccess(meetId, senderId);
        if ("CANCELLED".equals(meet.getStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "취소된 약속에는 메시지를 보낼 수 없습니다.");
        }
        if (content == null || content.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "메시지 내용을 입력하세요.");
        }
        String safeContent = sanitize(content);
        if (safeContent.length() > 1000) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "메시지는 1000자 이하로 입력하세요.");
        }

        Member sender = memberRepository.findById(senderId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "사용자를 찾을 수 없습니다."));

        MeetMessage msg = MeetMessage.builder()
                .meetId(meetId)
                .senderId(senderId)
                .senderName(sender.getName())
                .senderAvatar(sender.getAvatarUrl())
                .content(safeContent)
                .build();
        msg = messageRepository.save(msg);

        return messageToMap(msg);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getMessages(Long meetId, Long memberId) {
        findAndCheckAccess(meetId, memberId);
        return messageRepository.findByMeetIdOrderByCreatedAtAsc(meetId)
                .stream().map(this::messageToMap).collect(Collectors.toList());
    }

    // ── UNREAD COUNT ──────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public long getPendingCount(Long memberId) {
        return meetRepository.countPendingForReceiver(memberId);
    }

    // ── PRIVATE HELPERS ───────────────────────────────────────────────────────

    private Meet findAndCheckAccess(Long id, Long memberId) {
        return meetRepository.findByIdAndMemberId(id, memberId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "접근 권한이 없습니다."));
    }

    private MeetResponse toResponse(Meet meet) {
        Member requester = memberRepository.findById(meet.getRequesterId()).orElse(null);
        Member receiver  = memberRepository.findById(meet.getReceiverId()).orElse(null);
        long msgCount    = messageRepository.countByMeetId(meet.getId());

        return MeetResponse.builder()
                .id(meet.getId())
                .status(meet.getStatus())
                .requesterId(meet.getRequesterId())
                .requesterName(requester != null ? requester.getName() : "")
                .requesterAvatarUrl(requester != null ? requester.getAvatarUrl() : null)
                .requesterProfileName(requester != null ? requester.getProfileName() : null)
                .receiverId(meet.getReceiverId())
                .receiverName(receiver != null ? receiver.getName() : "")
                .receiverAvatarUrl(receiver != null ? receiver.getAvatarUrl() : null)
                .receiverProfileName(receiver != null ? receiver.getProfileName() : null)
                .locationName(meet.getLocationName())
                .locationAddress(meet.getLocationAddress())
                .locationLat(meet.getLocationLat())
                .locationLng(meet.getLocationLng())
                .confirmedDate(meet.getConfirmedDate())
                .confirmedTime(meet.getConfirmedTime())
                .initialMessage(meet.getInitialMessage())
                .messageCount(msgCount)
                .createdAt(meet.getCreatedAt())
                .updatedAt(meet.getUpdatedAt())
                .build();
    }

    private Map<String, Object> messageToMap(MeetMessage msg) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id",           msg.getId());
        m.put("meetId",       msg.getMeetId());
        m.put("senderId",     msg.getSenderId());
        m.put("senderName",   msg.getSenderName());
        m.put("senderAvatar", msg.getSenderAvatar());
        m.put("content",      msg.getContent());
        m.put("createdAt",    msg.getCreatedAt());
        return m;
    }

    private String sanitize(String s) {
        if (s == null) return null;
        return s.replaceAll("<[^>]*>", "").trim();
    }

    private Double validLat(Double lat) {
        if (lat == null) return null;
        if (lat < -90 || lat > 90) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "유효하지 않은 위도입니다.");
        return lat;
    }

    private Double validLng(Double lng) {
        if (lng == null) return null;
        if (lng < -180 || lng > 180) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "유효하지 않은 경도입니다.");
        return lng;
    }
}
