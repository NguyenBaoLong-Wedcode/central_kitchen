package com.groupSWP.centralkitchenplatform.dto.order;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor  // Cần thiết để Jackson map JSON
@AllArgsConstructor // Thêm dòng này để sửa lỗi "found 2 arguments"
public class OrderRequest {
    private String storeId;         // Backend tự moi từ Token đè lên
    private String note;            // Ghi chú thêm (VD: Giao cẩn thận)
    private List<OrderItemRequest> items; // Danh sách các món đặt

    @Data
    @NoArgsConstructor  // Cần cho Jackson
    @AllArgsConstructor
    public static class OrderItemRequest {
        private String productId;   // Mã món (Product)
        private int quantity;       // Số lượng đặt
    }
}