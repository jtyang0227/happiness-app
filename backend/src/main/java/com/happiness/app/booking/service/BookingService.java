package com.happiness.app.booking.service;

import com.happiness.app.booking.dto.*;
import com.happiness.app.booking.entity.*;
import com.happiness.app.booking.repository.*;
import com.happiness.app.member.entity.Member;
import com.happiness.app.member.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class BookingService {

    private final BookingRepository bookingRepository;
    private final BookingAvailabilityRepository availabilityRepository;
    private final BookingBlockedDateRepository blockedDateRepository;
    private final MemberRepository memberRepository;

    // in-memory rate limiting: clientIP -> [count, windowStartEpochSecond]
    private final ConcurrentHashMap<String, long[]> bookingRateMap = new ConcurrentHashMap<>();
    private static final int BOOKING_RATE_LIMIT = 10; // per minute

    // ── CALENDAR AVAILABILITY ─────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public AvailabilityCalendarDto getCalendarAvailability(String profileName, int year, int month) {
        Member member = memberRepository.findByProfileName(profileName)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "작가를 찾을 수 없습니다"));
        Long memberId = member.getId();

        BookingAvailability availability = availabilityRepository.findByMemberId(memberId)
                .orElse(null);

        // Default: weekdays Mon-Fri, slots 10:00 and 14:00
        Set<Integer> allowedWeekdays = parseWeekdays(
                availability != null ? availability.getWeekdays() : "1,2,3,4,5");
        List<String> slots = parseTimeSlots(
                availability != null ? availability.getTimeSlots() : "10:00,14:00");
        boolean isActive = availability == null || availability.isActive();
        String bookingNote = availability != null ? availability.getBookingNote() : null;

        if (!isActive) {
            return AvailabilityCalendarDto.builder()
                    .availableDates(Collections.emptyList())
                    .bookedSlots(Collections.emptyMap())
                    .timeSlots(slots)
                    .bookingNote(bookingNote)
                    .build();
        }

        // Build date range for month
        YearMonth ym = YearMonth.of(year, month);
        LocalDate start = ym.atDay(1);
        LocalDate end = ym.atEndOfMonth();

        // Blocked dates
        Set<LocalDate> blockedDates = blockedDateRepository
                .findByMemberIdAndBlockedDateBetween(memberId, start, end)
                .stream().map(BookingBlockedDate::getBlockedDate).collect(Collectors.toSet());

        // Existing bookings in the month
        List<Booking> existingBookings = bookingRepository
                .findByMemberIdAndShootDateBetween(memberId, start, end);

        Map<LocalDate, List<String>> bookedSlotMap = new HashMap<>();
        for (Booking b : existingBookings) {
            if ("CONFIRMED".equals(b.getStatus()) || "REQUESTED".equals(b.getStatus())) {
                bookedSlotMap.computeIfAbsent(b.getShootDate(), k -> new ArrayList<>())
                        .add(b.getShootTime() != null ? b.getShootTime() : "");
            }
        }

        // Build available dates
        List<String> availableDates = new ArrayList<>();
        LocalDate today = LocalDate.now();
        LocalDate cursor = start;

        while (!cursor.isAfter(end)) {
            if (!cursor.isBefore(today)
                    && isWeekdayAllowed(cursor.getDayOfWeek(), allowedWeekdays)
                    && !blockedDates.contains(cursor)) {
                // Check if all slots are booked
                List<String> bookedForDay = bookedSlotMap.getOrDefault(cursor, Collections.emptyList());
                if (bookedForDay.size() < slots.size()) {
                    availableDates.add(cursor.toString());
                }
            }
            cursor = cursor.plusDays(1);
        }

        // Convert bookedSlotMap to string key map
        Map<String, List<String>> bookedSlotStringMap = new HashMap<>();
        bookedSlotMap.forEach((date, times) -> bookedSlotStringMap.put(date.toString(), times));

        return AvailabilityCalendarDto.builder()
                .availableDates(availableDates)
                .bookedSlots(bookedSlotStringMap)
                .timeSlots(slots)
                .bookingNote(bookingNote)
                .build();
    }

    // ── CREATE BOOKING ─────────────────────────────────────────────────────────

    @Transactional
    public BookingResponse createBooking(String profileName, BookingRequest req, String clientIp) {
        checkBookingRateLimit(clientIp);

        Member member = memberRepository.findByProfileName(profileName)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "작가를 찾을 수 없습니다"));
        Long memberId = member.getId();

        // Validate future date
        if (req.getShootDate() == null || !req.getShootDate().isAfter(LocalDate.now())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "촬영일은 오늘 이후 날짜여야 합니다");
        }

        // Check double-booking
        boolean alreadyBooked = bookingRepository.findByMemberIdAndShootDateAndShootTime(
                memberId, req.getShootDate(), req.getShootTime()).isPresent();
        if (alreadyBooked) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "해당 시간은 이미 예약되어 있습니다");
        }

        Booking booking = Booking.builder()
                .memberId(memberId)
                .shootDate(req.getShootDate())
                .shootTime(req.getShootTime())
                .shootType(req.getShootType())
                .clientName(req.getClientName())
                .clientPhone(req.getClientPhone())
                .clientEmail(req.getClientEmail())
                .memo(req.getMemo())
                .status("REQUESTED")
                .build();

        booking = bookingRepository.save(booking);
        log.info("New booking created: id={}, memberId={}, date={}", booking.getId(), memberId, req.getShootDate());

        return toResponse(booking);
    }

    // ── CONFIRM BOOKING ────────────────────────────────────────────────────────

    @Transactional
    public BookingResponse confirmBooking(Long bookingId, Long authenticatedMemberId) {
        Booking booking = bookingRepository.findByIdAndMemberId(bookingId, authenticatedMemberId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "접근 권한이 없습니다"));

        booking.setStatus("CONFIRMED");
        booking.setConfirmedAt(LocalDateTime.now());
        return toResponse(bookingRepository.save(booking));
    }

    // ── REJECT BOOKING ─────────────────────────────────────────────────────────

    @Transactional
    public BookingResponse rejectBooking(Long bookingId, String reason, Long authenticatedMemberId) {
        Booking booking = bookingRepository.findByIdAndMemberId(bookingId, authenticatedMemberId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "접근 권한이 없습니다"));

        booking.setStatus("REJECTED");
        booking.setRejectReason(reason);
        return toResponse(bookingRepository.save(booking));
    }

    // ── CANCEL BOOKING ─────────────────────────────────────────────────────────

    @Transactional
    public BookingResponse cancelBooking(Long bookingId, Long authenticatedMemberId) {
        Booking booking = bookingRepository.findByIdAndMemberId(bookingId, authenticatedMemberId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "접근 권한이 없습니다"));

        booking.setStatus("CANCELLED");
        booking.setCancelledAt(LocalDateTime.now());
        return toResponse(bookingRepository.save(booking));
    }

    // ── GET BOOKINGS FOR MEMBER ────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<BookingResponse> getBookingsForMember(Long memberId, String status) {
        List<Booking> bookings = (status != null && !status.isBlank())
                ? bookingRepository.findByMemberIdAndStatus(memberId, status.toUpperCase())
                : bookingRepository.findByMemberIdOrderByShootDateAsc(memberId);

        return bookings.stream().map(this::toResponse).collect(Collectors.toList());
    }

    // ── AVAILABILITY SETTINGS ─────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public AvailabilitySettingsDto getAvailabilitySettings(Long memberId) {
        BookingAvailability av = availabilityRepository.findByMemberId(memberId)
                .orElse(BookingAvailability.builder().build());
        return toSettingsDto(av);
    }

    @Transactional
    public AvailabilitySettingsDto saveAvailabilitySettings(Long memberId, AvailabilitySettingsDto dto) {
        BookingAvailability av = availabilityRepository.findByMemberId(memberId)
                .orElse(BookingAvailability.builder().memberId(memberId).build());

        if (dto.getWeekdays() != null) av.setWeekdays(dto.getWeekdays());
        if (dto.getTimeSlots() != null) av.setTimeSlots(dto.getTimeSlots());
        av.setBufferHours(dto.getBufferHours());
        av.setBookingNote(dto.getBookingNote());
        av.setActive(dto.isActive());

        return toSettingsDto(availabilityRepository.save(av));
    }

    // ── BLOCKED DATES ──────────────────────────────────────────────────────────

    @Transactional
    public void addBlockedDate(Long memberId, AddBlockedDateRequest req) {
        if (req.getDate() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "날짜를 입력해주세요");
        }
        BookingBlockedDate blocked = BookingBlockedDate.builder()
                .memberId(memberId)
                .blockedDate(req.getDate())
                .reason(req.getReason())
                .build();
        try {
            blockedDateRepository.save(blocked);
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 차단된 날짜입니다");
        }
    }

    @Transactional
    public void deleteBlockedDate(Long memberId, Long id) {
        blockedDateRepository.findByMemberIdAndId(memberId, id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "접근 권한이 없습니다"));
        blockedDateRepository.deleteByMemberIdAndId(memberId, id);
    }

    // ── PRIVATE HELPERS ────────────────────────────────────────────────────────

    private BookingResponse toResponse(Booking b) {
        return BookingResponse.builder()
                .id(b.getId())
                .memberId(b.getMemberId())
                .shootDate(b.getShootDate())
                .shootTime(b.getShootTime())
                .shootType(b.getShootType())
                .clientName(b.getClientName())
                .clientPhone(b.getClientPhone())
                .clientEmail(b.getClientEmail())
                .memo(b.getMemo())
                .status(b.getStatus())
                .rejectReason(b.getRejectReason())
                .createdAt(b.getCreatedAt())
                .confirmedAt(b.getConfirmedAt())
                .cancelledAt(b.getCancelledAt())
                .build();
    }

    private AvailabilitySettingsDto toSettingsDto(BookingAvailability av) {
        return AvailabilitySettingsDto.builder()
                .weekdays(av.getWeekdays())
                .timeSlots(av.getTimeSlots())
                .bufferHours(av.getBufferHours())
                .bookingNote(av.getBookingNote())
                .isActive(av.isActive())
                .build();
    }

    private Set<Integer> parseWeekdays(String csv) {
        Set<Integer> set = new HashSet<>();
        if (csv == null || csv.isBlank()) return set;
        for (String s : csv.split(",")) {
            try { set.add(Integer.parseInt(s.trim())); } catch (NumberFormatException ignored) {}
        }
        return set;
    }

    private List<String> parseTimeSlots(String csv) {
        if (csv == null || csv.isBlank()) return List.of("10:00");
        return Arrays.stream(csv.split(","))
                .map(String::trim)
                .filter(s -> !s.isBlank())
                .collect(Collectors.toList());
    }

    /**
     * DayOfWeek: MONDAY=1, TUESDAY=2, ..., SUNDAY=7
     * weekdays stored as 1=Mon..7=Sun
     */
    private boolean isWeekdayAllowed(DayOfWeek dow, Set<Integer> allowedWeekdays) {
        return allowedWeekdays.contains(dow.getValue());
    }

    private void checkBookingRateLimit(String clientIp) {
        long nowEpoch = System.currentTimeMillis() / 1000;
        long[] state = bookingRateMap.compute(clientIp, (k, v) -> {
            if (v == null || nowEpoch - v[1] > 60) {
                return new long[]{1, nowEpoch};
            }
            v[0]++;
            return v;
        });

        if (state[0] > BOOKING_RATE_LIMIT) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                    "너무 많은 예약 시도입니다. 잠시 후 다시 시도해주세요.");
        }
    }
}
