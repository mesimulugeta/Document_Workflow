package com.zion.backend.document;

import java.time.Instant;

import org.hibernate.annotations.CreationTimestamp;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "document_files")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class DocumentFile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "document_id", nullable = false, updatable = false)
    private Long documentId;

    @Column(name = "uploaded_by", nullable = false, updatable = false)
    private Long uploadedBy;

    @Column(name = "original_filename", nullable = false)
    private String originalFilename;

    @Column(name = "content_type", nullable = false, length = 150)
    private String contentType;

    @Column(name = "size_bytes", nullable = false)
    private long sizeBytes;

    @Column(name = "storage_key", nullable = false, unique = true)
    private String storageKey;

    @Column(nullable = false, length = 64)
    private String sha256;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public DocumentFile(Long documentId, Long uploadedBy, String originalFilename, String contentType,
                        long sizeBytes, String storageKey, String sha256) {
        this.documentId = documentId;
        this.uploadedBy = uploadedBy;
        this.originalFilename = originalFilename;
        this.contentType = contentType;
        this.sizeBytes = sizeBytes;
        this.storageKey = storageKey;
        this.sha256 = sha256;
    }
}