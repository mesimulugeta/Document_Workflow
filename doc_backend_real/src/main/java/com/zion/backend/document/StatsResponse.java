package com.zion.backend.document;

import java.util.Map;

public record StatsResponse(long total, Map<DocumentStatus, Long> byStatus) {
}