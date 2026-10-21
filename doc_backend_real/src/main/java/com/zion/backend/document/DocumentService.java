package com.zion.backend.document;

import static com.zion.backend.document.DocumentStatus.CHANGES_REQUESTED;
import static com.zion.backend.document.DocumentStatus.DRAFT;

import java.util.*;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.zion.backend.common.NotFoundException;
import com.zion.backend.user.AppUser;
import com.zion.backend.user.AppUserRepository;
import com.zion.backend.user.CurrentUser;
import com.zion.backend.workflow.WorkflowAction;
import com.zion.backend.workflow.WorkflowException;
import com.zion.backend.workflow.WorkflowException.ErrorCode;
import com.zion.backend.workflow.WorkflowRules;

@Service
public class DocumentService {

    private static final Set<DocumentStatus> EDITABLE = EnumSet.of(DRAFT, CHANGES_REQUESTED);

    private final DocumentRepository documents;
    private final AuditLogRepository audit;
    private final AppUserRepository users;

    public DocumentService(DocumentRepository documents, AuditLogRepository audit, AppUserRepository users) {
        this.documents = documents;
        this.audit = audit;
        this.users = users;
    }

    @Transactional
    public DocumentResponse create(DocumentRequest request, CurrentUser me) {
        Document doc = new Document();
        doc.setTitle(request.title().trim());
        doc.setDescription(blankToNull(request.description()));
        doc.setStatus(DRAFT);
        doc.setOwner(me.user());
        documents.saveAndFlush(doc);
        audit.save(new AuditLog(doc.getId(), me.id(), "CREATE", null, DRAFT, null));
        return toResponse(doc, me);
    }

    @Transactional(readOnly = true)
    public Page<DocumentResponse> list(DocumentStatus status, Pageable pageable, CurrentUser me) {
        boolean reviewer = WorkflowRules.hasReviewerRole(me.roles());
        Page<Document> page = (status == null)
                ? documents.findVisible(me.id(), reviewer, pageable)
                : documents.findVisibleByStatus(me.id(), reviewer, status, pageable);
        return page.map(d -> toResponse(d, me));
    }

    @Transactional(readOnly = true)
    public DocumentResponse get(Long id, CurrentUser me) {
        return toResponse(loadVisible(id, me), me);
    }

    @Transactional
    public DocumentResponse update(Long id, DocumentRequest request, CurrentUser me) {
        Document doc = loadVisible(id, me);
        if (!isOwner(doc, me)) {
            throw new WorkflowException(ErrorCode.NOT_ALLOWED, "Only the owner can edit this document");
        }
        if (!EDITABLE.contains(doc.getStatus())) {
            throw new WorkflowException(ErrorCode.NOT_EDITABLE,
                    "A document in status " + doc.getStatus() + " cannot be edited");
        }
        doc.setTitle(request.title().trim());
        doc.setDescription(blankToNull(request.description()));
        documents.saveAndFlush(doc);
        audit.save(new AuditLog(id, me.id(), "UPDATE", doc.getStatus(), doc.getStatus(), null));
        return toResponse(doc, me);
    }

    @Transactional
    public DocumentResponse perform(Long id, WorkflowAction action, String comment, CurrentUser me) {
        Document doc = loadVisible(id, me);
        DocumentStatus from = doc.getStatus();
        DocumentStatus to = WorkflowRules.validate(action, from, isOwner(doc, me), me.roles(), comment);

        doc.setStatus(to);
        documents.saveAndFlush(doc); // the optimistic lock check happens here
        audit.save(new AuditLog(id, me.id(), action.name(), from, to, blankToNull(comment)));
        return toResponse(doc, me);
    }

    @Transactional(readOnly = true)
    public List<AuditEntryResponse> history(Long id, CurrentUser me) {
        loadVisible(id, me);
        List<AuditLog> entries = audit.findByDocumentIdOrderByCreatedAtAscIdAsc(id);
        Set<Long> actorIds = entries.stream().map(AuditLog::getActorId).collect(Collectors.toSet());
        Map<Long, String> names = users.findAllById(actorIds).stream()
                .collect(Collectors.toMap(AppUser::getId, u -> Objects.toString(u.getFullName(), "Unknown")));
        return entries.stream()
                .map(e -> new AuditEntryResponse(e.getId(), e.getAction(), e.getFromStatus(), e.getToStatus(),
                        e.getComment(), e.getActorId(), names.get(e.getActorId()), e.getCreatedAt()))
                .toList();
    }

    // ---- helpers ----

    /** Owners see their own documents; reviewers see everyone's except other people's drafts. */
    private Document loadVisible(Long id, CurrentUser me) {
        Document doc = documents.findById(id)
                .orElseThrow(() -> new NotFoundException("Document " + id + " not found"));
        boolean canView = isOwner(doc, me)
                || (WorkflowRules.hasReviewerRole(me.roles()) && doc.getStatus() != DRAFT);
        if (!canView) {
            throw new NotFoundException("Document " + id + " not found");
        }
        return doc;
    }

    private boolean isOwner(Document doc, CurrentUser me) {
        return doc.getOwner().getId().equals(me.id());
    }

    private DocumentResponse toResponse(Document d, CurrentUser me) {
        boolean owner = isOwner(d, me);
        return new DocumentResponse(
                d.getId(), d.getTitle(), d.getDescription(), d.getStatus(),
                d.getOwner().getId(), d.getOwner().getFullName(),
                d.getCreatedAt(), d.getUpdatedAt(), d.getVersion(),
                owner && EDITABLE.contains(d.getStatus()),
                WorkflowRules.allowedActions(d.getStatus(), owner, me.roles()));
    }

    private static String blankToNull(String value) {
        return (value == null || value.isBlank()) ? null : value.trim();
    }
}