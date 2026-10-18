package com.zion.backend.document;

public enum DocumentStatus {
    DRAFT, SUBMITTED, UNDER_REVIEW, CHANGES_REQUESTED, APPROVED, REJECTED, WITHDRAWN;

    public boolean isTerminal() {
        return this == APPROVED || this == REJECTED || this == WITHDRAWN;
    }
}