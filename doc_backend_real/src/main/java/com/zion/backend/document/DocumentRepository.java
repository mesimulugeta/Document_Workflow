package com.zion.backend.document;

import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface DocumentRepository extends JpaRepository<Document, Long> {

    @Override
    @EntityGraph(attributePaths = "owner")
    Optional<Document> findById(Long id);

    @EntityGraph(attributePaths = "owner")
    @Query("""
        select d from Document d
        where d.owner.id = :userId
           or (:reviewer = true and d.status <> com.zion.backend.document.DocumentStatus.DRAFT)
        """)
    Page<Document> findVisible(@Param("userId") Long userId,
                               @Param("reviewer") boolean reviewer,
                               Pageable pageable);

    @EntityGraph(attributePaths = "owner")
    @Query("""
        select d from Document d
        where (d.owner.id = :userId
           or (:reviewer = true and d.status <> com.zion.backend.document.DocumentStatus.DRAFT))
          and d.status = :status
        """)
    Page<Document> findVisibleByStatus(@Param("userId") Long userId,
                                       @Param("reviewer") boolean reviewer,
                                       @Param("status") DocumentStatus status,
                                       Pageable pageable);
}