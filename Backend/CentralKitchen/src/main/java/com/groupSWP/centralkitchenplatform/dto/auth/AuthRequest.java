package com.groupSWP.centralkitchenplatform.dto.auth;

import lombok.Data;

public record AuthRequest(String username, String password) {
}