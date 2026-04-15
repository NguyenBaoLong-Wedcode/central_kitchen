package com.groupSWP.centralkitchenplatform.dto.auth;

// Sửa import từ SystemUser sang Account
import com.groupSWP.centralkitchenplatform.entities.auth.Account;

public record RegisterRequest(
        String username,
        String password,
        String fullName,
        Account.Role role, // ĐÃ SỬA: Dùng enum Role từ class Account
        String email,
        String storeId
) {}