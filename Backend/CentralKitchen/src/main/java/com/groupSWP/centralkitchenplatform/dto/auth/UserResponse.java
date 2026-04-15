package com.groupSWP.centralkitchenplatform.dto.auth;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class UserResponse {
    private String userId;
    private String username;
    private String fullName;
    private String role;
}