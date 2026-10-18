CREATE TABLE documents (
                           id          BIGINT AUTO_INCREMENT PRIMARY KEY,
                           title       VARCHAR(200)  NOT NULL,
                           description VARCHAR(2000) NULL,
                           status      VARCHAR(30)   NOT NULL,
                           owner_id    BIGINT        NOT NULL,
                           created_at  TIMESTAMP(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                           updated_at  TIMESTAMP(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                           version     BIGINT        NOT NULL DEFAULT 0,
                           CONSTRAINT fk_documents_owner FOREIGN KEY (owner_id) REFERENCES app_users(id),
                           INDEX idx_documents_owner (owner_id),
                           INDEX idx_documents_status (status)
) ENGINE=InnoDB;

CREATE TABLE audit_log (
                           id          BIGINT AUTO_INCREMENT PRIMARY KEY,
                           document_id BIGINT        NOT NULL,
                           actor_id    BIGINT        NOT NULL,
                           action      VARCHAR(30)   NOT NULL,
                           from_status VARCHAR(30)   NULL,
                           to_status   VARCHAR(30)   NOT NULL,
                           comment     VARCHAR(2000) NULL,
                           created_at  TIMESTAMP(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                           CONSTRAINT fk_audit_document FOREIGN KEY (document_id) REFERENCES documents(id),
                           CONSTRAINT fk_audit_actor FOREIGN KEY (actor_id) REFERENCES app_users(id),
                           INDEX idx_audit_document (document_id, created_at)
) ENGINE=InnoDB;