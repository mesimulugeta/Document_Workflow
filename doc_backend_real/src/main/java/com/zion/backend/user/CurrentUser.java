package com.zion.backend.user;

import java.util.Set;

public record CurrentUser(AppUser user, Set<String> roles) {
    public Long id() {
        return user.getId();
    }
}