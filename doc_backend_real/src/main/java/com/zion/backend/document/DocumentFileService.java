package com.zion.backend.document;

import java.io.IOException;
import java.io.InputStream;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;

import com.zion.backend.common.BadRequestException;
import com.zion.backend.common.NotFoundException;
import com.zion.backend.storage.ObjectStorage;
import com.zion.backend.user.AppUser;
import com.zion.backend.user.AppUserRepository;
import com.zion.backend.user.CurrentUser;
import com.zion.backend.workflow.WorkflowException;
import com.zion.backend.workflow.WorkflowException.ErrorCode;

import software.amazon.awssdk.services.s3.model.NoSuchKeyException;

@Service
public class DocumentFileService {

    private static final long MAX_BYTES = 10L * 1024 * 1024;
    private static final int MAX_FILES_PER_DOCUMENT = 10;

    /** Allowed extensions and the content type we store and serve (never the browser's claim). */
    private static final Map<String, String> TYPES = Map.of(
            "pdf", "application/pdf",
            "png", "image/png",
            "jpg", "image/jpeg",
            "jpeg", "image/jpeg",
            "txt", "text/plain",
            "csv", "text/csv",
            "docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "pptx", "application/vnd.openxmlformats-officedocument.presentationml.presentation");

    public record FileDownload(DocumentFile file, InputStream stream) {}

    private final DocumentService documents;
    private final DocumentFileRepository files;
    private final AuditLogRepository audit;
    private final AppUserRepository users;
    private final ObjectStorage storage;

    public DocumentFileService(DocumentService documents, DocumentFileRepository files, AuditLogRepository audit,
                               AppUserRepository users, ObjectStorage storage) {
        this.documents = documents;
        this.files = files;
        this.audit = audit;
        this.users = users;
        this.storage = storage;
    }

    @Transactional(readOnly = true)
    public List<FileResponse> list(Long docId, CurrentUser me) {
        documents.get(docId, me); // throws NotFoundException when the document is not visible to this user
        return toResponses(files.findByDocumentIdOrderByCreatedAtAscIdAsc(docId));
    }

    @Transactional
    public FileResponse upload(Long docId, MultipartFile file, CurrentUser me) {
        DocumentResponse doc = requireEditable(docId, me);

        if (file == null || file.isEmpty()) {
            throw new BadRequestException("INVALID_FILE", "Please choose a file to upload");
        }
        if (file.getSize() > MAX_BYTES) {
            throw new BadRequestException("FILE_TOO_LARGE", "The file is larger than 10 MB");
        }
        if (files.countByDocumentId(docId) >= MAX_FILES_PER_DOCUMENT) {
            throw new BadRequestException("TOO_MANY_FILES",
                    "A document can have at most " + MAX_FILES_PER_DOCUMENT + " attachments");
        }

        String name = sanitize(file.getOriginalFilename());
        String contentType = TYPES.get(extension(name));
        if (contentType == null) {
            throw new BadRequestException("UNSUPPORTED_TYPE",
                    "Allowed file types: " + String.join(", ", TYPES.keySet().stream().sorted().toList()));
        }

        byte[] data;
        try {
            data = file.getBytes();
        } catch (IOException e) {
            throw new BadRequestException("INVALID_FILE", "The uploaded file could not be read");
        }
        if (!matchesSignature(extension(name), data)) {
            throw new BadRequestException("UNSUPPORTED_TYPE", "The file content does not match its extension");
        }

        String key = "documents/" + docId + "/" + UUID.randomUUID();
        storage.put(key, data, contentType);
        try {
            DocumentFile saved = files.saveAndFlush(
                    new DocumentFile(docId, me.id(), name, contentType, data.length, key, sha256(data)));
            audit.save(new AuditLog(docId, me.id(), "UPLOAD_FILE", doc.status(), doc.status(), name));
            return toResponse(saved, me.user().getFullName());
        } catch (RuntimeException e) {
            storage.deleteQuietly(key); // do not leave an orphan object behind
            throw e;
        }
    }

    @Transactional(readOnly = true)
    public FileDownload download(Long docId, Long fileId, CurrentUser me) {
        documents.get(docId, me);
        DocumentFile file = files.findByIdAndDocumentId(fileId, docId)
                .orElseThrow(() -> new NotFoundException("File " + fileId + " not found"));
        try {
            return new FileDownload(file, storage.get(file.getStorageKey()));
        } catch (NoSuchKeyException e) {
            throw new NotFoundException("The file content is missing from storage");
        }
    }

    @Transactional
    public void delete(Long docId, Long fileId, CurrentUser me) {
        DocumentResponse doc = requireEditable(docId, me);
        DocumentFile file = files.findByIdAndDocumentId(fileId, docId)
                .orElseThrow(() -> new NotFoundException("File " + fileId + " not found"));

        files.delete(file);
        audit.save(new AuditLog(docId, me.id(), "DELETE_FILE", doc.status(), doc.status(), file.getOriginalFilename()));

        // Only remove the stored object once the database change is committed.
        String key = file.getStorageKey();
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                storage.deleteQuietly(key);
            }
        });
    }

    // ---- helpers ----

    /** Same rule as editing the document: only its owner, and only while it is a draft or needs changes. */
    private DocumentResponse requireEditable(Long docId, CurrentUser me) {
        DocumentResponse doc = documents.get(docId, me);
        if (!doc.ownerId().equals(me.id())) {
            throw new WorkflowException(ErrorCode.NOT_ALLOWED, "Only the owner can change attachments");
        }
        if (!doc.editable()) {
            throw new WorkflowException(ErrorCode.NOT_EDITABLE,
                    "Attachments cannot be changed while the document is " + doc.status());
        }
        return doc;
    }

    private List<FileResponse> toResponses(List<DocumentFile> list) {
        Set<Long> uploaderIds = list.stream().map(DocumentFile::getUploadedBy).collect(Collectors.toSet());
        Map<Long, String> names = users.findAllById(uploaderIds).stream()
                .collect(Collectors.toMap(AppUser::getId, AppUser::getFullName));
        return list.stream().map(f -> toResponse(f, names.get(f.getUploadedBy()))).toList();
    }

    private static FileResponse toResponse(DocumentFile f, String uploaderName) {
        return new FileResponse(f.getId(), f.getOriginalFilename(), f.getContentType(), f.getSizeBytes(),
                f.getSha256(), f.getUploadedBy(), uploaderName, f.getCreatedAt());
    }

    /** Keeps letters (any language), digits and . _ - space; strips paths and anything else. */
    private static String sanitize(String original) {
        String name = (original == null) ? "" : original.replace('\\', '/');
        name = name.substring(name.lastIndexOf('/') + 1);
        name = name.replaceAll("[^\\p{L}\\p{N}._ -]", "_").trim();
        int dot = name.lastIndexOf('.');
        String base = dot > 0 ? name.substring(0, dot) : name;
        String ext = dot > 0 ? name.substring(dot) : "";
        if (base.length() > 140) {
            base = base.substring(0, 140);
        }
        name = base + ext;
        return name.isBlank() ? "file" : name;
    }

    private static String extension(String name) {
        int dot = name.lastIndexOf('.');
        return dot < 0 ? "" : name.substring(dot + 1).toLowerCase(Locale.ROOT);
    }

    /** Checks the first bytes (magic number) so a renamed file cannot pass as a different type. */
    private static boolean matchesSignature(String ext, byte[] d) {
        return switch (ext) {
            case "pdf" -> startsWith(d, '%', 'P', 'D', 'F');
            case "png" -> startsWith(d, 0x89, 'P', 'N', 'G');
            case "jpg", "jpeg" -> startsWith(d, 0xFF, 0xD8, 0xFF);
            case "docx", "xlsx", "pptx" -> startsWith(d, 'P', 'K', 3, 4);
            default -> true;
        };
    }

    private static boolean startsWith(byte[] data, int... signature) {
        if (data.length < signature.length) {
            return false;
        }
        for (int i = 0; i < signature.length; i++) {
            if ((data[i] & 0xFF) != signature[i]) {
                return false;
            }
        }
        return true;
    }

    private static String sha256(byte[] data) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(data));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}