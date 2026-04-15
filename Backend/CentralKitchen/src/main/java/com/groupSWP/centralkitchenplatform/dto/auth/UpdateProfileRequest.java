package com.groupSWP.centralkitchenplatform.dto.auth;

import lombok.Data;

@Data
public class UpdateProfileRequest {
    private String fullName;
    private String email;
    // Lưu ý: Không cho update Role hay Username ở đây nha (Bảo mật)
}