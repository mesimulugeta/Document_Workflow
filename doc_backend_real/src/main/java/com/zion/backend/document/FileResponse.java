package com.zion.backend.document;

import java.time.Instant;

public record FileResponse(
        Long id,
        String filename,
        String contentType,
        long sizeBytes,
        String sha256,
        Long uploadedById,
        String uploadedByName,
        Instant createdAt) {
}