package com.groupSWP.centralkitchenplatform.dto.auth;


import lombok.Data;

import java.util.UUID;

@Data
public class AccountResponse {
    private UUID accountId;
    private String username;
    private String role;
    private boolean isActive;
    private String storeName;
    // Thông tin từ SystemUser
    private String userId;
    private String fullName;
    private String email;
}
