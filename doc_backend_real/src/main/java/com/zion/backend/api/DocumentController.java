package com.zion.backend.api;

import java.net.URI;
import java.util.List;

import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.data.web.PagedModel;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.zion.backend.document.ActionRequest;
import com.zion.backend.document.AuditEntryResponse;
import com.zion.backend.document.DocumentRequest;
import com.zion.backend.document.DocumentResponse;
import com.zion.backend.document.DocumentService;
import com.zion.backend.document.DocumentStatus;
import com.zion.backend.user.CurrentUserResolver;
import com.zion.backend.workflow.WorkflowAction;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/documents")
public class DocumentController {

    private final DocumentService service;
    private final CurrentUserResolver currentUser;

    public DocumentController(DocumentService service, CurrentUserResolver currentUser) {
        this.service = service;
        this.currentUser = currentUser;
    }

    @PostMapping
    public ResponseEntity<DocumentResponse> create(@Valid @RequestBody DocumentRequest request,
                                                   @AuthenticationPrincipal Jwt jwt, Authentication auth) {
        DocumentResponse created = service.create(request, currentUser.resolve(jwt, auth));
        return ResponseEntity.created(URI.create("/api/documents/" + created.id())).body(created);
    }

    @GetMapping
    public PagedModel<DocumentResponse> list(
            @RequestParam(required = false) DocumentStatus status,
            @PageableDefault(size = 20, sort = "updatedAt", direction = Sort.Direction.DESC) Pageable pageable,
            @AuthenticationPrincipal Jwt jwt, Authentication auth) {
        return new PagedModel<>(service.list(status, pageable, currentUser.resolve(jwt, auth)));
    }

    @GetMapping("/{id}")
    public DocumentResponse get(@PathVariable Long id, @AuthenticationPrincipal Jwt jwt, Authentication auth) {
        return service.get(id, currentUser.resolve(jwt, auth));
    }

    @PutMapping("/{id}")
    public DocumentResponse update(@PathVariable Long id, @Valid @RequestBody DocumentRequest request,
                                   @AuthenticationPrincipal Jwt jwt, Authentication auth) {
        return service.update(id, request, currentUser.resolve(jwt, auth));
    }

    @GetMapping("/{id}/history")
    public List<AuditEntryResponse> history(@PathVariable Long id, @AuthenticationPrincipal Jwt jwt,
                                            Authentication auth) {
        return service.history(id, currentUser.resolve(jwt, auth));
    }

    // ---- one explicit endpoint per workflow action ----

    @PostMapping("/{id}/submit")
    public DocumentResponse submit(@PathVariable Long id, @Valid @RequestBody(required = false) ActionRequest body,
                                   @AuthenticationPrincipal Jwt jwt, Authentication auth) {
        return act(id, WorkflowAction.SUBMIT, body, jwt, auth);
    }

    @PostMapping("/{id}/start-review")
    public DocumentResponse startReview(@PathVariable Long id,
                                        @Valid @RequestBody(required = false) ActionRequest body,
                                        @AuthenticationPrincipal Jwt jwt, Authentication auth) {
        return act(id, WorkflowAction.START_REVIEW, body, jwt, auth);
    }

    @PostMapping("/{id}/approve")
    public DocumentResponse approve(@PathVariable Long id, @Valid @RequestBody(required = false) ActionRequest body,
                                    @AuthenticationPrincipal Jwt jwt, Authentication auth) {
        return act(id, WorkflowAction.APPROVE, body, jwt, auth);
    }

    @PostMapping("/{id}/reject")
    public DocumentResponse reject(@PathVariable Long id, @Valid @RequestBody(required = false) ActionRequest body,
                                   @AuthenticationPrincipal Jwt jwt, Authentication auth) {
        return act(id, WorkflowAction.REJECT, body, jwt, auth);
    }

    @PostMapping("/{id}/request-changes")
    public DocumentResponse requestChanges(@PathVariable Long id,
                                           @Valid @RequestBody(required = false) ActionRequest body,
                                           @AuthenticationPrincipal Jwt jwt, Authentication auth) {
        return act(id, WorkflowAction.REQUEST_CHANGES, body, jwt, auth);
    }

    @PostMapping("/{id}/resubmit")
    public DocumentResponse resubmit(@PathVariable Long id, @Valid @RequestBody(required = false) ActionRequest body,
                                     @AuthenticationPrincipal Jwt jwt, Authentication auth) {
        return act(id, WorkflowAction.RESUBMIT, body, jwt, auth);
    }

    @PostMapping("/{id}/withdraw")
    public DocumentResponse withdraw(@PathVariable Long id, @Valid @RequestBody(required = false) ActionRequest body,
                                     @AuthenticationPrincipal Jwt jwt, Authentication auth) {
        return act(id, WorkflowAction.WITHDRAW, body, jwt, auth);
    }

    private DocumentResponse act(Long id, WorkflowAction action, ActionRequest body, Jwt jwt, Authentication auth) {
        String comment = (body == null) ? null : body.comment();
        return service.perform(id, action, comment, currentUser.resolve(jwt, auth));
    }
}