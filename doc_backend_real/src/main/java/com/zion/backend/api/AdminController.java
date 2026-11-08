package com.zion.backend.api;

import java.util.List;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.zion.backend.document.ActivityResponse;
import com.zion.backend.document.ActivityService;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final ActivityService activity;

    public AdminController(ActivityService activity) {
        this.activity = activity;
    }

    @GetMapping("/activity")
    @PreAuthorize("hasRole('ADMIN')")
    public List<ActivityResponse> activity(@RequestParam(defaultValue = "30") int limit) {
        return activity.recent(limit);
    }
}