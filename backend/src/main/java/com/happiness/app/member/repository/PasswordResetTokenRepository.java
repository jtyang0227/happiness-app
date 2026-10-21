package com.happiness.app.member.repository;

import com.happiness.app.member.entity.PasswordResetToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Optional;

public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, Long> {

    Optional<PasswordResetToken> findByTokenHash(String tokenHash);

    /** 새 토큰을 만들기 전에 그 회원의 아직 안 쓴 토큰을 모두 사용 처리 — 링크는 항상 마지막 1개만 유효. */
    @Modifying
    @Query("UPDATE PasswordResetToken t SET t.usedAt = :now WHERE t.memberId = :memberId AND t.usedAt IS NULL")
    int invalidateActive(@Param("memberId") Long memberId, @Param("now") LocalDateTime now);

    void deleteByMemberId(Long memberId);
}
