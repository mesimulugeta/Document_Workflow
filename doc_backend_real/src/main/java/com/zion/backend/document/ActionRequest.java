package com.zion.backend.document;

import jakarta.validation.constraints.Size;

public record ActionRequest(@Size(max = 2000) String comment) {
}