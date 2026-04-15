package com.groupSWP.centralkitchenplatform.dto.store;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class StoreStatusRequest {
    // Dùng Boolean (chữ B viết hoa) để tránh lỗi nếu client lỡ gửi body rỗng
    private Boolean isActive;
}