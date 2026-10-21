package com.zion.backend.document;

import java.time.Instant;
import java.util.Set;

import com.zion.backend.workflow.WorkflowAction;

public record DocumentResponse(
        Long id,
        String title,
        String description,
        DocumentStatus status,
        Long ownerId,
        String ownerName,
        Instant createdAt,
        Instant updatedAt,
        Long version,
        boolean editable,
        Set<WorkflowAction> allowedActions) {
}