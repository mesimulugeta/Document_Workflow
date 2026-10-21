package com.zion.backend.document;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record DocumentRequest(
        @NotBlank @Size(max = 200) String title,
        @Size(max = 2000) String description) {
}