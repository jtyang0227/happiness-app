package com.happiness.app.photo.dto;

import com.happiness.app.common.util.ImageVariantUtil;
import com.happiness.app.member.entity.Member;
import com.happiness.app.photo.entity.Photo;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PhotoResponse {
    private Long id;
    private Long memberId;
    /** 작성자 정보 — 목록/상세 컨트롤러가 Member 배치 조회 후 채워넣음 (엔티티에는 없음) */
    private String memberName;
    private String memberAvatarUrl;
    private String memberProfileName;
    private String title;
    private String imageUrl;
    private String thumbnailUrl;
    /** imageUrl(1024)에서 파일명 규칙으로 파생한 512px 변형 URL — DB에 저장되지 않음 */
    private String imageUrl512;
    /** imageUrl(1024)에서 파일명 규칙으로 파생한 128px 변형 URL — DB에 저장되지 않음 */
    private String imageUrl128;
    private String description;
    private String imageRatio;
    private Integer likesCount;
    private Integer savesCount;
    private Integer sharesCount;
    private Integer gridColSpan;
    private String dominantColor;
    private String colorMood;
    private String colorPalette;
    private Integer displayOrder;
    private boolean isLiked;
    private boolean isSaved;
    private List<PhotoTagDto> tags;
    // EXIF
    private String cameraModel;
    private String lensModel;
    private String aperture;
    private String shutterSpeed;
    private Integer iso;
    private String focalLength;
    // Feature 26 — 장르 분류 (subGenres는 List로 직렬화)
    private String genre;
    private List<String> subGenres;
    // Feature 25 — 매거진 판 타입
    private String panType;
    private String magazineCaption;
    private Boolean imageRight;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static PhotoResponse fromEntity(Photo photo) {
        return PhotoResponse.builder()
                .id(photo.getId())
                .memberId(photo.getMemberId())
                .title(photo.getTitle())
                .imageUrl(photo.getImageUrl())
                .thumbnailUrl(photo.getThumbnailUrl())
                .imageUrl512(ImageVariantUtil.deriveUrl(photo.getImageUrl(), 512))
                .imageUrl128(ImageVariantUtil.deriveUrl(photo.getImageUrl(), 128))
                .description(photo.getDescription())
                .imageRatio(photo.getImageRatio())
                .likesCount(photo.getLikesCount())
                .savesCount(photo.getSavesCount())
                .sharesCount(photo.getSharesCount())
                .gridColSpan(photo.getGridColSpan() != null ? photo.getGridColSpan() : 6)
                .dominantColor(photo.getDominantColor())
                .colorMood(photo.getColorMood())
                .colorPalette(photo.getColorPalette())
                .displayOrder(photo.getDisplayOrder())
                .genre(photo.getGenre())
                .subGenres(parseSubGenres(photo.getSubGenres()))
                .cameraModel(photo.getCameraModel())
                .lensModel(photo.getLensModel())
                .aperture(photo.getAperture())
                .shutterSpeed(photo.getShutterSpeed())
                .iso(photo.getIso())
                .focalLength(photo.getFocalLength())
                .panType(photo.getPanType() != null ? photo.getPanType() : "EDITORIAL")
                .magazineCaption(photo.getMagazineCaption())
                .imageRight(photo.getImageRight() != null ? photo.getImageRight() : false)
                .createdAt(photo.getCreatedAt())
                .updatedAt(photo.getUpdatedAt())
                .build();
    }

    /** 배치 조회한 Member 맵으로 작성자 정보를 채운다. 컨트롤러의 N+1 방지 패턴과 짝을 이룬다 */
    public static void attachMembers(List<PhotoResponse> photos, Map<Long, Member> memberMap) {
        for (PhotoResponse p : photos) {
            Member m = memberMap.get(p.getMemberId());
            if (m == null) continue;
            p.setMemberName(m.getName());
            p.setMemberAvatarUrl(m.getAvatarUrl());
            p.setMemberProfileName(m.getProfileName());
        }
    }

    public static void attachMember(PhotoResponse photo, Member member) {
        if (member == null) return;
        photo.setMemberName(member.getName());
        photo.setMemberAvatarUrl(member.getAvatarUrl());
        photo.setMemberProfileName(member.getProfileName());
    }

    private static List<String> parseSubGenres(String subGenresJson) {
        if (subGenresJson == null || subGenresJson.isBlank()) return List.of();
        try {
            // 간단한 JSON 배열 파싱: ["FASHION","LIFESTYLE"] → List
            String cleaned = subGenresJson.trim().replaceAll("[\\[\\]\"\\s]", "");
            if (cleaned.isEmpty()) return List.of();
            return Arrays.asList(cleaned.split(","));
        } catch (Exception e) {
            return List.of();
        }
    }
}
