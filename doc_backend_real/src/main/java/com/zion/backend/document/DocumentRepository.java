package com.zion.backend.document;

import java.util.List;
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

    /** Owners see their own documents; reviewers also see everyone's except other people's drafts. */
    @EntityGraph(attributePaths = "owner")
    @Query("""
        select d from Document d
        where (d.owner.id = :userId
               or (:reviewer = true and d.status <> com.zion.backend.document.DocumentStatus.DRAFT))
          and (:status is null or d.status = :status)
          and (:q is null or lower(d.title) like lower(concat('%', :q, '%')))
        """)
    Page<Document> search(@Param("userId") Long userId,
                          @Param("reviewer") boolean reviewer,
                          @Param("status") DocumentStatus status,
                          @Param("q") String q,
                          Pageable pageable);

    @Query("""
        select d.status, count(d) from Document d
        where d.owner.id = :userId
           or (:reviewer = true and d.status <> com.zion.backend.document.DocumentStatus.DRAFT)
        group by d.status
        """)
    List<Object[]> countByStatus(@Param("userId") Long userId, @Param("reviewer") boolean reviewer);
}