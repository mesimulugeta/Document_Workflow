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

    // ---------- Happy paths ----------

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

    // ---------- Roles and conflict of interest ----------

    @Test
    void reviewerCannotReviewOwnDocument() {
        WorkflowException ex = assertThrows(WorkflowException.class,
                () -> WorkflowRules.validate(WorkflowAction.APPROVE, UNDER_REVIEW, true, REVIEWER_ROLES, null));
        assertEquals(ErrorCode.CONFLICT_OF_INTEREST, ex.getCode());
    }

    @Test
    void adminCannotReviewOwnDocument() {
        WorkflowException ex = assertThrows(WorkflowException.class,
                () -> WorkflowRules.validate(WorkflowAction.APPROVE, UNDER_REVIEW, true, Set.of("ADMIN"), null));
        assertEquals(ErrorCode.CONFLICT_OF_INTEREST, ex.getCode());
    }

    @Test
    void reviewerCannotStartReviewOfOwnDocument() {
        WorkflowException ex = assertThrows(WorkflowException.class,
                () -> WorkflowRules.validate(WorkflowAction.START_REVIEW, SUBMITTED, true, REVIEWER_ROLES, null));
        assertEquals(ErrorCode.CONFLICT_OF_INTEREST, ex.getCode());
    }

    @Test
    void approverAndAdminRolesCanReview() {
        for (String role : List.of("APPROVER", "ADMIN")) {
            assertEquals(APPROVED,
                    WorkflowRules.validate(WorkflowAction.APPROVE, UNDER_REVIEW, false, Set.of(role), null));
        }
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

    // ---------- Illegal transitions ----------

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

    // ---------- Withdraw rules (a draft was never submitted, so it cannot be withdrawn) ----------

    @Test
    void draftCannotBeWithdrawn() {
        WorkflowException ex = assertThrows(WorkflowException.class,
                () -> asOwner(WorkflowAction.WITHDRAW, DRAFT, null));
        assertEquals(ErrorCode.ILLEGAL_TRANSITION, ex.getCode());
    }

    @Test
    void ownerCanWithdrawFromEveryActiveStatus() {
        for (DocumentStatus status : List.of(SUBMITTED, UNDER_REVIEW, CHANGES_REQUESTED)) {
            assertEquals(WITHDRAWN, asOwner(WorkflowAction.WITHDRAW, status, null));
        }
    }

    @Test
    void nonOwnerCannotWithdraw() {
        WorkflowException ex = assertThrows(WorkflowException.class,
                () -> WorkflowRules.validate(WorkflowAction.WITHDRAW, SUBMITTED, false, REVIEWER_ROLES, null));
        assertEquals(ErrorCode.NOT_ALLOWED, ex.getCode());
    }

    // ---------- Full transition matrix: every action x every status ----------

    private record Transition(WorkflowAction action, DocumentStatus from, DocumentStatus to) {}

    /** The specification, written independently of WorkflowRules. Anything not listed must be rejected. */
    private static final List<Transition> VALID_TRANSITIONS = List.of(
            new Transition(WorkflowAction.SUBMIT, DRAFT, SUBMITTED),
            new Transition(WorkflowAction.START_REVIEW, SUBMITTED, UNDER_REVIEW),
            new Transition(WorkflowAction.APPROVE, UNDER_REVIEW, APPROVED),
            new Transition(WorkflowAction.REJECT, UNDER_REVIEW, REJECTED),
            new Transition(WorkflowAction.REQUEST_CHANGES, UNDER_REVIEW, CHANGES_REQUESTED),
            new Transition(WorkflowAction.RESUBMIT, CHANGES_REQUESTED, SUBMITTED),
            new Transition(WorkflowAction.WITHDRAW, SUBMITTED, WITHDRAWN),
            new Transition(WorkflowAction.WITHDRAW, UNDER_REVIEW, WITHDRAWN),
            new Transition(WorkflowAction.WITHDRAW, CHANGES_REQUESTED, WITHDRAWN));

    private static DocumentStatus expectedResult(WorkflowAction action, DocumentStatus from) {
        return VALID_TRANSITIONS.stream()
                .filter(t -> t.action() == action && t.from() == from)
                .map(Transition::to)
                .findFirst()
                .orElse(null);
    }

    @Test
    void everyActionAndStatusCombinationFollowsTheSpecification() {
        for (WorkflowAction action : WorkflowAction.values()) {
            boolean ownerAction = WorkflowRules.ruleFor(action).actor() == WorkflowRules.ActorType.OWNER;
            for (DocumentStatus status : DocumentStatus.values()) {
                DocumentStatus expected = expectedResult(action, status);
                String label = action + " from " + status;
                if (expected != null) {
                    DocumentStatus actual = ownerAction
                            ? asOwner(action, status, "comment")
                            : asReviewer(action, status, "comment");
                    assertEquals(expected, actual, label);
                } else {
                    WorkflowException ex = assertThrows(WorkflowException.class, () -> {
                        if (ownerAction) {
                            asOwner(action, status, "comment");
                        } else {
                            asReviewer(action, status, "comment");
                        }
                    }, label);
                    assertEquals(ErrorCode.ILLEGAL_TRANSITION, ex.getCode(), label);
                }
            }
        }
    }

    // ---------- allowedActions (what the UI will show) ----------

    @Test
    void allowedActionsForOwnerInEachStatus() {
        assertEquals(Set.of(WorkflowAction.SUBMIT), WorkflowRules.allowedActions(DRAFT, true, USER_ROLES));
        assertEquals(Set.of(WorkflowAction.WITHDRAW), WorkflowRules.allowedActions(SUBMITTED, true, USER_ROLES));
        assertEquals(Set.of(WorkflowAction.WITHDRAW), WorkflowRules.allowedActions(UNDER_REVIEW, true, USER_ROLES));
        assertEquals(Set.of(WorkflowAction.RESUBMIT, WorkflowAction.WITHDRAW),
                WorkflowRules.allowedActions(CHANGES_REQUESTED, true, USER_ROLES));
    }

    @Test
    void allowedActionsForReviewerOnDocumentUnderReview() {
        assertEquals(Set.of(WorkflowAction.APPROVE, WorkflowAction.REJECT, WorkflowAction.REQUEST_CHANGES),
                WorkflowRules.allowedActions(UNDER_REVIEW, false, REVIEWER_ROLES));
    }

    @Test
    void allowedActionsForReviewerInOtherStatuses() {
        assertEquals(Set.of(), WorkflowRules.allowedActions(DRAFT, false, REVIEWER_ROLES));
        assertEquals(Set.of(WorkflowAction.START_REVIEW),
                WorkflowRules.allowedActions(SUBMITTED, false, REVIEWER_ROLES));
        assertEquals(Set.of(), WorkflowRules.allowedActions(CHANGES_REQUESTED, false, REVIEWER_ROLES));
    }

    @Test
    void noAllowedActionsInTerminalStatesForAnyone() {
        for (DocumentStatus status : List.of(APPROVED, REJECTED, WITHDRAWN)) {
            assertEquals(Set.of(), WorkflowRules.allowedActions(status, true, USER_ROLES));
            assertEquals(Set.of(), WorkflowRules.allowedActions(status, false, REVIEWER_ROLES));
            assertEquals(Set.of(), WorkflowRules.allowedActions(status, true, Set.of("ADMIN")));
        }
    }

    @Test
    void reviewerWhoOwnsTheDocumentOnlyGetsOwnerActions() {
        assertEquals(Set.of(WorkflowAction.WITHDRAW),
                WorkflowRules.allowedActions(UNDER_REVIEW, true, REVIEWER_ROLES));
    }

    @Test
    void plainUserWhoIsNotTheOwnerGetsNoActions() {
        assertEquals(Set.of(), WorkflowRules.allowedActions(UNDER_REVIEW, false, USER_ROLES));
        assertEquals(Set.of(), WorkflowRules.allowedActions(SUBMITTED, false, USER_ROLES));
    }
}