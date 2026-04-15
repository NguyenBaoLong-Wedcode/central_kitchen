package com.groupSWP.centralkitchenplatform.dto.auth;

public record ResetPasswordRequest(String email, String otp, String newPassword) {
}