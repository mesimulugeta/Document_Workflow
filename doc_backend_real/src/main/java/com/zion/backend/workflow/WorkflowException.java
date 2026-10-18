package com.zion.backend.workflow;

public class WorkflowException extends RuntimeException {

    public enum ErrorCode {
        ILLEGAL_TRANSITION, NOT_ALLOWED, CONFLICT_OF_INTEREST, COMMENT_REQUIRED
    }

    private final ErrorCode code;

    public WorkflowException(ErrorCode code, String message) {
        super(message);
        this.code = code;
    }

    public ErrorCode getCode() {
        return code;
    }
}