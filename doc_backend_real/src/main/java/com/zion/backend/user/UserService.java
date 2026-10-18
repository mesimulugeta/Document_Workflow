package com.zion.backend.user;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;

@Service
public class UserService {

    private final AppUserRepository repository;

    public UserService(AppUserRepository repository) {
        this.repository = repository;
    }

    /** Returns the local user for this token, creating it on first sight and syncing profile changes. */
    public AppUser getOrCreate(Jwt jwt) {
        String keycloakId = jwt.getSubject();
        String username = jwt.getClaimAsString("preferred_username");
        String email = jwt.getClaimAsString("email");
        String name = jwt.getClaimAsString("name");

        String resolvedEmail = (email != null && !email.isBlank()) ? email : username + "@unknown.local";
        String resolvedName = (name != null && !name.isBlank()) ? name : username;

        return repository.findByKeycloakId(keycloakId)
                .map(user -> sync(user, resolvedEmail, resolvedName))
                .orElseGet(() -> create(keycloakId, resolvedEmail, resolvedName));
    }

    private AppUser create(String keycloakId, String email, String fullName) {
        AppUser user = new AppUser();
        user.setKeycloakId(keycloakId);
        user.setEmail(email);
        user.setFullName(fullName);
        try {
            return repository.saveAndFlush(user);
        } catch (DataIntegrityViolationException e) {
            // Two first requests raced; the other one won, so load its row.
            return repository.findByKeycloakId(keycloakId).orElseThrow(() -> e);
        }
    }

    private AppUser sync(AppUser user, String email, String fullName) {
        if (user.getEmail().equals(email) && user.getFullName().equals(fullName)) {
            return user;
        }
        user.setEmail(email);
        user.setFullName(fullName);
        return repository.save(user);
    }
}