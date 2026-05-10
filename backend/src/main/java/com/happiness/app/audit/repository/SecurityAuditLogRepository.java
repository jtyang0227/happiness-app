package com.happiness.app.audit.repository;

import com.happiness.app.audit.entity.SecurityAuditLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SecurityAuditLogRepository extends JpaRepository<SecurityAuditLog, Long> {
    List<SecurityAuditLog> findTop20ByMemberIdOrderByCreatedAtDesc(Long memberId);
}
