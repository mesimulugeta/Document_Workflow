package com.zion.backend.document;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.zion.backend.user.AppUser;
import com.zion.backend.user.AppUserRepository;

@Service
public class ActivityService {

    private final AuditLogRepository audit;
    private final DocumentRepository documents;
    private final AppUserRepository users;

    public ActivityService(AuditLogRepository audit, DocumentRepository documents, AppUserRepository users) {
        this.audit = audit;
        this.documents = documents;
        this.users = users;
    }

    /** The most recent actions across all documents (admin feed). */
    @Transactional(readOnly = true)
    public List<ActivityResponse> recent(int limit) {
        int size = Math.min(Math.max(limit, 1), 100);
        List<AuditLog> entries = audit
                .findAll(PageRequest.of(0, size, Sort.by(Sort.Direction.DESC, "createdAt", "id")))
                .getContent();

        Set<Long> documentIds = entries.stream().map(AuditLog::getDocumentId).collect(Collectors.toSet());
        Map<Long, String> titles = documents.findAllById(documentIds).stream()
                .collect(Collectors.toMap(Document::getId, Document::getTitle));

        Set<Long> actorIds = entries.stream().map(AuditLog::getActorId).collect(Collectors.toSet());
        Map<Long, String> names = users.findAllById(actorIds).stream()
                .collect(Collectors.toMap(AppUser::getId, AppUser::getFullName));

        return entries.stream()
                .map(e -> new ActivityResponse(e.getId(), e.getDocumentId(), titles.get(e.getDocumentId()), e.getAction(),
                        e.getFromStatus(), e.getToStatus(), e.getComment(), names.get(e.getActorId()), e.getCreatedAt()))
                .toList();
    }
}