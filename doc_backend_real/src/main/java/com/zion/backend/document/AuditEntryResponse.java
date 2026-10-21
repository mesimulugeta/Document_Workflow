package com.zion.backend.document;

import java.time.Instant;

public record AuditEntryResponse(
        Long id,
        String action,
        DocumentStatus fromStatus,
        DocumentStatus toStatus,
        String comment,
        Long actorId,
        String actorName,
        Instant createdAt) {
}