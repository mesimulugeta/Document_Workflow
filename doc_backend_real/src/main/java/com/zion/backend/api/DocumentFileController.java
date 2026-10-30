package com.zion.backend.api;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.List;

import org.springframework.core.io.InputStreamResource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.zion.backend.document.DocumentFile;
import com.zion.backend.document.DocumentFileService;
import com.zion.backend.document.FileResponse;
import com.zion.backend.user.CurrentUserResolver;

@RestController
@RequestMapping("/api/documents/{docId}/files")
public class DocumentFileController {

    private final DocumentFileService service;
    private final CurrentUserResolver currentUser;

    public DocumentFileController(DocumentFileService service, CurrentUserResolver currentUser) {
        this.service = service;
        this.currentUser = currentUser;
    }

    @GetMapping
    public List<FileResponse> list(@PathVariable Long docId, @AuthenticationPrincipal Jwt jwt, Authentication auth) {
        return service.list(docId, currentUser.resolve(jwt, auth));
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<FileResponse> upload(@PathVariable Long docId, @RequestParam("file") MultipartFile file,
                                               @AuthenticationPrincipal Jwt jwt, Authentication auth) {
        FileResponse created = service.upload(docId, file, currentUser.resolve(jwt, auth));
        return ResponseEntity.created(URI.create("/api/documents/" + docId + "/files/" + created.id())).body(created);
    }

    @GetMapping("/{fileId}")
    public ResponseEntity<InputStreamResource> download(@PathVariable Long docId, @PathVariable Long fileId,
                                                        @AuthenticationPrincipal Jwt jwt, Authentication auth) {
        DocumentFileService.FileDownload download = service.download(docId, fileId, currentUser.resolve(jwt, auth));
        DocumentFile file = download.file();
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(file.getContentType()))
                .contentLength(file.getSizeBytes())
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment().filename(file.getOriginalFilename(), StandardCharsets.UTF_8)
                                .build().toString())
                .body(new InputStreamResource(download.stream()));
    }

    @DeleteMapping("/{fileId}")
    public ResponseEntity<Void> delete(@PathVariable Long docId, @PathVariable Long fileId,
                                       @AuthenticationPrincipal Jwt jwt, Authentication auth) {
        service.delete(docId, fileId, currentUser.resolve(jwt, auth));
        return ResponseEntity.noContent().build();
    }
}