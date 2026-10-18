package com.zion.backend.user;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface AppUserRepository extends JpaRepository<AppUser, Long> {

    Optional<AppUser> findByKeycloakId(String keycloakId);

    Optional<AppUser> findByEmail(String email);
}