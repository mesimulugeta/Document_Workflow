CREATE TABLE document_files (
                                id                BIGINT AUTO_INCREMENT PRIMARY KEY,
                                document_id       BIGINT        NOT NULL,
                                uploaded_by       BIGINT        NOT NULL,
                                original_filename VARCHAR(255)  NOT NULL,
                                content_type      VARCHAR(150)  NOT NULL,
                                size_bytes        BIGINT        NOT NULL,
                                storage_key       VARCHAR(255)  NOT NULL,
                                sha256            VARCHAR(64)   NOT NULL,
                                created_at        TIMESTAMP(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                                CONSTRAINT fk_files_document FOREIGN KEY (document_id) REFERENCES documents(id),
                                CONSTRAINT fk_files_uploader FOREIGN KEY (uploaded_by) REFERENCES app_users(id),
                                CONSTRAINT uq_files_storage_key UNIQUE (storage_key),
                                INDEX idx_files_document (document_id)
) ENGINE=InnoDB;