package com.zion.backend.workflow;

import static com.zion.backend.document.DocumentStatus.APPROVED;
import static com.zion.backend.document.DocumentStatus.CHANGES_REQUESTED;
import static com.zion.backend.document.DocumentStatus.DRAFT;
import static com.zion.backend.document.DocumentStatus.REJECTED;
import static com.zion.backend.document.DocumentStatus.SUBMITTED;
import static com.zion.backend.document.DocumentStatus.UNDER_REVIEW;
import static com.zion.backend.document.DocumentStatus.WITHDRAWN;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.util.List;
import java.util.Set;

import org.junit.jupiter.api.Test;

import com.zion.backend.document.DocumentStatus;
import com.zion.backend.workflow.WorkflowException.ErrorCode;

class WorkflowRulesTest {

    private static final Set<String> USER_ROLES = Set.of("USER");
    private static final Set<String> REVIEWER_ROLES = Set.of("REVIEWER");

    private static DocumentStatus asOwner(WorkflowAction action, DocumentStatus current, String comment) {
        return WorkflowRules.validate(action, current, true, USER_ROLES, comment);
    }

    private static DocumentStatus asReviewer(WorkflowAction action, DocumentStatus current, String comment) {
        return WorkflowRules.validate(action, current, false, REVIEWER_ROLES, comment);
    }

    @Test
    void ownerCanSubmitDraft() {
        assertEquals(SUBMITTED, asOwner(WorkflowAction.SUBMIT, DRAFT, null));
    }

    @Test
    void reviewerCanStartReviewOfSubmitted() {
        assertEquals(UNDER_REVIEW, asReviewer(WorkflowAction.START_REVIEW, SUBMITTED, null));
    }

    @Test
    void reviewerCanApprove() {
        assertEquals(APPROVED, asReviewer(WorkflowAction.APPROVE, UNDER_REVIEW, null));
    }

    @Test
    void rejectRequiresComment() {
        WorkflowException ex = assertThrows(WorkflowException.class,
                () -> asReviewer(WorkflowAction.REJECT, UNDER_REVIEW, "  "));
        assertEquals(ErrorCode.COMMENT_REQUIRED, ex.getCode());
    }

    @Test
    void rejectWithCommentWorks() {
        assertEquals(REJECTED, asReviewer(WorkflowAction.REJECT, UNDER_REVIEW, "Missing signature"));
    }

    @Test
    void requestChangesRequiresComment() {
        WorkflowException ex = assertThrows(WorkflowException.class,
                () -> asReviewer(WorkflowAction.REQUEST_CHANGES, UNDER_REVIEW, null));
        assertEquals(ErrorCode.COMMENT_REQUIRED, ex.getCode());
    }

    @Test
    void requestChangesWithCommentWorks() {
        assertEquals(CHANGES_REQUESTED,
                asReviewer(WorkflowAction.REQUEST_CHANGES, UNDER_REVIEW, "Please fix section 2"));
    }

    @Test
    void ownerCanResubmitAfterChangesRequested() {
        assertEquals(SUBMITTED, asOwner(WorkflowAction.RESUBMIT, CHANGES_REQUESTED, null));
    }

    @Test
    void reviewerCannotReviewOwnDocument() {
        WorkflowException ex = assertThrows(WorkflowException.class,
                () -> WorkflowRules.validate(WorkflowAction.APPROVE, UNDER_REVIEW, true, REVIEWER_ROLES, null));
        assertEquals(ErrorCode.CONFLICT_OF_INTEREST, ex.getCode());
    }

    @Test
    void plainUserCannotApprove() {
        WorkflowException ex = assertThrows(WorkflowException.class,
                () -> WorkflowRules.validate(WorkflowAction.APPROVE, UNDER_REVIEW, false, USER_ROLES, null));
        assertEquals(ErrorCode.NOT_ALLOWED, ex.getCode());
    }

    @Test
    void nonOwnerCannotSubmit() {
        WorkflowException ex = assertThrows(WorkflowException.class,
                () -> WorkflowRules.validate(WorkflowAction.SUBMIT, DRAFT, false, USER_ROLES, null));
        assertEquals(ErrorCode.NOT_ALLOWED, ex.getCode());
    }

    @Test
    void draftCannotBeApprovedDirectly() {
        WorkflowException ex = assertThrows(WorkflowException.class,
                () -> asReviewer(WorkflowAction.APPROVE, DRAFT, null));
        assertEquals(ErrorCode.ILLEGAL_TRANSITION, ex.getCode());
    }

    @Test
    void terminalStatesAcceptNoActions() {
        for (DocumentStatus status : List.of(APPROVED, REJECTED, WITHDRAWN)) {
            for (WorkflowAction action : WorkflowAction.values()) {
                boolean ownerAction = WorkflowRules.ruleFor(action).actor() == WorkflowRules.ActorType.OWNER;
                WorkflowException ex = assertThrows(WorkflowException.class, () -> {
                    if (ownerAction) {
                        asOwner(action, status, "comment");
                    } else {
                        asReviewer(action, status, "comment");
                    }
                });
                assertEquals(ErrorCode.ILLEGAL_TRANSITION, ex.getCode());
            }
        }
    }

    @Test
    void allowedActionsForOwnerOfDraft() {
        assertEquals(Set.of(WorkflowAction.SUBMIT, WorkflowAction.WITHDRAW),
                WorkflowRules.allowedActions(DRAFT, true, USER_ROLES));
    }

    @Test
    void allowedActionsForReviewerOnDocumentUnderReview() {
        assertEquals(Set.of(WorkflowAction.APPROVE, WorkflowAction.REJECT, WorkflowAction.REQUEST_CHANGES),
                WorkflowRules.allowedActions(UNDER_REVIEW, false, REVIEWER_ROLES));
    }
}