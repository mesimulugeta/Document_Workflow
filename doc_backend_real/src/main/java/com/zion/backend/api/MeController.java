package com.zion.backend.api;

import java.util.Map;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class MeController {

    @GetMapping("/me")
    public Map<String, Object> me(@AuthenticationPrincipal Jwt jwt, Authentication auth) {
        return Map.of(
                "sub", jwt.getSubject(),
                "username", jwt.getClaimAsString("preferred_username"),
                "authorities", auth.getAuthorities().stream().map(GrantedAuthority::getAuthority).toList()
        );
    }
}