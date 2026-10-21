package com.zion.backend.document;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {

    List<AuditLog> findByDocumentIdOrderByCreatedAtAscIdAsc(Long documentId);
}