package com.happiness.app.moodboard;

import com.happiness.app.common.SecurityUtil;
import com.happiness.app.member.repository.MemberRepository;
import com.happiness.app.photo.dto.PhotoResponse;
import com.happiness.app.photo.entity.Photo;
import com.happiness.app.photo.repository.PhotoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * 무드보드 (WORK_QUEUE 5, Behance Moodboard 재해석) — 사진을 이름 붙은 보드에 모은다. 전부 본인 전용(인증 필요).
 * 보드는 비공개라 모든 조회·수정이 findByIdAndMemberId로 소유자를 확인한다(IDOR 차단, 남의 보드는 404).
 */
@RestController
@RequestMapping("/api/moodboards")
@RequiredArgsConstructor
public class MoodboardController {

    private static final int MAX_BOARDS = 30;
    private static final int MAX_ITEMS = 500;
    private static final int NAME_MAX = 50;

    private final MoodboardRepository boardRepository;
    private final MoodboardItemRepository itemRepository;
    private final PhotoRepository photoRepository;
    private final MemberRepository memberRepository;

    private static String thumb(Photo p) {
        return p.getThumbnailUrl() != null ? p.getThumbnailUrl() : p.getImageUrl();
    }

    private static String cleanName(Object raw) {
        String name = raw == null ? "" : raw.toString().replaceAll("<[^>]*>", "").trim();
        if (name.isEmpty()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "보드 이름을 입력해 주세요.");
        if (name.length() > NAME_MAX) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "보드 이름은 50자 이내로 입력해 주세요.");
        return name;
    }

    private Moodboard myBoard(Long id) {
        return boardRepository.findByIdAndMemberId(id, SecurityUtil.getCurrentMemberId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "보드를 찾을 수 없습니다."));
    }

    /**
     * 내 보드 목록 — 항목 수·미리보기 3장. photoId를 주면 각 보드에 그 사진이 들어 있는지(containsPhoto)도 알려준다(담기 선택창용).
     * 항목·사진은 각각 한 번씩 배치 조회한다.
     */
    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> myBoards(@RequestParam(required = false) Long photoId) {
        List<Moodboard> boards = boardRepository.findByMemberIdOrderByUpdatedAtDesc(SecurityUtil.getCurrentMemberId());
        Map<Long, List<MoodboardItem>> itemsByBoard = boards.isEmpty() ? Map.of()
                : itemRepository.findByMoodboardIdInOrderByCreatedAtDesc(
                        boards.stream().map(Moodboard::getId).collect(Collectors.toList()))
                  .stream().collect(Collectors.groupingBy(MoodboardItem::getMoodboardId));
        Set<Long> previewIds = itemsByBoard.values().stream()
                .flatMap(items -> items.stream().limit(3)).map(MoodboardItem::getPhotoId).collect(Collectors.toSet());
        Map<Long, String> thumbs = photoRepository.findAllById(previewIds).stream()
                .collect(Collectors.toMap(Photo::getId, MoodboardController::thumb));

        List<Map<String, Object>> result = boards.stream().map(b -> {
            List<MoodboardItem> items = itemsByBoard.getOrDefault(b.getId(), List.of());
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", b.getId());
            m.put("name", b.getName());
            m.put("itemCount", items.size());
            m.put("previewPhotos", items.stream().limit(3).map(i -> thumbs.get(i.getPhotoId()))
                    .filter(Objects::nonNull).collect(Collectors.toList()));
            if (photoId != null) m.put("containsPhoto", items.stream().anyMatch(i -> i.getPhotoId().equals(photoId)));
            m.put("updatedAt", b.getUpdatedAt());
            return m;
        }).collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> create(@RequestBody Map<String, Object> body) {
        Long me = SecurityUtil.getCurrentMemberId();
        String name = cleanName(body.get("name"));
        if (boardRepository.countByMemberId(me) >= MAX_BOARDS) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "보드는 최대 30개까지 만들 수 있어요.");
        }
        Moodboard saved = boardRepository.save(Moodboard.builder().memberId(me).name(name).build());
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("id", saved.getId(), "name", saved.getName()));
    }

    /** 담긴 사진(최신 담은 순). 삭제된 사진은 건너뛴다. */
    private List<PhotoResponse> boardPhotos(Long boardId) {
        List<MoodboardItem> items = itemRepository.findByMoodboardIdOrderByCreatedAtDesc(boardId);
        Map<Long, Photo> photos = photoRepository.findAllById(
                        items.stream().map(MoodboardItem::getPhotoId).collect(Collectors.toList()))
                .stream().collect(Collectors.toMap(Photo::getId, Function.identity()));
        return items.stream().map(i -> photos.get(i.getPhotoId())).filter(Objects::nonNull)
                .map(PhotoResponse::fromEntity).collect(Collectors.toList());
    }

    /** 보드 상세 — 본인 전용. 공유 중이면 shareToken도 준다. */
    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> detail(@PathVariable Long id) {
        Moodboard board = myBoard(id);
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("id", board.getId());
        body.put("name", board.getName());
        body.put("shareToken", board.getShareToken());
        body.put("photos", boardPhotos(id));
        return ResponseEntity.ok(body);
    }

    /**
     * 공유 링크 켜기/끄기 (PLANNING_inside-menus-upgrade.md P0-C). {"enabled": true} → 새 토큰(이미 있으면 그대로),
     * false → 토큰 삭제(이전 링크 즉시 무효). 남의 보드는 myBoard()에서 404.
     */
    @PutMapping("/{id}/share")
    public ResponseEntity<Map<String, Object>> share(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        Moodboard board = myBoard(id);
        boolean enabled = Boolean.TRUE.equals(body.get("enabled"));
        if (enabled && board.getShareToken() == null) {
            board.setShareToken(UUID.randomUUID().toString().replace("-", ""));
        } else if (!enabled) {
            board.setShareToken(null);
        }
        boardRepository.save(board);
        Map<String, Object> res = new LinkedHashMap<>();
        res.put("id", board.getId());
        res.put("shareToken", board.getShareToken());
        return ResponseEntity.ok(res);
    }

    /** 공유된 보드 보기 (공개) — 보드 이름·주인 표시명·사진만. 보드 주인의 회원 id·이메일은 내보내지 않는다. */
    @GetMapping("/shared/{token}")
    public ResponseEntity<Map<String, Object>> shared(@PathVariable String token) {
        Moodboard board = (token == null || token.length() != 32) ? null
                : boardRepository.findByShareToken(token).orElse(null);
        if (board == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "공유가 끝났거나 없는 보드예요.");
        List<PhotoResponse> photos = boardPhotos(board.getId());
        // 남의 사진을 공개 페이지에 보여 주므로 원작자 이름을 함께 싣는다 (배치 조회)
        PhotoResponse.attachMembers(photos, memberRepository.findAllById(
                        photos.stream().map(PhotoResponse::getMemberId).collect(Collectors.toSet()))
                .stream().collect(Collectors.toMap(m -> m.getId(), m -> m)));
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("name", board.getName());
        body.put("ownerName", memberRepository.findById(board.getMemberId()).map(m -> m.getName()).orElse(null));
        body.put("photos", photos);
        return ResponseEntity.ok(body);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Object>> rename(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        Moodboard board = myBoard(id);
        board.setName(cleanName(body.get("name")));
        boardRepository.save(board);
        return ResponseEntity.ok(Map.of("id", board.getId(), "name", board.getName()));
    }

    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        Moodboard board = myBoard(id);
        itemRepository.deleteByMoodboardId(board.getId());
        boardRepository.delete(board);
        return ResponseEntity.noContent().build();
    }

    /** 사진 담기 — 이미 담겨 있으면 그대로 성공(멱등) */
    @PostMapping("/{id}/photos")
    public ResponseEntity<Map<String, Object>> addPhoto(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        Moodboard board = myBoard(id);
        Object raw = body.get("photoId");
        if (!(raw instanceof Number)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "photoId가 필요합니다.");
        Long photoId = ((Number) raw).longValue();
        if (!photoRepository.existsById(photoId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "사진을 찾을 수 없습니다.");
        }
        if (!itemRepository.existsByMoodboardIdAndPhotoId(id, photoId)) {
            if (itemRepository.countByMoodboardId(id) >= MAX_ITEMS) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "보드 하나에는 사진을 500장까지 담을 수 있어요.");
            }
            try {
                itemRepository.save(MoodboardItem.builder().moodboardId(id).photoId(photoId).build());
            } catch (org.springframework.dao.DataIntegrityViolationException dup) {
                // 동시 요청으로 유니크 제약에 걸림 — 이미 담긴 상태라 결과는 같다
            }
            board.setUpdatedAt(java.time.LocalDateTime.now());   // 목록에서 최근 사용 보드가 위로 (변경 필드가 없으면 @PreUpdate가 안 돌아 직접 갱신)
            boardRepository.save(board);
        }
        return ResponseEntity.ok(Map.of("moodboardId", id, "photoId", photoId, "contains", true));
    }

    @DeleteMapping("/{id}/photos/{photoId}")
    public ResponseEntity<Map<String, Object>> removePhoto(@PathVariable Long id, @PathVariable Long photoId) {
        myBoard(id);
        itemRepository.deleteByMoodboardIdAndPhotoId(id, photoId);
        return ResponseEntity.ok(Map.of("moodboardId", id, "photoId", photoId, "contains", false));
    }
}
