package com.zion.backend.workflow;

import static com.zion.backend.document.DocumentStatus.APPROVED;
import static com.zion.backend.document.DocumentStatus.CHANGES_REQUESTED;
import static com.zion.backend.document.DocumentStatus.DRAFT;
import static com.zion.backend.document.DocumentStatus.REJECTED;
import static com.zion.backend.document.DocumentStatus.SUBMITTED;
import static com.zion.backend.document.DocumentStatus.UNDER_REVIEW;
import static com.zion.backend.document.DocumentStatus.WITHDRAWN;

import java.util.EnumMap;
import java.util.EnumSet;
import java.util.Map;
import java.util.Set;

import com.zion.backend.document.DocumentStatus;
import com.zion.backend.workflow.WorkflowException.ErrorCode;

public final class WorkflowRules {

    public enum ActorType { OWNER, REVIEWER }

    public record Rule(Set<DocumentStatus> from, DocumentStatus to, ActorType actor, boolean commentRequired) {}

    /** Role names without the ROLE_ prefix. */
    private static final Set<String> REVIEWER_ROLES = Set.of("REVIEWER", "APPROVER", "ADMIN");

    private static final Map<WorkflowAction, Rule> RULES = new EnumMap<>(WorkflowAction.class);

    static {
        RULES.put(WorkflowAction.SUBMIT,
                new Rule(Set.of(DRAFT), SUBMITTED, ActorType.OWNER, false));
        RULES.put(WorkflowAction.START_REVIEW,
                new Rule(Set.of(SUBMITTED), UNDER_REVIEW, ActorType.REVIEWER, false));
        RULES.put(WorkflowAction.APPROVE,
                new Rule(Set.of(UNDER_REVIEW), APPROVED, ActorType.REVIEWER, false));
        RULES.put(WorkflowAction.REJECT,
                new Rule(Set.of(UNDER_REVIEW), REJECTED, ActorType.REVIEWER, true));
        RULES.put(WorkflowAction.REQUEST_CHANGES,
                new Rule(Set.of(UNDER_REVIEW), CHANGES_REQUESTED, ActorType.REVIEWER, true));
        RULES.put(WorkflowAction.RESUBMIT,
                new Rule(Set.of(CHANGES_REQUESTED), SUBMITTED, ActorType.OWNER, false));
        RULES.put(WorkflowAction.WITHDRAW,
                new Rule(Set.of(SUBMITTED, UNDER_REVIEW, CHANGES_REQUESTED), WITHDRAWN, ActorType.OWNER, false));
    }

    private WorkflowRules() {}

    public static Rule ruleFor(WorkflowAction action) {
        return RULES.get(action);
    }

    /** Validates an action and returns the new status, or throws a WorkflowException. */
    public static DocumentStatus validate(WorkflowAction action, DocumentStatus current,
                                          boolean isOwner, Set<String> roles, String comment) {
        Rule rule = RULES.get(action);

        if (rule.actor() == ActorType.OWNER) {
            if (!isOwner) {
                throw new WorkflowException(ErrorCode.NOT_ALLOWED,
                        "Only the document owner can perform " + action);
            }
        } else {
            if (isOwner) {
                throw new WorkflowException(ErrorCode.CONFLICT_OF_INTEREST,
                        "You cannot review your own document");
            }
            if (!hasReviewerRole(roles)) {
                throw new WorkflowException(ErrorCode.NOT_ALLOWED,
                        "A reviewer role is required to perform " + action);
            }
        }

        if (!rule.from().contains(current)) {
            throw new WorkflowException(ErrorCode.ILLEGAL_TRANSITION,
                    "Cannot perform " + action + " on a document in status " + current);
        }

        if (rule.commentRequired() && (comment == null || comment.isBlank())) {
            throw new WorkflowException(ErrorCode.COMMENT_REQUIRED,
                    "A comment is required for " + action);
        }

        return rule.to();
    }

    /** The actions this person may perform right now; the frontend uses this to show or hide buttons. */
    public static Set<WorkflowAction> allowedActions(DocumentStatus current, boolean isOwner, Set<String> roles) {
        Set<WorkflowAction> result = EnumSet.noneOf(WorkflowAction.class);
        boolean reviewer = hasReviewerRole(roles);
        RULES.forEach((action, rule) -> {
            boolean actorOk = rule.actor() == ActorType.OWNER ? isOwner : (!isOwner && reviewer);
            if (actorOk && rule.from().contains(current)) {
                result.add(action);
            }
        });
        return result;
    }

    public static boolean hasReviewerRole(Set<String> roles) {
        return roles.stream().anyMatch(REVIEWER_ROLES::contains);
    }
}