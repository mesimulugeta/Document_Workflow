package com.zion.backend.api;

import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import com.zion.backend.common.NotFoundException;
import com.zion.backend.workflow.WorkflowException;

@RestControllerAdvice
public class ApiExceptionHandler {

    @ExceptionHandler(WorkflowException.class)
    public ProblemDetail handleWorkflow(WorkflowException ex) {
        HttpStatus status = switch (ex.getCode()) {
            case ILLEGAL_TRANSITION, NOT_EDITABLE -> HttpStatus.CONFLICT;
            case NOT_ALLOWED, CONFLICT_OF_INTEREST -> HttpStatus.FORBIDDEN;
            case COMMENT_REQUIRED -> HttpStatus.BAD_REQUEST;
        };
        return problem(status, ex.getMessage(), ex.getCode().name());
    }

    @ExceptionHandler(NotFoundException.class)
    public ProblemDetail handleNotFound(NotFoundException ex) {
        return problem(HttpStatus.NOT_FOUND, ex.getMessage(), "NOT_FOUND");
    }

    @ExceptionHandler(OptimisticLockingFailureException.class)
    public ProblemDetail handleConflict(OptimisticLockingFailureException ex) {
        return problem(HttpStatus.CONFLICT,
                "This document was changed by someone else. Reload and try again.", "CONCURRENT_MODIFICATION");
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ProblemDetail handleValidation(MethodArgumentNotValidException ex) {
        Map<String, String> errors = new LinkedHashMap<>();
        ex.getBindingResult().getFieldErrors()
                .forEach(e -> errors.putIfAbsent(e.getField(), e.getDefaultMessage()));
        ProblemDetail pd = problem(HttpStatus.BAD_REQUEST, "Validation failed", "VALIDATION_FAILED");
        pd.setProperty("errors", errors);
        return pd;
    }

    private static ProblemDetail problem(HttpStatus status, String detail, String code) {
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(status, detail);
        pd.setTitle(status.getReasonPhrase());
        pd.setProperty("code", code);
        return pd;
    }
}