package com.zion.backend.document;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface DocumentFileRepository extends JpaRepository<DocumentFile, Long> {

    List<DocumentFile> findByDocumentIdOrderByCreatedAtAscIdAsc(Long documentId);

    long countByDocumentId(Long documentId);

    Optional<DocumentFile> findByIdAndDocumentId(Long id, Long documentId);
}