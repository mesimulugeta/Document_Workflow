CREATE TABLE app_users (
                           id          BIGINT AUTO_INCREMENT PRIMARY KEY,
                           keycloak_id VARCHAR(36)  NOT NULL UNIQUE,
                           email       VARCHAR(255) NOT NULL UNIQUE,
                           full_name   VARCHAR(150) NOT NULL,
                           enabled     BOOLEAN      NOT NULL DEFAULT TRUE,
                           created_at  TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                           updated_at  TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                           version     BIGINT       NOT NULL DEFAULT 0
) ENGINE=InnoDB;