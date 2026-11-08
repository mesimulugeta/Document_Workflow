package com.zion.backend.document;

import java.time.Instant;

public record ActivityResponse(
        Long id,
        Long documentId,
        String documentTitle,
        String action,
        DocumentStatus fromStatus,
        DocumentStatus toStatus,
        String comment,
        String actorName,
        Instant createdAt) {
}